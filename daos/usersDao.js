// daos/usersDao.js
// SCOPO: Data Access Object per operazioni database degli utenti
// RELAZIONI: Usa User model, fornisce dati a routes, gestisce sessioni e audit

const openDb = require('../db');
const { User } = require('../models/User');

// ==========================================
// CRUD OPERATIONS - USERS
// ==========================================

class UsersDao {

  // ==========================================
  // CREATE - REGISTRAZIONE E NUOVO UTENTE
  // ==========================================

  static async createUser(userData) {
    try {
      // Validazione dati
      User.validateUserData(userData);

      const db = await openDb();

      // Verifica email univoca
      const existingUser = await db.get(
        'SELECT id FROM users WHERE email = ?',
        [User.sanitizeEmail(userData.email)]
      );

      if (existingUser) {
        throw new Error('Email già registrata');
      }

      // Hash password se fornita
      let passwordHash = null;
      if (userData.password) {
        passwordHash = await User.hashPassword(userData.password);
      }

      // Crea nuovo utente
      const user = new User({
        ...userData,
        email: User.sanitizeEmail(userData.email),
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
          user.isActive,
          user.emailVerified,
          user.verificationToken
        ]
      );

      user.id = result.lastID;

      // Crea preferenze di default
      await UsersDao.createDefaultPreferences(user.id);

      // Log audit
      await UsersDao.logAuditEvent(user.id, 'user_created', null, null, {
        role: user.role,
        email: user.email
      });

      await db.close();
      return user;

    } catch (error) {
      throw new Error(`Errore creazione utente: ${error.message}`);
    }
  }

  static async createDefaultPreferences(userId) {
    try {
      const db = await openDb();

      await db.run(
        `INSERT INTO user_preferences (
          user_id, favorite_game_categories, preferred_drink_types,
          max_game_complexity, notification_preferences
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          userId,
          JSON.stringify(['Famiglia', 'Party']), // Default categorie
          JSON.stringify(['analcolici']),         // Default drink
          3,                                      // Complessità media
          JSON.stringify({                        // Notifiche default
            email: true,
            sms: false,
            push: true
          })
        ]
      );

      await db.close();
    } catch (error) {
      console.error('Errore creazione preferenze default:', error);
    }
  }

  // ==========================================
  // READ - RECUPERO UTENTI
  // ==========================================

  static async getUserById(id) {
    try {
      const db = await openDb();

      const row = await db.get(
        'SELECT * FROM users WHERE id = ? AND is_active = 1',
        [id]
      );

      await db.close();

      if (!row) {
        return null;
      }

      return User.fromDatabaseRow(row);
    } catch (error) {
      throw new Error(`Errore recupero utente: ${error.message}`);
    }
  }

  static async getUserByEmail(email) {
    try {
      const db = await openDb();

      const row = await db.get(
        'SELECT * FROM users WHERE email = ?',
        [User.sanitizeEmail(email)]
      );

      await db.close();

      if (!row) {
        return null;
      }

      return User.fromDatabaseRow(row);
    } catch (error) {
      throw new Error(`Errore recupero utente per email: ${error.message}`);
    }
  }

  static async getUserByVerificationToken(token) {
    try {
      const db = await openDb();

      const row = await db.get(
        'SELECT * FROM users WHERE verification_token = ?',
        [token]
      );

      await db.close();
      return row ? User.fromDatabaseRow(row) : null;
    } catch (error) {
      throw new Error(`Errore recupero per token verifica: ${error.message}`);
    }
  }

  static async getUserByResetToken(token) {
    try {
      const db = await openDb();

      const row = await db.get(
        'SELECT * FROM users WHERE reset_token = ? AND reset_expires > datetime("now")',
        [token]
      );

      await db.close();
      return row ? User.fromDatabaseRow(row) : null;
    } catch (error) {
      throw new Error(`Errore recupero per token reset: ${error.message}`);
    }
  }

  static async getAllUsers(options = {}) {
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
      const orderBy = options.orderBy || 'created_at DESC';
      query += ` ORDER BY ${orderBy}`;

      // Paginazione
      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);

        if (options.offset) {
          query += ' OFFSET ?';
          params.push(options.offset);
        }
      }

      const rows = await db.all(query, params);
      await db.close();

      return rows.map(row => User.fromDatabaseRow(row));
    } catch (error) {
      throw new Error(`Errore recupero lista utenti: ${error.message}`);
    }
  }

  // ==========================================
  // UPDATE - AGGIORNAMENTO UTENTI
  // ==========================================

  static async updateUser(id, updateData) {
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
            throw new Error('Email già in uso');
          }
          updateData.email_verified = 0; // Reset verifica se email cambiata
        }
      }

      if (updateData.role) {
        User.validateRole(updateData.role);
      }

      // Hash nuova password se fornita
      if (updateData.password) {
        updateData.password_hash = await User.hashPassword(updateData.password);
        delete updateData.password;
      }

      const db = await openDb();

      // Costruzione query dinamica per update
      const updateFields = [];
      const updateValues = [];

      // Campi aggiornabili
      const allowedFields = [
        'email', 'password_hash', 'role', 'first_name', 'last_name',
        'phone', 'date_of_birth', 'is_active', 'email_verified',
        'verification_token', 'reset_token', 'reset_expires',
        'failed_login_attempts', 'locked_until', 'profile_image', 'last_login'
      ];

      for (const field of allowedFields) {
        if (updateData.hasOwnProperty(field)) {
          updateFields.push(`${field} = ?`);
          updateValues.push(updateData[field]);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('Nessun campo da aggiornare');
      }

      updateValues.push(id);

      const result = await db.run(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Log audit per cambiamenti significativi
      const significantChanges = ['email', 'role', 'password_hash', 'is_active'];
      const changedFields = Object.keys(updateData).filter(field =>
        significantChanges.includes(field.replace('_hash', ''))
      );

      if (changedFields.length > 0) {
        await UsersDao.logAuditEvent(id, 'user_updated', null, null, {
          updatedFields: changedFields,
          newRole: updateData.role
        });
      }

      await db.close();

      if (result.changes === 0) {
        throw new Error('Utente non trovato o nessuna modifica');
      }

      return await UsersDao.getUserById(id);
    } catch (error) {
      throw new Error(`Errore aggiornamento utente: ${error.message}`);
    }
  }

  // ==========================================
  // DELETE - CANCELLAZIONE (SOFT DELETE)
  // ==========================================

  static async deleteUser(id, hardDelete = false) {
    try {
      const user = await UsersDao.getUserById(id);
      if (!user) {
        throw new Error('Utente non trovato');
      }

      const db = await openDb();

      if (hardDelete) {
        // Hard delete - rimuove completamente
        await db.run('DELETE FROM users WHERE id = ?', [id]);
        await UsersDao.logAuditEvent(null, 'user_hard_deleted', null, null, {
          deletedUserId: id,
          deletedEmail: user.email
        });
      } else {
        // Soft delete - disattiva account
        await db.run(
          'UPDATE users SET is_active = 0, email = ? WHERE id = ?',
          [`deleted_${Date.now()}_${user.email}`, id]
        );
        await UsersDao.logAuditEvent(id, 'user_soft_deleted', null, null, {});
      }

      await db.close();
      return true;
    } catch (error) {
      throw new Error(`Errore cancellazione utente: ${error.message}`);
    }
  }

  // ==========================================
  // AUTENTICAZIONE E SESSIONI
  // ==========================================

  static async authenticateUser(email, password, ipAddress, userAgent) {
    try {
      const user = await UsersDao.getUserByEmail(email);

      if (!user) {
        // Evita timing attacks
        await User.hashPassword('dummy_password');
        throw new Error('Credenziali non valide');
      }

      // Verifica se account può fare login
      user.canLogin();

      // Verifica password
      const isValidPassword = await user.verifyPassword(password);

      if (!isValidPassword) {
        // Incrementa tentativi falliti
        await UsersDao.incrementFailedAttempts(user.id);
        await UsersDao.logAuditEvent(user.id, 'login_failed', ipAddress, userAgent, {
          reason: 'invalid_password'
        });
        throw new Error('Credenziali non valide');
      }

      // Login riuscito - reset failed attempts e update last login
      await UsersDao.updateLoginSuccess(user.id);
      await UsersDao.logAuditEvent(user.id, 'login_success', ipAddress, userAgent, {});

      return user;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async incrementFailedAttempts(userId) {
    try {
      const db = await openDb();

      await db.run(
        `UPDATE users SET
         failed_login_attempts = failed_login_attempts + 1,
         locked_until = CASE
           WHEN failed_login_attempts + 1 >= 5 THEN datetime('now', '+15 minutes')
           ELSE locked_until
         END
         WHERE id = ?`,
        [userId]
      );

      await db.close();
    } catch (error) {
      console.error('Errore incremento tentativi falliti:', error);
    }
  }

  static async updateLoginSuccess(userId) {
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
    } catch (error) {
      console.error('Errore aggiornamento login success:', error);
    }
  }

  // ==========================================
  // GESTIONE SESSIONI REFRESH TOKEN
  // ==========================================

  static async createSession(userId, refreshToken, deviceInfo) {
    try {
      const db = await openDb();

      // Calcola scadenza (7 giorni)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const result = await db.run(
        `INSERT INTO user_sessions (user_id, refresh_token, expires_at, device_info)
         VALUES (?, ?, ?, ?)`,
        [userId, refreshToken, expiresAt.toISOString(), deviceInfo]
      );

      await db.close();
      return result.lastID;
    } catch (error) {
      throw new Error(`Errore creazione sessione: ${error.message}`);
    }
  }

  static async getSessionByRefreshToken(refreshToken) {
    try {
      const db = await openDb();

      const session = await db.get(
        `SELECT * FROM user_sessions
         WHERE refresh_token = ? AND expires_at > datetime('now') AND is_active = 1`,
        [refreshToken]
      );

      await db.close();
      return session;
    } catch (error) {
      throw new Error(`Errore recupero sessione: ${error.message}`);
    }
  }

  static async invalidateSession(refreshToken) {
    try {
      const db = await openDb();

      await db.run(
        'UPDATE user_sessions SET is_active = 0 WHERE refresh_token = ?',
        [refreshToken]
      );

      await db.close();
    } catch (error) {
      throw new Error(`Errore invalidazione sessione: ${error.message}`);
    }
  }

  static async invalidateAllUserSessions(userId) {
    try {
      const db = await openDb();

      await db.run(
        'UPDATE user_sessions SET is_active = 0 WHERE user_id = ?',
        [userId]
      );

      await db.close();
    } catch (error) {
      throw new Error(`Errore invalidazione sessioni utente: ${error.message}`);
    }
  }

  // ==========================================
  // VERIFICA EMAIL E RESET PASSWORD
  // ==========================================

  static async verifyEmail(token) {
    try {
      const user = await UsersDao.getUserByVerificationToken(token);

      if (!user) {
        throw new Error('Token di verifica non valido o scaduto');
      }

      await UsersDao.updateUser(user.id, {
        email_verified: 1,
        verification_token: null
      });

      await UsersDao.logAuditEvent(user.id, 'email_verified', null, null, {});

      return user;
    } catch (error) {
      throw new Error(`Errore verifica email: ${error.message}`);
    }
  }

  static async initiatePasswordReset(email) {
    try {
      const user = await UsersDao.getUserByEmail(email);

      if (!user) {
        // Security: non rivelare se email esiste
        return { message: 'Se l\'email esiste, riceverai le istruzioni per il reset' };
      }

      const resetToken = user.generateResetToken();

      await UsersDao.updateUser(user.id, {
        reset_token: resetToken,
        reset_expires: user.resetExpires
      });

      await UsersDao.logAuditEvent(user.id, 'password_reset_requested', null, null, {});

      return { token: resetToken, user };
    } catch (error) {
      throw new Error(`Errore richiesta reset password: ${error.message}`);
    }
  }

  static async resetPassword(token, newPassword) {
    try {
      const user = await UsersDao.getUserByResetToken(token);

      if (!user) {
        throw new Error('Token di reset non valido o scaduto');
      }

      await user.updatePassword(newPassword);

      await UsersDao.updateUser(user.id, {
        password_hash: user.passwordHash,
        reset_token: null,
        reset_expires: null,
        failed_login_attempts: 0,
        locked_until: null
      });

      // Invalida tutte le sessioni per sicurezza
      await UsersDao.invalidateAllUserSessions(user.id);

      await UsersDao.logAuditEvent(user.id, 'password_reset_completed', null, null, {});

      return user;
    } catch (error) {
      throw new Error(`Errore reset password: ${error.message}`);
    }
  }

  // ==========================================
  // PREFERENZE UTENTE
  // ==========================================

  static async getUserPreferences(userId) {
    try {
      const db = await openDb();

      const preferences = await db.get(
        'SELECT * FROM user_preferences WHERE user_id = ?',
        [userId]
      );

      await db.close();

      if (!preferences) {
        return null;
      }

      // Parse JSON fields
      return {
        ...preferences,
        favorite_game_categories: JSON.parse(preferences.favorite_game_categories || '[]'),
        dietary_restrictions: JSON.parse(preferences.dietary_restrictions || '[]'),
        preferred_drink_types: JSON.parse(preferences.preferred_drink_types || '[]'),
        preferred_time_slots: JSON.parse(preferences.preferred_time_slots || '[]'),
        notification_preferences: JSON.parse(preferences.notification_preferences || '{}')
      };
    } catch (error) {
      throw new Error(`Errore recupero preferenze: ${error.message}`);
    }
  }

  static async updateUserPreferences(userId, preferences) {
    try {
      const db = await openDb();

      // Stringify JSON fields
      const updateData = {
        ...preferences,
        favorite_game_categories: JSON.stringify(preferences.favorite_game_categories || []),
        dietary_restrictions: JSON.stringify(preferences.dietary_restrictions || []),
        preferred_drink_types: JSON.stringify(preferences.preferred_drink_types || []),
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
        throw new Error('Preferenze non trovate');
      }

      return await UsersDao.getUserPreferences(userId);
    } catch (error) {
      throw new Error(`Errore aggiornamento preferenze: ${error.message}`);
    }
  }

  // ==========================================
  // AUDIT LOG
  // ==========================================

  static async logAuditEvent(userId, action, ipAddress, userAgent, details) {
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
      console.error('Errore logging audit:', error);
    }
  }

  static async getUserAuditLog(userId, limit = 50) {
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

      return logs.map(log => ({
        ...log,
        details: JSON.parse(log.details || '{}')
      }));
    } catch (error) {
      throw new Error(`Errore recupero audit log: ${error.message}`);
    }
  }

  // ==========================================
  // STATISTICHE E ANALYTICS
  // ==========================================

  static async getUserStats() {
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
          COUNT(CASE WHEN last_login > datetime('now', '-30 days') THEN 1 END) as active_last_30_days
        FROM users
      `);

      await db.close();
      return stats;
    } catch (error) {
      throw new Error(`Errore recupero statistiche utenti: ${error.message}`);
    }
  }

  // ==========================================
  // CLEANUP E MANUTENZIONE
  // ==========================================

  static async cleanupExpiredTokens() {
    try {
      const db = await openDb();

      // Cleanup expired verification tokens (older than 24h)
      await db.run(
        `UPDATE users SET verification_token = NULL
         WHERE verification_token IS NOT NULL
         AND created_at < datetime('now', '-24 hours')`
      );

      // Cleanup expired reset tokens
      await db.run(
        `UPDATE users SET reset_token = NULL, reset_expires = NULL
         WHERE reset_expires < datetime('now')`
      );

      // Cleanup expired sessions
      await db.run(
        'DELETE FROM user_sessions WHERE expires_at < datetime("now")'
      );

      // Cleanup old audit logs (keep last 90 days)
      await db.run(
        'DELETE FROM user_audit_log WHERE timestamp < datetime("now", "-90 days")'
      );

      await db.close();
    } catch (error) {
      console.error('Errore cleanup tokens scaduti:', error);
    }
  }
}

module.exports = UsersDao;
