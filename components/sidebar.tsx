import { isGroup, pagePath, type NavItem, type NavPage } from "@/lib/nav";

// The current-page highlight comes from a style emitted by the page, so the sidebar is page-independent and shared site-wide

function NavLink({ page }: { page: NavPage }) {
  return (
    <li>
      <a
        href={pagePath(page.slug)}
        data-slug={page.slug}
        className="block rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      >
        {page.title}
      </a>
    </li>
  );
}

export function Sidebar({ nav }: { nav: NavItem[] }) {
  return (
    <nav aria-label="文档导航" className="text-sm">
      <ul className="space-y-0.5">
        {nav.map((item, i) =>
          isGroup(item) ? (
            <li key={`group-${i}`} className="pt-5 first:pt-0">
              <p className="px-3 pb-1.5 text-xs font-semibold tracking-wide text-gray-900">{item.title}</p>
              <ul className="space-y-0.5">
                {item.pages.map((page) => (
                  <NavLink key={page.slug} page={page} />
                ))}
              </ul>
            </li>
          ) : (
            <NavLink key={item.slug} page={item} />
          ),
        )}
      </ul>
    </nav>
  );
}
