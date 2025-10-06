// backend/config/index.js
// Minimal shim so the app can `require('./config').connect()`.
// It will prefer an existing ./config/db.js export (connect / connectDB / default),
// otherwise it provides a harmless async connect() that returns null.

try {
  const dbModule = require('./db');

  // If the module itself is a function, assume it's the connect function
  if (typeof dbModule === 'function') {
    module.exports.connect = dbModule;
  } else if (dbModule && typeof dbModule.connect === 'function') {
    module.exports.connect = dbModule.connect;
  } else if (dbModule && typeof dbModule.connectDB === 'function') {
    module.exports.connect = dbModule.connectDB;
  } else if (dbModule && typeof dbModule === 'object' && dbModule.default && typeof dbModule.default.connect === 'function') {
    module.exports.connect = dbModule.default.connect;
  } else {
    console.warn('config/index.js: ./config/db.js found but no connect() export — providing noop connect()');
    module.exports.connect = async () => null;
  }
} catch (err) {
  // If ./config/db.js doesn't exist or errored, provide a noop connect so the server doesn't skip it.
  console.warn('config/index.js: could not load ./config/db.js — providing noop connect():', err && err.message);
  module.exports.connect = async () => null;
}
