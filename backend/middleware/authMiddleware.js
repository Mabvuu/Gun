// backend/src/middlewares/auth.js
// Unified auth middleware:
// - DEV shortcut via x-dealer-api-key or x-dev-token (development only or when header provided)
// - Operator JWT verification (OPERATOR_JWT_SECRET)
// - Supabase server-side token check via supabaseAdmin.auth.getUser(token)
// - Fallback: verify token as JWT with JWT_SECRET / SUPABASE_JWT_SECRET
// Attaches req.user with sensible fields or returns 401/500 as appropriate.

require('dotenv').config();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
let logger;
try {
  logger = require('../utils/logger');
} catch (e) {
  // lightweight fallback
  logger = {
    warn: (...args) => console.warn(...args),
    info: (...args) => console.info(...args),
    error: (...args) => console.error(...args),
  };
}

const SUPABASE_URL = process.env.SUPABASE_URL || null;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || null;
const OPERATOR_JWT_SECRET = process.env.OPERATOR_JWT_SECRET || null;
const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'change-me-to-secure-secret';

let supabaseAdmin = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  } catch (e) {
    logger.warn('Failed to create Supabase admin client', e && e.message);
    supabaseAdmin = null;
  }
}

module.exports = async function auth(req, res, next) {
  try {
    // DEV shortcut: allow explicit dev headers or when NODE_ENV=development
    const devHeader = req.headers['x-dealer-api-key'] || req.headers['x-dev-token'];
    if (process.env.NODE_ENV === 'development' || devHeader) {
      if (devHeader === 'dev-key-123' || process.env.ALLOW_DEV_SHORTCUT === 'true') {
        req.user = { id: 'dev-user', email: null, role: 'moj_flag', isDev: true };
        return next();
      }
    }

    // Extract token from Authorization header or cookie
    let token = null;
    const authHeader = req.headers.authorization || '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }

    if (!token) {
      if (req.cookies && req.cookies['sb-access-token']) {
        token = req.cookies['sb-access-token'];
      } else if (req.headers.cookie) {
        const cookie = req.headers.cookie
          .split(';')
          .map(c => c.trim())
          .find(c => c.startsWith('sb-access-token='));
        if (cookie) token = decodeURIComponent(cookie.split('=')[1]);
      }
    }

    if (!token) {
      // No token found — respond 401
      return res.status(401).json({ error: 'Missing token' });
    }

    // 1) Try Operator token (if configured)
    if (OPERATOR_JWT_SECRET) {
      try {
        const payload = jwt.verify(token, OPERATOR_JWT_SECRET);
        req.user = {
          id: payload.sub || payload.user_id || payload.uid || null,
          email: payload.email || null,
          role: payload.role || payload.user_role || null,
          isOperator: true,
          raw: payload
        };
        return next();
      } catch (opErr) {
        // not an operator token — continue
      }
    }

    // 2) Try Supabase admin validation (if client configured)
    if (supabaseAdmin && typeof supabaseAdmin.auth?.getUser === 'function') {
      try {
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && data && data.user) {
          const user = data.user;
          // try to fetch profile (optional)
          let profile = null;
          if (supabaseAdmin.from) {
            try {
              const { data: pData, error: pErr } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('user_id', user.id)
                .limit(1)
                .single();
              if (!pErr && pData) profile = pData;
            } catch (pFetchErr) {
              logger.warn('Profile fetch failed', pFetchErr && pFetchErr.message);
            }
          }

          req.user = {
            id: user.id,
            email: user.email || null,
            role: profile?.role || (user.user_metadata && user.user_metadata.role) || null,
            profile: profile || null,
            raw: user
          };
          return next();
        }
        // else fallthrough to JWT verify fallback
      } catch (supErr) {
        logger.warn('Supabase admin token check failed', supErr && supErr.message);
        // continue to fallback verifications
      }
    }

    // 3) Fallback: try verifying token as a plain JWT with known secret(s)
    if (JWT_SECRET) {
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        // If original simple auth expected { sub, role, name }, map accordingly
        req.user = {
          id: payload.sub || payload.user_id || payload.uid || null,
          role: payload.role || payload.user_role || null,
          name: payload.name || payload.email || payload.sub || null,
          raw: payload
        };
        return next();
      } catch (jwtErr) {
        logger.warn('JWT fallback verify failed', jwtErr && jwtErr.message);
      }
    }

    // If we reach here, token verification failed
    return res.status(401).json({ error: 'Invalid token' });
  } catch (err) {
    logger.error('Auth middleware error', err && err.message);
    if (err && err.message && err.message.toLowerCase().includes('secret')) {
      return res.status(500).json({ error: 'Server auth misconfiguration' });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
