export function Logo({ className = "text-2xl" }: { className?: string }) {
  return (
    <span className={`font-display font-black tracking-tight text-paper ${className}`}>
      bookly<span className="text-foil">.</span>
    </span>
  );
}
