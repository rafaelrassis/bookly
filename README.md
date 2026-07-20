# bookly.

Web app de avaliação e review de livros — um "Letterboxd de livros".

**Protótipo v2 (dados mocados):** todo o frontend com estado em memória — sem banco, sem auth real, sem API externa. **Os dados não persistem após refresh**; isso é esperado nesta fase. A v2 incorpora feedback de teste de usuário: feed social com curtidas e comentários, clubes do livro, tags e citações, filtros de estante e perfil com histograma de notas.

## Rodando

```bash
npm install
npm run dev
```

Abre em [http://localhost:3000](http://localhost:3000). Não precisa de variáveis de ambiente.

## Stack

- Next.js 14 (App Router) + TypeScript estrito
- Tailwind CSS com tokens próprios do design system
- Fontes: Fraunces (marca, títulos de livro, números) e Karla (todo o resto) via `next/font/google`
- **Zustand** — store único mocado em `src/lib/store`

## Estrutura

```
src/
  app/              rotas (App Router)
    page.tsx        landing (deslogado)
    login/          login fake
    onboarding/     nome, username, bio e gêneros
    (app)/          rotas logadas (guard + tab bar)
      home/  search/  book/[id]/  shelf/  clubs/  clubs/[id]/  profile/
  components/       BookCover, Stars, RatingInput, FeedPost, Avatar, TabBar…
  data/             seed mocado: books, feed, users, community, clubs
  lib/
    store/          store zustand + hooks derivados (useShelf, useBook, useMyStats…)
    types.ts        Book, FeedReview, Club, ShelfEntry, UserState…
    format.ts       formatação pt-BR (vírgula decimal, milhar, progresso)
```

## Fase futura

O mock será trocado por NextAuth + Postgres/Prisma + Google Books API. Todo acesso a dados passa pelo store e pelos hooks em `src/lib/store`, então a troca fica localizada, mantendo os mesmos nomes de campos (`status`, `currentPage`, `rating`…).
