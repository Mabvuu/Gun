// backend/police.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // ensure installed: npm i node-fetch
const FormData = require('form-data'); // ensure installed: npm i form-data

const router = express.Router();

// ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'police');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeName = (file.originalname || 'file').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safeName}`);
  }
});
const upload = multer({ storage });

/**
 * Simple in-memory store for police applications.
 * Replace with a real DB in production.
 */
const POLICE_DB = {
  apps: []
};

function findApp(id) {
  return POLICE_DB.apps.find(a => String(a.id) === String(id));
}

/**
 * POST /api/police/receive
 * Accepts multipart/form-data (or form-encoded) to create a police record.
 */
router.post('/receive', upload.fields([{ name: 'file' }, { name: 'endorsementFile' }]), (req, res) => {
  try {
    const body = req.body || {};
    const files = req.files || {};

    const id = body.applicationId || `pol-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;

    if (findApp(id)) {
      return res.status(400).json({ error: 'application already exists' });
    }

    const app = {
      id,
      applicantId: body.applicantId || body.applicant || null,
      dealerName: body.dealerName || null,
      token: body.token || null,
      province: body.province || null,
      town: body.town || null,
      note: body.note || null,
      endorsedBy: body.endorsedBy || null,
      hoursPracticed: body.hoursPracticed || null,
      isMember: body.isMember === 'true' || body.isMember === true,
      status: 'pending',
      createdAt: new Date().toISOString(),
      files: {}
    };

    if (files.file && files.file[0]) {
      app.files.file = `/uploads/police/${path.basename(files.file[0].path)}`;
    }
    if (files.endorsementFile && files.endorsementFile[0]) {
      app.files.endorsementFile = `/uploads/police/${path.basename(files.endorsementFile[0].path)}`;
    }

    POLICE_DB.apps.push(app);
    return res.json(app);
  } catch (err) {
    console.error('police.receive error', err);
    return res.status(500).json({ error: 'failed to receive application' });
  }
});

/**
 * GET /api/police/pending
 */
router.get('/pending', (req, res) => {
  try {
    const { province, town, status } = req.query;
    let results = POLICE_DB.apps.slice().reverse(); // newest first
    if (province) results = results.filter(a => String(a.province || '').toLowerCase() === String(province).toLowerCase());
    if (town) results = results.filter(a => String(a.town || '').toLowerCase() === String(town).toLowerCase());
    if (status) results = results.filter(a => String(a.status || '').toLowerCase() === String(status).toLowerCase());
    else results = results.filter(a => a.status === 'pending');
    return res.json(results);
  } catch (err) {
    console.error('police.pending error', err);
    return res.status(500).json({ error: 'failed to list pending' });
  }
});

/**
 * GET /api/police/:id
 */
router.get('/:id', (req, res) => {
  const app = findApp(req.params.id);
  if (!app) return res.status(404).json({ error: 'not found' });
  return res.json(app);
});

/**
 * POST /api/police/:id/approve
 * Accepts multipart/form-data:
 *  - officerId
 *  - note
 *  - certificateFile (optional)
 *
 * Marks approved and forwards (best-effort) to /api/province/receive so Province shows the record.
 */
router.post('/:id/approve', upload.single('certificateFile'), async (req, res) => {
  try {
    const app = findApp(req.params.id);
    if (!app) return res.status(404).json({ error: 'not found' });

    // idempotent: return existing approved record
    if (app.status === 'approved') {
      console.log('police.approve: already approved id=', app.id);
      return res.json(app);
    }

    // mark approved locally
    app.status = 'approved';
    app.approvedBy = req.body.officerId || null;
    app.approvalNote = req.body.note || null;
    app.approvedAt = new Date().toISOString();

    if (req.file) {
      app.files = app.files || {};
      app.files.certificateFile = `/uploads/police/${path.basename(req.file.path)}`;
    }

    // Forward to province.receive (best-effort — do not fail approval if forward fails)
    try {
      const form = new FormData();
      form.append('applicationId', app.id);
      form.append('applicantId', app.applicantId || '');
      form.append('dealerName', app.dealerName || '');
      form.append('province', app.province || '');
      form.append('town', app.town || '');
      form.append('token', app.token || '');
      form.append('note', app.approvalNote || app.note || '');

      // attach original applicant file if present on disk
      if (app.files && app.files.file) {
        try {
          const applicantPath = path.join(process.cwd(), app.files.file.replace(/^\//, ''));
          if (fs.existsSync(applicantPath)) {
            form.append('file', fs.createReadStream(applicantPath), { filename: path.basename(applicantPath) });
          } else {
            console.warn('police.approve: applicant file missing on disk:', applicantPath);
          }
        } catch (e) {
          console.warn('police.approve: error attaching applicant file', e && e.message);
        }
      }

      // attach police certificate file we just uploaded
      if (req.file && req.file.path) {
        form.append('certificateFile', fs.createReadStream(req.file.path), { filename: req.file.originalname || path.basename(req.file.path) });
      }

      const provinceUrl = `${process.env.API_BASE || 'http://localhost:4000'}/api/province/receive`;
      const forwardRes = await fetch(provinceUrl, {
        method: 'POST',
        headers: form.getHeaders(),
        body: form
      });

      if (!forwardRes.ok) {
        const body = await forwardRes.text().catch(()=>null);
        console.warn('police.approve: forward to province failed', forwardRes.status, body);
      } else {
        console.log('police.approve: forwarded to province');
      }
    } catch (fwdErr) {
      console.warn('police.approve: forward error', fwdErr && (fwdErr.message || fwdErr));
    }

    return res.json(app);
  } catch (err) {
    console.error('police.approve error', err);
    return res.status(500).json({ error: 'approve failed' });
  }
});

/**
 * POST /api/police/:id/decline
 */
router.post('/:id/decline', express.json(), (req, res) => {
  try {
    const app = findApp(req.params.id);
    if (!app) return res.status(404).json({ error: 'not found' });
    if (app.status === 'declined') return res.status(400).json({ error: 'already declined' });

    const by = req.body.by || req.body.officerId || null;
    const reason = req.body.reason || req.body.note || 'Declined by police';

    app.status = 'declined';
    app.declinedBy = by;
    app.declineReason = reason;
    app.declinedAt = new Date().toISOString();

    return res.json({ ok: true });
  } catch (err) {
    console.error('police.decline error', err);
    return res.status(500).json({ error: 'decline failed' });
  }
});

module.exports = router;
