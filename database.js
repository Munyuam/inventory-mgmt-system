const Database = require('better-sqlite3');
const path = require('node:path');
const bcrypt = require('bcrypt');

let db;

const initDb = (userDataPath) => {
  if (db) return db;
  const dbPath = path.join(userDataPath, 'inventory.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  console.log("database path: " + dbPath);

  // Initialize tables
  db.exec(`
      CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS suppliers (
      supplier_id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_name TEXT NOT NULL,
      phone TEXT,
      email TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
      product_id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_name TEXT NOT NULL,
      product_description TEXT,
      product_category TEXT NOT NULL,
      unit_price REAL
  );

  CREATE TABLE IF NOT EXISTS invoices (
      invoice_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      supplier_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      total_cost REAL,
      invoice_number TEXT,
      payment_terms TEXT,

      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
      invoice_items_id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_cost REAL NOT NULL,

      FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id),
      FOREIGN KEY (product_id) REFERENCES products(product_id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
      transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_item_id INTEGER,
      product_id INTEGER NOT NULL,
      transaction_date TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      transaction_description TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL,

      FOREIGN KEY (product_id) REFERENCES products(product_id),
      FOREIGN KEY (invoice_item_id) REFERENCES invoice_items(invoice_items_id)
  );
  `);

  return db;
};

async function getProducts(userDataPath) {
  if (!db) initDb(userDataPath);
  return db.prepare(`
    SELECT
      p.*,
      COALESCE(SUM(CASE WHEN t.transaction_type = 'Procurement' THEN t.quantity ELSE -t.quantity END), 0) AS quantity,
      COALESCE(SUM(CASE WHEN t.transaction_type = 'Issue'       THEN t.quantity ELSE 0           END), 0) AS issued_count,
      s.supplier_name,
      inv.invoice_number
    FROM products p
    LEFT JOIN transactions t ON p.product_id = t.product_id
    -- Get the most recent invoice item for this product
    LEFT JOIN invoice_items ii ON ii.invoice_items_id = (
      SELECT invoice_items_id FROM invoice_items
      WHERE product_id = p.product_id
      ORDER BY invoice_items_id DESC
      LIMIT 1
    )
    LEFT JOIN invoices  inv ON inv.invoice_id  = ii.invoice_id
    LEFT JOIN suppliers s   ON s.supplier_id   = inv.supplier_id
    GROUP BY p.product_id
  `).all();
}


async function addProduct(userDataPath, name, price, category = 'General') {
  if (!db) initDb(userDataPath);
  const stmt = db.prepare('INSERT INTO products (product_name, unit_price, product_category) VALUES (?, ?, ?)');
  return stmt.run(name, price, category);
}

// --- Auth Logic ---
async function registerUser(userDataPath, username, email, password) {
  if (!db) initDb(userDataPath);
  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    const stmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
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

  const match = await bcrypt.compare(password, user.password);
  if (!match) return { success: false, error: 'Invalid password' };

  return { success: true, user: { id: user.id, username: user.username, email: user.email } };
}

async function saveFullProcurement(userDataPath, data) {
  if (!db) initDb(userDataPath);

  const { supplier, invoice, lineItems, user_id } = data;
  console.log('--- START Procurement DB Transaction ---');
  console.log('Input Data:', JSON.stringify({ supplier, user_id, itemsCount: lineItems.length }, null, 2));

  const transaction = db.transaction(() => {
    // 0. Verify User Existence (Critical for FK)
    const activeUserId = user_id || 1;
    const userCheck = db.prepare('SELECT id FROM users WHERE id = ?').get(activeUserId);
    console.log(`[Step 0] User Verification - ID: ${activeUserId}, Found: ${!!userCheck}`);
    if (!userCheck) {
      console.error(`ERROR: User ID ${activeUserId} does not exist in the database. Invoices table will fail FK check.`);
    }

    // 1. Handle Supplier
    let supplierId;
    const existingSupplier = db.prepare('SELECT supplier_id FROM suppliers WHERE supplier_name = ?').get(supplier.name);
    if (existingSupplier) {
      supplierId = existingSupplier.supplier_id;
      console.log(`[Step 1] Supplier found: "${supplier.name}" (ID: ${supplierId})`);
    } else {
      const res = db.prepare('INSERT INTO suppliers (supplier_name, phone, email) VALUES (?, ?, ?)').run(
        supplier.name, supplier.phone || '', supplier.email);
      supplierId = res.lastInsertRowid;
      console.log(`[Step 1] New supplier created: "${supplier.name}" (ID: ${supplierId})`);
    }

    // 2. Handle Invoice
    console.log(`[Step 2] Attempting Invoice Insert: User=${activeUserId}, Supplier=${supplierId}, No=${invoice.number}`);
    const invRes = db.prepare('INSERT INTO invoices (user_id, supplier_id, invoice_number, date, payment_terms, total_cost) VALUES (?, ?, ?, ?, ?, ?)').run(
      activeUserId, supplierId, invoice.number, invoice.date, invoice.terms || 'Cash', invoice.total_cost || 0);
    const invoiceId = invRes.lastInsertRowid;
    console.log(`[Step 2] Invoice saved (ID: ${invoiceId})`);

    // 3. Handle Items and Products
    let itemIdx = 0;
    for (const item of lineItems) {
      itemIdx++;
      console.log(`[Step 3.${itemIdx}] Processing Item: "${item.name}"`);

      // Update/Insert Products
      let productId;
      const existingProduct = db.prepare('SELECT product_id FROM products WHERE product_name = ?').get(item.name);
      if (existingProduct) {
        productId = existingProduct.product_id;
        console.log(`[Step 3.${itemIdx}] Updating existing product: ${item.name} (ID: ${productId})`);
        db.prepare('UPDATE products SET unit_price = ?, product_category = ?, product_description = ? WHERE product_id = ?').run(
          item.price, item.category || 'General', item.description || null, productId
        );
      } else {
        const prodRes = db.prepare('INSERT INTO products (product_name, product_description, unit_price, product_category) VALUES (?, ?, ?, ?)').run(
          item.name, item.description || null, item.price, item.category || 'General'
        );
        productId = prodRes.lastInsertRowid;
        console.log(`[Step 3.${itemIdx}] Created new product: ${item.name} (ID: ${productId})`);
      }

      // Save line item
      console.log(`[Step 3.${itemIdx}] Inserting Invoice Item: Invoice=${invoiceId}, Product=${productId}`);
      const itemRes = db.prepare('INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_cost) VALUES (?, ?, ?, ?)').run(
        invoiceId, productId, item.qty, item.price
      );
      const invoiceItemId = itemRes.lastInsertRowid;
      console.log(`[Step 3.${itemIdx}] Invoice Item saved (ID: ${invoiceItemId})`);

      // 4. Log Transaction record
      console.log(`[Step 4.${itemIdx}] Logging Transaction: ItemID=${invoiceItemId}, ProdID=${productId}`);
      try {
        db.prepare(`
          INSERT INTO transactions (
            invoice_item_id, product_id, transaction_date, transaction_type, transaction_description, quantity, unit_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          invoiceItemId, productId, invoice.date, 'Procurement', `Purchased from ${supplier.name}`, item.qty, item.price
        );
        console.log(`[Step 4.${itemIdx}] Transaction record created.`);
      } catch (trErr) {
        console.error(`[Step 4.${itemIdx}] ERROR in Transactions table insert:`, trErr.message);
        console.log('Debug Context:', { invoiceItemId, productId, itemIdx });
        throw trErr;
      }
    }

    console.log('--- Procurement DB Transaction COMPLETE ---');
    return { success: true };
  });

  try {
    return transaction();
  } catch (err) {
    console.error('--- Procurement DB Transaction FAILED ---');
    console.error('Final Error Message:', err.message);
    return { success: false, error: err.message };
  }
}

async function issueProduct(userDataPath, data) {
  if (!db) initDb(userDataPath);
  const { product_id, quantity, transaction_date, transaction_description, unit_price } = data;

  const stmt = db.prepare(`
    INSERT INTO transactions (
      product_id, transaction_date, transaction_type, transaction_description, quantity, unit_price
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  return stmt.run(product_id, transaction_date, 'Issue', transaction_description || 'Stock Issued', quantity, unit_price);
}

module.exports = {
  initDb,
  // --- Products Logic ---
  getProducts,
  addProduct,
  issueProduct,
  saveFullProcurement,
  // --- Auth Logic ---
  registerUser,
  authenticateUser
};
