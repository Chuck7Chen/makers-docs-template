"use client";

import { cn } from "cn";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Ellipsis,
  FilePlus,
  FileText,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  House,
  PencilLine,
  Plus,
  SquarePen,
  Trash2,
} from "lucide-react";
import { useOptimistic, useRef, useState, useTransition, type ComponentProps, type ReactNode } from "react";
import { toast } from "sonner";
import { navAction } from "@/app/admin/actions";
import { CreateGroupDialog, CreatePageDialog, type GroupOption } from "@/components/nav-dialogs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { applyNavOp, flattenNav, isGroup, pagePath, type NavGroup, type NavItem, type NavOp, type NavPage } from "@/lib/nav";

type Props = {
  handle: string;
  version: number;
  nav: NavItem[];
  // Page limit for demo sites; null for long-lived sites created by platform admins
  maxPages: number | null;
};

type DeleteTarget = { pos: string; title: string; page: boolean };

// State and operations shared by every row
type Tree = {
  handle: string;
  groups: GroupOption[];
  pending: boolean;
  full: boolean;
  renaming: string | null;
  run: (op: NavOp) => void;
  startRename: (pos: string) => void;
  finishRename: (pos: string, title: string | null) => void;
  askDelete: (target: DeleteTarget) => void;
  newPageIn: (group: string) => void;
  onMenuCloseAutoFocus: (event: Event) => void;
};

type Edges = { first: boolean; last: boolean };

const rowTitleClass =
  "flex h-full min-w-0 flex-1 items-center gap-2 rounded-md pl-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const rowIconClass = "size-4 shrink-0 text-muted-foreground";
// Rows already use the muted background on hover, so buttons need a darker shade to stand out
const rowButtonClass =
  "text-muted-foreground hover:bg-foreground/8 hover:text-foreground aria-expanded:bg-foreground/8 aria-expanded:text-foreground";

// Apply the change locally, then submit; the server result wins when it returns. Invalid local changes are left alone for the server to reject
function applyLocally(nav: NavItem[], op: NavOp) {
  const next = structuredClone(nav);
  try {
    applyNavOp(next, op);
    return next;
  } catch {
    return nav;
  }
}

export function NavEditor({ handle, version, nav, maxPages }: Props) {
  const [items, applyOptimistic] = useOptimistic(nav, applyLocally);
  const [pending, startTransition] = useTransition();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [newPage, setNewPage] = useState({ open: false, group: "" });
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [deleting, setDeleting] = useState<{ open: boolean; target?: DeleteTarget }>({ open: false });
  // When a menu item opens an input or dialog, don't return focus to the menu button after the menu closes
  const keepFocus = useRef(false);

  const groups = items.flatMap((item, index) => (isGroup(item) ? [{ pos: String(index), title: item.title }] : []));
  const pageCount = flattenNav(items).length;
  const full = maxPages !== null && pageCount >= maxPages;

  function run(op: NavOp) {
    startTransition(async () => {
      applyOptimistic(op);
      try {
        const result = await navAction(handle, version, op);
        if (result.error) toast.error(result.error);
      } catch {
        toast.error("保存失败，请检查网络后重试");
      }
    });
  }

  function fromMenu(open: () => void) {
    keepFocus.current = true;
    open();
  }

  const tree: Tree = {
    handle,
    groups,
    pending,
    full,
    renaming,
    run,
    startRename: (pos) => fromMenu(() => setRenaming(pos)),
    finishRename: (pos, title) => {
      setRenaming(null);
      if (title) run({ op: "rename", pos, title });
    },
    askDelete: (target) => fromMenu(() => setDeleting({ open: true, target })),
    newPageIn: (group) => fromMenu(() => setNewPage({ open: true, group })),
    onMenuCloseAutoFocus: (event) => {
      if (!keepFocus.current) return;
      keepFocus.current = false;
      event.preventDefault();
    },
  };

  function toggleGroup(title: string, open: boolean) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (open) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  const target = deleting.target;

  return (
    <>
      <Card>
        <CardHeader className="border-b">
          <CardTitle>目录</CardTitle>
          <CardDescription>阅读端的侧栏按这里的顺序显示，点击页面进入编辑。</CardDescription>
          <CardAction className="flex items-center gap-2">
            {pending ? <Spinner className="text-muted-foreground" /> : null}
            <Button variant="outline" size="sm" disabled={pending} onClick={() => setNewGroupOpen(true)}>
              <FolderPlus data-icon="inline-start" />
              新建分组
            </Button>
            <Button size="sm" disabled={pending || full} onClick={() => setNewPage({ open: true, group: "" })}>
              <Plus data-icon="inline-start" />
              新建页面
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-2">
          <ul>
            {items.map((item, i) => {
              const pos = String(i);
              const edges = { first: i === 0, last: i === items.length - 1 };
              return isGroup(item) ? (
                <GroupNode
                  key={`group-${i}`}
                  tree={tree}
                  group={item}
                  pos={pos}
                  {...edges}
                  open={!collapsed.has(item.title)}
                  onOpenChange={(open) => toggleGroup(item.title, open)}
                />
              ) : (
                <li key={item.slug}>
                  <PageRow tree={tree} page={item} pos={pos} parent="" {...edges} />
                </li>
              );
            })}
          </ul>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          共 {pageCount} 页{maxPages === null ? "" : `，体验站点最多 ${maxPages} 页`}
        </CardFooter>
      </Card>

      <CreatePageDialog
        open={newPage.open}
        onOpenChange={(open) => setNewPage((current) => ({ ...current, open }))}
        handle={handle}
        version={version}
        groups={groups}
        group={newPage.group}
      />
      <CreateGroupDialog open={newGroupOpen} onOpenChange={setNewGroupOpen} handle={handle} version={version} />
      <AlertDialog open={deleting.open} onOpenChange={(open) => setDeleting((current) => ({ ...current, open }))}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              删除{target?.page ? "页面" : "分组"}“{target?.title}”？
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target?.page ? "正文会一起删除，无法恢复。" : "这是个空分组，删除后不影响任何页面。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => target && run({ op: "delete", pos: target.pos })}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Action buttons are hidden until hover, keyboard focus or an open menu; always visible on touch devices
function TreeRow({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="group/row flex h-9 items-center gap-1 rounded-md pr-1 hover:bg-muted has-[[data-slot=dropdown-menu-trigger][data-state=open]]:bg-muted">
      {children}
      {actions ? (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100 group-has-[[data-slot=dropdown-menu-trigger][data-state=open]]/row:opacity-100 pointer-coarse:opacity-100">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

// Save on Enter or blur, cancel on Esc; Enter during IME composition is ignored
function RenameRow({ lead, title, onDone }: { lead: ReactNode; title: string; onDone: (title: string | null) => void }) {
  const done = useRef(false);

  function finish(next: string | null) {
    if (done.current) return;
    done.current = true;
    onDone(next);
  }

  return (
    <TreeRow>
      <div className="flex min-w-0 flex-1 items-center gap-2 pl-2">
        {lead}
        <Input
          autoFocus
          defaultValue={title}
          maxLength={60}
          aria-label="新名称"
          className="h-7 min-w-0 flex-1 px-2"
          onFocus={(event) => event.currentTarget.select()}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            } else if (event.key === "Escape") {
              event.preventDefault();
              finish(null);
            }
          }}
          onBlur={(event) => {
            const next = event.currentTarget.value.trim();
            finish(next && next !== title ? next : null);
          }}
        />
      </div>
    </TreeRow>
  );
}

function RowButton({ label, className, ...props }: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={label} className={cn(rowButtonClass, className)} {...props} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function MoveButtons({ tree, pos, first, last }: { tree: Tree; pos: string } & Edges) {
  return (
    <>
      <RowButton label="上移" disabled={tree.pending || first} onClick={() => tree.run({ op: "up", pos })}>
        <ArrowUp />
      </RowButton>
      <RowButton label="下移" disabled={tree.pending || last} onClick={() => tree.run({ op: "down", pos })}>
        <ArrowDown />
      </RowButton>
    </>
  );
}

function MenuTrigger({ tree, title }: { tree: Tree; title: string }) {
  return (
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`${title}的更多操作`}
        disabled={tree.pending}
        className={rowButtonClass}
      >
        <Ellipsis />
      </Button>
    </DropdownMenuTrigger>
  );
}

function PageRow({ tree, page, pos, parent, first, last }: { tree: Tree; page: NavPage; pos: string; parent: string } & Edges) {
  // Plain links rather than next/link: the editor opens as its own document, so leaving it with the browser's
  // back button still fires beforeunload and asks about unsaved changes
  const href = `/admin/${tree.handle}/edit/${page.slug}`;
  const PageIcon = page.slug === "index" ? House : FileText;
  const lead = (
    <>
      {parent === "" ? <span aria-hidden className="w-4 shrink-0" /> : null}
      <PageIcon className={rowIconClass} />
    </>
  );

  if (tree.renaming === pos) {
    return <RenameRow lead={lead} title={page.title} onDone={(title) => tree.finishRename(pos, title)} />;
  }

  return (
    <TreeRow
      actions={
        <>
          <MoveButtons tree={tree} pos={pos} first={first} last={last} />
          <DropdownMenu>
            <MenuTrigger tree={tree} title={page.title} />
            <DropdownMenuContent align="end" className="w-40" onCloseAutoFocus={tree.onMenuCloseAutoFocus}>
              <DropdownMenuItem asChild>
                <a href={href}>
                  <SquarePen />
                  编辑
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => tree.startRename(pos)}>
                <PencilLine />
                重命名
              </DropdownMenuItem>
              {tree.groups.length > 0 ? (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderInput />
                    移动到
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-40">
                    <DropdownMenuRadioGroup
                      value={parent}
                      onValueChange={(target) => {
                        if (target !== parent) tree.run({ op: "move", pos, target });
                      }}
                    >
                      <DropdownMenuRadioItem value="">顶层</DropdownMenuRadioItem>
                      {tree.groups.map((group) => (
                        <DropdownMenuRadioItem key={group.pos} value={group.pos}>
                          <span className="truncate">{group.title}</span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ) : null}
              {page.slug === "index" ? null : (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => tree.askDelete({ pos, title: page.title, page: true })}
                  >
                    <Trash2 />
                    删除
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    >
      <a href={href} className={rowTitleClass}>
        {lead}
        <span className="truncate">{page.title}</span>
        <span className="hidden truncate font-mono text-xs text-muted-foreground sm:inline">{pagePath(page.slug)}</span>
      </a>
    </TreeRow>
  );
}

function GroupNode({
  tree,
  group,
  pos,
  first,
  last,
  open,
  onOpenChange,
}: { tree: Tree; group: NavGroup; pos: string; open: boolean; onOpenChange: (open: boolean) => void } & Edges) {
  const empty = group.pages.length === 0;
  const lead = (
    <>
      <ChevronRight className={cn(rowIconClass, "transition-transform duration-150", open && "rotate-90")} />
      {open ? <FolderOpen className={rowIconClass} /> : <Folder className={rowIconClass} />}
    </>
  );

  return (
    <Collapsible asChild open={open} onOpenChange={onOpenChange}>
      <li>
        {tree.renaming === pos ? (
          <RenameRow lead={lead} title={group.title} onDone={(title) => tree.finishRename(pos, title)} />
        ) : (
          <TreeRow
            actions={
              <>
                <MoveButtons tree={tree} pos={pos} first={first} last={last} />
                <DropdownMenu>
                  <MenuTrigger tree={tree} title={group.title} />
                  <DropdownMenuContent align="end" className="w-48" onCloseAutoFocus={tree.onMenuCloseAutoFocus}>
                    <DropdownMenuItem disabled={tree.full} onSelect={() => tree.newPageIn(pos)}>
                      <FilePlus />
                      新建页面
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => tree.startRename(pos)}>
                      <PencilLine />
                      重命名
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={!empty}
                      onSelect={() => tree.askDelete({ pos, title: group.title, page: false })}
                    >
                      <Trash2 />
                      {empty ? "删除" : "删除（需先移走页面）"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            }
          >
            <CollapsibleTrigger className={rowTitleClass}>
              {lead}
              <span className="truncate font-medium">{group.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{empty ? "空" : `${group.pages.length} 页`}</span>
            </CollapsibleTrigger>
          </TreeRow>
        )}
        <CollapsibleContent className="overflow-hidden data-open:animate-collapsible-down data-closed:animate-collapsible-up">
          <ul className="ml-4 border-l pl-2">
            {group.pages.map((page, j) => (
              <li key={page.slug}>
                <PageRow
                  tree={tree}
                  page={page}
                  pos={`${pos}.${j}`}
                  parent={pos}
                  first={j === 0}
                  last={j === group.pages.length - 1}
                />
              </li>
            ))}
            {empty ? (
              <li className="flex h-9 items-center pl-2 text-xs text-muted-foreground">
                还没有页面，可以从页面菜单的“移动到”放进来
              </li>
            ) : null}
          </ul>
        </CollapsibleContent>
      </li>
    </Collapsible>
  );
}
