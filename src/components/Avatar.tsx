"use client";

import { AVATAR_CHOICES, avatarGradient } from "@/data/users";
import { useStore } from "@/lib/store";

type AvatarProps = {
  /** Username com @ (ex.: "@ana.estante"). */
  user: string;
  size?: number;
  className?: string;
};

/** Avatar circular com gradiente. O usuário logado usa o gradiente escolhido
 * em Editar perfil; usuários mocados têm gradiente próprio. */
export function Avatar({ user, size = 36, className = "" }: AvatarProps) {
  const username = useStore((s) => s.user.username);
  const myAvatar = useStore((s) => s.user.avatar);

  const isMe = user === `@${username}`;
  const [from, to] = isMe
    ? AVATAR_CHOICES[myAvatar] ?? AVATAR_CHOICES[0]
    : avatarGradient(user);
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
