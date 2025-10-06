const express = require("express");
const router = express.Router();
const Operator = require("../models/Operator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || process.env.OPERATOR_JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || process.env.OPERATOR_JWT_EXPIRES || '1h';

router.post("/", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ msg: "username and password required" });

  try {
    const user = await Operator.findOne({ username: username.toLowerCase() });
    if (!user) return res.status(401).json({ msg: "Invalid login" });

    const hashField = user.passwordHash || user.password; // support either field during migration
    const match = await bcrypt.compare(password, hashField);
    if (!match) return res.status(401).json({ msg: "Invalid login" });

    const payload = {
      sub: user._id.toString(),
      role: user.role || 'user',
      org_id: user.org_id || user.orgId || null,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({
      msg: "Login success",
      role: user.role,
      org_id: payload.org_id,
      token,
    });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
