/** Título de seção: Karla 800, caixa alta, tracking largo, paperDim (decisão de feedback). */
export function SectionTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`text-xs font-extrabold uppercase tracking-[0.18em] text-paperDim ${className}`}>
      {children}
    </h2>
  );
}
