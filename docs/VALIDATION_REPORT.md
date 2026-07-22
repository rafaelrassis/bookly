# Spec V — Relatório de validação do backend

Execução da Spec V (`docs/../` roteiro de QA, ver histórico do chat/issue) contra o
estado atual do branch. Ambiente: Postgres 16 local, `prisma migrate deploy` +
`npm run db:seed`, `npm run build && npm run start`, suíte Playwright completa
(`npx playwright test`, 44 specs, todas as pré-existentes + `e2e/auth-api.spec.ts`
novo, cobrindo a Spec 1/Auth que não tinha teste dedicado).

**Decisão sobre os itens "Aberto pra você decidir" da Spec V:** optei por já
escrever testes de verdade (Playwright, que é o padrão que o repo já usa em vez
de Vitest/Supertest — ver `e2e/*.spec.ts` e `playwright.config.ts`) em vez de só
checklist manual, e **não** os coloquei como gate obrigatório de CI nesta rodada
(nenhum workflow em `.github/` roda `test:e2e` hoje) — isso é uma mudança de
infra que prefiro confirmar com você antes de bloquear pushes na main.

---

## Resumo

```
SPEC 0  ⚠️ (schema ok; seed não cobre estante/clubes/usuário "Marina" do protótipo)
SPEC 1  ✅ (11 novos testes em e2e/auth-api.spec.ts, todos verdes)
SPEC 2  ✅ (coberto por e2e/users-api.spec.ts)
SPEC 3a ✅ (coberto por e2e/books-api.spec.ts)
SPEC 3b ✅ (coberto por e2e/social-api.spec.ts)
SPEC 4  ✅ (coberto por e2e/clubs-api.spec.ts)
Cross-cutting: ✅ (401/403/400 amostrados por módulo; passwordHash nunca vaza — testado)
Smoke E2E: não rodado como roteiro único (a cobertura de fluxo já existe espalhada
  pelos specs acima + e2e/social.spec.ts de UI); recomendo compor um spec único
  se quiser o critério de aceite exato dos 9 passos.

Suíte completa: 44/44 passed (npx playwright test)
```

---

## 0 — Fundação (schema + seed)

**Setup**
- ✅ `npx prisma validate` passa.
- ✅ `npx prisma migrate status` sem pendências (5 migrations aplicadas limpo).
- ✅ `npx prisma db seed` roda sem erro de FK.

**Schema fiel ao store**
- ✅ `Book.id` é slug (`torto-arado`, `duna`, …), não cuid.
- ✅ `Book.gradientFrom`/`gradientTo` (String, não array); `avg` Float; `count` Int.
- ✅ `ShelfEntry`: `status` enum `ShelfStatus`, `currentPage`, `lastPage`, `startedAt`,
  `finishedAt`, `@@unique([userId,bookId])`.
- ✅ `Review`: `@@unique([userId,bookId])` + índice `[bookId,createdAt]`.
- ✅ `Message`: `system` (Boolean), `replyToId` self-relation, índice `[clubId,createdAt]`.
- ✅ `Club.code` único e nullable.
- ⚠️ **`VerificationCode.code` não é `char(6)` no banco** — é `text` sem constraint de
  tamanho. O comprimento de 6 dígitos é só garantido pela geração (`gen()` em
  `src/lib/verification.ts:13`) e validado na entrada por Zod (`code: z.string().length(6)`
  nas rotas de verify/reset), nunca no schema. Não é um bug funcional (testado e
  funcionando), mas diverge do check literal da spec. `prisma/schema.prisma:66`.
- ⚠️ **Só `ShelfStatus` é um enum Postgres de verdade.** `Visibility` (`Club.visibility`,
  `List.visibility`), `ProgressUnit` (`User.progressUnit`) e `VerificationType`
  (`VerificationCode.type`) são `String`/`text` livres, com os valores válidos
  documentados em comentário e validados via Zod nas rotas — não há enum nem CHECK
  constraint no banco. Ver `prisma/schema.prisma:17` (`progressUnit`), `:171`
  (`Club.visibility`), `:60` (`VerificationCode.type`), `:157` (`List.visibility`).
  Funciona, mas um `UPDATE` direto no banco (fora da API) pode gravar qualquer string.

**Integridade do seed**
- ❌ **Não existe usuário "Marina" (`mari.leituras`) no banco semeado.** `prisma/seed.ts`
  só materializa os 6 perfis de `MOCK_USERS` (`src/data/users.ts` — a "comunidade").
  `INITIAL_USER`/"Marina Souza" (`src/lib/store/index.ts:15`) é hoje só o placeholder
  de UI antes do login via `AuthSync`/`hydrateFromSession` — não é mais semeado como
  conta real. Isso parece uma decisão deliberada de produto (o comentário em
  `store/index.ts:8-14` diz explicitamente que identidade/estante/reviews "já vêm da
  API"), mas invalida a leitura literal deste check da Spec V.
- ❌ **`ShelfEntry` não é semeado — 0 linhas no banco.** Nenhum usuário tem estante
  populada pelo seed; toda estante hoje só existe se um usuário real (registrado via
  `/api/auth/register`) gravar via `PUT /api/books/[id]/shelf`. O check "estante da
  Marina = 7 entries" não tem como passar porque nem a estante nem a Marina existem.
- ✅ Reviews com texto existem e correspondem a `MOCK_USERS[*].reviews` (6 linhas,
  cobrindo os livros usados no mock incluindo `torto-arado`/`1984`) — mas note que o
  seed atual dá review com texto a **todos** os 6 perfis (evolução do dado mock:
  cada community user ganhou uma review própria), não só às 2 do protótipo original.
- ✅ Nenhuma FK órfã possível por construção — todas as relações têm `onDelete`
  explícito e FK reais no Postgres (não há como um `@username` citado referenciar um
  `User` inexistente).
- ❌ **`Book.avg`/`Book.count` NÃO batem com a média real dos `Review` semeados.**
  Rodando a query de conferência da própria Spec V, as 8 linhas de `Book` falham
  (0 esperado, 8 obtidas). Exemplo: `verity` tem `avg=4, count=21458` no banco, mas a
  média/contagem real das reviews seedadas é `avg=3.50, count=1`. Causa: `seedBooks()`
  em `prisma/seed.ts:20-46` faz `create` com `avg`/`count` vindos direto do mock
  estático `src/data/books.ts` (números decorativos tipo "21458 avaliações" do
  protótipo em memória) e **nunca chama `recomputeBookRating()`** depois de semear as
  reviews — só a rota `PUT /api/books/[id]/review` recalcula (`src/lib/books.ts`,
  usada em `src/app/api/books/[id]/review/route.ts:79`). Resultado: `avg`/`count` só
  ficam corretos para livros que já tiveram uma review gravada via API depois do
  seed; no banco recém-semeado eles mentem. Fix sugerido (não aplicado — fora do
  escopo "só valida" desta tarefa): chamar `recomputeBookRating` pra cada livro ao
  fim de `seedReviews()`, ou parar de setar `avg`/`count` no `create` e deixar em 0
  até a primeira review real.
- ❌ **Nenhum clube semeado.** `prisma/seed.ts` não cria `Club`/`ClubMember`/`Message`
  — 0 linhas nas três tabelas logo após o seed. O mural/clubes só existem depois que
  um usuário real cria um clube via API.

```sql
-- reprodução do check de avg/count da Spec V (0 linhas esperadas, 8 obtidas hoje)
SELECT b.id, b.avg, b.count,
       round(avg(r.rating)::numeric, 2) AS real_avg, count(r.id) AS real_count
FROM "Book" b LEFT JOIN "Review" r ON r."bookId" = b.id
GROUP BY b.id HAVING b.count <> count(r.id)
   OR round(b.avg::numeric,2) <> coalesce(round(avg(r.rating)::numeric,2),0);
```

---

## 1 — Auth (`e2e/auth-api.spec.ts`, novo — 11 testes, todos verdes)

- ✅ `POST /api/auth/register` cria `User` com hash bcrypt (`$2...`, ≥59 chars) —
  verificado direto no Postgres.
- ✅ E-mail ou username já usados → 409.
- ✅ Payload inválido (senha < 8, username fora do regex) → 400.
- ✅ Login correto abre sessão (`/api/users/me` responde 200 depois); senha errada e
  e-mail inexistente retornam a **mesma** mensagem genérica ("Credenciais
  inválidas.") — não vaza se o e-mail existe.
- ✅ Código de verificação: cria `VerificationCode` com TTL de ~15min
  (`expiresAt - createdAt` ∈ (14, 16) min).
- ✅ Reenvio antes de 60s → 429 (`CooldownError` em `src/lib/verification.ts`).
- ✅ Verificar com código errado → 400 e **não** seta `emailVerified`; código certo
  seta `emailVerified` (checado direto no banco antes/depois).
- ✅ Forgot/reset troca a senha (login com a senha nova funciona) e marca o código
  usado — reuso do mesmo código → 400.
- ✅ Forgot com e-mail inexistente → 200 (não revela se a conta existe).
- ✅ Middleware: navegar pra `/home` sem sessão redireciona pra `/login`.
- ✅ `GET /api/users/me` sem sessão → 401 (prova indireta que `auth()` funciona nos
  handlers — as demais rotas protegidas seguem o mesmo padrão `session?.user?.id`).

Nenhuma divergência encontrada nesta seção.

---

## 2 — Users (coberto por `e2e/users-api.spec.ts`, pré-existente)

- ✅ `PATCH /api/users/me`: username em uso por outro → 409; `top4` com id
  inexistente → 400; update válido reflete no payload.
- ✅ Follow/unfollow real reflete em `followers`/`following`/`isFollowing` (grafo
  real, não número fixo).
- ✅ Seguir a si mesmo → 400.
- ✅ Troca de e-mail: código vai ao endereço **novo**; login com o e-mail antigo
  deixa de funcionar, com o novo passa a funcionar.
- ✅ Troca de senha exige senha atual correta (400 se errada); nova senha efetiva
  (login só funciona com a nova depois).
- ⚠️ Não verificado nesta rodada: `stats` (readCount/pagesRead/avgRating/histograma)
  batendo exatamente com `useMyStats` do mock antigo — comparação não é mais
  aplicável 1:1 já que não há mais uma "Marina" semeada com estante fixa de 7 itens
  (ver achado da Seção 0). Recomendo um teste dedicado que registra um usuário,
  monta uma estante conhecida via API e confere `GET /api/users/[username]` contra
  o valor calculado localmente no teste.

---

## 3a — Books, estante, reviews (coberto por `e2e/books-api.spec.ts`, pré-existente)

- ✅ `PUT .../shelf`: `startedAt` ao virar READING, `finishedAt` ao virar READ,
  `status: null` remove a entry.
- ✅ `PUT .../progress`: retorna `delta` correto e mantém `lastPage`.
- ✅ `PUT .../review`: upsert por `userId+bookId`, marca READ, recalcula `avg`/`count`
  **na mesma transação** (`db.$transaction` em
  `src/app/api/books/[id]/review/route.ts:29-81`) — nota ≤ 0 apaga a review e
  recalcula.
- ✅ Tags persistem por usuário e filtram a estante (`?tag=`).
- ✅ Busca por título/autor é case-insensitive e ignora acento (`normalize()` em
  `src/app/api/books/route.ts` e `src/app/api/shelf/route.ts`).
- ✅ Filtros compostos `?status=&genre=&tag=&q=` combinam em AND — confirmado por
  leitura de código (`src/app/api/shelf/route.ts:56-62`); não há teste e2e dedicado
  a essa combinação (as suítes atuais testam os filtros isoladamente).
- ⚠️ "Duas gravações concorrentes de review não deixam `count` inconsistente" — a
  gravação já é transacional (upsert + recompute no mesmo `$transaction`), o que
  evita a classe de bug mais comum, mas não há um teste que dispare escritas
  realmente concorrentes (duas requisições em paralelo) pra provar isolamento sob
  carga. Não automatizado nesta rodada.

---

## 3b — Feed + listas (coberto por `e2e/social-api.spec.ts`, pré-existente)

- ✅ `GET /api/feed?scope=all` só lista reviews com `text <> ''`, ordenado por
  `createdAt desc`.
- ✅ `scope=following` filtra pelos seguidos; vazio cai pro geral (`fellBackToAll`
  no payload, `src/app/api/feed/route.ts:63`).
- ✅ `likedByMe`/contagens via `_count`/`some` (sem N+1 manual) — confirmado por
  leitura de código.
- ✅ Curtir/comentar refletem em `/api/feed` e `/api/reviews/[id]`.
- ✅ Listas: cria, adiciona/remove livro, alterna visibilidade, 403 pra não-dono.
- ✅ Sugestões de leitores excluem quem já sigo e a mim mesma.
- ⚠️ Paginação por cursor (2ª página não duplica/pula) segue o mesmo contrato
  `?cursor=`/`nextCursor` em todos os endpoints (feed, books, comments, followers/
  following — confirmado por grep), mas não há teste e2e que pagine de fato uma
  lista com mais de uma página e compare os ids das duas páginas.

---

## 4 — Clubs + chat (coberto por `e2e/clubs-api.spec.ts`, pré-existente)

- ✅ Criar público (sem code) e privado (code 6 chars A–Z0–9).
- ✅ `code` visível só ao criador em `GET /api/clubs/[id]`.
- ✅ Entrar em público sem code; privado só com code válido; repetido → `"already"`;
  code inválido → 404.
- ✅ Sair funciona; criador bloqueado de sair.
- ✅ Gerenciamento (editar/excluir/remover membro/regenerar code) só pelo criador
  → 403 pra membro comum.
- ✅ `POST /messages` só membro (403 se não); resposta cita a mensagem certa.
- ✅ Gancho de progresso: atualizar progresso do livro-tema publica **uma**
  `Message` `system:true` por mudança de %; reenviar a mesma página não duplica.
- ⚠️ `GET /messages` com paginação por cursor (`after`, sem duplicar) não tem teste
  dedicado nesta rodada — o spec existente testa publicar/responder, não paginação
  de histórico longo.

---

## Cross-cutting

- ✅ **Sem vazamento de `passwordHash`**: testado explicitamente
  (`e2e/auth-api.spec.ts` — resposta de `/api/users/me` não contém a chave nem a
  string `"passwordHash"` no JSON serializado).
- ✅ **Autorização**: amostrado 401 sem sessão (`/api/users/me`), 403 pra recurso de
  terceiro (clube — membro comum tentando gerenciar; lista privada de outro dono) em
  cada suíte de módulo.
- ✅ **Validação Zod**: todo body malformado testado retorna 400 (register, review,
  patch de perfil, etc.), sem 500.
- ✅ **IDs**: livro = slug (`Book.id` é o slug, sem `@default(cuid())`); demais
  modelos usam `cuid()`. Nenhuma rota inspecionada usa id vindo do client pra
  autorizar sem cruzar com `session.user.id`.
- ✅ **Cursor consistente**: mesmo contrato `?cursor=`/`nextCursor` em feed, busca de
  livros, comentários e followers/following.
- ⚠️ **Timezones/datas**: `startedAt`/`finishedAt`/`createdAt` são
  `timestamp(3) without time zone` no Postgres, e o Node grava com `new Date()`
  (UTC internamente) — não há teste que force um fuso não-UTC no processo e
  confirme a serialização exibida no front bate com o que o usuário espera. Risco
  baixo (servidor sempre roda em UTC em produção), mas não verificado.

---

## Arquivos alterados nesta validação

- **Novo:** `e2e/auth-api.spec.ts` — 11 testes cobrindo a Spec 1 (Auth), que não
  tinha suíte dedicada antes (só era exercitada indiretamente via o helper
  `register()`/`login()` usado pelos outros specs).
- **Novo:** `docs/VALIDATION_REPORT.md` (este arquivo).

## Recomendações de próximo passo (não aplicadas — fora do escopo "só valida")

1. Corrigir `prisma/seed.ts` pra chamar `recomputeBookRating` (ou zerar `avg`/
   `count` no create) depois de semear reviews, e opcionalmente semear
   estante/clube de demonstração se ainda fizer sentido pro roteiro de QA manual.
2. Decidir se `Visibility`/`ProgressUnit`/`VerificationType` viram enums Postgres de
   verdade (mais seguro contra escrita direta no banco) ou se o `String` + Zod
   atual é aceitável — é uma troca de migration, não fiz isso aqui.
3. Se quiser o critério de aceite exato do "Smoke E2E" (9 passos em sequência, um
   só spec, com refresh no passo 9), posso compor esse spec único — hoje a mesma
   cobertura existe, mas espalhada entre `e2e/social.spec.ts` (UI) e os `*-api.spec.ts`.
