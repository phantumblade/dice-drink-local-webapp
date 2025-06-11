// COSA FA: Operazioni CRUD sugli snack (trova, crea, aggiorna, elimina)
// RELAZIONI: Usa db.js per connessione, restituisce oggetti Snack

const openDb = require('../db');
const Snack = require('../models/Snack');

class SnacksDao {

  // Trova tutti gli snack con filtri opzionali
  static async findAll(filters = {}) {
    const db = await openDb();
    let sql = 'SELECT * FROM snacks WHERE 1=1';
    const params = [];

    // Filtro per tipo dolce/salato
    if (filters.sweet !== undefined) {
      sql += ' AND is_sweet = ?';
      params.push(filters.sweet === 'true' || filters.sweet === true);
    }

    // Filtro per ingrediente principale
    if (filters.mainIngredient) {
      sql += ' AND main_ingredient = ?';
      params.push(filters.mainIngredient);
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

    // Filtro per gioco suggerito
    if (filters.suggestedGame) {
      sql += ' AND suggested_game LIKE ?';
      params.push(`%${filters.suggestedGame}%`);
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
    return rows.map(row => new Snack(row));
  }

  // Trova uno snack per ID
  static async findById(id) {
    const db = await openDb();
    const row = await db.get('SELECT * FROM snacks WHERE id = ?', [id]);
    await db.close();
    return row ? new Snack(row) : null;
  }

  // Cerca snack per nome (ricerca testuale)
  static async searchByName(searchTerm) {
    const db = await openDb();
    const sql = 'SELECT * FROM snacks WHERE name LIKE ? OR description LIKE ? ORDER BY name';
    const searchPattern = `%${searchTerm}%`;
    const rows = await db.all(sql, [searchPattern, searchPattern]);
    await db.close();
    return rows.map(row => new Snack(row));
  }

  // Ottieni snack per tipo (dolci o salati)
  static async findByType(isSweet) {
    const db = await openDb();
    const sql = 'SELECT * FROM snacks WHERE is_sweet = ? ORDER BY name';
    const rows = await db.all(sql, [isSweet]);
    await db.close();
    return rows.map(row => new Snack(row));
  }

  // Ottieni snack dolci
  static async findSweet() {
    return this.findByType(true);
  }

  // Ottieni snack salati
  static async findSavory() {
    return this.findByType(false);
  }

  // Ottieni snack per ingrediente principale
  static async findByIngredient(mainIngredient) {
    const db = await openDb();
    const sql = 'SELECT * FROM snacks WHERE main_ingredient = ? ORDER BY name';
    const rows = await db.all(sql, [mainIngredient]);
    await db.close();
    return rows.map(row => new Snack(row));
  }

  // Ottieni tutti gli ingredienti principali disponibili
  static async getMainIngredients() {
    const db = await openDb();
    const rows = await db.all('SELECT DISTINCT main_ingredient FROM snacks WHERE main_ingredient IS NOT NULL ORDER BY main_ingredient');
    await db.close();
    return rows.map(row => row.main_ingredient);
  }

  // Ottieni snack per fascia di prezzo
  static async findByPriceRange(minPrice, maxPrice) {
    const db = await openDb();
    const sql = 'SELECT * FROM snacks WHERE price >= ? AND price <= ? ORDER BY price';
    const rows = await db.all(sql, [minPrice, maxPrice]);
    await db.close();
    return rows.map(row => new Snack(row));
  }

  // Ottieni snack consigliati (i più economici di ogni categoria)
  static async getRecommended(limit = 6) {
    const db = await openDb();
    // Prende gli snack più economici: 3 dolci e 3 salati
    const sql = `
      SELECT * FROM (
        SELECT * FROM snacks WHERE is_sweet = 1 ORDER BY price LIMIT ?
      )
      UNION ALL
      SELECT * FROM (
        SELECT * FROM snacks WHERE is_sweet = 0 ORDER BY price LIMIT ?
      )
      ORDER BY is_sweet DESC, price
    `;
    const halfLimit = Math.ceil(limit / 2);
    const rows = await db.all(sql, [halfLimit, halfLimit]);
    await db.close();
    return rows.map(row => new Snack(row));
  }

  // Ottieni snack per tipologia di gioco
  static async findByGameType(gameType) {
    const db = await openDb();
    const sql = 'SELECT * FROM snacks WHERE suggested_game LIKE ? ORDER BY name';
    const rows = await db.all(sql, [`%${gameType}%`]);
    await db.close();
    return rows.map(row => new Snack(row));
  }

  // Ottieni snack "game-friendly" (facili da mangiare durante il gioco)
  static async getGameFriendly() {
    const db = await openDb();
    // Ingredienti che non sporcano: olive, mais, farina (biscotti)
    const sql = `
      SELECT * FROM snacks
      WHERE main_ingredient IN ('olive', 'mais', 'farina')
      ORDER BY price
    `;
    const rows = await db.all(sql);
    await db.close();
    return rows.map(row => new Snack(row));
  }

  // Ottieni snack per drink consigliato
  static async findBySuggestedDrink(drinkName) {
    const db = await openDb();
    const sql = 'SELECT * FROM snacks WHERE suggested_drink LIKE ? ORDER BY name';
    const rows = await db.all(sql, [`%${drinkName}%`]);
    await db.close();
    return rows.map(row => new Snack(row));
  }

  // Ottieni snack per momento della giornata (basato su logica del modello)
  static async getByTime(timeOfDay) {
    const db = await openDb();
    let sql;

    switch(timeOfDay.toLowerCase()) {
      case 'aperitivo':
        sql = 'SELECT * FROM snacks WHERE main_ingredient = "olive" OR is_sweet = 0 ORDER BY price';
        break;
      case 'merenda':
        sql = 'SELECT * FROM snacks WHERE is_sweet = 1 AND main_ingredient != "mascarpone" ORDER BY price';
        break;
      case 'fine serata':
        sql = 'SELECT * FROM snacks WHERE main_ingredient = "mascarpone" ORDER BY price';
        break;
      default:
        sql = 'SELECT * FROM snacks ORDER BY name';
    }

    const rows = await db.all(sql);
    await db.close();
    return rows.map(row => new Snack(row));
  }

  // Crea un nuovo snack
  static async create(snackData) {
    const {
      name, description, isSweet, mainIngredient, price,
      suggestedGame, suggestedDrink, imageUrl
    } = snackData;

    const db = await openDb();
    const result = await db.run(
      `INSERT INTO snacks
       (name, description, is_sweet, main_ingredient, price, suggested_game, suggested_drink, image_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [name, description, isSweet, mainIngredient, price, suggestedGame, suggestedDrink, imageUrl]
    );
    await db.close();
    return result.lastID;
  }

  // Aggiorna uno snack esistente (supporta aggiornamenti parziali)
  static async update(id, snackData) {
    const db = await openDb();

    // Array per costruire la query dinamicamente
    const fieldsToUpdate = [];
    const params = [];

    // Mappa i campi del JSON ai nomi delle colonne del database
    const fieldMapping = {
      name: 'name',
      description: 'description',
      isSweet: 'is_sweet',
      mainIngredient: 'main_ingredient',
      price: 'price',
      suggestedGame: 'suggested_game',
      suggestedDrink: 'suggested_drink',
      imageUrl: 'image_url'
    };

    // Costruisci la query solo per i campi forniti
    for (const [jsonField, dbColumn] of Object.entries(fieldMapping)) {
      if (snackData[jsonField] !== undefined) {
        fieldsToUpdate.push(`${dbColumn} = ?`);
        params.push(snackData[jsonField]);
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
    const sql = `UPDATE snacks SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;

    try {
      const result = await db.run(sql, params);
      await db.close();
      return result.changes > 0;
    } catch (error) {
      await db.close();
      throw error;
    }
  }

  // Elimina uno snack
  static async delete(id) {
    const db = await openDb();
    const result = await db.run('DELETE FROM snacks WHERE id = ?', [id]);
    await db.close();
    return result.changes > 0;
  }

  // Conta totale snack (per paginazione)
  static async count(filters = {}) {
    const db = await openDb();
    let sql = 'SELECT COUNT(*) as total FROM snacks WHERE 1=1';
    const params = [];

    if (filters.sweet !== undefined) {
      sql += ' AND is_sweet = ?';
      params.push(filters.sweet === 'true' || filters.sweet === true);
    }

    if (filters.mainIngredient) {
      sql += ' AND main_ingredient = ?';
      params.push(filters.mainIngredient);
    }

    if (filters.minPrice) {
      sql += ' AND price >= ?';
      params.push(parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      sql += ' AND price <= ?';
      params.push(parseFloat(filters.maxPrice));
    }

    if (filters.suggestedGame) {
      sql += ' AND suggested_game LIKE ?';
      params.push(`%${filters.suggestedGame}%`);
    }

    const result = await db.get(sql, params);
    await db.close();
    return result.total;
  }
}

module.exports = SnacksDao;
