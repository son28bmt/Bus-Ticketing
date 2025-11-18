const crypto = require('crypto');

/**
 * Lightweight QR generator placeholder.
 * Returns a base64-encoded string that can be rendered as data URL on the frontend.
 * Replace with a real QR library (e.g., qrcode) when available.
 */
const generateTicketQr = async (payload) => {
  const normalized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const checksum = crypto.createHash('sha256').update(normalized).digest('hex');
  const buffer = Buffer.from(JSON.stringify({ payload: normalized, checksum }));
  return `data:text/plain;base64,${buffer.toString('base64')}`;
};

module.exports = {
  generateTicketQr,
};
