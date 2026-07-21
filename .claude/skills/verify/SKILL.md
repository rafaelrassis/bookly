---
name: verify
description: Build, run and drive the bookly frontend to verify changes end-to-end.
---

# Verificando o bookly

App Next.js 14 (App Router), frontend com dados mocados — estado em memória
(Zustand), sem env vars. Tema claro/escuro via CSS variables + `data-theme`.

## Build e execução

```bash
npm run build          # inclui lint + type-check; deve passar limpo
npm run start          # serve o build em http://localhost:3000
```

Se a porta 3000 estiver ocupada, mate o `next-server` antigo pelo PID
(`ps aux | grep 'next-serve[r]'`) — cuidado: `pkill -f` pode matar o próprio
shell se o padrão aparecer na linha de comando.

`npm run dev` também funciona, mas o build de produção pega erros que o dev
mode esconde (ex.: batching de state updates do React).

## Dirigindo a UI

Use Playwright com o Chromium pré-instalado
(`executablePath: "/opt/pw-browsers/chromium"`, viewport 390×844).
Fluxo completo a exercitar (v3):

1. Landing `/` → login fake → `/onboarding` → `/home`
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
8. `/settings`: alterar senha (mock, valida preenchimento/igualdade), toggle
   de tema aplica a paleta clara em toda a UI, "Sair da conta" só aqui

Capture erros/avisos do console — o critério de aceite é zero.

## Pegadinhas

- Estado persiste via `localStorage` (`zustand/persist`, chave `bookly-v5`) —
  sobrevive a refresh. Para resetar ao seed: botão "Limpar dados de
  demonstração" em Configurações, ou `localStorage.clear()` + reload. Logout
  também reseta `user`, `followedUsers` e `notifications` ao seed.
- Guard roda no cliente: `page.goto` direto em rota logada redireciona para `/`.
  Navegue pela UI.
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
