// backend/src/utils/eventEmitter.js
const EventEmitter = require('events');
const emitter = new EventEmitter();

// Example: other parts of system can subscribe like
// emitter.on('application.advanced', payload => { /* send notification */ });

module.exports = emitter;
