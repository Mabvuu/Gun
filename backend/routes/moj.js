// backend/routes/moj.js
const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', 'data.json');

function loadFromFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return Array.isArray(parsed.applications) ? parsed.applications : [];
  } catch (e) {
    console.error('moj.loadFromFile error', e && e.message);
    return [];
  }
}

// GET /api/moj/pending
router.get('/pending', (req, res) => {
  try {
    const { province, town } = req.query;
    const apps = loadFromFile();
    let pending = apps.filter(a => (a.status || '').toUpperCase() === 'MOJ');
    if (province) pending = pending.filter(a => String(a.province || '').toLowerCase() === String(province).toLowerCase());
    if (town) pending = pending.filter(a => String(a.town || '').toLowerCase() === String(town).toLowerCase());
    pending.sort((a,b) => (b.id || 0) - (a.id || 0));
    return res.json(pending);
  } catch (err) {
    console.error('GET /api/moj/pending error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// GET /api/moj/:id
router.get('/:id', (req, res) => {
  try {
    const id = String(req.params.id);
    const apps = loadFromFile();
    const appObj = apps.find(a => String(a.id) === id || String(a.applicationId) === id);
    if (!appObj) return res.status(404).json({ error: 'not found' });
    return res.json(appObj);
  } catch (err) {
    console.error('GET /api/moj/:id error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
