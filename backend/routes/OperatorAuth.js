const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const connectDB = require('../config/db');

const router = express.Router();

const COLLECTION = process.env.OPERATOR_COLLECTION || 'operators';
const JWT_SECRET = process.env.OPERATOR_JWT_SECRET || process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.OPERATOR_JWT_EXPIRES || process.env.JWT_EXPIRES || '1h';

router.post('/operator-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const db = await connectDB();
    const col = db.collection(COLLECTION);

    const doc = await col.findOne({ email: email.toLowerCase() });
    if (!doc) return res.status(401).json({ error: 'Invalid credentials' });

    const hashField = doc.passwordHash || doc.password;
    const ok = await bcrypt.compare(password, hashField);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const payload = {
      sub: doc._id.toString(),
      email: doc.email,
      role: doc.role || 'operator',
      org_id: doc.org_id || doc.orgId || null,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    return res.json({
      token,
      profile: { email: doc.email, role: doc.role, org_id: payload.org_id, meta: doc.meta || {} },
    });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
