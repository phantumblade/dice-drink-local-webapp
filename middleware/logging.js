// middleware/logging.js
// VERSIONE SEMPLICE per progetto universitario

/**
 * Log eventi di sicurezza (login, register, ecc.)
 */
async function logSecurityEvent(req, event, data = {}) {
  const timestamp = new Date().toLocaleString('it-IT');
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  console.log(`🔐 [${timestamp}] SECURITY: ${event}`, {
    ip,
    userAgent: req.get('User-Agent')?.substring(0, 50) || 'unknown',
    ...data
  });
}

/**
 * Log eventi di sistema (operazioni admin, errori, ecc.)
 */
async function logSystemEvent(req, event, data = {}) {
  const timestamp = new Date().toLocaleString('it-IT');

  console.log(`⚙️ [${timestamp}] SYSTEM: ${event}`, data);
}

module.exports = {
  logSecurityEvent,
  logSystemEvent
};
