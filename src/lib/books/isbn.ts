/** Remove hífens/espaços e normaliza para maiúscula (X do ISBN-10). */
export function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, "").toUpperCase();
}

/** True quando a query parece um ISBN (10 ou 13 caracteres válidos). */
export function looksLikeIsbn(q: string): boolean {
  const n = normalizeIsbn(q);
  if (n.length === 13) return /^\d{13}$/.test(n);
  if (n.length === 10) return /^\d{9}[\dX]$/.test(n);
  return false;
}

/** ISBN-10 → ISBN-13 (prefixo 978 + dígito verificador). */
export function isbn10to13(isbn10: string): string | null {
  const n = normalizeIsbn(isbn10);
  if (n.length !== 10) return null;
  const core = "978" + n.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  return core + String((10 - (sum % 10)) % 10);
}
