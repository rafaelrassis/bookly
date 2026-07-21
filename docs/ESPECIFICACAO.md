# 📚 BOOKLY - Especificação Completa & Unificada

**Versão:** 1.0  
**Data:** 2024-07-20  
**Status:** 🟢 Pronto para Desenvolvimento  
**Timeline:** 12 semanas (4 sprints de 2-3 semanas)

---

## 📑 ÍNDICE

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura do Produto](#2-arquitetura-do-produto)
3. [Especificações Funcionais Detalhadas](#3-especificações-funcionais-detalhadas)
4. [Mocks e Wireframes](#4-mocks-e-wireframes)
5. [Modelos de Dados](#5-modelos-de-dados)
6. [Fluxos de Negócio](#6-fluxos-de-negócio)
7. [Componentes UI](#7-componentes-ui)
8. [Validações e Regras](#8-validações-e-regras)
9. [Tratamento de Erros](#9-tratamento-de-erros)
10. [Stack Técnico](#10-stack-técnico)
11. [Arquitetura de Pastas](#11-arquitetura-de-pastas)
12. [Roadmap & Sprints](#12-roadmap--sprints)
13. [Endpoints da API](#13-endpoints-da-api)
14. [Schema do Banco (Prisma)](#14-schema-do-banco-prisma)
15. [Environment Variables](#15-environment-variables)
16. [Métricas & KPIs](#16-métricas--kpis)
17. [Riscos & Mitigação](#17-riscos--mitigação)

---

# 1. VISÃO GERAL

## 1.1 Sobre o Produto

**Bookly** é uma plataforma social de comunidades de leitura que conecta leitores através de clubes de livros, avaliações e discussões em tempo real.

**Objetivo Principal:** Criar um espaço onde leitores possam descobrir novos livros, compartilhar opiniões, acompanhar seu progresso de leitura e formar comunidades ao redor de obras literárias.

## 1.2 Público Alvo

- Leitores casual (18-65 anos)
- Fãs de livros em geral
- Pessoas interessadas em comunidades online
- Usuários que querem acompanhar leitura em grupo

## 1.3 Principais Funcionalidades (MVP)

1. ✅ Autenticação completa (login, signup, password reset)
2. ✅ Perfil de usuário (foto, bio, dados pessoais)
3. ✅ Verificação de email (código 6 dígitos)
4. ✅ Página de livro (informações + ratings agregados)
5. ✅ Sistema de reviews (avaliações com ratings e datas)
6. ✅ Clubes de leitura (criação, gerenciamento, membros)
7. ✅ Chat em tempo real (WebSocket com scroll)
8. ✅ Gerenciamento de clube (apenas criador)
9. ✅ Código de acesso privado (para clubes privados)
10. ✅ Configurações de conta (email, senha)

## 1.4 Não Incluído no MVP

- ❌ Telefone (será adicionado em atualização rápida - Sprint 2)
- ❌ Notificações push
- ❌ Reações no chat
- ❌ Integração Goodreads
- ❌ App mobile nativo
- ❌ Recomendações com IA
- ❌ Badges/Gamificação

---

# 2. ARQUITETURA DO PRODUTO

## 2.1 Mapa de Páginas

```
├── Home (Não Logado) - Landing page pública
├── Login - Autenticação
├── Signup - Registro
├── Home (Logado) - Dashboard
├── Perfil do Usuário - Visualizar perfil
├── Editar Perfil - Atualizar dados + foto
├── Página do Livro - Detalhes + reviews
├── Página do Livro / Adicionar Review - Modal/Page para nova avaliação
├── Clube Específico - Visualizar clube + chat + membros
├── Clube Criado (Gerenciamento) - Painel de admin do criador
└── Configuração - Settings (email, telefone, senha)
```

## 2.2 Fluxo de Usuário Principal

```
Home (não logado)
    ↓
Login / Signup
    ↓
Home (logado)
    ├─→ Buscar Livro
    │    ├─→ Página do Livro
    │    │    ├─→ Adicionar Review
    │    │    └─→ Ver Reviews
    │    └─→ Criar Clube
    │
    ├─→ Meus Clubes
    │    ├─→ Clube Específico
    │    │    ├─→ Chat (enviar msgs)
    │    │    └─→ Ver Membros
    │    └─→ Gerenciar Clube (se criador)
    │         ├─→ Editar dados
    │         ├─→ Remover membros
    │         └─→ Ver código de acesso
    │
    └─→ Perfil
         ├─→ Editar Perfil
         │    └─→ Upload de Foto
         └─→ Configurações
              ├─→ Alterar Email (com verificação)
              ├─→ Adicionar Telefone (com verificação)
              └─→ Alterar Senha (com verificação)
```

---

# 3. ESPECIFICAÇÕES FUNCIONAIS DETALHADAS

## 3.1 PÁGINA DO LIVRO & ADICIONAR REVIEW

### 3.1.1 Exibição de Informações do Livro

**Localização na página:**
- Capa do livro (lado esquerdo ou topo)
- Informações básicas (título, autor, ano)
- ⭐ **Média de avaliações** (ex: 4.5) - À ESQUERDA junto aos outros textos
- 📊 **Número total de avaliações** (ex: 247 avaliações) - À ESQUERDA
- Descrição
- Gênero(s)
- Botões: "Comece a Ler", "Ler Amostra", "Comprar"

**Exemplo:**
```
┌─────────────┐  ┌──────────────────────────┐
│   [Capa]    │  │ Dom Casmurro             │
│             │  │ Machado de Assis         │
│             │  │ ⭐ 4.5 (247 reviews)     │ ← Média e nº à esquerda
│             │  │ Romance Brasileiro       │
│             │  │ Publicado em 1899        │
│             │  │ 📖 Descrição...          │
│             │  │ [Comece a Ler]           │
│             │  │ [Ler Amostra]            │
│             │  │ [Comprar]                │
└─────────────┘  └──────────────────────────┘
```

### 3.1.2 Visualização de Reviews

**Features:**
- Reviews exibidas como cards abaixo do livro
- Cada review mostra: Avatar do usuário, nome, rating (⭐), texto truncado
- **Clicar na review abre visualização completa** (modal ou página dedicada)
- Reviews longas podem ser truncadas (ex: 3 linhas max, depois "Ler Mais")

**Informações da review:**
- ⭐ Rating (1-5 estrelas)
- Nome e avatar do autor
- Data de início da leitura (ex: "Leu de 01/06/2024")
- Data de término da leitura (ex: "até 15/07/2024")
- Texto da avaliação
- Botões: "Ler Mais", "👍 12", "💬 3"

**Exemplo card:**
```
┌────────────────────────────────────────┐
│ Sofia ⭐⭐⭐⭐⭐                          │
│ "Uma obra-prima! A escrita é poética  │
│  e a trama é envolvente. Leia!"       │
│ [Ler Mais]  👍 12  💬 3               │
│ Leu de 01/06 até 15/07/2024           │
└────────────────────────────────────────┘
```

### 3.1.3 Adicionar Review (Modal/Form)

**Campos obrigatórios:**
1. **Classificação** (1-5 estrelas - interativo, clicar para alterar)
2. **Título** (opcional, max 150 caracteres)
3. **Conteúdo de texto** (obrigatório, 10-5000 caracteres)

**Campos adicionais:**
4. **Data de Início da Leitura** (data picker)
5. **Data de Término da Leitura** (data picker)
6. **Contém Spoiler** (checkbox)
7. **Apenas para meus amigos** (checkbox - privacidade)

**Validações:**
- Rating: 1-5 obrigatório
- Conteúdo: 10-5000 caracteres
- Data fim >= Data início
- Mostrar contador de caracteres em tempo real

**Botões:** Cancelar | Publicar

---

## 3.2 PÁGINA DE CONFIGURAÇÃO

### 3.2.1 Gerenciamento de Email

**Fluxo:**
1. Usuário está na página de Configurações
2. Vê campo: "Email Atual: sofia@email.com ✓"
3. Clica em "Alterar Email"
4. Abre modal com:
   - Campo: Email Atual (read-only)
   - Campo: Novo Email (input)
   - Botão: "Continuar"
5. Após clicar "Continuar":
   - Sistema envia código para o NOVO email
   - Modal muda para: "Verificar Email"
   - Campo: Código (6 dígitos)
   - Opção: "Reenviar (30s)"
6. Usuário insere código
7. Email é atualizado ✓

**Validações:**
- Novo email válido (RFC 5322)
- Novo email único no sistema
- Código correto (TTL: 15 minutos)

**Feedback:**
- "Email atualizado com sucesso"
- "Código expirado. Solicite um novo."
- "Código inválido"

### 3.2.2 Gerenciamento de Telefone

**Fluxo (se usuário não tem telefone):**
1. Seção "TELEFONE" mostra "Nenhum telefone registrado"
2. Clica "Adicionar Telefone"
3. Modal abre com:
   - Seletor de país (padrão: Brasil +55)
   - Campo: Número de telefone
   - Botão: "Continuar"
4. Após clicar "Continuar":
   - Sistema envia código via SMS
   - Modal muda para: "Verificar Telefone"
   - Campo: Código (6 dígitos)
   - Opção: "Reenviar (30s)"
5. Usuário insere código
6. Telefone é registrado ✓

**Validações:**
- Formato correto (Brasil: +55 11 98765-4321)
- Telefone único no sistema
- Código correto (TTL: 15 minutos)

### 3.2.3 Gerenciamento de Senha

**Fluxo:**
1. Clica "Alterar Senha"
2. Modal abre com:
   - Campo: Senha Atual (input password)
   - Campo: Nova Senha
   - Campo: Confirmar Nova Senha
   - Requisitos visíveis em tempo real:
     * ☐ Mínimo 8 caracteres
     * ☐ Pelo menos 1 MAIÚSCULA
     * ☐ Pelo menos 1 minúscula
     * ☐ Pelo menos 1 número
     * ☐ Pelo menos 1 caractere especial (@#$%&)
3. Após preencher:
   - Sistema envia link/código de verificação para email
   - Usuário clica no link ou insere código
4. Após verificação:
   - Senha é atualizada
   - Usuário é desconectado (logout de todas as sessões)

**Validações:**
- Senha atual correta
- Nova senha diferente da anterior
- Confirma quer atender todos os requisitos
- Senhas correspondem

---

## 3.3 PÁGINA DO CLUBE ESPECÍFICO

### 3.3.1 Visualização de Membros

**Layout:**
- Mostra primeiros 3-4 membros com avatar, nome, status
- Botão: "+ X outros membros"

**Ao clicar em "+ X outros membros":**
- Abre modal/drawer com lista completa
- Para cada membro exibir:
  * Avatar
  * Nome
  * Status: "✓ Finalizou em 15/07" ou "◐ 45% completado"
  * Última atividade (ex: "online agora" ou "online há 2h")

**Ordenação:** Membros ativos primeiro

### 3.3.2 Chat do Clube

**Comportamento CRÍTICO:**
- ⚠️ O chat NÃO deve expandir a tela com a quantidade de mensagens
- ⚠️ Deve ter SCROLL vertical com altura máxima fixa
- Altura máxima: 400px (mobile) ou 600px (desktop)
- Overflow: auto (mostrar scroll bar)

**Funcionalidades:**
- Exibir últimas 50 mensagens por padrão
- Scroll up carrega mensagens mais antigas (lazy load)
- Cada mensagem mostra:
  * Avatar + Nome do usuário
  * Conteúdo do texto
  * Hora/data (no hover)
  * Número de reações (futuro)

**Input de mensagem:**
- Campo de texto expandível (max 500 caracteres)
- Botão: "Enviar" ou Enter key
- Mostrar indicador "escrevendo..." quando outro usuário está digitando

---

## 3.4 PÁGINA DO CLUBE CRIADO (GERENCIAMENTO)

### 3.4.1 Permissões do Criador

**O criador pode:**
- ✓ Editar nome do clube
- ✓ Editar livro lido/seleção de livros futuros
- ✓ Editar bio/descrição do clube
- ✓ Listar todos os membros
- ✓ Remover membros do clube
- ✓ Ver código de acesso (se privado)
- ✓ Regenerar código de acesso

**Membros normais:**
- ✓ Ver informações do clube
- ✓ Enviar mensagens no chat
- ✓ Adicionar reviews do livro lido
- ✗ Editar dados do clube
- ✗ Remover outros membros
- ✗ Ver código de acesso

### 3.4.2 Código de Acesso para Clubes Privados

**Apenas para clubes com `isPrivate: true`**

**Visibilidade:**
- SOMENTE o criador pode ver o código
- Membros não veem o código

**Formato:**
- Código aleatório de 8 caracteres (ex: A7K3M9Z2)
- Gerado automaticamente ao criar clube privado

**Componentes:**
1. Campo de exibição do código (read-only com background especial)
2. Botão "Copiar Código" (copia para clipboard)
3. Botão "Regenerar Código" (com confirmação)

**Regenerar:**
- Ao clicar "Regenerar":
  * Modal de confirmação aparece
  * "⚠️ O código atual não funcionará mais"
  * "Membros existentes não serão afetados"
  * Botões: "Cancelar" | "Regenerar"
- Após confirmar:
  * Novo código é gerado
  * Código anterior é invalidado
  * Toast: "Novo código: K2N8P5Q3"

### 3.4.3 Painel de Gerenciamento (Layout)

```
┌─────────────────────────────────────────────┐
│ ⚙️ GERENCIAR CLUBE                          │
├─────────────────────────────────────────────┤
│                                             │
│ Nome do Clube:                             │
│ ┌──────────────────────────────────────┐   │
│ │ Dom Casmurro Lovers                  │   │
│ └──────────────────────────────────────┘   │
│ [Salvar]                                   │
│                                             │
│ ─────────────────────────────────────────  │
│                                             │
│ Livro:                                     │
│ ┌──────────────────────────────────────┐   │
│ │ Dom Casmurro - Machado [x]           │   │
│ └──────────────────────────────────────┘   │
│ [Salvar]                                   │
│                                             │
│ ─────────────────────────────────────────  │
│                                             │
│ Bio/Descrição:                             │
│ ┌──────────────────────────────────────┐   │
│ │ Clube para leitores que amam...     │   │
│ │ (234 / 500)                         │   │
│ └──────────────────────────────────────┘   │
│ [Salvar]                                   │
│                                             │
│ ─────────────────────────────────────────  │
│                                             │
│ Tipo de Clube:                             │
│ ○ Público   ● Privado                     │
│                                             │
│ ─────────────────────────────────────────  │
│                                             │
│ CÓDIGO DE ACESSO (PRIVADO)                 │
│ A7K3M9Z2  [Copiar] [Regenerar]            │
│                                             │
│ ─────────────────────────────────────────  │
│                                             │
│ MEMBROS (15)                               │
│ ┌──────────────────────────────────────┐   │
│ │ Sofia (criador)       [Remover]     │   │
│ │ João                  [Remover]     │   │
│ │ Maria                 [Remover]     │   │
│ │ ... (mais 12)                        │   │
│ └──────────────────────────────────────┘   │
│                                             │
│ [Excluir Clube]  [Voltar]                  │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 3.5 EDITAR PERFIL

### 3.5.1 Upload de Foto de Perfil

**Layout:**
- Avatar atual (200x200px, com fallback de iniciais)
- Botão: "Alterar Foto"

**Fluxo de upload:**
1. Usuário clica "Alterar Foto"
2. Abre file picker (ou clica direto na foto)
3. Seleciona imagem (JPG, PNG, GIF)
4. Preview da imagem é mostrado em modal
5. Dimensões esperadas: 200x200px (redimencionaremos)
6. Tamanho máximo: 5MB
7. Botões: "Cancelar" | "Confirmar"
8. Após confirmar:
   - Upload para AWS S3/Cloud Storage
   - Thumbnail 200x200px é gerado
   - Perfil é atualizado
   - Toast: "Foto de perfil atualizada!"

**Validações:**
- Tipos aceitos: JPG, PNG, GIF, WebP
- Tamanho máximo: 5MB
- Gerar thumbnail quadrado 200x200px

### 3.5.2 Outros Campos Editáveis

```
Nome Completo:
┌──────────────────────────────────────┐
│ Sofia Mendoza                        │
└──────────────────────────────────────┘

Nome de Usuário:
┌──────────────────────────────────────┐
│ sofiam.reads                         │
└──────────────────────────────────────┘
(verificar unicidade em tempo real)

Bio (até 500 caracteres):
┌──────────────────────────────────────┐
│ Leitora de ficção científica e       │
│ mystery. Sempre buscando novas       │
│ histórias!                           │
│ 78 / 500                             │
└──────────────────────────────────────┘

Cidade:
┌──────────────────────────────────────┐
│ São Paulo, SP              [↓]       │
└──────────────────────────────────────┘
(auto-complete com lista de cidades)

Livro Favorito:
┌──────────────────────────────────────┐
│ O Cortiço                            │
└──────────────────────────────────────┘

Gêneros Favoritos:
☑ Romance   ☑ Ficção Científica
☐ Mistério  ☑ Histórico

☑ Perfil Público

[Cancelar]  [Salvar Alterações]
```

---

## 3.6 PÁGINA DE LOGIN

### 3.6.1 Placeholders com Referências Literárias

**REMOVER:** Textos sugeridos pré-preenchidos (auto-complete)
**IMPLEMENTAR:** Placeholders com nomes fantasmas (referências literárias)

**Exemplos de Placeholders:**
- Email input: "capitu@biblioteca.com"
- Username input: "Frankenstein" ou "Alice" ou "Sherlock"
- Password: deixar vazio (apenas mostrar dots)

**Referências Literárias Sugeridas:**
- Capitu (Dom Casmurro - Machado)
- Frankenstein (Frankenstein - Mary Shelley)
- Elizabeth (Cumberlandm - Cronenberg)
- Jane (Jane Eyre - Brontë)
- Heathcliff (Wuthering Heights - Brontë)
- Alice (Alice in Wonderland - Carroll)
- Sherlock (Sherlock Holmes - Conan Doyle)
- Gatsby (The Great Gatsby - Fitzgerald)

### 3.6.2 Ícones de Botões

**REMOVER:** Ícones/símbolos dos botões
- ❌ Remover ícone do botão "Começar a Ler"
- ❌ Remover ícones similares de outros botões do app
- ✅ Manter apenas texto simples ou usar ícones muito sutis

### 3.6.3 Layout da Página

```
┌──────────────────────────────────────┐
│   ENTRAR NA SUA CONTA                │
├──────────────────────────────────────┤
│                                      │
│ Email ou Usuário:                   │
│ ┌──────────────────────────────────┐ │
│ │ capitu                           │ │ ← Placeholder
│ └──────────────────────────────────┘ │
│                                      │
│ Senha:                              │
│ ┌──────────────────────────────────┐ │
│ │ ••••••••••                       │ │
│ └──────────────────────────────────┘ │
│                                      │
│ [Entrar]                            │
│                                      │
│ Não tem conta? [Criar Conta]        │
│ [Esqueci minha senha]               │
│                                      │
└──────────────────────────────────────┘
```

**Validações:**
- Email/Username: não vazio
- Senha: não vazio
- Feedback: "Credenciais inválidas" (genérico por segurança)

---

## 3.7 HOME NÃO LOGADA

### 3.7.1 Hero Section

```
┌──────────────────────────────────────┐
│ Bem-vindo a Bookly                  │
│ Comunidades de Leitura              │
│                                      │
│ Conecte-se com outros leitores,     │
│ descubra novos livros e forme       │
│ comunidades ao seu redor.            │
│                                      │
│ [Comece a Ler Agora] [Explorar]     │
└──────────────────────────────────────┘
```

### 3.7.2 Blocos de Apresentação (Alterar Títulos)

**Atual (ruim):**
- "Encontre Leitores" ❌
- "Avalie Livros" ❌
- "Faça Amigos" ❌

**Novo (bom):**
- "Descubra Comunidades" ✅
- "Leia e Avalie" ✅
- "Conecte-se com Leitores" ✅

**Layout:**

```
┌──────────────────────────────────────────┐
│                                          │
│  BLOCO 1: Descubra Comunidades          │
│  ┌────────────────────────────────────┐ │
│  │ Encontre clubes de leitura sobre  │ │
│  │ seus livros favoritos             │ │
│  │ [Explorar Clubes]                 │ │
│  └────────────────────────────────────┘ │
│                                          │
│  BLOCO 2: Leia e Avalie                 │
│  ┌────────────────────────────────────┐ │
│  │ Compartilhe suas opiniões sobre   │ │
│  │ livros e veja o que outros        │ │
│  │ leitores acham                    │ │
│  │ [Começar a Ler]                   │ │
│  └────────────────────────────────────┘ │
│                                          │
│  BLOCO 3: Conecte-se com Leitores       │
│  ┌────────────────────────────────────┐ │
│  │ Faça amizade com pessoas que      │ │
│  │ compartilham seus interesses      │ │
│  │ literários                        │ │
│  │ [Ver Leitores]                    │ │
│  └────────────────────────────────────┘ │
│                                          │
└──────────────────────────────────────────┘
```

---

# 4. MOCKS E WIREFRAMES

## 4.1 HOME NÃO LOGADA (Desktop)

```
┌─────────────────────────────────────────────┐
│         BOOKLY - Comunidades de Leitura    │
├─────────────────────────────────────────────┤
│                                             │
│    ┌───────────────────────────────────┐   │
│    │ Bem-vindo a Bookly                │   │
│    │ Conecte-se com outros leitores    │   │
│    │ [Comece a Ler Agora]  [Explorar]  │   │
│    └───────────────────────────────────┘   │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Descubra  │  │ Leia e   │  │Conecte-  │  │
│  │Comunidades│  │ Avalie  │  │se com... │  │
│  │[>]       │  │[>]       │  │[>]       │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ DEPOIMENTOS / ESTATÍSTICAS           │  │
│  │ "Adorei encontrar outros fãs do...  │  │
│  │  Agora lemos juntos!" - Maria       │  │
│  └──────────────────────────────────────┘  │
│                                             │
│                                             │
│                     [Footer]                │
│                                             │
└─────────────────────────────────────────────┘
```

## 4.2 PÁGINA DE LOGIN

```
┌──────────────────────────────────────────────┐
│                                              │
│           ENTRAR NA SUA CONTA                │
│                                              │
│  Email ou Usuário:                          │
│  ┌──────────────────────────────────────┐   │
│  │ Capitu                               │   │ ← Placeholder
│  └──────────────────────────────────────┘   │
│                                              │
│  Senha:                                     │
│  ┌──────────────────────────────────────┐   │
│  │ ••••••••••                           │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  [Entrar]                                   │
│                                              │
│  Não tem conta? [Criar Conta]               │
│  [Esqueci minha senha]                      │
│                                              │
└──────────────────────────────────────────────┘
```

## 4.3 HOME LOGADA

```
┌──────────────────────────────────────────────┐
│ Bookly        🔍  👤  ⚙️                     │
├──────────────────────────────────────────────┤
│                                              │
│ Olá, Sofia! 👋                               │
│                                              │
│ SEÇÃO 1: Meus Clubes                        │
│ ┌──────────────────────────────────────────┐│
│ │ 📚 Clube de Mystery  [Ver +]             ││
│ │ 5 membros, lendo: "Código Da Vinci"      ││
│ │ Progresso: 45%                            ││
│ └──────────────────────────────────────────┘│
│                                              │
│ SEÇÃO 2: Livros em Leitura                  │
│ ┌───────┐  ┌───────┐  ┌───────┐            │
│ │ Livro │  │ Livro │  │ Livro │            │
│ │ 1     │  │ 2     │  │ 3     │            │
│ │ 35%   │  │ 62%   │  │ 89%   │            │
│ └───────┘  └───────┘  └───────┘            │
│                                              │
│ SEÇÃO 3: Feed de Reviews                    │
│ ┌──────────────────────────────────────────┐│
│ │ João ⭐⭐⭐⭐⭐ "Livro Incrível!"          ││
│ │ "Não consegui parar de ler"               ││
│ │ em 15/07/2024                             ││
│ └──────────────────────────────────────────┘│
│                                              │
└──────────────────────────────────────────────┘
```

## 4.4 PÁGINA DO LIVRO

```
┌──────────────────────────────────────────────┐
│ ← BOOKLY        🔍  👤  ⚙️                  │
├──────────────────────────────────────────────┤
│                                              │
│ ┌─────────────┐  ┌──────────────────────┐   │
│ │   [Capa]    │  │ Dom Casmurro         │   │
│ │             │  │ Machado de Assis     │   │
│ │             │  │                      │   │
│ │ ⭐⭐⭐⭐⭐    │  │ ⭐ 4.5 (247 reviews) │   │ ← À esquerda
│ │ (247)       │  │                      │   │
│ │             │  │ Romance Brasileiro   │   │
│ │ [Adicionar  │  │ Publicado em 1899    │   │
│ │  ao Club]   │  │                      │   │
│ │             │  │ 📖 Descrição...      │   │
│ │             │  │                      │   │
│ │             │  │ [Comece a Ler]       │   │
│ │             │  │ [Ler Amostra]        │   │
│ │             │  │ [Comprar]            │   │
│ └─────────────┘  └──────────────────────┘   │
│                                              │
│ AVALIAÇÕES                                   │
│ ┌──────────────────────────────────────────┐│
│ │ Sofia ⭐⭐⭐⭐⭐                           ││
│ │ "Uma obra-prima! A escrita é poética    ││
│ │  e a trama é envolvente. Leia!"         ││
│ │ [Ler Mais]  👍 12  💬 3                   ││
│ │ Leu de 01/06 até 15/07/2024              ││
│ └──────────────────────────────────────────┘│
│                                              │
│ ┌──────────────────────────────────────────┐│
│ │ Bruno ⭐⭐⭐⭐                            ││
│ │ "Bom livro, recomendo aos fãs de..." ││
│ │ [Ler Mais]  👍 5  💬 1                    ││
│ │ Leu de 20/06 até 10/07/2024              ││
│ └──────────────────────────────────────────┘│
│                                              │
│ [Adicionar Minha Avaliação]                  │
│                                              │
└──────────────────────────────────────────────┘
```

### 4.4.1 Modal - Adicionar Review

```
┌──────────────────────────────────────────────┐
│ Sua Avaliação - Dom Casmurro              X  │
├──────────────────────────────────────────────┤
│                                              │
│ Classificação: ⭐⭐⭐⭐⭐                    │
│ (Clique para mudar)                         │
│                                              │
│ Título (opcional):                          │
│ ┌──────────────────────────────────────────┐│
│ │ Uma obra-prima de Machado                │
│ └──────────────────────────────────────────┘│
│                                              │
│ Sua Avaliação:                              │
│ ┌──────────────────────────────────────────┐│
│ │ A escrita é poética e hipnotizante...   │
│ │                                          │
│ │ (min: 10 caracteres, max: 5000)         │
│ └──────────────────────────────────────────┘│
│ Caracteres: 156 / 5000                      │
│                                              │
│ Data de Início:                             │
│ ┌──────────────────────────────────────────┐│
│ │ 01/06/2024  [📅]                        │
│ └──────────────────────────────────────────┘│
│                                              │
│ Data de Término:                            │
│ ┌──────────────────────────────────────────┐│
│ │ 15/07/2024  [📅]                        │
│ └──────────────────────────────────────────┘│
│                                              │
│ ☐ Contém Spoiler                            │
│ ☐ Apenas para meus amigos (privada)        │
│                                              │
│        [Cancelar]    [Publicar]              │
│                                              │
└──────────────────────────────────────────────┘
```

## 4.5 PÁGINA DE EDITAR PERFIL

```
┌──────────────────────────────────────────────┐
│ ← Meu Perfil                          [✓]   │
├──────────────────────────────────────────────┤
│                                              │
│              [Foto do Perfil]                │
│            ┌────────────────────┐            │
│            │   [Avatar 200x200]  │            │
│            └────────────────────┘            │
│              [Alterar Foto]                  │
│                                              │
│ Nome Completo:                              │
│ ┌──────────────────────────────────────────┐│
│ │ Sofia Mendoza                            │
│ └──────────────────────────────────────────┘│
│                                              │
│ Nome de Usuário:                            │
│ ┌──────────────────────────────────────────┐│
│ │ sofiam.reads                             │
│ └──────────────────────────────────────────┘│
│                                              │
│ Bio (até 500 caracteres):                   │
│ ┌──────────────────────────────────────────┐│
│ │ Leitora de ficção científica e mystery   │
│ │ Sempre buscando novas histórias!          │
│ │ 78 / 500                                  │
│ └──────────────────────────────────────────┘│
│                                              │
│ Cidade:                                     │
│ ┌──────────────────────────────────────────┐│
│ │ São Paulo, SP              [↓]           │
│ └──────────────────────────────────────────┘│
│                                              │
│ Livro Favorito:                             │
│ ┌──────────────────────────────────────────┐│
│ │ O Cortiço                                │
│ └──────────────────────────────────────────┘│
│                                              │
│ Gêneros Favoritos:                          │
│ ☑ Romance   ☑ Ficção Científica            │
│ ☐ Mistério  ☑ Histórico                     │
│                                              │
│ ☑ Perfil Público                            │
│                                              │
│        [Cancelar]    [Salvar Alterações]    │
│                                              │
└──────────────────────────────────────────────┘
```

### 4.5.1 Modal - Upload de Foto

```
┌──────────────────────────────────────────────┐
│ Alterar Foto de Perfil                    X  │
├──────────────────────────────────────────────┤
│                                              │
│ Selecione uma imagem:                       │
│ [Escolher Arquivo] (JPG, PNG, GIF)          │
│                                              │
│ ┌──────────────────────────────────────────┐│
│ │ Preview da Imagem                        │
│ │ ┌────────────────────────────────────┐   │
│ │ │   [Foto Selecionada]               │   │
│ │ │   200x200 pixels                   │   │
│ │ └────────────────────────────────────┘   │
│ └──────────────────────────────────────────┘│
│                                              │
│ Tamanho: 2.3 MB / 5 MB máximo                │
│ Status: ✅ Pronto para enviar                │
│                                              │
│        [Cancelar]    [Enviar Foto]          │
│                                              │
└──────────────────────────────────────────────┘
```

## 4.6 PÁGINA DE CONFIGURAÇÃO

### 4.6.1 Tab - Conta

```
┌──────────────────────────────────────────────┐
│ ← Configurações         [Conta] [Segurança]  │
├──────────────────────────────────────────────┤
│                                              │
│ EMAIL                                        │
│ Email atual: sofia@email.com ✓              │
│                                              │
│ ┌──────────────────────────────────────────┐│
│ │ sofiam@newemail.com                      │
│ │ [Verificado] ou [Não verificado]         │
│ └──────────────────────────────────────────┘│
│ [Alterar Email]                             │
│                                              │
│ ─────────────────────────────────────────── │
│                                              │
│ TELEFONE                                     │
│ Nenhum telefone registrado                  │
│                                              │
│ ┌──────────────────────────────────────────┐│
│ │ +55 11 98765-4321         [×]            │
│ │ Verificado em 15/07/2024                 │
│ └──────────────────────────────────────────┘│
│ [Adicionar Telefone]                        │
│                                              │
│ ─────────────────────────────────────────── │
│                                              │
│ SESSÕES ATIVAS                               │
│ ✓ Chrome - São Paulo, SP - 2h atrás        │
│ ✓ Safari - São Paulo, SP - 1h atrás        │
│ [Encerrar todas as sessões]                 │
│                                              │
└──────────────────────────────────────────────┘
```

### 4.6.2 Modal - Alterar Email (Passo 1)

```
┌──────────────────────────────────────────────┐
│ Alterar Email                              X  │
├──────────────────────────────────────────────┤
│                                              │
│ Email Atual:                                │
│ sofia@email.com                             │
│                                              │
│ Novo Email:                                 │
│ ┌──────────────────────────────────────────┐│
│ │ sofiam@newemail.com                      │
│ └──────────────────────────────────────────┘│
│                                              │
│        [Cancelar]    [Continuar]            │
│                                              │
└──────────────────────────────────────────────┘
```

### 4.6.3 Modal - Verificar Email (Passo 2)

```
┌──────────────────────────────────────────────┐
│ Verificar Email                            X  │
├──────────────────────────────────────────────┤
│                                              │
│ Enviamos um código de verificação para:     │
│ sofiam@newemail.com                         │
│                                              │
│ Código (6 dígitos):                         │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│ │ 1   │ │ 2   │ │ 3   │ │ 4   │ │ 5   │   │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘   │
│ ┌─────┐                                    │
│ │ 6   │                                    │
│ └─────┘                                    │
│                                              │
│ Não recebeu? [Reenviar (30s)]               │
│                                              │
│        [Cancelar]    [Verificar]            │
│                                              │
└──────────────────────────────────────────────┘
```

### 4.6.4 Tab - Segurança

```
┌──────────────────────────────────────────────┐
│ ← Configurações         [Conta] [Segurança]  │
├──────────────────────────────────────────────┤
│                                              │
│ SENHA                                        │
│ Última mudança: 45 dias atrás                │
│ [Alterar Senha]                             │
│                                              │
│ ─────────────────────────────────────────── │
│                                              │
│ AUTENTICAÇÃO DE DOIS FATORES                │
│ Status: Desativada                          │
│ [Ativar 2FA]                                │
│                                              │
│ ─────────────────────────────────────────── │
│                                              │
│ DISPOSITIVOS CONFIÁVEIS                     │
│ ✓ Laptop Dell (Chrome)                      │
│ ✓ iPhone (Safari)                           │
│ [Gerenciar]                                 │
│                                              │
│ ─────────────────────────────────────────── │
│                                              │
│ PRIVACIDADE                                 │
│ ☑ Perfil visível para outros leitores      │
│ ☑ Reviews visíveis publicamente             │
│ ☐ Adicionar em buscas (indexar)            │
│                                              │
└──────────────────────────────────────────────┘
```

### 4.6.5 Modal - Alterar Senha

```
┌──────────────────────────────────────────────┐
│ Alterar Senha                              X  │
├──────────────────────────────────────────────┤
│                                              │
│ Senha Atual:                                │
│ ┌──────────────────────────────────────────┐│
│ │ ••••••••••                               │
│ └──────────────────────────────────────────┘│
│                                              │
│ Nova Senha:                                 │
│ ┌──────────────────────────────────────────┐│
│ │                                          │
│ └──────────────────────────────────────────┘│
│ Requisitos:                                 │
│ ☐ Mínimo 8 caracteres                      │
│ ☐ Pelo menos 1 MAIÚSCULA                   │
│ ☐ Pelo menos 1 minúscula                   │
│ ☐ Pelo menos 1 número                      │
│ ☐ Pelo menos 1 caractere especial          │
│                                              │
│ Confirme Nova Senha:                        │
│ ┌──────────────────────────────────────────┐│
│ │ ••••••••••                               │
│ └──────────────────────────────────────────┘│
│                                              │
│        [Cancelar]    [Alterar Senha]       │
│                                              │
│ ℹ️ Você será desconectado de todos os       │
│    dispositivos após alterar a senha       │
│                                              │
└──────────────────────────────────────────────┘
```

## 4.7 PÁGINA DO CLUBE ESPECÍFICO

```
┌──────────────────────────────────────────────┐
│ ← Dom Casmurro Lovers  👥 [Menu]             │
├──────────────────────────────────────────────┤
│                                              │
│ 📚 Dom Casmurro                              │
│ ⭐⭐⭐⭐⭐  Machado de Assis                   │
│                                              │
│ Progresso do Clube:                         │
│ ███████░░░░░░░░░░  45% concluído (9/20)    │
│                                              │
│ ┌──────────────────────────────────────────┐│
│ │ MEMBROS DO CLUBE                         │
│ │ Sofia ✓ 100% (Finalizou)                │
│ │ João ◐ 67% (Lendo)                      │
│ │ Maria ◐ 45% (Lendo)                     │
│ │ + 6 outros membros                       │
│ │ [Ver Todos +6]                           │
│ └──────────────────────────────────────────┘│
│                                              │
│ ┌──────────────────────────────────────────┐│
│ │ CHAT DO CLUBE                            │
│ │                                          │
│ │ Sofia: "Que livro incrível! Capitu      │
│ │ é um personagem único..."                │
│ │ [16:30] 👍 3                              │
│ │                                          │
│ │ João: "Concordo! A escrita de           │
│ │ Machado é hipnotizante"                 │
│ │ [16:45] 👍 2                              │
│ │                                          │
│ │ Maria: "Alguém mais acha Capitu         │
│ │ manipuladora?"                          │
│ │ [17:00] 👍 1  💬 4                        │
│ │                                          │
│ │ [scroll para ver mais mensagens ↑]       │
│ │                                          │
│ │ ┌────────────────────────────────────┐   │
│ │ │ Digite sua mensagem aqui...        │   │
│ │ │                      [Enviar]      │   │
│ │ └────────────────────────────────────┘   │
│ └──────────────────────────────────────────┘│
│                                              │
└──────────────────────────────────────────────┘
```

### 4.7.1 Modal - Ver Todos os Membros

```
┌──────────────────────────────────────────────┐
│ Membros do Clube (15)                      X  │
├──────────────────────────────────────────────┤
│                                              │
│ [🔍 Buscar membro]                          │
│                                              │
│ ┌──────────────────────────────────────────┐│
│ │ Sofia ✓ Finalizou em 15/07              │
│ │ sofiam.reads • São Paulo                 │
│ │ @sofiam                                  │
│ └──────────────────────────────────────────┘│
│                                              │
│ ┌──────────────────────────────────────────┐│
│ │ João ◐ 67% completado                    │
│ │ joaoreads • Rio de Janeiro                │
│ │ @joaolisboa                              │
│ └──────────────────────────────────────────┘│
│                                              │
│ ┌──────────────────────────────────────────┐│
│ │ Maria ◐ 45% completado                   │
│ │ mariabooks • São Paulo                    │
│ │ @mariasv                                  │
│ └──────────────────────────────────────────┘│
│                                              │
│ [scroll para ver mais...]                   │
│                                              │
└──────────────────────────────────────────────┘
```

## 4.8 PÁGINA DO CLUBE CRIADO (GERENCIAMENTO)

```
┌──────────────────────────────────────────────┐
│ ← Dom Casmurro Lovers  [Gerenciar]           │
├──────────────────────────────────────────────┤
│                                              │
│ ⚙️ GERENCIAR CLUBE                           │
│                                              │
│ Nome do Clube:                              │
│ ┌──────────────────────────────────────────┐│
│ │ Dom Casmurro Lovers                      │
│ └──────────────────────────────────────────┘│
│ [Salvar]                                    │
│                                              │
│ ─────────────────────────────────────────── │
│                                              │
│ Livro:                                      │
│ ┌──────────────────────────────────────────┐│
│ │ Dom Casmurro - Machado de Assis [x]      │
│ └──────────────────────────────────────────┘│
│ [Salvar]                                    │
│                                              │
│ ─────────────────────────────────────────── │
│                                              │
│ Bio/Descrição:                              │
│ ┌──────────────────────────────────────────┐│
│ │ Clube para leitores que amam obras      │
│ │ de Machado de Assis. Vamos analisar    │
│ │ juntos!                                 │
│ │ (234 / 500)                             │
│ └──────────────────────────────────────────┘│
│ [Salvar]                                    │
│                                              │
│ ─────────────────────────────────────────── │
│                                              │
│ Tipo de Clube:                              │
│ ○ Público   ● Privado                      │
│ [Salvar]                                    │
│                                              │
│ ─────────────────────────────────────────── │
│                                              │
│ CÓDIGO DE ACESSO (PRIVADO)                  │
│ A7K3M9Z2  [Copiar] [Regenerar]             │
│                                              │
│ ─────────────────────────────────────────── │
│                                              │
│ MEMBROS (15)                                │
│ ┌──────────────────────────────────────────┐│
│ │ Sofia (criador)       [Remover]         │
│ │ João                  [Remover]         │
│ │ Maria                 [Remover]         │
│ │ ... (mais 12)                            │
│ └──────────────────────────────────────────┘│
│                                              │
│ ─────────────────────────────────────────── │
│                                              │
│ [Excluir Clube]  [Voltar]                   │
│                                              │
└──────────────────────────────────────────────┘
```

## 4.9 Componentes Reutilizáveis

### 4.9.1 AvatarUpload

```
┌─ Avatar Upload ────────────────────────┐
│                                        │
│         ┌──────────────────┐           │
│         │ [Avatar 200px]   │           │
│         └──────────────────┘           │
│    [Alterar Foto de Perfil]            │
│                                        │
│ Tipos: JPG, PNG, GIF (max: 5MB)       │
│                                        │
└────────────────────────────────────────┘
```

### 4.9.2 VerificationModal

```
┌─ Verification Code ────────────────────┐
│                                        │
│ Enviamos código para:                  │
│ sofia@email.com                        │
│                                        │
│ Código (6 dígitos):                    │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ │
│ │   │ │   │ │   │ │   │ │   │ │   │ │
│ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ │
│                                        │
│ Não recebeu? [Reenviar em 30s]         │
│                                        │
│ [Cancelar]  [Verificar]                │
│                                        │
└────────────────────────────────────────┘
```

### 4.9.3 ReviewCard

```
┌─ Review ───────────────────────────────┐
│                                        │
│ Sofia ⭐⭐⭐⭐⭐                          │
│ "Uma obra-prima! A escrita é poética  │
│  e a trama é envolvente. Leia!"       │
│ [Ler Mais] 👍 12 💬 3                 │
│                                        │
│ Leu: 01/06/2024 → 15/07/2024         │
│                                        │
└────────────────────────────────────────┘
     ↓ Expandido
┌─ Review - Completo ────────────────────┐
│                                        │
│ Sofia ⭐⭐⭐⭐⭐                          │
│                                        │
│ "Uma obra-prima! A escrita é          │
│  poética e hipnotizante. A trama      │
│  é envolvente do início ao fim.       │
│  Machado de Assis é um gênio.         │
│  Leia!" [continua...]                 │
│                                        │
│ Leu: 01/06/2024 → 15/07/2024         │
│                                        │
│ 👍 12 💬 3  🔗 Compartilhar             │
│                                        │
└────────────────────────────────────────┘
```

## 4.10 Responsividade

### Mobile (375px)
- Stack vertical de todas as seções
- Modals full-screen
- Thumbs ups para tocar
- Scroll horizontal para carrossel de livros
- Chat com altura máxima 400px

### Tablet (768px)
- 2-coluna em algumas seções
- Modals em 80% da tela
- Chat com altura máxima 500px

### Desktop (1024px+)
- Layouts lado-a-lado
- Modals centralizadas (600px width)
- Chat com altura máxima 600px

## 4.11 Estados Visuais

### Loading
```
⏳ Carregando...
[████░░░░░░░] 40%
```

### Success
```
✅ Alterações salvas com sucesso!
```

### Error
```
❌ Email inválido
Tente novamente.
```

### Empty State
```
📚 Nenhuma avaliação ainda
Seja o primeiro a avaliar este livro!
[Adicionar Avaliação]
```

---

# 5. MODELOS DE DADOS

## 5.1 User Model

```typescript
{
  id: UUID,
  email: String (unique),
  username: String (unique),
  password: String (hashed with bcrypt),
  phone: String (optional, unique),
  fullName: String,
  bio: String (max 500),
  avatar: String (URL to S3),
  city: String,
  favGenre: [String],
  favBook: String,
  isPublic: Boolean (default: true),
  emailVerified: Boolean (default: false),
  phoneVerified: Boolean (default: false),
  createdAt: DateTime,
  updatedAt: DateTime,
  
  // Relations
  reviews: Review[],
  clubs: Club[] (created clubs),
  clubMembers: Club[], (clubs joined)
  messages: Message[]
}
```

## 5.2 Book Model

```typescript
{
  id: UUID,
  title: String,
  author: String,
  isbn: String (unique, optional),
  coverUrl: String (URL to S3),
  year: Int (optional),
  genre: [String],
  description: String (long text),
  createdAt: DateTime,
  updatedAt: DateTime,
  
  // Relations
  reviews: Review[],
  clubs: Club[]
}
```

## 5.3 Review Model

```typescript
{
  id: UUID,
  rating: Int (1-5),
  title: String (optional, max 150),
  content: String (10-5000 chars),
  readStartDate: DateTime (optional),
  readEndDate: DateTime (optional),
  isSpoiler: Boolean (default: false),
  isPublic: Boolean (default: true),
  createdAt: DateTime,
  updatedAt: DateTime,
  
  // Relations
  book: Book,
  bookId: UUID,
  user: User,
  userId: UUID,
  
  // Computed
  avgRating: Float (agregado de todos)
  totalReviews: Int (agregado)
  
  // Constraints
  @@unique([userId, bookId]) // 1 review per user per book
}
```

## 5.4 Club Model

```typescript
{
  id: UUID,
  name: String,
  description: String (optional, max 500),
  isPrivate: Boolean (default: false),
  accessCode: String (8 chars, optional, unique if set),
  createdAt: DateTime,
  updatedAt: DateTime,
  
  // Relations
  book: Book,
  bookId: UUID,
  creator: User,
  creatorId: UUID,
  members: User[],
  messages: Message[]
}
```

## 5.5 Message Model

```typescript
{
  id: UUID,
  content: String (max 500),
  mentions: [UUID], // @mentions
  reactions: [String], // emoji reactions
  createdAt: DateTime,
  updatedAt: DateTime,
  
  // Relations
  club: Club,
  clubId: UUID,
  user: User,
  userId: UUID
}
```

## 5.6 VerificationCode Model

```typescript
{
  id: UUID,
  email: String (optional),
  phone: String (optional),
  code: String (6 digits),
  type: String, // "email" | "phone" | "password"
  expiresAt: DateTime (TTL: 15 mins),
  createdAt: DateTime
}
```

---

# 6. FLUXOS DE NEGÓCIO

## 6.1 Email Verification Flow

```
User edits email
    ↓
System validates email format
    ↓
System checks email is unique
    ↓
Send verification code to NEW email (SendGrid)
    ↓
User receives email with 6-digit code
    ↓
User enters code in modal (TTL: 15 min)
    ↓
System validates code matches
    ↓
Email is updated in database ✓
    ↓
Toast: "Email atualizado com sucesso"
    ↓
VerificationCode is deleted/marked used
```

## 6.2 Phone Verification Flow

```
User adds phone
    ↓
System validates phone format (regional)
    ↓
System checks phone is unique
    ↓
Send verification code via SMS (Twilio)
    ↓
User receives SMS with 6-digit code
    ↓
User enters code in modal (TTL: 15 min)
    ↓
System validates code matches
    ↓
Phone is updated in database ✓
    ↓
Toast: "Telefone confirmado com sucesso"
    ↓
VerificationCode is deleted/marked used
```

## 6.3 Password Change Flow

```
User clicks "Alterar Senha"
    ↓
Modal opens asking for current password
    ↓
User enters current password + new password
    ↓
System validates current password is correct
    ↓
System validates new password meets requirements
    ↓
System validates new != old
    ↓
Send verification link/code to email
    ↓
User clicks link or enters code (TTL: 30 min)
    ↓
Password is updated in database (hashed with bcrypt) ✓
    ↓
Toast: "Senha alterada com sucesso"
    ↓
LOGOUT all sessions (force re-login)
    ↓
Redirect to login page
```

## 6.4 Club Creation Flow

```
User clicks "Criar Clube"
    ↓
Modal/Form opens with fields:
  - Nome (3-100 chars)
  - Livro (select from list)
  - Bio (optional, max 500)
  - Privado/Público (toggle)
    ↓
User fills form
    ↓
System validates fields
    ↓
If Privado selected:
  - Generate random 8-char access code
  - accessCode = random code
    ↓
Create Club in database
    ↓
Set creator = current user
    ↓
Add creator to members array
    ↓
Toast: "Clube criado com sucesso"
    ↓
Redirect to Club Detail page
```

## 6.5 Join Club with Access Code Flow

```
User is on Club List
    ↓
Clicks "Entrar em Clube Privado"
    ↓
Modal opens asking for access code
    ↓
User enters 8-char code
    ↓
System validates code matches club.accessCode
    ↓
If invalid:
  - Toast: "Código inválido"
  - Modal stays open
    ↓
If valid:
  - Add user to club.members
  - Save to database
  - Toast: "Você entrou no clube!"
  - Redirect to Club Detail
```

## 6.6 Avatar Upload Flow

```
User clicks "Alterar Foto"
    ↓
File picker opens (JPG, PNG, GIF, WebP)
    ↓
User selects image (<= 5MB)
    ↓
Preview shows in modal
    ↓
User clicks "Confirmar"
    ↓
System uploads to AWS S3
    ↓
System generates 200x200px thumbnail
    ↓
System updates user.avatar = new S3 URL
    ↓
Toast: "Foto de perfil atualizada!"
    ↓
Avatar updates in UI
```

## 6.7 Create Review Flow

```
User is on Book Detail page
    ↓
Clicks "[Adicionar Minha Avaliação]"
    ↓
Modal opens with form:
  - Rating picker (1-5 stars)
  - Title input (optional)
  - Content textarea
  - Start date picker
  - End date picker
  - Spoiler checkbox
  - Private checkbox
    ↓
User fills form
    ↓
System validates:
  - Rating: 1-5 (required)
  - Content: 10-5000 chars (required)
  - Start date <= End date
    ↓
If validation fails:
  - Show error messages
  - Don't allow submit
    ↓
If valid:
  - Create Review in database
  - Calculate new avgRating
  - Toast: "Avaliação publicada!"
  - Modal closes
  - Review appears in list
```

---

# 7. COMPONENTES UI

## 7.1 Tabela de Componentes Reutilizáveis

| Componente | Uso | Props | Estados |
|-----------|-----|-------|--------|
| `AvatarUpload` | Foto de perfil | `onUpload`, `currentImage`, `size` | loading, preview, success, error |
| `VerificationModal` | Códigos de verificação | `type`, `onSubmit`, `onResend`, `email` | input, countdown, error, success |
| `ReviewCard` | Preview de review | `review`, `onClick`, `expandable` | collapsed, expanded, loading |
| `MemberList` | Lista de membros | `members`, `isCreator`, `onRemove` | loading, empty, list |
| `ChatContainer` | Chat com scroll | `messages`, `onSend`, `maxHeight` | loading, message-focus, error |
| `CodeDisplay` | Código privado | `code`, `onCopy`, `onRegenerate` | normal, copying, regenerating |
| `PasswordStrength` | Validação senha | `password`, `requirements` | weak, medium, strong |
| `RatingPicker` | Seleção de stars | `value`, `onChange`, `size` | interactive, readonly |
| `DatePicker` | Seleção de data | `value`, `onChange`, `format` | open, selected |
| `LoadingSpinner` | Indicador carregamento | `size`, `color` | spinning |
| `Toast` | Notificação | `message`, `type`, `duration` | success, error, info, warning |
| `Modal` | Dialog genérico | `isOpen`, `onClose`, `title`, `children` | open, closing |
| `InputField` | Campo de texto | `value`, `onChange`, `label`, `error` | normal, error, focused |
| `Button` | Botão genérico | `onClick`, `variant`, `disabled`, `loading` | primary, secondary, disabled, loading |

---

# 8. VALIDAÇÕES E REGRAS

## 8.1 Email

- ✅ Formato válido (RFC 5322)
- ✅ Não pode estar em branco
- ✅ Único no banco (não pode haver 2 usuários com mesmo email)
- ✅ Confirmação obrigatória via código de 6 dígitos
- ✅ Código expira em 15 minutos

## 8.2 Telefone

- ✅ Formato regional correto
  - Brasil: +55 (xx) 9xxxx-xxxx (11 dígitos)
  - USA: +1 (xxx) xxx-xxxx
- ✅ Único no banco
- ✅ Confirmação obrigatória via SMS
- ✅ Código expira em 15 minutos

## 8.3 Senha

- ✅ Mínimo 8 caracteres
- ✅ Pelo menos 1 MAIÚSCULA (A-Z)
- ✅ Pelo menos 1 minúscula (a-z)
- ✅ Pelo menos 1 número (0-9)
- ✅ Pelo menos 1 caractere especial (@#$%^&*)
- ✅ Diferente da senha anterior
- ✅ Hashed com bcrypt (salt rounds: 10)

## 8.4 Username

- ✅ 3-20 caracteres
- ✅ Alfanumérico + ponto, hífen, underscore
- ✅ Único no banco
- ✅ Sem espaços
- ✅ Case-insensitive na busca

## 8.5 Perfil do Usuário

- ✅ Full Name: 2-100 caracteres (required)
- ✅ Bio: 0-500 caracteres (optional)
- ✅ City: seleção de lista (optional)
- ✅ Avatar: JPG, PNG, GIF, WebP (max 5MB)

## 8.6 Review

- ✅ Rating: 1-5 (required)
- ✅ Título: 0-150 caracteres (optional)
- ✅ Conteúdo: 10-5000 caracteres (required)
- ✅ Read Start Date: datetime (optional)
- ✅ Read End Date: datetime >= Start Date (optional)
- ✅ 1 review por usuário por livro (unique constraint)

## 8.7 Clube

- ✅ Nome: 3-100 caracteres (required)
- ✅ Bio: 0-500 caracteres (optional)
- ✅ Access Code (if private): 8 caracteres alphanumeric
- ✅ Access Code: único
- ✅ Apenas criador pode editar

## 8.8 Mensagem

- ✅ Conteúdo: 1-500 caracteres (required)
- ✅ Não pode ser enviada por non-member
- ✅ Timestamp automático

## 8.9 Upload de Arquivo

- ✅ Tipos: JPG, PNG, GIF, WebP
- ✅ Tamanho máximo: 5MB
- ✅ Dimensions (opcional): redimensionar para 200x200px
- ✅ Store em AWS S3 com hash filename

---

# 9. TRATAMENTO DE ERROS

## 9.1 Mensagens de Erro (Usuário Final)

```javascript
{
  // Auth
  "INVALID_EMAIL": "Email inválido. Verifique o formato.",
  "EMAIL_EXISTS": "Email já cadastrado. Tente login ou recuperação de senha.",
  "INVALID_PHONE": "Telefone inválido. Use o formato (xx) xxxxx-xxxx",
  "PHONE_EXISTS": "Telefone já cadastrado.",
  "WEAK_PASSWORD": "Senha não atende os requisitos (8 chars, maiús, número, especial)",
  "INVALID_CODE": "Código de verificação inválido.",
  "CODE_EXPIRED": "Código expirou. Solicite um novo (válido por 15 min).",
  
  // User
  "UNAUTHORIZED": "Você não tem permissão para esta ação.",
  "USER_NOT_FOUND": "Usuário não encontrado.",
  "PROFILE_UPDATE_FAILED": "Erro ao atualizar perfil. Tente novamente.",
  
  // Upload
  "FILE_TOO_LARGE": "Arquivo muito grande. Máximo 5MB.",
  "INVALID_FILE_TYPE": "Tipo de arquivo não suportado. Use JPG, PNG ou GIF.",
  "UPLOAD_FAILED": "Erro ao enviar arquivo. Tente novamente.",
  
  // Club
  "CLUB_NOT_FOUND": "Clube não encontrado.",
  "CLUB_FULL": "Clube atingiu o limite de membros.",
  "INVALID_ACCESS_CODE": "Código de acesso inválido ou expirado.",
  "ALREADY_IN_CLUB": "Você já é membro deste clube.",
  "NOT_CLUB_CREATOR": "Apenas o criador pode fazer esta ação.",
  "CANNOT_REMOVE_YOURSELF": "Você não pode se remover do clube.",
  
  // Review
  "BOOK_NOT_FOUND": "Livro não encontrado.",
  "REVIEW_NOT_FOUND": "Avaliação não encontrada.",
  "ALREADY_REVIEWED": "Você já avaliou este livro.",
  
  // General
  "NETWORK_ERROR": "Erro de conexão. Verifique sua internet.",
  "SERVER_ERROR": "Erro no servidor. Tente novamente mais tarde.",
  "SOMETHING_WENT_WRONG": "Algo deu errado. Tente novamente.",
}
```

## 9.2 Tratamento por Camada

### Frontend
- Validação de form antes de enviar
- Mostrar error toast/modal
- Retry buttons para erros de rede
- Fallback UI para dados faltantes

### Backend
- Validar todos os inputs com Zod/Joi
- Verificar permissões (authguard)
- Tratar exceptions com proper HTTP status codes
- Log errors to Sentry

### HTTP Status Codes
- `400 Bad Request` - Validação falhou
- `401 Unauthorized` - Token inválido/expirado
- `403 Forbidden` - Sem permissão
- `404 Not Found` - Recurso não existe
- `409 Conflict` - Violação de unique constraint
- `500 Internal Server Error` - Erro no servidor

---

# 10. STACK TÉCNICO

## 10.1 Frontend

- **Framework:** React 18+ com TypeScript
- **Build tool:** Vite
- **CSS:** Tailwind CSS + CSS Modules
- **State Management:** Redux Toolkit / Zustand
- **Form Handling:** React Hook Form
- **Validation:** Zod
- **UI Components:** Radix UI / shadcn/ui
- **HTTP Client:** Axios / TanStack Query
- **Real-time:** Socket.io Client
- **File Upload:** multer (frontend: file input)
- **Date Picker:** React DatePicker / Day.js
- **Testing:** Vitest + React Testing Library
- **CI/CD:** GitHub Actions
- **Hosting:** Vercel / Netlify

## 10.2 Backend

- **Runtime:** Node.js 20 LTS
- **Framework:** NestJS (TypeScript first)
- **Database:** PostgreSQL 15+
- **ORM:** Prisma
- **Authentication:** JWT (access + refresh tokens)
- **Password Hashing:** bcrypt
- **Email Service:** SendGrid
- **SMS Service:** Twilio
- **File Storage:** AWS S3 / Google Cloud Storage
- **Real-time:** Socket.io Server
- **Input Validation:** Zod / class-validator
- **Logging:** Winston / Pino
- **Error Tracking:** Sentry
- **Testing:** Jest + Supertest
- **CI/CD:** GitHub Actions
- **Hosting:** AWS / DigitalOcean / Railway

## 10.3 DevOps

- **Version Control:** GitHub
- **Container:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Database Migrations:** Prisma Migrate
- **Monitoring:** Sentry + DataDog (opcional)
- **CDN:** CloudFront (para S3)

---

# 11. ARQUITETURA DE PASTAS

## 11.1 Backend - NestJS

```
bookly-api/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── dto/
│   │   │   ├── register.dto.ts
│   │   │   ├── login.dto.ts
│   │   │   └── refresh.dto.ts
│   │   └── strategies/
│   │       ├── jwt.strategy.ts
│   │       └── refresh.strategy.ts
│   │
│   ├── users/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.module.ts
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   ├── update-user.dto.ts
│   │   │   └── update-email.dto.ts
│   │   └── entities/
│   │       └── user.entity.ts
│   │
│   ├── books/
│   │   ├── books.controller.ts
│   │   ├── books.service.ts
│   │   ├── books.module.ts
│   │   └── entities/
│   │       └── book.entity.ts
│   │
│   ├── reviews/
│   │   ├── reviews.controller.ts
│   │   ├── reviews.service.ts
│   │   ├── reviews.module.ts
│   │   └── dto/
│   │       └── create-review.dto.ts
│   │
│   ├── clubs/
│   │   ├── clubs.controller.ts
│   │   ├── clubs.service.ts
│   │   ├── clubs.module.ts
│   │   ├── dto/
│   │   │   └── create-club.dto.ts
│   │   └── entities/
│   │       └── club.entity.ts
│   │
│   ├── chat/
│   │   ├── chat.gateway.ts (WebSocket)
│   │   ├── chat.service.ts
│   │   ├── chat.module.ts
│   │   └── dto/
│   │       └── message.dto.ts
│   │
│   ├── verification/
│   │   ├── verification.service.ts
│   │   ├── verification.module.ts
│   │   └── strategies/
│   │       ├── email-verification.ts
│   │       └── phone-verification.ts
│   │
│   ├── uploads/
│   │   ├── uploads.controller.ts
│   │   ├── uploads.service.ts
│   │   ├── uploads.module.ts
│   │   └── strategies/
│   │       └── s3-upload.ts
│   │
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   ├── mail.config.ts
│   │   └── sms.config.ts
│   │
│   ├── common/
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   └── logging.interceptor.ts
│   │   ├── decorators/
│   │   │   ├── is-auth-user.ts
│   │   │   └── roles.decorator.ts
│   │   └── pipes/
│   │       └── validation.pipe.ts
│   │
│   ├── database/
│   │   ├── migrations/ (managed by Prisma)
│   │   └── seeders/
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── test/
│   ├── app.e2e-spec.ts
│   └── setup.ts
│
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── package.json
└── tsconfig.json
```

## 11.2 Frontend - React + Vite

```
bookly-app/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   └── ForgotPasswordForm.tsx
│   │   │
│   │   ├── common/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── Toast.tsx
│   │   │
│   │   ├── book/
│   │   │   ├── BookCard.tsx
│   │   │   ├── BookDetail.tsx
│   │   │   ├── ReviewCard.tsx
│   │   │   ├── ReviewForm.tsx
│   │   │   └── ReviewList.tsx
│   │   │
│   │   ├── club/
│   │   │   ├── ClubCard.tsx
│   │   │   ├── ClubDetail.tsx
│   │   │   ├── ClubChat.tsx
│   │   │   ├── MemberList.tsx
│   │   │   ├── ClubSettings.tsx
│   │   │   └── ClubAccessCode.tsx
│   │   │
│   │   ├── user/
│   │   │   ├── ProfileCard.tsx
│   │   │   ├── ProfileEdit.tsx
│   │   │   ├── AvatarUpload.tsx
│   │   │   ├── UserSettings.tsx
│   │   │   └── SettingsTabs.tsx
│   │   │
│   │   ├── modals/
│   │   │   ├── VerificationModal.tsx
│   │   │   ├── ConfirmModal.tsx
│   │   │   └── ErrorModal.tsx
│   │   │
│   │   └── forms/
│   │       ├── EmailVerificationForm.tsx
│   │       ├── PhoneVerificationForm.tsx
│   │       ├── PasswordChangeForm.tsx
│   │       └── PasswordStrengthIndicator.tsx
│   │
│   ├── pages/
│   │   ├── home/
│   │   │   ├── HomePage.tsx
│   │   │   └── HomeNotLogged.tsx
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── SignupPage.tsx
│   │   │
│   │   ├── books/
│   │   │   ├── BooksListPage.tsx
│   │   │   ├── BookDetailPage.tsx
│   │   │   └── AddReviewPage.tsx
│   │   │
│   │   ├── clubs/
│   │   │   ├── ClubsListPage.tsx
│   │   │   ├── ClubDetailPage.tsx
│   │   │   ├── ClubManagementPage.tsx
│   │   │   └── CreateClubPage.tsx
│   │   │
│   │   ├── profile/
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── EditProfilePage.tsx
│   │   │   └── SettingsPage.tsx
│   │   │
│   │   └── 404.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useUser.ts
│   │   ├── useBooks.ts
│   │   ├── useClubs.ts
│   │   ├── useReviews.ts
│   │   ├── useForm.ts
│   │   ├── usePagination.ts
│   │   └── useVerification.ts
│   │
│   ├── services/
│   │   ├── api.ts (Axios instance)
│   │   ├── authService.ts
│   │   ├── userService.ts
│   │   ├── bookService.ts
│   │   ├── reviewService.ts
│   │   ├── clubService.ts
│   │   ├── chatService.ts
│   │   ├── uploadService.ts
│   │   └── verificationService.ts
│   │
│   ├── store/
│   │   ├── authSlice.ts
│   │   ├── userSlice.ts
│   │   ├── booksSlice.ts
│   │   ├── clubsSlice.ts
│   │   ├── reviewsSlice.ts
│   │   └── store.ts
│   │
│   ├── types/
│   │   ├── auth.types.ts
│   │   ├── user.types.ts
│   │   ├── book.types.ts
│   │   ├── review.types.ts
│   │   ├── club.types.ts
│   │   ├── chat.types.ts
│   │   └── api.types.ts
│   │
│   ├── utils/
│   │   ├── validators.ts
│   │   ├── formatters.ts
│   │   ├── constants.ts
│   │   └── helpers.ts
│   │
│   ├── styles/
│   │   ├── globals.css
│   │   ├── variables.css
│   │   └── animations.css
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── public/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

# 12. ROADMAP & SPRINTS

## 12.1 Timeline Geral

```
Semana 1-2:   Sprint 1 - Auth + Email + Perfil
Semana 3-4:   Sprint 2 - Upload + Telefone + Config
Semana 5-6:   Sprint 3 - Livros + Reviews
Semana 7-9:   Sprint 4 - Clubes + Chat
Semana 10:    Bug fixes, testes, performance
Semana 11:    Closed beta interno
Semana 12:    Launch MVP v1.0 🎉
```

## 12.2 Sprint 1: Autenticação & Perfil (2 semanas)

### Backend Tasks
- [ ] Setup NestJS + PostgreSQL + Prisma
- [ ] Configurar JWT authentication (access + refresh tokens)
- [ ] Hash passwords com bcrypt
- [ ] POST /auth/register - registrar usuário
- [ ] POST /auth/login - fazer login
- [ ] POST /auth/refresh - renovar token
- [ ] POST /auth/logout - fazer logout
- [ ] Criar User model no Prisma
- [ ] GET /users/me - dados do usuário logado
- [ ] PUT /users/profile - atualizar dados básicos
- [ ] POST /verification/send-email-code - enviar código
- [ ] POST /verification/verify-email-code - verificar código
- [ ] PUT /users/email - atualizar email (com verificação)
- [ ] PUT /users/password - alterar senha (com verificação)
- [ ] Configurar SendGrid para emails
- [ ] Testes unitários para auth service
- [ ] Testes E2E para fluxos de auth

### Frontend Tasks
- [ ] Setup React + TypeScript + Tailwind + Redux
- [ ] Configurar Axios client com interceptors
- [ ] Componente: LoginForm (com placeholders literários)
- [ ] Componente: SignupForm
- [ ] Página: LoginPage
- [ ] Página: SignupPage
- [ ] Componente: ProfileCard
- [ ] Página: EditProfilePage (basico - sem upload ainda)
- [ ] Componente: VerificationModal (para email)
- [ ] Hook: useAuth (login, logout, signup)
- [ ] Hook: useUser (fetch profile)
- [ ] Proteção de rotas (PrivateRoute wrapper)
- [ ] Integração com API backend
- [ ] Testes de componentes críticos
- [ ] LocalStorage para tokens

### Definition of Done Sprint 1
- [ ] User pode fazer signup com email/senha
- [ ] User pode fazer login com credenciais válidas
- [ ] User recebe código de verificação por email
- [ ] User pode verificar email com código
- [ ] Senha é validada (requisitos)
- [ ] JWT tokens armazenados e usados
- [ ] Rotas protegidas funcionando
- [ ] Erro handling implementado

---

## 12.3 Sprint 2: Upload & Telefone (2 semanas)

### Backend Tasks
- [ ] Configurar AWS S3 upload
- [ ] POST /uploads/avatar - fazer upload
- [ ] Validar tipo de arquivo (JPG, PNG, GIF)
- [ ] Validar tamanho (<5MB)
- [ ] Gerar thumbnail 200x200px
- [ ] PUT /users/avatar - salvar URL do avatar
- [ ] POST /verification/send-phone-code - enviar SMS
- [ ] POST /verification/verify-phone-code - verificar
- [ ] PUT /users/phone - adicionar/atualizar telefone
- [ ] Configurar Twilio para SMS
- [ ] GET /users/settings - obter configurações
- [ ] PUT /users/privacy - atualizar privacidade
- [ ] Adicionar campos phone, phoneVerified ao User model
- [ ] Testes para upload
- [ ] Testes para phone verification

### Frontend Tasks
- [ ] Componente: AvatarUpload (preview + upload)
- [ ] Página: SettingsPage (abas: Conta | Segurança)
- [ ] Componente: EmailChangeForm
- [ ] Componente: PhoneAddForm
- [ ] Componente: PasswordChangeForm
- [ ] Componente: PasswordStrengthIndicator
- [ ] Integração upload com S3 (signed URLs)
- [ ] Tratamento de erros de upload
- [ ] Loading states durante upload
- [ ] Tab navigation em SettingsPage

### Definition of Done Sprint 2
- [ ] Avatar upload + thumbnail geração funcionando
- [ ] Telefone pode ser adicionado + verificado via SMS
- [ ] Senha pode ser alterada com verificação
- [ ] Settings page com abas funcionando
- [ ] Erro handling para upload

---

## 12.4 Sprint 3: Livros & Reviews (2 semanas)

### Backend Tasks
- [ ] Criar Book model no Prisma
- [ ] Criar Review model no Prisma
- [ ] GET /books - listar livros (com paginação)
- [ ] GET /books/search - buscar livros
- [ ] GET /books/:id - detalhes do livro
- [ ] POST /books/:id/reviews - criar review
- [ ] GET /books/:id/reviews - listar reviews de um livro
- [ ] PUT /reviews/:id - editar própria review
- [ ] DELETE /reviews/:id - deletar própria review
- [ ] Cálculo de avgRating (agregação)
- [ ] Seed: Popular alguns livros no banco
- [ ] Paginação de reviews
- [ ] Testes para reviews CRUD

### Frontend Tasks
- [ ] Página: BooksListPage
- [ ] Componente: BookCard
- [ ] Página: BookDetailPage
- [ ] Componente: ReviewCard (truncado)
- [ ] Componente: ReviewList com paginação
- [ ] Componente: ReviewForm (modal/page)
- [ ] Componente: RatingPicker (interactive stars)
- [ ] DatePicker para data de início/fim
- [ ] Preview expandível de reviews
- [ ] Hook: useBooks
- [ ] Hook: useReviews
- [ ] Cálculo de rating médio exibido

### Definition of Done Sprint 3
- [ ] Livros podem ser listados e buscados
- [ ] Página de detalhes do livro mostra média + nº de reviews
- [ ] Reviews podem ser criadas/editadas/deletadas
- [ ] Datas de leitura são exibidas
- [ ] Reviews longas podem ser expandidas

---

## 12.5 Sprint 4: Clubes & Chat (3 semanas)

### Backend Tasks
- [ ] Criar Club model no Prisma
- [ ] Criar Message model no Prisma
- [ ] POST /clubs - criar clube
- [ ] GET /clubs - listar clubs (com paginação)
- [ ] GET /clubs/:id - detalhes do club
- [ ] PUT /clubs/:id - editar (apenas criador)
- [ ] DELETE /clubs/:id - deletar (apenas criador)
- [ ] POST /clubs/:id/members - adicionar membro
- [ ] DELETE /clubs/:id/members/:userId - remover (apenas criador)
- [ ] GET /clubs/:id/members - listar membros
- [ ] Geração de access code (8 chars)
- [ ] POST /clubs/:id/access - entrar com code
- [ ] GET /clubs/:id/messages - histórico (com paginação)
- [ ] WebSocket: chat.gateway.ts
- [ ] WebSocket: message:send event
- [ ] WebSocket: message:receive event
- [ ] Validação de permissões (criador vs membro)
- [ ] Testes para clubs CRUD
- [ ] Testes para WebSocket

### Frontend Tasks
- [ ] Página: ClubsListPage
- [ ] Componente: ClubCard
- [ ] Componente: CreateClubModal
- [ ] Página: ClubDetailPage
- [ ] Componente: ClubChat (WebSocket)
- [ ] Componente: MessageList (com scroll fixo)
- [ ] Componente: MessageInput
- [ ] Componente: MemberList
- [ ] Componente: MemberModal (expandir membros com progresso)
- [ ] Página: ClubManagementPage (apenas criador)
- [ ] Componente: ClubSettings (editar nome, livro, bio)
- [ ] Componente: AccessCodeDisplay (copiar, regenerar)
- [ ] Componente: RemoveMemberButton
- [ ] Hook: useClubs
- [ ] Hook: useChat (WebSocket)
- [ ] Integração Socket.io
- [ ] Lazy load de mensagens antigas
- [ ] Indicador "escrevendo..."

### Definition of Done Sprint 4
- [ ] Clubes podem ser criados (público/privado)
- [ ] Código de acesso funciona para privados
- [ ] Chat funciona em tempo real
- [ ] Chat tem scroll (não expande com mensagens)
- [ ] Membros podem ser visualizados e removidos (criador)
- [ ] Dados do clube podem ser editados (criador)
- [ ] Código de acesso pode ser regenerado (criador)

---

## 12.6 Sprint 5: Polish & Testing (1 semana)

- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Code review / refactor
- [ ] Teste completo de funcionalidades
- [ ] Lighthouse score > 85
- [ ] Responsividade em mobile/tablet
- [ ] Accessibility audit

---

## 12.7 Sprint 6: Beta & Launch (2 semanas)

- [ ] Internal closed beta testing
- [ ] Bug fixes encontrados em beta
- [ ] Performance tuning
- [ ] Documentation
- [ ] Deploy para produção
- [ ] Launch MVP v1.0 🎉

---

# 13. ENDPOINTS DA API

## 13.1 Auth Endpoints

```
POST   /auth/register
  Body: { email, username, password, fullName }
  Response: { id, email, username, token, refreshToken }

POST   /auth/login
  Body: { email/username, password }
  Response: { user, token, refreshToken }

POST   /auth/refresh
  Body: { refreshToken }
  Response: { token }

POST   /auth/logout
  Response: { message: "Logged out" }
```

## 13.2 User Endpoints

```
GET    /users/me
  Response: { id, email, username, fullName, avatar, bio, city, ... }

PUT    /users/profile
  Body: { fullName, bio, city, favGenre, favBook, isPublic }
  Response: { user }

POST   /users/avatar
  Body: FormData(file)
  Response: { avatarUrl }

PUT    /users/avatar
  Body: { avatarUrl }
  Response: { user }

PUT    /users/email
  Body: { newEmail, verificationCode }
  Response: { user }

PUT    /users/phone
  Body: { phone, verificationCode }
  Response: { user }

PUT    /users/password
  Body: { currentPassword, newPassword }
  Response: { message: "Password updated" }

GET    /users/:id
  Response: { user (public profile) }

GET    /users/:id/reviews
  Response: { reviews[] }

GET    /users/settings
  Response: { email, phone, emailVerified, phoneVerified, isPublic }

PUT    /users/privacy
  Body: { isPublic, reviewsPublic, indexable }
  Response: { user }
```

## 13.3 Verification Endpoints

```
POST   /verification/send-email-code
  Body: { email }
  Response: { message: "Code sent" }

POST   /verification/verify-email-code
  Body: { email, code }
  Response: { valid: boolean }

POST   /verification/send-phone-code
  Body: { phone }
  Response: { message: "Code sent" }

POST   /verification/verify-phone-code
  Body: { phone, code }
  Response: { valid: boolean }

POST   /verification/send-password-reset
  Body: { email }
  Response: { message: "Reset link sent" }
```

## 13.4 Book Endpoints

```
GET    /books
  Query: { page, limit, genre, sort }
  Response: { books[], total, page, limit }

GET    /books/search
  Query: { q, genre, author }
  Response: { books[] }

GET    /books/:id
  Response: { book, avgRating, totalReviews }

POST   /books
  Body: { title, author, year, genre, description, isbn, coverUrl }
  Response: { book }
  Note: Admin only
```

## 13.5 Review Endpoints

```
POST   /books/:id/reviews
  Body: { rating, title, content, readStartDate, readEndDate, isSpoiler, isPublic }
  Response: { review }

GET    /books/:id/reviews
  Query: { page, limit, sort }
  Response: { reviews[], total }

GET    /reviews/:id
  Response: { review }

PUT    /reviews/:id
  Body: { rating, title, content, readStartDate, readEndDate, isSpoiler, isPublic }
  Response: { review }

DELETE /reviews/:id
  Response: { message: "Review deleted" }
```

## 13.6 Club Endpoints

```
POST   /clubs
  Body: { name, description, bookId, isPrivate }
  Response: { club, accessCode (if private) }

GET    /clubs
  Query: { page, limit, isPrivate }
  Response: { clubs[], total }

GET    /clubs/:id
  Response: { club, members, avgReadProgress }

PUT    /clubs/:id
  Body: { name, description, bookId }
  Response: { club }
  Note: Only creator

DELETE /clubs/:id
  Response: { message: "Club deleted" }
  Note: Only creator

POST   /clubs/:id/join
  Body: { accessCode (if private) }
  Response: { club }

POST   /clubs/:id/access
  Body: { accessCode }
  Response: { valid: boolean }

GET    /clubs/:id/members
  Response: { members[] (with progress) }

DELETE /clubs/:id/members/:userId
  Response: { message: "Member removed" }
  Note: Only creator

POST   /clubs/:id/members/:userId/remove
  Response: { message: "Member removed" }
  Note: Only creator

GET    /clubs/:id/messages
  Query: { page, limit }
  Response: { messages[], total }

POST   /clubs/:id/regenerate-code
  Response: { newAccessCode }
  Note: Only creator
```

## 13.7 WebSocket Events

```
// Client to Server
message:send
  Data: { clubId, content }

typing:start
  Data: { clubId }

typing:stop
  Data: { clubId }

// Server to Client
message:receive
  Data: { messageId, userId, username, avatar, content, createdAt }

member:joined
  Data: { userId, username }

member:left
  Data: { userId, username }

typing:indicator
  Data: { userId, username, isTyping }

error
  Data: { message }
```

---

# 14. SCHEMA DO BANCO (PRISMA)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  username      String    @unique
  passwordHash  String
  phone         String?   @unique
  fullName      String
  bio           String?   @db.VarChar(500)
  avatarUrl     String?
  city          String?
  favGenres     String[]
  favBook       String?
  isPublic      Boolean   @default(true)
  emailVerified Boolean   @default(false)
  phoneVerified Boolean   @default(false)
  
  reviews       Review[]
  createdClubs  Club[]    @relation("creator")
  clubMembers   Club[]    @relation("members")
  messages      Message[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Book {
  id          String    @id @default(cuid())
  title       String
  author      String
  isbn        String?   @unique
  coverUrl    String?
  year        Int?
  genres      String[]
  description String?   @db.Text
  
  reviews     Review[]
  clubs       Club[]
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Review {
  id            String    @id @default(cuid())
  rating        Int       @db.SmallInt // 1-5
  title         String?   @db.VarChar(150)
  content       String    @db.VarChar(5000)
  readStartDate DateTime?
  readEndDate   DateTime?
  isSpoiler     Boolean   @default(false)
  isPublic      Boolean   @default(true)
  
  bookId        String
  book          Book      @relation(fields: [bookId], references: [id], onDelete: Cascade)
  
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@unique([userId, bookId])
}

model Club {
  id          String    @id @default(cuid())
  name        String    @db.VarChar(100)
  description String?   @db.VarChar(500)
  isPrivate   Boolean   @default(false)
  accessCode  String?   @unique @db.Char(8)
  
  bookId      String
  book        Book      @relation(fields: [bookId], references: [id])
  
  creatorId   String
  creator     User      @relation("creator", fields: [creatorId], references: [id], onDelete: Cascade)
  
  members     User[]    @relation("members")
  messages    Message[]
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Message {
  id        String    @id @default(cuid())
  content   String    @db.VarChar(500)
  mentions  String[]
  reactions String[]  // emoji
  
  clubId    String
  club      Club      @relation(fields: [clubId], references: [id], onDelete: Cascade)
  
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model VerificationCode {
  id        String    @id @default(cuid())
  email     String?
  phone     String?
  code      String    @db.Char(6)
  type      String    // "email" | "phone" | "password"
  expiresAt DateTime
  usedAt    DateTime?
  
  createdAt DateTime  @default(now())
  
  @@index([email, type])
  @@index([phone, type])
}

model Session {
  id        String    @id @default(cuid())
  userId    String
  token     String    @unique
  expiresAt DateTime
  
  createdAt DateTime  @default(now())
}
```

---

# 15. ENVIRONMENT VARIABLES

## 15.1 Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bookly
DATABASE_SHADOW_DATABASE_URL=postgresql://user:password@localhost:5432/bookly_shadow

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRATION=7d

# Email (SendGrid)
SENDGRID_API_KEY=SG.your-api-key-here
SENDGRID_FROM_EMAIL=noreply@bookly.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=bookly-uploads

# Server
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# CORS
CORS_ORIGIN=http://localhost:5173

# Frontend
FRONTEND_URL=http://localhost:5173

# Sentry (optional)
SENTRY_DSN=https://...@sentry.io/...

# Redis (optional, for caching)
REDIS_URL=redis://localhost:6379
```

## 15.2 Frontend (.env)

```env
VITE_API_URL=http://localhost:3000
VITE_API_TIMEOUT=10000
VITE_ENVIRONMENT=development
VITE_APP_NAME=Bookly
VITE_LOG_LEVEL=debug
```

---

# 16. MÉTRICAS & KPIs

## 16.1 Performance

| Métrica | Target | Frequência |
|---------|--------|-----------|
| API Response Time (p95) | < 200ms | Real-time |
| Frontend TTI | < 2s | Build time |
| Lighthouse Score | > 85 | Per release |
| Bundle Size | < 500KB | Per release |
| DB Query Time (p95) | < 100ms | Real-time |

## 16.2 Qualidade

| Métrica | Target | Frequência |
|---------|--------|-----------|
| Test Coverage | > 80% | Per PR |
| Bug Escape Rate | < 5% | Per sprint |
| Critical Bugs (prod) | 0 | Always |
| E2E Test Pass Rate | 100% | Per build |

## 16.3 Negócio

| Métrica | Target | Frequência |
|---------|--------|-----------|
| Signup Conversion | > 40% | Diário |
| Email Verification Rate | > 85% | Diário |
| Club Creation Rate | > 20% (de ativos) | Diário |
| DAU (Daily Active Users) | Crescendo | Diário |
| Chat Messages/Dia | > 100 por clube | Diário |
| Review Completion Rate | > 30% (users que leem criam review) | Semanal |
| 30-Day Retention | > 60% | Mensal |

---

# 17. RISCOS & MITIGAÇÃO

## Tabela de Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Atraso na integração WebSocket | Alto | Média | Spike research na semana 1, usar Socket.io maduro |
| Problema com S3 upload | Médio | Baixa | Testes locais com moto, fallback storage |
| Escalabilidade do chat | Alto | Média | Redis pub/sub, message queuing (BullMQ) |
| GDPR/Privacy compliance | Alto | Média | Revisar cookies, consent, data deletion |
| SSL certificate issues | Médio | Baixa | Let's Encrypt com automation |
| Database connection timeout | Médio | Média | Connection pooling, retry logic |
| Email delivery issues | Médio | Baixa | SendGrid redundancy, log all sends |
| SMS delivery issues | Médio | Baixa | Twilio fallback, log attempts |
| DDoS attacks | Alto | Baixa | Rate limiting, WAF (AWS Shield) |
| Database migration issues | Alto | Baixa | Test migrations, backup strategy |

---

# 18. DEFINIÇÃO DE PRONTO (DoD)

## Checklist por Feature/Task

- [ ] Código revisado por pelo menos 1 person (code review)
- [ ] Testes unitários com 80%+ cobertura
- [ ] Testes E2E para fluxos críticos
- [ ] TypeScript sem erros (`tsc --noEmit`)
- [ ] ESLint/Prettier sem warnings
- [ ] Sem console.logs em produção
- [ ] Sem secrets hardcoded
- [ ] Commits descritivos (conventional commits)
- [ ] Documentação de API (comentários/swagger)
- [ ] Performance acceptable (Lighthouse > 80 ou API < 200ms)
- [ ] Responsivo (mobile, tablet, desktop)
- [ ] Validações implementadas (frontend + backend)
- [ ] Erro handling implementado (user-friendly messages)
- [ ] Acessibilidade básica (alt text, labels, keyboard nav)
- [ ] Testado manualmente por outro dev

---

# CONCLUSÃO

Este documento contém toda a especificação necessária para desenvolver o Bookly MVP. 

**Para começar:**
1. Backend Dev → Seção 10 (Stack), 11 (Estrutura), 12 (Sprint 1), 14 (Schema)
2. Frontend Dev → Seção 4 (Mocks), 11 (Estrutura), 12 (Sprint 1), 13 (API Endpoints)
3. PM/Product → Seção 1-3 (Visão geral), 12 (Timeline), 16 (Métricas)
4. QA/Tester → Seção 8 (Validações), 17 (Riscos), 18 (DoD)

**Boa sorte! 🚀**

---

**Versão:** 1.0  
**Data:** 2024-07-20  
**Status:** 🟢 Pronto para Implementação  
**Próxima Revisão:** Pós Sprint 1

---

## Nota sobre o estado atual do projeto

Este documento descreve a especificação-alvo completa (full-stack: NestJS + PostgreSQL/Prisma + React/Vite + WebSocket). O estado atual deste repositório é um **protótipo frontend em Next.js com dados mocados** (ver `README.md`), que já implementa em memória boa parte do fluxo de produto descrito aqui (feed, estante, clubes com chat, perfil, configurações). A migração para a arquitetura completa (auth real, banco, upload em S3, SMS/e-mail, WebSocket) é trabalho futuro, feature por feature, mantendo os nomes de campos já usados no store (`src/lib/store`) para minimizar o retrabalho.
