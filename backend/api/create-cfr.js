// api/create-cfr.js
// Deploy to Vercel/Netlify as a serverless function.
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_ENDPOINT_SECRET

export default async function handler(req, res) {
  const SECRET = process.env.ADMIN_ENDPOINT_SECRET;
  if (!SECRET) return res.status(500).send("Missing ADMIN_ENDPOINT_SECRET");
  const okHeader = req.headers["x-admin-secret"];
  if (!okHeader || okHeader !== SECRET) return res.status(401).send("Unauthorized");

  const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).send("Missing supabase env");

  try {
    // create auth user
    const createResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "cfr@example.com",
        password: "123CFR@example",
        email_confirm: true,
        user_metadata: { role: "cfr" },
      }),
    });
    const createJson = await createResp.json();
    if (!createResp.ok) return res.status(500).json({ error: createJson });

    const userId = createJson.id;
    if (!userId) return res.status(500).json({ error: "No user id returned" });

    // insert profiles row (adjust columns to your schema)
    const profileResp = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: "POST",
      headers: {
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify([{
        user_id: userId,
        role: "cfr",
        email: "cfr@example.com",
        created_at: new Date().toISOString()
      }])
    });

    const profileJson = await profileResp.json();
    if (!profileResp.ok) {
      // still return created user id so you can debug
      return res.status(500).json({ user: createJson, profileError: profileJson });
    }

    return res.status(200).json({ user: createJson, profile: profileJson });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
