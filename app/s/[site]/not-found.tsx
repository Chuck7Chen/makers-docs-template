export default function PageNotFound() {
  return (
    <div className="py-24 text-center">
      <p className="text-6xl font-bold text-gray-200">404</p>
      <h1 className="mt-4 text-xl font-semibold text-gray-900">页面不存在</h1>
      <p className="mt-2 text-sm text-gray-500">可能已被删除，或者地址有误。</p>
      <a href="/" className="mt-6 inline-block text-sm font-medium text-brand-text hover:underline">
        返回首页
      </a>
    </div>
  );
}
