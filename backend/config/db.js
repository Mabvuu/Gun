// backend/config/db.js
require('dotenv').config();

let supabase = null;

// Initialize Supabase if env vars are present
try {
  const { createClient } = require('@supabase/supabase-js');
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase client initialized (config/db.js)');
  } else {
    console.log('ℹ️ Supabase env vars not provided — supabase disabled (config/db.js)');
  }
} catch (err) {
  console.log('ℹ️ Could not initialize @supabase/supabase-js (is it installed?):', err && err.message);
}

// Export a no-op connect() so the rest of the app that calls config.connect() works,
// and expose the supabase client for other modules.
module.exports = {
  connect: async () => {
    // intentionally do NOT attempt any MongoDB connection
    return null;
  },
  supabase,
};
