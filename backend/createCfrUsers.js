// scripts/createCfrUsers.js
// Usage: copy .env.example -> .env, fill values, then: node scripts/createCfrUsers.js

require('dotenv').config();
const fetch = global.fetch || require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE;
const CFR_EMAILS = process.env.CFR_EMAILS || '';
const CFR_PASSWORD = process.env.CFR_PASSWORD;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !CFR_EMAILS || !CFR_PASSWORD) {
  console.error('Missing required env vars. See .env.example');
  process.exit(1);
}

const emails = CFR_EMAILS.split(',').map(e => e.trim()).filter(Boolean);

async function createAuthUser(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true
    })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Auth create failed for ${email}: ${JSON.stringify(json)}`);
  return json.id;
}

async function insertProfile(userId, email) {
  const payload = {
    user_id: userId,
    email,
    role: 'cfr',
    requested_role: 'cfr',
    created_at: new Date().toISOString()
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Insert profile failed for ${email}: ${JSON.stringify(json)}`);
  return json;
}

(async () => {
  for (const email of emails) {
    try {
      console.log(`Creating auth user: ${email}`);
      const userId = await createAuthUser(email, CFR_PASSWORD);
      console.log(`-> created user id: ${userId}`);

      console.log(`Inserting profile for: ${email}`);
      const profile = await insertProfile(userId, email);
      console.log('-> profile result:', profile);
    } catch (err) {
      console.error('ERROR for', email, err.message || err);
    }
  }
})();
