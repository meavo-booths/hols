function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return (email?.slice(0, 2) ?? "?").toUpperCase();
}

const sizeClasses = {
  sm: { box: "h-8 w-8", text: "text-xs" },
  md: { box: "h-10 w-10", text: "text-sm" },
  lg: { box: "h-16 w-16", text: "text-lg" },
} as const;

export function UserAvatar({
  name,
  email,
  image,
  size = "md",
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: keyof typeof sizeClasses;
}) {
  const { box, text } = sizeClasses[size];

  if (image) {
    return (
      <img
        src={image}
        alt=""
        className={`${box} shrink-0 rounded-full bg-slate-100 object-cover`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${box} flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-medium text-brand-700 ${text}`}
      aria-hidden
    >
      {getInitials(name, email)}
    </div>
  );
}
