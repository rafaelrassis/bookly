# Status — backlog de agosto/2026 (fechamento)

Consolidação de tudo decidido nesta rodada de specs. Não é spec de código — é referência, pra não depender de garimpar a conversa depois.

---

## O que foi construído

**Estante:** progresso por página/%, metas de leitura anual, estatísticas do ano, status DNF, releituras como evento (`ReadingEvent`), card de estante compartilhável (OG image).

**Doação:** raio de proximidade (geocoding + Haversine), pontos de encontro (cadastro aberto, moderação leve), autocomplete de cidades via IBGE.

**Feed:** stream unificado (`FeedEvent`, hub de 5+ pontos de escrita), reações rápidas, citações/highlights com card Stories em Fraunces.

**Clube:** livro do mês, buddy read, discussão travada por progresso (spoiler-safe), streaks semanais (sem ranking), atividade do clube no feed.

**Reputação:** Wrapped anual, recomendações por co-ocorrência, selo de recebedor (espelha o selo de doador que já existia).

**Correções:** 3 bugs de clube (card vazado, status errado no CTA, bookId errado no buddy read), seletor de livro redundante na criação do clube, retificação do selo de recebedor pra não duplicar o `trust-badge.ts` real.

**Infra de teste:** Vitest não existia no projeto — configurado, com cobertura real de `computeWeeklyStreak`/`formatStreak` (12 testes, virada de ano incluída).

**Adiado, não descartado:** troca de livros (bidirecional) — aguardando dado de uso real da doação antes de retomar.

---

## Decisões de arquitetura que valem lembrar

- **`FeedEvent` como hub único do feed** — nenhuma feature nova que gera conteúdo do usuário deve ficar de fora dele. Checklist pra qualquer feature futura: "isso precisa aparecer no feed? se sim, chama `recordFeedEvent`."
- **`ReadingEvent` é o log append-only de conclusões de leitura** — metas e estatísticas contam por aqui, não por `ShelfEntry.finishedAt` direto. Reler um livro gera evento novo, não sobrescreve o anterior.
- **Padrão de card visual (Fraunces + `ImageResponse`)** estabelecido uma vez (card de estante) e reaproveitado 3x (citações, Wrapped, e disponível pra qualquer OG futuro) — `loadFraunces()` é o ponto único de carregamento de fonte.
- **Tudo que pode ser derivado, é derivado** — progresso, estatísticas, metas, recomendações. Exceção deliberada: contadores de doação/recebimento (`donationsCount`, `confirmedCount`) são persistidos, porque foi assim que a spec original de doação decidiu, e selo de recebedor seguiu o mesmo padrão pra não misturar os dois estilos.
- **Seção 0 (pré-condições) evitou pelo menos 2 problemas reais**: o campo `Book.genre` é singular, não array como eu tinha assumido, e foi adaptado corretamente; e a spec de selos digitais que eu tinha escrito errado foi pega antes de rodar.

---

## Pendências reais, não resolvidas por código

1. **Confirmar se o backfill de `ReadingEvent` rodou em produção** — o script existe em `scripts/backfill-reading-events.ts`, mas rodar ou já ter rodado é outra coisa; só verificável via SQL direto contra o banco de produção (sem acesso a partir daqui):
```sql
SELECT count(*) FROM "ReadingEvent";
SELECT count(*) FROM "ShelfEntry" WHERE status='READ' AND "finishedAt" IS NOT NULL;
```
Se os números não baterem, metas/estatísticas de leituras antigas estão incompletas.

2. ~~`npm run type-check`/`npm run lint` completos~~ — **verificado nesta sessão**: `npm install` + `npm run type-check` + `npm run lint` + `npm test` rodam limpos (0 erros de tipo, 0 warnings de lint, 12/12 testes passando). O bloqueio anterior era só falta de `node_modules` no ambiente, não um problema real de código.

3. **Cobertura de teste ainda é só streak** — outras funções puras que valeriam teste (`isoWeekStart`, cálculo de Haversine, `groupNotifications`) não foram testadas. Não fiz isso agora por não ter sido pedido, só documentando o gap.

---

## Recomendação honesta pra depois deste documento

Backlog de feature está fechado. **O gargalo agora não é mais código — é gente usando.** Doação, pontos de encontro, recomendações e Wrapped sofrem de cold-start; nenhum deles fica bom sem volume real de uso. Continuar gerando spec sem isso é polir uma casa vazia.

Se a prioridade virar aquisição/ativação de usuário, esse é outro tipo de trabalho — não é mais spec-driven development de feature, é produto/growth. Só sinalizando a virada de fase, não estou especificando isso agora porque não foi pedido.
