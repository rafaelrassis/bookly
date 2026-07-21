"use client";

import { AVATAR_CHOICES, avatarGradient } from "@/data/users";
import { withAt, withoutAt } from "@/lib/handle";
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
  const myAvatarImage = useStore((s) => s.user.avatarImage);

  const isMe = user === withAt(username);
  const initial = withoutAt(user).charAt(0).toUpperCase();

  if (isMe && myAvatarImage) {
    return (
      <span
        aria-hidden="true"
        className={`inline-block shrink-0 overflow-hidden rounded-full bg-cover bg-center ${className}`}
        style={{ width: size, height: size, backgroundImage: `url(${myAvatarImage})` }}
      />
    );
  }

  const [from, to] = isMe
    ? AVATAR_CHOICES[myAvatar] ?? AVATAR_CHOICES[0]
    : avatarGradient(user);

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
