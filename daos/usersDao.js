require('dotenv').config();
const openDb = require('../db');
const { User } = require('../models/User');

const CONFIG = {
  DEBUG_MODE: process.env.DEBUG_MODE === 'true',
  AUDIT_ENABLED: process.env.FEATURE_AUDIT_LOGGING === 'true',
  CLEANUP_ENABLED: process.env.FEATURE_AUTO_CLEANUP === 'true',
  AUDIT_RETENTION_DAYS: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 90
};

function debugLog(message, data = null) {
  if (CONFIG.DEBUG_MODE) {
    console.log(`[UsersDao] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

function handleError(operation, error) {
  console.error(`[UsersDao] Error in ${operation}:`, error.message);
  if (CONFIG.DEBUG_MODE) {
    console.error(error.stack);
  }
  throw error;
}

class UsersDao {

  // ==========================================
  // CREATE - REGISTRAZIONE E NUOVO UTENTE
  // ==========================================

  static async createUser(userData) {
    debugLog('createUser called', { email: userData.email, role: userData.role });

    try {
      // Validazione dati completa
      User.validateUserData(userData);

      const db = await openDb();

      // Verifica email univoca
      const sanitizedEmail = User.sanitizeEmail(userData.email);
      const existingUser = await db.get(
        'SELECT id, email FROM users WHERE email = ?',
        [sanitizedEmail]
      );

      if (existingUser) {
        await db.close();
        throw new Error('Email già registrata nel sistema');
      }

      // Hash password se fornita
      let passwordHash = null;
      if (userData.password) {
        passwordHash = await User.hashPassword(userData.password);
      }

      // Crea istanza User
      const user = new User({
        ...userData,
        email: sanitizedEmail,
        password_hash: passwordHash,
        email_verified: userData.role === 'admin' ? 1 : 0 // Admin pre-verificati
      });

      // Genera token di verifica se necessario
      if (user.isEmailVerificationRequired()) {
        user.generateVerificationToken();
      }

      // Inserimento nel database
      const result = await db.run(
        `INSERT INTO users (
          email, password_hash, role, first_name, last_name, phone,
          date_of_birth, is_active, email_verified, verification_token
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.email,
          user.passwordHash,
          user.role,
          user.firstName,
          user.lastName,
          user.phone,
          user.dateOfBirth,
          user.isActive ? 1 : 0,
          user.emailVerified ? 1 : 0,
          user.verificationToken
        ]
      );

      user.id = result.lastID;

      // Crea preferenze di default
      await UsersDao.createDefaultPreferences(user.id, user.role);

      // Log audit
      if (CONFIG.AUDIT_ENABLED) {
        await UsersDao.logAuditEvent(user.id, 'user_created', null, null, {
          role: user.role,
          email: user.email,
          emailVerified: user.emailVerified
        });
      }

      await db.close();

      debugLog('User created successfully', { id: user.id, email: user.email });
      return user;

    } catch (error) {
      handleError('createUser', error);
    }
  }

  static async createDefaultPreferences(userId, userRole = 'customer') {
    debugLog('createDefaultPreferences called', { userId, userRole });

    try {
      const db = await openDb();

      // Preferenze basate sul ruolo
      let defaultPreferences = {
        favorite_game_categories: ['Famiglia', 'Party'],
        dietary_restrictions: [],
        preferred_drink_types: ['analcolici'],
        max_game_complexity: 3,
        preferred_player_count: '2-4',
        allergies: null,
        notes: null,
        preferred_time_slots: ['18:00', '20:00'],
        notification_preferences: {
          email: true,
          sms: false,
          push: true
        }
      };

      // Personalizzazione per staff/admin
      if (userRole === 'staff' || userRole === 'admin') {
        defaultPreferences.favorite_game_categories = ['Strategia', 'Cooperativo', 'Famiglia'];
        defaultPreferences.max_game_complexity = 5;
        defaultPreferences.preferred_drink_types = ['cocktail', 'birra', 'analcolici'];
        defaultPreferences.preferred_time_slots = ['16:00', '18:00', '20:00', '22:00'];
      }

      await db.run(
        `INSERT INTO user_preferences (
          user_id, favorite_game_categories, dietary_restrictions,
          preferred_drink_types, max_game_complexity, preferred_player_count,
          allergies, notes, preferred_time_slots, notification_preferences
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          JSON.stringify(defaultPreferences.favorite_game_categories),
          JSON.stringify(defaultPreferences.dietary_restrictions),
          JSON.stringify(defaultPreferences.preferred_drink_types),
          defaultPreferences.max_game_complexity,
          defaultPreferences.preferred_player_count,
          defaultPreferences.allergies,
          defaultPreferences.notes,
          JSON.stringify(defaultPreferences.preferred_time_slots),
          JSON.stringify(defaultPreferences.notification_preferences)
        ]
      );

      await db.close();
      debugLog('Default preferences created', { userId });

    } catch (error) {
      console.error('Error creating default preferences:', error);
      // Non lanciare errore - le preferenze sono opzionali
    }
  }

  // ==========================================
  // READ - RECUPERO UTENTI
  // ==========================================

  static async getUserById(id) {
    debugLog('getUserById called', { id });

    try {
      const db = await openDb();

      const row = await db.get(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );

      await db.close();

      if (!row) {
        debugLog('User not found', { id });
        return null;
      }

      const user = User.fromDatabaseRow(row);
      debugLog('User found', { id: user.id, email: user.email });
      return user;

    } catch (error) {
      handleError('getUserById', error);
    }
  }

  static async getUserByEmail(email) {
    debugLog('getUserByEmail called', { email });

    try {
      const db = await openDb();

      const sanitizedEmail = User.sanitizeEmail(email);
      const row = await db.get(
        'SELECT * FROM users WHERE email = ?',
        [sanitizedEmail]
      );

      await db.close();

      if (!row) {
        debugLog('User not found by email', { email: sanitizedEmail });
        return null;
      }

      const user = User.fromDatabaseRow(row);
      debugLog('User found by email', { id: user.id, email: user.email });
      return user;

    } catch (error) {
      handleError('getUserByEmail', error);
    }
  }

  static async getUserByVerificationToken(token) {
    debugLog('getUserByVerificationToken called');

    try {
      const db = await openDb();

      const row = await db.get(
        'SELECT * FROM users WHERE verification_token = ? AND verification_token IS NOT NULL',
        [token]
      );

      await db.close();

      if (!row) {
        debugLog('User not found by verification token');
        return null;
      }

      return User.fromDatabaseRow(row);

    } catch (error) {
      handleError('getUserByVerificationToken', error);
    }
  }

  static async getUserByResetToken(token) {
    debugLog('getUserByResetToken called');

    try {
      const db = await openDb();

      const row = await db.get(
        'SELECT * FROM users WHERE reset_token = ? AND reset_expires > datetime("now")',
        [token]
      );

      await db.close();

      if (!row) {
        debugLog('User not found by reset token or token expired');
        return null;
      }

      return User.fromDatabaseRow(row);

    } catch (error) {
      handleError('getUserByResetToken', error);
    }
  }

  static async getAllUsers(options = {}) {
    debugLog('getAllUsers called', options);

    try {
      const db = await openDb();

      // Costruzione query dinamica
      let query = 'SELECT * FROM users WHERE 1=1';
      const params = [];

      // Filtro per ruolo
      if (options.role) {
        query += ' AND role = ?';
        params.push(options.role);
      }

      // Filtro per stato attivo
      if (options.activeOnly !== false) {
        query += ' AND is_active = 1';
      }

      // Filtro per email verificata
      if (options.verifiedOnly) {
        query += ' AND email_verified = 1';
      }

      // Ricerca testuale
      if (options.search) {
        query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
        const searchTerm = `%${options.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Ordinamento
      const allowedOrderBy = ['created_at', 'last_login', 'email', 'role', 'first_name', 'last_name'];
      const orderBy = allowedOrderBy.includes(options.orderBy) ? options.orderBy : 'created_at';
      const direction = options.direction === 'ASC' ? 'ASC' : 'DESC';
      query += ` ORDER BY ${orderBy} ${direction}`;

      // Paginazione
      if (options.limit && !isNaN(options.limit)) {
        query += ' LIMIT ?';
        params.push(parseInt(options.limit));

        if (options.offset && !isNaN(options.offset)) {
          query += ' OFFSET ?';
          params.push(parseInt(options.offset));
        }
      }

      debugLog('Executing query', { query, params });
      const rows = await db.all(query, params);
      await db.close();

      const users = rows.map(row => User.fromDatabaseRow(row));
      debugLog('Users retrieved', { count: users.length });

      return users;

    } catch (error) {
      handleError('getAllUsers', error);
    }
  }

  // ==========================================
  // UPDATE - AGGIORNAMENTO UTENTI
  // ==========================================

  static async updateUser(id, updateData) {
    debugLog('updateUser called', { id, fields: Object.keys(updateData) });

    try {
      const user = await UsersDao.getUserById(id);
      if (!user) {
        throw new Error('Utente non trovato');
      }

      // Validazione dati aggiornamento
      if (updateData.email) {
        User.validateEmail(updateData.email);
        updateData.email = User.sanitizeEmail(updateData.email);

        // Verifica unicità email se cambiata
        if (updateData.email !== user.email) {
          const existingUser = await UsersDao.getUserByEmail(updateData.email);
          if (existingUser && existingUser.id !== id) {
            throw new Error('Email già in uso da un altro utente');
          }
          // Reset verifica email se cambiata
          updateData.email_verified = 0;
          updateData.verification_token = new User().generateVerificationToken();
        }
      }

      if (updateData.role) {
        User.validateRole(updateData.role);
      }

      if (updateData.phone) {
        User.validatePhone(updateData.phone);
      }

      // Hash nuova password se fornita
      if (updateData.password) {
        updateData.password_hash = await User.hashPassword(updateData.password);
        delete updateData.password;

        // Reset security quando password cambia
        updateData.failed_login_attempts = 0;
        updateData.locked_until = null;
        updateData.reset_token = null;
        updateData.reset_expires = null;
      }

      const db = await openDb();

      // Costruzione query dinamica per update
      const updateFields = [];
      const updateValues = [];

      // Campi aggiornabili con mapping
      const fieldMapping = {
        'email': 'email',
        'password_hash': 'password_hash',
        'role': 'role',
        'firstName': 'first_name',
        'first_name': 'first_name',
        'lastName': 'last_name',
        'last_name': 'last_name',
        'phone': 'phone',
        'dateOfBirth': 'date_of_birth',
        'date_of_birth': 'date_of_birth',
        'isActive': 'is_active',
        'is_active': 'is_active',
        'emailVerified': 'email_verified',
        'email_verified': 'email_verified',
        'verification_token': 'verification_token',
        'reset_token': 'reset_token',
        'reset_expires': 'reset_expires',
        'failed_login_attempts': 'failed_login_attempts',
        'locked_until': 'locked_until',
        'profile_image': 'profile_image',
        'last_login': 'last_login'
      };

      for (const [inputField, dbField] of Object.entries(fieldMapping)) {
        if (updateData.hasOwnProperty(inputField)) {
          updateFields.push(`${dbField} = ?`);

          // Conversione boolean per SQLite
          let value = updateData[inputField];
          if (typeof value === 'boolean') {
            value = value ? 1 : 0;
          }

          updateValues.push(value);
        }
      }

      if (updateFields.length === 0) {
        await db.close();
        throw new Error('Nessun campo valido da aggiornare');
      }

      updateValues.push(id);

      const result = await db.run(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Log audit per cambiamenti significativi
      if (CONFIG.AUDIT_ENABLED) {
        const significantChanges = ['email', 'role', 'password_hash', 'is_active'];
        const changedFields = Object.keys(updateData).filter(field =>
          significantChanges.includes(field.replace('_hash', '').replace('_', ''))
        );

        if (changedFields.length > 0) {
          await UsersDao.logAuditEvent(id, 'user_updated', null, null, {
            updatedFields: changedFields,
            previousEmail: user.email,
            newRole: updateData.role
          });
        }
      }

      await db.close();

      if (result.changes === 0) {
        throw new Error('Utente non trovato o nessuna modifica effettuata');
      }

      debugLog('User updated successfully', { id, changedFields: updateFields.length });
      return await UsersDao.getUserById(id);

    } catch (error) {
      handleError('updateUser', error);
    }
  }

  // ==========================================
  // DELETE - CANCELLAZIONE
  // ==========================================

  static async deleteUser(id, hardDelete = false) {
    debugLog('deleteUser called', { id, hardDelete });

    try {
      const user = await UsersDao.getUserById(id);
      if (!user) {
        throw new Error('Utente non trovato');
      }

      const db = await openDb();

      if (hardDelete) {
        // Hard delete - rimuove completamente
        await db.run('DELETE FROM users WHERE id = ?', [id]);

        if (CONFIG.AUDIT_ENABLED) {
          await UsersDao.logAuditEvent(null, 'user_hard_deleted', null, null, {
            deletedUserId: id,
            deletedEmail: user.email,
            deletedRole: user.role
          });
        }

        debugLog('User hard deleted', { id });
      } else {
        // Soft delete - disattiva account e anonimizza email
        const anonymizedEmail = `deleted_${Date.now()}_${id}@deleted.local`;
        await db.run(
          'UPDATE users SET is_active = 0, email = ?, first_name = NULL, last_name = NULL, phone = NULL WHERE id = ?',
          [anonymizedEmail, id]
        );

        if (CONFIG.AUDIT_ENABLED) {
          await UsersDao.logAuditEvent(id, 'user_soft_deleted', null, null, {
            originalEmail: user.email
          });
        }

        debugLog('User soft deleted', { id });
      }

      await db.close();
      return true;

    } catch (error) {
      handleError('deleteUser', error);
    }
  }

  // ==========================================
  // AUTENTICAZIONE E SESSIONI
  // ==========================================

  static async authenticateUser(email, password, ipAddress = null, userAgent = null) {
    debugLog('authenticateUser called', { email });

    try {
      const user = await UsersDao.getUserByEmail(email);

      if (!user) {
        // Evita timing attacks - simula hash password
        await User.hashPassword('dummy_password_to_prevent_timing_attacks');

        if (CONFIG.AUDIT_ENABLED) {
          await UsersDao.logAuditEvent(null, 'login_failed', ipAddress, userAgent, {
            email,
            reason: 'user_not_found'
          });
        }

        throw new Error('Credenziali non valide');
      }

      // Verifica se account può fare login
      user.canLogin();

      // Verifica password
      const isValidPassword = await user.verifyPassword(password);

      if (!isValidPassword) {
        // Incrementa tentativi falliti
        await UsersDao.incrementFailedAttempts(user.id);

        if (CONFIG.AUDIT_ENABLED) {
          await UsersDao.logAuditEvent(user.id, 'login_failed', ipAddress, userAgent, {
            reason: 'invalid_password'
          });
        }

        throw new Error('Credenziali non valide');
      }

      // Login riuscito
      await UsersDao.updateLoginSuccess(user.id);

      if (CONFIG.AUDIT_ENABLED) {
        await UsersDao.logAuditEvent(user.id, 'login_success', ipAddress, userAgent, {
          previousLogin: user.lastLogin
        });
      }

      // Ricarica utente con dati aggiornati
      const updatedUser = await UsersDao.getUserById(user.id);
      debugLog('User authenticated successfully', { id: user.id, email: user.email });

      return updatedUser;

    } catch (error) {
      handleError('authenticateUser', error);
    }
  }

  static async incrementFailedAttempts(userId) {
    debugLog('incrementFailedAttempts called', { userId });

    try {
      const db = await openDb();

      // Calcola lock time in minuti da environment
      const lockTimeMinutes = parseInt(process.env.ACCOUNT_LOCK_TIME) || 15;

      await db.run(
        `UPDATE users SET
         failed_login_attempts = failed_login_attempts + 1,
         locked_until = CASE
           WHEN failed_login_attempts + 1 >= ? THEN datetime('now', '+${lockTimeMinutes} minutes')
           ELSE locked_until
         END
         WHERE id = ?`,
        [parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS) || 5, userId]
      );

      await db.close();
      debugLog('Failed attempts incremented', { userId });

    } catch (error) {
      console.error('Error incrementing failed attempts:', error);
    }
  }

  static async updateLoginSuccess(userId) {
    debugLog('updateLoginSuccess called', { userId });

    try {
      const db = await openDb();

      await db.run(
        `UPDATE users SET
         last_login = datetime('now'),
         failed_login_attempts = 0,
         locked_until = NULL
         WHERE id = ?`,
        [userId]
      );

      await db.close();
      debugLog('Login success updated', { userId });

    } catch (error) {
      console.error('Error updating login success:', error);
    }
  }

  // ==========================================
  // GESTIONE SESSIONI REFRESH TOKEN
  // ==========================================

    static async createSession(userId, token, deviceInfo = null, ipAddress = null, userAgent = null) {
    debugLog('createSession called', { userId });

    try {
        const db = await openDb();

        // Calcola scadenza da environment
        const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES || '7d';
        const days = parseInt(refreshExpiresIn.replace('d', '')) || 7;
        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        const result = await db.run(
        `INSERT INTO user_sessions (user_id, session_token, refresh_token, device_info, ip_address, user_agent, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, token, token, deviceInfo, ipAddress, userAgent, expiresAt.toISOString()]
        );

        await db.close();

        debugLog('Session created', { userId, sessionId: result.lastID });
        return result.lastID;

    } catch (error) {
        handleError('createSession', error);
    }
    }

  static async getSessionByRefreshToken(refreshToken) {
    debugLog('getSessionByRefreshToken called');

    try {
      const db = await openDb();

      const session = await db.get(
        `SELECT s.*, u.email, u.role, u.is_active
         FROM user_sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.refresh_token = ? AND s.expires_at > datetime('now') AND s.is_active = 1`,
        [refreshToken]
      );

      // Update last_used se sessione trovata
      if (session) {
        await db.run(
          'UPDATE user_sessions SET last_used = datetime("now") WHERE id = ?',
          [session.id]
        );
      }

      await db.close();

      if (session) {
        debugLog('Session found and updated', { sessionId: session.id });
      } else {
        debugLog('Session not found or expired');
      }

      return session;

    } catch (error) {
      handleError('getSessionByRefreshToken', error);
    }
  }

  static async invalidateSession(refreshToken) {
    debugLog('invalidateSession called');

    try {
      const db = await openDb();

      const result = await db.run(
        'UPDATE user_sessions SET is_active = 0 WHERE refresh_token = ?',
        [refreshToken]
      );

      await db.close();

      debugLog('Session invalidated', { affected: result.changes });
      return result.changes > 0;

    } catch (error) {
      handleError('invalidateSession', error);
    }
  }

  static async invalidateAllUserSessions(userId) {
    debugLog('invalidateAllUserSessions called', { userId });

    try {
      const db = await openDb();

      const result = await db.run(
        'UPDATE user_sessions SET is_active = 0 WHERE user_id = ?',
        [userId]
      );

      await db.close();

      debugLog('All user sessions invalidated', { userId, affected: result.changes });
      return result.changes;

    } catch (error) {
      handleError('invalidateAllUserSessions', error);
    }
  }

  static async getUserActiveSessions(userId) {
    debugLog('getUserActiveSessions called', { userId });

    try {
      const db = await openDb();

      const sessions = await db.all(
        `SELECT id, device_info, ip_address, created_at, last_used, expires_at
         FROM user_sessions
         WHERE user_id = ? AND is_active = 1 AND expires_at > datetime('now')
         ORDER BY last_used DESC`,
        [userId]
      );

      await db.close();

      debugLog('Active sessions retrieved', { userId, count: sessions.length });
      return sessions;

    } catch (error) {
      handleError('getUserActiveSessions', error);
    }
  }

  // ==========================================
  // VERIFICA EMAIL E RESET PASSWORD
  // ==========================================

  static async verifyEmail(token) {
    debugLog('verifyEmail called');

    try {
      const user = await UsersDao.getUserByVerificationToken(token);

      if (!user) {
        throw new Error('Token di verifica non valido o scaduto');
      }

      await UsersDao.updateUser(user.id, {
        email_verified: 1,
        verification_token: null
      });

      if (CONFIG.AUDIT_ENABLED) {
        await UsersDao.logAuditEvent(user.id, 'email_verified', null, null, {
          email: user.email
        });
      }

      debugLog('Email verified successfully', { userId: user.id });
      return await UsersDao.getUserById(user.id);

    } catch (error) {
      handleError('verifyEmail', error);
    }
  }

  static async initiatePasswordReset(email) {
    debugLog('initiatePasswordReset called', { email });

    try {
      const user = await UsersDao.getUserByEmail(email);

      if (!user) {
        // Security: non rivelare se email esiste
        debugLog('Password reset requested for non-existent email', { email });
        return {
          message: 'Se l\'email esiste nel nostro sistema, riceverai le istruzioni per il reset',
          success: true
        };
      }

      const resetToken = user.generateResetToken();

      await UsersDao.updateUser(user.id, {
        reset_token: resetToken,
        reset_expires: user.resetExpires.toISOString()
      });

      if (CONFIG.AUDIT_ENABLED) {
        await UsersDao.logAuditEvent(user.id, 'password_reset_requested', null, null, {
          email: user.email
        });
      }

      debugLog('Password reset initiated', { userId: user.id });
      return {
        token: resetToken,
        user,
        message: 'Token di reset generato con successo',
        success: true
      };

    } catch (error) {
      handleError('initiatePasswordReset', error);
    }
  }

  static async resetPassword(token, newPassword) {
    debugLog('resetPassword called');

    try {
      const user = await UsersDao.getUserByResetToken(token);

      if (!user) {
        throw new Error('Token di reset non valido o scaduto');
      }

      // Valida nuova password
      User.validatePassword(newPassword);

      const passwordHash = await User.hashPassword(newPassword);

      await UsersDao.updateUser(user.id, {
        password_hash: passwordHash,
        reset_token: null,
        reset_expires: null,
        failed_login_attempts: 0,
        locked_until: null
      });

      // Invalida tutte le sessioni per sicurezza
      await UsersDao.invalidateAllUserSessions(user.id);

      if (CONFIG.AUDIT_ENABLED) {
        await UsersDao.logAuditEvent(user.id, 'password_reset_completed', null, null, {
          email: user.email,
          sessionsInvalidated: true
        });
      }

      debugLog('Password reset completed', { userId: user.id });
      return await UsersDao.getUserById(user.id);

    } catch (error) {
      handleError('resetPassword', error);
    }
  }

  // ==========================================
  // PREFERENZE UTENTE
  // ==========================================

  static async getUserPreferences(userId) {
    debugLog('getUserPreferences called', { userId });

    try {
      const db = await openDb();

      const preferences = await db.get(
        'SELECT * FROM user_preferences WHERE user_id = ?',
        [userId]
      );

      await db.close();

      if (!preferences) {
        debugLog('No preferences found for user', { userId });
        return null;
      }

      // Parse JSON fields con fallback sicuri
      const parsed = {
        ...preferences,
        favorite_game_categories: this.safeJsonParse(preferences.favorite_game_categories, []),
        dietary_restrictions: this.safeJsonParse(preferences.dietary_restrictions, []),
        preferred_drink_types: this.safeJsonParse(preferences.preferred_drink_types, []),
        preferred_time_slots: this.safeJsonParse(preferences.preferred_time_slots, []),
        notification_preferences: this.safeJsonParse(preferences.notification_preferences, {})
      };

      debugLog('Preferences retrieved', { userId });
      return parsed;

    } catch (error) {
      handleError('getUserPreferences', error);
    }
  }

  static async updateUserPreferences(userId, preferences) {
    debugLog('updateUserPreferences called', { userId });

    try {
      const db = await openDb();

      // Stringify JSON fields con validazione
      const updateData = {
        favorite_game_categories: JSON.stringify(preferences.favorite_game_categories || []),
        dietary_restrictions: JSON.stringify(preferences.dietary_restrictions || []),
        preferred_drink_types: JSON.stringify(preferences.preferred_drink_types || []),
        max_game_complexity: preferences.max_game_complexity || 3,
        preferred_player_count: preferences.preferred_player_count || '2-4',
        allergies: preferences.allergies || null,
        notes: preferences.notes || null,
        preferred_time_slots: JSON.stringify(preferences.preferred_time_slots || []),
        notification_preferences: JSON.stringify(preferences.notification_preferences || {}),
        updated_at: new Date().toISOString()
      };

      const result = await db.run(
        `UPDATE user_preferences SET
         favorite_game_categories = ?, dietary_restrictions = ?, preferred_drink_types = ?,
         max_game_complexity = ?, preferred_player_count = ?, allergies = ?, notes = ?,
         preferred_time_slots = ?, notification_preferences = ?, updated_at = ?
         WHERE user_id = ?`,
        [
          updateData.favorite_game_categories,
          updateData.dietary_restrictions,
          updateData.preferred_drink_types,
          updateData.max_game_complexity,
          updateData.preferred_player_count,
          updateData.allergies,
          updateData.notes,
          updateData.preferred_time_slots,
          updateData.notification_preferences,
          updateData.updated_at,
          userId
        ]
      );

      await db.close();

      if (result.changes === 0) {
        throw new Error('Preferenze non trovate per questo utente');
      }

      debugLog('Preferences updated', { userId });
      return await UsersDao.getUserPreferences(userId);

    } catch (error) {
      handleError('updateUserPreferences', error);
    }
  }

  // ==========================================
  // GESTIONE PRENOTAZIONI
  // ==========================================

  static async createBooking(userId, bookingData) {
    debugLog('createBooking called', { userId });

    try {
      const db = await openDb();

      // Genera codice conferma univoco
      const confirmationCode = User.generateConfirmationCode();

      const result = await db.run(
        `INSERT INTO user_bookings (
          user_id, booking_date, booking_time, duration_hours, table_number,
          party_size, game_requests, drink_orders, snack_orders, special_requests,
          status, total_price, payment_status, confirmation_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          bookingData.booking_date,
          bookingData.booking_time,
          bookingData.duration_hours || 2,
          bookingData.table_number || null,
          bookingData.party_size,
          JSON.stringify(bookingData.game_requests || []),
          JSON.stringify(bookingData.drink_orders || []),
          JSON.stringify(bookingData.snack_orders || []),
          bookingData.special_requests || null,
          'pending',
          bookingData.total_price || 0.00,
          'pending',
          confirmationCode
        ]
      );

      if (CONFIG.AUDIT_ENABLED) {
        await UsersDao.logAuditEvent(userId, 'booking_created', null, null, {
          bookingId: result.lastID,
          confirmationCode,
          bookingDate: bookingData.booking_date,
          partySize: bookingData.party_size
        });
      }

      await db.close();

      debugLog('Booking created', { userId, bookingId: result.lastID, confirmationCode });
      return { id: result.lastID, confirmation_code: confirmationCode };

    } catch (error) {
      handleError('createBooking', error);
    }
  }

static async getUsersWithFilters(filters, pagination) {
  debugLog('getUsersWithFilters called', { filters, pagination });

  try {
    const db = await openDb();

    // Costruzione query per count totale
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams = [];

    // Costruzione query principale
    let query = 'SELECT * FROM users WHERE 1=1';
    const params = [];

    // Filtro per ricerca testuale
    if (filters.search && filters.search.trim()) {
      const searchCondition = ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
      const searchTerm = `%${filters.search.trim()}%`;

      query += searchCondition;
      countQuery += searchCondition;

      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Filtro per ruolo
    if (filters.role) {
      query += ' AND role = ?';
      countQuery += ' AND role = ?';
      params.push(filters.role);
      countParams.push(filters.role);
    }

    // Filtro per status
    if (filters.status) {
      const isActive = filters.status === 'active' ? 1 : 0;
      query += ' AND is_active = ?';
      countQuery += ' AND is_active = ?';
      params.push(isActive);
      countParams.push(isActive);
    }

    // Ordinamento
    const allowedSortBy = ['created_at', 'last_login', 'email', 'role', 'first_name', 'last_name'];
    const sortBy = allowedSortBy.includes(pagination.sortBy) ? pagination.sortBy : 'created_at';
    const sortOrder = pagination.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    // Paginazione
    const limit = Math.min(parseInt(pagination.limit) || 25, 100);
    const offset = ((parseInt(pagination.page) || 1) - 1) * limit;

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [users, countResult] = await Promise.all([
      db.all(query, params),
      db.get(countQuery, countParams)
    ]);

    await db.close();

    // Calcola paginazione
    const totalItems = countResult.total;
    const totalPages = Math.ceil(totalItems / limit);
    const currentPage = parseInt(pagination.page) || 1;

    const result = {
      users: users.map(row => User.fromDatabaseRow(row)),
      currentPage,
      totalPages,
      totalItems,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    };

    debugLog('Users with filters retrieved', {
      count: result.users.length,
      total: totalItems,
      page: currentPage
    });

    return result;

  } catch (error) {
    handleError('getUsersWithFilters', error);
  }
}

static async getUserBookings(userId, options = {}) {
  debugLog('getUserBookings called', { userId, options });

  try {
    const db = await openDb();

    // Verifica se la tabella user_bookings esiste
    const tableExists = await db.get(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='user_bookings'
    `);

    if (!tableExists) {
      await db.close();
      return [];
    }

    let query = 'SELECT * FROM user_bookings WHERE user_id = ?';
    const params = [userId];

    if (options.limit) {
      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(parseInt(options.limit));
    }

    const bookings = await db.all(query, params);
    await db.close();

    return bookings;

  } catch (error) {
    console.error('Error in getUserBookings:', error);
    return [];
  }
}

static async getUserRatings(userId, options = {}) {
  debugLog('getUserRatings called', { userId, options });

  try {
    const db = await openDb();

    // Verifica se la tabella user_ratings esiste
    const tableExists = await db.get(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='user_ratings'
    `);

    if (!tableExists) {
      await db.close();
      return [];
    }

    let query = 'SELECT * FROM user_ratings WHERE user_id = ?';
    const params = [userId];

    if (options.limit) {
      query += ' ORDER BY updated_at DESC LIMIT ?';
      params.push(parseInt(options.limit));
    }

    const ratings = await db.all(query, params);
    await db.close();

    return ratings;

  } catch (error) {
    console.error('Error in getUserRatings:', error);
    return [];
  }
}

// Funzioni per gestione bookings admin (placeholder)
static async getBookingsWithFilters(filters, pagination) {
  debugLog('getBookingsWithFilters called', { filters, pagination });

  try {
    const db = await openDb();

    const tableExists = await db.get(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='user_bookings'
    `);

    if (!tableExists) {
      console.warn('[UsersDao] user_bookings table not found');
      await db.close();
      return {
        bookings: [],
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        hasNext: false,
        hasPrev: false
      };
    }

    let countQuery = `
      SELECT COUNT(*) as total
      FROM user_bookings ub
      JOIN users u ON ub.user_id = u.id
      WHERE 1=1
    `;
    const countParams = [];

    let query = `
      SELECT
        ub.*,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        (u.first_name || ' ' || u.last_name) as customer_name
      FROM user_bookings ub
      JOIN users u ON ub.user_id = u.id
      WHERE 1=1
    `;
    const params = [];


    // Filtro per status
    if (filters.status && filters.status !== 'all') {
      const statusCondition = ' AND ub.status = ?';
      query += statusCondition;
      countQuery += statusCondition;
      params.push(filters.status);
      countParams.push(filters.status);
    }

    // Filtro per data specifica
    if (filters.date) {
      const dateCondition = ' AND DATE(ub.booking_date) = ?';
      query += dateCondition;
      countQuery += dateCondition;
      params.push(filters.date);
      countParams.push(filters.date);
    }

    // Filtro per range di date
    if (filters.dateFrom) {
      const dateFromCondition = ' AND ub.booking_date >= ?';
      query += dateFromCondition;
      countQuery += dateFromCondition;
      params.push(filters.dateFrom);
      countParams.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      const dateToCondition = ' AND ub.booking_date <= ?';
      query += dateToCondition;
      countQuery += dateToCondition;
      params.push(filters.dateTo);
      countParams.push(filters.dateTo);
    }

    // Filtro per utente specifico
    if (filters.userId) {
      const userCondition = ' AND ub.user_id = ?';
      query += userCondition;
      countQuery += userCondition;
      params.push(filters.userId);
      countParams.push(filters.userId);
    }

    // Filtro di ricerca testuale
    if (filters.search) {
      const searchCondition = ` AND (
        u.first_name LIKE ? OR
        u.last_name LIKE ? OR
        u.email LIKE ? OR
        ub.special_requests LIKE ?
      )`;
      const searchTerm = `%${filters.search}%`;

      query += searchCondition;
      countQuery += searchCondition;

      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    console.log('[UsersDao] Executing count query:', countQuery);
    console.log('[UsersDao] Count params:', countParams);

    const countResult = await db.get(countQuery, countParams);
    const totalItems = countResult.total;

    console.log(`[UsersDao] Total bookings found: ${totalItems}`);

    const allowedSortBy = ['booking_date', 'booking_time', 'created_at', 'status', 'customer_name'];
    const sortBy = allowedSortBy.includes(pagination.sortBy) ? pagination.sortBy : 'ub.booking_date';
    const sortOrder = pagination.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sortBy} ${sortOrder}, ub.booking_time ${sortOrder}`;

    const limit = Math.min(Math.max(parseInt(pagination.limit) || 25, 1), 1000); // Max 1000 per sicurezza
    const currentPage = Math.max(parseInt(pagination.page) || 1, 1);
    const offset = (currentPage - 1) * limit;

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    console.log('[UsersDao] Executing main query:', query);
    console.log('[UsersDao] Main params:', params);

    const bookings = await db.all(query, params);

    await db.close();

    const totalPages = Math.ceil(totalItems / limit);

    const result = {
      bookings: bookings || [],
      currentPage,
      totalPages,
      totalItems,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
      debug: {
        filters,
        pagination,
        queryExecuted: true,
        foundResults: bookings?.length || 0
      }
    };

    console.log('[UsersDao] getBookingsWithFilters result:', {
      totalItems: result.totalItems,
      currentPage: result.currentPage,
      totalPages: result.totalPages,
      returnedItems: result.bookings.length
    });

    return result;

  } catch (error) {
    console.error('[UsersDao] Error in getBookingsWithFilters:', error);

    throw new Error(`Errore caricamento prenotazioni: ${error.message}`);
  }
}

static async updateBookingStatus(bookingId, status, updateData = {}) {
  debugLog('updateBookingStatus called', { bookingId, status });

  try {
    const db = await openDb();

    const tableExists = await db.get(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='user_bookings'
    `);

    if (!tableExists) {
      await db.close();
      throw new Error('Tabella prenotazioni non trovata');
    }

    const result = await db.run(
      'UPDATE user_bookings SET status = ?, updated_at = datetime("now") WHERE id = ?',
      [status, bookingId]
    );

    if (result.changes === 0) {
      await db.close();
      throw new Error('Prenotazione non trovata o già aggiornata');
    }

    if (Object.keys(updateData).length > 0) {
      const updateFields = [];
      const updateValues = [];

      // Campi sicuri da aggiornare
      const allowedFields = ['table_number', 'special_requests', 'staff_notes', 'total_price'];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      }

      if (updateFields.length > 0) {
        updateValues.push(bookingId);
        await db.run(
          `UPDATE user_bookings SET ${updateFields.join(', ')}, updated_at = datetime("now") WHERE id = ?`,
          updateValues
        );
      }
    }

    // Recupera prenotazione aggiornata con dati utente
    const updatedBooking = await db.get(
      `SELECT ub.*, u.email, u.first_name, u.last_name, u.phone,
              (u.first_name || ' ' || u.last_name) as customer_name
       FROM user_bookings ub
       JOIN users u ON ub.user_id = u.id
       WHERE ub.id = ?`,
      [bookingId]
    );

    await db.close();

    // Log audit se abilitato
    if (CONFIG.AUDIT_ENABLED && updatedBooking) {
      await UsersDao.logAuditEvent(updatedBooking.user_id, 'booking_status_updated', null, null, {
        bookingId,
        oldStatus: status,
        newStatus: status,
        updatedBy: 'staff',
        additionalData: updateData
      });
    }

    debugLog('Booking status updated successfully', {
      bookingId,
      status,
      customerName: updatedBooking?.customer_name
    });

    return updatedBooking;

  } catch (error) {
    debugLog('Error updating booking status', {
      error: error.message,
      bookingId,
      status
    });
    throw error;
  }
}

// Funzione per soft delete
static async softDeleteUser(userId) {
  debugLog('softDeleteUser called', { userId });

  try {
    const user = await UsersDao.getUserById(userId);
    if (!user) {
      throw new Error('Utente non trovato');
    }

    const db = await openDb();

    // Soft delete - disattiva e anonimizza
    const anonymizedEmail = `deleted_${Date.now()}_${userId}@deleted.local`;
    await db.run(
      `UPDATE users SET
       is_active = 0,
       email = ?,
       first_name = 'Utente',
       last_name = 'Eliminato',
       phone = NULL
       WHERE id = ?`,
      [anonymizedEmail, userId]
    );

    await db.close();

    debugLog('User soft deleted', { userId });
    return true;

  } catch (error) {
    handleError('softDeleteUser', error);
  }
}

  static async getBookingByConfirmationCode(confirmationCode) {
    debugLog('getBookingByConfirmationCode called', { confirmationCode });

    try {
      const db = await openDb();

      const booking = await db.get(
        `SELECT b.*, u.email, u.first_name, u.last_name, u.phone
         FROM user_bookings b
         JOIN users u ON b.user_id = u.id
         WHERE b.confirmation_code = ?`,
        [confirmationCode]
      );

      await db.close();

      if (!booking) {
        debugLog('Booking not found', { confirmationCode });
        return null;
      }

      // Parse JSON fields
      const parsedBooking = {
        ...booking,
        game_requests: this.safeJsonParse(booking.game_requests, []),
        drink_orders: this.safeJsonParse(booking.drink_orders, []),
        snack_orders: this.safeJsonParse(booking.snack_orders, [])
      };

      debugLog('Booking found', { confirmationCode, bookingId: booking.id });
      return parsedBooking;

    } catch (error) {
      handleError('getBookingByConfirmationCode', error);
    }
  }

  // ==========================================
  // WISHLIST E RATINGS
  // ==========================================

  static async addToWishlist(userId, itemType, itemId, notes = null, priority = 1) {
    debugLog('addToWishlist called', { userId, itemType, itemId });

    try {
      const db = await openDb();

      await db.run(
        `INSERT OR REPLACE INTO user_wishlist (user_id, item_type, item_id, notes, priority)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, itemType, itemId, notes, priority]
      );

      await db.close();

      debugLog('Item added to wishlist', { userId, itemType, itemId });
      return true;

    } catch (error) {
      handleError('addToWishlist', error);
    }
  }

  static async getUserWishlist(userId) {
    debugLog('getUserWishlist called', { userId });

    try {
      const db = await openDb();

      const wishlist = await db.all(
        'SELECT * FROM user_wishlist WHERE user_id = ? ORDER BY priority DESC, added_at DESC',
        [userId]
      );

      await db.close();

      debugLog('Wishlist retrieved', { userId, count: wishlist.length });
      return wishlist;

    } catch (error) {
      handleError('getUserWishlist', error);
    }
  }

  static async addRating(userId, itemType, itemId, rating, review = null) {
    debugLog('addRating called', { userId, itemType, itemId, rating });

    try {
      const db = await openDb();

      await db.run(
        `INSERT OR REPLACE INTO user_ratings (user_id, item_type, item_id, rating, review, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [userId, itemType, itemId, rating, review]
      );

      await db.close();

      debugLog('Rating added', { userId, itemType, itemId, rating });
      return true;

    } catch (error) {
      handleError('addRating', error);
    }
  }

// Rimuovi elemento da wishlist
static async removeFromWishlist(userId, wishlistItemId) {
  try {
    const db = await openDb();
    const result = await db.run(
      `DELETE FROM user_wishlist
       WHERE user_id = ? AND id = ?`,
      [userId, wishlistItemId]
    );

    return result.changes > 0;
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    throw new Error('Errore rimozione da wishlist');
  }
}

  static async logAuditEvent(userId, action, ipAddress = null, userAgent = null, details = {}) {
    if (!CONFIG.AUDIT_ENABLED) return;

    try {
      const db = await openDb();

      await db.run(
        `INSERT INTO user_audit_log (user_id, action, ip_address, user_agent, details)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, action, ipAddress, userAgent, JSON.stringify(details)]
      );

      await db.close();

    } catch (error) {
      // Log audit errors but don't throw - non-critical
      console.error('Error logging audit event:', error);
    }
  }

  static async getUserAuditLog(userId, limit = 50) {
    debugLog('getUserAuditLog called', { userId, limit });

    try {
      const db = await openDb();

      const logs = await db.all(
        `SELECT * FROM user_audit_log
         WHERE user_id = ?
         ORDER BY timestamp DESC
         LIMIT ?`,
        [userId, limit]
      );

      await db.close();

      const parsedLogs = logs.map(log => ({
        ...log,
        details: this.safeJsonParse(log.details, {})
      }));

      debugLog('Audit log retrieved', { userId, count: parsedLogs.length });
      return parsedLogs;

    } catch (error) {
      handleError('getUserAuditLog', error);
    }
  }

  static async getSystemAuditLog(limit = 100, offset = 0) {
    debugLog('getSystemAuditLog called', { limit, offset });

    try {
      const db = await openDb();

      const logs = await db.all(
        `SELECT al.*, u.email, u.role
         FROM user_audit_log al
         LEFT JOIN users u ON al.user_id = u.id
         ORDER BY al.timestamp DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      await db.close();

      const parsedLogs = logs.map(log => ({
        ...log,
        details: this.safeJsonParse(log.details, {})
      }));

      debugLog('System audit log retrieved', { count: parsedLogs.length });
      return parsedLogs;

    } catch (error) {
      handleError('getSystemAuditLog', error);
    }
  }

  // ==========================================
  // STATISTICHE E ANALYTICS
  // ==========================================

  static async getUserStats() {
    debugLog('getUserStats called');

    try {
      const db = await openDb();

      const stats = await db.get(`
        SELECT
          COUNT(*) as total_users,
          COUNT(CASE WHEN role = 'customer' THEN 1 END) as customers,
          COUNT(CASE WHEN role = 'staff' THEN 1 END) as staff,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users,
          COUNT(CASE WHEN email_verified = 1 THEN 1 END) as verified_users,
          COUNT(CASE WHEN last_login > datetime('now', '-30 days') THEN 1 END) as active_last_30_days,
          COUNT(CASE WHEN created_at > datetime('now', '-7 days') THEN 1 END) as new_last_7_days
        FROM users
      `);

      const bookingStats = await db.get(`
        SELECT
          COUNT(*) as total_bookings,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings,
          COUNT(CASE WHEN booking_date >= date('now') THEN 1 END) as future_bookings
        FROM user_bookings
      `);

      await db.close();

      const combinedStats = { ...stats, ...bookingStats };
      debugLog('User stats retrieved', combinedStats);

      return combinedStats;

    } catch (error) {
      handleError('getUserStats', error);
    }
  }

  static async getBookingStats(fromDate = null, toDate = null) {
    debugLog('getBookingStats called', { fromDate, toDate });

    try {
      const db = await openDb();

      let query = `
        SELECT
          booking_date,
          COUNT(*) as total_bookings,
          SUM(party_size) as total_guests,
          AVG(party_size) as avg_party_size,
          SUM(total_price) as total_revenue,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
        FROM user_bookings
        WHERE 1=1
      `;

      const params = [];

      if (fromDate) {
        query += ' AND booking_date >= ?';
        params.push(fromDate);
      }

      if (toDate) {
        query += ' AND booking_date <= ?';
        params.push(toDate);
      }

      query += ' GROUP BY booking_date ORDER BY booking_date DESC';

      const stats = await db.all(query, params);
      await db.close();

      debugLog('Booking stats retrieved', { count: stats.length });
      return stats;

    } catch (error) {
      handleError('getBookingStats', error);
    }
  }

  // ==========================================
  // FUNZIONI AGGIUNTIVE PER ADMIN DASHBOARD
  // ==========================================

static async getTotalUsersCount() {
  try {
    console.log('[UsersDao] getTotalUsersCount called');
    const db = await openDb();
    const result = await db.get('SELECT COUNT(*) as count FROM users');
    await db.close();
    console.log('[UsersDao] Total users count retrieved', { count: result.count });
    return result.count;
  } catch (error) {
    console.error('[UsersDao] Error in getTotalUsersCount:', error);
    throw error;
  }
}

  static async getActiveUsersCount(days = 30) {
  try {
    console.log('[UsersDao] getActiveUsersCount called', { days });
    const db = await openDb();

    const result = await db.get(`
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at >= datetime('now', '-' || ? || ' days')
    `, [days]);

    await db.close();
    console.log('[UsersDao] Active users count retrieved', { count: result.count });
    return result.count;
  } catch (error) {
    console.error('[UsersDao] Error in getActiveUsersCount:', error);
    return await this.getTotalUsersCount();
  }
}

  static async getTotalBookingsCount() {
  try {
    console.log('[UsersDao] getTotalBookingsCount called');
    const db = await openDb();

    // Verifica se la tabella bookings esiste
    const tableExists = await db.get(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='bookings'
    `);

    if (!tableExists) {
      console.log('[UsersDao] Bookings table not found, returning 0');
      await db.close();
      return 0;
    }

    const result = await db.get('SELECT COUNT(*) as count FROM bookings');
    await db.close();
    console.log('[UsersDao] Total bookings count retrieved', { count: result.count });
    return result.count;
  } catch (error) {
    console.error('[UsersDao] Error in getTotalBookingsCount:', error);
    await db.close();
    return 0;
  }
}

  static async getTodayBookingsCount() {
  try {
    console.log('[UsersDao] getTodayBookingsCount called');
    const db = await openDb();

    // Verifica se la tabella bookings esiste
    const tableExists = await db.get(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='bookings'
    `);

    if (!tableExists) {
      console.log('[UsersDao] Bookings table not found, returning 0');
      await db.close();
      return 0;
    }

    const result = await db.get(`
      SELECT COUNT(*) as count FROM bookings
      WHERE DATE(created_at) = DATE('now')
    `);

    await db.close();
    console.log('[UsersDao] Today bookings count retrieved', { count: result.count });
    return result.count;
  } catch (error) {
    console.error('[UsersDao] Error in getTodayBookingsCount:', error);
    await db.close();
    return 0;
  }
}

  static async getUserStatsByRole() {
    debugLog('getUserStatsByRole called');

    try {
      const db = await openDb();
      const result = await db.all(`
        SELECT
          role,
          COUNT(*) as count,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_count
        FROM users
        GROUP BY role
      `);
      await db.close();

      debugLog('User stats by role retrieved', { stats: result });
      return result;
    } catch (error) {
      handleError('getUserStatsByRole', error);
    }
  }

  static async getNewUsersCount(days = 30) {
  try {
    const db = await openDb();
    const result = await db.get(`
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at >= datetime('now', '-' || ? || ' days')
    `, [days]);
    await db.close();
    return result.count;
  } catch (error) {
    console.error('Error in getNewUsersCount:', error);
    return 0;
  }
}

static async getVerificationStats() {
  try {
    const db = await openDb();
    const result = await db.get(`
      SELECT
        COUNT(CASE WHEN email_verified = 1 THEN 1 END) as verified,
        COUNT(CASE WHEN email_verified = 0 THEN 1 END) as unverified
      FROM users
    `);
    await db.close();
    return result;
  } catch (error) {
    console.error('Error in getVerificationStats:', error);
    return { verified: 0, unverified: 0 };
  }
}

static async getLoginStats(days = 30) {
  try {
    const db = await openDb();
    const result = await db.get(`
      SELECT COUNT(*) as logins
      FROM users
      WHERE last_login >= datetime('now', '-' || ? || ' days')
    `, [days]);
    await db.close();
    return result;
  } catch (error) {
    console.error('Error in getLoginStats:', error);
    return { logins: 0 };
  }
}

static async getBookingTrends(days = 7) {
  try {
    console.log('[UsersDao] getBookingTrends called', { days });
    const db = await openDb();

    // Verifica se la tabella bookings esiste
    const tableExists = await db.get(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='bookings'
    `);

    if (!tableExists) {
      console.log('[UsersDao] Bookings table not found, returning empty trends');
      await db.close();
      // Restituisce dati fake per la dashboard
      const trends = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        trends.push({
          date: date.toISOString().split('T')[0],
          bookings: 0
        });
      }
      return trends;
    }

    // Se la tabella esiste, esegui la query
    const result = await db.all(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as bookings
      FROM bookings
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [days]);

    await db.close();
    console.log('[UsersDao] Booking trends retrieved', { trends: result });
    return result;

  } catch (error) {
    console.error('[UsersDao] Error in getBookingTrends:', error);
    const trends = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      trends.push({
        date: date.toISOString().split('T')[0],
        bookings: 0
      });
    }
    return trends;
  }
}

  // ==========================================
  // CLEANUP E MANUTENZIONE
  // ==========================================

  static async cleanupExpiredTokens() {
    if (!CONFIG.CLEANUP_ENABLED) return;

    debugLog('cleanupExpiredTokens called');

    try {
      const db = await openDb();

      const verificationCleanup = await db.run(
        `UPDATE users SET verification_token = NULL
         WHERE verification_token IS NOT NULL
         AND created_at < datetime('now', '-24 hours')`
      );

      const resetCleanup = await db.run(
        `UPDATE users SET reset_token = NULL, reset_expires = NULL
         WHERE reset_expires < datetime('now')`
      );

      const sessionCleanup = await db.run(
        'DELETE FROM user_sessions WHERE expires_at < datetime("now")'
      );

      const auditCleanup = await db.run(
        'DELETE FROM user_audit_log WHERE timestamp < datetime("now", "-? days")',
        [CONFIG.AUDIT_RETENTION_DAYS]
      );

      await db.close();

      debugLog('Cleanup completed', {
        verificationTokens: verificationCleanup.changes,
        resetTokens: resetCleanup.changes,
        expiredSessions: sessionCleanup.changes,
        oldAuditLogs: auditCleanup.changes
      });

      return {
        verificationTokens: verificationCleanup.changes,
        resetTokens: resetCleanup.changes,
        expiredSessions: sessionCleanup.changes,
        oldAuditLogs: auditCleanup.changes
      };

    } catch (error) {
      console.error('Error during cleanup:', error);
      return null;
    }
  }

  static async unlockExpiredAccounts() {
    debugLog('unlockExpiredAccounts called');

    try {
      const db = await openDb();

      const result = await db.run(
        'UPDATE users SET locked_until = NULL WHERE locked_until < datetime("now")'
      );

      await db.close();

      debugLog('Expired accounts unlocked', { count: result.changes });
      return result.changes;

    } catch (error) {
      console.error('Error unlocking expired accounts:', error);
      return 0;
    }
  }

  // ==========================================
  // UTILITY HELPERS
  // ==========================================

  static safeJsonParse(jsonString, fallback = null) {
    try {
      return jsonString ? JSON.parse(jsonString) : fallback;
    } catch (error) {
      console.warn('JSON parse error:', error.message, 'Value:', jsonString);
      return fallback;
    }
  }

  static async validateUserExists(userId) {
    const user = await UsersDao.getUserById(userId);
    if (!user) {
      throw new Error(`Utente con ID ${userId} non trovato`);
    }
    return user;
  }

  // ==========================================
  // SCHEDULED TASKS (per cron job)
  // ==========================================

  static async performMaintenanceTasks() {
    debugLog('performMaintenanceTasks called');

    try {
      const results = {
        cleanup: await UsersDao.cleanupExpiredTokens(),
        unlocked: await UsersDao.unlockExpiredAccounts(),
        timestamp: new Date().toISOString()
      };

      debugLog('Maintenance tasks completed', results);
      return results;

    } catch (error) {
      console.error('Error during maintenance tasks:', error);
      return null;
    }
  }


}
module.exports = UsersDao;
