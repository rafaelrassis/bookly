# Spec — Busca por ISBN

**Status:** 📝 Proposta (não implementada)
**Origem:** comparação competitiva com o app Livrim (concorrente direto, "app.livrim" na Play Store) — ficha oficial da loja anuncia "Buscar livros por título, autor(a) ou ISBN" como funcionalidade própria; o Bookly não trata ISBN de forma dedicada hoje.

---

## 1. Contexto / estado atual (validado no código)

- `GET /api/books/search` (`src/app/api/books/search/route.ts`) repassa o parâmetro `q` cru para `searchGoogleBooks` (`src/lib/books/google.ts:91`), que monta a URL como `?q=<texto>&maxResults=20&country=US`.
- A Google Books API suporta o qualificador `isbn:<código>` para casar exatamente pelo ISBN (10 ou 13 dígitos). Hoje o Bookly nunca usa esse qualificador — um ISBN digitado cai numa busca textual genérica, que costuma funcionar mas não é garantida (edições com poucos metadados, ISBN-13 vs ISBN-10, etc.) e não prioriza o match exato.
- A UI de busca (`src/app/(app)/search/page.tsx`) tem `placeholder="Título ou autor…"` e `aria-label="Buscar livros por título ou autor"` — não comunica ao usuário que ISBN também funciona.
- Não há validação/normalização de entrada (hífens, espaços) em lugar nenhum do fluxo de busca.

## 2. Objetivo

Fazer da busca por ISBN um caminho **de primeira classe**: detectar quando a query é um ISBN, montar a busca com o qualificador exato do Google Books, e comunicar isso na UI — paridade direta com o diferencial anunciado pelo Livrim.

## 3. Proposta funcional

1. Usuário cola/digita um ISBN-10 ou ISBN-13 (com ou sem hífens/espaços) no campo de busca existente — **não** um campo separado.
2. O backend detecta o padrão de ISBN, normaliza (remove hífens/espaços) e busca com `isbn:<código>` no Google Books, em vez de busca textual livre.
3. Se a busca por `isbn:` não retornar nada (ISBN não indexado), cai de volta pra busca textual normal com a mesma string — sem tela de erro nem passo extra pro usuário.
4. Placeholder e `aria-label` do campo passam a mencionar ISBN.

## 4. Mudanças técnicas

### 4.1 `src/lib/books/google.ts`

- Nova função `isIsbn(q: string): string | null` — normaliza (`replace(/[-\s]/g, "")`) e valida contra `/^(97[89]\d{10}|\d{9}[\dXx])$/` (ISBN-13 com prefixo 978/979, ou ISBN-10 com dígito verificador `X` permitido); retorna o código normalizado ou `null`.
- `searchGoogleBooks(q)` passa a:
  1. Chamar `isIsbn(q)`; se der match, buscar primeiro com `isbn:<normalizado>`.
  2. Se essa busca vier vazia (`items` ausente/vazio), refazer a chamada com `q` original (comportamento atual) como fallback — mesma função, sem endpoint novo.
  3. Se não for ISBN, comportamento inalterado.

### 4.2 `src/app/(app)/search/page.tsx`

- `placeholder`: `"Título, autor ou ISBN…"`
- `aria-label`: `"Buscar livros por título, autor ou ISBN"`

### 4.3 `src/app/api/books/search/route.ts`

- Sem mudança de contrato (mesma rota, mesmo shape de resposta) — a detecção fica encapsulada em `searchGoogleBooks`.

## 5. Casos de borda

| Entrada | Comportamento esperado |
|---|---|
| `9788533302273` (ISBN-13 válido) | Busca `isbn:9788533302273` |
| `978-85-333-0227-3` (com hífens) | Normaliza e busca igual ao caso acima |
| `85-333-0227-X` (ISBN-10 com X) | Normaliza (`X` maiúsculo) e busca `isbn:85333022 7X`-like válido |
| `123` (número curto, não-ISBN) | Não casa no regex → busca textual normal, sem chamada extra |
| ISBN válido mas não indexado no Google Books | Fallback silencioso pra busca textual com a mesma string |
| Texto normal ("Duna") | Comportamento 100% inalterado |

## 6. Fora de escopo

- Scanner de código de barras (câmera) — Livrim também não anuncia isso; fica como possível v2 separada.
- Campo de busca dedicado só para ISBN.
- Validação de dígito verificador do ISBN (checksum) — o regex é só um filtro de formato, não uma validação matemática completa; falso positivo aqui só custa uma chamada extra à API que já cai no fallback.

## 7. Testes

- Unit: `isIsbn()` com ISBN-13 puro, com hífens, ISBN-10 com `X`, string não-ISBN, string vazia.
- Integração (mock do fetch para Google Books): query ISBN retorna via `isbn:`; query ISBN sem resultado cai no fallback textual; query não-ISBN nunca chama `isbn:`.
- E2E (Playwright, `e2e/books.spec.ts` se existir um fluxo de busca): digitar um ISBN conhecido do catálogo de fixture e confirmar que o livro aparece nos resultados.

## 8. Definição de pronto

- [ ] `isIsbn()` implementada e testada isoladamente
- [ ] `searchGoogleBooks()` tenta `isbn:` antes do fallback textual
- [ ] Placeholder/aria-label atualizados
- [ ] Sem mudança de contrato em `/api/books/search`
- [ ] Testes unitários + pelo menos 1 E2E cobrindo busca por ISBN
