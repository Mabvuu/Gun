// backend/routes/mojApplication.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// ensure uploads dir
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// multer setup (destination must call cb)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.random().toString(36).slice(2,8);
    cb(null, `${unique}-${file.originalname.replace(/\s+/g, '_')}`);
  }
});
const upload = multer({ storage });

// Fallback persistence file
const DATA_FILE = path.join(__dirname, '..', 'data.json');

// helper: read/write data.json safely
function readDataFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { nextId: 1, applications: [] };
    const raw = fs.readFileSync(DATA_FILE, 'utf8') || '{}';
    return JSON.parse(raw);
  } catch (e) {
    return { nextId: 1, applications: [] };
  }
}
function writeDataFile(obj) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2));
}

// POST /api/applications
// NOTE: no auth/verify middleware here — accepts dealer submissions in dev
router.post('/', upload.single('file'), async (req, res) => {
  try {
    console.log('mojApplication POST headers content-type:', req.get('content-type'));
    console.log('mojApplication POST body keys:', Object.keys(req.body || {}));
    console.log('mojApplication POST file present:', !!req.file);

    const { dealerName, token, province, town, applicantId, note } = req.body;

    // Create application object and ensure status is MOJ so pending endpoint will pick it up
    const data = readDataFile();
    data.applications = data.applications || [];

    const id = data.nextId || 1;
    const application = {
      id,
      dealerName: dealerName || 'UNKNOWN',
      token: token || '',
      province: province || '',
      town: town || '',
      applicantId: applicantId || '',
      note: note || '',
      file: req.file ? { path: `/uploads/${req.file.filename}`, originalName: req.file.originalname } : null,
      status: 'MOJ',
      flagged: false,
      history: [{ by: dealerName || 'UNKNOWN', role: 'DEALER', action: 'SUBMIT', at: new Date().toISOString() }]
    };

    data.applications.push(application);
    data.nextId = id + 1;
    writeDataFile(data);

    console.log('mojApplication saved id=', application.id);
    return res.status(201).json({ applicationId: application.id, status: application.status });
  } catch (err) {
    console.error('ERROR in mojApplication POST', err);
    return res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
