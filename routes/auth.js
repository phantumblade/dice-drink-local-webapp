require('dotenv').config();
const express = require('express');
const router = express.Router();

const { User } = require('../models/User');
const UsersDao = require('../daos/usersDao');
const {
  rateLimitLogin,
  rateLimitRegister,
  rateLimitPasswordReset,
  requireAuth,
  logSecurityEvent,
  getClientIdentifier
} = require('../middleware/auth');

const CONFIG = {
  // Email settings
  EMAIL_ENABLED: process.env.EMAIL_ENABLED === 'true',
  MOCK_EMAIL: process.env.MOCK_EMAIL === 'true',
  SKIP_EMAIL_VERIFICATION: process.env.SKIP_EMAIL_VERIFICATION === 'true',

  // Feature flags
  FEATURE_EMAIL_VERIFICATION: process.env.FEATURE_EMAIL_VERIFICATION === 'true',
  FEATURE_PASSWORD_RESET: process.env.FEATURE_PASSWORD_RESET === 'true',

  // URLs frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  DEBUG_MODE: process.env.DEBUG_MODE === 'true'
};

function debugLog(message, data = null) {
  if (CONFIG.DEBUG_MODE) {
    console.log(`[AuthRoutes] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

function getRequestInfo(req) {
  return {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    clientId: getClientIdentifier(req)
  };
}

async function sendEmail(to, subject, content, type = 'verification') {
  if (!CONFIG.EMAIL_ENABLED) {
    debugLog(`Email disabled - would send ${type} email`, { to, subject });
    return { success: true, mock: true };
  }

  if (CONFIG.MOCK_EMAIL) {
    debugLog(`MOCK EMAIL - ${type}`, { to, subject, content });
    console.log('📧 =================================');
    console.log(`📧  MOCK EMAIL - ${type.toUpperCase()}`);
    console.log('📧 =================================');
    console.log(`📧  To: ${to}`);
    console.log(`📧  Subject: ${subject}`);
    console.log(`📧  Content:`);
    console.log(content);
    console.log('📧 =================================');
    return { success: true, mock: true };
  }

  debugLog(`Real email sending not implemented yet`, { to, subject, type });
  return { success: false, error: 'Email sending not implemented' };
}

function validateInput(req, requiredFields) {
  const errors = [];

  for (const field of requiredFields) {
    if (!req.body[field]) {
      errors.push(`Campo '${field}' è obbligatorio`);
    }
  }

  // Validazioni specifiche
  if (req.body.email && req.body.email.length > 254) {
    errors.push('Email troppo lunga');
  }

  if (req.body.password && req.body.password.length > 128) {
    errors.push('Password troppo lunga');
  }

  return errors;
}

// ==========================================
// ROUTE: POST /api/auth/register
// ==========================================

router.post('/register', rateLimitRegister, async (req, res) => {
  debugLog('Register attempt', { email: req.body.email });

  try {
    // Validazione input
    const validationErrors = validateInput(req, ['email', 'password']);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: validationErrors,
        type: 'VALIDATION_ERROR'
      });
    }

    const { email, password, firstName, lastName, phone, dateOfBirth } = req.body;

    // Prepara dati utente
    const userData = {
      email,
      password,
      role: 'customer', // Default role
      first_name: firstName,
      last_name: lastName,
      phone,
      date_of_birth: dateOfBirth
    };

    // Crea utente
    const user = await UsersDao.createUser(userData);

    // Log audit
    const requestInfo = getRequestInfo(req);
    await logSecurityEvent(req, 'user_registered', {
      userId: user.id,
      email: user.email,
      emailVerificationRequired: user.isEmailVerificationRequired()
    });

    // Invia email di verifica se necessario
    let emailSent = false;
    let verificationToken = null;

    if (user.isEmailVerificationRequired() && !CONFIG.SKIP_EMAIL_VERIFICATION) {
      verificationToken = user.verificationToken;
      const verificationUrl = `${CONFIG.FRONTEND_URL}/verify-email?token=${verificationToken}`;

      const emailResult = await sendEmail(
        user.email,
        `Benvenuto in ${process.env.COMPANY_NAME || 'Dice & Drink'} - Verifica il tuo account`,
        `
Ciao ${user.getDisplayName()},

Benvenuto in ${process.env.COMPANY_NAME || 'Dice & Drink'}! 🎲🍹

Per completare la registrazione, clicca sul link qui sotto per verificare il tuo indirizzo email:

${verificationUrl}

Questo link è valido per 24 ore.

Se non hai richiesto questa registrazione, ignora questa email.

Saluti,
Il team di ${process.env.COMPANY_NAME || 'Dice & Drink'}
        `,
        'verification'
      );

      emailSent = emailResult.success;
      debugLog('Verification email sent', { success: emailSent, mock: emailResult.mock });
    }

    // Genera sempre token per login automatico dopo registrazione
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Crea sessione per login automatico
    await UsersDao.createSession(
      user.id,
      refreshToken,
      req.get('User-Agent'),
      requestInfo.ip,
      requestInfo.userAgent
    );

    debugLog('User registered and logged in automatically', { userId: user.id });

    // Risposta - sempre con tokens per login automatico
    const response = {
      message: 'Registrazione completata con successo',
      user: user.getPublicProfile(),
      emailVerificationRequired: user.isEmailVerificationRequired(),
      success: true,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m'
      }
    };

    if (user.isEmailVerificationRequired() && !CONFIG.SKIP_EMAIL_VERIFICATION) {
      response.verificationEmailSent = emailSent;
      response.message = 'Registrazione completata. Controlla la tua email per verificare l\'account.';

      if (CONFIG.MOCK_EMAIL) {
        response.mockVerificationToken = verificationToken;
        response.mockVerificationUrl = `${CONFIG.FRONTEND_URL}/verify-email?token=${verificationToken}`;
      }
    }

    res.status(201).json(response);

  } catch (error) {
    debugLog('Registration error', { error: error.message });

    await logSecurityEvent(req, 'registration_failed', {
      email: req.body.email,
      error: error.message
    });

    // Gestione errori specifici
    if (error.message.includes('già registrata')) {
      return res.status(409).json({
        error: 'Email già registrata',
        message: 'Questo indirizzo email è già associato a un account esistente',
        type: 'EMAIL_ALREADY_EXISTS'
      });
    }

    if (error.message.includes('Errori validazione')) {
      return res.status(400).json({
        error: 'Dati non validi',
        message: error.message,
        type: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Errore durante la registrazione',
      message: 'Si è verificato un errore interno. Riprova più tardi.',
      type: 'INTERNAL_ERROR'
    });
  }
});

// ==========================================
// ROUTE: POST /api/auth/login
// ==========================================

router.post('/login', rateLimitLogin, async (req, res) => {
  debugLog('Login attempt', { email: req.body.email });

  try {
    // Validazione input
    const validationErrors = validateInput(req, ['email', 'password']);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Credenziali richieste',
        details: validationErrors,
        type: 'VALIDATION_ERROR'
      });
    }

    const { email, password, rememberMe = false } = req.body;
    const requestInfo = getRequestInfo(req);

    // Autenticazione
    const user = await UsersDao.authenticateUser(
      email,
      password,
      requestInfo.ip,
      requestInfo.userAgent
    );

    // Genera token
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Crea sessione con durata basata su rememberMe
    const deviceInfo = {
      userAgent: requestInfo.userAgent,
      rememberMe,
      loginTime: new Date().toISOString()
    };

    await UsersDao.createSession(
      user.id,
      refreshToken,
      JSON.stringify(deviceInfo),
      requestInfo.ip,
      requestInfo.userAgent
    );

    debugLog('Login successful', {
      userId: user.id,
      role: user.role,
      rememberMe
    });

    // Risposta successo
    res.json({
      message: 'Login effettuato con successo',
      user: user.getPublicProfile(),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m'
      },
      permissions: user.getPermissions(),
      success: true
    });

  } catch (error) {
    debugLog('Login error', { error: error.message });

    // Gestione errori specifici per UX
    if (error.message === 'Credenziali non valide') {
      return res.status(401).json({
        error: 'Credenziali non valide',
        message: 'Email o password non corretti',
        type: 'INVALID_CREDENTIALS'
      });
    }

    if (error.message.includes('bloccato')) {
      return res.status(423).json({
        error: 'Account temporaneamente bloccato',
        message: error.message,
        type: 'ACCOUNT_LOCKED'
      });
    }

    if (error.message.includes('disattivato')) {
      return res.status(403).json({
        error: 'Account disattivato',
        message: 'Il tuo account è stato disattivato. Contatta il supporto.',
        type: 'ACCOUNT_DISABLED'
      });
    }

    res.status(500).json({
      error: 'Errore durante il login',
      message: 'Si è verificato un errore interno. Riprova più tardi.',
      type: 'INTERNAL_ERROR'
    });
  }
});

// ==========================================
// ROUTE: POST /api/auth/refresh
// ==========================================

router.post('/refresh', async (req, res) => {
  debugLog('Token refresh attempt');

  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token richiesto',
        type: 'MISSING_REFRESH_TOKEN'
      });
    }

    // Verifica refresh token
    const session = await UsersDao.getSessionByRefreshToken(refreshToken);

    if (!session) {
      await logSecurityEvent(req, 'refresh_token_invalid', {
        tokenPresent: !!refreshToken
      });

      return res.status(401).json({
        error: 'Refresh token non valido o scaduto',
        message: 'Effettua nuovamente il login',
        type: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Verifica che l'utente sia ancora attivo
    if (!session.is_active) {
      return res.status(401).json({
        error: 'Utente non attivo',
        message: 'Il tuo account è stato disattivato',
        type: 'USER_INACTIVE'
      });
    }

    // Genera nuovo access token
    const user = await UsersDao.getUserById(session.user_id);
    if (!user) {
      return res.status(401).json({
        error: 'Utente non trovato',
        type: 'USER_NOT_FOUND'
      });
    }

    const newAccessToken = user.generateAccessToken();

    debugLog('Token refresh successful', { userId: user.id });

    // Risposta con nuovo access token
    res.json({
      message: 'Token aggiornato con successo',
      tokens: {
        accessToken: newAccessToken,
        refreshToken,
        expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m'
      },
      user: user.getPublicProfile(),
      success: true
    });

  } catch (error) {
    debugLog('Token refresh error', { error: error.message });

    await logSecurityEvent(req, 'refresh_token_error', {
      error: error.message
    });

    res.status(401).json({
      error: 'Errore aggiornamento token',
      message: 'Effettua nuovamente il login',
      type: 'REFRESH_ERROR'
    });
  }
});

// ==========================================
// ROUTE: POST /api/auth/logout
// ==========================================

router.post('/logout', requireAuth, async (req, res) => {
  debugLog('Logout attempt', { userId: req.user.userId });

  try {
    const { refreshToken, logoutAll = false } = req.body;

    if (logoutAll) {
      // Logout da tutti i dispositivi
      const invalidatedSessions = await UsersDao.invalidateAllUserSessions(req.user.userId);

      await logSecurityEvent(req, 'logout_all_devices', {
        userId: req.user.userId,
        sessionsInvalidated: invalidatedSessions
      });

      res.json({
        message: 'Logout effettuato da tutti i dispositivi',
        sessionsInvalidated: invalidatedSessions,
        success: true
      });
    } else if (refreshToken) {
      // Logout dal dispositivo corrente
      const invalidated = await UsersDao.invalidateSession(refreshToken);

      await logSecurityEvent(req, 'logout_single_device', {
        userId: req.user.userId,
        sessionInvalidated: invalidated
      });

      res.json({
        message: 'Logout effettuato con successo',
        success: true
      });
    } else {
      // Logout senza refresh token (solo access token)
      await logSecurityEvent(req, 'logout_access_token_only', {
        userId: req.user.userId
      });

      res.json({
        message: 'Logout effettuato (solo access token)',
        note: 'Fornisci il refresh token per invalidare la sessione completamente',
        success: true
      });
    }

  } catch (error) {
    debugLog('Logout error', { error: error.message });

    res.status(500).json({
      error: 'Errore durante il logout',
      message: 'Si è verificato un errore interno',
      type: 'INTERNAL_ERROR'
    });
  }
});

// ==========================================
// ROUTE: POST /api/auth/verify-email
// ==========================================

router.post('/verify-email', async (req, res) => {
  debugLog('Email verification attempt');

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token di verifica richiesto',
        type: 'MISSING_TOKEN'
      });
    }

    // Verifica email
    const user = await UsersDao.verifyEmail(token);

    if (!user) {
      await logSecurityEvent(req, 'email_verification_failed', {
        tokenPresent: !!token
      });

      return res.status(400).json({
        error: 'Token di verifica non valido o scaduto',
        message: 'Il link di verifica potrebbe essere scaduto. Richiedi un nuovo link.',
        type: 'INVALID_TOKEN'
      });
    }

    debugLog('Email verification successful', { userId: user.id });

    // Genera token di accesso dopo verifica
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Crea sessione
    const requestInfo = getRequestInfo(req);
    await UsersDao.createSession(
      user.id,
      refreshToken,
      req.get('User-Agent'),
      requestInfo.ip,
      requestInfo.userAgent
    );

    res.json({
      message: 'Email verificata con successo!',
      user: user.getPublicProfile(),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m'
      },
      success: true
    });

  } catch (error) {
    debugLog('Email verification error', { error: error.message });

    res.status(500).json({
      error: 'Errore durante la verifica email',
      message: 'Si è verificato un errore interno',
      type: 'INTERNAL_ERROR'
    });
  }
});

// ==========================================
// ROUTE: POST /api/auth/resend-verification
// ==========================================

router.post('/resend-verification', rateLimitRegister, async (req, res) => {
  debugLog('Resend verification attempt');

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email richiesta',
        type: 'MISSING_EMAIL'
      });
    }

    const user = await UsersDao.getUserByEmail(email);

    if (!user) {
      // Non rivelare se l'email esiste (sicurezza)
      return res.json({
        message: 'Se l\'email esiste nel nostro sistema, riceverai un nuovo link di verifica',
        success: true
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        error: 'Email già verificata',
        message: 'Il tuo account è già stato verificato',
        type: 'ALREADY_VERIFIED'
      });
    }

    // Genera nuovo token
    const verificationToken = user.generateVerificationToken();
    await UsersDao.updateUser(user.id, {
      verification_token: verificationToken
    });

    // Invia email
    const verificationUrl = `${CONFIG.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const emailResult = await sendEmail(
      user.email,
      `${process.env.COMPANY_NAME || 'Dice & Drink'} - Nuovo link di verifica`,
      `
Ciao ${user.getDisplayName()},

Hai richiesto un nuovo link di verifica per il tuo account.

Clicca sul link qui sotto per verificare il tuo indirizzo email:

${verificationUrl}

Questo link è valido per 24 ore.

Se non hai richiesto questa verifica, ignora questa email.

Saluti,
Il team di ${process.env.COMPANY_NAME || 'Dice & Drink'}
      `,
      'verification'
    );

    await logSecurityEvent(req, 'verification_email_resent', {
      userId: user.id,
      email: user.email
    });

    const response = {
      message: 'Nuovo link di verifica inviato',
      success: true
    };

    if (CONFIG.MOCK_EMAIL) {
      response.mockVerificationToken = verificationToken;
      response.mockVerificationUrl = verificationUrl;
    }

    res.json(response);

  } catch (error) {
    debugLog('Resend verification error', { error: error.message });

    res.status(500).json({
      error: 'Errore durante l\'invio del link di verifica',
      message: 'Si è verificato un errore interno',
      type: 'INTERNAL_ERROR'
    });
  }
});

// ==========================================
// ROUTE: POST /api/auth/forgot-password
// ==========================================

router.post('/forgot-password', rateLimitPasswordReset, async (req, res) => {
  debugLog('Forgot password attempt');

  if (!CONFIG.FEATURE_PASSWORD_RESET) {
    return res.status(404).json({
      error: 'Funzionalità non disponibile',
      message: 'Il reset password è temporaneamente disabilitato',
      type: 'FEATURE_DISABLED'
    });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email richiesta',
        type: 'MISSING_EMAIL'
      });
    }

    // Inizia processo reset
    const result = await UsersDao.initiatePasswordReset(email);

    if (result.success && result.user) {
      // Invia email con token reset
      const resetUrl = `${CONFIG.FRONTEND_URL}/reset-password?token=${result.token}`;

      const emailResult = await sendEmail(
        result.user.email,
        `${process.env.COMPANY_NAME || 'Dice & Drink'} - Reset password`,
        `
Ciao ${result.user.getDisplayName()},

Hai richiesto il reset della password per il tuo account.

Clicca sul link qui sotto per impostare una nuova password:

${resetUrl}

Questo link è valido per 1 ora.

Se non hai richiesto il reset, ignora questa email e la tua password rimarrà invariata.

Saluti,
Il team di ${process.env.COMPANY_NAME || 'Dice & Drink'}
        `,
        'password_reset'
      );

      await logSecurityEvent(req, 'password_reset_requested', {
        userId: result.user.id,
        email: result.user.email
      });

      const response = {
        message: 'Se l\'email esiste nel nostro sistema, riceverai le istruzioni per il reset',
        success: true
      };

      if (CONFIG.MOCK_EMAIL) {
        response.mockResetToken = result.token;
        response.mockResetUrl = resetUrl;
      }

      res.json(response);
    } else {
      // Risposta generica per sicurezza
      res.json({
        message: 'Se l\'email esiste nel nostro sistema, riceverai le istruzioni per il reset',
        success: true
      });
    }

  } catch (error) {
    debugLog('Forgot password error', { error: error.message });

    res.status(500).json({
      error: 'Errore durante la richiesta di reset',
      message: 'Si è verificato un errore interno',
      type: 'INTERNAL_ERROR'
    });
  }
});

// ==========================================
// ROUTE: POST /api/auth/reset-password
// ==========================================

router.post('/reset-password', rateLimitPasswordReset, async (req, res) => {
  debugLog('Reset password attempt');

  if (!CONFIG.FEATURE_PASSWORD_RESET) {
    return res.status(404).json({
      error: 'Funzionalità non disponibile',
      type: 'FEATURE_DISABLED'
    });
  }

  try {
    const { token, password } = req.body;

    const validationErrors = validateInput(req, ['token', 'password']);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Dati richiesti',
        details: validationErrors,
        type: 'VALIDATION_ERROR'
      });
    }

    // Reset password
    const user = await UsersDao.resetPassword(token, password);

    if (!user) {
      await logSecurityEvent(req, 'password_reset_failed', {
        tokenPresent: !!token
      });

      return res.status(400).json({
        error: 'Token non valido o scaduto',
        message: 'Il link di reset potrebbe essere scaduto. Richiedi un nuovo reset.',
        type: 'INVALID_TOKEN'
      });
    }

    debugLog('Password reset successful', { userId: user.id });

    // Genera nuovi token dopo reset
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Crea nuova sessione
    const requestInfo = getRequestInfo(req);
    await UsersDao.createSession(
      user.id,
      refreshToken,
      req.get('User-Agent'),
      requestInfo.ip,
      requestInfo.userAgent
    );

    res.json({
      message: 'Password reimpostata con successo',
      user: user.getPublicProfile(),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m'
      },
      success: true
    });

  } catch (error) {
    debugLog('Reset password error', { error: error.message });

    if (error.message.includes('Password deve')) {
      return res.status(400).json({
        error: 'Password non valida',
        message: error.message,
        type: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Errore durante il reset password',
      message: 'Si è verificato un errore interno',
      type: 'INTERNAL_ERROR'
    });
  }
});

// ==========================================
// ROUTE: GET /api/auth/me
// ==========================================

router.get('/me', requireAuth, async (req, res) => {
  debugLog('Get current user', { userId: req.user.userId });

  try {
    // Ricarica dati utente freschi dal database
    const user = await UsersDao.getUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'Utente non trovato',
        type: 'USER_NOT_FOUND'
      });
    }

    res.json({
      user: user.getPublicProfile(),
      permissions: user.getPermissions(),
      success: true
    });

  } catch (error) {
    debugLog('Get current user error', { error: error.message });

    res.status(500).json({
      error: 'Errore recupero dati utente',
      type: 'INTERNAL_ERROR'
    });
  }
});

// ==========================================
// ROUTE: GET /api/auth/sessions
// ==========================================

router.get('/sessions', requireAuth, async (req, res) => {
  debugLog('Get user sessions', { userId: req.user.userId });

  try {
    const sessions = await UsersDao.getUserActiveSessions(req.user.userId);

    res.json({
      sessions: sessions.map(session => ({
        id: session.id,
        deviceInfo: session.device_info,
        ipAddress: session.ip_address,
        createdAt: session.created_at,
        lastUsed: session.last_used,
        expiresAt: session.expires_at
      })),
      total: sessions.length,
      success: true
    });

  } catch (error) {
    debugLog('Get sessions error', { error: error.message });

    res.status(500).json({
      error: 'Errore recupero sessioni',
      type: 'INTERNAL_ERROR'
    });
  }
});

// routes/auth.js - Aggiungi questo endpoint temporaneo SOLO per testing

// ENDPOINT TEMPORANEO PER TESTING - RIMUOVI IN PRODUZIONE!
router.post('/test-admin-token', async (req, res) => {
  try {
    // ATTENZIONE: Questo endpoint bypassa la sicurezza - SOLO PER SVILUPPO!
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Endpoint non disponibile in produzione'
      });
    }

    console.log('⚠️ ATTENZIONE: Generazione token admin di test!');

    // Crea un utente admin fittizio per il test
    const testAdminUser = {
      userId: 999,
      id: 999,
      email: 'test-admin@dicedrink.local',
      first_name: 'Test',
      last_name: 'Admin',
      role: 'admin',
      permissions: ['*:*'], // Tutti i permessi
      isActive: true
    };

    // Genera token JWT valido
    const accessToken = User.generateJWT(testAdminUser);
    const refreshToken = User.generateRefreshToken(testAdminUser);

    res.json({
      success: true,
      message: '🔧 Token admin di test generato',
      tokens: {
        accessToken,
        refreshToken
      },
      user: testAdminUser,
      warning: 'SOLO PER TESTING - Non usare in produzione!',
      instructions: {
        steps: [
          '1. Copia il accessToken qui sotto',
          '2. Vai nel tuo API tester (Postman/Insomnia)',
          '3. Headers → Authorization → Bearer {accessToken}',
          '4. Ora puoi testare PUT /api/games/:id'
        ],
        tokenToCopy: accessToken
      }
    });

  } catch (error) {
    console.error('Errore generazione token test:', error);
    res.status(500).json({
      error: 'Errore generazione token di test',
      details: error.message
    });
  }
});

module.exports = router;
