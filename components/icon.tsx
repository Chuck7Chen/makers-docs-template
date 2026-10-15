import { iconPaths } from "@/lib/icons";

export function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      dangerouslySetInnerHTML={{ __html: iconPaths(name) }}
    />
  );
}

// 站点标识：上传了 logo 用 logo，否则是主题色方块加图标
export function SiteMark({ icon, logo, size = 28 }: { icon: string; logo?: string; size?: number }) {
  if (logo) {
    return <img src={logo} alt="" width={size} height={size} className="shrink-0 rounded-md object-contain" />;
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-md bg-brand text-brand-foreground"
      style={{ width: size, height: size }}
    >
      <Icon name={icon} size={Math.round(size * 0.6)} />
    </span>
  );
}
