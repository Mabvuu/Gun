// backend/province.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'province');
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
 * Simple in-memory store for province applications.
 * Replace with DB or shared data file if you want persistence.
 */
const PROVINCE_DB = {
  apps: []
};

function findApp(id) {
  return PROVINCE_DB.apps.find(a => String(a.id) === String(id));
}

/**
 * POST /api/province/receive
 * Accepts multipart/form-data (or form-encoded) to create a province record.
 * Fields expected (when forwarded from police):
 *  - applicationId (optional)
 *  - applicantId
 *  - dealerName
 *  - province
 *  - town
 *  - token
 *  - note
 *  - approvedBy (string)
 * Files:
 *  - file (applicant original)
 *  - endorsementFile (club endorsement)
 *  - certificateFile (police certificate / license draft) - optional
 */
router.post('/receive', upload.fields([{ name: 'file' }, { name: 'endorsementFile' }, { name: 'certificateFile' }]), (req, res) => {
  try {
    const body = req.body || {};
    const files = req.files || {};

    const id = body.applicationId || `prov-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    if (findApp(id)) return res.status(400).json({ error: 'application already exists' });

    const app = {
      id,
      applicantId: body.applicantId || null,
      dealerName: body.dealerName || null,
      token: body.token || null,
      province: body.province || null,
      town: body.town || null,
      note: body.note || null,
      approvedBy: body.approvedBy || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      files: {}
    };

    if (files.file && files.file[0]) app.files.file = `/uploads/province/${path.basename(files.file[0].path)}`;
    if (files.endorsementFile && files.endorsementFile[0]) app.files.endorsementFile = `/uploads/province/${path.basename(files.endorsementFile[0].path)}`;
    if (files.certificateFile && files.certificateFile[0]) app.files.certificateFile = `/uploads/province/${path.basename(files.certificateFile[0].path)}`;

    PROVINCE_DB.apps.push(app);
    return res.json(app);
  } catch (err) {
    console.error('province.receive error', err);
    return res.status(500).json({ error: 'failed to receive application' });
  }
});

/**
 * GET /api/province/pending
 * Optional query: province, town, status
 */
router.get('/pending', (req, res) => {
  try {
    const { province, town, status } = req.query;
    let results = PROVINCE_DB.apps.slice().reverse();
    if (province) results = results.filter(a => String(a.province || '').toLowerCase() === String(province).toLowerCase());
    if (town) results = results.filter(a => String(a.town || '').toLowerCase() === String(town).toLowerCase());
    if (status) results = results.filter(a => String(a.status || '').toLowerCase() === String(status).toLowerCase());
    else results = results.filter(a => a.status === 'pending');
    return res.json(results);
  } catch (err) {
    console.error('province.pending error', err);
    return res.status(500).json({ error: 'failed to list pending' });
  }
});

/**
 * GET /api/province/:id
 */
router.get('/:id', (req, res) => {
  const app = findApp(req.params.id);
  if (!app) return res.status(404).json({ error: 'not found' });
  return res.json(app);
});

/**
 * POST /api/province/:id/approve
 * Accepts multipart/form-data:
 *  - officerId
 *  - note
 *  - licenseFile (optional PDF) -- final license or certificate
 * Marks status 'approved' and attaches licenseFile if provided.
 *
 * This handler is idempotent: if the application is already approved it returns the existing record (200).
 */
router.post('/:id/approve', upload.single('licenseFile'), (req, res) => {
  try {
    const app = findApp(req.params.id);
    if (!app) return res.status(404).json({ error: 'not found' });

    // If already approved, return the existing app (idempotent)
    if (app.status === 'approved') {
      console.log('province.approve: already approved id=', app.id);
      return res.json(app);
    }

    // mark approved
    app.status = 'approved';
    app.approvedByProvince = req.body.officerId || null;
    app.provinceNote = req.body.note || null;
    app.approvedAt = new Date().toISOString();

    if (req.file) {
      app.files = app.files || {};
      app.files.licenseFile = `/uploads/province/${path.basename(req.file.path)}`;
    }

    return res.json(app);
  } catch (err) {
    console.error('province.approve error', err);
    return res.status(500).json({ error: 'approve failed' });
  }
});

/**
 * POST /api/province/:id/decline
 * Accepts JSON or form body: { by, reason }.
 */
router.post('/:id/decline', express.json(), (req, res) => {
  try {
    const app = findApp(req.params.id);
    if (!app) return res.status(404).json({ error: 'not found' });
    if (app.status === 'declined') return res.status(400).json({ error: 'already declined' });

    const by = req.body.by || req.body.officerId || null;
    const reason = req.body.reason || req.body.note || 'Declined by province';

    app.status = 'declined';
    app.declinedByProvince = by;
    app.declineReasonProvince = reason;
    app.declinedAt = new Date().toISOString();

    return res.json({ ok: true });
  } catch (err) {
    console.error('province.decline error', err);
    return res.status(500).json({ error: 'decline failed' });
  }
});

module.exports = router;
