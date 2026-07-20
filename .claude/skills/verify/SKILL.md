---
name: verify
description: Build, run and drive the bookly frontend to verify changes end-to-end.
---

# Verificando o bookly

App Next.js 14 (App Router), frontend com dados mocados — estado em memória
(Zustand), sem env vars.

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
Fluxo completo a exercitar:

1. Landing `/` → login fake → `/onboarding` (nome/username/bio pré-preenchidos) → `/home`
2. Home: card de leitura com fita marcadora, "62% · pág. 408 de 656" e delta
   "+34 pág."; "Atualizar progresso" valida 0..pages e mostra toast "+N páginas! 📖"
3. Feed: toggle Geral (6 posts) / Seguindo (3); curtir altera contador e fica
   `ribbon`; comentar publica como @mari.leituras na thread inline
4. `/search` (via barra da home): sem query mostra Recomendados + Listas da
   comunidade; com query filtra; termo inexistente → empty state
5. `/book/[id]`: chips de status, meia estrela no 2º toque, review "(você)",
   tags com ✕ e citações (borda dourada, Fraunces itálico)
6. `/shelf`: busca + filtros de status/gênero/tag compõem entre si; contador "N livros"
7. `/clubs`: Seus clubes / Descubra; participar/sair alterna com toast; mural
   só aceita post participando
8. `/profile`: 128 seguidores · 87 seguindo, favoritos (top4), stats
   lidos/páginas/reviews, histograma com barra(s) máxima(s) em foil, abas
   Últimas avaliações / Reviews / Curtidas — tudo derivado do estado da sessão
9. "Sair" volta à landing

Capture erros/avisos do console — o critério de aceite é zero.

## Pegadinhas

- Estado NÃO persiste após refresh — esperado (mock em memória), não é bug.
- Guard roda no cliente: `page.goto` direto em rota logada redireciona para `/`.
  Navegue pela UI.
- Seletores Playwright com acentos (ê etc.) podem falhar por normalização
  Unicode — prefira regex sem o caractere acentuado (ex.: `/@pedro_l/`).
