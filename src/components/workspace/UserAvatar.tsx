import { cn } from "@/lib/utils";

function hashHue(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % 360;
}

function initials(name: string): string {
  const parts = name.replace(/[_\-.]/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface Props {
  name: string;
  online?: boolean;
  size?: number;
  className?: string;
}

export function UserAvatar({ name, online = true, size = 22, className }: Props) {
  const hue = hashHue(name);
  const bg = `hsl(${hue} 60% 38%)`;
  const fg = `hsl(${hue} 80% 92%)`;
  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <span
        className="flex items-center justify-center rounded-full font-semibold leading-none"
        style={{
          width: size,
          height: size,
          background: bg,
          color: fg,
          fontSize: size * 0.42,
          letterSpacing: "0.02em",
        }}
        aria-hidden
      >
        {initials(name)}
      </span>
      {online && (
        <span
          className="absolute bottom-0 right-0 size-1.5 rounded-full bg-success ring-2 ring-surface-1"
          aria-label="Online"
        />
      )}
    </span>
  );
}
