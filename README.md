# bookly.

Web app de avaliação e review de livros — um "Letterboxd de livros".

**MVP 1 · Fase A:** frontend com dados mocados. Sem banco, sem auth real, sem API externa — todo o estado vive em memória (React Context) e é reiniciado a cada refresh, como esperado nesta fase.

## Rodando

```bash
npm install
npm run dev
```

Abre em [http://localhost:3000](http://localhost:3000). Não precisa de variáveis de ambiente.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS com tokens próprios do design system
- Fontes: Fraunces (títulos) e Karla (corpo) via `next/font/google`
- Estado global mocado com React Context (`src/lib/store`)

## Estrutura

```
src/
  app/            rotas (App Router)
    page.tsx      landing (deslogado)
    login/        login fake
    onboarding/   nome, username e gêneros
    (app)/        rotas logadas (guard + tab bar)
      home/  search/  book/[id]/  shelf/  profile/
  components/     BookCover, Stars, RatingInput, TabBar, Logo
  data/books.ts   seed mocado com 8 livros
  lib/
    store/        UserProvider, ToastProvider e hooks (useShelf, useBook…)
    types.ts      Book, ShelfEntry, UserState…
    format.ts     formatação pt-BR (vírgula decimal, milhar, progresso)
```

## Fase B (futura)

O acesso a dados está isolado em `src/lib/store` para que a troca do mock por NextAuth + Postgres/Prisma + Google Books API seja localizada, mantendo os mesmos nomes de campos (`status`, `currentPage`, `rating`).
