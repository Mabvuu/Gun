
// backend/int.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'int');
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
 * Simple in-memory store for intermediate (int) applications.
 * Replace with DB or persistent store in production.
 */
const INT_DB = {
  apps: []
};

function findApp(id) {
  return INT_DB.apps.find(a => String(a.id) === String(id));
}

/**
 * POST /api/int/receive
 * Accepts multipart/form-data (or form-encoded) to create an int record.
 * Expected fields (when forwarded from province):
 *  - applicationId (optional)
 *  - applicantId
 *  - dealerName
 *  - province
 *  - town
 *  - token
 *  - note
 *  - approvedByProvince (string)
 * Files:
 *  - file (applicant original)
 *  - endorsementFile (club endorsement)
 *  - certificateFile (police certificate)
 *  - licenseFile (province license) - optional
 */
router.post('/receive', upload.fields([{ name: 'file' }, { name: 'endorsementFile' }, { name: 'certificateFile' }, { name: 'licenseFile' }]), (req, res) => {
  try {
    const body = req.body || {};
    const files = req.files || {};

    const id = body.applicationId || `int-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    if (findApp(id)) return res.status(400).json({ error: 'application already exists' });

    const app = {
      id,
      applicantId: body.applicantId || null,
      dealerName: body.dealerName || null,
      token: body.token || null,
      province: body.province || null,
      town: body.town || null,
      note: body.note || null,
      receivedFromProvince: body.approvedByProvince || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      files: {}
    };

    if (files.file && files.file[0]) app.files.file = `/uploads/int/${path.basename(files.file[0].path)}`;
    if (files.endorsementFile && files.endorsementFile[0]) app.files.endorsementFile = `/uploads/int/${path.basename(files.endorsementFile[0].path)}`;
    if (files.certificateFile && files.certificateFile[0]) app.files.certificateFile = `/uploads/int/${path.basename(files.certificateFile[0].path)}`;
    if (files.licenseFile && files.licenseFile[0]) app.files.licenseFile = `/uploads/int/${path.basename(files.licenseFile[0].path)}`;

    INT_DB.apps.push(app);
    return res.json(app);
  } catch (err) {
    console.error('int.receive error', err);
    return res.status(500).json({ error: 'failed to receive application' });
  }
});

/**
 * GET /api/int/pending
 * Optional query: province, town, status
 */
router.get('/pending', (req, res) => {
  try {
    const { province, town, status } = req.query;
    let results = INT_DB.apps.slice().reverse(); // newest first
    if (province) results = results.filter(a => String(a.province || '').toLowerCase() === String(province).toLowerCase());
    if (town) results = results.filter(a => String(a.town || '').toLowerCase() === String(town).toLowerCase());
    if (status) results = results.filter(a => String(a.status || '').toLowerCase() === String(status).toLowerCase());
    else results = results.filter(a => a.status === 'pending');
    return res.json(results);
  } catch (err) {
    console.error('int.pending error', err);
    return res.status(500).json({ error: 'failed to list pending' });
  }
});

/**
 * GET /api/int/:id
 */
router.get('/:id', (req, res) => {
  const app = findApp(req.params.id);
  if (!app) return res.status(404).json({ error: 'not found' });
  return res.json(app);
});

/**
 * POST /api/int/:id/approve
 * Accepts multipart/form-data:
 *  - officerId
 *  - note
 *  - finalFile (optional PDF) -- file produced at this stage
 * Marks status 'approved' and attaches finalFile if provided.
 */
router.post('/:id/approve', upload.single('finalFile'), (req, res) => {
  try {
    const app = findApp(req.params.id);
    if (!app) return res.status(404).json({ error: 'not found' });
    if (app.status === 'approved') return res.status(400).json({ error: 'already approved' });

    app.status = 'approved';
    app.approvedByInt = req.body.officerId || null;
    app.intNote = req.body.note || null;
    app.approvedAt = new Date().toISOString();

    if (req.file) {
      app.files = app.files || {};
      app.files.finalFile = `/uploads/int/${path.basename(req.file.path)}`;
    }

    return res.json(app);
  } catch (err) {
    console.error('int.approve error', err);
    return res.status(500).json({ error: 'approve failed' });
  }
});

/**
 * POST /api/int/:id/decline
 * Accepts JSON or form body: { by, reason }.
 */
router.post('/:id/decline', express.json(), (req, res) => {
  try {
    const app = findApp(req.params.id);
    if (!app) return res.status(404).json({ error: 'not found' });
    if (app.status === 'declined') return res.status(400).json({ error: 'already declined' });

    const by = req.body.by || req.body.officerId || null;
    const reason = req.body.reason || req.body.note || 'Declined at int stage';

    app.status = 'declined';
    app.declinedByInt = by;
    app.declineReasonInt = reason;
    app.declinedAt = new Date().toISOString();

    return res.json({ ok: true });
  } catch (err) {
    console.error('int.decline error', err);
    return res.status(500).json({ error: 'decline failed' });
  }
});

module.exports = router;
