// daos/productsDao.js
const openDb = require('../db');
const Product = require('../models/Products');

class ProductsDao {
  static async findAll(category) {
    const db = await openDb();
    let sql = 'SELECT * FROM products';
    const params = [];
    if (category) {
      sql += ' WHERE category = ?';
      params.push(category);
    }
    const rows = await db.all(sql, params);
    await db.close();
    return rows.map(r => new Product(r));
  }

  static async create(data) {
    const { name, category, description, minPlayers, maxPlayers, rentalPrice, purchasePrice, imageUrl } = data;
    const db = await openDb();
    const result = await db.run(
      `INSERT INTO products
         (name, category, description, min_players, max_players, rental_price, purchase_price, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, category, description, minPlayers, maxPlayers, rentalPrice, purchasePrice, imageUrl]
    );
    await db.close();
    return result.lastID;
  }
}

module.exports = ProductsDao;
