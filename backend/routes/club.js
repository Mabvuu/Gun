// backend/routes/club.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch'); // ensure node-fetch and form-data are installed
const FormData = require('form-data');
const multer = require('multer');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', 'data.json');

// multer for endorsement uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.random().toString(36).slice(2,8);
    const safeName = (file.originalname || 'file').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9.\-_]/g, '');
    cb(null, `${unique}-${safeName}`);
  }
});
const upload = multer({ storage });

function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { nextId: 1, applications: [] };
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    if (!raw) return { nextId: 1, applications: [] };
    return JSON.parse(raw);
  } catch (e) {
    console.error('readData parse error', e);
    return { nextId: 1, applications: [] };
  }
}
function writeData(obj) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2));
}

// GET /api/club/pending?clubId=club-1
router.get('/pending', (req, res) => {
  try {
    const { clubId } = req.query;
    const data = readData();
    const apps = Array.isArray(data.applications) ? data.applications : [];
    let pending = apps.filter(a => String(a.status || '').toUpperCase() === 'CLUB');
    if (clubId) pending = pending.filter(a => String(a.club || '').toLowerCase() === String(clubId).toLowerCase());
    pending.sort((a,b)=> (b.id || 0) - (a.id || 0));
    return res.json(pending);
  } catch (err) {
    console.error('GET /api/club/pending error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// GET /api/club/:id
router.get('/:id', (req, res) => {
  try {
    const id = String(req.params.id);
    const data = readData();
    const apps = Array.isArray(data.applications) ? data.applications : [];
    const appObj = apps.find(a => String(a.id) === id || String(a.applicationId) === id);
    if (!appObj) return res.status(404).json({ error: 'not found' });
    return res.json(appObj);
  } catch (err) {
    console.error('GET /api/club/:id error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

/**
 * POST /api/club/:id/endorse
 * multipart/form-data: endorsementFile (optional), hoursPracticed, isMember (true/false), endorsedBy, note
 * Saves club endorsement locally and forwards the application to Police (/api/police/receive).
 */
router.post('/:id/endorse', upload.single('endorsementFile'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const data = readData();
    data.applications = data.applications || [];
    const idx = data.applications.findIndex(a => String(a.id) === id || String(a.applicationId) === id);
    if (idx === -1) return res.status(404).json({ error: 'not found' });

    const app = data.applications[idx];

    const { hoursPracticed, isMember, endorsedBy, note } = req.body || {};
    const file = req.file ? { path: `/uploads/${req.file.filename}`, originalName: req.file.originalname } : null;

    app.endorsement = {
      endorsedBy: endorsedBy || 'CLUB_USER',
      hoursPracticed: hoursPracticed ? Number(hoursPracticed) : null,
      isMember: isMember === 'true' || isMember === true,
      note: note || '',
      file
    };

    // record history
    app.history = app.history || [];
    app.history.push({
      by: app.endorsement.endorsedBy,
      role: 'CLUB',
      action: 'ENDORSE',
      at: new Date().toISOString(),
      details: { hoursPracticed: app.endorsement.hoursPracticed, isMember: app.endorsement.isMember }
    });

    // move to next stage: POLICE
    app.status = 'POLICE';

    writeData(data);
    console.log('Club endorsement saved id=', app.id);

    // --- forward to police ---
    try {
      const form = new FormData();
      form.append('applicationId', app.id);
      form.append('applicantId', app.applicantId || '');
      form.append('dealerName', app.dealerName || '');
      form.append('province', app.province || '');
      form.append('town', app.town || '');
      form.append('token', app.token || '');
      form.append('note', app.endorsement.note || app.note || '');
      form.append('endorsedBy', app.endorsement.endorsedBy || '');
      form.append('hoursPracticed', app.endorsement.hoursPracticed ?? '');
      form.append('isMember', app.endorsement.isMember ? 'true' : 'false');

      // attach original applicant file if present (and available on disk)
      if (app.files && app.files.file) {
        try {
          const filePath = path.join(process.cwd(), app.files.file.replace(/^\//, ''));
          if (fs.existsSync(filePath)) {
            form.append('file', fs.createReadStream(filePath), { filename: path.basename(filePath) });
          } else {
            console.warn('original applicant file missing on disk:', filePath);
          }
        } catch (err) {
          console.warn('could not attach original file', err);
        }
      }

      // attach endorsement file we just uploaded
      if (req.file && req.file.path) {
        form.append('endorsementFile', fs.createReadStream(req.file.path), { filename: req.file.originalname || req.file.filename });
      }

      const policeUrl = `${process.env.API_BASE || 'http://localhost:4000'}/api/police/receive`;
      const policeRes = await fetch(policeUrl, {
        method: 'POST',
        headers: form.getHeaders(),
        body: form
      });

      const policeJson = await policeRes.json().catch(()=>null);
      if (!policeRes.ok) {
        console.error('forward to police failed', policeRes.status, policeJson);
        return res.status(500).json({ error: 'failed to forward to police', policeStatus: policeRes.status, policeBody: policeJson });
      }

      return res.json({
        ok: true,
        applicationId: app.id,
        status: app.status,
        forwardedToPolice: true,
        policeRecord: policeJson
      });
    } catch (forwardErr) {
      console.error('error forwarding to police', forwardErr);
      return res.status(500).json({ error: 'endorse saved but failed to forward to police' });
    }
  } catch (err) {
    console.error('POST /api/club/:id/endorse error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// POST /api/club/:id/decline
router.post('/:id/decline', express.json(), (req, res) => {
  try {
    const id = String(req.params.id);
    const { by, reason } = req.body || {};
    const data = readData();
    data.applications = data.applications || [];
    const idx = data.applications.findIndex(a => String(a.id) === id || String(a.applicationId) === id);
    if (idx === -1) return res.status(404).json({ error: 'not found' });
    const app = data.applications[idx];

    app.history = app.history || [];
    app.history.push({ by: by || 'CLUB_USER', role: 'CLUB', action: 'DECLINE', at: new Date().toISOString(), reason: reason || '' });

    app.status = 'CLUB_DECLINED';
    writeData(data);
    console.log('Club declined id=', app.id, 'reason=', reason);
    return res.json({ ok: true, applicationId: app.id, status: app.status });
  } catch (err) {
    console.error('POST /api/club/:id/decline error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
