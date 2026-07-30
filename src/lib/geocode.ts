/** Geocoding de cidade/UF via Nominatim (OpenStreetMap) — grátis, sem API
 * key, mas com política de uso restrita (máx. 1 req/s, User-Agent
 * identificável). Usado só na criação da doação; falha nunca bloqueia o
 * fluxo, a doação fica sem lat/lng e some da busca por raio (ver spec). */
const NOMINATIM_USER_AGENT = "bookly-app (https://bookly-puce.vercel.app)";

export async function geocodeCityState(
  city: string,
  state: string,
): Promise<{ lat: number; lng: number } | null> {
  const q = encodeURIComponent(`${city}, ${state}, Brasil`);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=br`,
      { headers: { "User-Agent": NOMINATIM_USER_AGENT } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const lat = parseFloat(data?.[0]?.lat);
    const lng = parseFloat(data?.[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
