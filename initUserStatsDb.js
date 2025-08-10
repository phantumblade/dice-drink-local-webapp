const openDb = require('./db');

async function initUserStatsDb() {
  const db = await openDb();

  try {
    console.log('🏅 Inizializzazione tabelle statistiche e coccarde utenti...');

    // Tabella per le statistiche utente
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_statistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        tournaments_played INTEGER DEFAULT 0,
        tournaments_won INTEGER DEFAULT 0,
        tournaments_podium INTEGER DEFAULT 0, -- 1°, 2°, 3° posto
        total_games_played INTEGER DEFAULT 0,
        favorite_game_category TEXT,
        total_hours_played INTEGER DEFAULT 0,
        win_rate DECIMAL(5,2) DEFAULT 0.00, -- percentuale vittorie
        avg_placement DECIMAL(5,2) DEFAULT 0.00, -- piazzamento medio
        highest_prize_won DECIMAL(10,2) DEFAULT 0.00,
        total_prize_money DECIMAL(10,2) DEFAULT 0.00,
        longest_win_streak INTEGER DEFAULT 0,
        current_win_streak INTEGER DEFAULT 0,
        dnd_campaigns_completed INTEGER DEFAULT 0,
        dnd_characters_created INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Tabella per le coccarde/achievements
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        badge_type TEXT NOT NULL, -- 'tournament_win', 'streak', 'participation', 'special'
        badge_name TEXT NOT NULL,
        badge_description TEXT,
        badge_icon TEXT, -- classe icona FontAwesome
        badge_color TEXT, -- colore hex
        earned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        tournament_id INTEGER, -- se legato a un torneo specifico
        additional_data TEXT, -- JSON per dati extra
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE SET NULL,
        UNIQUE(user_id, badge_name) -- Evita duplicati della stessa coccarda
      )
    `);

    // Tabella per i risultati dei tornei (per calcolare statistiche)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tournament_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        final_position INTEGER, -- posizione finale (1, 2, 3, ecc.)
        points_scored INTEGER DEFAULT 0,
        prize_won DECIMAL(10,2) DEFAULT 0.00,
        games_won INTEGER DEFAULT 0,
        games_lost INTEGER DEFAULT 0,
        hours_played INTEGER DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(tournament_id, user_id) -- Un utente può avere un solo risultato per torneo
      )
    `);

    // Indici per performance
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id ON user_statistics(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_badges_type ON user_badges(badge_type);
      CREATE INDEX IF NOT EXISTS idx_tournament_results_user_id ON tournament_results(user_id);
      CREATE INDEX IF NOT EXISTS idx_tournament_results_tournament_id ON tournament_results(tournament_id);
    `);

    console.log('✅ Tabelle statistiche create con successo');

    // Inserisci dati di esempio
    await seedUserStats(db);

  } catch (error) {
    console.error('❌ Errore inizializzazione database statistiche:', error);
  } finally {
    await db.close();
  }
}

async function seedUserStats(db) {
  console.log('🌱 Inserimento dati di esempio per statistiche...');

  try {
    // Ottieni alcuni utenti esistenti
    const users = await db.all('SELECT id FROM users WHERE role = "customer" LIMIT 3');
    if (users.length === 0) {
      console.log('⚠️  Nessun utente customer trovato per le statistiche');
      return;
    }

    // Ottieni alcuni tornei completati
    const completedTournaments = await db.all('SELECT id FROM tournaments WHERE status = "completed" LIMIT 3');

    for (const user of users) {
      // Crea statistiche base per ogni utente
      const stats = generateRandomStats();
      
      await db.run(`
        INSERT OR REPLACE INTO user_statistics (
          user_id, tournaments_played, tournaments_won, tournaments_podium,
          total_games_played, favorite_game_category, total_hours_played,
          win_rate, avg_placement, highest_prize_won, total_prize_money,
          longest_win_streak, current_win_streak, dnd_campaigns_completed,
          dnd_characters_created, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        user.id, stats.tournaments_played, stats.tournaments_won, stats.tournaments_podium,
        stats.total_games_played, stats.favorite_game_category, stats.total_hours_played,
        stats.win_rate, stats.avg_placement, stats.highest_prize_won, stats.total_prize_money,
        stats.longest_win_streak, stats.current_win_streak, stats.dnd_campaigns_completed,
        stats.dnd_characters_created
      ]);

      // Aggiungi alcune coccarde
      const badges = generateBadgesForUser(stats);
      for (const badge of badges) {
        await db.run(`
          INSERT OR IGNORE INTO user_badges (
            user_id, badge_type, badge_name, badge_description, badge_icon, badge_color
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [user.id, badge.type, badge.name, badge.description, badge.icon, badge.color]);
      }

      // Aggiungi risultati per tornei completati
      for (let i = 0; i < Math.min(completedTournaments.length, 2); i++) {
        const tournament = completedTournaments[i];
        const result = generateTournamentResult();
        
        await db.run(`
          INSERT OR IGNORE INTO tournament_results (
            tournament_id, user_id, final_position, points_scored, prize_won,
            games_won, games_lost, hours_played
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          tournament.id, user.id, result.position, result.points, result.prize,
          result.games_won, result.games_lost, result.hours
        ]);
      }
    }

    console.log(`✅ Statistiche e coccarde create per ${users.length} utenti`);

  } catch (error) {
    console.error('❌ Errore inserimento dati statistiche:', error);
  }
}

function generateRandomStats() {
  const tournaments_played = Math.floor(Math.random() * 20) + 1;
  const tournaments_won = Math.floor(Math.random() * tournaments_played * 0.3);
  const tournaments_podium = Math.min(tournaments_won + Math.floor(Math.random() * 5), tournaments_played);
  
  return {
    tournaments_played,
    tournaments_won,
    tournaments_podium,
    total_games_played: tournaments_played * (Math.floor(Math.random() * 4) + 2),
    favorite_game_category: ['strategy', 'party', 'card', 'dnd'][Math.floor(Math.random() * 4)],
    total_hours_played: tournaments_played * (Math.floor(Math.random() * 3) + 2),
    win_rate: tournaments_played > 0 ? ((tournaments_won / tournaments_played) * 100).toFixed(2) : 0,
    avg_placement: tournaments_played > 0 ? (Math.random() * 3 + 2).toFixed(2) : 0,
    highest_prize_won: tournaments_won > 0 ? Math.floor(Math.random() * 200) + 25 : 0,
    total_prize_money: tournaments_won > 0 ? Math.floor(Math.random() * 500) + 50 : 0,
    longest_win_streak: Math.floor(Math.random() * 5) + 1,
    current_win_streak: Math.floor(Math.random() * 3),
    dnd_campaigns_completed: Math.floor(Math.random() * 3),
    dnd_characters_created: Math.floor(Math.random() * 8)
  };
}

function generateBadgesForUser(stats) {
  const badges = [];

  // Coccarda per primo torneo
  if (stats.tournaments_played >= 1) {
    badges.push({
      type: 'participation',
      name: 'Primo Passo',
      description: 'Ha partecipato al primo torneo',
      icon: 'fas fa-baby',
      color: '#28a745'
    });
  }

  // Coccarda per vittorie
  if (stats.tournaments_won >= 1) {
    badges.push({
      type: 'tournament_win',
      name: 'Primo Trionfo',
      description: 'Ha vinto il primo torneo',
      icon: 'fas fa-trophy',
      color: '#ffd700'
    });
  }

  // Coccarda per molte vittorie
  if (stats.tournaments_won >= 5) {
    badges.push({
      type: 'tournament_win',
      name: 'Campione Seriale',
      description: 'Ha vinto 5 o più tornei',
      icon: 'fas fa-crown',
      color: '#ff6b35'
    });
  }

  // Coccarda per partecipazione
  if (stats.tournaments_played >= 10) {
    badges.push({
      type: 'participation',
      name: 'Veterano',
      description: 'Ha partecipato a 10+ tornei',
      icon: 'fas fa-medal',
      color: '#6f42c1'
    });
  }

  // Coccarda per streak
  if (stats.longest_win_streak >= 3) {
    badges.push({
      type: 'streak',
      name: 'Serie Vincente',
      description: 'Serie di 3+ vittorie consecutive',
      icon: 'fas fa-fire',
      color: '#dc3545'
    });
  }

  // Coccarda per D&D
  if (stats.dnd_campaigns_completed >= 1) {
    badges.push({
      type: 'special',
      name: 'Avventuriero',
      description: 'Ha completato una campagna D&D',
      icon: 'fas fa-dragon',
      color: '#8a2be2'
    });
  }

  return badges;
}

function generateTournamentResult() {
  const position = Math.floor(Math.random() * 8) + 1;
  const games_won = Math.floor(Math.random() * 5) + 1;
  const games_lost = Math.floor(Math.random() * 3);
  
  return {
    position,
    points: Math.floor(Math.random() * 100) + 20,
    prize: position <= 3 ? Math.floor(Math.random() * 100) + 10 : 0,
    games_won,
    games_lost,
    hours: Math.floor(Math.random() * 4) + 2
  };
}

module.exports = { initUserStatsDb };

// Esegui se chiamato direttamente
if (require.main === module) {
  initUserStatsDb().then(() => {
    console.log('🏁 Inizializzazione statistiche completata');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Errore durante inizializzazione statistiche:', error);
    process.exit(1);
  });
}