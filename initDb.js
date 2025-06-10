// initDb.js
const openDb = require('./db');

async function init() {
  const db = await openDb();

  // Ricrea da zero la tabella products
  await db.exec(`DROP TABLE IF EXISTS products;`);
  await db.exec(`
    CREATE TABLE products (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT    NOT NULL,
      category       TEXT    NOT NULL,
      description    TEXT,
      min_players    INTEGER NOT NULL,     -- minimo giocatori
      max_players    INTEGER NOT NULL,     -- massimo giocatori
      rental_price   REAL    NOT NULL,     -- prezzo noleggio serata
      purchase_price REAL,                  -- prezzo acquisto (opzionale)
      image_url      TEXT
    );
  `);

  // Esempio di popolamento
  const sample = [
    {
      name: 'Catan',
      category: 'giochi',
      description: 'Strategia e commercio su isola di Catan.',
      min_players: 3,
      max_players: 4,
      rental_price: 8.00,
      purchase_price: 29.90,
      image_url: '/assets/GameCatalog.jpg'
    },
    {
      name: 'Negroni',
      category: 'drink',
      description: 'Gin, vermouth rosso e Campari.',
      min_players: 1,
      max_players: 1,
      rental_price: 0.00,
      purchase_price: null,
      image_url: '/assets/GameCatalog.jpg'
    },
    {
      name: 'Patatine Fritte',
      category: 'snack',
      description: 'Taglio rustico con ketchup.',
      min_players: 1,
      max_players: 8,
      rental_price: 0.00,
      purchase_price: null,
      image_url: '/assets/GameCatalog.jpg'
    }
  ];

  const stmt = await db.prepare(`
    INSERT INTO products
      (name, category, description, min_players, max_players, rental_price, purchase_price, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of sample) {
    await stmt.run(
      p.name, p.category, p.description,
      p.min_players, p.max_players,
      p.rental_price, p.purchase_price, p.image_url
    );
  }
  await stmt.finalize();

  console.log('✅ Tabella products (con min/max giocatori e prezzo noleggio) inizializzata.');
  await db.close();
}

init().catch(console.error);
