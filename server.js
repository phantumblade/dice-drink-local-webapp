const express = require('express');
const path = require('path');
const openDb = require('./db');

async function init() {
  const app = express();
  const port = process.env.PORT || 3000;


  app.use(express.json());

app.use(express.static('public', {
  setHeaders: (res, path, stat) => {
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript; charset=utf-8');
    }
    if (path.endsWith('.css')) {
      res.set('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));


  // GAMES API - Routes per giochi da tavolo
  const gamesRouter = require('./routes/games');
  app.use('/api/games', gamesRouter);

  // DRINKS API - Routes per drink e bevande
  const drinksRouter = require('./routes/drinks');
  app.use('/api/drinks', drinksRouter);

  // SNACKS API - Routes per snack e cibo
  const snacksRouter = require('./routes/snacks');
  app.use('/api/snacks', snacksRouter);

  // AUTH API - Routes per autenticazione (login, register, logout)
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);

  // USERS API - Routes per gestione profilo utente
  const usersRoutes = require('./routes/users');
  app.use('/api/users', usersRoutes);

  // ADMIN API - Routes per pannello amministrativo
  const adminRoutes = require('./routes/admin');
  app.use('/api/admin', adminRoutes);

  // TOURNAMENTS API - Routes per tornei
  const tournamentsRoutes = require('./routes/tournaments');
  app.use('/api/tournaments', tournamentsRoutes);

  // USER STATS API - Routes per statistiche e coccarde utenti
  const userStatsRoutes = require('./routes/userStats');
  app.use('/api/user-stats', userStatsRoutes);




  // Verifica che i database siano accessibili
  try {
    const db = await openDb();

    // Verifica tabella games
    const gamesTable = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='games'");
    // Verifica tabella drinks
    const drinksTable = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='drinks'");
    // Verifica tabella snacks
    const snacksTable = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='snacks'");
    // Verifica tabella tournaments
    const tournamentsTable = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='tournaments'");
    // Verifica tabella user_statistics
    const userStatsTable = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='user_statistics'");

    if (!gamesTable) {
      console.log('⚠️  ATTENZIONE: Tabella games non trovata!');
      console.log('💡 Esegui: node initGamesDb.js');
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

    if (!snacksTable) {
      console.log('⚠️  ATTENZIONE: Tabella snacks non trovata!');
      console.log('💡 Esegui: node initSnacksDb.js');
    } else {
      const snackCount = await db.get('SELECT COUNT(*) as count FROM snacks');
      console.log(`✅ Database Snacks OK - ${snackCount.count} snack disponibili`);
    }

    if (!tournamentsTable) {
      console.log('⚠️  ATTENZIONE: Tabella tournaments non trovata!');
      console.log('💡 Esegui: node initTournamentsDb.js');
    } else {
      const tournamentCount = await db.get('SELECT COUNT(*) as count FROM tournaments');
      console.log(`✅ Database Tournaments OK - ${tournamentCount.count} tornei disponibili`);
    }

    if (!userStatsTable) {
      console.log('⚠️  ATTENZIONE: Tabella user_statistics non trovata!');
      console.log('💡 Esegui: node initUserStatsDb.js');
    } else {
      const statsCount = await db.get('SELECT COUNT(*) as count FROM user_statistics');
      const badgesCount = await db.get('SELECT COUNT(*) as count FROM user_badges');
      console.log(`✅ Database User Stats OK - ${statsCount.count} statistiche, ${badgesCount.count} coccarde`);
    }

    await db.close();
  } catch (err) {
    console.log('⚠️  Impossibile verificare il database');
    console.log('💡 Assicurati di aver eseguito: node initGamesDb.js, node initDrinksDb.js, node initSnacksDb.js, node initTournamentsDb.js e node initUsersDb.js (più initUserStatsDb.js se servono le statistiche)');
  }

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

      // Controlla snacks
      const snackCount = await db.get('SELECT COUNT(*) as count FROM snacks');
      const mainIngredients = await db.all('SELECT DISTINCT main_ingredient FROM snacks ORDER BY main_ingredient');

      await db.close();

      res.json({
        status: 'OK',
        message: 'Dice & Drink & Snack API is running',
        version: '1.0.0',
        database: {
          games: gameCount.count,
          drinks: drinkCount.count,
          snacks: snackCount.count,
          categories: categories.map(c => c.category),
          baseSpirits: baseSpirits.map(s => s.base_spirit),
          mainIngredients: mainIngredients.map(i => i.main_ingredient)
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
          },
          snacks: {
            list: 'GET /api/snacks',
            details: 'GET /api/snacks/:id',
            search: 'GET /api/snacks/search?q=term',
            sweet: 'GET /api/snacks/sweet',
            savory: 'GET /api/snacks/savory',
            gameFriendly: 'GET /api/snacks/game-friendly',
            ingredients: 'GET /api/snacks/ingredients',
            recommended: 'GET /api/snacks/recommended'
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
          searchGin: '/api/drinks/search?q=gin',
          allSnacks: '/api/snacks',
          sweetSnacks: '/api/snacks/sweet',
          cheeseSnacks: '/api/snacks/ingredient/formaggio',
          gameFriendlySnacks: '/api/snacks/game-friendly',
          searchChocolate: '/api/snacks/search?q=cioccolato'
        }
      });
    } catch (err) {
      res.status(500).json({
        status: 'ERROR',
        message: 'Database non disponibile',
        hint: 'Esegui: node initGamesDb.js, node initDrinksDb.js, node initSnacksDb.js, node initTournamentsDb.js, node initUsersDb.js e node initUserStatsDb.js'
      });
    }
  });

  // Endpoint per servire la SPA (tutte le route non-API vanno all'index.html)
  app.get('*', (req, res, next) => {
    // Se la richiesta è per l'API, passa al prossimo middleware (404)
    if (req.path.startsWith('/api/')) {
      return next();
    }
      // Se è un file statico (.js, .css, .png, etc), passa al prossimo middleware
    if (req.path.includes('.')) {
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
    console.log('🎲🍹🍿 =====================================');
    console.log('🎲🍹🍿  DICE & DRINK & SNACK SERVER!');
    console.log('🎲🍹🍿 =====================================');
    console.log(`🌐 Server URL: http://localhost:${port}`);
    console.log(`🔍 Health Check: http://localhost:${port}/api/health`);
    console.log('📡 API Endpoints:');
    console.log(`   🎮 Games: http://localhost:${port}/api/games`);
    console.log(`   🍹 Drinks: http://localhost:${port}/api/drinks`);
    console.log(`   🍿 Snacks: http://localhost:${port}/api/snacks`);
    console.log('📝 Esempi:');
    console.log(`   📋 Tutti i giochi: /api/games`);
    console.log(`   🎯 Giochi strategia: /api/games?category=Strategia`);
    console.log(`   👥 Giochi 4 player: /api/games?players=4`);
    console.log(`   🔎 Cerca 'catan': /api/games/search?q=catan`);
    console.log(`   🍸 Tutti i drink: /api/drinks`);
    console.log(`   🍺 Drink alcolici: /api/drinks/alcoholic`);
    console.log(`   🥤 Drink analcolici: /api/drinks/non-alcoholic`);
    console.log(`   🔍 Cerca 'gin': /api/drinks/search?q=gin`);
    console.log(`   🧀 Tutti gli snack: /api/snacks`);
    console.log(`   🍫 Snack dolci: /api/snacks/sweet`);
    console.log(`   🎮 Snack game-friendly: /api/snacks/game-friendly`);
    console.log(`   🔍 Cerca 'cioccolato': /api/snacks/search?q=cioccolato`);
    console.log('🎲🍹🍿 =====================================');
    console.log('💡 Se vedi errori, esegui: node initGamesDb.js, node initDrinksDb.js, node initSnacksDb.js, node initTournamentsDb.js, node initUsersDb.js e node initUserStatsDb.js');
  });
}

init().catch(err => {
  console.error('❌ ERRORE FATALE - Impossibile avviare il server:');
  console.error(err);
  console.log('💡 Possibili soluzioni:');
  console.log('   - Verifica che la porta 3000 sia libera');
  console.log('   - Controlla che i file db.js e routes esistano');
  console.log('   - Esegui "npm install" per installare le dipendenze');
  console.log('   - Esegui "node initGamesDb.js" per creare il database giochi');
  console.log('   - Esegui "node initDrinksDb.js" per creare il database drink');
  console.log('   - Esegui "node initSnacksDb.js" per creare il database snack');
  console.log('   - Esegui "node initTournamentsDb.js" per creare il database tornei');
  console.log('   - Esegui "node initUserStatsDb.js" per creare il database statistiche');
  process.exit(1);
});
