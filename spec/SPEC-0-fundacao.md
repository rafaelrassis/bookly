# Spec 0 — Fundação (schema + setup + seed)

**Objetivo:** montar a base persistente do Bookly antes de qualquer módulo. Ao fim desta spec o projeto tem Postgres rodando, schema Prisma migrado e seed populado a partir de `src/data` — com os **mesmos nomes de campo do store Zustand**, para a troca mock→DB ser quase 1:1.

**Escopo:** só fundação. Endpoints, auth e regras de negócio ficam nas specs de domínio (1–4).

---

## Decisões (já tomadas)

- **API dentro do Next** — route handlers em `app/api`. Sem servidor separado.
- **Auth:** NextAuth (Auth.js) Credentials + estratégia **JWT** (sem tabela de sessão). Verificação de e-mail/reset por código de 6 dígitos ficam fora do NextAuth (tabela `VerificationCode`).
- **Chat:** polling por ora. Colunas e índices já prontos para virar WebSocket depois sem migration.
- **IDs de livro:** mantidos como **slug** (`"torto-arado"`), que é o que o front já usa. IDs de usuário/clube/etc. = `cuid()`.
- **Fonte da verdade:** o **store** (`src/lib/store`, `src/lib/types.ts`), não a `docs/ESPECIFICACAO.md` — o front já foi construído sobre ele.

## Divergências que resolvi (honesto)

1. **`avg`/`count` do livro** eram agregados mocados. Viram colunas **cacheadas** em `Book`, recalculadas ao gravar/apagar review. Alternativa seria `SELECT AVG()` sempre — mais simples, porém mais lento no feed. Fiquei no cache.
2. **`followers`/`following`** eram números fixos (128/87). Troquei por model `Follow` real; a contagem passa a ser derivada. Some o número fake.
3. **`rating` + `myReview`** eram dois mapas separados no store, mas semanticamente é **1 review por (user, livro)**. Unifiquei em `Review` (rating + texto + datas de leitura), com `@@unique([userId, bookId])`.
4. **`replyTo` do chat** era um snapshot `{user, text}`. Virou FK `replyToId` para a própria `Message` (integridade melhor); o front lê `replyTo.user`/`replyTo.text` via include.
5. Campos da `ESPECIFICACAO` que o front **não usa** (`isSpoiler`, `title` da review, `reactions`, `phone`) ficaram de fora do MVP. Fáceis de somar depois.

---

## `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────── enums ───────────────
enum ShelfStatus {
  WANT_TO_READ
  READING
  READ
}

enum Visibility {
  public
  private
}

enum ProgressUnit {
  pages
  percent
}

enum VerificationType {
  email
  phone
  password
}

// Os quatro enums acima são enums Postgres REAIS (não texto+Zod).
// ShelfStatus já nasce assim; Visibility/ProgressUnit/VerificationType
// confirmados via migração — validação existe no banco, não só na API.

// ─────────────── usuário ───────────────
model User {
  id           String       @id @default(cuid())
  email        String       @unique
  username     String       @unique
  passwordHash String
  name         String
  bio          String       @default("")
  genres       String[]     @default([])
  avatar       Int          @default(0) // índice do gradiente (AVATAR_CHOICES)
  progressUnit ProgressUnit @default(pages)
  top4         String[]     @default([]) // bookIds (slugs)

  emailVerified DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  shelf     ShelfEntry[]
  reviews   Review[]
  comments  Comment[]
  likes     ReviewLike[]
  tags      BookTag[]
  quotes    Quote[]
  lists     List[]
  clubsOwned Club[]        @relation("ClubCreator")
  memberships ClubMember[]
  messages  Message[]

  following Follow[] @relation("follower")
  followers Follow[] @relation("following")
}

model Follow {
  followerId  String
  followingId String
  createdAt   DateTime @default(now())

  follower  User @relation("follower", fields: [followerId], references: [id], onDelete: Cascade)
  following User @relation("following", fields: [followingId], references: [id], onDelete: Cascade)

  @@id([followerId, followingId])
}

// ─────────────── livro ───────────────
model Book {
  id           String   @id // slug
  title        String
  authors      String
  year         Int
  pages        Int
  genre        String
  gradientFrom String
  gradientTo   String
  synopsis     String
  avg          Float    @default(0) // cache: média dos ratings
  count        Int      @default(0) // cache: nº de reviews com rating

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  shelfEntries ShelfEntry[]
  reviews      Review[]
  tags         BookTag[]
  quotes       Quote[]
  clubs        Club[]
}

// ─────────────── estante ───────────────
model ShelfEntry {
  id          String      @id @default(cuid())
  userId      String
  bookId      String
  status      ShelfStatus
  currentPage Int?
  lastPage    Int?
  startedAt   DateTime?
  finishedAt  DateTime?

  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  book Book @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@unique([userId, bookId])
  @@index([userId, status])
}

// ─────────────── review (rating + texto + datas) ───────────────
model Review {
  id        String   @id @default(cuid())
  userId    String
  bookId    String
  rating    Float // 0.5–5, passo 0.5 (validar na app)
  text      String   @default("")
  startedAt DateTime?
  finishedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user     User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  book     Book         @relation(fields: [bookId], references: [id], onDelete: Cascade)
  comments Comment[]
  likes    ReviewLike[]

  @@unique([userId, bookId])
  @@index([bookId, createdAt]) // feed por livro
}

model Comment {
  id        String   @id @default(cuid())
  reviewId  String
  userId    String
  text      String
  createdAt DateTime @default(now())

  review Review @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([reviewId, createdAt])
}

model ReviewLike {
  reviewId String
  userId   String

  review Review @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([reviewId, userId])
}

// ─────────────── tags e citações (por usuário) ───────────────
model BookTag {
  id     String @id @default(cuid())
  userId String
  bookId String
  tag    String

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  book Book @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@unique([userId, bookId, tag])
}

model Quote {
  id     String @id @default(cuid())
  userId String
  bookId String
  text   String
  page   Int?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  book Book @relation(fields: [bookId], references: [id], onDelete: Cascade)
}

// ─────────────── listas ───────────────
model List {
  id         String     @id @default(cuid())
  userId     String
  name       String
  visibility Visibility @default(public)
  createdAt  DateTime   @default(now())

  user  User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  books ListBook[]
}

model ListBook {
  listId String
  bookId String
  order  Int    @default(0)

  list List @relation(fields: [listId], references: [id], onDelete: Cascade)

  @@id([listId, bookId])
}

// ─────────────── clubes ───────────────
model Club {
  id         String     @id @default(cuid())
  name       String
  bookId     String
  desc       String     @default("")
  visibility Visibility @default(public)
  code       String?    @unique // só privados (6 chars)
  creatorId  String

  createdAt DateTime @default(now())

  book     Book         @relation(fields: [bookId], references: [id])
  creator  User         @relation("ClubCreator", fields: [creatorId], references: [id])
  members  ClubMember[]
  messages Message[]
}

model ClubMember {
  clubId   String
  userId   String
  progress Int      @default(0) // 0–100
  role     String   @default("member") // "creator" | "member"
  joinedAt DateTime @default(now())

  club Club @relation(fields: [clubId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([clubId, userId])
}

model Message {
  id        String   @id @default(cuid())
  clubId    String
  userId    String
  text      String
  system    Boolean  @default(false)
  replyToId String?
  createdAt DateTime @default(now())

  club    Club      @relation(fields: [clubId], references: [id], onDelete: Cascade)
  user    User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  replyTo Message?  @relation("MessageReply", fields: [replyToId], references: [id])
  replies Message[] @relation("MessageReply")

  @@index([clubId, createdAt]) // polling: WHERE clubId=? AND createdAt > cursor
}

// ─────────────── verificação (fora do NextAuth) ───────────────
model VerificationCode {
  id        String           @id @default(cuid())
  email     String?
  phone     String?
  code      String           @db.Char(6)
  type      VerificationType
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime         @default(now())

  @@index([email, type])
}
```

---

## Setup (comandos)

```bash
npm install prisma @prisma/client
npm install -D tsx
npx prisma init --datasource-provider postgresql

# subir Postgres local (docker)
docker run --name bookly-db -e POSTGRES_PASSWORD=bookly \
  -e POSTGRES_DB=bookly -p 5432:5432 -d postgres:16

# .env
# DATABASE_URL="postgresql://postgres:bookly@localhost:5432/bookly?schema=public"

npx prisma migrate dev --name init
npx prisma db seed
```

`package.json`:
```json
{ "prisma": { "seed": "tsx prisma/seed.ts" } }
```

---

## Plano de seed (`prisma/seed.ts`)

Reaproveitar os arrays de `src/data` — sem redigitar dados:

1. **Books** → de `src/data/books`. `gradient: [a,b]` vira `gradientFrom/gradientTo`. `avg`/`count` entram como **0** e são **recalculados no passo final** a partir dos `Review` semeados — os números decorativos de `src/data/books.ts` (ex.: contagens infladas tipo 21458) são **ignorados**, não representam dados reais.
2. **Community users (6)** de `src/data/users` (autores do feed/comentários referenciados por `@username`) → `User` reais com `passwordHash` dev. São a fonte do feed.
3. **Usuário demo (`@demo`)** — conta logável de dev/QA (`demo@bookly.dev` / `bookly123`, `emailVerified` setado). Recebe estante (1 READING + 1 READ), 1 review, 1 clube público (como criador) e 1 mensagem. **Não** é a Marina: o `INITIAL_USER` do store é apenas placeholder de UI pré-login e **não** é semeado.
4. **Feed** (`FEED_REVIEWS`) → `Review` + `Comment` + `ReviewLike` (de `likedReviews`).
5. **Clubs** (`src/data/clubs`) → `Club` + `ClubMember` (com `memberProgress`→`progress`) + `Message` (de `feed[]`, `system` e `replyTo` mapeados).
6. **Recalcular cache**: para cada livro, `avg`/`count` a partir dos `Review` — este passo é o que dá verdade aos agregados; não é opcional.

> Ponto de atenção do seed: no store os autores do feed são strings `@username`. O seed precisa **resolver username→userId**; qualquer username citado que não exista em `src/data/users` tem que virar um User stub, senão a FK quebra. Vou checar isso ao escrever o seed.

---

## Definition of Done

- [ ] `npx prisma migrate dev` roda limpo.
- [ ] `npx prisma db seed` popula sem erro de FK.
- [ ] `npx prisma studio` mostra `@demo` logável com estante (1 READING + 1 READ), 1 review, e 1 clube público com mensagem.
- [ ] Os 6 community users existem com suas reviews (fonte do feed).
- [ ] Nenhum registro "Marina/INITIAL_USER" foi semeado (é placeholder de UI).
- [ ] `avg`/`count` dos livros batem com os ratings semeados (query de consistência = 0 linhas).
- [ ] Client Prisma gerado e importável em `src/lib/db.ts` (singleton).

---

## Próximas specs (ordem sugerida)

1. **auth** — NextAuth Credentials + register + verificação de e-mail.
2. **users** — perfil, edição, follow, settings.
3. **books + reviews + shelf** — página do livro, estante, feed.
4. **clubs + chat (polling)** — clubes, membros, mensagens.
```
