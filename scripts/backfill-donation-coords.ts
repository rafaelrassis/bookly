/**
 * Backfill único (não roda automaticamente no build) pra doações criadas
 * antes da feature de raio de proximidade, que ficaram sem latitude/
 * longitude. Respeita a política do Nominatim (máx. 1 req/s) com delay
 * fixo entre chamadas. Rodar manualmente: `npx tsx scripts/backfill-donation-coords.ts`.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { geocodeCityState } from "../src/lib/geocode";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("backfill-donation-coords: sem DATABASE_URL, abortando.");
    return;
  }

  const adapter = new PrismaPg({ connectionString });
  const db = new PrismaClient({ adapter });

  try {
    const donations = await db.donation.findMany({ where: { latitude: null } });
    console.log(`backfill-donation-coords: ${donations.length} doações sem coordenadas.`);

    for (const d of donations) {
      const coords = await geocodeCityState(d.city, d.state);
      if (coords) {
        await db.donation.update({
          where: { id: d.id },
          data: { latitude: coords.lat, longitude: coords.lng },
        });
        console.log(`  ✓ ${d.city}/${d.state} -> ${coords.lat}, ${coords.lng}`);
      } else {
        console.log(`  ✗ ${d.city}/${d.state} — geocoding falhou, mantendo nula`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("backfill-donation-coords: falhou:", err);
  process.exit(1);
});
