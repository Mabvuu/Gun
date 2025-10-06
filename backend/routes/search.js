// backend/routes/search.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { supabase } = require('../supabaseClient'); // ensure this exports a configured supabase client

const DEALER_API_KEY = process.env.DEALER_API_KEY || null;
const OPERATOR_JWT_SECRET = process.env.OPERATOR_JWT_SECRET || null;

// Verify a Bearer JWT using OPERATOR_JWT_SECRET
function verifyJwt(bearer) {
  if (!bearer) return null;
  const token = typeof bearer === 'string' ? bearer.replace(/^Bearer\s+/i, '').trim() : null;
  if (!token || !OPERATOR_JWT_SECRET) return null;
  try {
    const payload = jwt.verify(token, OPERATOR_JWT_SECRET);
    return payload;
  } catch (err) {
    return null;
  }
}

// requireDealer: only allow when dealer key matches OR JWT verifies OR sb cookie present and verifies
function requireDealer(req, res, next) {
  // Do NOT bypass in production; allow an explicit env override only if set to "true"
  const ALLOW_BYPASS = process.env.DEV_BYPASS_AUTH === 'true';
  if (process.env.NODE_ENV === 'development' && ALLOW_BYPASS) {
    console.info('[requireDealer] development bypass enabled');
    return next();
  }

  const dealerKeyHeader = req.header('x-dealer-api-key') || req.query.dealer_key || null;
  const authHeader = req.header('authorization') || req.header('Authorization') || null;
  const cookieToken = (req.cookies && (req.cookies['sb-access-token'] || req.cookies['sb:token'])) || null;

  console.info('[requireDealer] headers seen:', {
    hasDealerKeyHeader: !!dealerKeyHeader,
    hasAuthHeader: !!authHeader,
    hasCookieToken: !!cookieToken,
    path: req.path,
    method: req.method
  });

  // 1) Dealer key exact match
  if (dealerKeyHeader && DEALER_API_KEY && dealerKeyHeader === DEALER_API_KEY) {
    return next();
  }

  // 2) Bearer JWT verification
  const jwtPayload = verifyJwt(authHeader);
  if (jwtPayload) {
    req.auth = { type: 'jwt', payload: jwtPayload };
    return next();
  }

  // 3) Cookie token — try verify if present
  if (cookieToken) {
    const cookiePayload = verifyJwt(cookieToken);
    if (cookiePayload) {
      req.auth = { type: 'cookie', payload: cookiePayload };
      return next();
    }
  }

  // Deny if none matched
  console.warn('[requireDealer] forbidden: no valid dealer key or JWT');
  return res.status(403).json({ error: 'Forbidden' });
}

/**
 * GET /api/search?q=...&limit=8&page=1&field=any|full_name|id_number|applicant_id
 */
router.get('/', requireDealer, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit || '8', 10), 1), 200);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const field = req.query.field || 'any';

    if (!q) {
      const { data, error, count } = await supabase
        .from('profiles')
        .select('id,applicant_id,full_name,id_number,phone,pdf1_path,created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return res.json({ results: data || [], total: count || 0, page, limit });
    }

    const pattern = `%${q}%`;
    if (['full_name', 'id_number', 'applicant_id'].includes(field)) {
      const { data, error, count } = await supabase
        .from('profiles')
        .select('id,applicant_id,full_name,id_number,phone,pdf1_path,created_at', { count: 'exact' })
        .ilike(field, pattern)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return res.json({ results: data || [], total: count || 0, page, limit });
    }

    const orQuery = `full_name.ilike.${pattern},id_number.ilike.${pattern},applicant_id.ilike.${pattern}`;
    const { data, error, count } = await supabase
      .from('profiles')
      .select('id,applicant_id,full_name,id_number,phone,pdf1_path,created_at', { count: 'exact' })
      .or(orQuery)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    res.json({ results: data || [], total: count || 0, page, limit });
  } catch (err) {
    console.error('GET /api/search error:', err && err.stack || err);
    res.status(500).json({ error: err.message || 'Search failed' });
  }
});

module.exports = router;
