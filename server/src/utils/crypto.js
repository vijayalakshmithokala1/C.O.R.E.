const crypto = require('crypto');

/**
 * Generates a SHA-256 hash for an audit log entry.
 * @param {string} action 
 * @param {string} details 
 * @param {string} prevHash 
 * @returns {string} 
 */
function generateLogHash(action, details, prevHash) {
  const data = `${action}|${details || ''}|${prevHash || 'GENESIS'}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = { generateLogHash };
