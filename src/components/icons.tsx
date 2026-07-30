export function LockIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  );
}

/** Ícone genérico (livro aberto) pros estados vazios do app. */
export function BookOpenIcon({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 6.5c-1.6-1.2-3.6-1.8-5.8-1.8-.7 0-1.2.55-1.2 1.2v11.6c0 .7.55 1.2 1.2 1.2 2.2 0 4.2.6 5.8 1.8" />
      <path d="M12 6.5c1.6-1.2 3.6-1.8 5.8-1.8.7 0 1.2.55 1.2 1.2v11.6c0 .7-.55 1.2-1.2 1.2-2.2 0-4.2.6-5.8 1.8V6.5Z" />
    </svg>
  );
}

/** Selo de doação disponível (busca/estante) e ícone do fluxo de doação. */
export function GiftIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7" />
      <path d="M12 8H7.5a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8Z" />
      <path d="M12 8h4.5a2.5 2.5 0 1 0 0-5C13 3 12 8 12 8Z" />
    </svg>
  );
}

/** Selo de confiança no perfil — doações confirmadas pelos dois lados. */
export function BadgeCheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.5 14.4 4.8 17.7 4.3 18.6 7.5 21.5 9.2 20.3 12.3 21.5 15.4 18.6 17.1 17.7 20.3 14.4 19.8 12 22.1 9.6 19.8 6.3 20.3 5.4 17.1 2.5 15.4 3.7 12.3 2.5 9.2 5.4 7.5 6.3 4.3 9.6 4.8Z" />
      <path d="m8.5 12.3 2.3 2.3 4.7-4.7" />
    </svg>
  );
}

export function CopyIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
