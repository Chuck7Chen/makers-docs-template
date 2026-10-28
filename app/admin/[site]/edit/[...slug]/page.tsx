import { notFound, redirect } from "next/navigation";
import { Editor } from "@/components/editor";
import { loadEditableSite } from "@/lib/access";
import { readJSON } from "@/lib/blob";
import { MAX_PAGE_BYTES } from "@/lib/demo";
import { keys } from "@/lib/keys";
import { findNavPage, pagePath } from "@/lib/nav";
import { isValidHandle, isValidSlug } from "@/lib/rules";
import { isTemporary, requestHost, subdomainOrigin, type PageDoc } from "@/lib/site";

type Props = { params: Promise<{ site: string; slug: string[] }> };

export default async function EditPage({ params }: Props) {
  const { site: handle, slug: parts } = await params;
  const slug = parts.join("/");
  if (!isValidSlug(slug)) notFound();
  // The page is read alongside the access check and only used once the check passes
  const [site, doc, host] = await Promise.all([
    loadEditableSite(handle),
    isValidHandle(handle) ? readJSON<PageDoc>(keys.page(handle, slug)) : null,
    requestHost(),
  ]);
  if (!site) redirect("/admin");
  const page = findNavPage(site.nav, slug);
  if (!page || !doc) notFound();

  return (
    <Editor
      handle={handle}
      slug={slug}
      path={pagePath(slug)}
      viewUrl={subdomainOrigin(handle, host) + pagePath(slug)}
      title={page.title}
      description={doc.description}
      markdown={doc.markdown}
      version={site.version}
      maxBytes={isTemporary(site) ? MAX_PAGE_BYTES : null}
    />
  );
}
