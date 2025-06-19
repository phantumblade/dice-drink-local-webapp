require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcryptjs = require('bcryptjs');

const { User } = require('../models/User');
const UsersDao = require('../daos/usersDao');
const {
  requireAuth,
  requireOwnership,
  requireRole,
  requirePermission,
  getClientIdentifier
} = require('../middleware/auth');


const CONFIG = {
  DEBUG_MODE: process.env.DEBUG_MODE === 'true',
  AUDIT_LOGGING_ENABLED: process.env.FEATURE_AUDIT_LOGGING === 'true',
  MAX_UPLOAD_SIZE: process.env.MAX_UPLOAD_SIZE || '5MB',
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000'
};


function debugLog(message, data = null) {
  if (CONFIG.DEBUG_MODE) {
    console.log(`[UsersRoutes] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

function validateInput(req, requiredFields = []) {
  const errors = [];

  for (const field of requiredFields) {
    if (!req.body[field]) {
      errors.push(`Campo '${field}' è obbligatorio`);
    }
  }

  // Validazione email
  if (req.body.email) {
    try {
      User.validateEmail(req.body.email);
    } catch (err) {
      errors.push('Email non valida');
    }
  }

  if (req.body.phone && req.body.phone.length > 20) {
    errors.push('Numero di telefono troppo lungo');
  }

  if (req.body.first_name && req.body.first_name.length > 50) {
    errors.push('Nome troppo lungo (max 50 caratteri)');
  }

  if (req.body.last_name && req.body.last_name.length > 50) {
    errors.push('Cognome troppo lungo (max 50 caratteri)');
  }

  return errors;
}

function sanitizeProfileData(data) {
  // Rimuovi campi sensibili che l'utente non può modificare direttamente
  const {
    id, email_verified, created_at, last_login, failed_login_attempts,
    locked_until, verification_token, reset_token, reset_expires,
    password_hash, role, ...sanitized
  } = data;

  return sanitized;
}

function getUserPublicProfile(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin
  };
}

function canUserMakeBooking(user) {
  if (!user.isActive) {
    throw new Error('Account disattivato');
  }

  if (!user.emailVerified) {
    throw new Error('Email non verificata. Verifica la tua email per effettuare prenotazioni.');
  }

  return true;
}

async function logSecurityEvent(req, event, details = {}) {
  if (!CONFIG.AUDIT_LOGGING_ENABLED) return;

  try {
    console.log(`[SECURITY] ${event}:`, {
      userId: req.user?.userId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      ...details
    });

    // Log nel database se disponibile
    if (typeof UsersDao.logAuditEvent === 'function') {
      await UsersDao.logAuditEvent(
        req.user?.userId || null,
        event,
        req.ip,
        req.get('User-Agent'),
        details
      );
    }
  } catch (error) {
    console.error('Error logging security event:', error);
  }
}

// Middleware per verificare ownership del profilo O staff/admin access
const requireProfileOwnership = [
  requireAuth,
  (req, res, next) => {
    const targetUserId = parseInt(req.params.userId);
    const currentUserId = parseInt(req.user.userId);

    // Proprietario può sempre vedere i propri dati
    if (targetUserId === currentUserId) {
      return next();
    }

    // Staff e admin possono vedere dati di tutti
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      return next();
    }

    return res.status(403).json({
      error: 'Accesso negato',
      message: 'Puoi accedere solo ai tuoi dati personali',
      type: 'NOT_OWNER'
    });
  }
];
// Middleware per staff che possono vedere profili utenti
const canViewUserProfile = [
  requireAuth,
  (req, res, next) => {
    const targetUserId = parseInt(req.params.userId);
    const currentUserId = parseInt(req.user.userId);

    // Proprietario può sempre vedere il proprio profilo
    if (targetUserId === currentUserId) {
      return next();
    }

    // Staff e admin possono vedere profili di customer
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      return next();
    }

    return res.status(403).json({
      error: 'Accesso negato',
      message: 'Non puoi visualizzare questo profilo',
      type: 'INSUFFICIENT_PERMISSION'
    });
  }
];


// GET /api/users/:userId - Visualizza profilo utente + dati dashboard
router.get('/:userId', canViewUserProfile, async (req, res) => {
  debugLog('Get user profile + dashboard data', { userId: req.params.userId, requesterId: req.user.userId });

  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({
        error: 'ID utente non valido',
        type: 'INVALID_USER_ID'
      });
    }

    const user = await UsersDao.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        error: 'Utente non trovato',
        type: 'USER_NOT_FOUND'
      });
    }

    // Profilo base per tutti
    let profile = getUserPublicProfile(user);

    // Informazioni aggiuntive se è il proprio profilo o se si è admin
    const isOwnProfile = userId === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    const isStaff = req.user.role === 'staff';

    if (isOwnProfile || isAdmin) {

        if (user.role === 'customer') {
        try {
            const preferences = await loadUserPreferencesWithFallback(userId);
            profile.preferences = preferences;

            debugLog('Preferenze customer caricate:', {
            hasGameCategories: Array.isArray(preferences.favorite_game_categories),
            gameCategories: preferences.favorite_game_categories,
            hasDrinkTypes: Array.isArray(preferences.preferred_drink_types),
            drinkTypes: preferences.preferred_drink_types,
            complexity: preferences.max_game_complexity
            });

            const userBookings = await UsersDao.getUserBookings(userId);

            // Calcola statistiche reali
            const activeBookings = userBookings.filter(b =>
            b.status === 'confirmed' || b.status === 'pending'
            );

            const completedBookings = userBookings.filter(b =>
            b.status === 'completed'
            );

            // Attività mensile (prenotazioni + completamenti nel mese corrente)
            const currentMonth = new Date();
            const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

            const monthlyBookings = userBookings.filter(b => {
            const bookingDate = new Date(b.created_at);
            return bookingDate >= firstDayOfMonth;
            });

            profile.stats = {
            gamesPlayed: completedBookings.length,
            activeBookings: activeBookings.length,
            monthlyActivity: monthlyBookings.length
            };

            // Prenotazioni recenti (ultime 5)
            profile.recentBookings = userBookings
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);

            debugLog('Customer dashboard data loaded', {
            totalBookings: userBookings.length,
            activeBookings: activeBookings.length,
            monthlyActivity: monthlyBookings.length,
            preferencesValid: !!preferences
            });

        } catch (err) {
            debugLog('Error loading customer dashboard data', { error: err.message });

            // Fallback sicuro per errori
            profile.preferences = {
            favorite_game_categories: [],
            preferred_drink_types: [],
            dietary_restrictions: [],
            preferred_time_slots: [],
            max_game_complexity: 3,
            notification_preferences: {
                email_booking: true,
                email_reminder: true,
                email_promotions: false,
                new_games: false
            }
            };
            profile.stats = { gamesPlayed: 0, activeBookings: 0, monthlyActivity: 0 };
            profile.recentBookings = [];
        }
        }

      // ==========================================
      // STAFF - Dati di gestione
      // ==========================================
      else if (user.role === 'staff' || user.role === 'admin') {
        try {
          // Conteggio utenti totali attivi
          const totalUsersResult = await UsersDao.executeQuery(
            'SELECT COUNT(*) as count FROM users WHERE is_active = 1'
          );
          const totalUsers = totalUsersResult[0]?.count || 0;

          // Prenotazioni di oggi
          const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
          const todayBookingsResult = await UsersDao.executeQuery(
            'SELECT COUNT(*) as count FROM bookings WHERE DATE(booking_date) = ? AND status IN (?, ?)',
            [today, 'confirmed', 'pending']
          );
          const todayBookings = todayBookingsResult[0]?.count || 0;

          profile.stats = {
            totalUsers: totalUsers,
            todayBookings: todayBookings
          };

          // Solo per admin: statistiche aggiuntive
          if (user.role === 'admin') {
            // Sessioni mensili (approssimiamo con bookings completate del mese)
            const currentMonth = new Date();
            const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

            const monthlySessionsResult = await UsersDao.executeQuery(
              'SELECT COUNT(*) as count FROM bookings WHERE created_at >= ? AND status = ?',
              [firstDayOfMonth.toISOString(), 'completed']
            );
            const monthlySessions = monthlySessionsResult[0]?.count || 0;

            // Giochi in catalogo
            const catalogGamesResult = await UsersDao.executeQuery(
              'SELECT COUNT(*) as count FROM games'
            );
            const catalogGames = catalogGamesResult[0]?.count || 0;

            profile.stats.monthlySessions = monthlySessions;
            profile.stats.catalogGames = catalogGames;

            profile.systemStats = await getAdminSystemStats();
          }

          debugLog('Staff/Admin dashboard data loaded', {
            totalUsers,
            todayBookings,
            isAdmin: user.role === 'admin'
          });

        } catch (err) {
          debugLog('Error loading staff dashboard data', { error: err.message });
          // Fallback
          profile.stats = {
            totalUsers: 0,
            todayBookings: 0,
            monthlySessions: 0,
            catalogGames: 0
          };
        }
      }

      // Aggiungi timestamp di accesso
      profile.lastDashboardAccess = new Date().toISOString();
    }

    // Log dell'accesso alla dashboard per audit
    await logSecurityEvent(req, 'dashboard_profile_accessed', {
      userId,
      role: user.role,
      isOwnProfile,
      requestedBy: req.user.userId
    });

    debugLog('Profile + dashboard data retrieved successfully', {
      userId,
      role: user.role,
      isOwnProfile,
      hasStats: !!profile.stats
    });

    res.json({
    user: profile,
    role: user.role,
    preferences: profile.preferences,
    stats: profile.stats,
    recentBookings: profile.recentBookings || [],

    isOwnProfile,
    canEdit: isOwnProfile || isAdmin,
    success: true,
    timestamp: new Date().toISOString()
    });

  } catch (error) {
    debugLog('Get profile + dashboard error', { error: error.message });

    res.status(500).json({
      error: 'Errore recupero profilo e dashboard',
      message: 'Si è verificato un errore interno',
      type: 'INTERNAL_ERROR'
    });
  }
});

/**
 * Ottieni statistiche sistema avanzate per admin
 */
async function getAdminSystemStats() {
  try {
    // Giochi più richiesti (dai game_requests nelle prenotazioni)
    const popularGamesResult = await UsersDao.executeQuery(`
      SELECT
        game_requests,
        COUNT(*) as request_count
      FROM bookings
      WHERE game_requests IS NOT NULL AND game_requests != ''
      GROUP BY game_requests
      ORDER BY request_count DESC
      LIMIT 5
    `);

    // Drink più ordinati (dai drink_orders nelle prenotazioni)
    const popularDrinksResult = await UsersDao.executeQuery(`
      SELECT
        drink_orders,
        COUNT(*) as order_count
      FROM bookings
      WHERE drink_orders IS NOT NULL AND drink_orders != ''
      GROUP BY drink_orders
      ORDER BY order_count DESC
      LIMIT 5
    `);

    // Revenue mensile (dalle prenotazioni completate)
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

    const monthlyRevenueResult = await UsersDao.executeQuery(`
      SELECT COALESCE(SUM(total_price), 0) as revenue
      FROM bookings
      WHERE created_at >= ? AND status = 'completed'
    `, [firstDayOfMonth.toISOString()]);

    // Utenti registrati di recente
    const recentUsersResult = await UsersDao.executeQuery(`
      SELECT id, email, first_name, last_name, created_at, role
      FROM users
      WHERE is_active = 1
      ORDER BY created_at DESC
      LIMIT 5
    `);

    return {
      popularGames: popularGamesResult.map(row => ({
        name: row.game_requests,
        requestCount: row.request_count
      })),
      popularDrinks: popularDrinksResult.map(row => ({
        name: row.drink_orders,
        orderCount: row.order_count
      })),
      monthlyRevenue: parseFloat(monthlyRevenueResult[0]?.revenue || 0),
      recentUsers: recentUsersResult.map(user => ({
        id: user.id,
        email: user.email,
        name: user.first_name && user.last_name ?
              `${user.first_name} ${user.last_name}` :
              user.email.split('@')[0],
        role: user.role,
        registeredAt: user.created_at
      })),
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    console.warn('Error getting admin system stats:', error);
    return {
      popularGames: [],
      popularDrinks: [],
      monthlyRevenue: 0,
      recentUsers: [],
      error: error.message
    };
  }
}

/**
 * Carica preferenze utente con fallback e validazione
 */
async function loadUserPreferencesWithFallback(userId) {
  try {
    let preferences = await UsersDao.getUserPreferences(userId);

    // Se non esistono preferenze, crea quelle di default
    if (!preferences) {
      console.log(`📝 Creazione preferenze default per utente ${userId}`);
      await UsersDao.createDefaultPreferences(userId, 'customer');
      preferences = await UsersDao.getUserPreferences(userId);
    }

    const defaultPreferences = {
      favorite_game_categories: [],
      preferred_drink_types: [],
      dietary_restrictions: [],
      preferred_time_slots: [],
      max_game_complexity: 3,
      notification_preferences: {
        email_booking: true,
        email_reminder: true,
        email_promotions: false,
        new_games: false
      }
    };

    // Merge con defaults per campi mancanti
    preferences = { ...defaultPreferences, ...preferences };

    if (typeof preferences.favorite_game_categories === 'string') {
      try {
        preferences.favorite_game_categories = JSON.parse(preferences.favorite_game_categories);
      } catch (e) {
        preferences.favorite_game_categories = [];
      }
    }

    if (typeof preferences.preferred_drink_types === 'string') {
      try {
        preferences.preferred_drink_types = JSON.parse(preferences.preferred_drink_types);
      } catch (e) {
        preferences.preferred_drink_types = [];
      }
    }

    if (typeof preferences.dietary_restrictions === 'string') {
      try {
        preferences.dietary_restrictions = JSON.parse(preferences.dietary_restrictions);
      } catch (e) {
        preferences.dietary_restrictions = [];
      }
    }

    if (typeof preferences.preferred_time_slots === 'string') {
      try {
        preferences.preferred_time_slots = JSON.parse(preferences.preferred_time_slots);
      } catch (e) {
        preferences.preferred_time_slots = [];
      }
    }

    if (typeof preferences.notification_preferences === 'string') {
      try {
        preferences.notification_preferences = JSON.parse(preferences.notification_preferences);
      } catch (e) {
        preferences.notification_preferences = defaultPreferences.notification_preferences;
      }
    }

    if (!Array.isArray(preferences.favorite_game_categories)) {
      preferences.favorite_game_categories = [];
    }
    if (!Array.isArray(preferences.preferred_drink_types)) {
      preferences.preferred_drink_types = [];
    }
    if (!Array.isArray(preferences.dietary_restrictions)) {
      preferences.dietary_restrictions = [];
    }
    if (!Array.isArray(preferences.preferred_time_slots)) {
      preferences.preferred_time_slots = [];
    }

    return preferences;

  } catch (error) {
    console.error('❌ Errore caricamento preferenze:', error);

    // Ritorna preferenze vuote in caso di errore
    return {
      favorite_game_categories: [],
      preferred_drink_types: [],
      dietary_restrictions: [],
      preferred_time_slots: [],
      max_game_complexity: 3,
      notification_preferences: {
        email_booking: true,
        email_reminder: true,
        email_promotions: false,
        new_games: false
      }
    };
  }
}


// PUT /api/users/:userId - Aggiorna profilo utente
router.put('/:userId', requireAuth, requireProfileOwnership, async (req, res) => {
  debugLog('Update user profile', { userId: req.params.userId });

  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({
        error: 'ID utente non valido',
        type: 'INVALID_USER_ID'
      });
    }

    // Validazione input
    const validationErrors = validateInput(req);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: validationErrors,
        type: 'VALIDATION_ERROR'
      });
    }

    // Sanitizza dati (rimuovi campi non modificabili)
    const updateData = sanitizeProfileData(req.body);

    // Log dei campi che si tenta di modificare
    debugLog('Profile update fields', { fields: Object.keys(updateData) });

    // Aggiorna profilo
    const updatedUser = await UsersDao.updateUser(userId, updateData);

    if (!updatedUser) {
      return res.status(404).json({
        error: 'Utente non trovato',
        type: 'USER_NOT_FOUND'
      });
    }

    // Log audit per cambiamenti significativi
    await logSecurityEvent(req, 'profile_updated', {
      userId,
      updatedFields: Object.keys(updateData),
      significantChanges: ['email', 'phone'].filter(field => updateData[field])
    });

    debugLog('Profile updated successfully', { userId });

    res.json({
      message: 'Profilo aggiornato con successo',
      user: getUserPublicProfile(updatedUser),
      success: true
    });

  } catch (error) {
    debugLog('Update profile error', { error: error.message });

    if (error.message.includes('Email già in uso') || error.message.includes('Email già registrata')) {
      return res.status(409).json({
        error: 'Email già utilizzata',
        message: 'Questo indirizzo email è già associato a un altro account',
        type: 'EMAIL_CONFLICT'
      });
    }

    res.status(500).json({
      error: 'Errore aggiornamento profilo',
      message: 'Si è verificato un errore interno',
      type: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/users/:userId/change-password - Cambia password
router.post('/:userId/change-password', requireAuth, requireProfileOwnership, async (req, res) => {
  debugLog('Change password attempt', { userId: req.params.userId });

  try {
    const userId = parseInt(req.params.userId);
    const { currentPassword, newPassword } = req.body;

    const validationErrors = validateInput(req, ['currentPassword', 'newPassword']);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Dati richiesti',
        details: validationErrors,
        type: 'VALIDATION_ERROR'
      });
    }

    // Recupera utente
    const user = await UsersDao.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Utente non trovato',
        type: 'USER_NOT_FOUND'
      });
    }

    // Verifica password attuale
    const isCurrentPasswordValid = await user.verifyPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      await logSecurityEvent(req, 'password_change_failed_wrong_current', {
        userId
      });

      return res.status(401).json({
        error: 'Password attuale non corretta',
        type: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Valida nuova password
    try {
      User.validatePassword(newPassword);
    } catch (err) {
      return res.status(400).json({
        error: 'Password non valida',
        message: err.message,
        type: 'INVALID_NEW_PASSWORD'
      });
    }

    // Hash nuova password
    const newPasswordHash = await User.hashPassword(newPassword);

    // Aggiorna password
    await UsersDao.updateUser(userId, {
      password_hash: newPasswordHash,
      failed_login_attempts: 0,
      locked_until: null
    });

    // Invalida tutte le sessioni eccetto quella corrente (opzionale)
    const { invalidateOtherSessions = true } = req.body;
    if (invalidateOtherSessions) {
      await UsersDao.invalidateAllUserSessions(userId);
    }

    await logSecurityEvent(req, 'password_changed', {
      userId,
      invalidatedSessions: invalidateOtherSessions
    });

    debugLog('Password changed successfully', { userId });

    res.json({
      message: 'Password modificata con successo',
      sessionsInvalidated: invalidateOtherSessions,
      success: true
    });

  } catch (error) {
    debugLog('Change password error', { error: error.message });

    res.status(500).json({
      error: 'Errore modifica password',
      message: 'Si è verificato un errore interno',
      type: 'INTERNAL_ERROR'
    });
  }
});

// ==========================================
// ROUTES PREFERENZE UTENTE
// ==========================================

// GET /api/users/:userId/preferences - Ottieni preferenze
router.get('/:userId/preferences', requireAuth, requireProfileOwnership, async (req, res) => {
  debugLog('Get user preferences', { userId: req.params.userId });

  try {
    const userId = parseInt(req.params.userId);

    const preferences = await UsersDao.getUserPreferences(userId);

    if (!preferences) {
      // Crea preferenze default se non esistono
      await UsersDao.createDefaultPreferences(userId, req.user.role);
      const newPreferences = await UsersDao.getUserPreferences(userId);

      return res.json({
        preferences: newPreferences,
        created: true,
        success: true
      });
    }

    res.json({
      preferences,
      success: true
    });

  } catch (error) {
    debugLog('Get preferences error', { error: error.message });

    res.status(500).json({
      error: 'Errore recupero preferenze',
      type: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/users/:userId/preferences - Aggiorna preferenze
router.put('/:userId/preferences', requireAuth, requireProfileOwnership, async (req, res) => {
  debugLog('Update user preferences', { userId: req.params.userId });

  try {
    const userId = parseInt(req.params.userId);
    const preferences = req.body;

    // Validazione preferenze
    if (preferences.max_game_complexity && (preferences.max_game_complexity < 1 || preferences.max_game_complexity > 5)) {
      return res.status(400).json({
        error: 'Complessità gioco non valida',
        message: 'La complessità deve essere tra 1 e 5',
        type: 'VALIDATION_ERROR'
      });
    }

    // Array validations
    const arrayFields = ['favorite_game_categories', 'dietary_restrictions', 'preferred_drink_types', 'preferred_time_slots'];
    for (const field of arrayFields) {
      if (preferences[field] && !Array.isArray(preferences[field])) {
        return res.status(400).json({
          error: `Campo '${field}' deve essere un array`,
          type: 'VALIDATION_ERROR'
        });
      }
    }

    // Notification preferences validation
    if (preferences.notification_preferences && typeof preferences.notification_preferences !== 'object') {
      return res.status(400).json({
        error: 'Preferenze notifiche non valide',
        type: 'VALIDATION_ERROR'
      });
    }

    const updatedPreferences = await UsersDao.updateUserPreferences(userId, preferences);

    await logSecurityEvent(req, 'preferences_updated', {
      userId,
      updatedFields: Object.keys(preferences)
    });

    debugLog('Preferences updated successfully', { userId });

    res.json({
      message: 'Preferenze aggiornate con successo',
      preferences: updatedPreferences,
      success: true
    });

  } catch (error) {
    debugLog('Update preferences error', { error: error.message });

    res.status(500).json({
      error: 'Errore aggiornamento preferenze',
      message: 'Si è verificato un errore interno',
      type: 'INTERNAL_ERROR'
    });
  }
});

// ==========================================
// ROUTES PRENOTAZIONI UTENTE
// ==========================================

// GET /api/users/:userId/bookings - Lista prenotazioni utente
router.get('/:userId/bookings', requireAuth, requireProfileOwnership, async (req, res) => {
  debugLog('Get user bookings', { userId: req.params.userId });

  try {
    const userId = parseInt(req.params.userId);
    const { status, from_date, to_date, limit = 20, offset = 0 } = req.query;

    const options = {
      status,
      from_date,
      to_date,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const bookings = await UsersDao.getUserBookings(userId, options);

    // Statistiche prenotazioni
    const stats = {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      pending: bookings.filter(b => b.status === 'pending').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
      completed: bookings.filter(b => b.status === 'completed').length
    };

    res.json({
      bookings,
      stats,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        hasMore: bookings.length === options.limit
      },
      success: true
    });

  } catch (error) {
    debugLog('Get bookings error', { error: error.message });

    res.status(500).json({
      error: 'Errore recupero prenotazioni',
      type: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/users/:userId/bookings - Crea nuova prenotazione
router.post('/:userId/bookings', requireAuth, requireProfileOwnership, async (req, res) => {
  debugLog('Create booking', { userId: req.params.userId });

  try {
    const userId = parseInt(req.params.userId);
    const bookingData = req.body;

    // Validazione dati prenotazione
    const requiredFields = ['booking_date', 'booking_time', 'party_size'];
    const validationErrors = validateInput(req, requiredFields);

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Dati prenotazione incompleti',
        details: validationErrors,
        type: 'VALIDATION_ERROR'
      });
    }

    // Validazioni business logic
    const partySize = parseInt(bookingData.party_size);
    if (partySize < 1 || partySize > 20) {
      return res.status(400).json({
        error: 'Numero persone non valido',
        message: 'Il numero di persone deve essere tra 1 e 20',
        type: 'INVALID_PARTY_SIZE'
      });
    }

    // Verifica che l'utente possa fare prenotazioni
    const user = await UsersDao.getUserById(userId);
    try {
      canUserMakeBooking(user);
    } catch (err) {
      return res.status(403).json({
        error: 'Impossibile effettuare prenotazione',
        message: err.message,
        type: 'BOOKING_NOT_ALLOWED'
      });
    }

    // Validazione data (non nel passato)
    const bookingDate = new Date(bookingData.booking_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      return res.status(400).json({
        error: 'Data non valida',
        message: 'Non puoi prenotare per una data nel passato',
        type: 'INVALID_DATE'
      });
    }

    const booking = await UsersDao.createBooking(userId, bookingData);

    await logSecurityEvent(req, 'booking_created', {
      userId,
      bookingId: booking.id,
      bookingDate: bookingData.booking_date,
      partySize: bookingData.party_size
    });

    debugLog('Booking created successfully', {
      userId,
      bookingId: booking.id,
      confirmationCode: booking.confirmation_code
    });

    res.status(201).json({
      message: 'Prenotazione creata con successo',
      booking: {
        id: booking.id,
        confirmation_code: booking.confirmation_code,
        status: 'pending'
      },
      success: true
    });

  } catch (error) {
    debugLog('Create booking error', { error: error.message });

    res.status(500).json({
      error: 'Errore creazione prenotazione',
      message: 'Si è verificato un errore interno',
      type: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/users/:userId/bookings/:confirmationCode - Dettagli prenotazione
router.get('/:userId/bookings/:confirmationCode', requireAuth, requireProfileOwnership, async (req, res) => {
  debugLog('Get booking details', {
    userId: req.params.userId,
    confirmationCode: req.params.confirmationCode
  });

  try {
    const { confirmationCode } = req.params;

    const booking = await UsersDao.getBookingByConfirmationCode(confirmationCode);

    if (!booking) {
      return res.status(404).json({
        error: 'Prenotazione non trovata',
        type: 'BOOKING_NOT_FOUND'
      });
    }

    // Verifica ownership della prenotazione
    if (booking.user_id !== req.user.userId && req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({
        error: 'Accesso negato',
        message: 'Non puoi visualizzare questa prenotazione',
        type: 'NOT_AUTHORIZED'
      });
    }

    res.json({
      booking,
      success: true
    });

  } catch (error) {
    debugLog('Get booking details error', { error: error.message });

    res.status(500).json({
      error: 'Errore recupero dettagli prenotazione',
      type: 'INTERNAL_ERROR'
    });
  }
});

// ==========================================
// ROUTES WISHLIST
// ==========================================

// GET /api/users/:userId/wishlist - Lista wishlist
router.get('/:userId/wishlist', requireAuth, requireProfileOwnership, async (req, res) => {
  debugLog('Get user wishlist', { userId: req.params.userId });

  try {
    const userId = parseInt(req.params.userId);

    const wishlist = await UsersDao.getUserWishlist(userId);

    // Raggruppa per tipo
    const groupedWishlist = {
      games: wishlist.filter(item => item.item_type === 'game'),
      drinks: wishlist.filter(item => item.item_type === 'drink'),
      snacks: wishlist.filter(item => item.item_type === 'snack')
    };

    res.json({
      wishlist: groupedWishlist,
      total: wishlist.length,
      totalByType: {
        games: groupedWishlist.games.length,
        drinks: groupedWishlist.drinks.length,
        snacks: groupedWishlist.snacks.length
      },
      success: true
    });

  } catch (error) {
    debugLog('Get wishlist error', { error: error.message });

    res.status(500).json({
      error: 'Errore recupero wishlist',
      type: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/users/:userId/wishlist - Aggiungi a wishlist
router.post('/:userId/wishlist', requireAuth, requireProfileOwnership, async (req, res) => {
  debugLog('Add to wishlist', { userId: req.params.userId });

  try {
    const userId = parseInt(req.params.userId);
    const { item_type, item_id, notes, priority = 1 } = req.body;

    // Validazione
    const validationErrors = validateInput(req, ['item_type', 'item_id']);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Dati richiesti',
        details: validationErrors,
        type: 'VALIDATION_ERROR'
      });
    }

    const validTypes = ['game', 'drink', 'snack'];
    if (!validTypes.includes(item_type)) {
      return res.status(400).json({
        error: 'Tipo elemento non valido',
        message: `Tipo deve essere uno di: ${validTypes.join(', ')}`,
        type: 'INVALID_ITEM_TYPE'
      });
    }

    const itemId = parseInt(item_id);
    if (isNaN(itemId)) {
      return res.status(400).json({
        error: 'ID elemento non valido',
        type: 'INVALID_ITEM_ID'
      });
    }

    await UsersDao.addToWishlist(userId, item_type, itemId, notes, priority);

    await logSecurityEvent(req, 'wishlist_item_added', {
      userId,
      itemType: item_type,
      itemId
    });

    debugLog('Item added to wishlist', { userId, itemType: item_type, itemId });

    res.status(201).json({
      message: 'Elemento aggiunto alla wishlist',
      success: true
    });

  } catch (error) {
    debugLog('Add to wishlist error', { error: error.message });

    res.status(500).json({
      error: 'Errore aggiunta a wishlist',
      type: 'INTERNAL_ERROR'
    });
  }
});

// DELETE /api/users/:userId/wishlist/:itemId - Rimuovi da wishlist
router.delete('/:userId/wishlist/:itemId', requireAuth, requireProfileOwnership, async (req, res) => {
  debugLog('Remove from wishlist', {
    userId: req.params.userId,
    itemId: req.params.itemId
  });

  try {
    const userId = parseInt(req.params.userId);
    const itemId = parseInt(req.params.itemId);

    if (isNaN(userId) || isNaN(itemId)) {
      return res.status(400).json({
        error: 'ID non validi',
        type: 'INVALID_ID'
      });
    }

    const removed = await UsersDao.removeFromWishlist(userId, itemId);

    if (!removed) {
      return res.status(404).json({
        error: 'Elemento non trovato nella wishlist',
        type: 'WISHLIST_ITEM_NOT_FOUND'
      });
    }

    await logSecurityEvent(req, 'wishlist_item_removed', {
      userId,
      itemId
    });

    debugLog('Item removed from wishlist', { userId, itemId });

    res.json({
      message: 'Elemento rimosso dalla wishlist con successo',
      success: true
    });

  } catch (error) {
    debugLog('Remove from wishlist error', { error: error.message });

    res.status(500).json({
      error: 'Errore rimozione da wishlist',
      type: 'INTERNAL_ERROR'
    });
  }
});


// POST /api/users/:userId/ratings - Aggiungi rating
router.post('/:userId/ratings', requireAuth, requireProfileOwnership, async (req, res) => {
  debugLog('Add rating', { userId: req.params.userId });

  try {
    const userId = parseInt(req.params.userId);
    const { item_type, item_id, rating, review } = req.body;

    // Validazione
    const validationErrors = validateInput(req, ['item_type', 'rating']);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Dati richiesti',
        details: validationErrors,
        type: 'VALIDATION_ERROR'
      });
    }

    const validTypes = ['game', 'drink', 'snack', 'service'];
    if (!validTypes.includes(item_type)) {
      return res.status(400).json({
        error: 'Tipo elemento non valido',
        message: `Tipo deve essere uno di: ${validTypes.join(', ')}`,
        type: 'INVALID_ITEM_TYPE'
      });
    }

    const ratingValue = parseInt(rating);
    if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({
        error: 'Rating non valido',
        message: 'Il rating deve essere tra 1 e 5',
        type: 'INVALID_RATING'
      });
    }

    const itemId = item_type === 'service' ? null : parseInt(item_id);
    if (item_type !== 'service' && (isNaN(itemId) || !req.body.item_id)) {
      return res.status(400).json({
        error: 'ID elemento richiesto per questo tipo',
        type: 'INVALID_ITEM_ID'
      });
    }

    await UsersDao.addRating(userId, item_type, itemId, ratingValue, review);

    await logSecurityEvent(req, 'rating_added', {
      userId,
      itemType: item_type,
      itemId,
      rating: ratingValue
    });

    debugLog('Rating added', { userId, itemType: item_type, itemId, rating: ratingValue });

    res.status(201).json({
      message: 'Valutazione aggiunta con successo',
      success: true
    });

  } catch (error) {
    debugLog('Add rating error', { error: error.message });

    res.status(500).json({
      error: 'Errore aggiunta valutazione',
      type: 'INTERNAL_ERROR'
    });
  }
});


// GET /api/users/:userId/audit-log - Log audit personale
router.get('/:userId/audit-log', requireAuth, requireProfileOwnership, async (req, res) => {
  debugLog('Get user audit log', { userId: req.params.userId });

  try {
    const userId = parseInt(req.params.userId);
    const { limit = 50 } = req.query;

    const auditLog = await UsersDao.getUserAuditLog(userId, parseInt(limit));

    res.json({
      auditLog,
      total: auditLog.length,
      success: true
    });

  } catch (error) {
    debugLog('Get audit log error', { error: error.message });

    res.status(500).json({
      error: 'Errore recupero log audit',
      type: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
