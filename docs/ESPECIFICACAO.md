# 📚 BOOKLY — Especificação do Produto (estado real)

**Versão:** 2.0
**Status:** 🟢 Em produção
**Escopo:** este documento descreve o Bookly **como ele existe hoje** no repositório — não um plano futuro. A v1.0 (2024-07-20) era uma especificação-alvo escrita antes de qualquer código; o produto evoluiu de forma diferente dela em praticamente todo detalhe técnico (stack, schema, endpoints, até funcionalidades incluídas/excluídas). Esta versão substitui a anterior integralmente.

---

## 📑 ÍNDICE

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura do Produto](#2-arquitetura-do-produto)
3. [Especificações Funcionais](#3-especificações-funcionais)
4. [Guia de Telas](#4-guia-de-telas)
5. [Modelos de Dados](#5-modelos-de-dados)
6. [Fluxos de Negócio](#6-fluxos-de-negócio)
7. [Componentes UI](#7-componentes-ui)
8. [Validações e Regras](#8-validações-e-regras)
9. [Tratamento de Erros](#9-tratamento-de-erros)
10. [Stack Técnico](#10-stack-técnico)
11. [Arquitetura de Pastas](#11-arquitetura-de-pastas)
12. [Histórico de Entregas & Próximos Passos](#12-histórico-de-entregas--próximos-passos)
13. [Endpoints da API](#13-endpoints-da-api)
14. [Schema do Banco (Prisma)](#14-schema-do-banco-prisma)
15. [Environment Variables](#15-environment-variables)
16. [Riscos & Mitigação](#16-riscos--mitigação)
17. [Definição de Pronto (DoD)](#17-definição-de-pronto-dod)

---

# 1. VISÃO GERAL

## 1.1 Sobre o Produto

**Bookly** é um "Letterboxd de livros": uma rede social de leitura onde usuários avaliam livros, acompanham o progresso de leitura, seguem outros leitores e participam de clubes do livro com mural em formato de chat.

## 1.2 Público-alvo

- Leitores casuais e assíduos que já usam ou usariam Goodreads/Letterboxd
- Pessoas que quer registrar o que leem, dar nota e escrever review curta
- Grupos/clubes de leitura que já se organizam informalmente e querem um espaço próprio

## 1.3 Funcionalidades entregues

1. ✅ Autenticação via Google/Amazon OAuth (Auth.js v5); login por e-mail/senha existe no código mas fica desligado por padrão (`NEXT_PUBLIC_EMAIL_LOGIN_ENABLED`)
2. ✅ Onboarding pós-primeiro-login (username, nome, bio, gêneros favoritos)
3. ✅ Catálogo de livros populado sob demanda via Google Books API (sem seed em produção)
4. ✅ Página do livro: nota agregada, estante (Quero ler/Lendo/Lido), progresso de leitura (páginas ou %), avaliação com meia estrela, review, tags e citações
5. ✅ Feed social (Geral/Seguindo/Curtidas) com curtidas e comentários em reviews
6. ✅ Sistema de follow (seguir/deixar de seguir, listas de seguidores/seguindo, sugestões de leitores)
7. ✅ Estante pessoal com filtros compostos (status/gênero/tag) e listas de livros públicas/privadas
8. ✅ Clubes do livro públicos e privados (código de convite de 6 caracteres), com mural em formato de chat (respostas citadas, menções `@`, mensagens de sistema de progresso)
9. ✅ Perfil público (`/u/[username]`) e próprio, com histograma de notas, favoritos (top 4), estatísticas e abas de atividade
10. ✅ Metas de leitura anuais com anel de progresso e indicador de ritmo
11. ✅ Import de biblioteca via CSV do Goodreads (dedupe + relatório)
12. ✅ Configurações: tema claro/escuro, troca de senha real (quando login por e-mail habilitado), formulário de feedback
13. ✅ Notificações (curtida/comentário/follow) — só no store local, sem tabela no Prisma
14. ✅ Upload de foto de perfil via Vercel Blob (crop + resize para WebP 400×400)
15. ✅ Rate limiting (sliding window) via Upstash Redis nas rotas de escrita, fail-open sem Redis configurado

## 1.4 Fora de escopo (não construído, e sem plano concreto de construir)

- ❌ Telefone/SMS como método de verificação
- ❌ Autenticação de dois fatores (2FA)
- ❌ Gerenciamento de sessões ativas (múltiplos dispositivos)
- ❌ Chat em tempo real via WebSocket — o mural de clube usa fetch/refresh, não push
- ❌ Notificações push ou com backend persistente
- ❌ Reações com emoji no chat do clube
- ❌ App mobile nativo
- ❌ Recomendações com IA (as recomendações atuais são regra simples: gêneros do usuário menos o que já está na estante)
- ❌ Badges/gamificação

---

# 2. ARQUITETURA DO PRODUTO

## 2.1 Mapa de Rotas

```
Público (sem sessão)
├── /                      Landing (redireciona para /home se logado)
├── /login                 Login (Google, Amazon; e-mail/senha se habilitado)
├── /signup                Cadastro (idem)
├── /forgot-password       Recuperação de senha (só com login por e-mail habilitado)
└── /onboarding            1º acesso pós-OAuth: username, nome, bio, gêneros

Logado (grupo (app) — guard no middleware + layout; tab bar fixa)
├── /home                  Feed (Geral/Seguindo), leituras atuais, em alta
├── /search                Busca de livros (catálogo interno + Google Books) e listas da comunidade
├── /book/[id]              Detalhe do livro, estante, progresso, avaliação, tags, citações
├── /review/[id]             Review individual (permalink, likes/comentários)
├── /shelf                  Estante pessoal (filtros) + minhas listas + metas de leitura
├── /lists/[id]              Detalhe de uma lista (adicionar/remover livro, visibilidade)
├── /clubs                  Meus clubes / clubes públicos, criar/entrar por código
├── /clubs/new              Criar clube
├── /clubs/[id]              Clube: mural (chat), membros, progresso, gerenciamento (criador)
├── /profile                Perfil próprio
├── /profile/edit           Editar perfil (username, foto, bio, top 4, gêneros)
├── /u/[username]            Perfil público de outro usuário
├── /notifications          Notificações (client-only, sem backend)
└── /settings               Conta, senha, tema, import Goodreads, feedback, sair
```

Tab bar (mobile, `src/components/TabBar.tsx`): **Início · Estante · Clube · Perfil**.

## 2.2 Guarda de acesso

`src/middleware.ts` roda no Edge (Auth.js) e redireciona para `/login` qualquer rota protegida sem sessão — exceto para crawlers de preview de link (WhatsApp/Telegram, ver `src/lib/bot.ts`), que precisam renderizar a árvore para a metadata (title/OG image) chegar até eles. `src/app/(app)/layout.tsx` reforça o mesmo gate no server e redireciona para `/onboarding` quando `User.onboarded` é falso.

## 2.3 Fluxo Principal do Usuário

```
Landing (/) 
    ↓
Login/Signup (Google ou Amazon OAuth)
    ↓
Onboarding (1ª vez: username, nome, bio, gêneros) — grava via PATCH /api/users/me
    ↓
Home
    ├─→ Buscar livro → Página do livro → estante/progresso/avaliação/review/tags/citações
    ├─→ Feed (Geral/Seguindo) → Review → curtir/comentar
    ├─→ Estante → filtros, listas, metas de leitura
    ├─→ Clubes → criar, entrar por código, mural em chat, gerenciar (criador)
    └─→ Perfil → editar perfil, seguir/seguidores, configurações (tema, senha, import, feedback, sair)
```

---

# 3. ESPECIFICAÇÕES FUNCIONAIS

## 3.1 Autenticação & Onboarding

- **Login/cadastro:** Google e Amazon (Login with Amazon, provider OAuth2 genérico — Auth.js não tem provider nativo). E-mail é a identidade única (`User.email @unique`); `allowDangerousEmailAccountLinking: true` em ambos os providers permite logar com qualquer um dos dois usando o mesmo e-mail sem cair em `OAuthAccountNotLinked`.
- **Login por e-mail/senha:** existe no código (`Credentials` + bcrypt, `/signup`, `/forgot-password`, verificação de e-mail por código de 6 dígitos), mas fica **desligado por padrão** atrás de `NEXT_PUBLIC_EMAIL_LOGIN_ENABLED`. Reativar essa flag religa esse fluxo completo.
- **Onboarding:** conta OAuth nasce com `onboarded: false` e sem `username`. `/onboarding` coleta nome, username (validado em tempo real via `check-username`), bio e gêneros favoritos; ao concluir, `PATCH /api/users/me` com `onboarded: true` libera o acesso ao grupo `(app)`.
- **Sessão:** JWT (Auth.js, `session: { strategy: "jwt" }`), decodificado no middleware Edge sem round-trip ao banco.

## 3.2 Livro & Avaliação

- **Catálogo:** cresce sob demanda. `getOrCreateBook(id)` busca no Google Books na primeira vez que um `id` é referenciado e faz cache local (`Book`), revalidando campos voláteis (capa/sinopse) a cada 30 dias.
- **Nota:** rating e review são a **mesma entidade** (`Review`, 1 por usuário+livro). Escala 0–5 em passos de 0,5 (meia estrela). Nota ≤ 0 apaga a review inteira. Avaliar marca o livro como **Lido** automaticamente (se ainda não estava).
- **Estante (por livro):** status `WANT_TO_READ` / `READING` / `READ`; progresso (`currentPage`/`lastPage`) na unidade escolhida pelo usuário (páginas ou %, `User.progressUnit`). Datas de início/fim de leitura ficam no `ShelfEntry` e são copiadas para a `Review` quando existem.
- **Tags:** livres, por usuário+livro (`BookTag`), usadas como filtro na estante.
- **Citações:** texto + página opcional (`Quote`), por usuário+livro.
- **Nota agregada do livro:** `Book.avg`/`Book.count` são cache, recalculados (`recomputeBookRating`) a cada gravação/remoção de review.

## 3.3 Feed Social & Follow

- **Feed** (`GET /api/feed?scope=`): `all` (toda review com texto não vazio), `following` (só de quem eu sigo — **sem tabela** quando não sigo ninguém: retorna `emptyReason: "no_follows"`, sem cair no feed geral), `liked` (reviews que curti). Paginado por cursor.
- **Curtidas/comentários** em reviews (`ReviewLike`, `Comment` — thread flat, sem resposta a comentário).
- **Follow:** `Follow` único por par (seguidor, seguido). "Descobrir leitores" sugere até 6 contas onboardadas que o usuário ainda não segue (exclui a si mesmo).

## 3.4 Estante, Listas & Metas de Leitura

- **Estante** (`/shelf`): filtros compostos por status, gênero e tag, busca por título/autor.
- **Listas** (`List`/`ListBook`): nome, visibilidade pública/privada, livros ordenados. Listas públicas aparecem no perfil do dono e na busca sem query ("Listas da comunidade").
- **Metas de leitura** (`ReadingGoal`): meta anual de livros; progresso é **derivado** da estante (`ShelfEntry` `READ` com `finishedAt` no ano, não persistido na meta) — mostra anel de progresso e ritmo (livros lidos vs. esperado pelo dia do ano).

## 3.5 Clubes do Livro

- **Criação:** nome, livro (do catálogo), descrição opcional, público ou privado.
- **Código de convite:** 6 caracteres, só para clubes privados, gerado na criação e regenerável pelo criador (`generateClubCode`, retry em colisão via `P2002`).
- **Entrar:** direto (público) ou por código de 6 chars (privado, `POST /api/clubs/join`).
- **Mural (chat):** mensagens (`Message`) com resposta citada (`replyTo`), menção `@`, e mensagens de sistema (`system: true`) emitidas automaticamente quando um membro atualiza o progresso de leitura do livro do clube — uma vez por mudança de percentual, não a cada request.
- **Gerenciamento (só criador):** editar nome/descrição/livro, remover membro, ver/regenerar código, excluir clube.
- **Progresso do clube:** média do progresso de leitura de todos os membros no livro do clube (`averageClubProgress`).

Não é WebSocket: o mural busca mensagens via fetch (paginação simples), sem push em tempo real.

## 3.6 Perfil & Configurações

- **Perfil próprio/público:** histograma de notas, favoritos editáveis (top 4 livros), estatísticas (livros lidos, páginas lidas, nº de reviews, média), abas de atividade (notas/reviews/curtidas), listas públicas, recomendações.
- **Editar perfil:** username (único, citext — case-insensitive), nome, bio, top 4, gêneros, foto.
- **Upload de avatar:** crop client-side (`react-easy-crop`) → `sharp` redimensiona para 400×400 WebP → Vercel Blob (`avatars/<userId>.webp`, `allowOverwrite`, URL com cache-bust `?v=timestamp`).
- **Configurações:** e-mail (somente leitura — imutável via OAuth), troca de senha real (só com login por e-mail habilitado), tema claro/escuro (Zustand + CSS variables `data-theme`), import de biblioteca do Goodreads, formulário de feedback (Resend), sair da conta.

## 3.7 Notificações

Curtida, comentário e novo seguidor. **Sem model no Prisma** — vivem só no Zustand local (client-only), sincronizadas por sessão/`localStorage`. Sino mostra contagem de não lidas; página lista e permite marcar como lidas / limpar tudo. Sem seed nem conteúdo fabricado: uma conta nova não vê nenhuma notificação até gerar atividade real.

## 3.8 Import Goodreads

`GoodreadsImport` (Configurações) aceita o CSV de export do Goodreads. Cada linha é resolvida contra o catálogo (por ISBN, evitando gastar cota do Google Books) ou busca no Google Books (limite de 200 lookups por import). Grava estante (status mapeado de `shelf`) e review (se `myRating > 0`) via upsert idempotente — reimportar o mesmo CSV atualiza, não duplica.

## 3.9 Feedback

Formulário simples em Configurações (`FeedbackModal`) que envia e-mail via Resend (`POST /api/feedback`, rate limit dedicado e mais agressivo).

---

# 4. GUIA DE TELAS

Este documento não recria wireframes ASCII da UI — a UI real já existe em código (`src/app/**`, `src/components/**`) e reflete o design system "leather/paper/ribbon/foil" (tokens em CSS variables, ver `tailwind.config.ts` e `globals.css`), viewport mobile-first (390×844), fontes Fraunces (display) e Karla (texto). Para consultar o layout exato de uma tela, ler o componente correspondente é mais confiável que qualquer mockup estático.

Resumo de conteúdo por tela (não pixel-a-pixel):

| Tela | Conteúdo principal |
|---|---|
| `/home` | Leituras atuais (todas, sem botão de progresso), "Em alta esta semana" (trending), feed Geral/Seguindo com empty states reais |
| `/search` | Busca no catálogo interno + Google Books; "Listas da comunidade" quando sem query |
| `/book/[id]` | Capa, nota, estante (3 status), progresso (páginas/%), avaliação (meia estrela), reviews, tags, citações |
| `/shelf` | Filtros (status/gênero/tag), lista de livros com badge de status e tags, seção de listas, meta de leitura anual |
| `/clubs` | Meus clubes / clubes públicos, botão criar, entrar por código |
| `/clubs/[id]` | Progresso médio do clube, membros, mural (chat com citação/menção), painel de gerenciamento (criador) |
| `/profile`, `/u/[username]` | Histograma, favoritos, estatísticas, abas de atividade, listas públicas, recomendações |
| `/profile/edit` | Foto (upload + crop), nome, username, bio, top 4, gêneros |
| `/settings` | Conta (e-mail, senha), aparência (tema), import Goodreads, feedback, sair |
| `/notifications` | Lista de notificações locais ou empty state ("Nenhuma notificação por aqui ainda.") |

Estados visuais reais (loading/empty/error) usam componentes dedicados: `Skeleton`, `Spinner`, `EmptyState`, `SectionError` — cada seção que busca dado tem seu próprio tratamento, sem um estado global genérico de app.

---

# 5. MODELOS DE DADOS

O schema real vive em `prisma/schema.prisma` (fonte de verdade — reproduzido integralmente na Seção 14). Resumo por domínio:

- **Auth:** `User`, `Account` (OAuth via Auth.js `PrismaAdapter`), `Session`/`VerificationToken` (exigidos pelo tipo do adapter, não usados em runtime — sessão real é JWT), `VerificationCode` (só e-mail/senha, atrás da feature flag).
- **Social:** `Follow` (seguidor/seguido, único por par).
- **Catálogo:** `Book` (cache do Google Books + campos de UI como gradiente de capa para livros sem `coverUrl`).
- **Leitura:** `ShelfEntry` (status + progresso por usuário+livro), `ReadingGoal` (meta anual).
- **Avaliação:** `Review` (rating+texto, 1 por usuário+livro), `ReviewLike`, `Comment`.
- **Organização:** `List`/`ListBook` (listas de livros), `BookTag`, `Quote`.
- **Clubes:** `Club`, `ClubMember` (role creator/member + progresso), `Message` (mural, com `replyTo` e flag `system`).

Diferenças notáveis em relação ao plano original (v1.0): não há `phone`/`phoneVerified` no `User`; não há model de `Session` de aplicação com múltiplos dispositivos (a `Session` do Prisma é só para satisfazer o `PrismaAdapter`); rating é `Float` 0–5 em passos de 0,5 (não inteiro 1–5); `Book` guarda um único `genre`/`authors` como string (não array), refletindo o shape retornado pelo Google Books; não há model de `Notification`.

---

# 6. FLUXOS DE NEGÓCIO

## 6.1 Login OAuth + Onboarding

```
Usuário clica "Continuar com Google/Amazon"
    ↓
Auth.js troca o code OAuth, cria/atualiza User + Account (PrismaAdapter)
    ↓
Se User.onboarded == false → redireciona /onboarding
    ↓
Preenche username (validado em tempo real), nome, bio, gêneros
    ↓
PATCH /api/users/me { onboarded: true, ... } 
    ↓
Redireciona /home
```

## 6.2 Avaliar um Livro

```
Usuário está em /book/[id], escolhe nota (meia estrela)
    ↓
PUT /api/books/[id]/review { rating, title?, text? }
    ↓
rating <= 0 → deleta a review, recalcula avg/count
rating > 0  → upsert da review, marca ShelfEntry como READ (se ainda não), 
              copia startedAt/finishedAt, recalcula avg/count
    ↓
Review aparece no feed geral (se text não vazio) e na página do livro
```

## 6.3 Criar Clube e Convidar

```
Usuário preenche nome + livro (do catálogo) + descrição + público/privado
    ↓
POST /api/clubs → cria Club; se privado, gera code (6 chars, único)
    ↓
Criador é adicionado como ClubMember (role: "creator")
    ↓
Convite: compartilha o código (só o criador vê/regenera)
    ↓
Outro usuário → POST /api/clubs/join { code } → vira ClubMember (role: "member")
```

## 6.4 Progresso de Clube → Mensagem de Sistema

```
Membro atualiza progresso de leitura do livro do clube (PUT /api/books/[id]/progress)
    ↓
Percentual calculado (currentPage / book.pages)
    ↓
Se mudou desde o último progresso publicado (ClubMember.progress) →
  cria Message { system: true, text: "<nome> chegou a X%" }
    ↓
Não repete a mesma mensagem em requests subsequentes sem mudança de %
```

## 6.5 Upload de Avatar

```
Usuário seleciona imagem em /profile/edit
    ↓
Crop client-side (AvatarCropModal, react-easy-crop)
    ↓
POST /api/upload/avatar (FormData) — valida tipo (jpeg/png/webp) e tamanho (<=5MB)
    ↓
sharp: resize 400x400 cover → WebP qualidade 80
    ↓
Vercel Blob put(`avatars/<userId>.webp`, { allowOverwrite: true, addRandomSuffix: false })
    ↓
User.avatarUrl = url + "?v=<timestamp>" (cache-bust; chave do blob é fixa por usuário)
```

## 6.6 Import Goodreads

```
Usuário sobe o CSV de export do Goodreads em Configurações
    ↓
Parse (papaparse) + validação de tamanho (<=5MB)
    ↓
Por linha: resolve o livro (ISBN no catálogo local, senão busca Google Books;
           limite de 200 lookups por import)
    ↓
Upsert ShelfEntry (status mapeado de "shelf") + Review (se myRating > 0)
    ↓
Relatório final: quantos livros importados/atualizados/pulados
```

## 6.7 Meta de Leitura Anual

```
Usuário define targetBooks para o ano (Estante → card de meta)
    ↓
PUT /api/goals/[year] { targetBooks }
    ↓
GET /api/goals/[year] deriva:
  read = count(ShelfEntry READ com finishedAt no ano)
  percent = read / target
  pace = read - esperado-pelo-dia-do-ano (ritmo: adiantado/atrasado)
```

---

# 7. COMPONENTES UI

Componentes reais em `src/components/`:

| Componente | Uso |
|---|---|
| `AuthSync` | Sincroniza sessão NextAuth → identidade no store (Zustand) |
| `Avatar` | Avatar circular: foto (Blob) ou gradiente (`AVATAR_CHOICES`) com iniciais |
| `AvatarUpload` / `AvatarCropModal` | Upload de foto de perfil com crop client-side |
| `BackHeader` | Cabeçalho com botão voltar, usado nas páginas internas |
| `BookCover` | Capa do livro: imagem real ou gradiente + título quando sem `coverUrl` |
| `BookPicker` | Seletor de livro do catálogo (criar clube, listas, top 4) |
| `BottomSheet` | Sheet inferior modal (ex.: editor de tags na estante) |
| `DiscoverReaders` | "Descobrir leitores" — sugestões de quem seguir |
| `EmptyState` / `SeguindoEmptyState` | Estados vazios reais (feed sem follows, seção sem dado) |
| `ExpandableText` | Texto truncado com "Ler mais" (reviews longas) |
| `FeedPost` | Card de review no feed (avatar, nota, texto, curtir/comentar) |
| `FeedbackModal` | Formulário "Ajude a melhorar o Bookly" |
| `GoodreadsImport` | Upload + relatório do import de CSV |
| `NotificationBell` | Sino com contagem de não lidas (store local) |
| `RatingInput` / `Stars` | Seleção/exibição de nota em meia estrela |
| `ReadingGoalCard` | Anel de progresso + ritmo da meta de leitura anual |
| `SectionError` / `Skeleton` / `Spinner` / `PageLoader` | Estados de loading/erro por seção |
| `SocialLoginButtons` | Botões Google/Amazon em login/signup |
| `TabBar` | Navegação inferior (Início/Estante/Clube/Perfil) |
| `TagEditor` | Editor de tags por livro na estante |
| `ThemeSync` | Aplica `data-theme` no `<html>` a partir do store |
| `Toaster` | Toasts (~1,8s, reaproveita o mesmo nó DOM) |
| `TopNav` | Cabeçalho superior (desktop) |
| `VerificationModal` | Código de 6 dígitos (fluxo de e-mail, atrás da feature flag) |

---

# 8. VALIDAÇÕES E REGRAS

Validação de entrada é feita com **Zod** em cada rota (`src/app/api/**/route.ts`); não há uma camada central de DTO.

## 8.1 Usuário / Perfil

- `username`: único, case-insensitive (`citext`), validado por `src/lib/validators/username.ts`; checado em tempo real via `GET /api/users/check-username`
- `name`: 1–60 caracteres
- `bio`: até 500 caracteres
- `top4`: até 4 ids de `Book` existentes (rejeitado com 400 se algum id não existir no catálogo)
- `avatar`: índice inteiro em `AVATAR_CHOICES` (≥ 0)

## 8.2 Review / Avaliação

- `rating`: 0–5, múltiplo de 0,5 (meia estrela)
- `title`: até 150 caracteres, opcional
- `text`: até 5000 caracteres, opcional (review some do feed geral se vazia — mas a nota continua valendo)
- 1 review por usuário+livro (`@@unique([userId, bookId])`)

## 8.3 Clube

- `name`: 1–80 caracteres
- `desc`: até 500 caracteres, opcional
- `visibility`: `public` | `private`
- Código de convite: 6 caracteres, só clubes privados, único; regenerar/ver código é restrito ao criador (403 caso contrário)

## 8.4 Mensagem de Clube

- `text`: até 500 caracteres
- Só membro do clube pode postar (403 para não-membro)
- Rate limit dedicado (`chat`: 20/min)

## 8.5 Lista

- `name`: até 80 caracteres
- `visibility`: `public` | `private`
- Só o dono edita/exclui/altera visibilidade

## 8.6 Meta de Leitura

- `targetBooks`: inteiro entre 1 e 1000
- `year`: 2000–2100

## 8.7 Upload de Avatar

- Tipos aceitos: `image/jpeg`, `image/png`, `image/webp`
- Tamanho máximo: 5MB
- Redimensionado para 400×400 (cover) e reencodado em WebP no servidor (`sharp`), independentemente do formato de entrada

## 8.8 Senha (só com `NEXT_PUBLIC_EMAIL_LOGIN_ENABLED=true`)

- Mínimo 8 caracteres
- Senha atual precisa ser validada antes de trocar
- Nova senha precisa ser diferente da atual
- Hash com bcrypt

---

# 9. TRATAMENTO DE ERROS

## 9.1 HTTP Status Codes usados

- `400` — corpo/parâmetro inválido (falha de validação Zod)
- `401` — sem sessão (`session?.user?.id` ausente)
- `403` — autenticado mas sem permissão (ex.: não é criador do clube, não é membro)
- `404` — recurso não existe (livro, review, clube, código de convite)
- `409` — violação de unicidade (username em uso, `P2002` do Prisma)
- `429` — rate limit excedido (`Retry-After`, `X-RateLimit-*` nos headers)
- `502` — dependência externa falhou (Google Books inacessível/quota) — nunca mascarado como 404

## 9.2 Padrão por rota

Toda rota autenticada segue o mesmo formato: `auth()` → 401 se sem sessão → `checkRateLimit(key, uid)` quando é rota de escrita → `schema.safeParse(body)` → 400 se inválido → checagem de permissão específica (403/404) → operação no Prisma → resposta JSON. `src/lib/apiError.ts` centraliza a extração de mensagem de erro no client (`apiErrorMessage(res, fallback)`).

## 9.3 Rate Limiting

`src/lib/ratelimit.ts` (Upstash, sliding window) — **fail-open**: sem `UPSTASH_REDIS_REST_URL`/`TOKEN` configurado (dev) ou se o Redis cair (prod), a checagem não bloqueia, só loga um warning. Perder rate limit é considerado melhor que derrubar o app. Tiers: `write` (30/min), `upload` (5/min), `feedback` (4/min), `chat` (20/min), `import` (2/60min).

## 9.4 Frontend

- Cada seção que busca dado trata seu próprio estado de erro (`SectionError`, com botão de retry) — não há um error boundary genérico de app cobrindo tudo, mas `error.tsx`/`loading.tsx` do App Router cobrem cada rota.
- Toasts (`useStore().showToast`) para feedback de ações (sucesso/erro pontual).

---

# 10. STACK TÉCNICO

## 10.1 Aplicação

- **Framework:** Next.js 14 (App Router) + TypeScript estrito, um único projeto full-stack (não há backend separado)
- **Banco:** PostgreSQL (Neon em produção) + Prisma (`prisma-client`, adapter `@prisma/adapter-pg`)
- **Autenticação:** Auth.js v5 (`next-auth@beta`) — Google e Amazon OAuth (PrismaAdapter); Credentials + bcrypt existe atrás de feature flag
- **Estado client:** Zustand (`src/lib/store`) — só cache de sessão/perfil e UI transiente (tema, toast, notificações locais); tudo que é domínio (estante, reviews, feed, clubes, listas) vem de fetch para as rotas em `src/app/api/**`
- **CSS:** Tailwind CSS com tokens próprios (design system "leather/paper/ribbon/foil"), tema claro/escuro via CSS variables + `data-theme`
- **Fontes:** Fraunces (display) e Karla (texto), via `next/font/google`
- **Validação:** Zod em toda rota de API
- **Catálogo externo:** Google Books API (busca + enriquecimento de metadados)
- **Upload de imagem:** Vercel Blob + `sharp` (resize/reencode server-side) + `react-easy-crop` (crop client-side)
- **E-mail:** Resend (feedback; e verificação de e-mail quando `EMAIL_LOGIN_ENABLED`)
- **Rate limiting:** Upstash Redis (`@upstash/ratelimit`), fail-open
- **Import de dados:** `papaparse` (CSV do Goodreads)

## 10.2 Testes & CI

- **E2E:** Playwright (`e2e/*.spec.ts`, 6 arquivos / 35 testes — auth, books, clubs, social, users), cobrindo API + UI
- **Tipos/Lint:** `tsc --noEmit`, `next lint` (ESLint + `eslint-plugin-jsx-a11y`)
- **CI:** GitHub Actions (`.github/workflows/ci.yml`)
- **Guarda de regressão:** `npm run guard:no-seed` — falha se seed legado voltar (arquivo recriado, referência no build, ou usuário de seed no banco)

## 10.3 Deploy

- **Hosting:** Vercel — só a branch `main` gera deployment (`vercel.json` `ignoreCommand` bloqueia qualquer outra branch, incluindo `claude/*`)
- **Build:** `tsx scripts/resolve-stuck-migration.ts && prisma migrate deploy && next build` — migrations aplicadas automaticamente a cada deploy
- **Storage de imagem:** Vercel Blob

---

# 11. ARQUITETURA DE PASTAS

```
src/
  app/
    page.tsx                    landing (deslogado)
    login/ signup/               auth real (Google/Amazon OAuth; Credentials opcional)
    forgot-password/             reset de senha (só com login por e-mail habilitado)
    onboarding/                  1º acesso: username, nome, bio, gêneros
    (app)/                       rotas logadas (guard no middleware + layout + tab bar)
      home/  search/  book/[id]/  shelf/  lists/[id]/
      clubs/  clubs/new/  clubs/[id]/
      profile/  profile/edit/  u/[username]/  settings/  notifications/  review/[id]/
    api/                         rotas reais: auth, users, books, shelf, clubs, feed,
                                  lists, reviews, quotes, goals, import, verification,
                                  upload, feedback
  components/                    BookCover, Stars, RatingInput, FeedPost, Avatar,
                                  TabBar, AuthSync, GoodreadsImport, ReadingGoalCard…
  lib/
    db.ts                        singleton do Prisma Client
    auth.ts / auth.config.ts     config do Auth.js (config edge-safe separada do
                                  restante, que usa Node APIs/Prisma)
    books.ts / books/            getOrCreateBook, recomputeBookRating, integração
                                  Google Books
    clubs.ts                     geração de código, progresso médio do clube
    import/                      parser + resolução de livros do CSV do Goodreads
    store/                       store Zustand (cache de sessão/perfil + UI
                                  transiente + notificações client-only) e hooks
                                  derivados (useFeed, useMyStats, useBooksByIds…)
    ratelimit.ts                 tiers de rate limit (Upstash), fail-open
    featureFlags.ts               NEXT_PUBLIC_EMAIL_LOGIN_ENABLED
    genres.ts / avatars.ts        constantes de UI (gêneros do onboarding, gradientes)
    types.ts                      Book, ApiReview, Club, ShelfEntry, UserState…
    format.ts                     formatação pt-BR (vírgula decimal, milhar, progresso)
prisma/
  schema.prisma                  models reais (User, Book, ShelfEntry, Review, Club,
                                  Message…)
  migrations/                    histórico de migrations
scripts/
  purge-seed.ts                  utilitário pontual pra remover registros de seed
                                  legado do banco (dry-run por padrão, --apply)
  assert-no-seed.ts               guarda de regressão (npm run guard:no-seed, no CI)
  resolve-stuck-migration.ts      destrava `migrate deploy` se uma migração ficou
                                  "failed" em produção; no-op em banco novo/normal
e2e/                             suíte Playwright — 6 arquivos, 35 testes;
                                  e2e/global-setup.ts semeia só a fixture mínima de
                                  catálogo (duna/1984/verity) usada pelos testes
docs/VALIDATION_REPORT.md        relatório de validação do backend (histórico)
```

---

# 12. HISTÓRICO DE ENTREGAS & PRÓXIMOS PASSOS

A v1.0 deste documento descrevia um roadmap de 6 sprints sobre uma stack que nunca foi adotada (NestJS + React/Vite + Redux + Socket.io). O produto real foi entregue feature por feature diretamente em Next.js + Prisma, sem esse plano de sprints — a lista abaixo é retrospectiva, não prospectiva.

## 12.1 Já entregue (ordem aproximada)

1. Auth OAuth (Google/Amazon) + onboarding + guard de acesso
2. Perfil (identidade, bio, gêneros, top 4, avatar)
3. Catálogo sob demanda (Google Books) + estante + reviews + tags + citações
4. Feed social (curtidas, comentários, filtro Geral/Seguindo/Curtidas) + follow + listas
5. Clubes do livro (público/privado, código de convite, mural em chat, gerenciamento)
6. Metas de leitura anuais
7. Import de biblioteca via CSV do Goodreads
8. Upload de avatar real (Vercel Blob)
9. Rate limiting (Upstash) nas rotas de escrita
10. Limpeza de seed legado (migração one-time em produção) + guarda de regressão no CI

## 12.2 Próximos passos plausíveis (sem compromisso de prazo)

- Model de `Notification` no Prisma, com triggers reais nos eventos de like/comment/follow (hoje é só client-only)
- Mural de clube em tempo real (hoje é fetch/refresh, não WebSocket/SSE)
- Reações com emoji no chat
- Métricas de produto reais (hoje não há dashboard formal de KPIs)

---

# 13. ENDPOINTS DA API

Todas as rotas ficam em `src/app/api/**` (Next.js Route Handlers). Autenticação via sessão Auth.js (`auth()`); rotas sem sessão retornam `401`.

## 13.1 Auth

```
GET/POST /api/auth/[...nextauth]     Auth.js (OAuth callbacks, sessão)
POST     /api/auth/register          cadastro por e-mail/senha (feature flag)
POST     /api/auth/forgot            solicitar reset de senha (feature flag)
POST     /api/auth/reset             concluir reset de senha (feature flag)
```

## 13.2 Usuários

```
GET    /api/users/me                 perfil próprio (identidade + stats)
PATCH  /api/users/me                 atualizar perfil (username, nome, bio, avatar,
                                       top4, gêneros, progressUnit, onboarded)
POST   /api/users/me/password        trocar senha (feature flag; exige senha atual)
GET    /api/users/check-username     disponibilidade de username em tempo real
GET    /api/users/suggestions        "descobrir leitores" (até 6, exclui quem já sigo)
GET    /api/users/[username]         perfil público
GET    /api/users/[username]/reviews reviews públicas do usuário
GET    /api/users/[username]/followers
GET    /api/users/[username]/following
POST   /api/users/[username]/follow  seguir
DELETE /api/users/[username]/follow  deixar de seguir
```

## 13.3 Verificação de E-mail (feature flag)

```
POST /api/verification/email/send    envia código de 6 dígitos
POST /api/verification/email/verify  valida código
```

## 13.4 Livros

```
GET  /api/books               catálogo interno (busca por título/autor, ids=, sort=trending|top)
GET  /api/books/search        busca ao vivo no Google Books (pra adicionar ao catálogo)
GET  /api/books/[id]          detalhe (getOrCreateBook)
PUT  /api/books/[id]/shelf    status na estante (WANT_TO_READ/READING/READ)
PUT  /api/books/[id]/progress progresso de leitura (currentPage/lastPage)
PUT  /api/books/[id]/review   nota + review (rating <= 0 apaga)
GET  /api/books/[id]/reviews  reviews do livro
POST/DELETE /api/books/[id]/tags   tags do usuário no livro
GET/POST    /api/books/[id]/quotes citações do usuário no livro
DELETE      /api/quotes/[quoteId]
```

## 13.5 Reviews

```
GET  /api/reviews/[id]                   review por id (permalink)
POST/DELETE /api/reviews/[id]/like        curtir/descurtir
GET/POST    /api/reviews/[id]/comments    comentários
```

## 13.6 Feed & Estante

```
GET /api/feed?scope=all|following|liked    feed paginado por cursor
GET /api/shelf?status=&genre=&tag=&q=      estante do usuário logado
```

## 13.7 Listas

```
GET/POST     /api/lists                 minhas listas / criar
GET/PATCH/DELETE /api/lists/[id]         detalhe / editar (nome, visibilidade) / excluir
POST/DELETE  /api/lists/[id]/books       adicionar/remover livro
GET          /api/lists/community        listas públicas de todos (busca sem query)
```

## 13.8 Clubes

```
GET/POST     /api/clubs                        meus clubes + públicos / criar
GET/PATCH/DELETE /api/clubs/[id]               detalhe / editar (criador) / excluir (criador)
POST         /api/clubs/join                   entrar por código
POST         /api/clubs/[id]/join              entrar (público, sem código)
DELETE       /api/clubs/[id]/leave             sair
DELETE       /api/clubs/[id]/members/[userId]  remover membro (criador)
POST         /api/clubs/[id]/code/regenerate   regenerar código (criador, só privado)
GET/POST     /api/clubs/[id]/messages          mural: listar / postar mensagem
```

## 13.9 Metas de Leitura

```
GET/PUT/DELETE /api/goals/[year]   ver / definir / remover meta anual
```

## 13.10 Outros

```
POST /api/upload/avatar         upload de foto de perfil (Vercel Blob)
POST /api/import/goodreads      import de CSV do Goodreads
POST /api/feedback              formulário de feedback (Resend)
```

---

# 14. SCHEMA DO BANCO (PRISMA)

Fonte de verdade: `prisma/schema.prisma`. Reproduzido abaixo (sem os comentários `///` de cada campo — ver o arquivo original para o racional de cada um).

```prisma
generator client {
  provider        = "prisma-client"
  output          = "../src/generated/prisma"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  extensions = [citext]
}

model User {
  id            String       @id @default(cuid())
  email         String       @unique
  username      String?      @unique @db.Citext
  name          String
  passwordHash  String?
  emailVerified DateTime?
  bio           String?      @db.VarChar(500)
  avatar        Int          @default(0)
  avatarUrl     String?
  genres        String[]     @default([])
  top4          String[]     @default([])
  progressUnit  ProgressUnit @default(pages)
  onboarded     Boolean      @default(false)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  accounts Account[]
  sessions Session[]

  followedBy Follow[] @relation("following")
  following  Follow[] @relation("follower")

  shelfEntries ShelfEntry[]
  reviews      Review[]
  bookTags     BookTag[]
  quotes       Quote[]
  readingGoals ReadingGoal[]

  createdClubs Club[]       @relation("clubCreator")
  clubMembers  ClubMember[]
  messages     Message[]

  reviewLikes ReviewLike[]
  comments    Comment[]
  lists       List[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Follow {
  id            String   @id @default(cuid())
  followerId    String
  follower      User     @relation("follower", fields: [followerId], references: [id], onDelete: Cascade)
  followingId   String
  followingUser User     @relation("following", fields: [followingId], references: [id], onDelete: Cascade)
  createdAt     DateTime @default(now())

  @@unique([followerId, followingId])
  @@index([followingId])
}

model VerificationCode {
  id        String           @id @default(cuid())
  email     String
  code      String
  type      VerificationType
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime         @default(now())

  @@index([email, type])
}

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
  password
}

model Book {
  id           String   @id
  title        String
  authors      String
  year         Int
  pages        Int
  genre        String
  gradientFrom String
  gradientTo   String
  synopsis     String
  coverUrl     String?
  isbn         String?  @unique
  avg          Float    @default(0)
  count        Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  shelfEntries ShelfEntry[]
  reviews      Review[]
  tags         BookTag[]
  quotes       Quote[]
  clubs        Club[]
  listBooks    ListBook[]

  @@index([genre])
}

model ShelfEntry {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  bookId      String
  book        Book        @relation(fields: [bookId], references: [id], onDelete: Cascade)
  status      ShelfStatus
  currentPage Int?
  lastPage    Int?
  startedAt   DateTime?
  finishedAt  DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@unique([userId, bookId])
  @@index([bookId])
}

model ReadingGoal {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  year        Int
  targetBooks Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, year])
}

model Review {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  bookId     String
  book       Book      @relation(fields: [bookId], references: [id], onDelete: Cascade)
  rating     Float
  title      String?   @db.VarChar(150)
  text       String    @default("")
  startedAt  DateTime?
  finishedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  likes    ReviewLike[]
  comments Comment[]

  @@unique([userId, bookId])
  @@index([bookId, createdAt])
}

model ReviewLike {
  id        String   @id @default(cuid())
  reviewId  String
  review    Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([reviewId, userId])
}

model Comment {
  id        String   @id @default(cuid())
  reviewId  String
  review    Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  text      String   @db.VarChar(500)
  createdAt DateTime @default(now())

  @@index([reviewId, createdAt])
}

model List {
  id         String     @id @default(cuid())
  userId     String
  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  name       String     @db.VarChar(80)
  visibility Visibility @default(public)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  books ListBook[]
}

model ListBook {
  id        String   @id @default(cuid())
  listId    String
  list      List     @relation(fields: [listId], references: [id], onDelete: Cascade)
  bookId    String
  book      Book     @relation(fields: [bookId], references: [id], onDelete: Cascade)
  order     Int
  createdAt DateTime @default(now())

  @@unique([listId, bookId])
  @@index([listId, order])
}

model BookTag {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  bookId String
  book   Book   @relation(fields: [bookId], references: [id], onDelete: Cascade)
  tag    String

  @@unique([userId, bookId, tag])
  @@index([userId, tag])
}

model Quote {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  bookId    String
  book      Book     @relation(fields: [bookId], references: [id], onDelete: Cascade)
  text      String
  page      Int?
  createdAt DateTime @default(now())

  @@index([userId, bookId])
}

model Club {
  id         String     @id @default(cuid())
  name       String     @db.VarChar(80)
  desc       String     @default("") @db.VarChar(500)
  visibility Visibility
  code       String?    @unique
  bookId     String
  book       Book       @relation(fields: [bookId], references: [id])
  creatorId  String
  creator    User       @relation("clubCreator", fields: [creatorId], references: [id], onDelete: Cascade)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  members  ClubMember[]
  messages Message[]
}

model ClubMember {
  id       String   @id @default(cuid())
  clubId   String
  club     Club     @relation(fields: [clubId], references: [id], onDelete: Cascade)
  userId   String
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role     String   @default("member")
  progress Int?
  joinedAt DateTime @default(now())

  @@unique([clubId, userId])
  @@index([userId])
}

model Message {
  id        String    @id @default(cuid())
  clubId    String
  club      Club      @relation(fields: [clubId], references: [id], onDelete: Cascade)
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  text      String    @db.VarChar(500)
  system    Boolean   @default(false)
  replyToId String?
  replyTo   Message?  @relation("messageReplies", fields: [replyToId], references: [id], onDelete: SetNull)
  replies   Message[] @relation("messageReplies")
  createdAt DateTime  @default(now())

  @@index([clubId, createdAt])
}
```

---

# 15. ENVIRONMENT VARIABLES

Fonte de verdade: `.env.example` na raiz do repo. Resumo:

```env
# Postgres (Neon em produção)
DATABASE_URL=""
DIRECT_URL=""            # conexão direta, sem pooler — só pro Prisma Migrate

# Auth.js
AUTH_SECRET=""            # npx auth secret
AUTH_URL="http://localhost:3000"

# OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
AMAZON_CLIENT_ID=""
AMAZON_CLIENT_SECRET=""

# Login por e-mail/senha (desligado por padrão)
NEXT_PUBLIC_EMAIL_LOGIN_ENABLED="false"

# E-mail transacional (verificação de e-mail, quando habilitado acima)
# SENDGRID_API_KEY=""
# MAIL_FROM=""

# Catálogo
GOOGLE_BOOKS_API_KEY=""

# Upload de avatar (Vercel Blob — injetado automaticamente em produção quando
# o Blob store está linkado ao projeto; em dev, pegar em Storage → Blob ou
# `vercel env pull`)
BLOB_READ_WRITE_TOKEN=""

# Feedback (Resend)
RESEND_API_KEY=""
FEEDBACK_TO_EMAIL=""

# Metadata/OG
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Rate limiting (Upstash) — sem essas duas vars, fail-open (libera tudo, só loga)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

Não há `.env` "sem configuração" viável: banco, `AUTH_SECRET` e ao menos um provider OAuth são obrigatórios para rodar localmente.

---

# 16. RISCOS & MITIGAÇÃO

| Risco | Impacto | Mitigação |
|---|---|---|
| Seed legado remanescente em produção (pré-migração) | Alto | Migração one-time `purge_seed_data` + guarda `guard:no-seed` no CI (só enxerga banco de teste — checagem de produção é manual, `guard:no-seed:prod`) |
| Rate limit fail-open sem Redis configurado | Médio | Aceito conscientemente (perder rate limit é melhor que derrubar o app); monitorar warnings de "sem Redis em produção" |
| Cota do Google Books estourada | Médio | `getOrCreateBook` cacheia por 30 dias; import do Goodreads limita a 200 lookups por execução |
| Migração falha em produção sem acesso interativo ao banco | Alto | `scripts/resolve-stuck-migration.ts` roda antes de todo `migrate deploy`; trata banco novo (primeira migração de todas) como no-op |
| Conflito de conta entre providers OAuth (mesmo e-mail em Google e Amazon) | Médio | `allowDangerousEmailAccountLinking: true` em ambos — aceito porque ambos já verificam o e-mail no próprio fluxo OAuth |
| Vercel Blob sem token configurado localmente | Baixo | Documentado em `.env.example`; upload falha com 502 claro, não silenciosamente |
| CSV do Goodreads malformado/gigante no import | Baixo | Limite de 5MB, parser tolerante (`papaparse`), relatório final expõe linhas puladas |

---

# 17. DEFINIÇÃO DE PRONTO (DoD)

## Checklist por mudança

- [ ] `npx tsc --noEmit` limpo
- [ ] `npm run lint` limpo
- [ ] `npm run build` limpo (inclui `prisma migrate deploy` contra um banco de teste)
- [ ] `npm run guard:no-seed` verde
- [ ] Suíte Playwright (`npx playwright test`) verde — sem quebrar fluxo existente
- [ ] Sem `console.log` de debug esquecido
- [ ] Sem secret hardcoded (usar `.env`)
- [ ] Testado manualmente na UI (não só tipo/lint/build) quando a mudança afeta uma tela
- [ ] Responsivo em mobile (viewport 390px é o alvo primário; desktop é secundário)
- [ ] Acessibilidade básica (labels, `aria-*`, navegação por teclado nos componentes tocados)

---

**Versão:** 2.0
**Substitui:** v1.0 (2024-07-20, especificação pré-implementação com stack nunca adotada)
**Próxima revisão:** quando o schema, os endpoints ou a stack mudarem de forma relevante — manter este documento como espelho do código, não como plano à parte dele.
