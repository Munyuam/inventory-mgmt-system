const Database = require('better-sqlite3');
const path = require('node:path');

let db;

const initDb = (userDataPath) => {
  if (db) return db;
  const dbPath = path.join(userDataPath, 'inventory.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Initialize tables
  db.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        price REAL NOT NULL DEFAULT 0.0
      )
    `);
  return db;
};

module.exports = {
  initDb,
  getItems: (userDataPath) => {
    if (!db) initDb(userDataPath);
    return db.prepare('SELECT * FROM items').all();
  },
  addItem: (userDataPath, name, quantity, price) => {
    if (!db) initDb(userDataPath);
    const stmt = db.prepare('INSERT INTO items (name, quantity, price) VALUES (?, ?, ?)');
    return stmt.run(name, quantity, price);
  }
};
