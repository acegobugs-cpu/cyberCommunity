type Status = "online" | "offline" | "away" | undefined;

const STATUS_COLOR: Record<"online" | "offline" | "away", string> = {
  online: "bg-htb-green",
  offline: "bg-htb-text-dim",
  away: "bg-htb-amber",
};

const SIZE_PX: Record<"sm" | "md" | "lg", number> = {
  sm: 24,
  md: 36,
  lg: 48,
};

const FONT_SIZE: Record<"sm" | "md" | "lg", string> = {
  sm: "text-[0.65rem]",
  md: "text-xs",
  lg: "text-sm",
};

const PALETTE = [
  "#9fef00",
  "#00d4ff",
  "#a855f7",
  "#ff2e63",
  "#ffaa00",
  "#ff4d4f",
  "#3b82f6",
  "#10b981",
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function MemberAvatar({
  name,
  color,
  status,
  size = "md",
}: {
  name: string;
  color?: string;
  status?: Status;
  size?: "sm" | "md" | "lg";
}) {
  const px = SIZE_PX[size];
  const initials = name
    .split(/[_\s.-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  const bg = color ?? colorFromName(name);

  return (
    <div
      className="relative inline-flex items-center justify-center rounded font-bold"
      style={{
        width: px,
        height: px,
        backgroundColor: bg,
        color: "#0a0e14",
      }}
    >
      <span className={FONT_SIZE[size]}>{initials || "?"}</span>
      {status && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-htb-bg-card ${
            STATUS_COLOR[status]
          }`}
        />
      )}
    </div>
  );
}
