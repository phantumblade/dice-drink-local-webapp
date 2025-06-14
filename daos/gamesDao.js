// COSA FA: Operazioni CRUD sui giochi (trova, crea, aggiorna, elimina)
// RELAZIONI: Usa db.js per connessione, restituisce oggetti con campi convertiti

const openDb = require('../db');

class GamesDao {

  // ==========================================
  // UTILITY: CONVERSIONE CAMPI DB → API
  // ==========================================

  static convertDbRowToApiFormat(row) {
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      minPlayers: row.min_players,
      maxPlayers: row.max_players,
      rentalPrice: row.rental_price,
      durationMinutes: row.duration_minutes,
      difficultyLevel: row.difficulty_level,
      category: row.category,
      imageUrl: row.image_url,  // ← FIX PRINCIPALE: conversione snake_case → camelCase
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // Trova tutti i giochi con filtri opzionali
  static async findAll(filters = {}) {
    const db = await openDb();
    let sql = 'SELECT * FROM games WHERE 1=1';
    const params = [];

    // Filtro per categoria
    if (filters.category) {
      sql += ' AND category = ?';
      params.push(filters.category);
    }

    // Filtro per numero di giocatori
    if (filters.players) {
      const playerCount = parseInt(filters.players);
      sql += ' AND min_players <= ? AND max_players >= ?';
      params.push(playerCount, playerCount);
    }

    // Filtro per difficoltà
    if (filters.difficulty) {
      sql += ' AND difficulty_level = ?';
      params.push(parseInt(filters.difficulty));
    }

    // Filtro per durata massima
    if (filters.maxDuration) {
      sql += ' AND duration_minutes <= ?';
      params.push(parseInt(filters.maxDuration));
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

    // ✅ FIX: Conversione esplicita campi
    return rows.map(row => this.convertDbRowToApiFormat(row));
  }

  // Trova un gioco per ID
  static async findById(id) {
    const db = await openDb();
    const row = await db.get('SELECT * FROM games WHERE id = ?', [id]);
    await db.close();

    // ✅ FIX: Conversione esplicita campi
    return this.convertDbRowToApiFormat(row);
  }

  // Cerca giochi per nome (ricerca testuale)
  static async searchByName(searchTerm) {
    const db = await openDb();
    const sql = 'SELECT * FROM games WHERE name LIKE ? OR description LIKE ? ORDER BY name';
    const searchPattern = `%${searchTerm}%`;
    const rows = await db.all(sql, [searchPattern, searchPattern]);
    await db.close();

    // ✅ FIX: Conversione esplicita campi
    return rows.map(row => this.convertDbRowToApiFormat(row));
  }

  // Ottieni giochi popolari (i più noleggiati - per ora ordinati per nome)
  static async getPopular(limit = 10) {
    const db = await openDb();
    // TODO: quando avremo tabella prenotazioni, ordinare per numero di noleggi
    const sql = 'SELECT * FROM games ORDER BY name LIMIT ?';
    const rows = await db.all(sql, [limit]);
    await db.close();

    // ✅ FIX: Conversione esplicita campi
    return rows.map(row => this.convertDbRowToApiFormat(row));
  }

  // Ottieni tutte le categorie disponibili
  static async getCategories() {
    const db = await openDb();
    const rows = await db.all('SELECT DISTINCT category FROM games WHERE category IS NOT NULL ORDER BY category');
    await db.close();
    return rows.map(row => row.category);
  }

  // Crea un nuovo gioco
  static async create(gameData) {
    const {
      name, description, minPlayers, maxPlayers, rentalPrice,
      durationMinutes, difficultyLevel, category, imageUrl
    } = gameData;

    const db = await openDb();
    const result = await db.run(
      `INSERT INTO games
       (name, description, min_players, max_players, rental_price,
        duration_minutes, difficulty_level, category, image_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [name, description, minPlayers, maxPlayers, rentalPrice,
       durationMinutes, difficultyLevel, category, imageUrl]
    );
    await db.close();
    return result.lastID;
  }

  // Aggiorna un gioco esistente (supporta aggiornamenti parziali)
  static async update(id, gameData) {
    const db = await openDb();

    // Array per costruire la query dinamicamente
    const fieldsToUpdate = [];
    const params = [];

    // ✅ FIX: Mappa i campi del JSON ai nomi delle colonne del database
    // Ora supporta ENTRAMBI i formati: camelCase E snake_case
    const fieldMapping = {
      name: 'name',
      description: 'description',
      minPlayers: 'min_players',
      min_players: 'min_players',  // ← Supporto snake_case
      maxPlayers: 'max_players',
      max_players: 'max_players',  // ← Supporto snake_case
      rentalPrice: 'rental_price',
      rental_price: 'rental_price', // ← Supporto snake_case
      durationMinutes: 'duration_minutes',
      duration_minutes: 'duration_minutes', // ← Supporto snake_case
      difficultyLevel: 'difficulty_level',
      difficulty_level: 'difficulty_level', // ← Supporto snake_case
      category: 'category',
      imageUrl: 'image_url',
      image_url: 'image_url'  // ← Supporto snake_case
    };

    // Costruisci la query solo per i campi forniti
    for (const [jsonField, dbColumn] of Object.entries(fieldMapping)) {
      if (gameData[jsonField] !== undefined) {
        fieldsToUpdate.push(`${dbColumn} = ?`);
        params.push(gameData[jsonField]);
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
    const sql = `UPDATE games SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;

    try {
      const result = await db.run(sql, params);
      await db.close();
      return result.changes > 0;
    } catch (error) {
      await db.close();
      throw error;
    }
  }

  // Elimina un gioco
  static async delete(id) {
    const db = await openDb();
    const result = await db.run('DELETE FROM games WHERE id = ?', [id]);
    await db.close();
    return result.changes > 0;
  }

  // Conta totale giochi (per paginazione)
  static async count(filters = {}) {
    const db = await openDb();
    let sql = 'SELECT COUNT(*) as total FROM games WHERE 1=1';
    const params = [];

    if (filters.category) {
      sql += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters.players) {
      const playerCount = parseInt(filters.players);
      sql += ' AND min_players <= ? AND max_players >= ?';
      params.push(playerCount, playerCount);
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
      const result = await db.get('SELECT COUNT(*) as count FROM games');
      await db.close();

      return result.count;
    } catch (error) {
      console.error('Error getting total games count:', error);
      throw error;
    }
  }

  // ✅ FIX: getMostPopularGames ora include image_url e converte i campi
  static async getMostPopularGames(limit = 5) {
    try {
      const db = await openDb();
      const result = await db.all(`
        SELECT
          id,
          name,
          category,
          min_players,
          max_players,
          difficulty_level,
          rental_price,
          image_url
        FROM games
        ORDER BY name ASC
        LIMIT ?
      `, [limit]);
      await db.close();

      // ✅ FIX: Conversione campi per dashboard
      return result.map(row => this.convertDbRowToApiFormat(row));
    } catch (error) {
      console.error('Error getting popular games:', error);
      throw error;
    }
  }

  static async getInventoryStats() {
    try {
      const db = await openDb();
      const result = await db.get(`
        SELECT
          COUNT(*) as total_games,
          COUNT(DISTINCT category) as total_categories,
          AVG(difficulty_level) as avg_difficulty,
          AVG(rental_price) as avg_rental_price
        FROM games
      `);
      await db.close();

      // Converti i nomi per coerenza API
      return {
        totalGames: result.total_games,
        totalCategories: result.total_categories,
        avgDifficulty: result.avg_difficulty,
        avgRentalPrice: result.avg_rental_price
      };
    } catch (error) {
      console.error('Error getting games inventory stats:', error);
      throw error;
    }
  }

} // ← Fine della classe GamesDao

// ==========================================
// EXPORTS
// ==========================================

module.exports = GamesDao;
