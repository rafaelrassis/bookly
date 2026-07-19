---
name: verify
description: Build, run and drive the bookly frontend to verify changes end-to-end.
---

# Verificando o bookly

App Next.js 14 (App Router), frontend com dados mocados — estado em memória,
sem env vars.

## Build e execução

```bash
npm run build          # inclui lint + type-check; deve passar limpo
npm run start          # serve o build em http://localhost:3000
# se a porta 3000 estiver ocupada: mate o next-server antigo antes
```

`npm run dev` também funciona, mas o build de produção pega erros que o dev
mode esconde (ex.: batching de state updates do React).

## Dirigindo a UI

Use Playwright com o Chromium pré-instalado do ambiente
(`executablePath: "/opt/pw-browsers/chromium"`, viewport 390×844).
Fluxo completo a exercitar:

1. Landing `/` → "Criar conta grátis" → `/login` → "Continuar com Google" → `/onboarding`
2. Onboarding pré-preenchido (Marina Souza / mari.leituras) → "Começar a ler ✦" → `/home`
3. Home: card de leitura atual mostra "62% · pág. 408 de 656"
4. `/search`: sem query lista 8 livros; filtro por título/autor; termo inexistente mostra empty state
5. `/book/[id]`: chips de status (toggle + toast), estrelas (toque = nota cheia,
   2º toque na mesma = meia, 3º remove; avaliar marca como Lido), review inline com "(você)"
6. `/shelf` e `/profile` refletem as mudanças (estatísticas recalculadas, vírgula decimal)
7. "Sair" volta à landing; rotas logadas sem sessão redirecionam para `/`

Capture erros/avisos do console do navegador — o critério de aceite é zero.

## Pegadinhas

- O estado NÃO persiste após refresh — isso é esperado na Fase A, não é bug.
- O guard de rotas roda no cliente: `page.goto` direto numa rota logada sempre
  redireciona para `/` (estado em memória se perde). Navegue pela UI.
