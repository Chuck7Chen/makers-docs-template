import { notFound } from "next/navigation";
import { Editor } from "@/components/editor";
import { readJSON } from "@/lib/blob";
import { MAX_IMAGE_BYTES, MAX_PAGE_BYTES } from "@/lib/demo";
import { findNavPage, pagePath } from "@/lib/nav";
import { isTemporary, keys, loadSite, requestHost, subdomainOrigin, type PageDoc } from "@/lib/site";

type Props = { params: Promise<{ site: string; slug: string[] }> };

export default async function EditPage({ params }: Props) {
  const { site: handle, slug: parts } = await params;
  const slug = parts.join("/");
  const site = await loadSite(handle);
  const page = site && findNavPage(site.nav, slug);
  if (!site || !page) notFound();
  const [doc, host] = await Promise.all([readJSON<PageDoc>(keys.page(handle, slug)), requestHost()]);
  if (!doc) notFound();

  const temporary = isTemporary(site);
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
      maxBytes={temporary ? MAX_PAGE_BYTES : null}
      maxImageBytes={temporary ? null : MAX_IMAGE_BYTES}
    />
  );
}
