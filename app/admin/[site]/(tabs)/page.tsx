import { redirect } from "next/navigation";
import { NavEditor } from "@/components/nav-editor";
import { loadEditableSite } from "@/lib/access";
import { MAX_PAGES_PER_TEMP_SITE } from "@/lib/demo";
import { isTemporary } from "@/lib/site";

type Props = { params: Promise<{ site: string }> };

export default async function NavEditorPage({ params }: Props) {
  const { site: handle } = await params;
  const site = await loadEditableSite(handle);
  if (!site) redirect("/admin");

  return (
    <NavEditor
      handle={handle}
      version={site.version}
      nav={site.nav}
      maxPages={isTemporary(site) ? MAX_PAGES_PER_TEMP_SITE : null}
    />
  );
}
