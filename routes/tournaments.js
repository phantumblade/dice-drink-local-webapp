const express = require('express');
const router = express.Router();
const TournamentsDao = require('../daos/tournamentsDao');
const TournamentRegistrationsDao = require('../daos/tournamentRegistrationsDao');
const DndCampaignsDao = require('../dao/dndCampaignsDao');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const { User } = require('../models/User');

// ==========================================
// ROUTES PUBBLICHE (senza autenticazione)
// ==========================================

// GET /api/tournaments - Ottieni tutti i tornei con filtri
router.get('/', async (req, res) => {
  try {
    const {
      status,
      category,
      dateFrom,
      dateTo,
      registrationOpen,
      hasAvailableSpots,
      orderBy,
      orderDir,
      limit,
      offset
    } = req.query;

    const filters = {
      status,
      category,
      dateFrom,
      dateTo,
      registrationOpen: registrationOpen === 'true',
      hasAvailableSpots: hasAvailableSpots === 'true',
      orderBy,
      orderDir,
      limit: limit ? parseInt(limit) : null,
      offset: offset ? parseInt(offset) : null
    };

    // Rimuovi filtri undefined
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined || filters[key] === null) {
        delete filters[key];
      }
    });

    const tournaments = await TournamentsDao.findAll(filters);
    
    // Se l'utente è autenticato, aggiungi info registrazione
    if (req.user) {
      for (let tournament of tournaments) {
        tournament.userIsRegistered = await TournamentRegistrationsDao.isUserRegistered(req.user.id, tournament.id);
      }
    }

    res.json({
      success: true,
      data: tournaments,
      total: await TournamentsDao.count(filters)
    });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei tornei',
      error: error.message
    });
  }
});

// GET /api/tournaments/upcoming - Tornei in arrivo
router.get('/upcoming', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const tournaments = await TournamentsDao.findUpcoming(limit);
    
    res.json({
      success: true,
      data: tournaments
    });
  } catch (error) {
    console.error('Error fetching upcoming tournaments:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei tornei in arrivo',
      error: error.message
    });
  }
});

// GET /api/tournaments/popular - Tornei popolari
router.get('/popular', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    const tournaments = await TournamentsDao.getPopular(limit);
    
    res.json({
      success: true,
      data: tournaments
    });
  } catch (error) {
    console.error('Error fetching popular tournaments:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei tornei popolari',
      error: error.message
    });
  }
});

// GET /api/tournaments/stats - Statistiche pubbliche
router.get('/stats', async (req, res) => {
  try {
    const stats = await TournamentsDao.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching tournament stats:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle statistiche',
      error: error.message
    });
  }
});

// GET /api/tournaments/:id - Ottieni torneo specifico
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    
    if (isNaN(tournamentId)) {
      return res.status(400).json({
        success: false,
        message: 'ID torneo non valido'
      });
    }

    const tournament = await TournamentsDao.findById(tournamentId);
    
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Torneo non trovato'
      });
    }

    // Se l'utente è autenticato, aggiungi info registrazione
    if (req.user) {
      tournament.userIsRegistered = await TournamentRegistrationsDao.isUserRegistered(req.user.id, tournamentId);
      tournament.userRegistration = await TournamentRegistrationsDao.getUserRegistration(req.user.id, tournamentId);
    }

    res.json({
      success: true,
      data: tournament
    });
  } catch (error) {
    console.error('Error fetching tournament:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero del torneo',
      error: error.message
    });
  }
});

// GET /api/tournaments/:id/participants - Ottieni partecipanti torneo
router.get('/:id/participants', async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const includeWaitlist = req.query.includeWaitlist === 'true';
    
    if (isNaN(tournamentId)) {
      return res.status(400).json({
        success: false,
        message: 'ID torneo non valido'
      });
    }

    const participants = await TournamentRegistrationsDao.getTournamentParticipants(tournamentId, includeWaitlist);
    const stats = await TournamentRegistrationsDao.getTournamentStats(tournamentId);
    
    res.json({
      success: true,
      data: {
        participants,
        stats
      }
    });
  } catch (error) {
    console.error('Error fetching tournament participants:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei partecipanti',
      error: error.message
    });
  }
});

// ==========================================
// ROUTES PROTETTE (richiedono autenticazione)
// ==========================================

// POST /api/tournaments/:id/register - Iscriviti a un torneo
router.post('/:id/register', requireAuth, async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const userId = req.user.id;
    
    if (isNaN(tournamentId)) {
      return res.status(400).json({
        success: false,
        message: 'ID torneo non valido'
      });
    }

    // Verifica che il torneo esista
    const tournament = await TournamentsDao.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Torneo non trovato'
      });
    }

    // Verifica requisiti per la registrazione
    const user = new User(req.user);
    try {
      user.canMakeBooking(); // Usa la stessa logica delle prenotazioni
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    // Verifica se può registrarsi al torneo
    const tournamentObj = new (require('../models/Tournament'))(tournament);
    const canRegister = tournamentObj.canRegister();
    
    if (!canRegister.canRegister) {
      return res.status(400).json({
        success: false,
        message: canRegister.reason,
        canWaitlist: canRegister.canWaitlist
      });
    }

    // Registra l'utente
    const result = await TournamentRegistrationsDao.register(userId, tournamentId);
    
    res.json({
      success: true,
      message: result.isWaitlist ? 'Aggiunto alla lista d\'attesa' : 'Registrazione completata',
      data: {
        registrationId: result.registrationId,
        isWaitlist: result.isWaitlist,
        position: result.position
      }
    });
    
  } catch (error) {
    console.error('Error registering for tournament:', error);
    res.status(500).json({
      success: false,
      message: error.message === 'Utente già registrato a questo torneo' ? error.message : 'Errore durante la registrazione',
      error: error.message
    });
  }
});

// DELETE /api/tournaments/:id/register - Cancella iscrizione
router.delete('/:id/register', requireAuth, async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const userId = req.user.id;
    
    if (isNaN(tournamentId)) {
      return res.status(400).json({
        success: false,
        message: 'ID torneo non valido'
      });
    }

    await TournamentRegistrationsDao.unregister(userId, tournamentId);
    
    res.json({
      success: true,
      message: 'Iscrizione cancellata con successo'
    });
    
  } catch (error) {
    console.error('Error unregistering from tournament:', error);
    res.status(500).json({
      success: false,
      message: error.message === 'Registrazione non trovata' ? error.message : 'Errore durante la cancellazione',
      error: error.message
    });
  }
});

// GET /api/tournaments/user/my - I miei tornei
router.get('/user/my', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const status = req.query.status; // upcoming, ongoing, completed
    
    const tournaments = await TournamentRegistrationsDao.getUserTournaments(userId, status);
    
    res.json({
      success: true,
      data: tournaments
    });
  } catch (error) {
    console.error('Error fetching user tournaments:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei tuoi tornei',
      error: error.message
    });
  }
});

// ==========================================
// ROUTES ADMIN (richiedono ruolo staff/admin)
// ==========================================

// POST /api/tournaments - Crea nuovo torneo
router.post('/', requireRole(['admin', 'staff']), async (req, res) => {
  try {
    const tournamentData = {
      ...req.body,
      created_by: req.user.id
    };

    const tournamentId = await TournamentsDao.create(tournamentData);
    const tournament = await TournamentsDao.findById(tournamentId);
    
    res.status(201).json({
      success: true,
      message: 'Torneo creato con successo',
      data: tournament
    });
  } catch (error) {
    console.error('Error creating tournament:', error);
    res.status(400).json({
      success: false,
      message: 'Errore nella creazione del torneo',
      error: error.message
    });
  }
});

// PUT /api/tournaments/:id - Aggiorna torneo
router.put('/:id', requireRole(['admin', 'staff']), async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    
    if (isNaN(tournamentId)) {
      return res.status(400).json({
        success: false,
        message: 'ID torneo non valido'
      });
    }

    const success = await TournamentsDao.update(tournamentId, req.body);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Torneo non trovato'
      });
    }

    const tournament = await TournamentsDao.findById(tournamentId);
    
    res.json({
      success: true,
      message: 'Torneo aggiornato con successo',
      data: tournament
    });
  } catch (error) {
    console.error('Error updating tournament:', error);
    res.status(400).json({
      success: false,
      message: 'Errore nell\'aggiornamento del torneo',
      error: error.message
    });
  }
});

// DELETE /api/tournaments/:id - Elimina torneo
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    
    if (isNaN(tournamentId)) {
      return res.status(400).json({
        success: false,
        message: 'ID torneo non valido'
      });
    }

    const success = await TournamentsDao.delete(tournamentId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Torneo non trovato'
      });
    }
    
    res.json({
      success: true,
      message: 'Torneo eliminato con successo'
    });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione del torneo',
      error: error.message
    });
  }
});

// POST /api/tournaments/:id/promote-waitlist - Promuovi dalla lista d'attesa
router.post('/:id/promote-waitlist', requireRole(['admin', 'staff']), async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const { userId } = req.body; // Opzionale, se non fornito promuove il primo
    
    if (isNaN(tournamentId)) {
      return res.status(400).json({
        success: false,
        message: 'ID torneo non valido'
      });
    }

    const promoted = await TournamentRegistrationsDao.promoteFromWaitlist(tournamentId, userId);
    
    res.json({
      success: true,
      message: 'Utente promosso dalla lista d\'attesa',
      data: promoted
    });
  } catch (error) {
    console.error('Error promoting from waitlist:', error);
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
});

// PUT /api/tournaments/:id/status - Aggiorna stato torneo
router.put('/:id/status', requireRole(['admin', 'staff']), async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (isNaN(tournamentId)) {
      return res.status(400).json({
        success: false,
        message: 'ID torneo non valido'
      });
    }

    await TournamentsDao.updateStatus(tournamentId, status);
    const tournament = await TournamentsDao.findById(tournamentId);
    
    res.json({
      success: true,
      message: 'Stato torneo aggiornato',
      data: tournament
    });
  } catch (error) {
    console.error('Error updating tournament status:', error);
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
});

// ==========================================
// D&D CAMPAIGNS ROUTES
// ==========================================

// GET /api/tournaments/:id/campaign - Dettagli campagna D&D
router.get('/:id/campaign', async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    
    if (isNaN(tournamentId)) {
      return res.status(400).json({
        success: false,
        message: 'ID torneo non valido'
      });
    }

    const campaignDetails = await DndCampaignsDao.getCampaignDetails(tournamentId);
    
    if (!campaignDetails) {
      return res.status(404).json({
        success: false,
        message: 'Dettagli campagna non trovati'
      });
    }
    
    res.json({
      success: true,
      data: campaignDetails
    });
  } catch (error) {
    console.error('Error fetching campaign details:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dettagli campagna',
      error: error.message
    });
  }
});

// GET /api/tournaments/:id/characters - Personaggi della campagna
router.get('/:id/characters', async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    
    if (isNaN(tournamentId)) {
      return res.status(400).json({
        success: false,
        message: 'ID torneo non valido'
      });
    }

    const characters = await DndCampaignsDao.getCampaignCharacters(tournamentId);
    
    res.json({
      success: true,
      data: characters
    });
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero personaggi',
      error: error.message
    });
  }
});

// GET /api/tournaments/characters/:characterId - Dettagli personaggio
router.get('/characters/:characterId', async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId);
    
    if (isNaN(characterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID personaggio non valido'
      });
    }

    const character = await DndCampaignsDao.getCharacterDetails(characterId);
    
    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Personaggio non trovato'
      });
    }
    
    res.json({
      success: true,
      data: character
    });
  } catch (error) {
    console.error('Error fetching character details:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dettagli personaggio',
      error: error.message
    });
  }
});

// GET /api/tournaments/:id/characters/:name - Trova personaggio per nome
router.get('/:id/characters/:name', async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const characterName = req.params.name;
    
    if (isNaN(tournamentId)) {
      return res.status(400).json({
        success: false,
        message: 'ID torneo non valido'
      });
    }

    const character = await DndCampaignsDao.findCharacterByName(tournamentId, characterName);
    
    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Personaggio non trovato'
      });
    }
    
    res.json({
      success: true,
      data: character
    });
  } catch (error) {
    console.error('Error finding character by name:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella ricerca del personaggio',
      error: error.message
    });
  }
});

module.exports = router;