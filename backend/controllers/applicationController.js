// backend/src/controllers/applicationController.js
const applicationService = require('../services/applicationService');

exports.list = async (req, res, next) => {
  try {
    const role = req.user && req.user.role;
    const apps = await applicationService.listForRole(role);
    res.json(apps);
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const app = await applicationService.getById(req.params.id);
    if (!app) return res.status(404).json({ error: 'Not found' });
    res.json(app);
  } catch (err) {
    next(err);
  }
};

exports.advance = async (req, res, next) => {
  try {
    // req.application (lean) is set by authorizePhase but let's reload inside service to get a session-safe doc
    const user = req.user;
    const payload = {
      comment: req.body.comment || '',
      additions: req.body.additions || {},   // optional role-specific additions
      documents: req.body.documents || []    // optional documents array
    };
    const result = await applicationService.advance(req.params.id, user, payload);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
