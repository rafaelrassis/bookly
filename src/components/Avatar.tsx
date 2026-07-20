import { avatarGradient } from "@/data/users";

type AvatarProps = {
  /** Username com @ (ex.: "@ana.estante"). */
  user: string;
  size?: number;
  className?: string;
};

/** Avatar circular com gradiente próprio de cada usuário mocado. */
export function Avatar({ user, size = 36, className = "" }: AvatarProps) {
  const [from, to] = avatarGradient(user);
  const initial = user.replace("@", "").charAt(0).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white/90 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      {initial}
    </span>
  );
}
