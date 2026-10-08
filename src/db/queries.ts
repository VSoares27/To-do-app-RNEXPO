import { SQLiteDatabase } from 'expo-sqlite';

export type Category = {
  id: string;
  name: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  dueDateTime: string | null;
  createdAt: string;
  categoryId: string | null;
};

export async function getCategories(db: SQLiteDatabase): Promise<Category[]> {
  return await db.getAllAsync<Category>('SELECT * FROM categories ORDER BY name ASC');
}

export async function addCategory(db: SQLiteDatabase, id: string, name: string) {
  await db.runAsync('INSERT INTO categories (id, name) VALUES (?, ?)', [id, name]);
}

export async function renameCategory(db: SQLiteDatabase, id: string, name: string) {
  await db.runAsync('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
}

export async function deleteCategory(db: SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

export async function getTasks(db: SQLiteDatabase): Promise<Task[]> {
  const tasks = await db.getAllAsync<any>('SELECT * FROM tasks ORDER BY createdAt DESC');
  return tasks.map(t => ({
    ...t,
    completed: t.completed === 1
  }));
}

export async function addTask(db: SQLiteDatabase, task: Task) {
  await db.runAsync(
    'INSERT INTO tasks (id, title, description, completed, dueDateTime, createdAt, categoryId) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      task.id,
      task.title,
      task.description,
      task.completed ? 1 : 0,
      task.dueDateTime,
      task.createdAt,
      task.categoryId
    ]
  );
}

export async function updateTask(db: SQLiteDatabase, task: Task) {
  await db.runAsync(
    'UPDATE tasks SET title = ?, description = ?, completed = ?, dueDateTime = ?, categoryId = ? WHERE id = ?',
    [
      task.title,
      task.description,
      task.completed ? 1 : 0,
      task.dueDateTime,
      task.categoryId,
      task.id
    ]
  );
}

export async function deleteTask(db: SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
}

