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

  // 🎮 GAMES API - Nuove routes per giochi da tavolo
  const gamesRouter = require('./routes/games');
  app.use('/api/games', gamesRouter);

  // ==========================================
  // VERIFICA DATABASE (non crea più tabelle qui)
  // ==========================================

  // Verifica solo che il database sia accessibile
  // Le tabelle vengono create da initDb.js
  try {
    const db = await openDb();
    const result = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='games'");

    if (!result) {
      console.log('⚠️  ATTENZIONE: Tabella games non trovata!');
      console.log('💡 Esegui: node initDb.js');
    } else {
      const count = await db.get('SELECT COUNT(*) as count FROM games');
      console.log(`✅ Database OK - ${count.count} giochi disponibili`);
    }

    await db.close();
  } catch (err) {
    console.log('⚠️  Impossibile verificare il database');
    console.log('💡 Assicurati di aver eseguito: node initDb.js');
  }

  // ==========================================
  // ENDPOINT DI UTILITÀ
  // ==========================================

  // Health check per verificare che l'API funzioni
  app.get('/api/health', async (req, res) => {
    try {
      const db = await openDb();
      const gameCount = await db.get('SELECT COUNT(*) as count FROM games');
      const categories = await db.all('SELECT DISTINCT category FROM games ORDER BY category');
      await db.close();

      res.json({
        status: 'OK',
        message: 'Dice & Drink API is running',
        version: '1.0.0',
        database: {
          games: gameCount.count,
          categories: categories.map(c => c.category)
        },
        endpoints: {
          games: {
            list: 'GET /api/games',
            details: 'GET /api/games/:id',
            search: 'GET /api/games/search?q=term',
            categories: 'GET /api/games/categories',
            popular: 'GET /api/games/popular'
          }
        },
        examples: {
          allGames: '/api/games',
          strategyGames: '/api/games?category=Strategia',
          fourPlayerGames: '/api/games?players=4',
          searchCatan: '/api/games/search?q=catan'
        }
      });
    } catch (err) {
      res.status(500).json({
        status: 'ERROR',
        message: 'Database non disponibile',
        hint: 'Esegui: node initDb.js'
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
    console.log('🎲 =====================================');
    console.log('🎲  DICE & DRINK SERVER AVVIATO!');
    console.log('🎲 =====================================');
    console.log(`🌐 Server URL: http://localhost:${port}`);
    console.log(`🔍 Health Check: http://localhost:${port}/api/health`);
    console.log('📡 API Endpoints:');
    console.log(`   🎮 Games: http://localhost:${port}/api/games`);
    console.log('📝 Esempi:');
    console.log(`   📋 Tutti i giochi: /api/games`);
    console.log(`   🎯 Giochi strategia: /api/games?category=Strategia`);
    console.log(`   👥 Giochi 4 player: /api/games?players=4`);
    console.log(`   🔎 Cerca 'catan': /api/games/search?q=catan`);
    console.log('🎲 =====================================');
    console.log('💡 Se vedi errori, esegui: node initDb.js');
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
  console.log('   - Esegui "node initDb.js" per creare il database');
  process.exit(1);
});
