
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');


const SECURITY_CONFIG = {
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,

  ACCESS_TOKEN_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  REFRESH_TOKEN_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',
  VERIFICATION_TOKEN_EXPIRES: process.env.JWT_VERIFY_EXPIRES || '24h',
  RESET_TOKEN_EXPIRES: process.env.JWT_RESET_EXPIRES || '1h',

  MAX_FAILED_ATTEMPTS: parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS) || 5,
  LOCK_TIME: parseInt(process.env.ACCOUNT_LOCK_TIME) || 15, //15 minuti

  MIN_PASSWORD_LENGTH: 8,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,

  JWT_SECRET: process.env.JWT_SECRET || 'dice-and-drink-fallback-secret-2025'
};

if (SECURITY_CONFIG.JWT_SECRET === 'dice-and-drink-fallback-secret-2025') {
  console.warn('⚠️  SECURITY WARNING: Using default JWT secret! Set JWT_SECRET in .env for production!');
}

// ==========================================
// SISTEMA PERMESSI
// ==========================================

const ROLE_PERMISSIONS = {
  customer: [
    // Lettura cataloghi
    'read:games',
    'read:drinks',
    'read:snacks',
    'read:events_public',

    // Gestione prenotazioni proprie
    'create:booking',
    'read:own_bookings',
    'update:own_booking',
    'cancel:own_booking',

    // Gestione profilo proprio
    'read:own_profile',
    'update:own_profile',
    'update:own_preferences',

    // Interazioni
    'create:wishlist',
    'rate:games',
    'rate:drinks',
    'rate:snacks',
    'rate:service'
  ],

  staff: [
    ...[], // Popolato dopo la definizione

    // Gestione prenotazioni
    'read:all_bookings',
    'update:booking_status',
    'read:booking_details',

    // Gestione eventi
    'create:events',
    'update:events',
    'read:event_details',
    'manage:event_participants',

    // Lettura utenti base
    'read:user_list',
    'read:user_stats',

    // Gestione inventario
    'update:inventory',
    'read:inventory_reports'
  ],

  admin: [
    // Accesso completo
    'read:*',
    'create:*',
    'update:*',
    'delete:*',

    // Gestione utenti
    'manage:users',
    'manage:roles',
    'read:user_audit_log',

    // Analytics e reports
    'read:analytics',
    'read:financial_reports',
    'export:data',

    // Sistema
    'system:backup',
    'system:maintenance',
    'access:admin_panel'
  ]
};

// Popolamento permessi staff con customer
ROLE_PERMISSIONS.staff = [
  ...ROLE_PERMISSIONS.customer,
  'read:all_bookings',
  'update:booking_status',
  'read:booking_details',
  'create:events',
  'update:events',
  'read:event_details',
  'manage:event_participants',
  'read:user_list',
  'read:user_stats',
  'update:inventory',
  'read:inventory_reports'
];

// ==========================================
// CLASSE USER MODEL
// ==========================================

class User {
  constructor(userData = {}) {
    // Dati base
    this.id = userData.id;
    this.email = userData.email;
    this.passwordHash = userData.password_hash;
    this.role = userData.role || 'customer';

    // Informazioni personali
    this.firstName = userData.first_name;
    this.lastName = userData.last_name;
    this.phone = userData.phone;
    this.dateOfBirth = userData.date_of_birth;
    this.profileImage = userData.profile_image;

    // Timestamp
    this.createdAt = userData.created_at;
    this.lastLogin = userData.last_login;

    // Stato account
    this.isActive = userData.is_active !== false; // Default true
    this.emailVerified = userData.email_verified || false;

    // Sicurezza
    this.verificationToken = userData.verification_token;
    this.resetToken = userData.reset_token;
    this.resetExpires = userData.reset_expires;
    this.failedLoginAttempts = userData.failed_login_attempts || 0;
    this.lockedUntil = userData.locked_until;
  }

  // ==========================================
  // VALIDAZIONI INPUT
  // ==========================================

  static validateEmail(email) {
    if (!email) {
      throw new Error('Email è obbligatoria');
    }

    // Regex email completa
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Formato email non valido');
    }

    if (email.length > 254) {
      throw new Error('Email troppo lunga (max 254 caratteri)');
    }

    return true;
  }

  static validatePassword(password) {
    if (!password) {
      throw new Error('Password è obbligatoria');
    }

    if (password.length < SECURITY_CONFIG.MIN_PASSWORD_LENGTH) {
      throw new Error(`Password deve essere di almeno ${SECURITY_CONFIG.MIN_PASSWORD_LENGTH} caratteri`);
    }

    if (!SECURITY_CONFIG.PASSWORD_REGEX.test(password)) {
      throw new Error('Password deve contenere: maiuscola, minuscola, numero e carattere speciale (@$!%*?&)');
    }

    // Controlla password comuni
    const commonPasswords = [
      'password', '123456', '12345678', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      throw new Error('Password troppo comune, scegline una più sicura');
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

  static validatePhone(phone) {
    if (!phone) return true; // Opzionale

    // Regex per telefono
    const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{8,20}$/;
    if (!phoneRegex.test(phone)) {
      throw new Error('Formato telefono non valido');
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

    // Password obbligatoria per nuovi utenti
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

    // Telefono formato
    try {
      User.validatePhone(userData.phone);
    } catch (err) {
      errors.push(err.message);
    }

    // Data di nascita
    if (userData.date_of_birth) {
      const birthDate = new Date(userData.date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();

      if (age < 13) {
        errors.push('Età minima 13 anni');
      }
      if (age > 120) {
        errors.push('Data di nascita non valida');
      }
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
      throw new Error('Password hash non trovato per questo utente');
    }
    return await bcrypt.compare(password, this.passwordHash);
  }

  async updatePassword(newPassword) {
    this.passwordHash = await User.hashPassword(newPassword);

    // Reset sicurezza quando password cambia
    this.resetToken = null;
    this.resetExpires = null;
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;

    return this;
  }

  // ==========================================
  // JWT TOKEN MANAGEMENT
  // ==========================================

  generateAccessToken() {
    const payload = {
      userId: this.id,
      email: this.email,
      role: this.role,
      permissions: this.getPermissions(),
      emailVerified: this.emailVerified,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, SECURITY_CONFIG.JWT_SECRET, {
      expiresIn: SECURITY_CONFIG.ACCESS_TOKEN_EXPIRES,
      issuer: 'dice-and-drink-api',
      audience: 'dice-and-drink-users',
      subject: this.id.toString()
    });
  }

  generateRefreshToken() {
    const payload = {
      userId: this.id,
      tokenType: 'refresh',
      timestamp: Date.now(),
      sessionId: crypto.randomBytes(16).toString('hex')
    };

    return jwt.sign(payload, SECURITY_CONFIG.JWT_SECRET, {
      expiresIn: SECURITY_CONFIG.REFRESH_TOKEN_EXPIRES,
      issuer: 'dice-and-drink-api'
    });
  }

  generateVerificationToken() {
    this.verificationToken = crypto.randomBytes(32).toString('hex');
    return this.verificationToken;
  }

  generateResetToken() {
    this.resetToken = crypto.randomBytes(32).toString('hex');

    // Scadenza da config environment
    const expiresIn = parseInt(SECURITY_CONFIG.RESET_TOKEN_EXPIRES.replace('h', '')) * 60 * 60 * 1000;
    this.resetExpires = new Date(Date.now() + expiresIn);

    return this.resetToken;
  }

  static verifyJWT(token) {
    try {
      return jwt.verify(token, SECURITY_CONFIG.JWT_SECRET, {
        issuer: 'dice-and-drink-api'
      });
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new Error('Token scaduto');
      } else if (err.name === 'JsonWebTokenError') {
        throw new Error('Token non valido');
      } else if (err.name === 'NotBeforeError') {
        throw new Error('Token non ancora valido');
      }
      throw new Error('Errore verifica token');
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

    // Controlla permesso wildcard (*)
    if (userPermissions.includes(`${permission.split(':')[0]}:*`)) {
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

    // Admin non può gestire altri admin (safety)
    if (targetUser.role === 'admin' && this.id !== targetUser.id) {
      return false;
    }

    return true;
  }

  canAccessBooking(booking) {
    // Proprietario può sempre accedere
    if (booking.user_id === this.id) {
      return true;
    }

    // Staff e admin possono vedere tutte le prenotazioni
    return this.hasPermission('read:all_bookings');
  }

  // ==========================================
  // GESTIONE ACCOUNT SECURITY
  // ==========================================

  isAccountLocked() {
    if (!this.lockedUntil) return false;
    return new Date(this.lockedUntil) > new Date();
  }

  shouldLockAccount() {
    return this.failedLoginAttempts >= SECURITY_CONFIG.MAX_FAILED_ATTEMPTS;
  }

  lockAccount() {
    const lockTimeMs = SECURITY_CONFIG.LOCK_TIME * 60 * 1000; // minuti to milliseconds
    this.lockedUntil = new Date(Date.now() + lockTimeMs);
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
  // VALIDAZIONI BUSINESS LOGIC
  // ==========================================

  canLogin() {
    if (!this.isActive) {
      throw new Error('Account disattivato. Contatta il supporto.');
    }

    if (this.isAccountLocked()) {
      const unlockTime = new Date(this.lockedUntil).toLocaleString('it-IT');
      throw new Error(`Account bloccato fino a ${unlockTime} per troppi tentativi di login falliti.`);
    }

    return true;
  }

  isEmailVerificationRequired() {
    // Admin sono pre-verificati
    if (this.role === 'admin') {
      return false;
    }

    // Feature flag da environment
    const emailVerificationEnabled = process.env.FEATURE_EMAIL_VERIFICATION === 'true';
    if (!emailVerificationEnabled) {
      return false;
    }

    return !this.emailVerified;
  }

  canMakeBooking() {
    this.canLogin();

    if (this.isEmailVerificationRequired()) {
      throw new Error('Verifica la tua email prima di effettuare prenotazioni.');
    }

    return true;
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
    return this.firstName || this.lastName || this.email.split('@')[0];
  }

  getDisplayName() {
    return this.getFullName();
  }

  getAge() {
    if (!this.dateOfBirth) return null;

    const birth = new Date(this.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();

    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  isMinor() {
    const age = this.getAge();
    return age !== null && age < 18;
  }

  // ==========================================
  // SERIALIZZAZIONE SICURA
  // ==========================================

  toJSON() {
    const safeData = { ...this };
    delete safeData.passwordHash;
    delete safeData.verificationToken;
    delete safeData.resetToken;
    delete safeData.resetExpires;
    return safeData;
  }

  static fromDatabaseRow(row) {
    return new User(row);
  }

  toDatabaseObject(includePassword = true) {
    const dbObject = {
      email: User.sanitizeEmail(this.email),
      role: this.role,
      first_name: this.firstName,
      last_name: this.lastName,
      phone: this.phone,
      date_of_birth: this.dateOfBirth,
      is_active: this.isActive ? 1 : 0,
      email_verified: this.emailVerified ? 1 : 0,
      verification_token: this.verificationToken,
      reset_token: this.resetToken,
      reset_expires: this.resetExpires ? this.resetExpires.toISOString() : null,
      failed_login_attempts: this.failedLoginAttempts,
      locked_until: this.lockedUntil ? this.lockedUntil.toISOString() : null,
      profile_image: this.profileImage,
      last_login: this.lastLogin ? this.lastLogin.toISOString() : null
    };

    if (includePassword && this.passwordHash) {
      dbObject.password_hash = this.passwordHash;
    }

    return dbObject;
  }

  static sanitizeEmail(email) {
    if (!email) return null;
    return email.trim().toLowerCase();
  }

  static generateSecureId() {
    return crypto.randomBytes(16).toString('hex');
  }

  static generateConfirmationCode() {
    // Formato: DCK2025061501 (DCK + YYYYMMDD + sequenza)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `DCK${dateStr}${random}`;
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
    return (hierarchy[role1] || 0) - (hierarchy[role2] || 0);
  }

  static isValidRole(role) {
    return ['customer', 'staff', 'admin'].includes(role);
  }

  static getPasswordStrength(password) {
    let strength = 0;

    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    if (strength <= 2) return 'debole';
    if (strength <= 4) return 'media';
    return 'forte';
  }


  static getSecurityConfig() {
    return { ...SECURITY_CONFIG };
  }

  static getRolePermissions(role = null) {
    if (role) {
      return ROLE_PERMISSIONS[role] || [];
    }
    return { ...ROLE_PERMISSIONS };
  }
}

module.exports = {
  User,
  SECURITY_CONFIG,
  ROLE_PERMISSIONS
};
