const openDb = require('../db');

class TournamentRegistrationsDao {

  // ==========================================
  // OPERAZIONI BASE
  // ==========================================

  // Registra un utente a un torneo
  static async register(userId, tournamentId) {
    const db = await openDb();
    
    try {
      // Verifica che l'utente non sia già registrato
      const existing = await db.get(
        'SELECT * FROM tournament_registrations WHERE user_id = ? AND tournament_id = ?',
        [userId, tournamentId]
      );
      
      if (existing) {
        await db.close();
        throw new Error('Utente già registrato a questo torneo');
      }

      // Verifica se c'è posto nel torneo
      const tournament = await db.get(
        'SELECT current_participants, max_participants FROM tournaments WHERE id = ?',
        [tournamentId]
      );

      if (!tournament) {
        await db.close();
        throw new Error('Torneo non trovato');
      }

      const isWaitlist = tournament.current_participants >= tournament.max_participants;

      // Inserisci la registrazione
      const result = await db.run(
        `INSERT INTO tournament_registrations 
         (user_id, tournament_id, registration_date, status, is_waitlist)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, tournamentId, new Date().toISOString(), 'confirmed', isWaitlist ? 1 : 0]
      );

      // Se non è in lista d'attesa, incrementa i partecipanti
      if (!isWaitlist) {
        await db.run(
          'UPDATE tournaments SET current_participants = current_participants + 1 WHERE id = ?',
          [tournamentId]
        );
      } else {
        await db.run(
          'UPDATE tournaments SET waitlist_count = waitlist_count + 1 WHERE id = ?',
          [tournamentId]
        );
      }

      await db.close();
      return {
        registrationId: result.lastID,
        isWaitlist: isWaitlist,
        position: isWaitlist ? tournament.current_participants + 1 : tournament.current_participants + 1
      };
      
    } catch (error) {
      await db.close();
      throw error;
    }
  }

  // Cancella la registrazione di un utente
  static async unregister(userId, tournamentId) {
    const db = await openDb();
    
    try {
      // Trova la registrazione
      const registration = await db.get(
        'SELECT * FROM tournament_registrations WHERE user_id = ? AND tournament_id = ?',
        [userId, tournamentId]
      );

      if (!registration) {
        await db.close();
        throw new Error('Registrazione non trovata');
      }

      // Elimina la registrazione
      await db.run(
        'DELETE FROM tournament_registrations WHERE user_id = ? AND tournament_id = ?',
        [userId, tournamentId]
      );

      // Aggiorna i contatori del torneo
      if (registration.is_waitlist) {
        await db.run(
          'UPDATE tournaments SET waitlist_count = CASE WHEN waitlist_count > 0 THEN waitlist_count - 1 ELSE 0 END WHERE id = ?',
          [tournamentId]
        );
      } else {
        await db.run(
          'UPDATE tournaments SET current_participants = CASE WHEN current_participants > 0 THEN current_participants - 1 ELSE 0 END WHERE id = ?',
          [tournamentId]
        );

        // Se c'è una lista d'attesa, promuovi il primo
        const firstWaitlist = await db.get(
          'SELECT * FROM tournament_registrations WHERE tournament_id = ? AND is_waitlist = 1 ORDER BY registration_date ASC LIMIT 1',
          [tournamentId]
        );

        if (firstWaitlist) {
          await db.run(
            'UPDATE tournament_registrations SET is_waitlist = 0 WHERE id = ?',
            [firstWaitlist.id]
          );
          await db.run(
            'UPDATE tournaments SET current_participants = current_participants + 1, waitlist_count = waitlist_count - 1 WHERE id = ?',
            [tournamentId]
          );
        }
      }

      await db.close();
      return true;
      
    } catch (error) {
      await db.close();
      throw error;
    }
  }

  // Verifica se un utente è registrato a un torneo
  static async isUserRegistered(userId, tournamentId) {
    const db = await openDb();
    const registration = await db.get(
      'SELECT * FROM tournament_registrations WHERE user_id = ? AND tournament_id = ?',
      [userId, tournamentId]
    );
    await db.close();
    return registration !== undefined;
  }

  // Ottieni la registrazione di un utente per un torneo
  static async getUserRegistration(userId, tournamentId) {
    const db = await openDb();
    const registration = await db.get(
      `SELECT tr.*, u.first_name, u.last_name, u.email 
       FROM tournament_registrations tr
       LEFT JOIN users u ON tr.user_id = u.id
       WHERE tr.user_id = ? AND tr.tournament_id = ?`,
      [userId, tournamentId]
    );
    await db.close();
    return registration;
  }

  // ==========================================
  // QUERY AVANZATE
  // ==========================================

  // Ottieni tutti i tornei ai quali un utente è registrato
  static async getUserTournaments(userId, status = null) {
    const db = await openDb();
    let sql = `
      SELECT t.*, tr.registration_date, tr.status as registration_status, 
             tr.is_waitlist, g.name as game_name
      FROM tournament_registrations tr
      JOIN tournaments t ON tr.tournament_id = t.id
      LEFT JOIN games g ON t.game_id = g.id
      WHERE tr.user_id = ?
    `;
    const params = [userId];

    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY t.start_date ASC';

    const rows = await db.all(sql, params);
    await db.close();
    return rows;
  }

  // Ottieni tutti i partecipanti di un torneo
  static async getTournamentParticipants(tournamentId, includeWaitlist = false) {
    const db = await openDb();
    let sql = `
      SELECT tr.*, u.first_name, u.last_name, u.email, u.profile_image
      FROM tournament_registrations tr
      JOIN users u ON tr.user_id = u.id
      WHERE tr.tournament_id = ?
    `;
    const params = [tournamentId];

    if (!includeWaitlist) {
      sql += ' AND tr.is_waitlist = 0';
    }

    sql += ' ORDER BY tr.registration_date ASC';

    const rows = await db.all(sql, params);
    await db.close();
    return rows;
  }

  // Ottieni la lista d'attesa di un torneo
  static async getTournamentWaitlist(tournamentId) {
    const db = await openDb();
    const sql = `
      SELECT tr.*, u.first_name, u.last_name, u.email, u.profile_image
      FROM tournament_registrations tr
      JOIN users u ON tr.user_id = u.id
      WHERE tr.tournament_id = ? AND tr.is_waitlist = 1
      ORDER BY tr.registration_date ASC
    `;

    const rows = await db.all(sql, [tournamentId]);
    await db.close();
    return rows;
  }

  // Ottieni statistiche registrazioni per un torneo
  static async getTournamentStats(tournamentId) {
    const db = await openDb();
    
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_registrations,
        SUM(CASE WHEN is_waitlist = 0 THEN 1 ELSE 0 END) as confirmed_registrations,
        SUM(CASE WHEN is_waitlist = 1 THEN 1 ELSE 0 END) as waitlist_registrations,
        MIN(registration_date) as first_registration,
        MAX(registration_date) as last_registration
      FROM tournament_registrations 
      WHERE tournament_id = ?
    `, [tournamentId]);

    await db.close();
    return stats || {
      total_registrations: 0,
      confirmed_registrations: 0, 
      waitlist_registrations: 0,
      first_registration: null,
      last_registration: null
    };
  }

  // ==========================================
  // OPERAZIONI DI GESTIONE
  // ==========================================

  // Promuovi dalla lista d'attesa (per admin)
  static async promoteFromWaitlist(tournamentId, userId = null) {
    const db = await openDb();
    
    try {
      let waitlistEntry;
      
      if (userId) {
        // Promuovi utente specifico
        waitlistEntry = await db.get(
          'SELECT * FROM tournament_registrations WHERE tournament_id = ? AND user_id = ? AND is_waitlist = 1',
          [tournamentId, userId]
        );
      } else {
        // Promuovi il primo in lista
        waitlistEntry = await db.get(
          'SELECT * FROM tournament_registrations WHERE tournament_id = ? AND is_waitlist = 1 ORDER BY registration_date ASC LIMIT 1',
          [tournamentId]
        );
      }

      if (!waitlistEntry) {
        await db.close();
        throw new Error('Nessun utente trovato in lista d\'attesa');
      }

      // Verifica se c'è posto nel torneo
      const tournament = await db.get(
        'SELECT current_participants, max_participants FROM tournaments WHERE id = ?',
        [tournamentId]
      );

      if (tournament.current_participants >= tournament.max_participants) {
        await db.close();
        throw new Error('Torneo al completo');
      }

      // Promuovi l'utente
      await db.run(
        'UPDATE tournament_registrations SET is_waitlist = 0 WHERE id = ?',
        [waitlistEntry.id]
      );

      // Aggiorna i contatori del torneo
      await db.run(
        'UPDATE tournaments SET current_participants = current_participants + 1, waitlist_count = waitlist_count - 1 WHERE id = ?',
        [tournamentId]
      );

      await db.close();
      return waitlistEntry;
      
    } catch (error) {
      await db.close();
      throw error;
    }
  }

  // Aggiorna stato registrazione
  static async updateRegistrationStatus(userId, tournamentId, newStatus) {
    const validStatuses = ['confirmed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Stato registrazione non valido: ${newStatus}`);
    }

    const db = await openDb();
    const result = await db.run(
      'UPDATE tournament_registrations SET status = ? WHERE user_id = ? AND tournament_id = ?',
      [newStatus, userId, tournamentId]
    );
    await db.close();
    return result.changes > 0;
  }

  // Ottieni registrazioni per un utente
  static async getUserRegistrationsCount(userId) {
    const db = await openDb();
    const result = await db.get(
      'SELECT COUNT(*) as count FROM tournament_registrations WHERE user_id = ?',
      [userId]
    );
    await db.close();
    return result.count;
  }

  // Cancella tutte le registrazioni di un torneo (per admin)
  static async clearTournamentRegistrations(tournamentId) {
    const db = await openDb();
    
    try {
      await db.run('DELETE FROM tournament_registrations WHERE tournament_id = ?', [tournamentId]);
      await db.run(
        'UPDATE tournaments SET current_participants = 0, waitlist_count = 0 WHERE id = ?',
        [tournamentId]
      );
      await db.close();
      return true;
    } catch (error) {
      await db.close();
      throw error;
    }
  }
}

module.exports = TournamentRegistrationsDao;