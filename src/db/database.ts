import * as SQLite from 'expo-sqlite';

export async function initializeDb(db: SQLite.SQLiteDatabase) {
  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        completed INTEGER NOT NULL DEFAULT 0,
        dueDateTime TEXT,
        createdAt TEXT NOT NULL,
        categoryId TEXT,
        FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
      );
    `);
    console.log("Database initialized successfully!");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
}
