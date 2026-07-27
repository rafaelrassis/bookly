-- Purga one-time dos registros de `prisma/seed.ts` / `prisma/seed-data.ts`
-- (removidos do repo, mas nunca aplicados contra o banco de produção).
-- Mesmo critério de `scripts/purge-seed.ts` — mantenha os dois em sincronia.
--
-- Roda uma única vez via `prisma migrate deploy` (registrada em
-- _prisma_migrations). Idempotente: uma segunda aplicação não encontra nada
-- a apagar e não falha.

-- Guarda: aborta a migração inteira (RAISE EXCEPTION reverte a transação)
-- se algum clube criado por usuário de seed tiver membro ou mensagem de
-- usuário real — apagar o criador cascatearia e levaria junto participação
-- real. Nesse caso, precisa de revisão manual (ex.: transferir o clube).
DO $$
DECLARE
  bad_count integer;
BEGIN
  WITH seed_users AS (
    SELECT u."id" FROM "User" u
    JOIN (VALUES
      ('ana.estante', 'ana.estante@seed.bookly.local'),
      ('leituras.do.vale', 'leituras.do.vale@seed.bookly.local'),
      ('thriller.gab', 'thriller.gab@seed.bookly.local'),
      ('pedro_le', 'pedro_le@seed.bookly.local'),
      ('caio_reads', 'caio_reads@seed.bookly.local'),
      ('rafa.books', 'rafa.books@seed.bookly.local'),
      ('demo', 'demo@bookly.dev')
    ) AS seed(username, email)
      ON u."username" = seed.username AND u."email" = seed.email
  ),
  seed_clubs AS (
    SELECT c."id" FROM "Club" c WHERE c."creatorId" IN (SELECT "id" FROM seed_users)
  )
  SELECT COUNT(*) INTO bad_count
  FROM seed_clubs sc
  WHERE EXISTS (
    SELECT 1 FROM "ClubMember" cm
    WHERE cm."clubId" = sc."id" AND cm."userId" NOT IN (SELECT "id" FROM seed_users)
  ) OR EXISTS (
    SELECT 1 FROM "Message" m
    WHERE m."clubId" = sc."id" AND m."userId" NOT IN (SELECT "id" FROM seed_users)
  );

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'purge_seed_data: % clube(s) de seed com membro/mensagem de usuário real — abortando sem deletar nada. Revise manualmente (ver scripts/purge-seed.ts) antes de reaplicar.', bad_count;
  END IF;
END $$;

-- Usuários de seed (username E email precisam bater — evita apagar um
-- usuário real que por acaso tenha escolhido um desses usernames com o
-- próprio e-mail). Cascata (onDelete: Cascade no schema) remove em seguida
-- ShelfEntry, Review, ReviewLike, Comment, BookTag, Quote, List/ListBook,
-- Club/ClubMember/Message e Follow ligados a esses usuários.
DELETE FROM "User" u
WHERE (u."username", u."email") IN (VALUES
  ('ana.estante', 'ana.estante@seed.bookly.local'),
  ('leituras.do.vale', 'leituras.do.vale@seed.bookly.local'),
  ('thriller.gab', 'thriller.gab@seed.bookly.local'),
  ('pedro_le', 'pedro_le@seed.bookly.local'),
  ('caio_reads', 'caio_reads@seed.bookly.local'),
  ('rafa.books', 'rafa.books@seed.bookly.local'),
  ('demo', 'demo@bookly.dev')
);

-- Livros do catálogo semeado sem nenhuma referência real restante (a
-- cascata acima já removeu toda referência de usuário de seed — o que
-- sobra, por definição, é de usuário real).
DELETE FROM "Book" b
WHERE b."id" IN (
  'o-nome-do-vento', 'torto-arado', 'a-paciente-silenciosa', 'duna',
  'o-homem-de-giz', 'verity', '1984', 'ensaio-sobre-a-cegueira'
)
AND NOT EXISTS (SELECT 1 FROM "Review" r WHERE r."bookId" = b."id")
AND NOT EXISTS (SELECT 1 FROM "ShelfEntry" s WHERE s."bookId" = b."id")
AND NOT EXISTS (SELECT 1 FROM "BookTag" t WHERE t."bookId" = b."id")
AND NOT EXISTS (SELECT 1 FROM "Quote" q WHERE q."bookId" = b."id")
AND NOT EXISTS (SELECT 1 FROM "ListBook" lb WHERE lb."bookId" = b."id")
AND NOT EXISTS (SELECT 1 FROM "Club" c WHERE c."bookId" = b."id");

-- Recomputa avg/count dos livros do catálogo semeado que sobraram (tinham
-- review real além das de seed) — mesma fórmula de recomputeBookRating().
UPDATE "Book" b SET
  "avg" = COALESCE((SELECT AVG(r."rating") FROM "Review" r WHERE r."bookId" = b."id"), 0),
  "count" = (SELECT COUNT(*) FROM "Review" r WHERE r."bookId" = b."id")
WHERE b."id" IN (
  'o-nome-do-vento', 'torto-arado', 'a-paciente-silenciosa', 'duna',
  'o-homem-de-giz', 'verity', '1984', 'ensaio-sobre-a-cegueira'
);
