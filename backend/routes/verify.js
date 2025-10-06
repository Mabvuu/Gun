// routes/verify.js
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const pool = require("../config/db"); // your pg pool

const router = express.Router();

router.post("/", async (req, res) => {
  const { input_type, value, kiosk_id } = req.body;
  if (!input_type || !value) return res.status(400).json({ error: "bad input" });

  const request_id = uuidv4();

  try {
    const idHash = value; // TODO: hash national_id before storing
    const q = await pool.query(
      "SELECT serial, expiry, flags FROM guns WHERE national_id_hash=$1",
      [idHash]
    );

    if (q.rows.length === 0) {
      return res.status(404).json({
        request_id,
        verified: false,
        flags: [{ code: "NOT_REGISTERED", label: "No record" }],
        timestamp: new Date().toISOString(),
      });
    }

    const items = q.rows.map(r => ({
      serial_masked: "XXXX-XXXX-" + r.serial.slice(-4),
      serial_masking_scheme: "last4",
      expiry_date: r.expiry,
      flags: JSON.parse(r.flags || "[]"),
    }));

    res.json({
      request_id,
      verified: true,
      items,
      flags: [],
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

module.exports = router;
