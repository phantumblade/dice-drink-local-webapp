// COSA FA: Espone endpoint HTTP per frontend (/api/games)
// RELAZIONI: Usa GamesDao per dati, valida input, gestisce errori

// routes/games.js
// SCOPO: Espone endpoint HTTP per gestire i giochi da tavolo
// RELAZIONI: Usa gamesDao.js per operazioni database, chiamato da server.js

const express = require('express');
const GamesDao = require('../daos/gamesDao');

const router = express.Router();

// ==========================================
// ENDPOINT PUBBLICI (accessibili a tutti)
// ==========================================

// GET /api/games - Lista tutti i giochi con filtri opzionali
// Query params: category, players, difficulty, maxDuration, orderBy, orderDir, limit, offset
// Esempio: /api/games?category=Strategia&players=4&limit=10
router.get('/', async (req, res, next) => {
  try {
    // Estrae i filtri dalla query string
    const filters = {
      category: req.query.category,
      players: req.query.players,
      difficulty: req.query.difficulty,
      maxDuration: req.query.maxDuration,
      orderBy: req.query.orderBy,
      orderDir: req.query.orderDir,
      limit: req.query.limit,
      offset: req.query.offset
    };

    // Chiama il DAO per ottenere i giochi filtrati
    const games = await GamesDao.findAll(filters);

    // Se richiesta paginazione, includi anche il totale
    if (req.query.limit) {
      const total = await GamesDao.count(filters);
      res.json({
        games,
        total,
        limit: parseInt(req.query.limit) || 10,
        offset: parseInt(req.query.offset) || 0
      });
    } else {
      // Risposta semplice: solo array di giochi
      res.json(games);
    }
  } catch (err) {
    next(err); // Passa l'errore al middleware di gestione errori
  }
});

// GET /api/games/popular - Giochi più popolari/consigliati
// Query param: limit (default 10)
// Esempio: /api/games/popular?limit=5
router.get('/popular', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const games = await GamesDao.getPopular(limit);
    res.json(games);
  } catch (err) {
    next(err);
  }
});

// GET /api/games/categories - Lista tutte le categorie disponibili
// Esempio risposta: ["Strategia", "Party Game", "Cooperativo"]
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await GamesDao.getCategories();
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// GET /api/games/search?q=termine - Ricerca per nome/descrizione
// Query param: q (termine di ricerca obbligatorio)
// Esempio: /api/games/search?q=catan
router.get('/search', async (req, res, next) => {
  try {
    const searchTerm = req.query.q;

    // Validazione: termine di ricerca obbligatorio
    if (!searchTerm) {
      return res.status(400).json({
        error: 'Query parameter "q" è richiesto',
        example: '/api/games/search?q=catan'
      });
    }

    const games = await GamesDao.searchByName(searchTerm);
    res.json(games);
  } catch (err) {
    next(err);
  }
});

// GET /api/games/:id - Dettagli di un gioco specifico
// Esempio: /api/games/1
router.get('/:id', async (req, res, next) => {
  try {
    const gameId = parseInt(req.params.id);

    // Validazione: ID deve essere un numero
    if (isNaN(gameId)) {
      return res.status(400).json({
        error: 'ID gioco non valido',
        provided: req.params.id,
        expected: 'numero intero'
      });
    }

    const game = await GamesDao.findById(gameId);

    // Se il gioco non esiste, ritorna 404
    if (!game) {
      return res.status(404).json({
        error: 'Gioco non trovato',
        gameId: gameId
      });
    }

    res.json(game);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// ENDPOINT ADMIN (richiederanno autenticazione)
// ==========================================

// POST /api/games - Crea un nuovo gioco (SOLO ADMIN)
router.post('/', async (req, res, next) => {
  try {
    // TODO: Aggiungere middleware di autenticazione admin
    // router.post('/', requireAdmin, async (req, res, next) => {

    const gameData = req.body;

    // Validazione campi obbligatori
    const requiredFields = ['name', 'minPlayers', 'maxPlayers', 'rentalPrice'];
    const missingFields = requiredFields.filter(field => !gameData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Campi obbligatori mancanti',
        missing: missingFields,
        required: requiredFields
      });
    }

    // Validazione range giocatori
    if (gameData.minPlayers < 1 || gameData.maxPlayers < gameData.minPlayers) {
      return res.status(400).json({
        error: 'Range giocatori non valido',
        provided: `${gameData.minPlayers}-${gameData.maxPlayers}`,
        rules: 'minPlayers >= 1 e maxPlayers >= minPlayers'
      });
    }

    // Validazione prezzo
    if (gameData.rentalPrice <= 0) {
      return res.status(400).json({
        error: 'Il prezzo deve essere maggiore di 0',
        provided: gameData.rentalPrice
      });
    }

    // Validazione difficoltà (se fornita)
    if (gameData.difficultyLevel && (gameData.difficultyLevel < 1 || gameData.difficultyLevel > 5)) {
      return res.status(400).json({
        error: 'Difficoltà deve essere tra 1 e 5',
        provided: gameData.difficultyLevel
      });
    }

    const gameId = await GamesDao.create(gameData);
    res.status(201).json({
      id: gameId,
      message: 'Gioco creato con successo',
      game: await GamesDao.findById(gameId)
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/games/:id - Aggiorna un gioco esistente (SOLO ADMIN)
router.put('/:id', async (req, res, next) => {
  try {
    // TODO: Aggiungere middleware di autenticazione admin

    const gameId = parseInt(req.params.id);
    if (isNaN(gameId)) {
      return res.status(400).json({ error: 'ID gioco non valido' });
    }

    const gameData = req.body;

    // Validazione campi se presenti
    if (gameData.minPlayers && gameData.maxPlayers &&
        gameData.maxPlayers < gameData.minPlayers) {
      return res.status(400).json({
        error: 'Range giocatori non valido'
      });
    }

    if (gameData.rentalPrice && gameData.rentalPrice <= 0) {
      return res.status(400).json({
        error: 'Il prezzo deve essere maggiore di 0'
      });
    }

    if (gameData.difficultyLevel && (gameData.difficultyLevel < 1 || gameData.difficultyLevel > 5)) {
      return res.status(400).json({
        error: 'Difficoltà deve essere tra 1 e 5'
      });
    }

    const updated = await GamesDao.update(gameId, gameData);
    if (!updated) {
      return res.status(404).json({ error: 'Gioco non trovato' });
    }

    res.json({
      message: 'Gioco aggiornato con successo',
      game: await GamesDao.findById(gameId)
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/games/:id - Elimina un gioco (SOLO ADMIN)
router.delete('/:id', async (req, res, next) => {
  try {
    // TODO: Aggiungere middleware di autenticazione admin

    const gameId = parseInt(req.params.id);
    if (isNaN(gameId)) {
      return res.status(400).json({ error: 'ID gioco non valido' });
    }

    const deleted = await GamesDao.delete(gameId);
    if (!deleted) {
      return res.status(404).json({ error: 'Gioco non trovato' });
    }

    res.json({
      message: 'Gioco eliminato con successo',
      deletedId: gameId
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
