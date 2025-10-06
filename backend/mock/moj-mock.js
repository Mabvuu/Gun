// backend/mock/moj-mock.js
// Simple local mock for the MoJ feed. POST /moj-check returns { flagged: boolean, reason?: string }
const express = require('express');
const app = express();
app.use(express.json());

/**
 * Behavior:
 * - If request body contains { forceFlag: true } => returns flagged:true
 * - If applicant_id equals one of the entries in BLOCKLIST => flagged:true (simulates a match)
 * - Otherwise returns flagged:false
 */
const BLOCKLIST = new Set(['bad-applicant-1', 'bad-applicant-2', '12345']);

app.post('/moj-check', (req, res) => {
  const body = req.body || {};
  const applicantId = String(body.applicant_id || body.applicant || '').trim();
  const forceFlag = !!body.forceFlag || req.query.force === '1';

  if (forceFlag || BLOCKLIST.has(applicantId)) {
    return res.json({ flagged: true, reason: forceFlag ? 'forced flag' : 'match on watchlist' });
  }

  // default: cleared
  return res.json({ flagged: false });
});

const PORT = Number(process.env.MOJ_MOCK_PORT || 5000);
app.listen(PORT, () => console.log(`MoJ mock running on http://localhost:${PORT}/moj-check`));
