// models/User.js
// SCOPO: Modello User con validazioni, sicurezza e metodi di business logic
// RELAZIONI: Usato da DAO e routes per gestione completa utenti

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ==========================================
// CONFIGURAZIONE SICUREZZA
// ==========================================

const SECURITY_CONFIG = {
  // Bcrypt rounds (più alto = più sicuro ma più lento)
  BCRYPT_ROUNDS: 12,

  // JWT Token expiration
  ACCESS_TOKEN_EXPIRES: '15m',    // 15 minuti per API calls
  REFRESH_TOKEN_EXPIRES: '7d',    // 7 giorni per refresh
  VERIFICATION_TOKEN_EXPIRES: '24h', // 24 ore per email verify
  RESET_TOKEN_EXPIRES: '1h',      // 1 ora per password reset

  // Rate limiting
  MAX_FAILED_ATTEMPTS: 5,         // Tentativi login falliti
  LOCK_TIME: 15 * 60 * 1000,      // 15 minuti lock (in ms)

  // Password requirements
  MIN_PASSWORD_LENGTH: 8,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
};

// ==========================================
// SISTEMA PERMESSI PER RUOLI
// ==========================================

const ROLE_PERMISSIONS = {
  customer: [
    'read:games',
    'read:drinks',
    'read:snacks',
    'read:events_public',
    'create:booking',
    'read:own_bookings',
    'update:own_booking',
    'cancel:own_booking',
    'read:own_profile',
    'update:own_profile',
    'create:wishlist',
    'rate:games'
  ],

  staff: [
    // Eredita tutti i permessi customer
    ...this?.customer || [],
    'read:all_bookings',
    'update:booking_status',
    'read:user_list',
    'create:events',
    'update:events',
    'read:event_details',
    'manage:event_participants'
  ],

  admin: [
    // Eredita tutti i permessi staff
    'read:*',
    'create:*',
    'update:*',
    'delete:*',
    'manage:users',
    'manage:roles',
    'read:analytics',
    'system:backup',
    'access:admin_panel'
  ]
};

// Fix per riferimento circolare
ROLE_PERMISSIONS.staff = [
  ...ROLE_PERMISSIONS.customer,
  'read:all_bookings',
  'update:booking_status',
  'read:user_list',
  'create:events',
  'update:events',
  'read:event_details',
  'manage:event_participants'
];

// ==========================================
// CLASSE USER MODEL
// ==========================================

class User {
  constructor(userData = {}) {
    this.id = userData.id;
    this.email = userData.email;
    this.passwordHash = userData.password_hash;
    this.role = userData.role || 'customer';
    this.firstName = userData.first_name;
    this.lastName = userData.last_name;
    this.phone = userData.phone;
    this.dateOfBirth = userData.date_of_birth;
    this.createdAt = userData.created_at;
    this.lastLogin = userData.last_login;
    this.isActive = userData.is_active !== false; // Default true
    this.emailVerified = userData.email_verified || false;
    this.verificationToken = userData.verification_token;
    this.resetToken = userData.reset_token;
    this.resetExpires = userData.reset_expires;
    this.failedLoginAttempts = userData.failed_login_attempts || 0;
    this.lockedUntil = userData.locked_until;
    this.profileImage = userData.profile_image;
  }

  // ==========================================
  // VALIDAZIONI
  // ==========================================

  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error('Email non valida');
    }
    if (email.length > 254) {
      throw new Error('Email troppo lunga');
    }
    return true;
  }

  static validatePassword(password) {
    if (!password || password.length < SECURITY_CONFIG.MIN_PASSWORD_LENGTH) {
      throw new Error(`Password deve essere di almeno ${SECURITY_CONFIG.MIN_PASSWORD_LENGTH} caratteri`);
    }

    if (!SECURITY_CONFIG.PASSWORD_REGEX.test(password)) {
      throw new Error('Password deve contenere: maiuscola, minuscola, numero e carattere speciale');
    }

    return true;
  }

  static validateRole(role) {
    const validRoles = ['customer', 'staff', 'admin'];
    if (!validRoles.includes(role)) {
      throw new Error(`Ruolo non valido. Valori ammessi: ${validRoles.join(', ')}`);
    }
    return true;
  }

  static validateUserData(userData) {
    const errors = [];

    // Email obbligatoria
    try {
      User.validateEmail(userData.email);
    } catch (err) {
      errors.push(err.message);
    }

    // Password obbligatoria (solo per nuovi utenti)
    if (userData.password && !userData.id) {
      try {
        User.validatePassword(userData.password);
      } catch (err) {
        errors.push(err.message);
      }
    }

    // Ruolo se specificato
    if (userData.role) {
      try {
        User.validateRole(userData.role);
      } catch (err) {
        errors.push(err.message);
      }
    }

    // Nome e cognome lunghezza
    if (userData.first_name && userData.first_name.length > 50) {
      errors.push('Nome troppo lungo (max 50 caratteri)');
    }
    if (userData.last_name && userData.last_name.length > 50) {
      errors.push('Cognome troppo lungo (max 50 caratteri)');
    }

    // Telefono formato base
    if (userData.phone && !/^[\+]?[\d\s\-\(\)]{8,20}$/.test(userData.phone)) {
      errors.push('Formato telefono non valido');
    }

    if (errors.length > 0) {
      throw new Error(`Errori validazione: ${errors.join(', ')}`);
    }

    return true;
  }

  // ==========================================
  // GESTIONE PASSWORD
  // ==========================================

  static async hashPassword(password) {
    User.validatePassword(password);
    return await bcrypt.hash(password, SECURITY_CONFIG.BCRYPT_ROUNDS);
  }

  async verifyPassword(password) {
    if (!this.passwordHash) {
      throw new Error('Password hash non trovato');
    }
    return await bcrypt.compare(password, this.passwordHash);
  }

  async updatePassword(newPassword) {
    this.passwordHash = await User.hashPassword(newPassword);
    this.resetToken = null;
    this.resetExpires = null;
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;
  }

  // ==========================================
  // JWT TOKEN MANAGEMENT
  // ==========================================

  static getJWTSecret() {
    const secret = process.env.JWT_SECRET || 'dice-and-drink-secret-key-2025';
    if (secret === 'dice-and-drink-secret-key-2025') {
      console.warn('⚠️  Using default JWT secret! Set JWT_SECRET in production!');
    }
    return secret;
  }

  generateAccessToken() {
    const payload = {
      userId: this.id,
      email: this.email,
      role: this.role,
      permissions: this.getPermissions(),
      emailVerified: this.emailVerified
    };

    return jwt.sign(payload, User.getJWTSecret(), {
      expiresIn: SECURITY_CONFIG.ACCESS_TOKEN_EXPIRES,
      issuer: 'dice-and-drink',
      audience: 'dice-and-drink-users'
    });
  }

  generateRefreshToken() {
    const payload = {
      userId: this.id,
      tokenType: 'refresh',
      timestamp: Date.now()
    };

    return jwt.sign(payload, User.getJWTSecret(), {
      expiresIn: SECURITY_CONFIG.REFRESH_TOKEN_EXPIRES,
      issuer: 'dice-and-drink'
    });
  }

  generateVerificationToken() {
    this.verificationToken = crypto.randomBytes(32).toString('hex');
    return this.verificationToken;
  }

  generateResetToken() {
    this.resetToken = crypto.randomBytes(32).toString('hex');
    this.resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 ora
    return this.resetToken;
  }

  static verifyJWT(token) {
    try {
      return jwt.verify(token, User.getJWTSecret());
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new Error('Token scaduto');
      } else if (err.name === 'JsonWebTokenError') {
        throw new Error('Token non valido');
      }
      throw err;
    }
  }

  // ==========================================
  // SISTEMA PERMESSI
  // ==========================================

  getPermissions() {
    return ROLE_PERMISSIONS[this.role] || ROLE_PERMISSIONS.customer;
  }

  hasPermission(permission) {
    const userPermissions = this.getPermissions();

    // Admin ha accesso totale
    if (this.role === 'admin') {
      return true;
    }

    // Controlla permesso specifico
    return userPermissions.includes(permission);
  }

  canAccessResource(resource, action = 'read') {
    const permission = `${action}:${resource}`;
    return this.hasPermission(permission);
  }

  canManageUser(targetUser) {
    // Solo admin può gestire altri utenti
    if (this.role !== 'admin') {
      return this.id === targetUser.id; // Solo i propri dati
    }

    // Admin può gestire tutti tranne altri admin (safety)
    if (targetUser.role === 'admin' && this.id !== targetUser.id) {
      return false;
    }

    return true;
  }

  // ==========================================
  // GESTIONE ACCOUNT SECURITY
  // ==========================================

  isAccountLocked() {
    return this.lockedUntil && this.lockedUntil > new Date();
  }

  shouldLockAccount() {
    return this.failedLoginAttempts >= SECURITY_CONFIG.MAX_FAILED_ATTEMPTS;
  }

  lockAccount() {
    this.lockedUntil = new Date(Date.now() + SECURITY_CONFIG.LOCK_TIME);
    this.failedLoginAttempts = SECURITY_CONFIG.MAX_FAILED_ATTEMPTS;
  }

  incrementFailedAttempts() {
    this.failedLoginAttempts += 1;
    if (this.shouldLockAccount()) {
      this.lockAccount();
    }
  }

  resetFailedAttempts() {
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;
  }

  updateLastLogin() {
    this.lastLogin = new Date();
    this.resetFailedAttempts();
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  getPublicProfile() {
    return {
      id: this.id,
      email: this.email,
      role: this.role,
      firstName: this.firstName,
      lastName: this.lastName,
      phone: this.phone,
      profileImage: this.profileImage,
      createdAt: this.createdAt,
      lastLogin: this.lastLogin,
      emailVerified: this.emailVerified,
      isActive: this.isActive
    };
  }

  getFullName() {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.firstName || this.lastName || this.email;
  }

  isEmailVerificationRequired() {
    return !this.emailVerified && this.role !== 'admin';
  }

  canLogin() {
    if (!this.isActive) {
      throw new Error('Account disattivato');
    }

    if (this.isAccountLocked()) {
      const unlockTime = new Date(this.lockedUntil).toLocaleString();
      throw new Error(`Account bloccato fino a ${unlockTime}`);
    }

    return true;
  }

  // ==========================================
  // SERIALIZZAZIONE
  // ==========================================

  toJSON() {
    // Non includere mai password hash o token sensibili nella serializzazione
    const safeData = { ...this };
    delete safeData.passwordHash;
    delete safeData.verificationToken;
    delete safeData.resetToken;
    return safeData;
  }

  static fromDatabaseRow(row) {
    return new User(row);
  }

  toDatabaseObject() {
    return {
      email: this.email,
      password_hash: this.passwordHash,
      role: this.role,
      first_name: this.firstName,
      last_name: this.lastName,
      phone: this.phone,
      date_of_birth: this.dateOfBirth,
      is_active: this.isActive,
      email_verified: this.emailVerified,
      verification_token: this.verificationToken,
      reset_token: this.resetToken,
      reset_expires: this.resetExpires,
      failed_login_attempts: this.failedLoginAttempts,
      locked_until: this.lockedUntil,
      profile_image: this.profileImage,
      last_login: this.lastLogin
    };
  }

  // ==========================================
  // STATIC UTILITY METHODS
  // ==========================================

  static generateSecureId() {
    return crypto.randomBytes(16).toString('hex');
  }

  static sanitizeEmail(email) {
    return email?.trim().toLowerCase();
  }

  static getRoleHierarchy() {
    return {
      customer: 1,
      staff: 2,
      admin: 3
    };
  }

  static compareRoles(role1, role2) {
    const hierarchy = User.getRoleHierarchy();
    return hierarchy[role1] - hierarchy[role2];
  }
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  User,
  SECURITY_CONFIG,
  ROLE_PERMISSIONS
};
