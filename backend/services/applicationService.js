// backend/src/services/applicationService.js
// Core worker: checks rules and updates the application in a single transaction
const { mongoose } = require('../config/db');
const Application = require('../models/Application');
const { PHASES, ROLE_TO_PHASE } = require('../config/phases');
const eventEmitter = require('../utils/eventEmitter');
const logger = require('../utils/logger');

async function listForRole(role) {
  const phase = ROLE_TO_PHASE[role];
  if (!phase) return [];
  return Application.find({ status: phase }).lean().sort({ updatedAt: -1 }).exec();
}

async function getById(id) {
  return Application.findById(id).lean();
}

/**
 * Advance application to the next phase.
 * - applicationId: string
 * - user: { id, role, name }
 * - payload: { comment, additions, documents }
 */
async function advance(applicationId, user, payload = {}) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // load the document with the session (not lean)
    const app = await Application.findById(applicationId).session(session);
    if (!app) {
      throw Object.assign(new Error('Application not found'), { status: 404 });
    }

    const userPhase = ROLE_TO_PHASE[user.role];
    if (!userPhase) {
      throw Object.assign(new Error('Invalid user role'), { status: 403 });
    }

    if (app.status !== userPhase) {
      throw Object.assign(new Error('Role cannot advance this application at its current stage'), { status: 403 });
    }

    const currentIndex = PHASES.indexOf(app.status);
    if (currentIndex === -1) {
      throw Object.assign(new Error('Application has unknown status'), { status: 400 });
    }

    if (currentIndex === PHASES.length - 1) {
      throw Object.assign(new Error('Application already at final phase'), { status: 400 });
    }

    const nextPhase = PHASES[currentIndex + 1];

    // apply additions (merge) and documents push
    if (payload.additions && typeof payload.additions === 'object') {
      // merge under sections[user.role]
      app.sections = app.sections || {};
      app.sections[user.role] = Object.assign({}, app.sections[user.role] || {}, payload.additions);
    }

    if (Array.isArray(payload.documents) && payload.documents.length) {
      app.documents = app.documents.concat(payload.documents);
    }

    // append history entry
    app.history.push({
      by: user.id || user.name || 'unknown',
      role: user.role,
      from: app.status,
      to: nextPhase,
      comment: payload.comment || ''
    });

    // update status and bump version
    app.status = nextPhase;
    app.version = (app.version || 0) + 1;

    await app.save({ session });

    await session.commitTransaction();
    session.endSession();

    // emit event outside transaction
    eventEmitter.emit('application.advanced', { applicationId: app._id.toString(), by: user, to: nextPhase });

    logger.info(`Application ${applicationId} advanced to ${nextPhase} by ${user.role}/${user.id || user.name}`);

    return app.toObject();
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

module.exports = {
  listForRole,
  getById,
  advance
};
