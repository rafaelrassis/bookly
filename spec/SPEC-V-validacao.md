# Spec V — Validação do backend (0–4)

**Objetivo:** plano executável pra verificar que a implementação bate com as Specs 0, 1, 2, 3a, 3b e 4. Não adiciona features — só **valida**. Serve de roteiro de QA manual e de esqueleto pros testes automatizados. Rodável pelo Claude Code / `verify` skill.

**Pré-requisito:** Postgres no ar, `.env` com `DATABASE_URL` e `AUTH_SECRET`, migrations aplicadas e seed rodado.

---

## Como usar

Cada seção tem checks com **critério objetivo**. Marca ✅/❌ e anota o desvio. Ordem sugerida = de baixo pra cima (fundação → domínio), porque falha em camada baixa invalida as de cima. Ao final, o **smoke E2E** exercita o fluxo do usuário inteiro.

Sugestão de stack de teste (opcional, mas recomendo):
- **Vitest** para unidade/integração dos handlers.
- **Supertest** (ou `fetch` direto) contra o server Next em `npm run build && npm run start`.
- **Playwright** (já usado no `verify`) para o smoke de UI depois que o front consumir a API.

```bash
npm install -D vitest supertest @types/supertest
# script: "test": "vitest run"
```

---

## 0 — Fundação (schema + seed)

**Setup**
- [ ] `npx prisma validate` passa.
- [ ] `npx prisma migrate status` sem migrations pendentes.
- [ ] `npx prisma db seed` roda sem erro de FK.

**Schema fiel ao store** (o ponto que mais quebra)
- [ ] `Book.id` é o **slug** (`torto-arado`), não cuid.
- [ ] `Book` tem `gradientFrom`/`gradientTo` (não array), `avg` (Float), `count` (Int).
- [ ] `ShelfEntry` usa `status` (enum), `currentPage`, `lastPage`, `startedAt`, `finishedAt`, `@@unique([userId,bookId])`.
- [ ] `Review` tem `@@unique([userId,bookId])` e índice `[bookId,createdAt]`.
- [ ] `Message` tem `system`, `replyToId` (self-relation) e índice `[clubId,createdAt]`.
- [ ] `Club.code` único e nullable; `VerificationCode.code` char(6).
- [ ] Enums existem: `ShelfStatus`, `Visibility`, `ProgressUnit`, `VerificationType`.

**Integridade do seed** (rodar em `prisma studio` ou queries)
- [ ] `@demo` existe, logável (`demo@bookly.dev` / `bookly123`), `emailVerified` setado, `passwordHash` bcrypt (não texto puro).
- [ ] Estante de `@demo` = 2 entries (1 READING com `currentPage`, 1 READ com `finishedAt`).
- [ ] `@demo` tem 1 review (`duna`) e 1 clube público onde é `creator`, com ≥1 mensagem.
- [ ] Os 6 community users existem; suas reviews (`FEED_REVIEWS`) materializadas com comments/likes.
- [ ] **Nenhum** usuário "Marina/INITIAL_USER" no banco (placeholder de UI, não semeado).
- [ ] Todo `@username` citado no feed/comentários **existe** como `User` (sem FK órfã).
- [ ] Para cada livro: `avg` = média real dos `Review.rating`; `count` = nº de reviews (query de conferência abaixo = 0 linhas).
- [ ] Clubes semeados com membros e mensagens; `replyTo` e `system` mapeados.

> `avg`/`count` **não** vêm de `src/data/books.ts` (números decorativos, ignorados no seed). Nascem do recompute no fim do seed. A query abaixo é o teste-verdade dessa etapa — foi ela que originalmente pegou o bug (`verity`: seeded 4/21458 vs. real 3.50/1).

```sql
-- avg/count conferem?
SELECT b.id, b.avg, b.count,
       round(avg(r.rating)::numeric, 2) AS real_avg, count(r.id) AS real_count
FROM "Book" b LEFT JOIN "Review" r ON r."bookId" = b.id
GROUP BY b.id HAVING b.count <> count(r.id)
   OR round(b.avg::numeric,2) <> coalesce(round(avg(r.rating)::numeric,2),0);
-- 0 linhas = ok
```

---

## 1 — Auth

- [ ] `POST /api/auth/register` cria User com hash (bcrypt, ~60 chars começando `$2`).
- [ ] Registrar e-mail/username já usado → 409.
- [ ] Payload inválido (senha < 8, username fora do regex) → 400.
- [ ] `signIn` credentials correto abre sessão; senha errada → falha, sem vazar se o e-mail existe.
- [ ] Código de verificação: enviar loga no console (dev) e cria `VerificationCode` com `expiresAt` ~15 min.
- [ ] Reenvio antes de 60s → 429 (cooldown).
- [ ] Verificar com código certo seta `emailVerified`; código expirado/errado → 400 e **não** verifica.
- [ ] Forgot/reset troca a senha e marca o código `usedAt`; código reusado falha.
- [ ] Middleware: request sem sessão a rota do grupo `(app)` → redirect `/login`.
- [ ] `auth()` num handler retorna `user.id`.

---

## 2 — Users

- [ ] `GET /api/users/[username]` retorna perfil + `stats` + `isFollowing` correto pro viewer.
- [ ] `stats` de `@demo` batem com o cálculo esperado (readCount, pagesRead incl. `currentPage` dos READING, avgRating, histograma) — não há mais alvo "mock" pra comparar; a verdade agora é a própria fórmula (Spec 2).
- [ ] `PATCH /api/users/me` com `username` já tomado por outro → 409.
- [ ] `PATCH` com `top4` contendo id inexistente → 400.
- [ ] Follow: `POST` segue (idempotente — 2 chamadas = 1 vínculo); `DELETE` desfaz.
- [ ] Seguir a si mesmo → 400.
- [ ] Contagens `followers`/`following` refletem o grafo (não número fixo 128/87).
- [ ] Trocar e-mail: código vai ao **novo** endereço; só efetiva após confirmar.
- [ ] Trocar senha exige senha atual correta; nova fraca/igual → 400.

---

## 3a — Books, estante, reviews

- [ ] `GET /api/books/[id]` num payload: `book` (com avg/count/gradient) + `entry` + `rating` + `myReview` + `tags` + `quotes` do viewer.
- [ ] `GET /api/books?q=` acha por título e por autor (case-insensitive).
- [ ] `PUT /shelf` aplica `startedAt` ao virar READING e `finishedAt` ao virar READ; `null` remove entry.
- [ ] `PUT /progress` retorna `delta` correto e move anterior pra `lastPage`.
- [ ] `PUT /review` cria/atualiza (1 por user+livro), marca READ, e **recalcula avg/count na mesma transação**.
- [ ] `rating <= 0` apaga a review e recalcula agregados.
- [ ] Duas gravações concorrentes de review no mesmo livro não deixam `count` inconsistente (transação).
- [ ] Tags/quotes persistem por usuário; `GET /api/shelf?tag=` filtra certo.
- [ ] Filtros compostos `?status=&genre=&tag=&q=` combinam (AND).

---

## 3b — Feed + listas

- [ ] `GET /api/feed?scope=all` lista reviews **com texto**, ordenado por recência.
- [ ] `scope=following` filtra pelos seguidos; **vazio → cai pro geral** (fallback).
- [ ] Paginação por cursor: 2ª página não duplica nem pula (comparar ids).
- [ ] `likedByMe` e contagem de likes corretos por item (sem N+1 explícito — usa `_count`/`some`).
- [ ] Like `POST`/`DELETE` idempotente.
- [ ] Comentar cria `Comment` e aparece em `GET /comments`.
- [ ] Lista privada → 403 pra não-dono; pública aparece no perfil do dono.
- [ ] Add/remove livro na lista mantém `order`.
- [ ] Reviews **sem** texto **não** entram no feed, mas contam no `avg` do livro.

---

## 4 — Clubs + chat

- [ ] Criar público (sem code) e privado (com `code` de **6** chars A–Z0–9).
- [ ] `code` visível só ao criador em `GET /api/clubs/[id]`.
- [ ] Entrar em público sem code; em privado só com code válido; repetido → `"already"`; code inválido → 404.
- [ ] Sair funciona; criador **não** sai (arquiva/deleta conforme decisão).
- [ ] Gerenciamento (`PATCH`/`DELETE`/remover membro/regenerar code) só pelo criador; membro comum → 403.
- [ ] `GET /messages` sem cursor traz últimas 50 (ordem crescente); com `after` traz só o novo, sem duplicar.
- [ ] `POST /messages` só membro (não-membro → 403); `text > 500` → 400.
- [ ] Responder cita a mensagem certa (`replyTo.user`/`text`).
- [ ] **Gancho de progresso:** atualizar progresso (3a) de livro-tema publica **uma** `Message` `system:true` por mudança de %; reenviar mesma página **não** duplica (idempotência via `ClubMember.progress`).
- [ ] Progresso de membro é derivado do `ShelfEntry`; progresso do clube = média.

---

## Cross-cutting (vale pra todas)

- [ ] **Autorização:** todo handler mutável exige sessão; sem sessão → 401; recurso de terceiro → 403. Testar 1 caso por módulo.
- [ ] **Validação:** todo body passa por Zod; payload inválido → 400 com shape de erro consistente.
- [ ] **Sem vazamento:** `passwordHash` nunca aparece em resposta JSON (grep nos payloads).
- [ ] **IDs:** livro = slug; demais = cuid. Nenhuma rota confia em id vindo do client pra autorizar (sempre cruza com a sessão).
- [ ] **Cursor consistente:** todos os endpoints paginados usam o mesmo contrato (`?cursor=`/`nextCursor`).
- [ ] **Erros não derrubam o server:** input malformado retorna 4xx, não 500.
- [ ] **Timezones/datas:** datas persistem em UTC; `startedAt/finishedAt` batem com o que o front exibe ("Leu de X a Y").
- [ ] **Enums no banco:** `ShelfStatus`, `Visibility`, `ProgressUnit`, `VerificationType` existem como tipos Postgres (`\dT+`). Inserir valor inválido via SQL cru é **rejeitado pelo banco**, não só pelo Zod.

---

## Smoke E2E (fluxo do usuário inteiro)

Roteiro único que toca todas as camadas. Automatizável em Playwright/Supertest.

1. **Registrar** novo usuário → verificar e-mail com o código do console → `signIn`.
2. **Perfil:** editar bio/top4; seguir `@demo`; conferir `following=1` e as stats de `@demo`.
3. **Livro:** abrir `o-nome-do-vento` → marcar READING → progresso 200 → conferir `delta`/percent.
4. **Avaliar** `duna` com 4.5 + texto → conferir que virou READ, review criada e `avg`/`count` de `duna` recalcularam.
5. **Feed:** ver a review nova em `scope=all`; curtir uma review de um community user; comentar.
6. **Lista:** criar lista pública, add 2 livros, conferir ordem; tornar privada → some do perfil pra outro viewer.
7. **Clube:** criar clube privado do `duna` → pegar code → (com 2º usuário) entrar por code → publicar mensagem → responder citando.
8. **Sistema:** entrar no clube público de `@demo` (criado no seed) com o usuário registrado no passo 1 → `@demo` atualiza progresso do livro-tema → conferir **uma** mensagem `system` no mural.
9. **Refresh:** recarregar → estado **persiste** (prova de que saiu do mock em memória).

**Critério de aceite global:** os 9 passos passam, zero 500, zero erro no console, e o passo 9 persiste após refresh.

---

## Relatório de saída

Ao rodar, produzir um resumo curto:

```
SPEC 0  ✅   SPEC 1  ✅   SPEC 2  ⚠️ (follow count off)
SPEC 3a ✅   SPEC 3b ✅   SPEC 4  ❌ (system msg duplicando)
Cross-cutting: ✅   Smoke E2E: 8/9 (passo 8 falhou)
```

Cada ❌/⚠️ com: check que falhou, esperado × obtido, e arquivo/endpoint provável.

---

## Aberto pra você decidir

- **Nível de automação:** só checklist manual agora, ou já escrevo os testes Vitest/Supertest de fato (posso gerar por módulo)?
- **Gate de CI:** quer esses checks como `npm test` bloqueando push na main, ou rodados sob demanda?
