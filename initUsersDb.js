// SCOPO: Crea tabelle utenti e inserisce admin di default
// ESEGUIRE UNA SOLA VOLTA: node initUsersDb.js

const openDb = require('./db');
const bcrypt = require('bcrypt');

async function initUsersDatabase() {
  try {
    const db = await openDb();

    // ==========================================
    // TABELLA PRINCIPALE UTENTI
    // ==========================================

    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'customer' CHECK(role IN ('customer', 'staff', 'admin')),
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        date_of_birth DATE,
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

    // ==========================================
    // TABELLA PREFERENZE UTENTE
    // ==========================================

    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        favorite_game_categories TEXT, -- JSON array: ["Strategia", "Party"]
        dietary_restrictions TEXT,     -- JSON array: ["vegetariano", "senza_glutine"]
        preferred_drink_types TEXT,    -- JSON array: ["alcolici", "caffè"]
        max_game_complexity INTEGER CHECK(max_game_complexity BETWEEN 1 AND 5),
        preferred_player_count TEXT,   -- "2-4" o "4+"
        allergies TEXT,               -- Testo libero
        notes TEXT,                   -- Note personali staff
        preferred_time_slots TEXT,    -- JSON array: ["20:00-22:00", "weekend"]
        notification_preferences TEXT, -- JSON: {"email": true, "sms": false}
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // ==========================================
    // TABELLA SESSIONI (per JWT refresh tokens)
    // ==========================================

    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        device_info TEXT,             -- User-Agent, IP info
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // ==========================================
    // TABELLA AUDIT LOG (sicurezza)
    // ==========================================

    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,         -- "login", "logout", "password_change", "role_change"
        ip_address TEXT,
        user_agent TEXT,
        details TEXT,                 -- JSON con dettagli extra
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
      )
    `);

    // ==========================================
    // INDICI PER PERFORMANCE
    // ==========================================

    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
      CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
      CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token);
      CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON user_audit_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON user_audit_log(timestamp);
    `);

    // ==========================================
    // INSERIMENTO UTENTI DI DEFAULT
    // ==========================================

    // Verifica se esiste già un admin
    const existingAdmin = await db.get("SELECT id FROM users WHERE role = 'admin'");

    if (!existingAdmin) {
      console.log('👑 Creazione admin di default...');

      // Hash password sicura per admin
      const adminPassword = 'DiceAndDrink2025!';
      const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

      // Inserisci admin di default
      const adminResult = await db.run(
        `INSERT INTO users
         (email, password_hash, role, first_name, last_name, email_verified, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'admin@diceanddrink.com',
          adminPasswordHash,
          'admin',
          'Admin',
          'System',
          1, // Email già verificata
          1  // Attivo
        ]
      );

      // Crea preferenze di default per admin
      await db.run(
        `INSERT INTO user_preferences
         (user_id, favorite_game_categories, preferred_drink_types, max_game_complexity, notification_preferences)
         VALUES (?, ?, ?, ?, ?)`,
        [
          adminResult.lastID,
          JSON.stringify(['Strategia', 'Gestionale', 'Party']),
          JSON.stringify(['alcolici', 'analcolici']),
          5,
          JSON.stringify({ email: true, sms: false, push: true })
        ]
      );

      console.log('✅ Admin creato:');
      console.log('   📧 Email: admin@diceanddrink.com');
      console.log('   🔑 Password: DiceAndDrink2025!');
      console.log('   ⚠️  CAMBIA LA PASSWORD AL PRIMO LOGIN!');
    } else {
      console.log('👑 Admin già esistente, skip creazione');
    }

    // Crea utente staff di demo
    const existingStaff = await db.get("SELECT id FROM users WHERE email = 'staff@diceanddrink.com'");

    if (!existingStaff) {
      console.log('👨‍💼 Creazione staff di demo...');

      const staffPasswordHash = await bcrypt.hash('StaffDemo2025!', 12);

      const staffResult = await db.run(
        `INSERT INTO users
         (email, password_hash, role, first_name, last_name, email_verified, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'staff@diceanddrink.com',
          staffPasswordHash,
          'staff',
          'Mario',
          'Rossi',
          1,
          1
        ]
      );

      await db.run(
        `INSERT INTO user_preferences
         (user_id, favorite_game_categories, preferred_drink_types, max_game_complexity)
         VALUES (?, ?, ?, ?)`,
        [
          staffResult.lastID,
          JSON.stringify(['Party', 'Cooperativi']),
          JSON.stringify(['caffè', 'alcolici']),
          4
        ]
      );

      console.log('✅ Staff demo creato:');
      console.log('   📧 Email: staff@diceanddrink.com');
      console.log('   🔑 Password: StaffDemo2025!');
    }

    // Crea utente customer di demo
    const existingCustomer = await db.get("SELECT id FROM users WHERE email = 'customer@diceanddrink.com'");

    if (!existingCustomer) {
      console.log('👤 Creazione customer di demo...');

      const customerPasswordHash = await bcrypt.hash('CustomerDemo2025!', 12);

      const customerResult = await db.run(
        `INSERT INTO users
         (email, password_hash, role, first_name, last_name, phone, email_verified, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'customer@diceanddrink.com',
          customerPasswordHash,
          'customer',
          'Giulia',
          'Bianchi',
          '+39 333 123 4567',
          1,
          1
        ]
      );

      await db.run(
        `INSERT INTO user_preferences
         (user_id, favorite_game_categories, dietary_restrictions, preferred_drink_types, max_game_complexity, preferred_player_count, allergies)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          customerResult.lastID,
          JSON.stringify(['Strategia', 'Famiglia']),
          JSON.stringify(['vegetariano']),
          JSON.stringify(['analcolici', 'caffè']),
          3,
          '2-4',
          'Nessuna allergia nota'
        ]
      );

      console.log('✅ Customer demo creato:');
      console.log('   📧 Email: customer@diceanddrink.com');
      console.log('   🔑 Password: CustomerDemo2025!');
    }

    // Log creazione audit
    await db.run(
      `INSERT INTO user_audit_log (action, details)
       VALUES (?, ?)`,
      [
        'system_init',
        JSON.stringify({
          message: 'Database utenti inizializzato',
          timestamp: new Date().toISOString()
        })
      ]
    );

    // ==========================================
    // VERIFICHE FINALI
    // ==========================================

    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    const adminCount = await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
    const staffCount = await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'staff'");
    const customerCount = await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'customer'");

    console.log('\n📊 STATISTICHE DATABASE UTENTI:');
    console.log(`   👥 Totale utenti: ${userCount.count}`);
    console.log(`   👑 Admin: ${adminCount.count}`);
    console.log(`   👨‍💼 Staff: ${staffCount.count}`);
    console.log(`   👤 Customer: ${customerCount.count}`);

    // Verifica integrità
    const preferencesCount = await db.get('SELECT COUNT(*) as count FROM user_preferences');
    console.log(`   ⚙️  Preferenze configurate: ${preferencesCount.count}`);

    await db.close();
    console.log('\n✅ Database utenti inizializzato con successo!');
    console.log('🔐 Ricorda di cambiare le password di default in produzione!');

  } catch (error) {
    console.error('❌ Errore nell\'inizializzazione database utenti:', error);
    console.log('\n💡 Possibili cause:');
    console.log('   - File db.js non trovato');
    console.log('   - bcrypt non installato: npm install bcrypt');
    console.log('   - Permessi database insufficienti');
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// Funzione per cleanup sessioni scadute (da eseguire periodicamente)
async function cleanupExpiredSessions() {
  try {
    const db = await openDb();
    const result = await db.run(
      'DELETE FROM user_sessions WHERE expires_at < datetime("now") OR is_active = 0'
    );
    await db.close();
    console.log(`🧹 Cleaned up ${result.changes} expired sessions`);
  } catch (error) {
    console.error('❌ Error cleaning up sessions:', error);
  }
}

// Funzione per cleanup vecchi audit log (mantieni solo ultimi 90 giorni)
async function cleanupOldAuditLogs() {
  try {
    const db = await openDb();
    const result = await db.run(
      'DELETE FROM user_audit_log WHERE timestamp < datetime("now", "-90 days")'
    );
    await db.close();
    console.log(`🧹 Cleaned up ${result.changes} old audit logs`);
  } catch (error) {
    console.error('❌ Error cleaning up audit logs:', error);
  }
}

// Esegui se chiamato direttamente
if (require.main === module) {
  initUsersDatabase();
}

module.exports = {
  initUsersDatabase,
  cleanupExpiredSessions,
  cleanupOldAuditLogs
};
