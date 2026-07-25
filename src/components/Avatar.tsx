"use client";

import { AVATAR_CHOICES, hashAvatarIndex } from "@/lib/avatars";
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
  /** Foto de perfil (Vercel Blob) de usuários reais, vinda da API. Ignorada
   * para o próprio usuário logado, que usa o avatarUrl do store. */
  avatarUrl?: string | null;
};

/** Avatar circular: usa a foto enviada (Blob) quando disponível, senão o
 * gradiente escolhido em Editar perfil (usuário logado) ou avatarIndex/hash
 * (demais usuários). */
export function Avatar({ user, size = 36, className = "", avatarIndex, avatarUrl }: AvatarProps) {
  const username = useStore((s) => s.user.username);
  const myAvatar = useStore((s) => s.user.avatar);
  const myAvatarUrl = useStore((s) => s.user.avatarUrl);

  const isMe = user === withAt(username);
  const initial = withoutAt(user).charAt(0).toUpperCase();
  const resolvedUrl = isMe ? myAvatarUrl : avatarUrl;

  if (resolvedUrl) {
    return (
      <span
        aria-hidden="true"
        className={`inline-block shrink-0 overflow-hidden rounded-full bg-cover bg-center ${className}`}
        style={{ width: size, height: size, backgroundImage: `url(${resolvedUrl})` }}
      />
    );
  }

  const [from, to] = isMe
    ? AVATAR_CHOICES[myAvatar] ?? AVATAR_CHOICES[0]
    : AVATAR_CHOICES[avatarIndex ?? hashAvatarIndex(user)] ?? AVATAR_CHOICES[0];

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
