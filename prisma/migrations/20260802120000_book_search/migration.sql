CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() é STABLE, não IMMUTABLE: não pode ser usada direto em coluna
-- gerada nem em índice. Wrapper IMMUTABLE com dicionário qualificado.
CREATE OR REPLACE FUNCTION f_unaccent(text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
$$ SELECT public.unaccent('public.unaccent', $1) $$;

ALTER TABLE "Book"
  ADD COLUMN "searchText" text
  GENERATED ALWAYS AS (lower(f_unaccent("title" || ' ' || "authors"))) STORED;

CREATE INDEX "Book_searchText_trgm_idx" ON "Book" USING gin ("searchText" gin_trgm_ops);

-- ISBN normalizado (só dígitos e X), para busca exata sem hífen
ALTER TABLE "Book" ADD COLUMN "isbn10" text;
CREATE INDEX "Book_isbn10_idx" ON "Book" ("isbn10");
CREATE INDEX "Book_isbn_idx" ON "Book" ("isbn");
