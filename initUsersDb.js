// initUsersDb.js
// SCOPO: Inizializzazione completa database utenti con tabelle, indici e dati demo
// ESECUZIONE: node initUsersDb.js

require('dotenv').config(); // Carica variabili ambiente
const openDb = require('./db');
const bcrypt = require('bcrypt');

// ==========================================
// CONFIGURAZIONE DA ENVIRONMENT
// ==========================================

const CONFIG = {
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@diceanddrink.com',
  COMPANY_NAME: process.env.COMPANY_NAME || 'Dice & Drink Gaming Café',
  DEBUG_MODE: process.env.DEBUG_MODE === 'true'
};

// ==========================================
// FUNZIONI UTILITY
// ==========================================

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const icon = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    create: '🔨',
    data: '📊'
  };

  console.log(`${icon[type]} [${timestamp}] ${message}`);
}

async function hashPassword(password) {
  return await bcrypt.hash(password, CONFIG.BCRYPT_ROUNDS);
}

// ==========================================
// CREAZIONE TABELLE
// ==========================================

async function createUsersTable(db) {
  log('Creazione tabella users...', 'create');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer', 'staff', 'admin')),
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      date_of_birth TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active BOOLEAN DEFAULT 1,
      email_verified BOOLEAN DEFAULT 0,
      verification_token TEXT,
      reset_token TEXT,
      reset_expires DATETIME,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until DATETIME,
      profile_image TEXT
    )
  `);

  log('✅ Tabella users creata', 'success');
}

async function createUserPreferencesTable(db) {
  log('Creazione tabella user_preferences...', 'create');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      favorite_game_categories TEXT DEFAULT '[]',
      dietary_restrictions TEXT DEFAULT '[]',
      preferred_drink_types TEXT DEFAULT '[]',
      max_game_complexity INTEGER DEFAULT 3,
      preferred_player_count TEXT DEFAULT '2-4',
      allergies TEXT,
      notes TEXT,
      preferred_time_slots TEXT DEFAULT '[]',
      notification_preferences TEXT DEFAULT '{"email": true, "sms": false, "push": true}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  log('✅ Tabella user_preferences creata', 'success');
}

async function createUserSessionsTable(db) {
  log('Creazione tabella user_sessions...', 'create');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_token TEXT UNIQUE NOT NULL, 
      refresh_token TEXT UNIQUE,
      device_info TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  log('✅ Tabella user_sessions creata', 'success');
}

async function createUserAuditLogTable(db) {
  log('Creazione tabella user_audit_log...', 'create');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      details TEXT DEFAULT '{}',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    )
  `);

  log('✅ Tabella user_audit_log creata', 'success');
}

async function createUserBookingsTable(db) {
  log('Creazione tabella user_bookings...', 'create');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      booking_date TEXT NOT NULL,
      booking_time TEXT NOT NULL,
      duration_hours INTEGER DEFAULT 2,
      table_number INTEGER,
      game_requests TEXT DEFAULT '[]',
      drink_orders TEXT DEFAULT '[]',
      snack_orders TEXT DEFAULT '[]',
      party_size INTEGER NOT NULL,
      special_requests TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
      total_price DECIMAL(10,2) DEFAULT 0.00,
      payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'refunded', 'failed')),
      payment_method TEXT,
      confirmation_code TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      cancelled_at DATETIME,
      cancellation_reason TEXT,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  log('✅ Tabella user_bookings creata', 'success');
}

async function createUserWishlistTable(db) {
  log('Creazione tabella user_wishlist...', 'create');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_wishlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_type TEXT NOT NULL CHECK(item_type IN ('game', 'drink', 'snack')),
      item_id INTEGER NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      priority INTEGER DEFAULT 1 CHECK(priority IN (1, 2, 3, 4, 5)),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(user_id, item_type, item_id)
    )
  `);

  log('✅ Tabella user_wishlist creata', 'success');
}

async function createUserRatingsTable(db) {
  log('Creazione tabella user_ratings...', 'create');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_type TEXT NOT NULL CHECK(item_type IN ('game', 'drink', 'snack', 'service')),
      item_id INTEGER,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      review TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  log('✅ Tabella user_ratings creata', 'success');
}

// ==========================================
// CREAZIONE INDICI PER PERFORMANCE
// ==========================================

async function createIndexes(db) {
  log('Creazione indici per performance...', 'create');

  const indexes = [
    // Users table indexes
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
    'CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_users_verified ON users(email_verified)',
    'CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token)',
    'CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token)',

    // Sessions table indexes
    'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON user_sessions(refresh_token)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active)',

    // Audit log indexes
    'CREATE INDEX IF NOT EXISTS idx_audit_user_id ON user_audit_log(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_action ON user_audit_log(action)',
    'CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON user_audit_log(timestamp)',

    // Bookings indexes
    'CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON user_bookings(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_bookings_date ON user_bookings(booking_date)',
    'CREATE INDEX IF NOT EXISTS idx_bookings_status ON user_bookings(status)',
    'CREATE INDEX IF NOT EXISTS idx_bookings_confirmation ON user_bookings(confirmation_code)',

    // Wishlist indexes
    'CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON user_wishlist(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_wishlist_item ON user_wishlist(item_type, item_id)',

    // Ratings indexes
    'CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON user_ratings(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_ratings_item ON user_ratings(item_type, item_id)',
    'CREATE INDEX IF NOT EXISTS idx_ratings_rating ON user_ratings(rating)'
  ];

  for (const indexSql of indexes) {
    await db.exec(indexSql);
  }

  log('✅ Tutti gli indici creati', 'success');
}

// ==========================================
// CREAZIONE DATI DEMO
// ==========================================

async function createDefaultUsers(db) {
  log('Creazione utenti di default...', 'data');

  // 1. ADMIN di default
  const adminPassword = 'DiceAndDrink2025!';
  const adminHash = await hashPassword(adminPassword);

  try {
    await db.run(`
      INSERT OR IGNORE INTO users (
        email, password_hash, role, first_name, last_name,
        is_active, email_verified, created_at
      ) VALUES (?, ?, 'admin', 'Admin', 'System', 1, 1, datetime('now'))
    `, [CONFIG.ADMIN_EMAIL, adminHash]);

    log(`👑 Admin creato:`, 'success');
    log(`   📧 Email: ${CONFIG.ADMIN_EMAIL}`, 'success');
    log(`   🔑 Password: ${adminPassword}`, 'success');
    log(`   ⚠️  CAMBIA LA PASSWORD AL PRIMO LOGIN!`, 'warning');
  } catch (error) {
    if (!error.message.includes('UNIQUE')) {
      throw error;
    }
    log('👑 Admin già esistente', 'info');
  }

  // 2. STAFF di demo
  const staffPassword = 'StaffDemo2025!';
  const staffHash = await hashPassword(staffPassword);

  try {
    await db.run(`
      INSERT OR IGNORE INTO users (
        email, password_hash, role, first_name, last_name,
        phone, is_active, email_verified, created_at
      ) VALUES (?, ?, 'staff', 'Marco', 'Rossi', '+39 333 123 4567', 1, 1, datetime('now'))
    `, ['staff@diceanddrink.com', staffHash]);

    log(`👨‍💼 Staff demo creato:`, 'success');
    log(`   📧 Email: staff@diceanddrink.com`, 'success');
    log(`   🔑 Password: ${staffPassword}`, 'success');
  } catch (error) {
    if (!error.message.includes('UNIQUE')) {
      throw error;
    }
    log('👨‍💼 Staff demo già esistente', 'info');
  }

  // 3. CUSTOMER di demo
  const customerPassword = 'CustomerDemo2025!';
  const customerHash = await hashPassword(customerPassword);

  try {
    await db.run(`
      INSERT OR IGNORE INTO users (
        email, password_hash, role, first_name, last_name,
        phone, date_of_birth, is_active, email_verified, created_at
      ) VALUES (?, ?, 'customer', 'Luigi', 'Bianchi', '+39 333 987 6543', '1990-05-15', 1, 1, datetime('now'))
    `, ['customer@diceanddrink.com', customerHash]);

    log(`👤 Customer demo creato:`, 'success');
    log(`   📧 Email: customer@diceanddrink.com`, 'success');
    log(`   🔑 Password: ${customerPassword}`, 'success');
  } catch (error) {
    if (!error.message.includes('UNIQUE')) {
      throw error;
    }
    log('👤 Customer demo già esistente', 'info');
  }
}

async function createDefaultPreferences(db) {
  log('Creazione preferenze di default...', 'data');

  // Ottieni tutti gli utenti
  const users = await db.all('SELECT id, role FROM users');

  for (const user of users) {
    // Controlla se esistono già preferenze
    const existing = await db.get(
      'SELECT id FROM user_preferences WHERE user_id = ?',
      [user.id]
    );

    if (existing) {
      continue; // Salta se esistono già
    }

    // Preferenze basate sul ruolo
    let preferences = {
      favorite_game_categories: ['Famiglia', 'Party'],
      dietary_restrictions: [],
      preferred_drink_types: ['analcolici'],
      max_game_complexity: 3,
      preferred_player_count: '2-4',
      preferred_time_slots: ['18:00', '20:00'],
      notification_preferences: {
        email: true,
        sms: false,
        push: true
      }
    };

    if (user.role === 'staff' || user.role === 'admin') {
      preferences.favorite_game_categories = ['Strategia', 'Cooperativo', 'Famiglia'];
      preferences.max_game_complexity = 5;
      preferences.preferred_drink_types = ['cocktail', 'birra', 'analcolici'];
    }

    await db.run(`
      INSERT INTO user_preferences (
        user_id, favorite_game_categories, dietary_restrictions,
        preferred_drink_types, max_game_complexity, preferred_player_count,
        preferred_time_slots, notification_preferences
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      user.id,
      JSON.stringify(preferences.favorite_game_categories),
      JSON.stringify(preferences.dietary_restrictions),
      JSON.stringify(preferences.preferred_drink_types),
      preferences.max_game_complexity,
      preferences.preferred_player_count,
      JSON.stringify(preferences.preferred_time_slots),
      JSON.stringify(preferences.notification_preferences)
    ]);
  }

  log('✅ Preferenze di default create per tutti gli utenti', 'success');
}

async function createSampleBookings(db) {
  log('Creazione prenotazioni di esempio...', 'data');

  const customerUser = await db.get("SELECT id FROM users WHERE email = 'customer@diceanddrink.com'");
  if (!customerUser) return;

  const sampleBookings = [
    {
      booking_date: '2025-06-15',
      booking_time: '18:00',
      duration_hours: 2,
      table_number: 3,
      party_size: 4,
      game_requests: ['Catan', 'Azul'],
      drink_orders: ['Coca Cola', 'Sprite'],
      status: 'confirmed',
      total_price: 25.00,
      payment_status: 'paid',
      confirmation_code: 'DCK2025061501'
    },
    {
      booking_date: '2025-06-20',
      booking_time: '20:00',
      duration_hours: 3,
      table_number: 1,
      party_size: 2,
      game_requests: ['7 Wonders Duel'],
      drink_orders: ['Aperol Spritz', 'Negroni'],
      special_requests: 'Tavolo tranquillo per coppia',
      status: 'pending',
      total_price: 35.00,
      payment_status: 'pending',
      confirmation_code: 'DCK2025062001'
    }
  ];

  for (const booking of sampleBookings) {
    try {
      await db.run(`
        INSERT OR IGNORE INTO user_bookings (
          user_id, booking_date, booking_time, duration_hours, table_number,
          party_size, game_requests, drink_orders, special_requests, status,
          total_price, payment_status, confirmation_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        customerUser.id,
        booking.booking_date,
        booking.booking_time,
        booking.duration_hours,
        booking.table_number,
        booking.party_size,
        JSON.stringify(booking.game_requests),
        JSON.stringify(booking.drink_orders),
        booking.special_requests || null,
        booking.status,
        booking.total_price,
        booking.payment_status,
        booking.confirmation_code
      ]);
    } catch (error) {
      if (!error.message.includes('UNIQUE')) {
        console.error('Errore creazione prenotazione:', error);
      }
    }
  }

  log('✅ Prenotazioni di esempio create', 'success');
}

// ==========================================
// FUNZIONE PRINCIPALE
// ==========================================

async function initUsersDatabase() {
  console.log('🎲🍹 =====================================');
  console.log('🎲🍹  DICE & DRINK - USERS DATABASE INIT');
  console.log('🎲🍹 =====================================');
  console.log('');

  try {
    const db = await openDb();

    // Creazione tabelle
    await createUsersTable(db);
    await createUserPreferencesTable(db);
    await createUserSessionsTable(db);
    await createUserAuditLogTable(db);
    await createUserBookingsTable(db);
    await createUserWishlistTable(db);
    await createUserRatingsTable(db);

    // Creazione indici
    await createIndexes(db);

    // Popolamento dati demo
    await createDefaultUsers(db);
    await createDefaultPreferences(db);
    await createSampleBookings(db);

    // Statistiche finali
    const stats = await db.get(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'customer' THEN 1 END) as customers,
        COUNT(CASE WHEN role = 'staff' THEN 1 END) as staff,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users,
        COUNT(CASE WHEN email_verified = 1 THEN 1 END) as verified_users
      FROM users
    `);

    const preferencesCount = await db.get('SELECT COUNT(*) as count FROM user_preferences');
    const bookingsCount = await db.get('SELECT COUNT(*) as count FROM user_bookings');

    await db.close();

    console.log('');
    log('📊 STATISTICHE DATABASE UTENTI:', 'data');
    log(`   👥 Totale utenti: ${stats.total_users}`, 'data');
    log(`   👑 Admin: ${stats.admins}`, 'data');
    log(`   👨‍💼 Staff: ${stats.staff}`, 'data');
    log(`   👤 Customer: ${stats.customers}`, 'data');
    log(`   ✅ Utenti attivi: ${stats.active_users}`, 'data');
    log(`   📧 Email verificate: ${stats.verified_users}`, 'data');
    log(`   ⚙️  Preferenze configurate: ${preferencesCount.count}`, 'data');
    log(`   📅 Prenotazioni di esempio: ${bookingsCount.count}`, 'data');
    console.log('');
    log('✅ Database utenti inizializzato con successo!', 'success');
    console.log('');
    console.log('🎯 PROSSIMI PASSI:');
    console.log('   1. Avvia il server: npm start');
    console.log('   2. Testa login admin: POST /api/auth/login');
    console.log(`   3. Email admin: ${CONFIG.ADMIN_EMAIL}`);
    console.log('   4. Cambia password admin al primo accesso!');
    console.log('');

  } catch (error) {
    log(`Errore durante l'inizializzazione: ${error.message}`, 'error');
    if (CONFIG.DEBUG_MODE) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// ==========================================
// ESECUZIONE
// ==========================================

if (require.main === module) {
  initUsersDatabase();
}

module.exports = { initUsersDatabase };
