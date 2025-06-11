// SCOPO: Inizializza database pulito con SOLO tabella games e dati di esempio
// RELAZIONI: Usa db.js per connessione, eseguito manualmente con "node initDb.js"

const openDb = require('./db');

async function init() {
  console.log('🎲 Inizializzazione database Dice & Drink...');

  const db = await openDb();

  // ==========================================
  // PULIZIA: Elimina tabelle vecchie
  // ==========================================

  console.log('🗑️  Pulizia vecchie tabelle...');
  await db.exec(`DROP TABLE IF EXISTS products;`);  // Rimuovi vecchia tabella generica
  await db.exec(`DROP TABLE IF EXISTS games;`);     // Rimuovi per ricreare pulita

  // ==========================================
  // CREAZIONE TABELLA GAMES (nuova struttura)
  // ==========================================

  console.log('📊 Creazione tabella games...');
  await db.exec(`
    CREATE TABLE games (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT    NOT NULL,              -- Nome gioco
      description     TEXT,                          -- Descrizione dettagliata
      min_players     INTEGER NOT NULL,              -- Minimo giocatori (es. 2)
      max_players     INTEGER NOT NULL,              -- Massimo giocatori (es. 6)
      rental_price    REAL    NOT NULL,              -- Prezzo noleggio serata (€)
      duration_minutes INTEGER,                      -- Durata media partita
      difficulty_level INTEGER CHECK(difficulty_level BETWEEN 1 AND 5), -- 1=Facile, 5=Esperto
      category        TEXT,                          -- Categoria gioco
      image_url       TEXT,                          -- URL immagine copertina
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ==========================================
  // DATI DI ESEMPIO: 15 GIOCHI REALISTICI
  // ==========================================

  console.log('🎮 Inserimento giochi di esempio...');

  const sampleGames = [
    {
      name: 'Catan',
      description: 'Costruisci insediamenti, città e strade per dominare l\'isola di Catan. Commercia risorse e espandi il tuo territorio in questo classico gioco di strategia che ha definito il genere.',
      min_players: 3,
      max_players: 4,
      rental_price: 8.00,
      duration_minutes: 90,
      difficulty_level: 2,
      category: 'Strategia',
      image_url: '/assets/games/catan.jpg'
    },
    {
      name: 'Ticket to Ride Europa',
      description: 'Collega le città europee costruendo ferrovie attraverso il continente. Raccogli carte treno colorat e completa i tuoi percorsi segreti per vincere punti.',
      min_players: 2,
      max_players: 5,
      rental_price: 7.50,
      duration_minutes: 60,
      difficulty_level: 2,
      category: 'Famiglia',
      image_url: '/assets/games/ticket-to-ride.jpg'
    },
    {
      name: 'Azul',
      description: 'Crea bellissimi mosaici portoghesi raccogliendo e posizionando piastrelle colorate con cura. Un perfetto mix di strategia, arte e soddisfazione tattile.',
      min_players: 2,
      max_players: 4,
      rental_price: 6.00,
      duration_minutes: 45,
      difficulty_level: 2,
      category: 'Strategia Astratta',
      image_url: '/assets/games/azul.jpg'
    },
    {
      name: 'Wingspan',
      description: 'Attira uccelli nel tuo habitat in questo engine builder a tema naturalistico. Splendide illustrazioni e meccaniche innovative per gli amanti della natura.',
      min_players: 1,
      max_players: 5,
      rental_price: 9.00,
      duration_minutes: 75,
      difficulty_level: 3,
      category: 'Engine Building',
      image_url: '/assets/games/wingspan.jpg'
    },
    {
      name: 'Codenames',
      description: 'Gioco di comunicazione e deduzione a squadre. Date indizi creativi per far indovinare le parole segrete alla vostra squadra, evitando quelle nemiche.',
      min_players: 4,
      max_players: 8,
      rental_price: 5.00,
      duration_minutes: 30,
      difficulty_level: 1,
      category: 'Party Game',
      image_url: '/assets/games/codenames.jpg'
    },
    {
      name: 'Pandemic',
      description: 'Collabora con gli altri giocatori per salvare il mondo da quattro malattie mortali. Gioco cooperativo pieno di tensione e difficili decisioni strategiche.',
      min_players: 2,
      max_players: 4,
      rental_price: 8.50,
      duration_minutes: 60,
      difficulty_level: 3,
      category: 'Cooperativo',
      image_url: '/assets/games/pandemic.jpg'
    },
    {
      name: 'Splendor',
      description: 'Diventa un ricco mercante di gemme nel Rinascimento. Raccogli gemme, acquista carte sviluppo e attira nobili alla tua corte per accumulare prestigio.',
      min_players: 2,
      max_players: 4,
      rental_price: 6.50,
      duration_minutes: 30,
      difficulty_level: 2,
      category: 'Engine Building',
      image_url: '/assets/games/splendor.jpg'
    },
    {
      name: 'King of Tokyo',
      description: 'Incarnerai un mostro mutante che lotta per il controllo di Tokyo. Lancia dadi giganti, accumula energia e distruggi i tuoi avversari in questo gioco caotico!',
      min_players: 2,
      max_players: 6,
      rental_price: 7.00,
      duration_minutes: 45,
      difficulty_level: 2,
      category: 'Combattimento',
      image_url: '/assets/games/king-of-tokyo.jpg'
    },
    {
      name: 'Dungeons & Dragons 5E - Starter Set',
      description: 'Set completo per iniziare avventure epiche nel mondo fantasy più famoso. Include manuale delle regole, dadi, avventura introduttiva e personaggi pregenerati.',
      min_players: 3,
      max_players: 6,
      rental_price: 15.00,
      duration_minutes: 240,
      difficulty_level: 4,
      category: 'GDR',
      image_url: '/assets/games/dnd5e.jpg'
    },
    {
      name: 'Carcassonne',
      description: 'Costruisci il paesaggio francese medievale posizionando tessere e piazzando i tuoi seguaci per controllare strade, città, monasteri e campi.',
      min_players: 2,
      max_players: 5,
      rental_price: 6.00,
      duration_minutes: 45,
      difficulty_level: 2,
      category: 'Piazzamento Tessere',
      image_url: '/assets/games/carcassonne.jpg'
    },
    {
      name: 'One Night Ultimate Werewolf',
      description: 'Versione veloce del classico Lupus in Tabula. Una sola notte, molti ruoli segreti, tanta confusione e divertimento garantito per gruppi numerosi.',
      min_players: 3,
      max_players: 10,
      rental_price: 4.50,
      duration_minutes: 15,
      difficulty_level: 1,
      category: 'Party Game',
      image_url: '/assets/games/werewolf.jpg'
    },
    {
      name: 'Terraforming Mars',
      description: 'Trasforma Marte in un pianeta abitabile gestendo corporazioni, tecnologie e risorse. Un complesso gioco strategico per esperti con centinaia di carte uniche.',
      min_players: 1,
      max_players: 5,
      rental_price: 12.00,
      duration_minutes: 120,
      difficulty_level: 4,
      category: 'Strategia',
      image_url: '/assets/games/terraforming-mars.jpg'
    },
    {
      name: 'Dixit',
      description: 'Gioco di immaginazione e interpretazione con splendide illustrazioni surreali. Racconta storie creative e indovina quelle degli altri giocatori.',
      min_players: 3,
      max_players: 8,
      rental_price: 7.00,
      duration_minutes: 45,
      difficulty_level: 1,
      category: 'Creativo',
      image_url: '/assets/games/dixit.jpg'
    },
    {
      name: 'Magic: The Gathering - Cube Draft',
      description: 'Cube personalizzato ottimizzato per draft da 8 giocatori. Include 540 carte attentamente bilanciate per un\'esperienza di draft competitiva e divertente.',
      min_players: 6,
      max_players: 8,
      rental_price: 10.00,
      duration_minutes: 180,
      difficulty_level: 4,
      category: 'TCG',
      image_url: '/assets/games/mtg-cube.jpg'
    },
    {
      name: 'Just One',
      description: 'Gioco cooperativo di parole esilarante. Fate indovinare la parola segreta scrivendo indizi originali, ma attenti: indizi identici vengono cancellati!',
      min_players: 3,
      max_players: 8,
      rental_price: 4.00,
      duration_minutes: 20,
      difficulty_level: 1,
      category: 'Party Game',
      image_url: '/assets/games/just-one.jpg'
    }
  ];

  // Prepare statement per inserimenti multipli (più efficiente)
  const stmt = await db.prepare(`
    INSERT INTO games
      (name, description, min_players, max_players, rental_price,
       duration_minutes, difficulty_level, category, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const game of sampleGames) {
    await stmt.run(
      game.name,
      game.description,
      game.min_players,
      game.max_players,
      game.rental_price,
      game.duration_minutes,
      game.difficulty_level,
      game.category,
      game.image_url
    );
  }
  await stmt.finalize();

  // ==========================================
  // STATISTICHE FINALI
  // ==========================================

  const totalGames = await db.get('SELECT COUNT(*) as count FROM games');
  const categories = await db.all('SELECT DISTINCT category FROM games ORDER BY category');

  console.log('✅ =====================================');
  console.log('✅  DATABASE INIZIALIZZATO CON SUCCESSO!');
  console.log('✅ =====================================');
  console.log(`📊 Giochi inseriti: ${totalGames.count}`);
  console.log(`🏷️  Categorie: ${categories.length}`);
  console.log('📋 Categorie disponibili:');
  categories.forEach(cat => console.log(`   - ${cat.category}`));
  console.log('💰 Range prezzi: €4.00 - €15.00');
  console.log('👥 Range giocatori: 1-10 giocatori');
  console.log('⏱️  Range durata: 15-240 minuti');
  console.log('🎯 Livelli difficoltà: 1-5');
  console.log('✅ =====================================');
  console.log('🚀 Ora puoi avviare il server con: npm run dev');

  await db.close();
}

// Esegui inizializzazione e gestisci errori
init().catch(err => {
  console.error('❌ ERRORE durante l\'inizializzazione database:');
  console.error(err);
  console.log('💡 Possibili soluzioni:');
  console.log('   - Verifica che il file db.js esista');
  console.log('   - Controlla i permessi di scrittura nella cartella');
  console.log('   - Assicurati che SQLite sia installato correttamente');
  process.exit(1);
});
