# Mobile App Reverse-Engineering Questions

Answer the following questions based on the code generated during the exercise.

You may use the coding agent to help investigate the project, but you must inspect the source code and verify the answers yourself.

Whenever possible, mention the relevant files, classes, functions, or components.

---

## 1. Project Structure

What are the main parts of the project, and where can you find:

- UI/screens;
- data models;
- SQLite/database code;
- navigation;
- notification code?

Briefly describe how the project is organized.

> **Resposta**

A estrutura do projeto está dividida em:

- **Raiz**: `SPEC.md` (especificação do exercício), `AGENTS.md` (regras para o agente, como usar Expo Router), `BUILD_LOG.md` (histórico de desenvolvimento), `app.json` / `eas.json` / `package.json` (configuração do Expo, do EAS Build e dependências), `assets/` (ícones) e `android/` (projeto nativo gerado).
- **`src/`**: todo o código do app, separado por camada técnica (`app`, `db`, `context`, `utils`).

| O que procurar | Onde está |
|---|---|
| UI / telas | `src/app/index.tsx` (lista de tarefas), `src/app/task.tsx` (editor/detalhe), `src/app/categories.tsx` (categorias) |
| Modelos de dados | Tipos TypeScript `Task` e `Category` em `src/db/queries.ts` (linhas 3–16). O formato no banco está em `src/db/database.ts` (`CREATE TABLE`) |
| Código SQLite | `src/db/database.ts` (criação do schema) e `src/db/queries.ts` (CRUD). O banco é aberto pelo `SQLiteProvider` em `src/app/_layout.tsx` (linha 35) |
| Navegação | `src/app/_layout.tsx` (`Stack` do Expo Router) + roteamento baseado em arquivos dentro de `src/app/` |
| Notificações | `src/utils/notifications.ts` (agendar/cancelar, é o que o app realmente usa); permissão e handler em `src/app/_layout.tsx` (linhas 7–32); `src/context/NotificationContext.tsx` existe, mas **não é usado** (ver resposta 6) |
| Estado global | `src/context/AppContext.tsx` |

Organização: o `BUILD_LOG.md` descreve como "feature-based", mas na prática é **organizado por camadas** (rotas/telas, acesso a dados, contexto, utilitários). As pastas `src/components/` e `src/hooks/` estão vazias, então cada tela concentra sua própria UI e lógica de interação.

---

## 2. Architecture and State

How is application state managed?

Explain how the UI is updated after an operation such as:

- creating a task;
- editing a task;
- marking a task as completed.

Does the project use any recognizable architectural pattern or state-management approach?

---

> **Resposta**

**Gerenciamento de estado.** O estado global (listas de tarefas e categorias) fica no `AppProvider` (`src/context/AppContext.tsx`), com `useState` para `tasks` e `categories`. O provider expõe esses dois arrays e a função `refreshData()` (linhas 18–27), que relê **tudo** do SQLite (`Queries.getTasks` + `Queries.getCategories`) e chama `setTasks` / `setCategories`. Qualquer tela que use o hook `useApp()` é re-renderizada quando esses estados mudam. O `useEffect` da linha 29 faz a carga inicial.

O estado local de cada tela fica em `useState`: por exemplo, os filtros de status e categoria em `index.tsx` (linhas 15–16) e os campos do formulário em `task.tsx` (linhas 16–23).

**Como a UI é atualizada.** O padrão é sempre o mesmo: escrever no banco e depois chamar `await refreshData()`. A UI nunca é alterada diretamente; o SQLite é a fonte da verdade.

- **Criar tarefa:** `handleSave` em `task.tsx` chama `Queries.addTask` (linha 58) e depois `refreshData()` (linha 61).
- **Editar tarefa:** mesmo `handleSave`, mas com `Queries.updateTask` (linha 55), pois existe `id`.
- **Marcar como concluída:** `toggleTaskCompletion` em `index.tsx` (linhas 18–23) chama `Queries.updateTask` com `completed` invertido, reagenda/cancela a notificação e chama `refreshData()`.

A lista aplica os filtros **em memória** a cada render (`filteredTasks`, `index.tsx` linhas 25–30), então trocar o filtro não consulta o banco de novo.

**Padrão arquitetural.** Não há um padrão formal como MVVM ou Redux. O que existe é: **React Context como store global** + uma **camada simples de acesso a dados** (`queries.ts`, com funções que recebem o `db`) + **roteamento por arquivos** do Expo Router. Não há ORM, nem `useLiveQuery`, nem Zustand/Redux. A abordagem é simples e adequada ao tamanho do app, com o custo de recarregar todas as linhas a cada operação.

---

## 3. SQLite Persistence

How is SQLite used in the application?

Identify:

- where the database is created;
- how tasks and categories are stored;
- where create, read, update, and delete operations are implemented.

---

> **Resposta**

**Uso geral.** O app usa a biblioteca `expo-sqlite` com a API assíncrona e SQL puro (sem ORM). Os dados persistem em um arquivo local, então sobrevivem ao fechamento do app.

**Onde o banco é criado.** Em `src/app/_layout.tsx` (linha 35): `<SQLiteProvider databaseName="todoapp.db" onInit={initializeDb}>`. O provider abre (ou cria) o arquivo `todoapp.db` e executa `initializeDb` (`src/db/database.ts`, linhas 3–29), que roda `PRAGMA journal_mode = WAL`, `PRAGMA foreign_keys = ON` e os `CREATE TABLE IF NOT EXISTS`. O `foreign_keys = ON` é importante: sem ele o `ON DELETE SET NULL` não funcionaria. As telas obtêm a conexão com `useSQLiteContext()` e a passam como argumento para as funções de `queries.ts`.

**Como os dados são armazenados** (`database.ts`, linhas 9–23):

- `categories`: `id TEXT PRIMARY KEY`, `name TEXT NOT NULL`.
- `tasks`: `id TEXT PRIMARY KEY`, `title TEXT NOT NULL`, `description TEXT`, `completed INTEGER NOT NULL DEFAULT 0`, `dueDateTime TEXT`, `createdAt TEXT NOT NULL`, `categoryId TEXT`, com `FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL`.
- Conversões: `completed` é guardado como 0/1 e convertido para `boolean` em `getTasks` (linha 38) e de volta em `addTask`/`updateTask`; as datas são guardadas como string ISO-8601; os IDs são strings geradas no código da UI.

**Onde ficam as operações CRUD** (todas em `src/db/queries.ts`, com consultas parametrizadas `?`):

| Operação | Tarefas | Categorias |
|---|---|---|
| Create | `addTask` (l. 42) | `addCategory` (l. 22) |
| Read | `getTasks` (l. 34, ordena por `createdAt DESC`) | `getCategories` (l. 18, ordena por nome) |
| Update | `updateTask` (l. 57) | `renameCategory` (l. 26) |
| Delete | `deleteTask` (l. 71) | `deleteCategory` (l. 30) |

---

## 4. Follow One Operation

Trace what happens when the user creates a new task.

Start from pressing **Save** and follow the execution until:

1. the task is stored in SQLite;
2. the task appears in the task list;
3. a notification is scheduled, if a due date exists.

Describe the main functions/components involved.

---

> **Resposta**

Fluxo ao criar uma tarefa (o usuário abre o editor pelo botão "+" da lista e preenche o formulário):

1. **Botão Save → `handleSave`** (`src/app/task.tsx`, linha 168 → função nas linhas 38–63). Valida que o título não está vazio (senão mostra `Alert`). Monta o objeto `Task`: como não há `id` na rota, gera um novo (`Date.now()` + sufixo aleatório), define `createdAt` com a data atual e converte `dueDateTime` para ISO (`toISOString()`), ou `null` se não houver data.

2. **Gravação no SQLite.** Sem `id`, executa `Queries.addTask(db, task)` (`task.tsx` linha 58), que roda o `INSERT INTO tasks ...` em `src/db/queries.ts` (linhas 42–55), convertendo `completed` para 0/1.

3. **Notificação.** `await scheduleTaskNotification(task)` (`task.tsx` linha 60 → `src/utils/notifications.ts`, linhas 13–44). A função importa `expo-notifications`, cancela qualquer notificação com o mesmo id, retorna se a tarefa estiver concluída e, se `dueDateTime` for futura, chama `Notifications.scheduleNotificationAsync` com gatilho do tipo `DATE` e `identifier: task.id`. Sem data de vencimento (ou data passada), nada é agendado.

4. **Atualização da lista.** `await refreshData()` (`task.tsx` linha 61) executa `getTasks` + `getCategories` (`AppContext.tsx`, linhas 18–27) e atualiza o estado do contexto. Como a lista (`index.tsx`) usa `useApp()`, ela re-renderiza: `filteredTasks` é recalculado e o `FlatList` exibe a nova tarefa (no topo, pois a query ordena por `createdAt DESC`).

5. **Fechar o editor.** `router.back()` (linha 62) fecha a tela modal e volta à lista.

Principais peças: `TaskScreen.handleSave` (`task.tsx`), `Queries.addTask` (`queries.ts`), `scheduleTaskNotification` (`notifications.ts`), `refreshData` / `useApp` (`AppContext.tsx`) e `TaskListScreen` (`index.tsx`).

---

## 5. Navigation

How does navigation between screens work?

In particular:

- how does the app navigate from the task list to the task editor?
- when editing a task, what information is passed between screens?

For example: task ID, full object, shared state, or another approach.

---

> **Resposta**

**Como funciona.** O app usa **Expo Router** (roteamento baseado em arquivos). Cada arquivo em `src/app/` é uma rota (`index` → `/`, `task` → `/task`, `categories` → `/categories`), e `src/app/_layout.tsx` (linhas 37–41) declara um `Stack` com as três telas. O editor é apresentado como modal (`presentation: 'modal'`).

**Da lista para o editor** (`src/app/index.tsx`):

- Editar tarefa existente: ``router.push(`/task?id=${item.id}`)`` ao tocar no card (linha 74).
- Criar nova tarefa: `<Link href="/task" asChild>` no botão "+" (linha 101), sem parâmetro.
- Ir para categorias: `<Link href="/categories" asChild>` (linha 96).
- Voltar: `router.back()` no Save/Cancel/Delete do editor.

**O que é passado ao editar.** Apenas o **ID da tarefa**, como parâmetro de rota (query string). O editor lê com `useLocalSearchParams<{ id?: string }>()` (`task.tsx`, linha 11) e busca o objeto completo no **estado compartilhado**: `tasks.find(t => t.id === id)` (linha 27), preenchendo os campos do formulário no `useEffect` (linhas 25–36). Ou seja, a abordagem é **ID por rota + estado compartilhado (AppContext)**. A presença do `id` define o modo: com `id` é edição, sem `id` é criação. O editor não devolve dados à lista; a lista se atualiza porque o contexto muda após `refreshData()`.

---

## 6. Notifications

How are task reminders implemented?

Explain:

- how a notification is scheduled;
- how it is associated with a task;
- what happens when the due date changes;
- what happens when the task is completed or deleted.

---

> **Resposta**

**Permissão.** Ao iniciar, `src/app/_layout.tsx` (linhas 7–32) configura `setNotificationHandler`, consulta `getPermissionsAsync()` e, se não estiver concedida, chama `requestPermissionsAsync()`. Tudo dentro de `try/catch`, então uma falha não derruba o app. Em caso de negação, o app não quebra, mas também **não avisa o usuário** de que os lembretes não vão aparecer.

**Agendamento.** `scheduleTaskNotification(task)` em `src/utils/notifications.ts` (linhas 13–44):

1. cancela qualquer notificação anterior da tarefa;
2. se a tarefa estiver concluída, para aí;
3. se `dueDateTime` estiver no futuro, chama `scheduleNotificationAsync` com `content` (`title: 'Task Reminder'`, `body: 'Reminder: <título>'`, `data: { taskId }`) e `trigger` do tipo `DATE`.

São notificações **locais**, sem servidor de push.

**Associação com a tarefa.** O identificador da notificação é o próprio `task.id` (`identifier: task.id`). Não existe coluna extra no banco; para cancelar basta chamar `cancelScheduledNotificationAsync(task.id)`. O `data: { taskId }` também é enviado, mas nenhum código trata o toque na notificação.

**Quando a data muda.** Toda gravação no editor chama `scheduleTaskNotification` (`task.tsx`, linha 60). Como a função sempre cancela antes de agendar, o lembrete antigo é substituído pelo novo. Se a data foi removida (`null`), ele apenas cancela e nada é reagendado.

**Quando é concluída ou excluída.**

- **Concluída:** o checkbox da lista (`index.tsx`, linhas 18–23) e o `Switch` do editor (via Save) passam por `scheduleTaskNotification` com `completed = true`, que cancela e retorna. Se a tarefa voltar a *pendente* com data ainda futura, o lembrete é agendado de novo.
- **Excluída:** `handleDelete` (`task.tsx`, linhas 65–81) apaga do SQLite e chama `cancelTaskNotification(id)` (`notifications.ts`, linhas 46–55).

**Observação.** O arquivo `src/context/NotificationContext.tsx` implementa uma abordagem alternativa (verificação a cada 30 s com `Alert` dentro do app, além da notificação nativa), mas o `NotificationProvider` **nunca é montado** no `_layout.tsx` e nada importa `useNotifications`. É código morto: o que realmente roda é `utils/notifications.ts`.

---

## 7. Agent Decisions

Identify at least **two important decisions made by the coding agent that were not explicitly specified in the assignment**.

Examples:

- architecture;
- libraries;
- state-management strategy;
- navigation approach;
- SQLite abstraction;
- project structure.

For each one, explain what the agent chose.

---

> **Resposta**

O `SPEC.md` deixa quase tudo em aberto ("você pode escolher bibliotecas, estrutura, arquitetura..."). Principais decisões do agente:

1. **Gerenciamento de estado: React Context + `refreshData()` manual.** O agente criou o `AppContext` que recarrega tarefas e categorias do banco após cada operação, em vez de usar Redux/Zustand ou consultas reativas (`useLiveQuery` do expo-sqlite). (`src/context/AppContext.tsx`; `BUILD_LOG.md`, "State-management strategy".)

2. **Abstração do SQLite: SQL puro com `expo-sqlite` + `SQLiteProvider`.** Sem ORM (como Drizzle) e sem classes de repositório: o agente criou funções soltas em `queries.ts`, que recebem o `db` como parâmetro, e o schema é criado em `onInit` do provider (`database.ts`).

3. **Exclusão de categoria: `ON DELETE SET NULL`.** O spec pedia que o agente decidisse; ele escolheu que as tarefas fiquem sem categoria, ativando `PRAGMA foreign_keys = ON`. Alternativas citadas no spec (bloquear a exclusão, reatribuir) foram descartadas.

4. **Filtros em memória.** Status e categoria são `useState` em `index.tsx` e aplicados com `.filter()` sobre a lista já carregada, em vez de consultas SQL com `WHERE`.

5. **Estratégia de notificação: identificador = ID da tarefa.** Em vez de guardar o ID da notificação em uma coluna nova, o agente reutilizou `task.id` como `identifier` do `expo-notifications`, com gatilho `DATE` (`utils/notifications.ts`).

6. **Navegação: só o ID viaja pela rota** (`/task?id=...`) e o editor busca o objeto no contexto; o editor é apresentado como modal.

7. **IDs e formatos de dados.** IDs como texto gerados por `Date.now()` + `Math.random()` (o agente começou com `uuid` e removeu por causa de um travamento, ver resposta 8); datas como string ISO e `completed` como inteiro 0/1.

8. **Bibliotecas extras:** `@react-native-community/datetimepicker` para escolher data/hora. O agente também instalou `date-fns` e `uuid`, mas nenhum dos dois é importado em `src/` (continuam apenas no `package.json`).

Obs.: o uso do **Expo Router** não foi uma escolha livre do agente, pois já vinha determinado pelo `AGENTS.md` ("Use Expo Router for all navigation").

---

## 8. BUILD_LOG Analysis

Using `BUILD_LOG.md`, identify:

- one problem or bug encountered during development;
- how the agent attempted to solve it;
- whether the first solution worked;
- what was eventually done.

Then answer:

**What did the build log help you understand that would have been harder to discover by looking only at the final code?**

> **Resposta**
>
> O build log ajudou a entender o processo de desenvolvimento do projeto, as decisões tomadas pelo agente de IA e os problemas encontrados durante o desenvolvimento.

**Problema escolhido: o app não abria no Expo Go, inicialmente atribuído ao `expo-notifications`.**

- **Primeira tentativa:** o usuário relatou um erro ao abrir o app por "conflito" com a biblioteca de notificações. O agente envolveu todas as chamadas do `expo-notifications` em `try/catch`.
- **Segunda tentativa:** o erro registrado dizia que as push notifications do Android foram removidas do Expo Go a partir do SDK 53. O agente concluiu que seria preciso um *development build* (regra do `AGENTS.md`). O build local falhou, e o build na nuvem (EAS, perfil `preview`, `eas.json`) abortou por falta de login (`Not logged in`).
- **Terceira tentativa:** a pedido do usuário, que preferiu continuar no Expo Go, o agente desativou as notificações (substituiu por `console.log`). Surgiu então um novo problema: o app travava na splash screen. O agente removeu o pacote `uuid` (sem o polyfill `react-native-get-random-values` ele lança exceção ao carregar) e trocou por `Date.now()` + `Math.random()`.
- **Solução final:** outro modelo (o log registra Claude Opus 4.6 continuando o trabalho do Gemini 3.1 Pro) leu a documentação do SDK 57 e viu que só as notificações **remotas** foram removidas do Expo Go; as **locais** continuam funcionando. As causas reais eram o `uuid` sem polyfill e um `App.tsx`/`index.ts` antigos conflitando com `expo-router/entry`. Ele restaurou o `expo-notifications`, removeu o `index.ts` antigo e rodou `npx tsc --noEmit` sem erros.

**A primeira solução funcionou?** Não. O `try/catch` não atacava a causa real: o log não diz explicitamente que ele falhou, mas as entradas seguintes mostram que o problema continuou e que o diagnóstico inicial ("é a biblioteca de notificações") estava parcialmente errado.

**O que o build log ajudou a entender que seria difícil ver só no código final:**

- **Por que o código é tão defensivo.** No código final, os `import('expo-notifications')` dinâmicos e os `try/catch` em tudo pareciam excesso de cautela. O log mostra que são resquícios do incidente com o Expo Go.
- **Por que os IDs não usam `uuid`**, apesar de ele ainda estar no `package.json`: foi removido por causa do travamento na splash.
- **Que o diagnóstico inicial estava errado** e foi corrigido depois, algo invisível no código final, que só mostra o resultado.
- **Contexto de processo:** quais requisitos vieram do `AGENTS.md`, que houve troca de modelo no meio do trabalho e que o usuário decidiu priorizar o Expo Go em vez de esperar o build do EAS.
- **Que o log nem sempre bate com o código.** Por exemplo: o log diz que o banco é criado com `openDatabaseAsync`, mas o código usa `SQLiteProvider` com `onInit`; diz que o `uuid` foi removido, mas ele continua no `package.json`; e o `NotificationContext.tsx` existe sem ser mencionado no log. Por isso, o log ajuda a entender o histórico, mas precisa ser conferido contra o código. A conclusão "deve funcionar no Expo Go" também está registrada como expectativa ("should"), sem teste no aparelho.