import { TEMP_SITE_TTL_HOURS } from "@/lib/demo";

// 404 for the platform domain, and for subdomains or custom domains with no matching site
export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-6 py-32 text-center">
      <p className="text-6xl font-bold text-gray-200">404</p>
      <h1 className="mt-4 text-xl font-semibold">站点或页面不存在</h1>
      <p className="mt-2 text-sm text-gray-500">
        体验站点 {TEMP_SITE_TTL_HOURS} 小时后会自动删除；自有域名需要先由平台管理员登记。
      </p>
    </main>
  );
}
