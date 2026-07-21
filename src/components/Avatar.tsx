"use client";

import { AVATAR_CHOICES, avatarGradient } from "@/data/users";
import { withAt, withoutAt } from "@/lib/handle";
import { useStore } from "@/lib/store";

type AvatarProps = {
  /** Username com @ (ex.: "@ana.estante"). */
  user: string;
  size?: number;
  className?: string;
  /** Índice em AVATAR_CHOICES pra usuários reais (vindos da API), que não
   * estão no mock MOCK_USERS. Ignorado para o próprio usuário logado. */
  avatarIndex?: number;
};

/** Avatar circular com gradiente. O usuário logado usa o gradiente escolhido
 * em Editar perfil; demais usam avatarIndex (real) ou o gradiente mocado. */
export function Avatar({ user, size = 36, className = "", avatarIndex }: AvatarProps) {
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
    : avatarIndex !== undefined
      ? AVATAR_CHOICES[avatarIndex] ?? AVATAR_CHOICES[0]
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
