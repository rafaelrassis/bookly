---
name: verify
description: Build, run and drive the bookly frontend to verify changes end-to-end.
---

# Verificando o bookly

App Next.js 14 (App Router) com backend real: Postgres/Prisma + NextAuth
(Credentials). Precisa de `DATABASE_URL`/`AUTH_SECRET` (copie `.env.example`
pra `.env`) e de um Postgres rodando **antes** de buildar/testar. Tema
claro/escuro via CSS variables + `data-theme`. Notificações são o único
domínio ainda mocado (store local, sem tabela).

## Banco, build e execução

```bash
# Postgres precisa estar de pé (ex.: pg_ctlcluster 16 main start) e a
# DATABASE_URL do .env apontando pra ele antes de qualquer passo abaixo.
npx prisma migrate deploy  # aplica as migrations em prisma/migrations
npm run db:seed            # popula livros, comunidade e o usuário @demo (demo@bookly.dev / bookly123)
npm run build               # inclui lint + type-check; deve passar limpo
npm run start                # serve o build em http://localhost:3000
```

Se a porta 3000 estiver ocupada, mate o `next-server` antigo pelo PID
(`ps aux | grep 'next-serve[r]'`) — cuidado: `pkill -f` pode matar o próprio
shell se o padrão aparecer na linha de comando.

`npm run dev` também funciona, mas o build de produção pega erros que o dev
mode esconde (ex.: batching de state updates do React).

## Dirigindo a UI

Use Playwright com o Chromium pré-instalado
(`executablePath: "/opt/pw-browsers/chromium"`, viewport 390×844). Também dá
pra rodar a suíte existente direto: `npx playwright test` (44 specs em
`e2e/*.spec.ts`, cobrindo auth, books, clubs, social e users via API + UI).

Fluxo completo a exercitar manualmente:

1. Landing `/` → signup (cria conta real via `/api/auth/register` + login
   NextAuth) → `/onboarding` (grava perfil via `/api/users/me`) → `/home`
2. Home lista **todas** as leituras atuais (≥2 no seed), sem botão de progresso
3. `/book/[id]` com status Lendo: seção "Seu progresso" com toggle Páginas | %,
   valida limites e mostra delta; review com "(você)" exibe datas de leitura
4. `/clubs`: seções Públicos/Privados, código de 6 chars visível a membros de
   clube privado, criar clube, entrar com código (válido e inválido)
5. `/clubs/[id]`: mural em chat (bolhas próprias à direita), responder com
   citação, menção `@` destacada, mensagem de sistema ao atualizar progresso
   de um livro lido em clube
6. `/shelf`: seção "Minhas listas" (criar, pública/privada); `/lists/[id]`
   adiciona/remove livros e alterna visibilidade
7. `/profile`: engrenagem → `/settings`; "Editar perfil" → `/profile/edit`;
   listas públicas aparecem, privadas não; sem botão Sair
8. `/settings`: alterar senha (real, exige senha atual correta via
   `/api/users/me/password`), toggle de tema aplica a paleta clara em toda a
   UI, "Sair da conta" só aqui

Capture erros/avisos do console — o critério de aceite é zero.

## Pegadinhas

- Estado agora persiste no Postgres (é esperado sobreviver a refresh **e** a
  restart do processo). Pra resetar, é preciso mexer no banco (ex.: recriar
  o DB e rodar `npx prisma migrate deploy && npm run db:seed`) — não existe
  mais um botão de "Limpar dados de demonstração" que reseta tudo pro seed;
  troca de senha/perfil grava de verdade. Notificações continuam só no
  store local (sem tabela), então essas sim resetam com `localStorage.clear()`.
- Guard roda no `src/middleware.ts` (server-side, via NextAuth): `page.goto`
  direto numa rota protegida sem sessão já chega redirecionado pra `/login`
  antes de qualquer JS client rodar — não precisa mais navegar pela UI só
  pra respeitar o guard, mas o teste deve esperar sessão real (login/signup)
  antes de acessar rotas do grupo `(app)`.
- Após navegação client-side (clique em `nav`), aguarde `waitForURL` ou um
  seletor da página antes de ler `body`/contar elementos — senão o teste lê o
  DOM anterior e reporta falso negativo.
- Toasts duram ~1,8s e reaproveitam o mesmo nó DOM: se você disparar duas
  ações em sequência rápida, o toast lido pode ser o da ação anterior. Dê uma
  pequena espera ou cheque com margem antes de reclicar.
- Seletores `button:has-text("X")` combinam com qualquer botão cujo texto
  contenha X como substring (ex.: "Entrar com código" casa com "Entrar") —
  prefira seletores mais específicos (`input[aria-label=...] + button`).
- Seletores Playwright com acentos (ê etc.) podem falhar por normalização
  Unicode — prefira regex sem o caractere acentuado (ex.: `/@pedro_l/`).
