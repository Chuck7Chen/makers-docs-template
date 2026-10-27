import { notFound } from "next/navigation";
import { SettingsPanel } from "@/components/settings-panel";
import { loadSite } from "@/lib/site";

type Props = {
  params: Promise<{ site: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function SettingsPage({ params, searchParams }: Props) {
  const [{ site: handle }, query] = await Promise.all([params, searchParams]);
  const site = await loadSite(handle);
  if (!site) notFound();
  return <SettingsPanel key={handle} initialSite={site} initialError={query.error} />;
}
