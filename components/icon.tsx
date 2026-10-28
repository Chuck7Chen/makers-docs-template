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

// Site mark: the site's icon on a theme-colored square
export function SiteMark({ icon, size = 28 }: { icon: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-md bg-brand text-brand-foreground"
      style={{ width: size, height: size }}
    >
      <Icon name={icon} size={Math.round(size * 0.6)} />
    </span>
  );
}
