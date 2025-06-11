// COSA FA: Espone endpoint HTTP per frontend (/api/snacks)
// RELAZIONI: Usa SnacksDao per dati, valida input, gestisce errori

const express = require('express');
const SnacksDao = require('../daos/snacksDao');

const router = express.Router();

// ==========================================
// ENDPOINT PUBBLICI (accessibili a tutti)
// ==========================================

// GET /api/snacks - Lista tutti gli snack con filtri opzionali
// Query params: sweet, mainIngredient, minPrice, maxPrice, suggestedGame, orderBy, orderDir, limit, offset
// Esempio: /api/snacks?sweet=true&mainIngredient=cioccolato&limit=5
router.get('/', async (req, res, next) => {
  try {
    // Estrae i filtri dalla query string
    const filters = {
      sweet: req.query.sweet,
      mainIngredient: req.query.mainIngredient,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      suggestedGame: req.query.suggestedGame,
      orderBy: req.query.orderBy,
      orderDir: req.query.orderDir,
      limit: req.query.limit,
      offset: req.query.offset
    };

    // Chiama il DAO per ottenere gli snack filtrati
    const snacks = await SnacksDao.findAll(filters);

    // Se richiesta paginazione, includi anche il totale
    if (req.query.limit) {
      const total = await SnacksDao.count(filters);
      res.json({
        snacks,
        total,
        limit: parseInt(req.query.limit) || 10,
        offset: parseInt(req.query.offset) || 0
      });
    } else {
      // Risposta semplice: solo array di snack
      res.json(snacks);
    }
  } catch (err) {
    next(err); // Passa l'errore al middleware di gestione errori
  }
});

// GET /api/snacks/recommended - Snack consigliati (economici di ogni categoria)
// Query param: limit (default 6)
// Esempio: /api/snacks/recommended?limit=4
router.get('/recommended', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const snacks = await SnacksDao.getRecommended(limit);
    res.json(snacks);
  } catch (err) {
    next(err);
  }
});

// GET /api/snacks/sweet - Solo snack dolci
// Esempio: /api/snacks/sweet
router.get('/sweet', async (req, res, next) => {
  try {
    const snacks = await SnacksDao.findSweet();
    res.json(snacks);
  } catch (err) {
    next(err);
  }
});

// GET /api/snacks/savory - Solo snack salati
// Esempio: /api/snacks/savory
router.get('/savory', async (req, res, next) => {
  try {
    const snacks = await SnacksDao.findSavory();
    res.json(snacks);
  } catch (err) {
    next(err);
  }
});

// GET /api/snacks/game-friendly - Snack facili da mangiare durante il gioco
// Esempio: /api/snacks/game-friendly
router.get('/game-friendly', async (req, res, next) => {
  try {
    const snacks = await SnacksDao.getGameFriendly();
    res.json(snacks);
  } catch (err) {
    next(err);
  }
});

// GET /api/snacks/ingredients - Lista tutti gli ingredienti principali disponibili
// Esempio risposta: ["formaggio", "cioccolato", "mais", "patate"]
router.get('/ingredients', async (req, res, next) => {
  try {
    const ingredients = await SnacksDao.getMainIngredients();
    res.json(ingredients);
  } catch (err) {
    next(err);
  }
});

// GET /api/snacks/time/:timeOfDay - Snack per momento della giornata
// Parametri: aperitivo, merenda, fine-serata
// Esempio: /api/snacks/time/aperitivo
router.get('/time/:timeOfDay', async (req, res, next) => {
  try {
    const timeOfDay = req.params.timeOfDay.replace('-', ' '); // "fine-serata" -> "fine serata"
    const validTimes = ['aperitivo', 'merenda', 'fine serata'];

    if (!validTimes.includes(timeOfDay.toLowerCase())) {
      return res.status(400).json({
        error: 'Momento della giornata non valido',
        provided: req.params.timeOfDay,
        valid: ['aperitivo', 'merenda', 'fine-serata']
      });
    }

    const snacks = await SnacksDao.getByTime(timeOfDay);
    res.json(snacks);
  } catch (err) {
    next(err);
  }
});

// GET /api/snacks/price-range/:min/:max - Snack in una fascia di prezzo
// Esempio: /api/snacks/price-range/4/6
router.get('/price-range/:min/:max', async (req, res, next) => {
  try {
    const minPrice = parseFloat(req.params.min);
    const maxPrice = parseFloat(req.params.max);

    // Validazione range prezzo
    if (isNaN(minPrice) || isNaN(maxPrice) || minPrice < 0 || maxPrice < minPrice) {
      return res.status(400).json({
        error: 'Range di prezzo non valido',
        provided: `${req.params.min}-${req.params.max}`,
        rules: 'minPrice >= 0 e maxPrice >= minPrice'
      });
    }

    const snacks = await SnacksDao.findByPriceRange(minPrice, maxPrice);
    res.json(snacks);
  } catch (err) {
    next(err);
  }
});

// GET /api/snacks/search?q=termine - Ricerca per nome/descrizione
// Query param: q (termine di ricerca obbligatorio)
// Esempio: /api/snacks/search?q=cioccolato
router.get('/search', async (req, res, next) => {
  try {
    const searchTerm = req.query.q;

    // Validazione: termine di ricerca obbligatorio
    if (!searchTerm) {
      return res.status(400).json({
        error: 'Query parameter "q" è richiesto',
        example: '/api/snacks/search?q=cioccolato'
      });
    }

    const snacks = await SnacksDao.searchByName(searchTerm);
    res.json(snacks);
  } catch (err) {
    next(err);
  }
});

// GET /api/snacks/ingredient/:ingredient - Snack per ingrediente specifico
// Esempio: /api/snacks/ingredient/cioccolato
router.get('/ingredient/:ingredient', async (req, res, next) => {
  try {
    const ingredient = req.params.ingredient;
    const snacks = await SnacksDao.findByIngredient(ingredient);
    res.json(snacks);
  } catch (err) {
    next(err);
  }
});

// GET /api/snacks/game/:gameType - Snack per tipologia di gioco
// Esempio: /api/snacks/game/strategia
router.get('/game/:gameType', async (req, res, next) => {
  try {
    const gameType = req.params.gameType;
    const snacks = await SnacksDao.findByGameType(gameType);
    res.json(snacks);
  } catch (err) {
    next(err);
  }
});

// GET /api/snacks/drink/:drinkName - Snack abbinati a un drink specifico
// Esempio: /api/snacks/drink/negroni
router.get('/drink/:drinkName', async (req, res, next) => {
  try {
    const drinkName = req.params.drinkName;
    const snacks = await SnacksDao.findBySuggestedDrink(drinkName);
    res.json(snacks);
  } catch (err) {
    next(err);
  }
});

// GET /api/snacks/:id - Dettagli di uno snack specifico
// Esempio: /api/snacks/1
router.get('/:id', async (req, res, next) => {
  try {
    const snackId = parseInt(req.params.id);

    // Validazione: ID deve essere un numero
    if (isNaN(snackId)) {
      return res.status(400).json({
        error: 'ID snack non valido',
        provided: req.params.id,
        expected: 'numero intero'
      });
    }

    const snack = await SnacksDao.findById(snackId);

    // Se lo snack non esiste, ritorna 404
    if (!snack) {
      return res.status(404).json({
        error: 'Snack non trovato',
        snackId: snackId
      });
    }

    res.json(snack);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// ENDPOINT ADMIN (richiederanno autenticazione)
// ==========================================

// POST /api/snacks - Crea un nuovo snack (SOLO ADMIN)
router.post('/', async (req, res, next) => {
  try {
    // TODO: Aggiungere middleware di autenticazione admin
    // router.post('/', requireAdmin, async (req, res, next) => {

    const snackData = req.body;

    // Validazione campi obbligatori
    const requiredFields = ['name', 'isSweet', 'mainIngredient', 'price'];
    const missingFields = requiredFields.filter(field => snackData[field] === undefined);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Campi obbligatori mancanti',
        missing: missingFields,
        required: requiredFields
      });
    }

    // Validazione prezzo
    if (snackData.price <= 0) {
      return res.status(400).json({
        error: 'Il prezzo deve essere maggiore di 0',
        provided: snackData.price
      });
    }

    // Validazione tipo dolce (deve essere boolean)
    if (typeof snackData.isSweet !== 'boolean') {
      return res.status(400).json({
        error: 'isSweet deve essere true o false',
        provided: snackData.isSweet,
        type: typeof snackData.isSweet
      });
    }

    const snackId = await SnacksDao.create(snackData);
    res.status(201).json({
      id: snackId,
      message: 'Snack creato con successo',
      snack: await SnacksDao.findById(snackId)
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/snacks/:id - Aggiorna uno snack esistente (SOLO ADMIN)
router.put('/:id', async (req, res, next) => {
  try {
    // TODO: Aggiungere middleware di autenticazione admin

    const snackId = parseInt(req.params.id);
    if (isNaN(snackId)) {
      return res.status(400).json({ error: 'ID snack non valido' });
    }

    const snackData = req.body;

    // Validazione prezzo se presente
    if (snackData.price !== undefined && snackData.price <= 0) {
      return res.status(400).json({
        error: 'Il prezzo deve essere maggiore di 0'
      });
    }

    // Validazione tipo dolce se presente
    if (snackData.isSweet !== undefined && typeof snackData.isSweet !== 'boolean') {
      return res.status(400).json({
        error: 'isSweet deve essere true o false'
      });
    }

    const updated = await SnacksDao.update(snackId, snackData);
    if (!updated) {
      return res.status(404).json({ error: 'Snack non trovato' });
    }

    res.json({
      message: 'Snack aggiornato con successo',
      snack: await SnacksDao.findById(snackId)
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/snacks/:id - Elimina uno snack (SOLO ADMIN)
router.delete('/:id', async (req, res, next) => {
  try {
    // TODO: Aggiungere middleware di autenticazione admin

    const snackId = parseInt(req.params.id);
    if (isNaN(snackId)) {
      return res.status(400).json({ error: 'ID snack non valido' });
    }

    const deleted = await SnacksDao.delete(snackId);
    if (!deleted) {
      return res.status(404).json({ error: 'Snack non trovato' });
    }

    res.json({
      message: 'Snack eliminato con successo',
      deletedId: snackId
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
