// backend/helpers/phaseHelpers.js
const { PHASES, ROLE_TO_PHASE } = require('../config/phases');

function computeNextStatus(currentStatus, actorRole) {
  // if new application (no status) => first phase
  if (!currentStatus) return PHASES[0];
  const idx = PHASES.indexOf(currentStatus);
  if (idx === -1) return PHASES[0];
  const next = PHASES[idx + 1] || null;
  if (!next) return null; // already at final
  // allow advance only if actorRole owns the NEXT phase
  if (ROLE_TO_PHASE[actorRole] === next) return next;
  return null;
}

module.exports = { computeNextStatus, PHASES, ROLE_TO_PHASE };
