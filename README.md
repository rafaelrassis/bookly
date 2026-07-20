# bookly.

Web app de avaliação e review de livros — um "Letterboxd de livros".

**Protótipo v3 (dados mocados):** todo o frontend com estado em memória — sem banco, sem auth real, sem API externa. **Os dados não persistem após refresh**; isso é esperado nesta fase.

Principais features (v2 + v3):

- Feed social com curtidas, comentários e filtro Geral/Seguindo
- Progresso de leitura na página do livro com unidade **Páginas | %** e datas de leitura ("Leu de 12 jul a 20 jul") nas reviews; a home lista **todas** as leituras atuais
- Tags, citações e avaliação com meia estrela por livro
- Estante com filtros compostos (status/gênero/tag) e **listas** públicas/privadas (as públicas aparecem no perfil)
- **Clubes do livro** públicos e privados (código de convite de 6 caracteres), criação de clube e mural em formato de **chat** com respostas citadas, menções `@` e mensagens de sistema de progresso
- Perfil com histograma de notas, favoritos editáveis, faixa de estatísticas e **edição de perfil** (username, foto, bio, top 4)
- **Configurações** com conta mocada, troca de senha fake e **tema claro/escuro** funcional (tokens em CSS variables)

## Rodando

```bash
npm install
npm run dev
```

Abre em [http://localhost:3000](http://localhost:3000). Não precisa de variáveis de ambiente.

## Stack

- Next.js 14 (App Router) + TypeScript estrito
- Tailwind CSS com tokens próprios do design system
- Fontes: Fraunces (marca, títulos de livro, números) e Karla (todo o resto) via `next/font/google`
- **Zustand** — store único mocado em `src/lib/store`

## Estrutura

```
src/
  app/              rotas (App Router)
    page.tsx        landing (deslogado)
    login/          login fake
    onboarding/     nome, username, bio e gêneros
    (app)/          rotas logadas (guard + tab bar)
      home/  search/  book/[id]/  shelf/  lists/[id]/
      clubs/  clubs/new/  clubs/[id]/  profile/  profile/edit/  settings/
  components/       BookCover, Stars, RatingInput, FeedPost, Avatar, TabBar…
  data/             seed mocado: books, feed, users, community, clubs
  lib/
    store/          store zustand + hooks derivados (useShelf, useBook, useMyStats…)
    types.ts        Book, FeedReview, Club, ShelfEntry, UserState…
    format.ts       formatação pt-BR (vírgula decimal, milhar, progresso)
```

## Fase futura

O mock será trocado por NextAuth + Postgres/Prisma + Google Books API. Todo acesso a dados passa pelo store e pelos hooks em `src/lib/store`, então a troca fica localizada, mantendo os mesmos nomes de campos (`status`, `currentPage`, `rating`…).
