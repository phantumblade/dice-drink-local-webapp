const openDb = require('../db');
const Tournament = require('../models/Tournament');

class TournamentsDao {

  static convertDbRowToApiFormat(row) {
    if (!row) return null;
    return Tournament.fromDatabaseRow(row).toJSON();
  }

  // ==========================================
  // OPERAZIONI BASE CRUD
  // ==========================================

  // Trova tutti i tornei con filtri opzionali
  static async findAll(filters = {}) {
    const db = await openDb();
    let sql = `
      SELECT t.*, g.name as game_name,
             dc.setting as dnd_setting,
             dc.world as dnd_world,
             dc.tags as dnd_tags,
             dc.allowed_classes as dnd_allowed_classes,
             dc.days as dnd_days,
             dc.session_duration as dnd_session_duration,
             dc.safety_tools as dnd_safety_tools
      FROM tournaments t
      LEFT JOIN games g ON t.game_id = g.id
      LEFT JOIN dnd_campaigns dc ON dc.tournament_id = t.id
      WHERE 1=1
    `;
    const params = [];

    // Filtro per stato
    if (filters.status) {
      sql += ' AND t.status = ?';
      params.push(filters.status);
    }

    // Filtro per categoria
    if (filters.category) {
      sql += ' AND t.category = ?';
      params.push(filters.category);
    }

    // Filtro per data
    if (filters.dateFrom) {
      sql += ' AND t.start_date >= ?';
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      sql += ' AND t.start_date <= ?';
      params.push(filters.dateTo);
    }

    // Filtro per registrazioni aperte
    if (filters.registrationOpen) {
      sql += ' AND t.registration_open = 1';
    }

    // Filtro per posti disponibili
    if (filters.hasAvailableSpots) {
      sql += ' AND t.current_participants < t.max_participants';
    }

    // Ordinamento cronologico per timeline: futuri prima (ASC), poi passati (DESC)
    const validOrderBy = ['start_date', 'title', 'created_at', 'current_participants'];
    const orderBy = validOrderBy.includes(filters.orderBy) ? filters.orderBy : 'start_date';
    const orderDir = filters.orderDir === 'DESC' ? 'DESC' : 'ASC';
    
    // Ordinamento per timeline: prima futuri (ASC), poi passati
    sql += ` ORDER BY t.${orderBy} ${orderDir}`;

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

    return rows.map(row => this.convertDbRowToApiFormat(row));
  }

  // Trova un torneo per ID
  static async findById(id) {
    const db = await openDb();
    const row = await db.get(`
      SELECT t.*, g.name as game_name,
             dc.setting as dnd_setting,
             dc.world as dnd_world,
             dc.tags as dnd_tags,
             dc.allowed_classes as dnd_allowed_classes,
             dc.days as dnd_days,
             dc.session_duration as dnd_session_duration,
             dc.safety_tools as dnd_safety_tools
      FROM tournaments t
      LEFT JOIN games g ON t.game_id = g.id
      LEFT JOIN dnd_campaigns dc ON dc.tournament_id = t.id
      WHERE t.id = ?
    `, [id]);
    await db.close();

    return this.convertDbRowToApiFormat(row);
  }

  // Cerca tornei per titolo o descrizione
  static async searchByTitle(searchTerm) {
    const db = await openDb();
    const sql = `
      SELECT t.*, g.name as game_name
      FROM tournaments t
      LEFT JOIN games g ON t.game_id = g.id
      WHERE t.title LIKE ? OR t.description LIKE ?
      ORDER BY t.start_date ASC
    `;
    const searchPattern = `%${searchTerm}%`;
    const rows = await db.all(sql, [searchPattern, searchPattern]);
    await db.close();

    return rows.map(row => this.convertDbRowToApiFormat(row));
  }

  // Crea un nuovo torneo
  static async create(tournamentData) {
    Tournament.validateTournamentData(tournamentData);

    const tournament = new Tournament(tournamentData);
    const dbData = tournament.toDatabaseObject();
    dbData.created_at = new Date().toISOString();

    const db = await openDb();
    const result = await db.run(
      `INSERT INTO tournaments (
        title, description, game_id, start_date, end_date, start_time, end_time,
        is_recurring, recurring_pattern, min_participants, max_participants,
        current_participants, waitlist_count, entry_fee, prize_pool, prizes,
        format, location, difficulty, category, theme, status, registration_open,
        registration_deadline, created_by, image_url, rules, included,
        current_session, total_sessions, current_level, party_composition,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dbData.title, dbData.description, dbData.game_id, dbData.start_date, dbData.end_date,
        dbData.start_time, dbData.end_time, dbData.is_recurring, dbData.recurring_pattern,
        dbData.min_participants, dbData.max_participants, dbData.current_participants,
        dbData.waitlist_count, dbData.entry_fee, dbData.prize_pool, dbData.prizes,
        dbData.format, dbData.location, dbData.difficulty, dbData.category, dbData.theme,
        dbData.status, dbData.registration_open, dbData.registration_deadline,
        dbData.created_by, dbData.image_url, dbData.rules, dbData.included,
        dbData.current_session, dbData.total_sessions, dbData.current_level,
        dbData.party_composition, dbData.created_at, dbData.updated_at
      ]
    );
    await db.close();

    return result.lastID;
  }

  // Aggiorna un torneo esistente
  static async update(id, tournamentData) {
    const db = await openDb();
    const tournament = new Tournament(tournamentData);
    const dbData = tournament.toDatabaseObject();

    // Costruisci query dinamica per aggiornamenti parziali
    const fieldsToUpdate = [];
    const params = [];

    const fieldMapping = {
      title: 'title',
      description: 'description',
      game_id: 'game_id',
      start_date: 'start_date',
      end_date: 'end_date',
      start_time: 'start_time',
      end_time: 'end_time',
      is_recurring: 'is_recurring',
      recurring_pattern: 'recurring_pattern',
      min_participants: 'min_participants',
      max_participants: 'max_participants',
      current_participants: 'current_participants',
      waitlist_count: 'waitlist_count',
      entry_fee: 'entry_fee',
      prize_pool: 'prize_pool',
      prizes: 'prizes',
      format: 'format',
      location: 'location',
      difficulty: 'difficulty',
      category: 'category',
      theme: 'theme',
      status: 'status',
      registration_open: 'registration_open',
      registration_deadline: 'registration_deadline',
      image_url: 'image_url',
      rules: 'rules',
      included: 'included',
      current_session: 'current_session',
      total_sessions: 'total_sessions',
      current_level: 'current_level',
      party_composition: 'party_composition'
    };

    for (const [field, dbColumn] of Object.entries(fieldMapping)) {
      if (dbData[dbColumn] !== undefined) {
        fieldsToUpdate.push(`${dbColumn} = ?`);
        params.push(dbData[dbColumn]);
      }
    }

    if (fieldsToUpdate.length === 0) {
      await db.close();
      throw new Error('Nessun campo da aggiornare fornito');
    }

    // Aggiungi sempre updated_at
    fieldsToUpdate.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    const sql = `UPDATE tournaments SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;

    try {
      const result = await db.run(sql, params);
      await db.close();
      return result.changes > 0;
    } catch (error) {
      await db.close();
      throw error;
    }
  }

  // Elimina un torneo
  static async delete(id) {
    const db = await openDb();
    const result = await db.run('DELETE FROM tournaments WHERE id = ?', [id]);
    await db.close();
    return result.changes > 0;
  }

  // ==========================================
  // OPERAZIONI AVANZATE
  // ==========================================

  // Ottieni tornei per stato specifico
  static async findByStatus(status) {
    return this.findAll({ status, orderBy: 'start_date', orderDir: 'ASC' });
  }

  // Ottieni tornei in arrivo
  static async findUpcoming(limit = 10) {
    const today = new Date().toISOString().split('T')[0];
    return this.findAll({
      dateFrom: today,
      status: 'upcoming',
      registrationOpen: true,
      limit,
      orderBy: 'start_date',
      orderDir: 'ASC'
    });
  }

  // Ottieni tornei in corso
  static async findOngoing() {
    return this.findAll({
      status: 'ongoing',
      orderBy: 'start_date',
      orderDir: 'ASC'
    });
  }

  // Ottieni tornei completati
  static async findCompleted(limit = 20) {
    return this.findAll({
      status: 'completed',
      limit,
      orderBy: 'start_date',
      orderDir: 'DESC'
    });
  }

  // Ottieni tornei per categoria
  static async findByCategory(category, limit = null) {
    return this.findAll({
      category,
      limit,
      orderBy: 'start_date',
      orderDir: 'ASC'
    });
  }

  // Ottieni statistiche per dashboard admin
  static async getStats() {
    const db = await openDb();

    const totalQuery = 'SELECT COUNT(*) as count FROM tournaments';
    const upcomingQuery = 'SELECT COUNT(*) as count FROM tournaments WHERE status = "upcoming"';
    const ongoingQuery = 'SELECT COUNT(*) as count FROM tournaments WHERE status = "ongoing"';
    const completedQuery = 'SELECT COUNT(*) as count FROM tournaments WHERE status = "completed"';
    const participantsQuery = 'SELECT SUM(current_participants) as total FROM tournaments WHERE status IN ("upcoming", "ongoing")';

    const [total, upcoming, ongoing, completed, participants] = await Promise.all([
      db.get(totalQuery),
      db.get(upcomingQuery),
      db.get(ongoingQuery),
      db.get(completedQuery),
      db.get(participantsQuery)
    ]);

    await db.close();

    return {
      total: total.count,
      upcoming: upcoming.count,
      ongoing: ongoing.count,
      completed: completed.count,
      totalParticipants: participants.total || 0
    };
  }

  // Ottieni tornei popolari (con più partecipanti)
  static async getPopular(limit = 5) {
    const db = await openDb();
    const sql = `
      SELECT t.*, g.name as game_name
      FROM tournaments t
      LEFT JOIN games g ON t.game_id = g.id
      WHERE t.status IN ('upcoming', 'ongoing')
      ORDER BY t.current_participants DESC, t.start_date ASC
      LIMIT ?
    `;

    const rows = await db.all(sql, [limit]);
    await db.close();

    return rows.map(row => this.convertDbRowToApiFormat(row));
  }

  // ==========================================
  // GESTIONE REGISTRAZIONI
  // ==========================================

  // Incrementa il numero di partecipanti
  static async incrementParticipants(tournamentId) {
    const db = await openDb();
    const result = await db.run(
      'UPDATE tournaments SET current_participants = current_participants + 1, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), tournamentId]
    );
    await db.close();
    return result.changes > 0;
  }

  // Decrementa il numero di partecipanti
  static async decrementParticipants(tournamentId) {
    const db = await openDb();
    const result = await db.run(
      'UPDATE tournaments SET current_participants = CASE WHEN current_participants > 0 THEN current_participants - 1 ELSE 0 END, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), tournamentId]
    );
    await db.close();
    return result.changes > 0;
  }

  // Aggiorna stato registrazioni
  static async updateRegistrationStatus(tournamentId, isOpen) {
    const db = await openDb();
    const result = await db.run(
      'UPDATE tournaments SET registration_open = ?, updated_at = ? WHERE id = ?',
      [isOpen ? 1 : 0, new Date().toISOString(), tournamentId]
    );
    await db.close();
    return result.changes > 0;
  }

  // Aggiorna stato torneo
  static async updateStatus(tournamentId, newStatus) {
    const validStatuses = ['upcoming', 'ongoing', 'completed', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Stato non valido: ${newStatus}`);
    }

    const db = await openDb();
    const result = await db.run(
      'UPDATE tournaments SET status = ?, updated_at = ? WHERE id = ?',
      [newStatus, new Date().toISOString(), tournamentId]
    );
    await db.close();
    return result.changes > 0;
  }

  // Conta totale tornei (per paginazione)
  static async count(filters = {}) {
    const db = await openDb();
    let sql = 'SELECT COUNT(*) as total FROM tournaments WHERE 1=1';
    const params = [];

    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.category) {
      sql += ' AND category = ?';
      params.push(filters.category);
    }

    const result = await db.get(sql, params);
    await db.close();
    return result.total;
  }

  // Aggiorna automaticamente tornei scaduti
  static async updateExpiredTournaments() {
    const db = await openDb();
    const now = new Date().toISOString();
    
    try {
      // Trova tornei che dovrebbero essere marcati come completati
      // Escludi tornei D&D che hanno gestione manuale dello status
      const expiredTournaments = await db.all(`
        SELECT id, title, start_date, end_date, status, category
        FROM tournaments 
        WHERE status IN ('upcoming', 'ongoing') 
        AND category NOT IN ('dnd', 'D&D')
        AND (
          (end_date IS NOT NULL AND end_date < ?) 
          OR (end_date IS NULL AND start_date < ?)
        )
      `, [now, now]);

      if (expiredTournaments.length > 0) {
        // Aggiorna lo stato a 'completed'
        await db.run(`
          UPDATE tournaments 
          SET status = 'completed', updated_at = ?
          WHERE status IN ('upcoming', 'ongoing') 
          AND category NOT IN ('dnd', 'D&D')
          AND (
            (end_date IS NOT NULL AND end_date < ?) 
            OR (end_date IS NULL AND start_date < ?)
          )
        `, [now, now, now]);

        console.log(`✅ Aggiornati ${expiredTournaments.length} tornei scaduti:`);
        expiredTournaments.forEach(t => {
          console.log(`   - ${t.title} (${t.start_date}) → completed`);
        });
      }

      await db.close();
      return expiredTournaments.length;
    } catch (error) {
      await db.close();
      throw error;
    }
  }
}

module.exports = TournamentsDao;
