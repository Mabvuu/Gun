// backend/config/phases.js
// Order: MOJ -> Club -> Police -> Province -> Intelligence -> CFR -> Operator (final)
const PHASES = [
  "phase1_moj_flag",
  "phase2_club",
  "phase3_police",
  "phase4_province",
  "phase5_intelligence",
  "phase6_cfr",
  "phase7_operator"
];

const ROLE_TO_PHASE = {
  moj_flag: "phase1_moj_flag",
  club: "phase2_club",
  police: "phase3_police",
  province: "phase4_province",
  intelligence: "phase5_intelligence",
  cfr: "phase6_cfr",
  operator: "phase7_operator"
};

module.exports = { PHASES, ROLE_TO_PHASE };
