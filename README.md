# bookly.

Web app de avaliação e review de livros — um "Letterboxd de livros".

**Backend real:** Postgres/Prisma + Auth.js v5 (Google/Amazon OAuth), com auth, perfil/follow, catálogo/estante/reviews, clubes com chat, feed social e listas todos persistidos no banco (rotas em `src/app/api/**`). Não há nenhum dado de domínio mocado em `src/`: **notificações** (`src/lib/store`) ainda não têm model no Prisma, então ficam só no store local (client-only, sem seed) — o sino/página zeram e resetam com `localStorage.clear()`, sem atividade fabricada. Não existe mais seed automático em nenhum ambiente: o catálogo nasce vazio e é populado pela busca real (Google Books, `getOrCreateBook`); contas são só as criadas via OAuth ou `/api/auth/register`.

📄 Especificação completa do produto (visão, fluxos, modelos de dados, roadmap, stack alvo): [`docs/ESPECIFICACAO.md`](docs/ESPECIFICACAO.md).

Principais features (v2 + v3):

- Feed social com curtidas, comentários e filtro Geral/Seguindo
- Progresso de leitura na página do livro com unidade **Páginas | %** e datas de leitura ("Leu de 12 jul a 20 jul") nas reviews; a home lista **todas** as leituras atuais
- Tags, citações e avaliação com meia estrela por livro
- Estante com filtros compostos (status/gênero/tag) e **listas** públicas/privadas (as públicas aparecem no perfil)
- **Clubes do livro** públicos e privados (código de convite de 6 caracteres), criação de clube e mural em formato de **chat** com respostas citadas, menções `@` e mensagens de sistema de progresso
- Perfil com histograma de notas, favoritos editáveis, faixa de estatísticas e **edição de perfil** (username, foto, bio, top 4)
- **Configurações** com dados de conta reais (e-mail, troca de senha via `/api/users/me/password` quando o login por e-mail está habilitado), import do Goodreads, feedback e **tema claro/escuro** funcional (tokens em CSS variables)

## Rodando

Precisa de um Postgres e das variáveis de ambiente — copie `.env.example` pra
`.env` e ajuste `DATABASE_URL`/`AUTH_SECRET` (`npx auth secret` gera o segredo).

```bash
npm install
npx prisma migrate deploy
npm run dev
```

Abre em [http://localhost:3000](http://localhost:3000).

## Deploy — só produção

Só a branch `main` gera deployment na Vercel. Isso é forçado por
`vercel.json` (`ignoreCommand`): qualquer push cujo `VERCEL_GIT_COMMIT_REF`
não seja `main` sai com código 0 e o build é ignorado (nenhum Preview
deployment é construído), independente do nome/padrão da branch — inclusive
`claude/*`. `git.deploymentEnabled` (a outra forma de configurar isso) foi
descartada porque branches não listadas nele **defaultam pra `true`**, o que
não bloqueia branches novas/desconhecidas.

Se algum dia isso não bastar (ex.: mudança futura na plataforma), o backup é
o dashboard: **Project → Settings → Git → Production Branch** já restringe
qual branch é produção; a seção de deployments ali também permite desligar
deploy automático de branches fora dela.

## Limpeza do seed legado (migração one-time)

O catálogo/usuários de seed antigos (`@seed.bookly.local`, `demo`, catálogo
fixo tipo `duna`/`1984`) foram removidos do código há um tempo, mas nunca
tinham sido apagados do banco de **produção** — o passo era manual e ficou
pendente. Isso foi corrigido com uma migração Prisma one-time,
`prisma/migrations/20260727184144_purge_seed_data`, que roda automaticamente
no próximo `prisma migrate deploy` (já parte do `build`, ver `package.json`),
é registrada em `_prisma_migrations` e portanto executa **uma única vez**.

A migração:
- Apaga só os 7 usuários de seed (username **e** email precisam bater os
  valores fixos — não risca usuário real que tenha escolhido o mesmo
  username com o próprio e-mail). Todo o resto (estante, reviews, curtidas,
  comentários, listas, clubes, follows desses usuários) cai em cascata via
  `onDelete: Cascade` do schema.
- Apaga os livros do catálogo semeado só se não sobrar nenhuma referência
  real (review/estante/tag/citação/lista/clube de usuário real), e
  recalcula `avg`/`count` dos que ficarem.
- **Aborta a migração inteira** (falha o deploy, nada é apagado) se algum
  clube criado por usuário de seed tiver membro ou mensagem de usuário
  real — esse caso precisa de revisão manual antes de reaplicar.
- Validada localmente (Postgres descartável com seed + dados reais
  fabricados): seed some, dado real fica, e reaplicar não falha nem apaga
  nada de novo (idempotente).

**CI verde ≠ produção limpa.** `npm run guard:no-seed` (rodado no CI) só
enxerga o **banco de teste** do pipeline — nunca vai detectar seed vivo em
produção, foi exatamente por isso que o deploy anterior passou verde com o
banco de prod sujo. Pra checar produção de verdade, rode manualmente (ou
via job agendado, nunca no CI de PR):

```bash
DATABASE_URL="<url de produção>" npm run guard:no-seed:prod
```

Isso mais uma inspeção visual (aba anônima, Prisma Studio) é a única fonte
de verdade sobre o estado do banco de produção.

## Stack

- Next.js 14 (App Router) + TypeScript estrito
- Postgres + Prisma (`prisma/schema.prisma`, `prisma/migrations/`)
- NextAuth (Auth.js v5) — login via Google/Amazon OAuth (Credentials com e-mail/senha existe no código mas fica desligado por padrão, ver `NEXT_PUBLIC_EMAIL_LOGIN_ENABLED`); sessão via `src/middleware.ts`
- Tailwind CSS com tokens próprios do design system
- Fontes: Fraunces (marca, títulos de livro, números) e Karla (todo o resto) via `next/font/google`
- **Zustand** — cache/estado de UI em `src/lib/store`, sincronizado com a sessão e a API (`AuthSync`); notificações ainda vivem só no store

## Estrutura

```
src/
  app/              rotas (App Router)
    page.tsx        landing (deslogado)
    login/ signup/  auth real (NextAuth — Google/Amazon OAuth; Credentials por e-mail/senha opcional via flag)
    onboarding/     nome, username, bio e gêneros — grava via /api/users/me
    (app)/          rotas logadas (guard no middleware + tab bar)
      home/  search/  book/[id]/  shelf/  lists/[id]/
      clubs/  clubs/new/  clubs/[id]/  profile/  profile/edit/  settings/
    api/            rotas reais: auth, users, books, shelf, clubs, feed, lists, verification
  components/       BookCover, Stars, RatingInput, FeedPost, Avatar, TabBar, AuthSync…
  lib/
    db.ts           singleton do Prisma Client
    auth.ts / auth.config.ts   config do NextAuth
    store/          store zustand (cache de sessão/perfil + notificações, sem model no Prisma — client-only) e hooks derivados
    genres.ts / avatars.ts  constantes de UI (gêneros do onboarding, gradientes de avatar)
    types.ts        Book, ApiReview, Club, ShelfEntry, UserState…
    format.ts       formatação pt-BR (vírgula decimal, milhar, progresso)
prisma/
  schema.prisma     models reais (User, Book, ShelfEntry, Review, Club, Message…)
  migrations/       histórico de migrations
scripts/
  purge-seed.ts       utilitário pontual pra remover os registros de seed legado do banco (dry-run por padrão, --apply pra deletar) — mesmo critério da migração `purge_seed_data`, útil pra medir antes/depois manualmente
  assert-no-seed.ts   guarda de regressão (`npm run guard:no-seed`, rodado no CI) — falha se o seed legado voltar: arquivo `prisma/seed.ts`/`seed-data.ts` recriado, referência a "seed" no build/CI, ou usuário de seed no banco
e2e/                suíte Playwright (auth, books, clubs, social, users) — 44 specs; e2e/global-setup.ts semeia só a fixture mínima de catálogo (duna/1984/verity) usada pelos testes
docs/VALIDATION_REPORT.md   relatório de validação do backend (Spec V)
```
