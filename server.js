// server.js
// SCOPO: Entry point dell'applicazione - configura Express, middleware, routes
// RELAZIONI: Importa tutte le routes, avvia il server, gestisce errori globali

const express = require('express');
const path = require('path');
const openDb = require('./db');

async function init() {
  const app = express();
  const port = process.env.PORT || 3000;

  // ==========================================
  // MIDDLEWARE GLOBALI
  // ==========================================

  // Parse JSON nel body delle richieste
  app.use(express.json());

  // Serve file statici dalla cartella public (CSS, JS, immagini)
  app.use(express.static('public'));

  // ==========================================
  // IMPORTA E REGISTRA LE ROUTES
  // ==========================================

  // 🎮 GAMES API - Routes per giochi da tavolo
  const gamesRouter = require('./routes/games');
  app.use('/api/games', gamesRouter);

  // 🍹 DRINKS API - Routes per drink e bevande
  const drinksRouter = require('./routes/drinks');
  app.use('/api/drinks', drinksRouter);

  // ==========================================
  // VERIFICA DATABASE (non crea più tabelle qui)
  // ==========================================

  // Verifica solo che i database siano accessibili
  // Le tabelle vengono create da initDb.js e initDrinksDb.js
  try {
    const db = await openDb();

    // Verifica tabella games
    const gamesTable = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='games'");
    // Verifica tabella drinks
    const drinksTable = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='drinks'");

    if (!gamesTable) {
      console.log('⚠️  ATTENZIONE: Tabella games non trovata!');
      console.log('💡 Esegui: node initDb.js');
    } else {
      const gameCount = await db.get('SELECT COUNT(*) as count FROM games');
      console.log(`✅ Database Games OK - ${gameCount.count} giochi disponibili`);
    }

    if (!drinksTable) {
      console.log('⚠️  ATTENZIONE: Tabella drinks non trovata!');
      console.log('💡 Esegui: node initDrinksDb.js');
    } else {
      const drinkCount = await db.get('SELECT COUNT(*) as count FROM drinks');
      console.log(`✅ Database Drinks OK - ${drinkCount.count} drink disponibili`);
    }

    await db.close();
  } catch (err) {
    console.log('⚠️  Impossibile verificare il database');
    console.log('💡 Assicurati di aver eseguito: node initDb.js e node initDrinksDb.js');
  }

  // ==========================================
  // ENDPOINT DI UTILITÀ
  // ==========================================

  // Health check per verificare che l'API funzioni
  app.get('/api/health', async (req, res) => {
    try {
      const db = await openDb();

      // Controlla games
      const gameCount = await db.get('SELECT COUNT(*) as count FROM games');
      const categories = await db.all('SELECT DISTINCT category FROM games ORDER BY category');

      // Controlla drinks
      const drinkCount = await db.get('SELECT COUNT(*) as count FROM drinks');
      const baseSpirits = await db.all('SELECT DISTINCT base_spirit FROM drinks ORDER BY base_spirit');

      await db.close();

      res.json({
        status: 'OK',
        message: 'Dice & Drink API is running',
        version: '1.0.0',
        database: {
          games: gameCount.count,
          drinks: drinkCount.count,
          categories: categories.map(c => c.category),
          baseSpirits: baseSpirits.map(s => s.base_spirit)
        },
        endpoints: {
          games: {
            list: 'GET /api/games',
            details: 'GET /api/games/:id',
            search: 'GET /api/games/search?q=term',
            categories: 'GET /api/games/categories',
            popular: 'GET /api/games/popular'
          },
          drinks: {
            list: 'GET /api/drinks',
            details: 'GET /api/drinks/:id',
            search: 'GET /api/drinks/search?q=term',
            alcoholic: 'GET /api/drinks/alcoholic',
            nonAlcoholic: 'GET /api/drinks/non-alcoholic',
            baseSpirits: 'GET /api/drinks/base-spirits',
            recommended: 'GET /api/drinks/recommended'
          }
        },
        examples: {
          allGames: '/api/games',
          strategyGames: '/api/games?category=Strategia',
          fourPlayerGames: '/api/games?players=4',
          searchCatan: '/api/games/search?q=catan',
          allDrinks: '/api/drinks',
          alcoholicDrinks: '/api/drinks/alcoholic',
          ginDrinks: '/api/drinks/spirit/gin',
          cheapDrinks: '/api/drinks/price-range/3/6',
          searchGin: '/api/drinks/search?q=gin'
        }
      });
    } catch (err) {
      res.status(500).json({
        status: 'ERROR',
        message: 'Database non disponibile',
        hint: 'Esegui: node initDb.js e node initDrinksDb.js'
      });
    }
  });

  // Endpoint per servire la SPA (tutte le route non-API vanno all'index.html)
  app.get('*', (req, res, next) => {
    // Se la richiesta è per l'API, passa al prossimo middleware (404)
    if (req.path.startsWith('/api/')) {
      return next();
    }

    // Altrimenti servi l'index.html per la SPA
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // ==========================================
  // GESTIONE ERRORI
  // ==========================================

  // 404 handler per endpoint API non trovati
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      error: 'Endpoint non trovato',
      path: req.path,
      method: req.method,
      suggestion: 'Controlla /api/health per vedere gli endpoint disponibili'
    });
  });

  // Error handling middleware globale
  app.use((err, req, res, next) => {
    console.error('❌ Errore server:', err.stack);

    // Se è un errore di validazione, ritorna 400
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Dati non validi',
        details: err.message
      });
    }

    // Se è un errore del database, ritorna 500
    if (err.code && err.code.startsWith('SQLITE')) {
      return res.status(500).json({
        error: 'Errore database',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Errore interno'
      });
    }

    // Errore generico 500
    res.status(500).json({
      error: 'Errore interno del server',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Qualcosa è andato storto'
    });
  });

  // ==========================================
  // AVVIO SERVER
  // ==========================================

  app.listen(port, () => {
    console.log('🎲🍹 =====================================');
    console.log('🎲🍹  DICE & DRINK SERVER AVVIATO!');
    console.log('🎲🍹 =====================================');
    console.log(`🌐 Server URL: http://localhost:${port}`);
    console.log(`🔍 Health Check: http://localhost:${port}/api/health`);
    console.log('📡 API Endpoints:');
    console.log(`   🎮 Games: http://localhost:${port}/api/games`);
    console.log(`   🍹 Drinks: http://localhost:${port}/api/drinks`);
    console.log('📝 Esempi:');
    console.log(`   📋 Tutti i giochi: /api/games`);
    console.log(`   🎯 Giochi strategia: /api/games?category=Strategia`);
    console.log(`   👥 Giochi 4 player: /api/games?players=4`);
    console.log(`   🔎 Cerca 'catan': /api/games/search?q=catan`);
    console.log(`   🍸 Tutti i drink: /api/drinks`);
    console.log(`   🍺 Drink alcolici: /api/drinks/alcoholic`);
    console.log(`   🥤 Drink analcolici: /api/drinks/non-alcoholic`);
    console.log(`   🔍 Cerca 'gin': /api/drinks/search?q=gin`);
    console.log('🎲🍹 =====================================');
    console.log('💡 Se vedi errori, esegui: node initDb.js e node initDrinksDb.js');
  });
}

// ==========================================
// GESTIONE ERRORI DI AVVIO
// ==========================================

init().catch(err => {
  console.error('❌ ERRORE FATALE - Impossibile avviare il server:');
  console.error(err);
  console.log('💡 Possibili soluzioni:');
  console.log('   - Verifica che la porta 3000 sia libera');
  console.log('   - Controlla che i file db.js e routes esistano');
  console.log('   - Esegui "npm install" per installare le dipendenze');
  console.log('   - Esegui "node initDb.js" per creare il database giochi');
  console.log('   - Esegui "node initDrinksDb.js" per creare il database drink');
  process.exit(1);
});
