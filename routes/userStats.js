const express = require('express');
const router = express.Router();
const UserStatsDao = require('../dao/userStatsDao');
const { requireAuth } = require('../middleware/auth');

// ==========================================
// STATISTICHE UTENTE
// ==========================================

// GET /api/user-stats/statistics - Ottieni statistiche dell'utente corrente
router.get('/statistics', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await UserStatsDao.getUserStatistics(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero delle statistiche',
      error: error.message
    });
  }
});

// GET /api/user-stats/badges - Ottieni coccarde dell'utente corrente
router.get('/badges', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const badges = await UserStatsDao.getUserBadges(userId);
    
    res.json({
      success: true,
      data: badges
    });
  } catch (error) {
    console.error('Error fetching user badges:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero delle coccarde',
      error: error.message
    });
  }
});

// GET /api/user-stats/history - Ottieni cronologia tornei utente
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const history = await UserStatsDao.getUserTournamentHistory(userId, limit);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching user tournament history:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero della cronologia tornei',
      error: error.message
    });
  }
});

// POST /api/user-stats/tournament-result - Aggiungi risultato torneo (solo admin/staff)
router.post('/tournament-result', requireAuth, async (req, res) => {
  try {
    const { tournamentId, userId, finalPosition, pointsScored, prizeWon, gamesWon, gamesLost, hoursPlayed, notes } = req.body;
    
    // Solo admin e staff possono aggiungere risultati
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Non autorizzato ad aggiungere risultati tornei'
      });
    }

    const resultData = {
      final_position: finalPosition,
      points_scored: pointsScored,
      prize_won: prizeWon,
      games_won: gamesWon,
      games_lost: gamesLost,
      hours_played: hoursPlayed,
      notes
    };

    await UserStatsDao.addTournamentResult(userId, tournamentId, resultData);
    
    res.json({
      success: true,
      message: 'Risultato torneo aggiunto con successo'
    });
  } catch (error) {
    console.error('Error adding tournament result:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiunta del risultato',
      error: error.message
    });
  }
});

// ==========================================
// LEADERBOARDS E STATISTICHE GLOBALI
// ==========================================

// GET /api/user-stats/leaderboard - Ottieni classifica
router.get('/leaderboard', async (req, res) => {
  try {
    const category = req.query.category || 'tournaments_won';
    const limit = parseInt(req.query.limit) || 10;
    
    const leaderboard = await UserStatsDao.getLeaderboard(category, limit);
    
    res.json({
      success: true,
      data: {
        category,
        rankings: leaderboard
      }
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero della classifica',
      error: error.message
    });
  }
});

// POST /api/user-stats/check-badges - Controlla e assegna coccarde automatiche
router.post('/check-badges', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const badges = await UserStatsDao.checkAndAwardAutomaticBadges(userId);
    
    res.json({
      success: true,
      data: badges
    });
  } catch (error) {
    console.error('Error checking badges:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il controllo delle coccarde',
      error: error.message
    });
  }
});

module.exports = router;