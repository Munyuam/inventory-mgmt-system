const Database = require('better-sqlite3');
const path = require('node:path');
const { app } = require('electron');

const dbPath = path.join(app.getPath('userData'), 'inventory.db');
const db = new Database(dbPath);
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

module.exports = {
    db,
    getItems: () => {
        return db.prepare('SELECT * FROM items').all();
    },
    addItem: (name, quantity, price) => {
        const stmt = db.prepare('INSERT INTO items (name, quantity, price) VALUES (?, ?, ?)');
        return stmt.run(name, quantity, price);
    }
};
