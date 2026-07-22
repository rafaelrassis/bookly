# bookly.

Web app de avaliação e review de livros — um "Letterboxd de livros".

**Backend real:** Postgres/Prisma + NextAuth (credentials), com auth, perfil/follow, catálogo/estante/reviews, clubes com chat, feed social e listas todos persistidos no banco (rotas em `src/app/api/**`). O único domínio ainda mocado é **notificações** (`src/data/notifications.ts`, guardado no store local). Usuário demo pro dev/QA: `demo@bookly.dev` / `bookly123` (ver `prisma/seed.ts`).

📄 Especificação completa do produto (visão, fluxos, modelos de dados, roadmap, stack alvo): [`docs/ESPECIFICACAO.md`](docs/ESPECIFICACAO.md).

Principais features (v2 + v3):

- Feed social com curtidas, comentários e filtro Geral/Seguindo
- Progresso de leitura na página do livro com unidade **Páginas | %** e datas de leitura ("Leu de 12 jul a 20 jul") nas reviews; a home lista **todas** as leituras atuais
- Tags, citações e avaliação com meia estrela por livro
- Estante com filtros compostos (status/gênero/tag) e **listas** públicas/privadas (as públicas aparecem no perfil)
- **Clubes do livro** públicos e privados (código de convite de 6 caracteres), criação de clube e mural em formato de **chat** com respostas citadas, menções `@` e mensagens de sistema de progresso
- Perfil com histograma de notas, favoritos editáveis, faixa de estatísticas e **edição de perfil** (username, foto, bio, top 4)
- **Configurações** com conta mocada, troca de senha fake e **tema claro/escuro** funcional (tokens em CSS variables)

## Rodando

Precisa de um Postgres e das variáveis de ambiente — copie `.env.example` pra
`.env` e ajuste `DATABASE_URL`/`AUTH_SECRET` (`npx auth secret` gera o segredo).

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Abre em [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js 14 (App Router) + TypeScript estrito
- Postgres + Prisma (`prisma/schema.prisma`, `prisma/migrations/`)
- NextAuth (Credentials) para auth real — sessão via `src/middleware.ts`
- Tailwind CSS com tokens próprios do design system
- Fontes: Fraunces (marca, títulos de livro, números) e Karla (todo o resto) via `next/font/google`
- **Zustand** — cache/estado de UI em `src/lib/store`, sincronizado com a sessão e a API (`AuthSync`); notificações ainda vivem só no store

## Estrutura

```
src/
  app/              rotas (App Router)
    page.tsx        landing (deslogado)
    login/ signup/  auth real (NextAuth Credentials)
    onboarding/     nome, username, bio e gêneros — grava via /api/users/me
    (app)/          rotas logadas (guard no middleware + tab bar)
      home/  search/  book/[id]/  shelf/  lists/[id]/
      clubs/  clubs/new/  clubs/[id]/  profile/  profile/edit/  settings/
    api/            rotas reais: auth, users, books, shelf, clubs, feed, lists, verification
  components/       BookCover, Stars, RatingInput, FeedPost, Avatar, TabBar, AuthSync…
  data/             notificações mocadas (único domínio sem backend ainda)
  lib/
    db.ts           singleton do Prisma Client
    auth.ts / auth.config.ts   config do NextAuth
    store/          store zustand (cache de sessão/perfil + notificações) e hooks derivados
    types.ts        Book, FeedReview, Club, ShelfEntry, UserState…
    format.ts       formatação pt-BR (vírgula decimal, milhar, progresso)
prisma/
  schema.prisma     models reais (User, Book, ShelfEntry, Review, Club, Message…)
  seed.ts           seed com livros, comunidade e usuário @demo
  migrations/       histórico de migrations
e2e/                suíte Playwright (auth, books, clubs, social, users) — 44 specs
docs/VALIDATION_REPORT.md   relatório de validação do backend (Spec V)
```
