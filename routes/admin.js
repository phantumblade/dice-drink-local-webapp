const express = require('express');
const router = express.Router();
const bcryptjs = require('bcryptjs');
const UsersDao = require('../daos/usersDao');
const DrinksDao = require('../daos/drinksDao');
const GamesDao = require('../daos/gamesDao');
const SnacksDao = require('../daos/snacksDao');
const { requireAuth, requireAdmin, requireStaff } = require('../middleware/auth');
const { logSecurityEvent, logSystemEvent } = require('../middleware/logging');

// ================================
// 🏠 DASHBOARD & ANALYTICS
// ================================

/**
 * 📊 Dashboard principale admin
 * GET /api/admin/dashboard
 */
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalBookings,
      todayBookings,
      totalGames,
      totalDrinks,
      totalSnacks,
      recentActivity,
      topRatedItems,
      systemHealth
    ] = await Promise.all([
      UsersDao.getTotalUsersCount(),
      UsersDao.getActiveUsersCount(30), // Attivi ultimi 30 giorni
      UsersDao.getTotalBookingsCount(),
      UsersDao.getTodayBookingsCount(),
      GamesDao.getTotalCount(),
      DrinksDao.getTotalCount(),
      SnacksDao.getTotalCount(),
      getRecentSystemActivity(10),
      getTopRatedItems(5),
      getSystemHealthStatus()
    ]);

    // Statistiche utenti per tipo
    const userStats = await UsersDao.getUserStatsByRole();

    // Trend prenotazioni ultimi 7 giorni
    const bookingTrends = await UsersDao.getBookingTrends(7);

    // Top giochi più richiesti
    const popularGames = await GamesDao.getMostPopularGames(5);

    const dashboardData = {
      overview: {
        totalUsers,
        activeUsers,
        totalBookings,
        todayBookings,
        inventory: {
          games: totalGames,
          drinks: totalDrinks,
          snacks: totalSnacks
        }
      },
      userStats,
      bookingTrends,
      popularGames,
      recentActivity,
      topRatedItems,
      systemHealth
    };

    await logSystemEvent(req, 'admin_dashboard_accessed', {
      adminId: req.user.userId
    });

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Errore dashboard admin:', error);
    res.status(500).json({
      error: 'Errore caricamento dashboard',
      message: error.message
    });
  }
});

/**
 * 📈 Analytics avanzate
 * GET /api/admin/analytics
 */
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const { period = '30', type = 'overview' } = req.query;
    const days = parseInt(period);

    let analyticsData = {};

    switch (type) {
      case 'users':
        analyticsData = await getUserAnalytics(days);
        break;
      case 'bookings':
        analyticsData = await getBookingAnalytics(days);
        break;
      case 'ratings':
        analyticsData = await getRatingAnalytics(days);
        break;
      case 'inventory':
        analyticsData = await getInventoryAnalytics();
        break;
      default:
        analyticsData = await getOverviewAnalytics(days);
    }

    res.json({
      success: true,
      data: analyticsData,
      period: days,
      type
    });

  } catch (error) {
    console.error('Errore analytics:', error);
    res.status(500).json({
      error: 'Errore caricamento analytics',
      message: error.message
    });
  }
});

// ================================
// 👥 USER MANAGEMENT
// ================================

/**
 * 📋 Lista utenti con filtri e paginazione
 * GET /api/admin/users
 */
router.get('/users', requireStaff, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      search = '',
      role = '',
      status = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const filters = {
      search: search.trim(),
      role: role || null,
      status: status || null
    };

    const pagination = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100), // Max 100 per pagina
      sortBy,
      sortOrder: sortOrder.toUpperCase()
    };

    const result = await UsersDao.getUsersWithFilters(filters, pagination);

    // Rimuovi dati sensibili per staff (non admin)
    if (req.user.role === 'staff') {
      result.users = result.users.map(user => ({
        ...user,
        email: user.email ? '***@***.***' : null,
        phone: user.phone ? '***-***-****' : null
      }));
    }

    await logSystemEvent(req, 'admin_users_accessed', {
      adminId: req.user.userId,
      filters,
      resultCount: result.users.length
    });

    res.json({
      success: true,
      data: result.users,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalItems: result.totalItems,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev
      }
    });

  } catch (error) {
    console.error('Errore lista utenti:', error);
    res.status(500).json({
      error: 'Errore caricamento utenti',
      message: error.message
    });
  }
});

/**
 * 👤 Dettagli utente specifico
 * GET /api/admin/users/:userId
 */
router.get('/users/:userId', requireStaff, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await UsersDao.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Utente non trovato'
      });
    }

    // Dati aggiuntivi per admin
    const additionalData = {};
    if (req.user.role === 'admin') {
      const [bookings, ratings, wishlist, securityEvents] = await Promise.all([
        UsersDao.getUserBookings(userId, { limit: 10 }),
        UsersDao.getUserRatings(userId, { limit: 10 }),
        UsersDao.getUserWishlist(userId),
        getSecurityEvents(userId, 5)
      ]);

      additionalData.bookings = bookings;
      additionalData.ratings = ratings;
      additionalData.wishlist = wishlist;
      additionalData.securityEvents = securityEvents;
    }

    // Nascondi dati sensibili per staff
    if (req.user.role === 'staff') {
      delete user.email;
      delete user.phone;
      delete user.failed_login_attempts;
      delete user.locked_until;
    }

    await logSystemEvent(req, 'admin_user_viewed', {
      adminId: req.user.userId,
      targetUserId: userId
    });

    res.json({
      success: true,
      data: {
        user,
        ...additionalData
      }
    });

  } catch (error) {
    console.error('Errore dettagli utente:', error);
    res.status(500).json({
      error: 'Errore caricamento utente',
      message: error.message
    });
  }
});

/**
 * ✏️ Modifica utente (solo admin)
 * PUT /api/admin/users/:userId
 */
router.put('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    // Validazioni
    const errors = [];

    if (updateData.email && !isValidEmail(updateData.email)) {
      errors.push('Email non valida');
    }

    if (updateData.role && !['customer', 'staff', 'admin'].includes(updateData.role)) {
      errors.push('Ruolo non valido');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: errors
      });
    }

    // Non permettere auto-demozione admin
    if (updateData.role && userId == req.user.userId && updateData.role !== 'admin') {
      return res.status(400).json({
        error: 'Non puoi modificare il tuo ruolo admin'
      });
    }

    // Hash password se presente
    if (updateData.password) {
      updateData.password_hash = await bcryptjs.hash(updateData.password, 12);
      delete updateData.password;
    }

    // Campi permessi per modifica admin
    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'role',
      'is_active', 'email_verified', 'password_hash'
    ];

    const sanitizedData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        sanitizedData[key] = updateData[key];
      }
    });

    const updatedUser = await UsersDao.updateUser(userId, sanitizedData);

    await logSecurityEvent(req, 'admin_user_updated', {
      adminId: req.user.userId,
      targetUserId: userId,
      updatedFields: Object.keys(sanitizedData),
      significantChanges: ['email', 'role', 'is_active'].filter(field => sanitizedData[field] !== undefined)
    });

    res.json({
      success: true,
      message: 'Utente aggiornato con successo',
      data: updatedUser
    });

  } catch (error) {
    console.error('Errore aggiornamento utente:', error);
    res.status(500).json({
      error: 'Errore aggiornamento utente',
      message: error.message
    });
  }
});

/**
 * 🗑️ Elimina utente (solo admin)
 * DELETE /api/admin/users/:userId
 */
router.delete('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Non permettere auto-eliminazione
    if (userId == req.user.userId) {
      return res.status(400).json({
        error: 'Non puoi eliminare il tuo account admin'
      });
    }

    const user = await UsersDao.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Utente non trovato'
      });
    }

    // Soft delete - mantieni dati per audit
    await UsersDao.softDeleteUser(userId);

    await logSecurityEvent(req, 'admin_user_deleted', {
      adminId: req.user.userId,
      targetUserId: userId,
      deletedUserEmail: user.email,
      deletedUserRole: user.role
    });

    res.json({
      success: true,
      message: 'Utente eliminato con successo'
    });

  } catch (error) {
    console.error('Errore eliminazione utente:', error);
    res.status(500).json({
      error: 'Errore eliminazione utente',
      message: error.message
    });
  }
});

// ================================
// 📅 BOOKING MANAGEMENT
// ================================

/**
 * 📋 Gestione prenotazioni
 * GET /api/admin/bookings
 */
router.get('/bookings', requireStaff, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      status = '',
      date = '',
      userId = '',
      sortBy = 'booking_date',
      sortOrder = 'DESC'
    } = req.query;

    const filters = {
      status: status || null,
      date: date || null,
      userId: userId || null
    };

    const pagination = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
      sortBy,
      sortOrder: sortOrder.toUpperCase()
    };

    const result = await UsersDao.getBookingsWithFilters(filters, pagination);

    res.json({
      success: true,
      data: result.bookings,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalItems: result.totalItems,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev
      }
    });

  } catch (error) {
    console.error('Errore lista prenotazioni:', error);
    res.status(500).json({
      error: 'Errore caricamento prenotazioni',
      message: error.message
    });
  }
});

/**
 * ✅ Conferma prenotazione
 * PUT /api/admin/bookings/:bookingId/confirm
 */
router.put('/bookings/:bookingId/confirm', requireStaff, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { notes = '' } = req.body;

    const booking = await UsersDao.updateBookingStatus(bookingId, 'confirmed');

    await logSystemEvent(req, 'booking_confirmed', {
      staffId: req.user.userId,
      bookingId,
      userId: booking.user_id
    });

    res.json({
      success: true,
      message: 'Prenotazione confermata',
      data: booking
    });

  } catch (error) {
    console.error('Errore conferma prenotazione:', error);
    res.status(500).json({
      error: 'Errore conferma prenotazione',
      message: error.message
    });
  }
});

/**
 * ❌ Annulla prenotazione
 * PUT /api/admin/bookings/:bookingId/cancel
 */
router.put('/bookings/:bookingId/cancel', requireStaff, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason = 'Annullata dallo staff', notes = '' } = req.body;

    const booking = await UsersDao.updateBookingStatus(bookingId, 'cancelled', {
      cancelled_at: new Date(),
      cancellation_reason: reason,
    });

    await logSystemEvent(req, 'booking_cancelled_by_staff', {
      staffId: req.user.userId,
      bookingId,
      userId: booking.user_id,
      reason
    });

    res.json({
      success: true,
      message: 'Prenotazione annullata',
      data: booking
    });

  } catch (error) {
    console.error('Errore annullamento prenotazione:', error);
    res.status(500).json({
      error: 'Errore annullamento prenotazione',
      message: error.message
    });
  }
});

// ================================
// 🛠️ SYSTEM MANAGEMENT
// ================================

/**
 * 🏥 Health check sistema
 * GET /api/admin/system/health
 */
router.get('/system/health', requireAdmin, async (req, res) => {
  try {
    const healthStatus = await getSystemHealthStatus();

    res.json({
      success: true,
      data: healthStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Errore health check:', error);
    res.status(500).json({
      error: 'Errore verifica sistema',
      message: error.message
    });
  }
});

/**
 * 📋 Audit log
 * GET /api/admin/system/audit
 */
router.get('/system/audit', requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      type = '',
      userId = '',
      startDate = '',
      endDate = ''
    } = req.query;

    const filters = {
      type: type || null,
      userId: userId || null,
      startDate: startDate || null,
      endDate: endDate || null
    };

    const pagination = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100)
    };

    const auditLogs = await getAuditLogs(filters, pagination);

    res.json({
      success: true,
      data: auditLogs.logs,
      pagination: {
        currentPage: auditLogs.currentPage,
        totalPages: auditLogs.totalPages,
        totalItems: auditLogs.totalItems
      }
    });

  } catch (error) {
    console.error('Errore audit log:', error);
    res.status(500).json({
      error: 'Errore caricamento audit log',
      message: error.message
    });
  }
});

/**
 * 🧹 Pulizia dati sistema
 * POST /api/admin/system/cleanup
 */
router.post('/system/cleanup', requireAdmin, async (req, res) => {
  try {
    const {
      cleanExpiredSessions = true,
      cleanOldLogs = true,
      cleanExpiredTokens = true,
      daysToKeep = 90
    } = req.body;

    const cleanupResults = {};

    if (cleanExpiredSessions) {
      cleanupResults.expiredSessions = await UsersDao.cleanupExpiredSessions();
    }

    if (cleanOldLogs) {
      cleanupResults.oldLogs = await cleanupOldLogs(daysToKeep);
    }

    if (cleanExpiredTokens) {
      cleanupResults.expiredTokens = await UsersDao.cleanupExpiredTokens();
    }

    await logSystemEvent(req, 'system_cleanup_executed', {
      adminId: req.user.userId,
      cleanupResults
    });

    res.json({
      success: true,
      message: 'Pulizia sistema completata',
      data: cleanupResults
    });

  } catch (error) {
    console.error('Errore pulizia sistema:', error);
    res.status(500).json({
      error: 'Errore pulizia sistema',
      message: error.message
    });
  }
});

// ================================
// 📊 HELPER FUNCTIONS
// ================================

/**
 * Analytics utenti
 */
async function getUserAnalytics(days) {
  const [
    newUsers,
    activeUsers,
    usersByRole,
    verificationStats,
    loginStats
  ] = await Promise.all([
    UsersDao.getNewUsersCount(days),
    UsersDao.getActiveUsersCount(days),
    UsersDao.getUserStatsByRole(),
    UsersDao.getVerificationStats(),
    UsersDao.getLoginStats(days)
  ]);

  return {
    newUsers,
    activeUsers,
    usersByRole,
    verificationStats,
    loginStats
  };
}

/**
 * Analytics prenotazioni
 */
async function getBookingAnalytics(days) {
  const [
    totalBookings,
    bookingsByStatus,
    averagePartySize,
    peakHours,
    bookingTrends
  ] = await Promise.all([
    UsersDao.getBookingsCount(days),
    UsersDao.getBookingsByStatus(days),
    UsersDao.getAveragePartySize(days),
    UsersDao.getPeakBookingHours(days),
    UsersDao.getBookingTrends(days)
  ]);

  return {
    totalBookings,
    bookingsByStatus,
    averagePartySize,
    peakHours,
    bookingTrends
  };
}

/**
 * Analytics rating
 */
async function getRatingAnalytics(days) {
  const [
    averageRatings,
    ratingDistribution,
    topRatedItems,
    recentReviews
  ] = await Promise.all([
    UsersDao.getAverageRatings(days),
    UsersDao.getRatingDistribution(days),
    getTopRatedItems(10),
    UsersDao.getRecentRatings(days, 20)
  ]);

  return {
    averageRatings,
    ratingDistribution,
    topRatedItems,
    recentReviews
  };
}

/**
 * Analytics inventario
 */
async function getInventoryAnalytics() {
  const [
    gameStats,
    drinkStats,
    snackStats
  ] = await Promise.all([
    GamesDao.getInventoryStats(),
    DrinksDao.getInventoryStats(),
    SnacksDao.getInventoryStats()
  ]);

  return {
    games: gameStats,
    drinks: drinkStats,
    snacks: snackStats
  };
}

/**
 * Health check sistema
 */
async function getSystemHealthStatus() {
  try {
    const [
      dbStatus,
      memoryUsage,
      activeConnections,
      errorRate
    ] = await Promise.all([
      checkDatabaseHealth(),
      getMemoryUsage(),
      getActiveConnections(),
      getErrorRate()
    ]);

    return {
      status: 'healthy',
      database: dbStatus,
      memory: memoryUsage,
      connections: activeConnections,
      errorRate,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Validazione email
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Placeholder functions - implementare nei rispettivi DAOs
async function getRecentSystemActivity(limit) { return []; }
async function getTopRatedItems(limit) { return []; }
async function getOverviewAnalytics(days) { return {}; }
async function getSecurityEvents(userId, limit) { return []; }
async function getAuditLogs(filters, pagination) { return { logs: [], currentPage: 1, totalPages: 1, totalItems: 0 }; }
async function cleanupOldLogs(days) { return 0; }
async function checkDatabaseHealth() { return { status: 'connected' }; }
async function getMemoryUsage() { return process.memoryUsage(); }
async function getActiveConnections() { return 0; }
async function getErrorRate() { return 0; }

module.exports = router;
