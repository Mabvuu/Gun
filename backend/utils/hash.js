// /backend/utils/hash.js
const crypto = require('crypto');
const SALT = process.env.SERIAL_SALT || 'change-me';
function sha256Hex(input){
  return crypto.createHash('sha256').update(input).digest('hex');
}
function serialHash(serial){
  return '0x' + sha256Hex(serial + SALT);
}
module.exports = { sha256Hex, serialHash };
