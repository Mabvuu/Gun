// backend/routes/dealerApplicants.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

// simple dealer auth middleware — replace with your real auth
function requireDealer(req, res, next) {
  const key = req.header('x-dealer-api-key');
  if (!key || key !== process.env.DEALER_API_KEY) return res.status(403).json({ error: 'Forbidden' });
  next();
}

// GET /api/dealer/applicants?limit=50&page=1
router.get('/', requireDealer, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 500);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('profiles')
      .select('id,applicant_id,full_name,id_number,phone,pdf1_path,pdf2_path,created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    res.json({ results: data || [], total: count || 0, page, limit });
  } catch (err) {
    console.error('GET /api/dealer/applicants error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

module.exports = router;
