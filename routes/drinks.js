const express = require('express');
const DrinksDao = require('../daos/drinksDao');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ==========================================
// ENDPOINT PUBBLICI (accessibili a tutti)
// ==========================================

// GET /api/drinks - Lista tutti i drink con filtri opzionali
router.get('/', async (req, res, next) => {
  try {
    // Estrae i filtri dalla query string
    const filters = {
      alcoholic: req.query.alcoholic,
      baseSpirit: req.query.baseSpirit,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      orderBy: req.query.orderBy,
      orderDir: req.query.orderDir,
      limit: req.query.limit,
      offset: req.query.offset
    };

    // Chiama il DAO per ottenere i drink filtrati
    const drinks = await DrinksDao.findAll(filters);

    // Se richiesta paginazione, includi anche il totale
    if (req.query.limit) {
      const total = await DrinksDao.count(filters);
      res.json({
        drinks,
        total,
        limit: parseInt(req.query.limit) || 10,
        offset: parseInt(req.query.offset) || 0
      });
    } else {
      res.json(drinks);
    }
  } catch (err) {
    next(err); // Passa l'errore al middleware di gestione errori
  }
});

// GET /api/drinks/recommended - Drink consigliati (economici di ogni categoria)
router.get('/recommended', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const drinks = await DrinksDao.getRecommended(limit);
    res.json(drinks);
  } catch (err) {
    next(err);
  }
});

// GET /api/drinks/alcoholic - Solo drink alcolici
router.get('/alcoholic', async (req, res, next) => {
  try {
    const drinks = await DrinksDao.findByType(true);
    res.json(drinks);
  } catch (err) {
    next(err);
  }
});

// GET /api/drinks/non-alcoholic - Solo drink analcolici
router.get('/non-alcoholic', async (req, res, next) => {
  try {
    const drinks = await DrinksDao.findByType(false);
    res.json(drinks);
  } catch (err) {
    next(err);
  }
});

// GET /api/drinks/base-spirits - Lista tutti i base spirits disponibili
router.get('/base-spirits', async (req, res, next) => {
  try {
    const baseSpirits = await DrinksDao.getBaseSpirits();
    res.json(baseSpirits);
  } catch (err) {
    next(err);
  }
});

// GET /api/drinks/price-range/:min/:max - Drink in una fascia di prezzo
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

    const drinks = await DrinksDao.findByPriceRange(minPrice, maxPrice);
    res.json(drinks);
  } catch (err) {
    next(err);
  }
});

// GET /api/drinks/search?q=termine - Ricerca per nome/descrizione
router.get('/search', async (req, res, next) => {
  try {
    const searchTerm = req.query.q;

    // Validazione: termine di ricerca obbligatorio
    if (!searchTerm) {
      return res.status(400).json({
        error: 'Query parameter "q" è richiesto',
        example: '/api/drinks/search?q=gin'
      });
    }

    const drinks = await DrinksDao.searchByName(searchTerm);
    res.json(drinks);
  } catch (err) {
    next(err);
  }
});

// GET /api/drinks/spirit/:spirit - Drink per base spirit specifico
router.get('/spirit/:spirit', async (req, res, next) => {
  try {
    const baseSpirit = req.params.spirit;
    const drinks = await DrinksDao.findByBaseSpirit(baseSpirit);
    res.json(drinks);
  } catch (err) {
    next(err);
  }
});

// GET /api/drinks/:id - Dettagli di un drink specifico
router.get('/:id', async (req, res, next) => {
  try {
    const drinkId = parseInt(req.params.id);

    // Validazione: ID deve essere un numero
    if (isNaN(drinkId)) {
      return res.status(400).json({
        error: 'ID drink non valido',
        provided: req.params.id,
        expected: 'numero intero'
      });
    }

    const drink = await DrinksDao.findById(drinkId);

    // Se il drink non esiste, ritorna 404
    if (!drink) {
      return res.status(404).json({
        error: 'Drink non trovato',
        drinkId: drinkId
      });
    }

    res.json(drink);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// ENDPOINT ADMIN (richiederanno autenticazione)
// ==========================================

// POST /api/drinks - Crea un nuovo drink (SOLO ADMIN)
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const drinkData = req.body;

    // Validazione campi obbligatori
    const requiredFields = ['name', 'isAlcoholic', 'baseSpirit', 'price'];
    const missingFields = requiredFields.filter(field => drinkData[field] === undefined);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Campi obbligatori mancanti',
        missing: missingFields,
        required: requiredFields
      });
    }

    // Validazione prezzo
    if (drinkData.price <= 0) {
      return res.status(400).json({
        error: 'Il prezzo deve essere maggiore di 0',
        provided: drinkData.price
      });
    }

    // Validazione tipo alcolico (deve essere boolean)
    if (typeof drinkData.isAlcoholic !== 'boolean') {
      return res.status(400).json({
        error: 'isAlcoholic deve essere true o false',
        provided: drinkData.isAlcoholic,
        type: typeof drinkData.isAlcoholic
      });
    }

    const drinkId = await DrinksDao.create(drinkData);
    res.status(201).json({
      id: drinkId,
      message: 'Drink creato con successo',
      drink: await DrinksDao.findById(drinkId)
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/drinks/:id - Aggiorna un drink esistente (SOLO ADMIN)
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const drinkId = parseInt(req.params.id);
    if (isNaN(drinkId)) {
      return res.status(400).json({ error: 'ID drink non valido' });
    }

    const drinkData = req.body;

    if (drinkData.price !== undefined && drinkData.price <= 0) {
      return res.status(400).json({
        error: 'Il prezzo deve essere maggiore di 0'
      });
    }

    if (drinkData.isAlcoholic !== undefined && typeof drinkData.isAlcoholic !== 'boolean') {
      return res.status(400).json({
        error: 'isAlcoholic deve essere true o false'
      });
    }

    const updated = await DrinksDao.update(drinkId, drinkData);
    if (!updated) {
      return res.status(404).json({ error: 'Drink non trovato' });
    }

    res.json({
      message: 'Drink aggiornato con successo',
      drink: await DrinksDao.findById(drinkId)
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/drinks/:id - Elimina un drink (SOLO ADMIN)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const drinkId = parseInt(req.params.id);
    if (isNaN(drinkId)) {
      return res.status(400).json({ error: 'ID drink non valido' });
    }

    const deleted = await DrinksDao.delete(drinkId);
    if (!deleted) {
      return res.status(404).json({ error: 'Drink non trovato' });
    }

    res.json({
      message: 'Drink eliminato con successo',
      deletedId: drinkId
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
