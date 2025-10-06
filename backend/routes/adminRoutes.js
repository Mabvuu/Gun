// routes/adminRoutes.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase service role key missing in env');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * POST /admin/approve-role
 * Body: { user_id: string, role: string }
 * This endpoint should be protected (e.g., only accessible by real admins).
 * For now, ensure it's not publicly accessible in production.
 */
router.post('/approve-role', async (req, res) => {
  try {
    const { user_id, role } = req.body;
    if (!user_id || !role) return res.status(400).json({ error: 'user_id and role required' });

    // Validate requested role on server if you want to only allow specific roles
    const allowed = ['dealer','police','district','province','club','officer','intel'];
    if (!allowed.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Update the profile's role (service role bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role, updated_at: new Date() })
      .eq('user_id', user_id);

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ success: true, data });
  } catch (err) {
    console.error('Approve role error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
