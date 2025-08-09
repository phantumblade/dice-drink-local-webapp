const openDb = require('./db');

async function initTournamentsDb() {
  const db = await openDb();

  try {
    console.log('🏆 Inizializzazione database tornei...');

    // Tabella tournaments
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        game_id INTEGER,
        start_date DATE NOT NULL,
        end_date DATE,
        start_time TIME,
        end_time TIME,
        is_recurring BOOLEAN DEFAULT 0,
        recurring_pattern TEXT,
        min_participants INTEGER DEFAULT 2,
        max_participants INTEGER,
        current_participants INTEGER DEFAULT 0,
        waitlist_count INTEGER DEFAULT 0,
        entry_fee DECIMAL(10,2) DEFAULT 0.00,
        prize_pool DECIMAL(10,2) DEFAULT 0.00,
        prizes TEXT, -- JSON array
        format TEXT DEFAULT 'swiss', -- 'elimination', 'swiss', 'round-robin', 'campaign'
        location TEXT DEFAULT 'Sala Principale',
        difficulty TEXT DEFAULT 'medium', -- 'easy', 'medium', 'hard'
        category TEXT, -- 'strategy', 'party', 'dnd', 'card', 'racing', 'puzzle'
        theme TEXT, -- per styling CSS
        status TEXT DEFAULT 'upcoming', -- 'upcoming', 'ongoing', 'completed', 'cancelled'
        registration_open BOOLEAN DEFAULT 1,
        registration_deadline DATETIME,
        created_by INTEGER,
        image_url TEXT,
        rules TEXT, -- JSON array
        included TEXT, -- JSON array
        current_session INTEGER DEFAULT 1,
        total_sessions INTEGER,
        current_level TEXT,
        party_composition TEXT, -- JSON array per D&D
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Tabella D&D campaigns (dettagli aggiuntivi)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS dnd_campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL UNIQUE,
        setting TEXT,
        world TEXT,
        tags TEXT, -- JSON array di tag (es. Ravenloft, Horror, Gotico)
        allowed_classes TEXT, -- JSON array
        days TEXT, -- es. "Ogni Sabato"
        session_duration TEXT, -- es. "4 ore"
        safety_tools TEXT, -- JSON array
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
      )
    `);

    // Tabella tournament_registrations
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tournament_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        tournament_id INTEGER NOT NULL,
        registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'no-show'
        is_waitlist BOOLEAN DEFAULT 0,
        notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        UNIQUE(user_id, tournament_id)
      )
    `);

    // Indici per performance
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
      CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON tournaments(start_date);
      CREATE INDEX IF NOT EXISTS idx_tournaments_category ON tournaments(category);
      CREATE INDEX IF NOT EXISTS idx_tournaments_game_id ON tournaments(game_id);
      CREATE INDEX IF NOT EXISTS idx_tournament_registrations_user ON tournament_registrations(user_id);
      CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament ON tournament_registrations(tournament_id);
    `);

    console.log('✅ Tabelle tornei create con successo');

    // Inserisci dati di esempio
    await seedTournaments(db);

  } catch (error) {
    console.error('❌ Errore inizializzazione database tornei:', error);
  } finally {
    await db.close();
  }
}

async function seedTournaments(db) {
  console.log('🌱 Inserimento dati di esempio tornei...');

  // Prima verifica se esistono già dei tornei
  try {
    const existingCount = await db.get('SELECT COUNT(*) as count FROM tournaments');
    if (existingCount && existingCount.count > 0) {
      console.log('ℹ️  Trovati tornei esistenti, li rimuovo per inserire i nuovi dati...');
      await db.run('DELETE FROM tournament_registrations');
      await db.run('DELETE FROM tournaments');
    }
  } catch (error) {
    console.log('ℹ️  Tabella tornei vuota o inesistente, procedo con inserimento...');
  }

  // Ottieni alcuni giochi dal database per associarli ai tornei
  const games = await db.all('SELECT * FROM games LIMIT 10');
  if (games.length === 0) {
    console.log('⚠️  Nessun gioco trovato, impossibile creare tornei di esempio');
    return;
  }

  // Prima elimina tutti i dati esistenti per ricominciare
  await db.run('DELETE FROM tournaments');
  await db.run('DELETE FROM tournament_registrations');
  console.log('🗑️ Database pulito');

  const sampleTournaments = [
    {
      title: 'Torneo Invernale - I Coloni di Catan',
      description: 'Il nostro torneo invernale dedicato al classico gioco di strategia tedesco. Una serata di commercio, costruzione e strategia!',
      game_id: games.find(g => g.name.includes('Catan') || g.name.includes('Coloni'))?.id || games[0].id,
      start_date: '2025-01-15',
      start_time: '20:30',
      end_time: '23:00',
      max_participants: 12,
      current_participants: 6,
      entry_fee: 15.00,
      prize_pool: 175.00,
      prizes: JSON.stringify(['1° posto: €100 + Trofeo', '2° posto: €50', '3° posto: €25']),
      format: 'swiss',
      difficulty: 'medium',
      category: 'strategy',
      theme: 'strategy-theme',
      rules: JSON.stringify([
        'Regole base di Catan (4ª edizione)',
        'Tempo massimo 90 minuti per partita',
        'Pareggi risolti con punti sviluppo',
        'Fair play richiesto sempre'
      ]),
      included: JSON.stringify([
        'Gioco e materiali forniti',
        'Aperitivo di benvenuto',
        'Snack durante le pause',
        'Certificato di partecipazione',
        'Foto ricordo del torneo'
      ])
    },
    {
      title: 'Campagna D&D - La Maledizione di Strahd',
      description: 'Una campagna epica di Dungeons & Dragons ambientata nel terrificante regno di Barovia.',
      game_id: games.find(g => g.name.includes('D&D') || g.name.includes('Dungeons'))?.id || games[1].id,
      start_date: '2025-01-11',
      start_time: '15:00',
      end_time: '19:00',
      is_recurring: 1,
      recurring_pattern: 'weekly',
      max_participants: 5,
      current_participants: 4,
      entry_fee: 0.00,
      format: 'campaign',
      difficulty: 'hard',
      category: 'dnd',
      theme: 'dnd-theme',
      status: 'ongoing',
      current_session: 12,
      total_sessions: 20,
      current_level: '8° Livello',
      party_composition: JSON.stringify([
        { name: 'Elena Drakemoor', class: 'Paladino Dragonide', level: 8, role: 'Party Leader' },
        { name: 'Marcus Shadowbane', class: 'Ranger Umano', level: 8, role: 'Cacciatore di Mostri' },
        { name: 'Lyralei Moonwhisper', class: 'Druida Elfa', level: 8, role: 'Guaritrice della Natura' }
      ]),
      rules: JSON.stringify([
        'D&D 5a Edizione',
        'Point buy per le caratteristiche',
        'Niente multiclasse fino al 5° livello',
        'Sessioni di 4 ore con pause'
      ])
    },
    {
      title: 'Torneo Veloce - Magic: The Gathering',
      description: 'Torneo Standard di Magic per tutti i livelli. Formato veloce con prize support ufficiale.',
      game_id: games.find(g => g.name.includes('Magic') || g.name.includes('MTG'))?.id || games[2].id,
      start_date: '2025-01-18',
      start_time: '21:00',
      end_time: '00:00',
      max_participants: 16,
      current_participants: 12,
      entry_fee: 12.00,
      prize_pool: 150.00,
      format: 'swiss',
      difficulty: 'medium',
      category: 'card',
      theme: 'card-theme',
      prizes: JSON.stringify(['1° posto: Booster Box', '2° posto: 18 Buste', '3°-4° posto: 9 Buste']),
      rules: JSON.stringify([
        'Formato Standard legale',
        'Deck list obbligatoria',
        'Tempo partita: 50 minuti + 5 turni',
        'Judge Level 1 presente'
      ])
    },
    {
      title: 'Serata Party Games - Codenames',
      description: 'Una serata leggera e divertente con il celebre party game Codenames.',
      game_id: games.find(g => g.name.includes('Codenames') || g.category === 'Party')?.id || games[3].id,
      start_date: '2025-01-20',
      start_time: '20:00',
      end_time: '22:30',
      max_participants: 8,
      current_participants: 5,
      entry_fee: 5.00,
      format: 'round-robin',
      difficulty: 'easy',
      category: 'party',
      theme: 'party-theme',
      prizes: JSON.stringify(['Drink gratis per i vincitori']),
      rules: JSON.stringify([
        'Regole standard Codenames',
        'Team casuali ogni round',
        'Vincitori determinati da punti totali'
      ])
    },
    {
      title: 'Torneo Completato - Splendor Autunnale',
      description: 'Torneo autunnale di Splendor con grande partecipazione.',
      game_id: games.find(g => g.name.includes('Splendor'))?.id || games[4].id,
      start_date: '2024-12-12',
      start_time: '19:00',
      end_time: '23:00',
      max_participants: 8,
      current_participants: 8,
      entry_fee: 10.00,
      prize_pool: 75.00,
      format: 'elimination',
      difficulty: 'medium',
      category: 'strategy',
      theme: 'strategy-theme',
      status: 'completed',
      prizes: JSON.stringify(['1° posto: €40 + Trofeo', '2° posto: €25', '3° posto: €10'])
    },
    {
      title: 'Torneo Azul - Sfida di Strategia',
      description: 'Torneo dedicato al magnifico gioco di piastrelle Azul. Costruisci il palazzo più bello del Portogallo!',
      game_id: games.find(g => g.name.includes('Azul'))?.id || games[5] || games[0],
      start_date: '2025-01-25',
      start_time: '19:30',
      end_time: '22:30',
      max_participants: 16,
      current_participants: 8,
      entry_fee: 8.00,
      prize_pool: 120.00,
      format: 'swiss',
      difficulty: 'medium',
      category: 'strategy',
      theme: 'strategy-theme',
      prizes: JSON.stringify(['1° posto: €60 + Expansion', '2° posto: €40', '3° posto: €20']),
      rules: JSON.stringify([
        'Regole base Azul',
        'Tempo massimo 60 minuti per partita',
        'Penalità per ritardi non giustificati',
        'Fair play obbligatorio'
      ]),
      included: JSON.stringify([
        'Gioco fornito dal locale',
        'Drink di benvenuto',
        'Snack durante le partite',
        'Classifiche online'
      ])
    },
    {
      title: 'Serata Uno - Torneo Veloce',
      description: 'Una serata frizzante con il gioco più amato al mondo! Colori, numeri e tante risate.',
      game_id: games.find(g => g.name.includes('UNO'))?.id || games[6] || games[0],
      start_date: '2025-01-22',
      start_time: '20:00',
      end_time: '23:00',
      max_participants: 24,
      current_participants: 18,
      entry_fee: 3.00,
      prize_pool: 60.00,
      format: 'elimination',
      difficulty: 'easy',
      category: 'party',
      theme: 'party-theme',
      prizes: JSON.stringify(['1° posto: €30', '2° posto: €20', '3° posto: €10']),
      rules: JSON.stringify([
        'Regole UNO ufficiali',
        'Eliminazione diretta',
        'Partite fino a 500 punti',
        'Niente alleanze'
      ]),
      included: JSON.stringify([
        'Carte UNO fornite',
        'Aperitivo incluso',
        'Musica di sottofondo',
        'Classifiche live'
      ])
    },
    {
      title: 'Wingspan - Torneo Ornitologi',
      description: 'Costruisci il tuo ecosistema di uccelli in questo splendido gioco engine-building.',
      game_id: games.find(g => g.name.includes('Wingspan'))?.id || games[7] || games[0],
      start_date: '2025-02-01',
      start_time: '15:00',
      end_time: '18:30',
      max_participants: 12,
      current_participants: 3,
      entry_fee: 12.00,
      prize_pool: 140.00,
      format: 'swiss',
      difficulty: 'hard',
      category: 'strategy',
      theme: 'strategy-theme',
      prizes: JSON.stringify(['1° posto: €80 + Espansione', '2° posto: €40', '3° posto: €20']),
      rules: JSON.stringify([
        'Regole Wingspan complete',
        'Tempo massimo 90 minuti',
        'Uso delle espansioni Europa',
        'Strategia avanzata richiesta'
      ]),
      included: JSON.stringify([
        'Gioco e espansioni forniti',
        'Merenda pomeridiana',
        'Guida strategica per principianti',
        'Certificato di partecipazione'
      ])
    },
    {
      title: 'Campagna D&D Inizianti - Lost Mine of Phandelver',
      description: 'Una campagna perfetta per chi vuole iniziare il proprio viaggio nel mondo di D&D!',
      game_id: games.find(g => g.name.includes('D&D') || g.name.includes('Dungeons'))?.id || games[1].id,
      start_date: '2025-01-19',
      start_time: '14:00',
      end_time: '18:00',
      is_recurring: 1,
      recurring_pattern: 'weekly',
      max_participants: 6,
      current_participants: 2,
      entry_fee: 0.00,
      format: 'campaign',
      difficulty: 'easy',
      category: 'dnd',
      theme: 'dnd-theme',
      status: 'upcoming',
      current_session: 1,
      total_sessions: 12,
      current_level: '1° Livello',
      party_composition: JSON.stringify([
        { name: 'Gareth il Coraggioso', class: 'Guerriero Umano', level: 1, role: 'Tank' },
        { name: 'Mira Frecciargento', class: 'Ranger Elfa', level: 1, role: 'DPS' }
      ]),
      rules: JSON.stringify([
        'D&D 5a Edizione',
        'Personaggi di 1° livello',
        'Standard array per statistiche',
        'Campagna per principianti'
      ]),
      included: JSON.stringify([
        'Manuali forniti',
        'Dadi e schede personaggio',
        'Snack durante le pause',
        'Master esperto'
      ])
    },
    {
      title: 'King of Tokyo - Battaglia dei Mostri',
      description: 'Controlla mostri giganti in questa battaglia per il dominio di Tokyo!',
      game_id: games.find(g => g.name.includes('King') || g.name.includes('Tokyo'))?.id || games[8] || games[0],
      start_date: '2025-01-28',
      start_time: '21:00',
      end_time: '23:30',
      max_participants: 18,
      current_participants: 11,
      entry_fee: 6.00,
      prize_pool: 100.00,
      format: 'elimination',
      difficulty: 'easy',
      category: 'party',
      theme: 'party-theme',
      prizes: JSON.stringify(['1° posto: €50 + Power Up', '2° posto: €30', '3° posto: €20']),
      rules: JSON.stringify([
        'Regole King of Tokyo complete',
        'Eliminazione a gironi',
        'Power-up inclusi',
        'Partite veloci da 30min'
      ]),
      included: JSON.stringify([
        'Gioco e espansioni',
        'Drink energetico incluso',
        'Atmosfera da battaglia',
        'Premi creativi'
      ])
    }
  ];

  for (const tournament of sampleTournaments) {
    await db.run(`
      INSERT INTO tournaments (
        title, description, game_id, start_date, start_time, end_time,
        is_recurring, recurring_pattern, max_participants, current_participants,
        entry_fee, prize_pool, prizes, format, difficulty, category, theme,
        status, current_session, total_sessions, current_level, party_composition,
        rules, included, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tournament.title, tournament.description, tournament.game_id, tournament.start_date,
      tournament.start_time, tournament.end_time, tournament.is_recurring || 0,
      tournament.recurring_pattern, tournament.max_participants, tournament.current_participants,
      tournament.entry_fee, tournament.prize_pool, tournament.prizes, tournament.format,
      tournament.difficulty, tournament.category, tournament.theme, tournament.status || 'upcoming',
      tournament.current_session, tournament.total_sessions, tournament.current_level,
      tournament.party_composition, tournament.rules, tournament.included,
      new Date().toISOString(), new Date().toISOString()
    ]);
  }

  console.log(`✅ Inseriti ${sampleTournaments.length} tornei di esempio`);

  // Seed D&D details for campaigns
  const dndTournaments = await db.all(`SELECT id, title FROM tournaments WHERE category = 'dnd'`);
  for (const t of dndTournaments) {
    let setting = 'Forgotten Realms';
    let world = null;
    let tags = [];
    if (/Strahd/i.test(t.title)) { setting = 'Barovia'; world = 'Ravenloft'; tags = ['Horror', 'Gotico', 'Vampiri']; }
    if (/Phandelver/i.test(t.title)) { setting = 'Neverwinter'; world = 'Forgotten Realms'; tags = ['Intro', 'Avventura', 'Caverne']; }

    await db.run(`
      INSERT OR REPLACE INTO dnd_campaigns (tournament_id, setting, world, tags, allowed_classes, days, session_duration, safety_tools, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      t.id,
      setting,
      world,
      JSON.stringify(tags),
      JSON.stringify(['Tutte le classi base']),
      'Ogni Sabato',
      '4 ore',
      JSON.stringify(['X-Card', 'Lines & Veils']),
      new Date().toISOString(),
      new Date().toISOString()
    ]);
  }
}

module.exports = { initTournamentsDb, seedTournaments };

// Esegui se chiamato direttamente
if (require.main === module) {
  initTournamentsDb().then(() => {
    console.log('🏁 Inizializzazione completata');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Errore durante inizializzazione:', error);
    process.exit(1);
  });
}
