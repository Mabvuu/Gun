// backend/routes/mojForward.js
const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', 'data.json');

function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { nextId: 1, applications: [] };
    const raw = fs.readFileSync(DATA_FILE, 'utf8') || '{}';
    return JSON.parse(raw);
  } catch (e) {
    console.error('readData error', e && e.message);
    return { nextId: 1, applications: [] };
  }
}
function writeData(obj) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2)); }
  catch (e) { console.error('writeData error', e && e.message); }
}

// POST /api/moj/:id/forward
// body: { by, note, club, province, town, override }
router.post('/:id/forward', express.json(), (req, res) => {
  try {
    const id = String(req.params.id);
    const { by, note, club, province, town, override } = req.body || {};
    const data = readData();
    data.applications = data.applications || [];
    const idx = data.applications.findIndex(a => String(a.id) === id || String(a.applicationId) === id);
    if (idx === -1) return res.status(404).json({ error: 'not found' });

    const app = data.applications[idx];

    // Prevent forwarding if flagged (unless override true)
    if (app.flagged && !override) {
      return res.status(403).json({ error: 'application flagged - cannot forward without override' });
    }

    const finalProvince = province || app.province || '';
    const finalTown = town || app.town || '';

    app.forward = {
      by: by || 'MOJ_USER',
      note: note || '',
      club: club || null,
      province: finalProvince,
      town: finalTown,
      at: new Date().toISOString()
    };

    app.club = club || app.club || null;
    app.province = finalProvince;
    app.town = finalTown;

    app.history = app.history || [];
    app.history.push({
      by: app.forward.by,
      role: 'MOJ',
      action: 'FORWARD',
      at: app.forward.at,
      details: { club: app.club, province: app.province, town: app.town }
    });

    app.status = 'CLUB';

    writeData(data);
    console.log('MOJ forwarded id=', app.id, 'to club=', app.club, 'prov=', app.province, 'town=', app.town);
    return res.json({ ok: true, applicationId: app.id, status: app.status, forwardedTo: app.club });
  } catch (err) {
    console.error('POST /api/moj/:id/forward error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
