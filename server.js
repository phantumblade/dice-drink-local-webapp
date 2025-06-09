// server.js
const express = require('express');
const openDb  = require('./db');

async function init() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(express.json());
  app.use(express.static('public'));

  const db = await openDb();

  // 1) Creazione tabella products
  await db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category    TEXT    NOT NULL,
      name        TEXT    NOT NULL,
      description TEXT,
      price       REAL    NOT NULL,
      imageUrl    TEXT
    )
  `);

  // 2) Endpoint GET tutti i prodotti (con filtro facoltativo)
  app.get('/api/products', async (req, res) => {
    const { category } = req.query;
    let sql = 'SELECT * FROM products';
    const params = [];
    if (category) {
      sql += ' WHERE category = ?';
      params.push(category);
    }
    const rows = await db.all(sql, params);
    res.json(rows);
  });

  // 3) Endpoint POST per aggiungere un prodotto
  app.post('/api/products', async (req, res) => {
    const { category, name, description, price, imageUrl } = req.body;
    const result = await db.run(
      `INSERT INTO products (category, name, description, price, imageUrl)
       VALUES (?, ?, ?, ?, ?)`,
      [category, name, description, price, imageUrl]
    );
    res.status(201).json({ id: result.lastID });
  });

  // 4) Avvio server
  app.listen(port, () => {
    console.log(`Server avviato su http://localhost:${port}`);
  });
}

init().catch(err => {
  console.error(err);
  process.exit(1);
});
