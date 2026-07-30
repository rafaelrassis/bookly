-- Clube nasce sem livro definido: seleção de livro na criação foi removida
-- (duplicava o fluxo de livro do mês). `bookId` legado vira opcional.
ALTER TABLE "Club" ALTER COLUMN "bookId" DROP NOT NULL;
