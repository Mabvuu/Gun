
// backend/cfr.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'cfr');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = (file.originalname || 'file').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`);
  }
});
const upload = multer({ storage });

/**
 * Simple in-memory store for CFR applications.
 * Replace with DB/persistent store for production.
 */
const CFR_DB = {
  apps: []
};

function findApp(id) {
  return CFR_DB.apps.find(a => String(a.id) === String(id));
}

/**
 * POST /api/cfr/receive
 * Accepts multipart/form-data (or form-encoded) to create a CFR record.
 * Expected fields (forwarded from int):
 *  - applicationId (optional)
 *  - applicantId
 *  - dealerName
 *  - province
 *  - town
 *  - token
 *  - note
 *  - receivedFromInt (string)
 * Files:
 *  - file (applicant original)
 *  - endorsementFile (club endorsement)
 *  - certificateFile (police certificate)
 *  - licenseFile (province license)
 *  - finalFile (int final file)
 */
router.post('/receive', upload.fields([
  { name: 'file' },
  { name: 'endorsementFile' },
  { name: 'certificateFile' },
  { name: 'licenseFile' },
  { name: 'finalFile' }
]), (req, res) => {
  try {
    const body = req.body || {};
    const files = req.files || {};

    const id = body.applicationId || `cfr-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    if (findApp(id)) return res.status(400).json({ error: 'application already exists' });

    const app = {
      id,
      applicantId: body.applicantId || null,
      dealerName: body.dealerName || null,
      token: body.token || null,
      province: body.province || null,
      town: body.town || null,
      note: body.note || null,
      receivedFromInt: body.receivedFromInt || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      files: {}
    };

    if (files.file && files.file[0]) app.files.file = `/uploads/cfr/${path.basename(files.file[0].path)}`;
    if (files.endorsementFile && files.endorsementFile[0]) app.files.endorsementFile = `/uploads/cfr/${path.basename(files.endorsementFile[0].path)}`;
    if (files.certificateFile && files.certificateFile[0]) app.files.certificateFile = `/uploads/cfr/${path.basename(files.certificateFile[0].path)}`;
    if (files.licenseFile && files.licenseFile[0]) app.files.licenseFile = `/uploads/cfr/${path.basename(files.licenseFile[0].path)}`;
    if (files.finalFile && files.finalFile[0]) app.files.finalFile = `/uploads/cfr/${path.basename(files.finalFile[0].path)}`;

    CFR_DB.apps.push(app);
    return res.json(app);
  } catch (err) {
    console.error('cfr.receive error', err);
    return res.status(500).json({ error: 'failed to receive application' });
  }
});

/**
 * GET /api/cfr/pending
 * Optional query: province, town, status
 */
router.get('/pending', (req, res) => {
  try {
    const { province, town, status } = req.query;
    let results = CFR_DB.apps.slice().reverse(); // newest first
    if (province) results = results.filter(a => String(a.province || '').toLowerCase() === String(province).toLowerCase());
    if (town) results = results.filter(a => String(a.town || '').toLowerCase() === String(town).toLowerCase());
    if (status) results = results.filter(a => String(a.status || '').toLowerCase() === String(status).toLowerCase());
    else results = results.filter(a => a.status === 'pending');
    return res.json(results);
  } catch (err) {
    console.error('cfr.pending error', err);
    return res.status(500).json({ error: 'failed to list pending' });
  }
});

/**
 * GET /api/cfr/:id
 */
router.get('/:id', (req, res) => {
  const app = findApp(req.params.id);
  if (!app) return res.status(404).json({ error: 'not found' });
  return res.json(app);
});

/**
 * POST /api/cfr/:id/approve
 * Accepts multipart/form-data:
 *  - officerId
 *  - note
 *  - cfrFile (optional PDF) -- final CFR document
 * Marks status 'approved' and attaches cfrFile if provided.
 */
router.post('/:id/approve', upload.single('cfrFile'), (req, res) => {
  try {
    const app = findApp(req.params.id);
    if (!app) return res.status(404).json({ error: 'not found' });
    if (app.status === 'approved') return res.status(400).json({ error: 'already approved' });

    app.status = 'approved';
    app.approvedByCfr = req.body.officerId || null;
    app.cfrNote = req.body.note || null;
    app.approvedAt = new Date().toISOString();

    if (req.file) {
      app.files = app.files || {};
      app.files.cfrFile = `/uploads/cfr/${path.basename(req.file.path)}`;
    }

    return res.json(app);
  } catch (err) {
    console.error('cfr.approve error', err);
    return res.status(500).json({ error: 'approve failed' });
  }
});

/**
 * POST /api/cfr/:id/decline
 * Accepts JSON or form body: { by, reason }.
 */
router.post('/:id/decline', express.json(), (req, res) => {
  try {
    const app = findApp(req.params.id);
    if (!app) return res.status(404).json({ error: 'not found' });
    if (app.status === 'declined') return res.status(400).json({ error: 'already declined' });

    const by = req.body.by || req.body.officerId || null;
    const reason = req.body.reason || req.body.note || 'Declined at CFR stage';

    app.status = 'declined';
    app.declinedByCfr = by;
    app.declineReasonCfr = reason;
    app.declinedAt = new Date().toISOString();

    return res.json({ ok: true });
  } catch (err) {
    console.error('cfr.decline error', err);
    return res.status(500).json({ error: 'decline failed' });
  }
});

module.exports = router;

