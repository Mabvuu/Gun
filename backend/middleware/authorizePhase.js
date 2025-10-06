// backend/src/middlewares/authorizePhase.js
// Ensure caller's role matches the application's current phase (so they may advance it)
// Usage: attach to POST /applications/:id/advance

const Application = require('../models/Application');
const { ROLE_TO_PHASE } = require('../config/phases');

module.exports = async function authorizePhase(req, res, next) {
  const applicationId = req.params.id;
  const user = req.user;
  if (!user || !user.role) {
    return res.status(403).json({ error: 'User role missing' });
  }

  const allowedPhase = ROLE_TO_PHASE[user.role];
  if (!allowedPhase) {
    return res.status(403).json({ error: 'Unknown role or not allowed to advance' });
  }

  const app = await Application.findById(applicationId).lean();
  if (!app) return res.status(404).json({ error: 'Application not found' });

  if (app.status !== allowedPhase) {
    return res.status(403).json({
      error: 'Your role cannot advance this application at its current stage',
      currentStatus: app.status,
      requiredRolePhase: allowedPhase
    });
  }

  // attach application to req so controller can use without re-fetching (optional)
  req.application = app;
  next();
};
