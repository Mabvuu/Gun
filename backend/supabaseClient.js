// backend/supabaseClient.js
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || null;

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL env var");
if (!SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_ANON_KEY) {
  throw new Error("Provide SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in env");
}

// Use service role key if present (for server-side operations). Falls back to anon if not.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY);

// Export client + storage info
module.exports = {
  supabase,
  bucket: SUPABASE_BUCKET,
  hasServiceRole: Boolean(SUPABASE_SERVICE_ROLE_KEY),
};
