# Bookly — Specs de Backend e Integração (0 a 5)

Documento consolidado. Ordem de execução = ordem das seções abaixo.

## Sumário

- [Spec 0 — Fundação](#spec-0--fundação-schema--setup--seed)
- [Spec 1 — Auth](#spec-1--auth-nextauth-credentials--verificação-de-e-mail)
- [Spec 2 — Users](#spec-2--users-perfil-edição-follow-settings)
- [Spec 3a — Books, estante, reviews](#spec-3a--books-estante-reviews-a-página-do-livro)
- [Spec 3b — Feed + listas](#spec-3b--feed-social--listas)
- [Spec 4 — Clubs + chat](#spec-4--clubs--chat-última)
- [Spec 5 — Integração do frontend](#spec-5--integração-do-frontend-store--api-tela-a-tela)

---

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

1. **Books** → de `src/data/books`. `gradient: [a,b]` vira `gradientFrom/gradientTo`. `avg`/`count` entram como 0 e são recalculados no passo 5.
2. **Usuário Marina** (`INITIAL_USER`) → cria `User` com `passwordHash` de uma senha dev (ex.: `bcrypt("bookly123")`). `email`/`username` do mock.
   - `shelf` (map) → linhas `ShelfEntry`.
   - `ratings` + `myReviews` → merge em `Review` (rating obrigatório; text quando existir).
   - `bookTags`, `quotes`, `lists` → seus models.
3. **Demais usuários** de `src/data/users` (autores do feed/comentários referenciados por `@username`) → criar como `User` para as FKs fecharem.
4. **Feed** (`FEED_REVIEWS`) → `Review` + `Comment` + `ReviewLike` (de `likedReviews`).
5. **Clubs** (`src/data/clubs`) → `Club` + `ClubMember` (com `memberProgress`→`progress`) + `Message` (de `feed[]`, `system` e `replyTo` mapeados).
6. **Recalcular cache**: para cada livro, `avg`/`count` a partir dos `Review`.

> Ponto de atenção do seed: no store os autores do feed são strings `@username`. O seed precisa **resolver username→userId**; qualquer username citado que não exista em `src/data/users` tem que virar um User stub, senão a FK quebra. Vou checar isso ao escrever o seed.

---

## Definition of Done

- [ ] `npx prisma migrate dev` roda limpo.
- [ ] `npx prisma db seed` popula sem erro de FK.
- [ ] `npx prisma studio` mostra Marina com estante, reviews, listas e ao menos 1 clube com mensagens.
- [ ] `avg`/`count` dos livros batem com os ratings semeados.
- [ ] Client Prisma gerado e importável em `src/lib/db.ts` (singleton).

---

## Próximas specs (ordem sugerida)

1. **auth** — NextAuth Credentials + register + verificação de e-mail.
2. **users** — perfil, edição, follow, settings.
3. **books + reviews + shelf** — página do livro, estante, feed.
4. **clubs + chat (polling)** — clubes, membros, mensagens.
```


---

# Spec 1 — Auth (NextAuth Credentials + verificação de e-mail)

**Depende de:** Spec 0 (models `User`, `VerificationCode`).

**Objetivo:** login/registro reais, sessão via NextAuth (JWT), verificação de e-mail por código de 6 dígitos e reset de senha. Substituir o "login fake" (`app/login`) e o guard mocado por sessão real.

**Escopo:** só autenticação e conta-base. Edição de perfil, follow e settings ficam na Spec 2.

---

## Decisões

- **NextAuth v5 (Auth.js)**, provider **Credentials**, `session.strategy = "jwt"` (sem tabela `Session`/`Account` — Credentials não usa adapter).
- **Registro** por route handler próprio (`POST /api/auth/register`) — NextAuth Credentials não registra, só autentica.
- **Verificação de e-mail e reset**: fluxos próprios com `VerificationCode` (6 dígitos, TTL 15 min). Fora do NextAuth.
- **Hash:** `bcryptjs` (puro JS, evita build nativo no serverless).
- **Envio de e-mail:** abstraído atrás de `sendMail()`. No dev, **loga o código no console** (sem SendGrid). Provider real vira config depois.
- **Middleware** protege as rotas logadas (grupo `(app)`).

## Ideias novas (refinar)

1. **Login não exige e-mail verificado** no MVP — deixo entrar e mostro um banner "confirme seu e-mail". Bloquear no login trava onboarding e some com usuário. Se preferir barrar, é uma linha no `authorize`.
2. **Rate limit** no envio de código (1 a cada 60s por e-mail) já nesta spec — barato e evita abuso/custo de e-mail. Uso a própria tabela (`createdAt` do último code).
3. **Verificação por código vs. link mágico:** o front já tem UI de código de 6 dígitos (`VerificationModal`), então mantenho código. Link seria menos atrito, mas jogaria fora a tela pronta.

---

## Dependências

```bash
npm install next-auth@beta bcryptjs zod
npm install -D @types/bcryptjs
```

`.env`:
```env
AUTH_SECRET="<npx auth secret>"
# dev: e-mails vão pro console. Prod: SENDGRID_API_KEY + MAIL_FROM
```

---

## Config NextAuth — `src/lib/auth.ts`

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      authorize: async (raw) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) token.uid = user.id;
      return token;
    },
    session: ({ session, token }) => {
      if (token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
});
```

`src/app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

Tipagem da sessão — `src/types/next-auth.d.ts`:
```ts
import "next-auth";
declare module "next-auth" {
  interface Session {
    user: { id: string; name?: string | null; email?: string | null };
  }
}
```

---

## Registro — `POST /api/auth/register`

Body: `{ email, username, password, name }`

Regras:
- Zod: e-mail válido, `username` 3–20 `[a-z0-9._]`, `password` min 8, `name` 1–60.
- `email` e `username` únicos → 409 se já existem.
- `bcrypt.hash(password, 10)` → cria `User` (`emailVerified: null`).
- Dispara `sendEmailCode(email)` (verificação).
- **Não** loga automaticamente; o front chama `signIn` em seguida (ou redireciona pro onboarding). Retorna `{ id, username }`.

```ts
// src/app/api/auth/register/route.ts (esqueleto)
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmailCode } from "@/lib/verification";

const schema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-z0-9._]+$/),
  password: z.string().min(8),
  name: z.string().min(1).max(60),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, username, password, name } = parsed.data;

  const clash = await db.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true },
  });
  if (clash) {
    return NextResponse.json(
      { error: clash.email === email ? "e-mail em uso" : "username em uso" },
      { status: 409 },
    );
  }

  const user = await db.user.create({
    data: { email, username, name, passwordHash: await bcrypt.hash(password, 10) },
    select: { id: true, username: true },
  });

  await sendEmailCode(email);
  return NextResponse.json(user, { status: 201 });
}
```

---

## Verificação de e-mail — `src/lib/verification.ts`

```ts
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";

const TTL_MIN = 15;
const RESEND_COOLDOWN_S = 60;

function gen() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 dígitos
}

export async function sendEmailCode(email: string) {
  const last = await db.verificationCode.findFirst({
    where: { email, type: "email" },
    orderBy: { createdAt: "desc" },
  });
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_S * 1000) {
    throw new Error("cooldown");
  }

  const code = gen();
  await db.verificationCode.create({
    data: {
      email,
      code,
      type: "email",
      expiresAt: new Date(Date.now() + TTL_MIN * 60_000),
    },
  });
  await sendMail(email, "Seu código Bookly", `Código: ${code} (expira em ${TTL_MIN} min)`);
}

export async function verifyEmailCode(email: string, code: string) {
  const rec = await db.verificationCode.findFirst({
    where: { email, type: "email", code, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!rec) return false;

  await db.$transaction([
    db.verificationCode.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { email }, data: { emailVerified: new Date() } }),
  ]);
  return true;
}
```

Endpoints:
- `POST /api/verification/email/send` — body `{ email }` → dispara código (respeita cooldown; 429 se em cooldown).
- `POST /api/verification/email/verify` — body `{ email, code }` → `{ ok: true }` ou 400.

Mailer dev — `src/lib/mail.ts`:
```ts
export async function sendMail(to: string, subject: string, body: string) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[mail:dev] → ${to} | ${subject}\n${body}`);
    return;
  }
  // TODO Spec futura: integrar SendGrid
}
```

---

## Reset de senha (fluxo por código)

Reaproveita `VerificationCode` com `type: "password"`.

1. `POST /api/auth/forgot` — body `{ email }`. Gera code tipo `password`, envia. **Sempre 200** (não revela se o e-mail existe).
2. `POST /api/auth/reset` — body `{ email, code, password }`. Valida code não usado/não expirado → `bcrypt.hash` → atualiza `passwordHash`, marca code usado. Retorna 200 ou 400.

---

## Proteção de rotas — `src/middleware.ts`

```ts
import { auth } from "@/lib/auth";

export default auth((req) => {
  const logged = !!req.auth;
  const path = req.nextUrl.pathname;
  const isAppRoute = ["/home","/search","/book","/shelf","/lists","/clubs","/profile","/settings"]
    .some((p) => path.startsWith(p));

  if (isAppRoute && !logged) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|onboarding|$).*)"],
};
```

Server-side, ler usuário: `const session = await auth()` → `session.user.id`.

---

## Impacto no front (o que troca)

- `app/login` fake → chama `signIn("credentials", { email, password })`.
- Onboarding: ao concluir, chama `/api/auth/register` e depois `signIn`.
- `VerificationModal` → aponta pros endpoints `/api/verification/email/*`.
- Guard mocado do grupo `(app)` → removido; quem protege é o middleware.
- Store: `user.loggedIn`/`logout` deixam de ser mock; sessão vem de `auth()`/`useSession()`.

---

## Definition of Done

- [ ] Registrar cria User com hash e dispara código (visível no console dev).
- [ ] `signIn` com credenciais corretas abre sessão; erradas retornam erro.
- [ ] Verificar e-mail seta `emailVerified`; código expirado/errado falha.
- [ ] Reenvio respeita cooldown de 60s (429).
- [ ] Forgot/reset trocam a senha e invalidam o código.
- [ ] Rotas do grupo `(app)` redirecionam pra `/login` sem sessão.
- [ ] `auth()` retorna `user.id` em route handlers.

---

## Aberto pra você decidir

- **Barrar login sem e-mail verificado?** Meu default: não barra (banner).
- **Provider de e-mail real** agora ou depois? Deixei stub no console.
- **Onboarding vs. register:** o front tem onboarding (nome/username/bio/gêneros) *depois* do "login". Faz sentido **register = onboarding** num passo só, ou manter login→onboarding separados? Recomendo unificar: um form de signup que já cria tudo.


---

# Spec 2 — Users (perfil, edição, follow, settings)

**Depende de:** Spec 0 (models), Spec 1 (sessão + verificação).

**Objetivo:** perfil real (próprio e de terceiros), edição de perfil, follow/unfollow, estatísticas derivadas do banco e settings de conta (trocar e-mail com verificação, trocar senha). Substituir o `user` mocado do store e o `useMyStats` em memória.

**Escopo:** só usuário/conta. Livros, reviews e feed ficam na Spec 3.

---

## Decisões

- **Perfil por username** na rota pública (`/profile/[username]`); `/profile` = próprio (via sessão).
- **Stats derivadas no servidor**, não guardadas: `readCount`, `pagesRead`, `reviewCount`, `avgRating`, histograma de notas. Uma query agregada, não colunas.
- **Follow real** (model `Follow`); `followers`/`following` viram contagens (`_count`).
- **Trocar e-mail** exige código enviado ao **novo** e-mail (como no fluxo da ESPECIFICACAO). **Trocar senha** exige a **senha atual** (sem código — mais simples e seguro o bastante; o reset por código já cobre "esqueci").
- **Tema claro/escuro** continua **client-only** (CSS vars). Não vai pro banco no MVP — é preferência local. Se quiser sincronizar entre dispositivos, viraria coluna depois.
- **Privacidade / 2FA / sessões ativas / telefone**: fora do MVP (a `ESPECIFICACAO` desenha, mas o front não tem). Anotado como futuro.

## Ideias novas (refinar)

1. **`avatar` como índice de gradiente** funciona pro MVP (sem upload). Deixo o campo pronto pra virar `avatarUrl` quando entrar upload (spec futura) — os dois podem coexistir.
2. **Feed "Seguindo"** (o front já tem o filtro Geral/Seguindo) depende de `Follow`. Esta spec entrega o grafo; a Spec 3 consome no feed.
3. **`top4`** hoje é `String[]` de bookIds. Validar que os ids existem ao salvar, senão o perfil renderiza capa quebrada.

---

## Endpoints

Todos sob sessão (`auth()`), exceto GET de perfil público.

### Perfil

`GET /api/users/[username]` — dados públicos + stats + relação de follow com o viewer.
```jsonc
{
  "id": "...", "username": "mari.leituras", "name": "Marina Souza",
  "bio": "...", "genres": ["Fantasia","Romance","Thriller"],
  "avatar": 0, "top4": ["torto-arado","duna","1984","ensaio-sobre-a-cegueira"],
  "followers": 3, "following": 5,
  "isMe": false, "isFollowing": true,
  "stats": {
    "readCount": 5, "pagesRead": 2470, "reviewCount": 2, "avgRating": 4.2,
    "histogram": { "0.5":0,"1":0, "...": 0, "5":1 }
  }
}
```

`GET /api/users/me` — igual, mas do usuário logado (atalho pro front).

### Editar perfil

`PATCH /api/users/me` — body parcial `{ username?, name?, bio?, avatar?, top4?, genres?, progressUnit? }`.
- Zod: `username` 3–20 `[a-z0-9._]` **e único** (409 se tomado por outro); `bio` ≤ 500; `avatar` int válido; `top4` ≤ 4 ids **existentes**; `genres` lista de strings.
- Retorna o usuário atualizado.

### Follow

- `POST /api/users/[username]/follow` — segue. Idempotente (upsert). 400 se for você mesmo.
- `DELETE /api/users/[username]/follow` — deixa de seguir.
- `GET /api/users/[username]/followers` e `/following` — listas paginadas (`?cursor=`), só pra telas de lista (se o front tiver).

### Settings — e-mail

`POST /api/users/me/email/request` — body `{ newEmail }`.
- Valida formato + unicidade (409 se em uso).
- Gera `VerificationCode` (type `email`) atrelado ao **novo** e-mail, envia código pra lá. Cooldown 60s (reusa a lib da Spec 1).

`POST /api/users/me/email/confirm` — body `{ newEmail, code }`.
- Valida code → atualiza `user.email = newEmail`, `emailVerified = now`, marca code usado. Transação.

### Settings — senha

`POST /api/users/me/password` — body `{ current, next }`.
- `bcrypt.compare(current)` → 400 se errada.
- Valida força de `next` (min 8; regras de maiúscula/minúscula/número/especial se quiser espelhar a ESPECIFICACAO — recomendo min 8 + não igual à atual, sem regex rígido).
- `bcrypt.hash(next)` → salva.

---

## Esqueleto — stats derivadas

```ts
// src/lib/stats.ts
import { db } from "@/lib/db";

export async function userStats(userId: string) {
  const [read, reviews] = await Promise.all([
    db.shelfEntry.findMany({
      where: { userId, status: "READ" },
      select: { book: { select: { pages: true } } },
    }),
    db.review.findMany({ where: { userId }, select: { rating: true } }),
  ]);

  // páginas: lidos completos + página atual dos "READING"
  const reading = await db.shelfEntry.findMany({
    where: { userId, status: "READING" },
    select: { currentPage: true },
  });

  const pagesRead =
    read.reduce((s, e) => s + (e.book?.pages ?? 0), 0) +
    reading.reduce((s, e) => s + (e.currentPage ?? 0), 0);

  const ratings = reviews.map((r) => r.rating);
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  const histogram: Record<string, number> = {};
  for (const step of [0.5,1,1.5,2,2.5,3,3.5,4,4.5,5]) histogram[step] = 0;
  for (const r of ratings) histogram[r] = (histogram[r] ?? 0) + 1;

  return {
    readCount: read.length,
    pagesRead,
    reviewCount: reviews.length,
    avgRating: Math.round(avgRating * 10) / 10,
    histogram,
  };
}
```

Esse cálculo replica o `useMyStats` do store (lidos + `currentPage` dos READING).

---

## Esqueleto — PATCH perfil

```ts
// src/app/api/users/me/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-z0-9._]+$/).optional(),
  name: z.string().min(1).max(60).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.number().int().min(0).optional(),
  top4: z.array(z.string()).max(4).optional(),
  genres: z.array(z.string()).optional(),
  progressUnit: z.enum(["pages", "percent"]).optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  if (data.username) {
    const taken = await db.user.findFirst({
      where: { username: data.username, NOT: { id: session.user.id } },
      select: { id: true },
    });
    if (taken) return NextResponse.json({ error: "username em uso" }, { status: 409 });
  }
  if (data.top4?.length) {
    const found = await db.book.count({ where: { id: { in: data.top4 } } });
    if (found !== data.top4.length)
      return NextResponse.json({ error: "top4 com livro inexistente" }, { status: 400 });
  }

  const user = await db.user.update({ where: { id: session.user.id }, data });
  return NextResponse.json(user);
}
```

---

## Esqueleto — follow

```ts
// src/app/api/users/[username]/follow/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(_: Request, { params }: { params: { username: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const target = await db.user.findUnique({ where: { username: params.username }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  if (target.id === session.user.id) return NextResponse.json({ error: "não pode seguir a si" }, { status: 400 });

  await db.follow.upsert({
    where: { followerId_followingId: { followerId: session.user.id, followingId: target.id } },
    create: { followerId: session.user.id, followingId: target.id },
    update: {},
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { username: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const target = await db.user.findUnique({ where: { username: params.username }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

  await db.follow.deleteMany({ where: { followerId: session.user.id, followingId: target.id } });
  return NextResponse.json({ ok: true });
}
```

---

## Impacto no front (o que troca)

- `store.user` (INITIAL_USER) → dados vêm de `/api/users/me`. Os hooks `useShelf`/`useBook`/`useMyStats` passam a ler do servidor (fetch/React Query) mantendo os mesmos nomes de campo.
- `profile/edit` → `PATCH /api/users/me` em vez de `updateProfile` do store.
- `settings`:
  - linhas de conta (`E-mail`, `Senha`) deixam de ser fixas (`@gmail.com`) → vêm do usuário real.
  - troca de senha fake → `POST /api/users/me/password`.
  - troca de e-mail (modal de código já desenhado) → `email/request` + `email/confirm`.
  - **tema e "Sair"** continuam client-side (`setTheme`, `signOut`).
- Botão follow no perfil de terceiros → endpoints de follow; contador reativo.

---

## Definition of Done

- [ ] `GET /api/users/[username]` retorna perfil + stats corretas (batem com o seed da Marina).
- [ ] `PATCH /api/users/me` valida username único e top4 existente.
- [ ] Follow/unfollow refletem em `followers`/`following` do alvo e do viewer.
- [ ] Trocar e-mail só efetiva após código correto enviado ao novo e-mail.
- [ ] Trocar senha exige senha atual correta e rejeita senha fraca/igual.
- [ ] Perfil de terceiros mostra `isFollowing` certo pro viewer logado.

---

## Aberto pra você decidir

- **Regras de força de senha:** min 8 simples (meu default) ou o combo maiúscula/minúscula/número/especial da ESPECIFICACAO?
- **Tema no banco** (sincroniza entre dispositivos) ou fica local? Default: local.
- **Telefone/2FA/sessões ativas:** confirmo que ficam **fora** do MVP?


---

# Spec 3a — Books, estante, reviews (a página do livro)

**Depende de:** Spec 0 (models), Spec 1 (sessão).

**Objetivo:** tudo que vive na `/book/[id]` e no catálogo `/shelf` com dados reais: página do livro (info + média agregada), busca de livros, estante (status + progresso com datas), avaliação (rating + texto + datas de leitura), tags e citações. Substitui os hooks `useBook`/`useShelf` e as ações `setShelfStatus`/`setRating`/`saveReview`/`updateProgress`/`addTag`/`addQuote` do store.

**Escopo:** a página do livro e o catálogo pessoal. **Feed social e listas** ficam na Spec 3b. **Mensagens de sistema no clube** ao progredir ficam na Spec 4 (aqui só disparo o gancho).

---

## Decisões

- **Catálogo semeado** (Spec 0) é a fonte no MVP. **Google Books API** (mencionada no README) fica como **enriquecimento futuro** — a busca começa consultando a tabela `Book`. Anotado como spec futura de import.
- **`avg`/`count` cacheados** no `Book`, recalculados a cada gravação/remoção de review (decisão da Spec 0). Função `recomputeBookRating(bookId)` centraliza.
- **Rating e review são a mesma entidade** (`Review`, 1 por user+livro). Avaliar cria/atualiza; nota 0 apaga a review inteira (espelha `setRating(0)` do store, que remove a nota).
- **Avaliar marca como READ** automaticamente (regra do store: `setRating` seta status READ se ainda não era).
- **Progresso sempre em páginas** no banco (`currentPage`); a unidade %/páginas é só de exibição (`user.progressUnit`). `lastPage` guarda o valor anterior pro delta.
- **Datas de leitura**: `startedAt` na primeira vez em READING (ou READ direto); `finishedAt` ao marcar READ. Ficam no `ShelfEntry` **e** copiadas pra `Review` quando ela existe (o front mostra "Leu de X a Y" na review).

## Ideias novas (refinar)

1. **`avg`/`count` transacional:** recomputar dentro da mesma transação da gravação da review evita corrida (dois reviews simultâneos). Barato e correto.
2. **Progresso monotônico?** Hoje o store aceita voltar página (relê). Mantenho livre, mas registro `lastPage` pro delta — útil pra "avançou X páginas". Se quiser impedir retrocesso, é uma validação.
3. **Busca:** por enquanto `ILIKE` em título/autor. Quando o catálogo crescer, trocar por full-text do Postgres (`tsvector`) — deixo anotado, não implemento agora.

---

## Endpoints

### Livro
- `GET /api/books/[id]` — info do livro + agregados + **estado do viewer** (entry, rating, review, tags, quotes). Um payload que alimenta a página inteira.
- `GET /api/books?q=...` — busca por título/autor (`ILIKE`), paginada. Alimenta `/search`.
- `GET /api/books/[id]/reviews?cursor=` — reviews de terceiros sobre o livro (cards abaixo), paginado por `createdAt`.

### Estante (status + progresso)
- `PUT /api/books/[id]/shelf` — body `{ status }` (`WANT_TO_READ|READING|READ|null`). `null` remove. Aplica regras de data.
- `PUT /api/books/[id]/progress` — body `{ page }`. Seta `currentPage`, move anterior pra `lastPage`, garante status READING, retorna `{ delta, percent }`. **Dispara gancho de clube** (Spec 4).

### Avaliação
- `PUT /api/books/[id]/review` — body `{ rating, text?, startedAt?, finishedAt? }`. Upsert. `rating<=0` → apaga a review. Recalcula `avg`/`count`. Marca READ.

### Tags e citações (por usuário)
- `POST /api/books/[id]/tags` `{ tag }` / `DELETE /api/books/[id]/tags` `{ tag }`
- `GET /api/books/[id]/quotes` / `POST /api/books/[id]/quotes` `{ text, page? }` / `DELETE /api/quotes/[quoteId]`

### Estante (catálogo)
- `GET /api/shelf?status=&genre=&tag=&q=` — livros do usuário com entry, filtros compostos (espelha os chips de `/shelf`). Retorna também a lista de gêneros/tags disponíveis pra montar os filtros.

---

## Esqueleto — payload da página do livro

```ts
// src/app/api/books/[id]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const book = await db.book.findUnique({ where: { id: params.id } });
  if (!book) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

  const uid = session?.user.id;
  const [entry, review, tags, quotes] = uid
    ? await Promise.all([
        db.shelfEntry.findUnique({ where: { userId_bookId: { userId: uid, bookId: book.id } } }),
        db.review.findUnique({ where: { userId_bookId: { userId: uid, bookId: book.id } } }),
        db.bookTag.findMany({ where: { userId: uid, bookId: book.id }, select: { tag: true } }),
        db.quote.findMany({ where: { userId: uid, bookId: book.id } }),
      ])
    : [null, null, [], []];

  return NextResponse.json({
    book, // inclui avg, count, gradientFrom/To
    entry,
    rating: review?.rating ?? null,
    myReview: review?.text ?? null,
    tags: tags.map((t) => t.tag),
    quotes,
  });
}
```

## Esqueleto — avaliar (rating + review + recompute)

```ts
// src/app/api/books/[id]/review/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recomputeBookRating } from "@/lib/books";

const schema = z.object({
  rating: z.number().min(0).max(5),
  text: z.string().max(5000).optional(),
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime().optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;
  const bookId = params.id;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { rating, text, startedAt, finishedAt } = parsed.data;

  await db.$transaction(async (tx) => {
    if (rating <= 0) {
      await tx.review.deleteMany({ where: { userId: uid, bookId } });
    } else {
      const today = new Date();
      // avaliar marca como READ (regra do store)
      await tx.shelfEntry.upsert({
        where: { userId_bookId: { userId: uid, bookId } },
        create: { userId: uid, bookId, status: "READ", startedAt: startedAt ? new Date(startedAt) : today, finishedAt: finishedAt ? new Date(finishedAt) : today },
        update: { status: "READ", finishedAt: finishedAt ? new Date(finishedAt) : today },
      });
      await tx.review.upsert({
        where: { userId_bookId: { userId: uid, bookId } },
        create: { userId: uid, bookId, rating, text: text ?? "", startedAt: startedAt ? new Date(startedAt) : null, finishedAt: finishedAt ? new Date(finishedAt) : null },
        update: { rating, text: text ?? "", startedAt: startedAt ? new Date(startedAt) : undefined, finishedAt: finishedAt ? new Date(finishedAt) : undefined },
      });
    }
    await recomputeBookRating(tx, bookId);
  });

  return NextResponse.json({ ok: true });
}
```

```ts
// src/lib/books.ts
export async function recomputeBookRating(tx: typeof db, bookId: string) {
  const agg = await tx.review.aggregate({
    where: { bookId },
    _avg: { rating: true },
    _count: true,
  });
  await tx.book.update({
    where: { id: bookId },
    data: { avg: agg._avg.rating ?? 0, count: agg._count },
  });
}
```

## Esqueleto — progresso (delta + gancho de clube)

```ts
// src/app/api/books/[id]/progress/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { publishProgressToClubs } from "@/lib/clubs"; // implementado na Spec 4 (no-op por ora)

const schema = z.object({ page: z.number().int().min(0) });

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;
  const bookId = params.id;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { page } = parsed.data;

  const book = await db.book.findUnique({ where: { id: bookId }, select: { pages: true, title: true } });
  if (!book) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

  const prev = await db.shelfEntry.findUnique({
    where: { userId_bookId: { userId: uid, bookId } },
    select: { currentPage: true, startedAt: true },
  });
  const previous = prev?.currentPage ?? 0;

  await db.shelfEntry.upsert({
    where: { userId_bookId: { userId: uid, bookId } },
    create: { userId: uid, bookId, status: "READING", currentPage: page, lastPage: previous, startedAt: new Date() },
    update: { status: "READING", currentPage: page, lastPage: previous, startedAt: prev?.startedAt ?? new Date() },
  });

  const percent = Math.min(100, Math.round((page / book.pages) * 100));
  await publishProgressToClubs(uid, bookId, percent); // Spec 4

  return NextResponse.json({ delta: page - previous, percent });
}
```

---

## Impacto no front

- `useBook(bookId)` → `GET /api/books/[id]` (mesmo shape: `book/entry/rating/myReview/tags/bookQuotes`).
- `setShelfStatus` → `PUT /shelf`; `updateProgress` → `PUT /progress` (retorna `delta`); `setRating`+`saveReview` → `PUT /review`.
- `addTag/removeTag/addQuote` → endpoints de tags/quotes.
- `/search` → `GET /api/books?q=`.
- `/shelf` filtros (status/gênero/tag) → `GET /api/shelf?...`.
- Reviews de terceiros na página do livro (a `ESPECIFICACAO` prevê cards) → `GET /api/books/[id]/reviews`. **Novo** vs. o mock atual, que não lista reviews alheias na página do livro — confirmar se entra agora.

---

## Definition of Done

- [ ] Página do livro carrega info + média + estado do viewer numa request.
- [ ] Mudar status aplica `startedAt`/`finishedAt` como no store.
- [ ] Progresso retorna `delta` correto e atualiza `lastPage`.
- [ ] Avaliar cria/atualiza review, marca READ e recalcula `avg`/`count` (média bate).
- [ ] Nota 0 remove a review e recalcula agregados.
- [ ] Tags/citações persistem por usuário; filtro da estante por tag funciona.
- [ ] Busca por título/autor retorna resultados do catálogo.

---

## Aberto pra você decidir

- **Reviews de terceiros na página do livro** entram já nesta spec ou depois? (o mock atual não tem; a ESPECIFICACAO sim). Recomendo **entrar agora** — é barato e dá vida à página.
- **Google Books import**: confirmo que fica **fora** deste ciclo (catálogo semeado basta pro MVP)?
- **Retrocesso de progresso** permitido (relê) ou bloqueado? Default: permitido.


---

# Spec 3b — Feed social + listas

**Depende de:** Spec 0 (models), Spec 1 (sessão), Spec 2 (follow), Spec 3a (reviews).

**Objetivo:** a home social (`/home`) com feed de reviews, curtidas, comentários e filtro **Geral | Seguindo**; e as **listas** públicas/privadas da estante (`/shelf` → `/lists/[id]`). Substitui `store.feed`, `toggleLike`, `addComment` e as ações de `lists`.

**Escopo:** feed e coleções. A home também lista "leituras atuais" — isso reusa `GET /api/shelf?status=READING` da Spec 3a.

---

## Decisões

- **Feed = reviews reais** (model `Review` da Spec 3a) com `text` não vazio, unidas a autor/livro/contadores. Não há entidade "post" separada — o feed é a projeção social das reviews.
- **Filtro "Seguindo"** usa o grafo `Follow` (Spec 2): `WHERE userId IN (meus following)`. "Geral" = todos, ordenado por recência.
- **Paginação por cursor** (`createdAt`+`id`), não offset — feed cresce e offset fica caro/instável.
- **Curtir** = `ReviewLike` (idempotente). **Comentar** = `Comment`. Contadores vêm de `_count`, não de coluna cacheada (volume baixo por review no MVP).
- **Listas**: `List` + `ListBook` ordenado. Públicas aparecem no perfil; privadas só pro dono. Visibilidade alternável.

## Ideias novas (refinar)

1. **Feed "Seguindo" vazio** (usuário novo não segue ninguém) → cair pro "Geral" com aviso sutil, senão a home fica vazia e frustra no onboarding. Recomendo esse fallback.
2. **N+1 nos contadores:** usar `include: { _count: { select: { likes, comments } } }` e um `likedByMe` via `some` numa query só, em vez de consultar like por review.
3. **Ordenação futura:** hoje puramente cronológica. Deixo espaço pra um score (recência + engajamento) depois, sem mudar o contrato do endpoint.
4. **Comentário → notificação:** fora do MVP (a ESPECIFICACAO já corta push), mas o `Comment` já carrega tudo pra plugar depois.

---

## Endpoints

### Feed
- `GET /api/feed?scope=all|following&cursor=` — lista de reviews-com-texto, autor, livro, `likes`, `comments` (contagem), `likedByMe`. Paginado.
- `POST /api/reviews/[id]/like` / `DELETE /api/reviews/[id]/like` — curtir/descurtir (idempotente).
- `GET /api/reviews/[id]/comments?cursor=` — comentários paginados.
- `POST /api/reviews/[id]/comments` `{ text }` — comenta (retorna o comentário com autor).

### Listas
- `GET /api/lists?userId=` — listas de um usuário (só públicas se não for o dono; todas se for).
- `POST /api/lists` `{ name, visibility }` — cria.
- `GET /api/lists/[id]` — detalhe + livros ordenados (403 se privada e viewer não é dono).
- `PATCH /api/lists/[id]` `{ name?, visibility? }` — edita/alterna visibilidade (só dono).
- `DELETE /api/lists/[id]` — remove (só dono).
- `POST /api/lists/[id]/books` `{ bookId }` / `DELETE /api/lists/[id]/books` `{ bookId }` — add/remove, mantém `order`.

---

## Esqueleto — feed

```ts
// src/app/api/feed/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const PAGE = 15;

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "all";
  const cursor = url.searchParams.get("cursor");

  let authorFilter = {};
  if (scope === "following") {
    const following = await db.follow.findMany({
      where: { followerId: uid },
      select: { followingId: true },
    });
    const ids = following.map((f) => f.followingId);
    // fallback: se não segue ninguém, cai pro geral
    if (ids.length) authorFilter = { userId: { in: ids } };
  }

  const reviews = await db.review.findMany({
    where: { text: { not: "" }, ...authorFilter },
    orderBy: { createdAt: "desc" },
    take: PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      user: { select: { username: true, name: true, avatar: true } },
      book: { select: { id: true, title: true, authors: true, gradientFrom: true, gradientTo: true } },
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: uid }, select: { userId: true } }, // likedByMe
    },
  });

  const hasMore = reviews.length > PAGE;
  const page = reviews.slice(0, PAGE).map((r) => ({
    id: r.id,
    user: `@${r.user.username}`,
    name: r.user.name,
    avatar: r.user.avatar,
    bookId: r.book.id,
    book: r.book,
    rating: r.rating,
    text: r.text,
    likes: r._count.likes,
    comments: r._count.comments,
    likedByMe: r.likes.length > 0,
    createdAt: r.createdAt,
  }));

  return NextResponse.json({ items: page, nextCursor: hasMore ? page[page.length - 1].id : null });
}
```

## Esqueleto — like (idempotente)

```ts
// src/app/api/reviews/[id]/like/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauth" }, { status: 401 });
  await db.reviewLike.upsert({
    where: { reviewId_userId: { reviewId: params.id, userId: session.user.id } },
    create: { reviewId: params.id, userId: session.user.id },
    update: {},
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauth" }, { status: 401 });
  await db.reviewLike.deleteMany({ where: { reviewId: params.id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
```

## Esqueleto — lista (com guarda de visibilidade)

```ts
// src/app/api/lists/[id]/route.ts (GET)
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const list = await db.list.findUnique({
    where: { id: params.id },
    include: {
      books: {
        orderBy: { order: "asc" },
        include: { /* join → precisa buscar Book à parte ou relacionar */ },
      },
      user: { select: { id: true, username: true } },
    },
  });
  if (!list) return NextResponse.json({ error: "não encontrada" }, { status: 404 });
  if (list.visibility === "private" && list.user.id !== session?.user.id) {
    return NextResponse.json({ error: "privada" }, { status: 403 });
  }
  return NextResponse.json(list);
}
```

> Nota: `ListBook` referencia `bookId` sem relação declarada com `Book` (pra permitir slug). No detalhe da lista, buscar os `Book` por `id IN (...)` e casar com a ordem — ou declarar a relação `ListBook.book` no schema se preferir join direto. Recomendo declarar a relação; ajusto na Spec 0 se topar.

---

## Impacto no front

- `store.feed` → `GET /api/feed?scope=`. O `FeedPost` já espera `user`/`bookId`/`rating`/`text`/`likes`/`comments` — o payload replica isso (`user` como `@username`).
- Filtro **Geral/Seguindo** → troca o `scope`.
- `toggleLike` → POST/DELETE like; `likedReviews` do usuário deixa de ser mapa local, vira `likedByMe` por item.
- `addComment` → `POST /comments`.
- Home "leituras atuais" → `GET /api/shelf?status=READING` (Spec 3a).
- `MyLists` na estante + `/lists/[id]` → endpoints de listas.

---

## Definition of Done

- [ ] Feed "Geral" lista reviews com texto, autor e livro, ordenado por recência.
- [ ] Feed "Seguindo" filtra pelos seguidos; vazio cai pro geral com aviso.
- [ ] Paginação por cursor não duplica nem pula itens.
- [ ] Curtir/descurtir é idempotente e `likedByMe`/contagem batem.
- [ ] Comentar cria comentário e aparece na lista do review.
- [ ] Lista privada retorna 403 pra não-dono; pública aparece no perfil.
- [ ] Add/remove de livro na lista mantém ordem.

---

## Aberto pra você decidir

- **Feed "Seguindo" vazio → fallback pro Geral** (meu default) ou mostrar empty state "siga alguém"?
- **Declarar relação `ListBook.book`** no schema (join direto) — topa esse ajuste na Spec 0? Recomendo sim.
- **Reviews sem texto** (só nota) entram no feed? Meu default: **não** (feed é sobre reviews escritas); a nota ainda conta no agregado do livro.


---

# Spec 4 — Clubs + chat (última)

**Depende de:** Spec 0 (models), Spec 1 (sessão), Spec 3a (progresso → gancho `publishProgressToClubs`).

**Objetivo:** clubes do livro públicos/privados com código de convite, entrada/saída, membros com progresso, mural em formato de **chat** (respostas citadas, menções `@`, mensagens de sistema) e painel do criador. Fecha o backend. Substitui `store.clubs`, `toggleClub`, `createClub`, `joinByCode`, `postToClub` e o `memberProgress` mocado.

**Escopo:** clubes e chat. Enche o gancho de progresso que ficou no-op na Spec 3a.

---

## Decisões

- **Código de convite = 6 caracteres** (`A–Z0–9`), como o `randomCode` do store e o `verify` skill — **não** os 8 da ESPECIFICACAO. Só clubes privados têm código; só o criador vê.
- **Chat por polling** (decisão inicial): `GET .../messages?after=<cursor>` retorna o que chegou depois. Índice `(clubId, createdAt)` já existe (Spec 0). WebSocket fica pra depois sem migration.
- **Progresso do membro é derivado**, não digitado: vem do `ShelfEntry` do membro sobre o livro do clube (`currentPage/pages` ou 100 se READ). `ClubMember.progress` guarda o **último valor publicado** pra detectar mudança e emitir mensagem de sistema.
- **Mensagem de sistema**: quando um membro atualiza progresso (Spec 3a) de um livro que é tema de um clube que ele participa, publica uma `Message` com `system: true` (ex.: "avançou para 45%"). Emitida só quando o percent **muda**, pra não spammar.
- **`replyTo`**: FK `replyToId` (Spec 0); o front lê `replyTo.user`/`replyTo.text` via include. Snapshot não é necessário.
- **Menções `@`**: texto puro no MVP; o front já destaca com `MentionText`. Não resolvo/notifico menção agora (futuro).

## Ideias novas (refinar)

1. **Polling adaptativo:** front pega `after` = id da última msg; intervalo ~4s com clube aberto, pausa quando a aba perde foco. Barato e suave até virar WebSocket.
2. **Entrar em clube público** não precisa de código; **privado** exige código válido. `toggleClub` do store vira join/leave explícitos (mais previsível que toggle).
3. **Mensagem de sistema idempotente:** guardar `ClubMember.progress` evita duplicar "avançou para 45%" se o usuário reenviar a mesma página. Só emite em `novo !== antigo`.
4. **Criador não sai do próprio clube** sem transferir/arquivar — no MVP, bloqueio a saída do criador (ou deleto o clube). Recomendo: criador só "arquiva/deleta".

---

## Endpoints

### Clubes
- `GET /api/clubs` — clubes do usuário + descobrir públicos (o front separa em "Meus/Públicos"). Cada item traz `joined`, `members` (contagem), `book`, `progress` do clube (média dos membros).
- `POST /api/clubs` `{ name, bookId, desc, visibility }` — cria; criador vira membro `role:"creator"`; se privado, gera `code`. Retorna `{ id, code? }`.
- `GET /api/clubs/[id]` — detalhe: clube, livro, membros (com progresso), `joined`, `isCreator`, `code` (**só se criador**).
- `POST /api/clubs/[id]/join` — entra em **público**. 403 se privado.
- `POST /api/clubs/join` `{ code }` — entra em **privado** por código. Retorna id, `"already"` se já é membro, 404 se código inválido.
- `DELETE /api/clubs/[id]/leave` — sai (criador bloqueado; ver decisão 4).

### Gerenciamento (só criador)
- `PATCH /api/clubs/[id]` `{ name?, desc?, bookId?, visibility? }` — edita.
- `DELETE /api/clubs/[id]` — arquiva/deleta o clube.
- `DELETE /api/clubs/[id]/members/[userId]` — remove membro.
- `POST /api/clubs/[id]/code/regenerate` — novo código (só privado).

### Chat (polling)
- `GET /api/clubs/[id]/messages?after=<id>&limit=50` — mensagens após o cursor (ou últimas 50 se sem cursor), ordem crescente, com autor e `replyTo`.
- `POST /api/clubs/[id]/messages` `{ text, replyToId? }` — publica (≤500 chars). Só membros.

---

## Esqueleto — criar clube

```ts
// src/app/api/clubs/route.ts (POST)
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  name: z.string().min(1).max(80),
  bookId: z.string(),
  desc: z.string().max(500).default(""),
  visibility: z.enum(["public", "private"]),
});

function code6() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { name, bookId, desc, visibility } = parsed.data;

  const book = await db.book.findUnique({ where: { id: bookId }, select: { id: true } });
  if (!book) return NextResponse.json({ error: "livro inexistente" }, { status: 400 });

  const club = await db.club.create({
    data: {
      name, bookId, desc, visibility,
      code: visibility === "private" ? code6() : null,
      creatorId: session.user.id,
      members: { create: { userId: session.user.id, role: "creator" } },
    },
    select: { id: true, code: true },
  });
  return NextResponse.json(club, { status: 201 });
}
```

## Esqueleto — entrar por código

```ts
// src/app/api/clubs/join/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ code: z.string().length(6) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "código inválido" }, { status: 400 });

  const club = await db.club.findUnique({ where: { code: parsed.data.code.toUpperCase() }, select: { id: true } });
  if (!club) return NextResponse.json({ error: "código inválido" }, { status: 404 });

  const existing = await db.clubMember.findUnique({
    where: { clubId_userId: { clubId: club.id, userId: session.user.id } },
  });
  if (existing) return NextResponse.json({ id: club.id, status: "already" });

  await db.clubMember.create({ data: { clubId: club.id, userId: session.user.id } });
  return NextResponse.json({ id: club.id, status: "joined" });
}
```

## Esqueleto — mural (polling GET + POST)

```ts
// src/app/api/clubs/[id]/messages/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function isMember(clubId: string, userId: string) {
  return !!(await db.clubMember.findUnique({ where: { clubId_userId: { clubId, userId } } }));
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !(await isMember(params.id, session.user.id)))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const after = new URL(req.url).searchParams.get("after");
  const messages = await db.message.findMany({
    where: { clubId: params.id },
    orderBy: { createdAt: "asc" },
    ...(after ? { cursor: { id: after }, skip: 1 } : { take: -50 }), // últimas 50
    include: {
      user: { select: { username: true, name: true, avatar: true } },
      replyTo: { include: { user: { select: { username: true } } } },
    },
  });

  return NextResponse.json({
    items: messages.map((m) => ({
      id: m.id,
      user: `@${m.user.username}`,
      text: m.text,
      system: m.system,
      time: m.createdAt,
      replyTo: m.replyTo ? { user: `@${m.replyTo.user.username}`, text: m.replyTo.text } : null,
    })),
  });
}

const postSchema = z.object({ text: z.string().min(1).max(500), replyToId: z.string().optional() });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !(await isMember(params.id, session.user.id)))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const msg = await db.message.create({
    data: { clubId: params.id, userId: session.user.id, text: parsed.data.text, replyToId: parsed.data.replyToId },
  });
  return NextResponse.json({ id: msg.id }, { status: 201 });
}
```

## Esqueleto — gancho de progresso (enche o no-op da Spec 3a)

```ts
// src/lib/clubs.ts
import { db } from "@/lib/db";

/** Chamado pelo endpoint de progresso (Spec 3a). Publica mensagem de
 *  sistema nos clubes do usuário cujo livro é este — só quando o % muda. */
export async function publishProgressToClubs(userId: string, bookId: string, percent: number) {
  const memberships = await db.clubMember.findMany({
    where: { userId, club: { bookId } },
    select: { clubId: true, progress: true, user: { select: { username: true } } },
  });

  for (const m of memberships) {
    if (m.progress === percent) continue; // idempotente
    await db.$transaction([
      db.clubMember.update({
        where: { clubId_userId: { clubId: m.clubId, userId } },
        data: { progress: percent },
      }),
      db.message.create({
        data: {
          clubId: m.clubId,
          userId,
          system: true,
          text: `@${m.user.username} avançou para ${percent}%`,
        },
      }),
    ]);
  }
}
```

## Progresso do clube e dos membros (detalhe)

No `GET /api/clubs/[id]`, montar membros com o percent **derivado** do `ShelfEntry` de cada um sobre o livro do clube:

```ts
// pseudo
const members = await db.clubMember.findMany({
  where: { clubId },
  include: { user: { select: { username: true, name: true, avatar: true } } },
});
const entries = await db.shelfEntry.findMany({
  where: { bookId: club.bookId, userId: { in: members.map((m) => m.userId) } },
});
// percent = READ ? 100 : round(currentPage / book.pages * 100) ?? 0
// progresso do clube = média dos percent
```

---

## Impacto no front

- `store.clubs` → `GET /api/clubs` (lista) e `GET /api/clubs/[id]` (detalhe). Shapes espelham `Club`/`memberProgress`/`feed`.
- `createClub` → `POST /api/clubs`; `joinByCode` → `POST /api/clubs/join`; `toggleClub` → `join`/`leave` explícitos.
- `postToClub(text, replyTo)` → `POST /messages` (passa `replyToId`).
- Mural → **polling** `GET /messages?after=` a cada ~4s; `MentionText` e bolhas próprias inalterados.
- Painel do criador (`/clubs/[id]` gerenciamento) → `PATCH`/`DELETE`/remover membro/regenerar código.
- Mensagem de sistema de progresso passa a vir do servidor (antes era gerada no `updateProgress` do store).

---

## Definition of Done

- [ ] Criar clube público/privado; privado gera código de 6 chars visível só ao criador.
- [ ] Entrar em público sem código; em privado só com código válido; `"already"` se repetido.
- [ ] Sair funciona; criador não sai (arquiva/deleta).
- [ ] Mural retorna últimas 50 e faz polling incremental por `after` sem duplicar.
- [ ] Responder cita a mensagem certa (`replyTo.user/text`); menção `@` preservada.
- [ ] Atualizar progresso (Spec 3a) publica **uma** mensagem de sistema por mudança de %.
- [ ] Membros exibem progresso derivado; progresso do clube = média.
- [ ] Não-membro recebe 403 no chat.

---

## Aberto pra você decidir

- **Código: 6 chars** (store/verify) confirmado, ignorando os 8 da ESPECIFICACAO?
- **Criador ao sair:** bloquear (meu default) ou permitir com transferência de dono?
- **Intervalo de polling:** ~4s ok, ou prefere mais/menos agressivo?

---

## Fim do backend

Com as specs **0, 1, 2, 3a, 3b, 4** o backend cobre todo o app mocado. Ordem de execução sugerida = a numérica. Depois disso, o próximo grande passo (fora deste conjunto) seria **trocar os hooks do store por fetch/React Query** consumindo esses endpoints — dá pra fazer tela a tela, já que os nomes de campo foram preservados.


---

# Spec 5 — Integração do frontend (store → API, tela a tela)

**Depende de:** Specs 0–4 implementadas e validadas (Spec V), Patch 1 aplicado (seed correto, enums).

**Objetivo:** trocar o Zustand mocado (`src/lib/store`) por dados reais vindos da API, **por tela**, em ciclos pequenos e revisáveis — não uma migração big-bang. Ao fim, `npm run dev` reflete estado real do Postgres; refresh não perde dados (era o critério do smoke E2E da Spec V).

**Escopo:** só a camada de dados do front. Layout/componentes visuais não mudam — os nomes de campo foram preservados de propósito nas Specs 0–4 exatamente pra isso.

---

## Decisões

- **React Query (`@tanstack/react-query`)** como camada de fetch/cache, substituindo os hooks derivados do store (`useShelf`, `useBook`, `useMyStats`...) por hooks equivalentes que chamam a API. Mesma assinatura de retorno sempre que possível, pra minimizar diff nos componentes.
- **NextAuth `useSession()`** substitui `store.user.loggedIn`. `signIn`/`signOut` substituem as ações fake de login/logout.
- **Mutations otimistas** só onde o mock já dava feedback instantâneo (like, follow, progresso) — o resto espera a resposta.
- **Zustand não morre inteiro:** fica só para estado **puramente client** sem contraparte no banco — tema (claro/escuro) e talvez UI transiente (modal aberto, tab ativa). Tudo que tem tabela no Postgres sai do store.
- **Migração tela a tela**, na ordem de dependência: auth primeiro (sem ela nada mais funciona logado), depois perfil, depois o núcleo (livro/estante/feed), depois clubes por último (mais complexo, maior spec).

## Ideias novas (refinar)

1. **Camada de API client fina** (`src/lib/api/*.ts`) por domínio (`books.ts`, `users.ts`, `clubs.ts`) — funções `fetch` tipadas, reusadas pelos hooks React Query. Evita `fetch` espalhado pelos componentes.
2. **Loading/erro padronizados:** um `<ScreenState>` (skeleton + erro + retry) genérico, usado em toda tela migrada, pra não reinventar por tela.
3. **Flag de corte:** manter o store mock **intacto e não importado** até a tela ser migrada — permite migrar incrementalmente sem quebrar telas ainda não tocadas, e reverter uma tela isoladamente se algo quebrar.

---

## Setup (uma vez, antes do ciclo 1)

```bash
npm install @tanstack/react-query
```

`src/app/providers.tsx`:
```tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <SessionProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}
```
Envolver em `app/layout.tsx`.

`src/lib/api/client.ts` (base fetch tipado):
```ts
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}
```

---

## Ciclo 1 — Auth (login, registro, onboarding, logout)

**Telas:** `app/login`, `app/onboarding`, guard do grupo `(app)`.

- `login/page.tsx`: form chama `signIn("credentials", { email, password, redirect:false })`; erro exibe mensagem genérica (a API já não vaza se o e-mail existe).
- `onboarding/page.tsx`: vira o **signup unificado** decidido na Spec 1 — coleta nome/username/bio/gêneros/senha, chama `POST /api/auth/register`, depois `signIn`.
- Guard do `(app)`: remover o mock; a proteção já é o `middleware.ts` da Spec 1. Componentes que liam `store.user.loggedIn` passam a usar `useSession()`.
- `VerificationModal`: aponta pros endpoints `/api/verification/email/*`.

**DoD do ciclo:** registrar → verificar e-mail → logar → refresh mantém sessão (cookie do NextAuth).

---

## Ciclo 2 — Perfil e settings

**Telas:** `app/(app)/profile`, `profile/edit`, `settings`.

- `useMyStats()` → `useQuery(["me","stats"], () => apiFetch("/api/users/me"))`. Mesmo shape de retorno (`readCount, pagesRead, reviewCount, avgRating, histogram`).
- `profile/edit`: `useMutation` → `PATCH /api/users/me`; invalida `["me"]` no sucesso.
- Perfil de terceiros (`profile/[username]`, se existir rota, ou reaproveitar): `useQuery(["user", username], ...)`; botão follow vira mutation otimista (Spec 2).
- `settings`: linhas de conta lêem `session.user`; troca de e-mail/senha chamam os endpoints da Spec 2 (fluxo de 2 passos: request → confirm, com o `VerificationModal` reaproveitado).
- Tema claro/escuro: **fica no Zustand**, sem mudança.

**DoD:** editar perfil persiste após refresh; trocar e-mail só efetiva após código; stats batem com o banco.

---

## Ciclo 3 — Livro, estante, avaliação

**Telas:** `app/(app)/book/[id]`, `shelf`, `search`.

- `useBook(bookId)` → `useQuery(["book", id], ...)` no payload único da Spec 3a (`book/entry/rating/myReview/tags/quotes`).
- `setShelfStatus` → mutation `PUT /shelf`, invalida `["book", id]` e `["shelf"]`.
- `updateProgress` → mutation `PUT /progress`; **otimista** (o mock já respondia instantâneo ao arrastar o slider) — atualiza o cache local, reconcilia com a resposta (`delta`).
- `setRating` + `saveReview` → uma mutation `PUT /review`; invalida `["book", id]` (avg/count mudam) e `["feed"]` (se tinha texto, entra no feed).
- Tags/citações: mutations simples, invalidam `["book", id]`.
- `/search`: `useQuery(["books", q], () => apiFetch("/api/books?q="+q), { enabled: q.length>0 })`.
- `/shelf`: filtros compostos viram querystring de `useQuery(["shelf", filters], ...)`.

**DoD:** marcar status, avaliar e ver `avg` do livro mudar; progresso com slider sem travar (otimista); busca funcionando.

---

## Ciclo 4 — Feed e listas

**Telas:** `app/(app)/home`, `lists/[id]`.

- `store.feed` → `useInfiniteQuery(["feed", scope], ...)` consumindo o cursor da Spec 3b. `home` troca scroll infinito/paginação conforme o componente atual usa.
- Filtro Geral/Seguindo: `scope` como query param, refetch ao trocar.
- `toggleLike` → mutation **otimista** (era instantâneo no mock): atualiza `likedByMe`/contagem local, chama `POST`/`DELETE`, reverte no erro.
- `addComment` → mutation, invalida a review específica ou o comment list.
- "Leituras atuais" da home → reusa o `useQuery` de `/api/shelf?status=READING` do ciclo 3.
- `lists/[id]`: `useQuery` do detalhe; mutations de add/remove livro com invalidação da lista.

**DoD:** feed pagina sem duplicar; curtir sem lag perceptível; listas privadas somem pra outro viewer.

---

## Ciclo 5 — Clubes e chat (o mais complexo — por último)

**Telas:** `app/(app)/clubs`, `clubs/new`, `clubs/[id]`.

- `clubs` (lista): `useQuery(["clubs"], ...)`.
- `clubs/new`: mutation `POST /api/clubs`; se privado, exibir o `code` retornado (única vez que ele aparece pro criador nessa tela — depois só em `GET /api/clubs/[id]` se for criador).
- `clubs/[id]`: detalhe via `useQuery`; entrar (`join`/`join by code`) como mutation.
- **Mural (polling):** `useQuery(["messages", clubId, cursor], ..., { refetchInterval: 4000 })`, pausando (`refetchIntervalInBackground: false`) quando a aba perde foco — a ideia de polling adaptativo da Spec 4. Enviar mensagem = mutation que já injeta otimisticamente a bolha própria antes da resposta.
- **Mensagens de sistema:** chegam pelo mesmo polling — o componente já deve saber renderizar `system:true` (o mock provavelmente já tem isso).
- Painel do criador: mutations de `PATCH`/`DELETE`/remover membro/regenerar código.

**DoD:** criar clube privado, entrar por código com 2º usuário, trocar mensagens, ver mensagem de sistema ao atualizar progresso (fecha o passo 8 do smoke E2E).

---

## Depois de cada ciclo

1. Rodar a suíte Playwright existente + os testes específicos daquele domínio.
2. Rodar manualmente o trecho correspondente do smoke E2E da Spec V.
3. Só então remover do Zustand os campos/ações que a tela migrada não usa mais (limpeza incremental, não em massa).

## Definition of Done (da Spec inteira)

- [ ] `src/lib/store` contém só tema/UI transiente — nenhum dado que exista no Postgres.
- [ ] Todas as 5 telas migradas passam nos DoD de ciclo acima.
- [ ] Smoke E2E da Spec V roda **de ponta a ponta** contra a UI (não só API), passo 9 (persistência pós-refresh) incluso.
- [ ] Nenhum `import` de `INITIAL_USER`/mock de dados fora de `src/data` (que vira só seed reference, se sobrar).

---

## Aberto pra você decidir

- **Ordem dos ciclos:** proposta é auth→perfil→livro/estante→feed→clubes. Concorda ou prefere outra prioridade (ex.: feed antes, por ser a tela mais visitada)?
- **Otimismo de UI:** confirmo que like/progresso/follow devem ser otimistas (era o comportamento do mock) e o resto pode esperar resposta?
- **Zustand residual:** só tema, ou tem mais alguma coisa puramente client que deva ficar lá?
