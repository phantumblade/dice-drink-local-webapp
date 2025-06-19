require('dotenv').config();
const { User } = require('../models/User');
const UsersDao = require('../daos/usersDao');

const CONFIG = {
  // Rate limiting da .env
  RATE_LIMITS: {
    login: {
      max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX) || 5,
      window: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW) || 15 * 60 * 1000 // 15 min
    },
    register: {
      max: parseInt(process.env.RATE_LIMIT_REGISTER_MAX) || 3,
      window: parseInt(process.env.RATE_LIMIT_REGISTER_WINDOW) || 60 * 60 * 1000 // 1 hour
    },
    api: {
      max: parseInt(process.env.RATE_LIMIT_API_MAX) || 100,
      window: parseInt(process.env.RATE_LIMIT_API_WINDOW) || 60 * 1000 // 1 minute
    },
    password_reset: {
      max: parseInt(process.env.RATE_LIMIT_PASSWORD_RESET_MAX) || 3,
      window: parseInt(process.env.RATE_LIMIT_PASSWORD_RESET_WINDOW) || 60 * 60 * 1000 // 1 hour
    }
  },

  // CORS da .env
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(','),

  // Features da .env
  RATE_LIMITING_ENABLED: process.env.FEATURE_RATE_LIMITING === 'true',
  AUDIT_LOGGING_ENABLED: process.env.FEATURE_AUDIT_LOGGING === 'true',
  DEBUG_MODE: process.env.DEBUG_MODE === 'true'
};

// ==========================================
// RATE LIMITING STORAGE
// ==========================================

const rateLimitStore = new Map();

function debugLog(message, data = null) {
  if (CONFIG.DEBUG_MODE) {
    console.log(`[AuthMiddleware] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

function getClientIdentifier(req) {
  // Combina IP e parte User-Agent per identificazione robusta
  const ip = req.ip ||
            req.headers['x-forwarded-for']?.split(',')[0] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            'unknown';

  const userAgent = req.get('User-Agent') || 'unknown';
  const userAgentShort = userAgent.substring(0, 50); // Primi 50 char

  return `${ip}:${Buffer.from(userAgentShort).toString('base64').substring(0, 20)}`;
}

function extractTokenFromHeader(authHeader) {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

async function logSecurityEvent(req, event, details = {}) {
  if (!CONFIG.AUDIT_LOGGING_ENABLED) return;

  try {
    const clientId = getClientIdentifier(req);
    const userId = req.user?.userId || null;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    await UsersDao.logAuditEvent(
      userId,
      event,
      ip,
      userAgent,
      {
        ...details,
        clientId,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      }
    );
  } catch (error) {
    console.error('Error logging security event:', error);
  }
}

function createRateLimiter(limitType) {
  return (req, res, next) => {
    // Skip se rate limiting disabilitato
    if (!CONFIG.RATE_LIMITING_ENABLED) {
      return next();
    }

    const limit = CONFIG.RATE_LIMITS[limitType];
    if (!limit) {
      debugLog(`Rate limit config not found for: ${limitType}`);
      return next();
    }

    const clientId = getClientIdentifier(req);
    const key = `${limitType}:${clientId}`;
    const now = Date.now();

    // Recupera o crea dati client
    const clientData = rateLimitStore.get(key) || {
      attempts: [],
      firstAttempt: now
    };

    // Pulisci tentativi vecchi
    clientData.attempts = clientData.attempts.filter(timestamp =>
      now - timestamp < limit.window
    );

    // Controlla se superato il limite
    if (clientData.attempts.length >= limit.max) {
      const oldestAttempt = Math.min(...clientData.attempts);
      const resetTime = oldestAttempt + limit.window;
      const retryAfter = Math.ceil((resetTime - now) / 1000);

      logSecurityEvent(req, 'rate_limit_exceeded', {
        limitType,
        attempts: clientData.attempts.length,
        retryAfter,
        clientId
      });

      return res.status(429).json({
        error: 'Troppi tentativi',
        message: `Hai superato il limite di ${limit.max} richieste. Riprova tra ${retryAfter} secondi.`,
        retryAfter,
        type: 'RATE_LIMIT_EXCEEDED',
        limitType
      });
    }

    // Registra tentativo corrente
    clientData.attempts.push(now);
    rateLimitStore.set(key, clientData);

    res.set({
      'X-RateLimit-Limit': limit.max,
      'X-RateLimit-Remaining': Math.max(0, limit.max - clientData.attempts.length),
      'X-RateLimit-Reset': new Date(now + limit.window).toISOString(),
      'X-RateLimit-Window': Math.floor(limit.window / 1000)
    });

    debugLog(`Rate limit check passed`, {
      limitType,
      clientId,
      attempts: clientData.attempts.length,
      max: limit.max
    });

    next();
  };
}

// Rate limiters specifici
const rateLimitLogin = createRateLimiter('login');
const rateLimitRegister = createRateLimiter('register');
const rateLimitAPI = createRateLimiter('api');
const rateLimitPasswordReset = createRateLimiter('password_reset');

// ==========================================
// AUTENTICAZIONE JWT
// ==========================================

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    // Nessun token = utente anonimo
    req.user = null;
    debugLog('Optional auth: no token provided');
    return next();
  }

  try {
    const decoded = User.verifyJWT(token);
    req.user = decoded;

    debugLog('Optional auth: token valid', {
      userId: decoded.userId,
      role: decoded.role
    });

    next();
  } catch (error) {
    // Token invalido = utente anonimo (non errore per optional)
    req.user = null;
    debugLog('Optional auth: invalid token, proceeding as anonymous', {
      error: error.message
    });
    next();
  }
}

// Middleware per richiedere autenticazione obbligatoria
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    logSecurityEvent(req, 'auth_missing_token');
    return res.status(401).json({
      error: 'Token di accesso richiesto',
      message: 'Effettua il login per accedere a questa risorsa',
      type: 'MISSING_TOKEN',
      loginUrl: '/api/auth/login'
    });
  }

  try {
    const decoded = User.verifyJWT(token);

    debugLog('Auth required: token decoded', {
      userId: decoded.userId,
      role: decoded.role
    });

    // Verifica che l'utente esista ancora e sia attivo
    UsersDao.getUserById(decoded.userId)
      .then(user => {
        if (!user) {
          logSecurityEvent(req, 'auth_user_not_found', {
            userId: decoded.userId
          });
          return res.status(401).json({
            error: 'Utente non trovato',
            message: 'Il tuo account non esiste più nel sistema',
            type: 'USER_NOT_FOUND'
          });
        }

        if (!user.isActive) {
          logSecurityEvent(req, 'auth_user_inactive', {
            userId: decoded.userId
          });
          return res.status(401).json({
            error: 'Account disattivato',
            message: 'Il tuo account è stato disattivato. Contatta il supporto.',
            type: 'USER_INACTIVE'
          });
        }

        if (user.isEmailVerificationRequired()) {
          return res.status(403).json({
            error: 'Email non verificata',
            message: 'Verifica la tua email per accedere a tutte le funzionalità',
            type: 'EMAIL_NOT_VERIFIED',
            verificationRequired: true
          });
        }

        req.user = decoded;
        req.userEntity = user;

        debugLog('Auth required: user verified', {
          userId: user.id,
          role: user.role
        });

        next();
      })
      .catch(error => {
        console.error('Error verifying user:', error);
        return res.status(500).json({
          error: 'Errore interno del server',
          message: 'Impossibile verificare l\'autenticazione',
          type: 'INTERNAL_ERROR'
        });
      });

  } catch (error) {
    let errorType = 'INVALID_TOKEN';
    let message = 'Token non valido';
    let statusCode = 401;

    if (error.message === 'Token scaduto') {
      errorType = 'TOKEN_EXPIRED';
      message = 'Token scaduto, effettua nuovamente il login';
    } else if (error.message === 'Token non ancora valido') {
      errorType = 'TOKEN_NOT_YET_VALID';
      message = 'Token non ancora valido';
    }

    logSecurityEvent(req, 'auth_invalid_token', {
      error: error.message,
      tokenPresent: !!token
    });

    return res.status(statusCode).json({
      error: message,
      type: errorType,
      loginUrl: '/api/auth/login'
    });
  }
}

// ==========================================
// CONTROLLO RUOLI E PERMESSI
// ==========================================

// Middleware per richiedere ruolo specifico o superiore
function requireRole(requiredRole) {
  return (req, res, next) => {
    // Prima verifica autenticazione
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticazione richiesta',
        message: 'Effettua il login per accedere',
        type: 'MISSING_AUTH'
      });
    }

    const userRole = req.user.role;

    // Gerarchia ruoli con User model
    const roleComparison = User.compareRoles(userRole, requiredRole);

    if (roleComparison < 0) {
      logSecurityEvent(req, 'access_denied_insufficient_role', {
        userRole,
        requiredRole,
        resource: req.path
      });

      return res.status(403).json({
        error: 'Accesso negato',
        message: `Ruolo '${requiredRole}' o superiore richiesto. Il tuo ruolo: '${userRole}'`,
        userRole,
        requiredRole,
        type: 'INSUFFICIENT_ROLE'
      });
    }

    debugLog('Role check passed', { userRole, requiredRole, resource: req.path });
    next();
  };
}

// Middleware per richiedere permesso specifico
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticazione richiesta',
        type: 'MISSING_AUTH'
      });
    }

    const userPermissions = req.user.permissions || [];

    // Admin ha sempre accesso
    if (req.user.role === 'admin') {
      debugLog('Permission check: admin bypass', { permission });
      return next();
    }

    // Controlla permesso wildcard (es. "read:*")
    const [action, resource] = permission.split(':');
    const wildcardPermission = `${action}:*`;

    if (userPermissions.includes(wildcardPermission)) {
      debugLog('Permission check: wildcard match', { permission, wildcard: wildcardPermission });
      return next();
    }

    // Controlla permesso specifico
    if (!userPermissions.includes(permission)) {
      logSecurityEvent(req, 'access_denied_insufficient_permission', {
        userRole: req.user.role,
        requiredPermission: permission,
        userPermissions,
        resource: req.path
      });

      return res.status(403).json({
        error: 'Permesso insufficiente',
        message: `Permesso '${permission}' richiesto`,
        requiredPermission: permission,
        type: 'INSUFFICIENT_PERMISSION'
      });
    }

    debugLog('Permission check passed', { permission, userRole: req.user.role });
    next();
  };
}

// Middleware per verificare ownership delle risorse
function requireOwnership(getUserIdFromParams = (req) => req.params.userId) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticazione richiesta',
        type: 'MISSING_AUTH'
      });
    }

    // Admin può accedere a tutto
    if (req.user.role === 'admin') {
      debugLog('Ownership check: admin bypass');
      return next();
    }

    const targetUserId = getUserIdFromParams(req);
    const currentUserId = req.user.userId;

    const targetId = parseInt(targetUserId);
    const currentId = parseInt(currentUserId);

    if (isNaN(targetId) || isNaN(currentId) || targetId !== currentId) {
      logSecurityEvent(req, 'access_denied_not_owner', {
        currentUserId: currentId,
        targetUserId: targetId,
        resource: req.path
      });

      return res.status(403).json({
        error: 'Accesso negato',
        message: 'Puoi accedere solo ai tuoi dati personali',
        type: 'NOT_OWNER'
      });
    }

    debugLog('Ownership check passed', { userId: currentId, resource: req.path });
    next();
  };
}

// ==========================================
// MIDDLEWARE COMPOSITI
// ==========================================

// Middleware combinato: auth + role
function requireAuthAndRole(role) {
  return [requireAuth, requireRole(role)];
}

// Middleware combinato: auth + permission
function requireAuthAndPermission(permission) {
  return [requireAuth, requirePermission(permission)];
}

// Middleware specifici per ruoli
const requireAdmin = requireAuthAndRole('admin');
const requireStaff = requireAuthAndRole('staff');
const requireCustomer = requireAuthAndRole('customer');

// Middleware per admin panel con extra verifiche
const requireAdminPanel = [
  requireAuth,
  requireRole('admin'),
  requirePermission('access:admin_panel')
];

// ==========================================
// SECURITY HEADERS
// ==========================================

function securityHeaders(req, res, next) {
  // Security headers standard
  res.set({
    // Prevenzione MIME sniffing
    'X-Content-Type-Options': 'nosniff',

    // Prevenzione clickjacking
    'X-Frame-Options': 'DENY',

    // XSS Protection (legacy ma utile)
    'X-XSS-Protection': '1; mode=block',

    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Content Security Policy basic
    'Content-Security-Policy': "default-src 'self'",

    // Nasconde server info
    'Server': 'Dice-And-Drink-API',

    // Prevenzione caching di dati sensibili
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  // Rimuovi header che rivelano tecnologie
  res.removeHeader('X-Powered-By');
  res.removeHeader('ETag');

  debugLog('Security headers applied');
  next();
}

// ==========================================
// CORS CONFIGURATION
// ==========================================

function corsSetup(req, res, next) {
  const origin = req.headers.origin;

  // Verifica origin autorizzati
  if (origin && CONFIG.ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    debugLog('CORS: origin allowed', { origin });
  } else if (CONFIG.ALLOWED_ORIGINS.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    debugLog('CORS: wildcard allowed');
  } else {
    debugLog('CORS: origin not allowed', { origin, allowed: CONFIG.ALLOWED_ORIGINS });
  }

  // Headers CORS
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 ore cache preflight

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    debugLog('CORS: preflight request handled');
    return res.status(200).end();
  }

  next();
}

// ==========================================
// REQUEST LOGGING
// ==========================================

function requestLogger(req, res, next) {
  if (!CONFIG.DEBUG_MODE) return next();

  const start = Date.now();
  const clientId = getClientIdentifier(req);

  debugLog(`Request started`, {
    method: req.method,
    path: req.path,
    clientId,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Log response quando finisce
  res.on('finish', () => {
    const duration = Date.now() - start;
    debugLog(`Request completed`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      clientId
    });
  });

  next();
}

// ==========================================
// CLEANUP UTILITIES
// ==========================================

// Pulisci rate limit store periodicamente
function startRateLimitCleanup() {
  setInterval(() => {
    if (!CONFIG.RATE_LIMITING_ENABLED) return;

    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, data] of rateLimitStore.entries()) {
      const [limitType] = key.split(':');
      const limit = CONFIG.RATE_LIMITS[limitType];

      if (limit && data.attempts) {
        // Filtra tentativi vecchi
        const validAttempts = data.attempts.filter(timestamp =>
          now - timestamp < limit.window
        );

        if (validAttempts.length === 0) {
          rateLimitStore.delete(key);
          cleanedCount++;
        } else if (validAttempts.length !== data.attempts.length) {
          rateLimitStore.set(key, { ...data, attempts: validAttempts });
        }
      }
    }

    if (cleanedCount > 0) {
      debugLog(`Rate limit cleanup: removed ${cleanedCount} expired entries`);
    }
  }, 5 * 60 * 1000); // Ogni 5 minuti
}

// Avvia cleanup automatico
if (CONFIG.RATE_LIMITING_ENABLED) {
  startRateLimitCleanup();
}

// ==========================================
// HEALTH CHECK MIDDLEWARE
// ==========================================

function healthCheck(req, res, next) {
  if (req.path === '/api/health' && req.method === 'GET') {
    return res.json({
      status: 'OK',
      middleware: 'auth',
      timestamp: new Date().toISOString(),
      rateLimiting: CONFIG.RATE_LIMITING_ENABLED,
      auditLogging: CONFIG.AUDIT_LOGGING_ENABLED,
      activeRateLimitEntries: rateLimitStore.size
    });
  }
  next();
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  // Autenticazione base
  optionalAuth,
  requireAuth,

  // Controllo ruoli
  requireRole,
  requirePermission,
  requireOwnership,

  // Middleware compositi
  requireAuthAndRole,
  requireAuthAndPermission,
  requireAdmin,
  requireStaff,
  requireCustomer,
  requireAdminPanel,

  // Rate limiting specifici
  rateLimitLogin,
  rateLimitRegister,
  rateLimitAPI,
  rateLimitPasswordReset,

  // Security e CORS
  securityHeaders,
  corsSetup,
  requestLogger,
  healthCheck,

  // Utilities
  getClientIdentifier,
  logSecurityEvent,

  // Rate limiting generico
  createRateLimiter,

  // Configurazione
  CONFIG
};
