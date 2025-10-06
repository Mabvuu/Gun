// /backend/utils/supabaseClient.js
const { createClient } = require('@supabase/supabase-js');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase env missing');
const supabase = createClient(url, key);
module.exports = supabase;
