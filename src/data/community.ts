import type { CommunityList } from "@/lib/types";

/** Listas da comunidade (mock) — exibidas na busca sem query. */
export const COMMUNITY_LISTS: CommunityList[] = [
  {
    name: "Clássicos que valem o hype",
    by: "@caio_reads",
    bookIds: ["1984", "ensaio-sobre-a-cegueira", "duna"],
  },
  {
    name: "Thrillers de uma sentada",
    by: "@thriller.gab",
    bookIds: ["a-paciente-silenciosa", "o-homem-de-giz", "verity"],
  },
];
