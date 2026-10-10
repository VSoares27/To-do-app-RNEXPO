# 📝 To-Do App — React Native + Expo

Aplicativo mobile de lista de tarefas feito com **Expo (SDK 57)**, **React Native** e **TypeScript**. Permite organizar tarefas por categorias, filtrar por status, definir data e hora de vencimento e receber **lembretes locais agendados**. Todos os dados ficam salvos em **SQLite** no próprio aparelho e continuam disponíveis depois de fechar e reabrir o app.

> Projeto educacional, desenvolvido com auxílio de agentes de IA a partir da especificação em [`SPEC.md`](./SPEC.md). O histórico real do desenvolvimento está em [`BUILD_LOG.md`](./BUILD_LOG.md).

---

## ✨ Funcionalidades

- **Tarefas**: criar, editar, excluir, marcar como concluída e reabrir.
- **Categorias**: criar, renomear e excluir. Ao excluir uma categoria em uso, as tarefas dela ficam **sem categoria** (`ON DELETE SET NULL`).
- **Filtros**: por status (Todas / Pendentes / Concluídas) e por categoria, combináveis entre si.
- **Data e hora de vencimento** opcionais, com seletores nativos.
- **Notificações locais** agendadas para a data/hora de vencimento, sem depender de servidor push.
- **Persistência offline** com SQLite.

## 🧰 Tecnologias

| Tecnologia | Uso |
| --- | --- |
| [Expo](https://expo.dev) `~57` / React Native `0.86` / React `19` | Base do app |
| TypeScript (`strict`) | Tipagem estática |
| [Expo Router](https://docs.expo.dev/router/introduction/) | Navegação baseada em arquivos |
| [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) | Persistência local |
| [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) | Notificações locais agendadas |
| `@react-native-community/datetimepicker` | Seleção de data e hora |
| `date-fns` | Utilitários de data |

## 📱 Telas

| Rota | Arquivo | Descrição |
| --- | --- | --- |
| `/` | `src/app/index.tsx` | Lista de tarefas, filtros, marcar como concluída, acesso a categorias e botão de nova tarefa |
| `/task` | `src/app/task.tsx` | Criação/edição de tarefa (apresentada como *modal*). Recebe `?id=` para editar |
| `/categories` | `src/app/categories.tsx` | Gerenciamento de categorias |

## 🗂️ Estrutura do projeto

```
src/
├── app/                      # Rotas (Expo Router)
│   ├── _layout.tsx           # Layout raiz: SQLiteProvider, AppProvider, Stack e permissão de notificações
│   ├── index.tsx             # Lista de tarefas
│   ├── task.tsx              # Editor/detalhe da tarefa
│   └── categories.tsx        # Gerenciamento de categorias
├── context/
│   ├── AppContext.tsx        # Estado global (tasks, categories, refreshData)
│   └── NotificationContext.tsx  # Provider alternativo de lembretes (não utilizado no momento)
├── db/
│   ├── database.ts           # Criação do banco e das tabelas
│   └── queries.ts            # Tipos (Task, Category) e operações CRUD
└── utils/
    └── notifications.ts      # Agendar e cancelar notificações de tarefas
```

## 🏗️ Como funciona

### Banco de dados (SQLite)

O banco `todoapp.db` é aberto pelo `SQLiteProvider` em `_layout.tsx` e inicializado por `initializeDb` (`src/db/database.ts`), com `WAL` e `foreign_keys` ativados.

```sql
categories (id TEXT PK, name TEXT NOT NULL)

tasks (
  id TEXT PK,
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  dueDateTime TEXT,              -- ISO 8601, opcional
  createdAt TEXT NOT NULL,
  categoryId TEXT REFERENCES categories(id) ON DELETE SET NULL
)
```

Todas as operações de leitura e escrita ficam centralizadas em `src/db/queries.ts`.

### Gerenciamento de estado

Um `AppContext` (React Context API) mantém em memória as listas de tarefas e categorias. Depois de qualquer alteração no banco, a tela chama `refreshData()`, que relê o SQLite e atualiza o estado, fazendo todas as telas re-renderizarem. Os filtros são aplicados **em memória** na tela de lista.

### Navegação

Stack do Expo Router. A tela de edição recebe apenas o **ID** da tarefa pela rota (`/task?id=...`) e busca os dados no estado compartilhado.

### Notificações

A lógica está em `src/utils/notifications.ts`:

- O **ID da tarefa é usado como identificador da notificação**, o que facilita cancelar ou substituir o lembrete.
- Ao salvar ou alternar o status, o lembrete anterior é cancelado e um novo é agendado **somente se** a tarefa estiver pendente e a data de vencimento for futura.
- Concluir, excluir ou remover a data cancela o lembrete.
- A permissão é solicitada na inicialização do app. Se for negada ou o módulo não estiver disponível, os erros são capturados e o app **não quebra**.

## 🚀 Como executar

### Pré-requisitos

- [Node.js](https://nodejs.org) (versão LTS)
- Um emulador Android/iOS ou um aparelho físico
- Para Android local: Android Studio e SDK configurados

### Instalação

```bash
git clone <url-do-repositorio>
cd To-do-app-RNEXPO
npm install
```

> O projeto usa `legacy-peer-deps=true` (definido em `.npmrc`).

### Rodando

```bash
npx expo start          # servidor de desenvolvimento
npx expo run:android    # compila e roda no Android (development build)
npx expo run:ios        # compila e roda no iOS (requer macOS)
```

> 💡 **Expo Go:** o app roda no Expo Go, e notificações **locais** funcionam lá. Já notificações *push remotas* não são suportadas no Expo Go para Android desde o SDK 53, mas este projeto não usa push remoto. Se tiver problemas com módulos nativos, use uma *development build*.

### Gerar um APK (EAS Build)

O arquivo `eas.json` já tem um perfil `preview` configurado para gerar APK:

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

### Verificações

```bash
npx tsc --noEmit    # checagem de tipos
npx expo lint       # lint
npx expo-doctor     # diagnóstico de dependências
```

## ⚠️ Limitações conhecidas

- Visual simples, usando principalmente componentes padrão do React Native.
- Não há feedback visual caso o usuário negue a permissão de notificações.
- As operações de banco em `task.tsx`, `index.tsx` e `categories.tsx` não têm tratamento de erro com mensagem ao usuário (apenas validação do título).
- Notificações agendadas dependem do sistema operacional e podem ser afetadas por economia de bateria em alguns aparelhos.
- `src/context/NotificationContext.tsx` não é usado em nenhuma tela e pode ser removido.

## 📚 Documentação do desenvolvimento

| Arquivo | Conteúdo |
| --- | --- |
| [`SPEC.md`](./SPEC.md) | Especificação completa do exercício |
| [`BUILD_LOG.md`](./BUILD_LOG.md) | Histórico de decisões, erros e correções durante o desenvolvimento |
| [`AGENTS.md`](./AGENTS.md) | Instruções para agentes de código neste repositório |
| [`Questionnaire.md`](./Questionnaire.md) | Perguntas de análise do código gerado |

## Developers

- [Diego Nunes](https://github.com/Diego-jpeg-27)
- [Victor Soares](https://github.com/VSoares27)