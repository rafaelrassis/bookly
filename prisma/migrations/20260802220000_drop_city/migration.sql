-- DropTable
-- Autocomplete de cidades passou a usar lista estática (src/data/br-cities.ts)
-- em vez de tabela seedada manualmente do IBGE (ver prisma/seed-cities.ts, removido).
DROP TABLE "City";
