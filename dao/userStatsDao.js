const openDb = require('../db');

class UserStatsDao {
  static async init() {
    return await openDb();
  }

  // ==========================================
  // STATISTICHE UTENTE
  // ==========================================

  static async getUserStatistics(userId) {
    const db = await this.init();
    try {
      let stats = await db.get(`
        SELECT * FROM user_statistics 
        WHERE user_id = ?
      `, [userId]);

      // Se non esistono statistiche, crea un record con valori predefiniti
      if (!stats) {
        await db.run(`
          INSERT INTO user_statistics (user_id) VALUES (?)
        `, [userId]);
        
        stats = await db.get(`
          SELECT * FROM user_statistics 
          WHERE user_id = ?
        `, [userId]);
      }

      return stats;
    } finally {
      await db.close();
    }
  }

  static async updateUserStatistics(userId, updates) {
    const db = await this.init();
    try {
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(userId);

      await db.run(`
        UPDATE user_statistics 
        SET ${fields}, updated_at = datetime('now')
        WHERE user_id = ?
      `, values);

      return await this.getUserStatistics(userId);
    } finally {
      await db.close();
    }
  }

  static async incrementStatistic(userId, statName, increment = 1) {
    const db = await this.init();
    try {
      // Assicurati che esistano le statistiche
      await this.getUserStatistics(userId);
      
      await db.run(`
        UPDATE user_statistics 
        SET ${statName} = ${statName} + ?, updated_at = datetime('now')
        WHERE user_id = ?
      `, [increment, userId]);

      return await this.getUserStatistics(userId);
    } finally {
      await db.close();
    }
  }

  // ==========================================
  // COCCARDE/BADGES
  // ==========================================

  static async getUserBadges(userId) {
    const db = await this.init();
    try {
      return await db.all(`
        SELECT * FROM user_badges 
        WHERE user_id = ? 
        ORDER BY earned_date DESC
      `, [userId]);
    } finally {
      await db.close();
    }
  }

  static async awardBadge(userId, badgeData) {
    const db = await this.init();
    try {
      const { badge_type, badge_name, badge_description, badge_icon, badge_color, tournament_id, additional_data } = badgeData;
      
      await db.run(`
        INSERT OR IGNORE INTO user_badges (
          user_id, badge_type, badge_name, badge_description, 
          badge_icon, badge_color, tournament_id, additional_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [userId, badge_type, badge_name, badge_description, badge_icon, badge_color, tournament_id, additional_data]);

      return await this.getUserBadges(userId);
    } finally {
      await db.close();
    }
  }

  static async checkAndAwardAutomaticBadges(userId) {
    const stats = await this.getUserStatistics(userId);
    const existingBadges = await this.getUserBadges(userId);
    const existingBadgeNames = existingBadges.map(b => b.badge_name);

    const badgesToAward = [];

    // Primo torneo
    if (stats.tournaments_played >= 1 && !existingBadgeNames.includes('Primo Passo')) {
      badgesToAward.push({
        badge_type: 'participation',
        badge_name: 'Primo Passo',
        badge_description: 'Ha partecipato al primo torneo',
        badge_icon: 'fas fa-baby',
        badge_color: '#28a745'
      });
    }

    // Prima vittoria
    if (stats.tournaments_won >= 1 && !existingBadgeNames.includes('Primo Trionfo')) {
      badgesToAward.push({
        badge_type: 'tournament_win',
        badge_name: 'Primo Trionfo', 
        badge_description: 'Ha vinto il primo torneo',
        badge_icon: 'fas fa-trophy',
        badge_color: '#ffd700'
      });
    }

    // Campione seriale
    if (stats.tournaments_won >= 5 && !existingBadgeNames.includes('Campione Seriale')) {
      badgesToAward.push({
        badge_type: 'tournament_win',
        badge_name: 'Campione Seriale',
        badge_description: 'Ha vinto 5 o più tornei',
        badge_icon: 'fas fa-crown',
        badge_color: '#ff6b35'
      });
    }

    // Veterano
    if (stats.tournaments_played >= 10 && !existingBadgeNames.includes('Veterano')) {
      badgesToAward.push({
        badge_type: 'participation',
        badge_name: 'Veterano',
        badge_description: 'Ha partecipato a 10+ tornei',
        badge_icon: 'fas fa-medal',
        badge_color: '#6f42c1'
      });
    }

    // Serie vincente
    if (stats.longest_win_streak >= 3 && !existingBadgeNames.includes('Serie Vincente')) {
      badgesToAward.push({
        badge_type: 'streak',
        badge_name: 'Serie Vincente',
        badge_description: 'Serie di 3+ vittorie consecutive',
        badge_icon: 'fas fa-fire',
        badge_color: '#dc3545'
      });
    }

    // Avventuriero D&D
    if (stats.dnd_campaigns_completed >= 1 && !existingBadgeNames.includes('Avventuriero')) {
      badgesToAward.push({
        badge_type: 'special',
        badge_name: 'Avventuriero',
        badge_description: 'Ha completato una campagna D&D',
        badge_icon: 'fas fa-dragon',
        badge_color: '#8a2be2'
      });
    }

    // Assegna le nuove coccarde
    for (const badge of badgesToAward) {
      await this.awardBadge(userId, badge);
    }

    return badgesToAward.length > 0 ? await this.getUserBadges(userId) : existingBadges;
  }

  // ==========================================
  // RISULTATI TORNEI
  // ==========================================

  static async addTournamentResult(userId, tournamentId, resultData) {
    const db = await this.init();
    try {
      const { final_position, points_scored, prize_won, games_won, games_lost, hours_played, notes } = resultData;
      
      await db.run(`
        INSERT OR REPLACE INTO tournament_results (
          tournament_id, user_id, final_position, points_scored, prize_won,
          games_won, games_lost, hours_played, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [tournamentId, userId, final_position, points_scored, prize_won, games_won, games_lost, hours_played, notes]);

      // Aggiorna automaticamente le statistiche dell'utente
      await this.updateStatsFromTournamentResult(userId, resultData);

      return await this.checkAndAwardAutomaticBadges(userId);
    } finally {
      await db.close();
    }
  }

  static async updateStatsFromTournamentResult(userId, resultData) {
    const stats = await this.getUserStatistics(userId);
    const { final_position, prize_won, games_won, games_lost, hours_played } = resultData;

    const updates = {
      tournaments_played: stats.tournaments_played + 1,
      total_games_played: stats.total_games_played + (games_won || 0) + (games_lost || 0),
      total_hours_played: stats.total_hours_played + (hours_played || 0),
      total_prize_money: stats.total_prize_money + (prize_won || 0)
    };

    // Se ha vinto il torneo
    if (final_position === 1) {
      updates.tournaments_won = stats.tournaments_won + 1;
      updates.current_win_streak = stats.current_win_streak + 1;
      updates.longest_win_streak = Math.max(stats.longest_win_streak, updates.current_win_streak);
      updates.highest_prize_won = Math.max(stats.highest_prize_won, prize_won || 0);
    } else {
      updates.current_win_streak = 0;
    }

    // Se è arrivato sul podio (1°, 2°, 3°)
    if (final_position <= 3) {
      updates.tournaments_podium = stats.tournaments_podium + 1;
    }

    // Calcola win rate
    if (updates.tournaments_played > 0) {
      updates.win_rate = ((updates.tournaments_won || stats.tournaments_won) / updates.tournaments_played * 100).toFixed(2);
    }

    await this.updateUserStatistics(userId, updates);
  }

  static async getUserTournamentHistory(userId, limit = 10) {
    const db = await this.init();
    try {
      return await db.all(`
        SELECT tr.*, t.title as tournament_title, t.start_date, t.category
        FROM tournament_results tr
        JOIN tournaments t ON tr.tournament_id = t.id
        WHERE tr.user_id = ?
        ORDER BY t.start_date DESC
        LIMIT ?
      `, [userId, limit]);
    } finally {
      await db.close();
    }
  }

  // ==========================================
  // STATISTICHE GLOBALI
  // ==========================================

  static async getLeaderboard(category = 'tournaments_won', limit = 10) {
    const db = await this.init();
    try {
      const validCategories = ['tournaments_won', 'tournaments_played', 'total_prize_money', 'win_rate', 'longest_win_streak'];
      if (!validCategories.includes(category)) {
        category = 'tournaments_won';
      }

      return await db.all(`
        SELECT us.*, u.first_name, u.last_name, u.email
        FROM user_statistics us
        JOIN users u ON us.user_id = u.id
        WHERE us.${category} > 0
        ORDER BY us.${category} DESC
        LIMIT ?
      `, [limit]);
    } finally {
      await db.close();
    }
  }
}

module.exports = UserStatsDao;