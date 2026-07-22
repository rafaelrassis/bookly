# Patch 2 — reconciliar Spec 0 e Spec V com o seed real

**Contexto:** a validação expôs que Spec 0 e Spec V medem contra um alvo que mudou — o `INITIAL_USER` (Marina) virou placeholder pré-login, o seed agora materializa só os 6 community users, e `avg`/`count` nascem de recompute (Patch 1a), não de números decorativos. Sem reconciliar, toda validação futura reporta "não passa literalmente" por **design**, não por bug — ruído que esconde regressões reais.

Aqui vão as **edições** nas duas specs existentes (não é spec nova). Aplique como substituição de trecho.

---

## Spec 0 — edições

### E1. Seção "Plano de seed" — trocar o passo 2 (Marina) por demo

**De** (passo 2 original, "Usuário Marina"):
> **Usuário Marina** (`INITIAL_USER`) → cria `User` com `passwordHash`... shelf/ratings/reviews/tags/quotes/lists.

**Para:**
> **Community users (6)** de `src/data/users` → `User` reais com `passwordHash` dev; suas reviews (`FEED_REVIEWS`) + comments + likes. São a fonte do feed.
>
> **Usuário demo (`@demo`)** — conta logável de dev/QA (`demo@bookly.dev` / `bookly123`, `emailVerified`). Recebe estante (1 READING + 1 READ), 1 review, 1 clube público (como criador) e 1 mensagem. **Não** é a Marina: o `INITIAL_USER` do store é apenas placeholder de UI pré-login e **não** é semeado.

### E2. Seção "Plano de seed" — passo 1 (books) explicitar o recompute

Acrescentar ao passo 1:
> `avg`/`count` entram como **0** e são **recalculados no passo final** a partir dos `Review` semeados (fórmula da Spec 3a). Os números decorativos de `src/data/books.ts` são **ignorados** no seed — não representam dados reais.

Passo 6 ("Recalcular cache") deixa de ser opcional: é o passo que dá verdade a `avg`/`count`.

### E3. Enums — nota de confirmação

Na seção do schema, após os `enum`:
> Os quatro enums são **enums Postgres reais** (não texto+Zod). `ShelfStatus` já nasceu assim; `Visibility`/`ProgressUnit`/`VerificationType` foram migrados no Patch 1c. Validação passa a existir no banco, não só na API.

### E4. Definition of Done — ajustar a linha da Marina

**De:**
> - [ ] `npx prisma studio` mostra Marina com estante, reviews, listas e ao menos 1 clube com mensagens.

**Para:**
> - [ ] `npx prisma studio` mostra `@demo` logável com estante (1 READING + 1 READ), 1 review, e 1 clube público com mensagem.
> - [ ] Os 6 community users existem com suas reviews (fonte do feed).
> - [ ] Nenhum registro "Marina/INITIAL_USER" foi semeado (é placeholder de UI).

---

## Spec V — edições

### V1. Seção 0 "Integridade do seed" — reescrever os checks de Marina

**Substituir** o bloco de checks que cita Marina por:

```
Integridade do seed
- [ ] @demo existe, logável (demo@bookly.dev / bookly123), emailVerified setado, passwordHash bcrypt (não texto).
- [ ] Estante de @demo = 2 entries (1 READING com currentPage, 1 READ com finishedAt).
- [ ] @demo tem 1 review (duna) e 1 clube público onde é creator, com ≥1 mensagem.
- [ ] Os 6 community users existem; suas reviews (FEED_REVIEWS) materializadas com comments/likes.
- [ ] NENHUM usuário "Marina/INITIAL_USER" no banco (placeholder de UI, não semeado).
- [ ] Todo @username citado no feed/comentários existe como User (sem FK órfã).
- [ ] Para cada livro: avg = média real dos Review.rating; count = nº de reviews (query abaixo = 0 linhas).
```

### V2. Seção 0 — nota sobre o recompute

Antes da query SQL de consistência, acrescentar:
> `avg`/`count` **não** vêm de `src/data/books.ts` (números decorativos, ignorados). Nascem do recompute no fim do seed (Patch 1a). A query abaixo é o teste-verdade dessa etapa — foi ela que pegou o bug original (`verity`: seeded 4/21458 vs real 3.50/1).

### V3. Cross-cutting — enums viram check de banco

**De:**
> - [ ] IDs: livro = slug; demais = cuid...

**Adicionar depois:**
> - [ ] **Enums no banco:** `ShelfStatus`, `Visibility`, `ProgressUnit`, `VerificationType` existem como tipos Postgres (`\dT+`). Inserir valor inválido via SQL cru é **rejeitado pelo banco**, não só pelo Zod. (regressão do Patch 1c)

### V4. Smoke E2E — ajustar passos que assumiam Marina

- **Passo 2** ("seguir a Marina; conferir stats dela") → **"seguir `@demo`; conferir `following=1` e as stats de `@demo`"**.
- **Passo 5** ("curtir a review da Marina") → **"curtir uma review de um community user"**.
- **Passo 8** (mensagem de sistema): agora **funciona de fato**, porque `@demo` tem clube semeado. Manter, mas notar: o registrante do passo 1 precisa **entrar** no clube de `@demo` (público) antes de atualizar progresso do livro-tema.

### V5. Relatório de saída — sem mudança de formato

O formato do relatório continua igual; só as legendas dos checks 0 mudam. O `VALIDATION_REPORT.md` já gerado deve ser **regerado** após o Patch 1, e os ⚠️/❌ da Seção 0 (que eram "não passa literalmente por falta de Marina") devem **sumir** — se persistirem, é bug real, não desalinhamento de spec.

---

## Como aplicar

Como não enxergo o conteúdo atual dos seus `SPEC-0`/`SPEC-V` no repo (posso ter divergido da sua versão local), duas opções:

1. **Você aplica** os trechos acima manualmente — são substituições localizadas.
2. **Me manda** os dois arquivos atuais (ou cola aqui) e eu devolvo a versão final já reconciliada, pronta pra commit.

Recomendo a 2 — evita que a spec no repo e a minha divirjam em pontos que não estou vendo.

---

## Checklist de fechamento do item 2

- [ ] Spec 0: seed demo documentado, recompute explícito, enums confirmados, DoD sem Marina.
- [ ] Spec V: checks 0 reescritos pra `@demo`/community, nota do recompute, enum como check de banco, smoke ajustado.
- [ ] `VALIDATION_REPORT.md` regerado após Patch 1 → Seção 0 verde, sem "não passa por design".
- [ ] Confirmado: qualquer ❌ restante é bug, não desalinhamento.

Fechado isto, sobra o **item 3 do plano: Spec 5 — Integração frontend** (trocar os hooks do store por fetch, tela a tela).
