// COSA FA: Operazioni CRUD sui drink (trova, crea, aggiorna, elimina)
// RELAZIONI: Usa db.js per connessione, restituisce oggetti Drink

const openDb = require('../db');
const Drink = require('../models/Drink');

class DrinksDao {

  // Trova tutti i drink con filtri opzionali
  static async findAll(filters = {}) {
    const db = await openDb();
    let sql = 'SELECT * FROM drinks WHERE 1=1';
    const params = [];

    // Filtro per tipo alcolico/analcolico
    if (filters.alcoholic !== undefined) {
      sql += ' AND is_alcoholic = ?';
      params.push(filters.alcoholic === 'true' || filters.alcoholic === true);
    }

    // Filtro per base spirit
    if (filters.baseSpirit) {
      sql += ' AND base_spirit = ?';
      params.push(filters.baseSpirit);
    }

    // Filtro per fascia di prezzo
    if (filters.minPrice) {
      sql += ' AND price >= ?';
      params.push(parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      sql += ' AND price <= ?';
      params.push(parseFloat(filters.maxPrice));
    }

    // Ordinamento
    const orderBy = filters.orderBy || 'name';
    const orderDir = filters.orderDir || 'ASC';
    sql += ` ORDER BY ${orderBy} ${orderDir}`;

    // Limit per paginazione
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(filters.limit));

      if (filters.offset) {
        sql += ' OFFSET ?';
        params.push(parseInt(filters.offset));
      }
    }

    const rows = await db.all(sql, params);
    await db.close();
    return rows.map(row => new Drink(row));
  }

  // Trova un drink per ID
  static async findById(id) {
    const db = await openDb();
    const row = await db.get('SELECT * FROM drinks WHERE id = ?', [id]);
    await db.close();
    return row ? new Drink(row) : null;
  }

  // Cerca drink per nome (ricerca testuale)
  static async searchByName(searchTerm) {
    const db = await openDb();
    const sql = 'SELECT * FROM drinks WHERE name LIKE ? OR description LIKE ? ORDER BY name';
    const searchPattern = `%${searchTerm}%`;
    const rows = await db.all(sql, [searchPattern, searchPattern]);
    await db.close();
    return rows.map(row => new Drink(row));
  }

  // Ottieni drink per tipo (alcolici o analcolici)
  static async findByType(isAlcoholic) {
    const db = await openDb();
    const sql = 'SELECT * FROM drinks WHERE is_alcoholic = ? ORDER BY name';
    const rows = await db.all(sql, [isAlcoholic]);
    await db.close();
    return rows.map(row => new Drink(row));
  }

  // Ottieni drink per base spirit
  static async findByBaseSpirit(baseSpirit) {
    const db = await openDb();
    const sql = 'SELECT * FROM drinks WHERE base_spirit = ? ORDER BY name';
    const rows = await db.all(sql, [baseSpirit]);
    await db.close();
    return rows.map(row => new Drink(row));
  }

  // Ottieni tutti i base spirits disponibili
  static async getBaseSpirits() {
    const db = await openDb();
    const rows = await db.all('SELECT DISTINCT base_spirit FROM drinks WHERE base_spirit IS NOT NULL ORDER BY base_spirit');
    await db.close();
    return rows.map(row => row.base_spirit);
  }

  // Ottieni drink per fascia di prezzo
  static async findByPriceRange(minPrice, maxPrice) {
    const db = await openDb();
    const sql = 'SELECT * FROM drinks WHERE price >= ? AND price <= ? ORDER BY price';
    const rows = await db.all(sql, [minPrice, maxPrice]);
    await db.close();
    return rows.map(row => new Drink(row));
  }

  // Ottieni drink consigliati (i più economici di ogni categoria)
  static async getRecommended(limit = 8) {
    const db = await openDb();
    // Prende i drink più economici: 4 alcolici e 4 analcolici
    const sql = `
      SELECT * FROM (
        SELECT * FROM drinks WHERE is_alcoholic = 1 ORDER BY price LIMIT ?
      )
      UNION ALL
      SELECT * FROM (
        SELECT * FROM drinks WHERE is_alcoholic = 0 ORDER BY price LIMIT ?
      )
      ORDER BY is_alcoholic DESC, price
    `;
    const halfLimit = Math.ceil(limit / 2);
    const rows = await db.all(sql, [halfLimit, halfLimit]);
    await db.close();
    return rows.map(row => new Drink(row));
  }

  // Crea un nuovo drink
  static async create(drinkData) {
    const {
      name, description, isAlcoholic, baseSpirit, price, imageUrl
    } = drinkData;

    const db = await openDb();
    const result = await db.run(
      `INSERT INTO drinks
       (name, description, is_alcoholic, base_spirit, price, image_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [name, description, isAlcoholic, baseSpirit, price, imageUrl]
    );
    await db.close();
    return result.lastID;
  }

  // Aggiorna un drink esistente (supporta aggiornamenti parziali)
  static async update(id, drinkData) {
    const db = await openDb();

    // Array per costruire la query dinamicamente
    const fieldsToUpdate = [];
    const params = [];

    // Mappa i campi del JSON ai nomi delle colonne del database
    const fieldMapping = {
      name: 'name',
      description: 'description',
      isAlcoholic: 'is_alcoholic',
      baseSpirit: 'base_spirit',
      price: 'price',
      imageUrl: 'image_url'
    };

    // Costruisci la query solo per i campi forniti
    for (const [jsonField, dbColumn] of Object.entries(fieldMapping)) {
      if (drinkData[jsonField] !== undefined) {
        fieldsToUpdate.push(`${dbColumn} = ?`);
        params.push(drinkData[jsonField]);
      }
    }

    // Verifica che ci sia almeno un campo da aggiornare
    if (fieldsToUpdate.length === 0) {
      await db.close();
      throw new Error('Nessun campo da aggiornare fornito');
    }

    // Aggiungi l'ID alla fine dei parametri
    params.push(id);

    // Costruisci e esegui la query dinamica
    const sql = `UPDATE drinks SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;

    try {
      const result = await db.run(sql, params);
      await db.close();
      return result.changes > 0;
    } catch (error) {
      await db.close();
      throw error;
    }
  }

  // Elimina un drink
  static async delete(id) {
    const db = await openDb();
    const result = await db.run('DELETE FROM drinks WHERE id = ?', [id]);
    await db.close();
    return result.changes > 0;
  }

  // Conta totale drink (per paginazione)
  static async count(filters = {}) {
    const db = await openDb();
    let sql = 'SELECT COUNT(*) as total FROM drinks WHERE 1=1';
    const params = [];

    if (filters.alcoholic !== undefined) {
      sql += ' AND is_alcoholic = ?';
      params.push(filters.alcoholic === 'true' || filters.alcoholic === true);
    }

    if (filters.baseSpirit) {
      sql += ' AND base_spirit = ?';
      params.push(filters.baseSpirit);
    }

    if (filters.minPrice) {
      sql += ' AND price >= ?';
      params.push(parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      sql += ' AND price <= ?';
      params.push(parseFloat(filters.maxPrice));
    }

    const result = await db.get(sql, params);
    await db.close();
    return result.total;
  }
// ==========================================
  // STATISTICHE PER ADMIN DASHBOARD
  // ==========================================

  static async getTotalCount() {
    try {
      const db = await openDb();
      const result = await db.get('SELECT COUNT(*) as count FROM drinks');
      await db.close();

      return result.count;
    } catch (error) {
      console.error('Error getting total drinks count:', error);
      throw error;
    }
  }

  static async getInventoryStats() {
    try {
      const db = await openDb();
      const result = await db.get(`
        SELECT
          COUNT(*) as total_drinks,
          COUNT(CASE WHEN is_alcoholic = 1 THEN 1 END) as alcoholic_drinks,
          COUNT(CASE WHEN is_alcoholic = 0 THEN 1 END) as non_alcoholic_drinks,
          COUNT(DISTINCT base_spirit) as total_spirits,
          AVG(price) as avg_price
        FROM drinks
      `);
      await db.close();

      return result;
    } catch (error) {
      console.error('Error getting drinks inventory stats:', error);
      throw error;
    }
  }

} // ← Fine della classe DrinksDao

// ==========================================
// EXPORTS
// ==========================================

module.exports = DrinksDao;
