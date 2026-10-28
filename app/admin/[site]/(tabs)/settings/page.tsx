import { redirect } from "next/navigation";
import { SettingsPanel } from "@/components/settings-panel";
import { loadEditableSite } from "@/lib/access";

type Props = {
  params: Promise<{ site: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function SettingsPage({ params, searchParams }: Props) {
  const [{ site: handle }, query] = await Promise.all([params, searchParams]);
  const site = await loadEditableSite(handle);
  if (!site) redirect("/admin");
  return <SettingsPanel key={handle} initialSite={site} initialError={query.error} />;
}
