const Database = require('better-sqlite3');
const path = require('node:path');
const bcrypt = require('bcrypt');

let db;

const initDb = (userDataPath) => {
  if (db) return db;
  const dbPath = path.join(userDataPath, 'inventory.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  console.log("database path: " + dbPath);

  // Initialize tables
  db.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        quantity INTEGER NOT NULL DEFAULT 0,
        issued_count INTEGER NOT NULL DEFAULT 0,
        price REAL NOT NULL DEFAULT 0.0
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  return db;
};

async function getItems(userDataPath) {
  if (!db) initDb(userDataPath);
  return db.prepare('SELECT * FROM items').all();
}

async function addItem(userDataPath, name, quantity, price, category = 'General') {
  if (!db) initDb(userDataPath);
  const stmt = db.prepare('INSERT INTO items (name, quantity, price, category) VALUES (?, ?, ?, ?)');
  return stmt.run(name, quantity, price, category);
}

// --- Auth Logic ---
async function registerUser(userDataPath, username, email, password) {
  if (!db) initDb(userDataPath);
  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    const stmt = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
    stmt.run(username, email, hash);
    return { success: true };
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      if (error.message.includes('username')) return { success: false, error: 'Username already exists' };
      if (error.message.includes('email')) return { success: false, error: 'Email already exists' };
    }
    return { success: false, error: 'Registration failed' };
  }
}

async function authenticateUser(userDataPath, username, password) {
  if (!db) initDb(userDataPath);
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return { success: false, error: 'User not found' };

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return { success: false, error: 'Invalid password' };

  return { success: true, user: { id: user.id, username: user.username, email: user.email } };
}

module.exports = {
  initDb,
  // --- Items Logic ---
  getItems,
  addItem,
  // --- Auth Logic ---
  registerUser,
  authenticateUser
};
