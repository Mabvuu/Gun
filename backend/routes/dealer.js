// backend/routes/dealer.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Missing Supabase env vars SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// multer temp storage (replace with S3/Supabase storage in production)
const upload = multer({ dest: 'uploads/' });

/**
 * Helper: get actor id from request.
 * If you use real auth, replace with validated token->user lookup.
 * For dev, you can pass x-user-id header.
 */
async function getActorIdFromReq(req) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (token) {
      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data && data.user && data.user.id) return data.user.id;
      } catch (err) {
        console.warn('supabase.auth.getUser failed (continuing to fallback):', err && err.message);
      }
    }

    // dev fallback header
    if (req.headers['x-user-id']) return req.headers['x-user-id'];

    return null;
  } catch (err) {
    console.warn('getActorIdFromReq unexpected error', err && err.message);
    return null;
  }
}

/**
 * GET /api/dealer/guns
 * By default excludes soft-deleted rows (deleted_at IS NULL).
 * If query param include_deleted=true, returns all rows.
 */
router.get('/guns', async (req, res) => {
  try {
    const includeDeleted = (String(req.query.include_deleted || '').toLowerCase() === 'true');

    let query = supabase.from('guns').select('*');
    if (!includeDeleted) query = query.is('deleted_at', null);

    const { data, error } = await query;
    if (error) {
      console.error('GET /guns DB error', error);
      return res.status(500).json({ error: error.message || error });
    }
    res.json(data || []);
  } catch (err) {
    console.error('GET /guns error', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

/**
 * GET /api/dealer/guns/:id
 * By default excludes soft-deleted rows unless query param include_deleted=true.
 */
router.get('/guns/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const includeDeleted = (String(req.query.include_deleted || '').toLowerCase() === 'true');

    let query = supabase.from('guns').select('*').eq('id', id).maybeSingle();
    if (!includeDeleted) {
      // supabase doesn't allow chaining .is after maybeSingle easily; do explicit filter
      query = supabase.from('guns').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
    }

    const { data, error } = await query;
    if (error) {
      console.error('GET /guns/:id DB error', error);
      return res.status(500).json({ error: error.message || error });
    }
    if (!data) return res.status(404).json({ error: 'Gun not found' });
    res.json(data);
  } catch (err) {
    console.error('GET /guns/:id error', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

/**
 * Dummy helper: mint on chain (no metadata URI). Replace with real chain minting code.
 * Returns { tokenId, txHash }.
 */
async function mintOnChain(gunPayload) {
  const tokenId = `tok_${Date.now()}`;
  const txHash = `0xdeadbeef${Date.now()}`;
  return { tokenId, txHash };
}

/**
 * POST /api/dealer/guns/mint
 * Accepts form-data (files + fields) or JSON.
 */
router.post(
  '/guns/mint',
  // Expect up to 1 file each with these names
  upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'importDoc', maxCount: 1 }]),
  async (req, res) => {
    try {
      const actor_id = await getActorIdFromReq(req);
      const isMultipart = !!req.files && Object.keys(req.files).length > 0;

      // Merge body (multipart fields are strings)
      const payload = { ...(req.body || {}) };

      // Attach file names from multer if present
      if (req.files) {
        // debug print
        console.log('req.files keys:', Object.keys(req.files));
        if (req.files.photo && req.files.photo[0]) {
          payload.photo_name = req.files.photo[0].originalname || req.files.photo[0].filename;
        }
        if (req.files.importDoc && req.files.importDoc[0]) {
          payload.import_doc_name = req.files.importDoc[0].originalname || req.files.importDoc[0].filename;
        }
      }

      // If extraFields provided as JSON string, merge it
      if (payload.extraFields && typeof payload.extraFields === 'string') {
        try {
          const parsedExtra = JSON.parse(payload.extraFields);
          Object.assign(payload, parsedExtra);
        } catch (e) {
          console.warn('Could not parse extraFields JSON', e);
        }
      }

      // Debug log - what server sees
      console.log('Mint payload (server sees):', {
        serial: payload.serial,
        model: payload.model,
        make: payload.make,
        year_made: payload.year_made,
        caliber: payload.caliber,
        manufacturer: payload.manufacturer,
        notes: payload.notes,
        photo_name: payload.photo_name,
        import_doc_name: payload.import_doc_name,
        actor_id
      });

      // Build insert payload. Use null for missing numeric fields.
      const insertPayload = {
        serial: (payload.serial !== undefined && payload.serial !== '') ? payload.serial : null,
        model: payload.model ?? null,
        make: payload.make ?? null,
        year_made: (payload.year_made !== undefined && payload.year_made !== '') ? Number(payload.year_made) : null,
        caliber: payload.caliber ?? null,
        manufacturer: payload.manufacturer ?? null,
        notes: payload.notes ?? null,
        photo_name: payload.photo_name ?? null,
        import_doc_name: payload.import_doc_name ?? null,
        status: 'CREATED',
        created_at: new Date().toISOString(),
        ...(actor_id ? { created_by: actor_id } : {}),
      };

      // Insert and return inserted row
      const { data: insertData, error: insertErr } = await supabase
        .from('guns')
        .insert([insertPayload])
        .select() // request returning columns
        .single();

      if (insertErr) {
        console.error('DB insert error (mint):', insertErr);
        return res.status(500).json({ error: insertErr.message || insertErr });
      }

      const createdGun = insertData;
      if (!createdGun || !createdGun.id) {
        console.warn('Insert returned no id; createdGun=', createdGun);
      }

      // Mint on chain (placeholder)
      let mintResult;
      try {
        mintResult = await mintOnChain(createdGun);
      } catch (mintErr) {
        console.error('Mint failed', mintErr);
        await supabase.from('guns').update({ status: 'MINT_FAILED' }).eq('id', createdGun.id);
        return res.status(500).json({ error: 'Mint failed', details: mintErr.message || mintErr });
      }

      // Update gun with on-chain info
      const { error: updErr } = await supabase
        .from('guns')
        .update({
          token_id: mintResult.tokenId,
          tx_hash: mintResult.txHash,
          status: 'MINTED_ONCHAIN',
          updated_at: new Date().toISOString()
        })
        .eq('id', createdGun.id);

      if (updErr) {
        console.warn('Could not update gun with chain info', updErr);
        // continue — we'll still try to fetch the row to return something useful
      }

      // Audit event (best-effort)
      try {
        await supabase.from('audit_events').insert([{
          actor_id: actor_id,
          action: 'MINTED',
          details: { gun_id: createdGun.id, tokenId: mintResult.tokenId },
          timestamp: new Date().toISOString()
        }]);
      } catch (ae) {
        console.warn('Could not write audit event', ae && ae.message);
      }

      // Return updated gun row (fresh fetch)
      const { data: updatedGun, error: selErr } = await supabase
        .from('guns')
        .select('*')
        .eq('id', createdGun.id)
        .single();

      if (selErr) {
        console.warn('Could not fetch updated gun:', selErr);
        // fallback: return createdGun + mintResult so frontend still gets token_id
        return res.status(201).json({
          gun: {
            ...createdGun,
            token_id: mintResult.tokenId,
            tx_hash: mintResult.txHash,
            status: 'MINTED_ONCHAIN'
          },
          note: 'minted — fetch failed'
        });
      }

      return res.status(201).json({ gun: updatedGun });
    } catch (err) {
      console.error('POST /guns/mint unexpected error:', err && err.stack ? err.stack : err);
      res.status(500).json({ error: err.message || String(err) });
    }
  }
);

/**
 * POST /guns/:id/start-sale
 * ... (unchanged implementation you already had)
 */
router.post('/guns/:id/start-sale', async (req, res) => {
  try {
    const actor_id = await getActorIdFromReq(req);
    const gunId = req.params.id;
    const body = req.body || {};

    const salePayload = {
      gun_id: gunId,
      price: body.price || null,
      currency: body.currency || 'USD',
      status: 'ACTIVE',
      created_by: actor_id,
      created_at: new Date().toISOString()
    };

    const { data: saleData, error: saleErr } = await supabase.from('sales').insert([salePayload]).select().single();
    if (saleErr) {
      console.error('Could not create sale', saleErr);
      return res.status(500).json({ error: saleErr.message || saleErr });
    }

    await supabase.from('guns').update({ status: 'FOR_SALE' }).eq('id', gunId);

    try {
      await supabase.from('audit_events').insert([{
        actor_id: actor_id,
        action: 'STARTED_SALE',
        details: { gun_id: gunId, sale_id: saleData.id, price: salePayload.price },
        timestamp: new Date().toISOString()
      }]);
    } catch (ae) {
      console.warn('Audit write failed', ae && ae.message);
    }

    res.json({ sale: saleData });
  } catch (err) {
    console.error('POST /guns/:id/start-sale error', err);
    res.status(500).json({ error: err.message || err });
  }
});

/**
 * POST /guns/:id/transfer
 * ... (unchanged)
 */
router.post('/guns/:id/transfer', async (req, res) => {
  try {
    const actor_id = await getActorIdFromReq(req);
    const gunId = req.params.id;
    const body = req.body || {};

    const transferPayload = {
      gun_id: gunId,
      to_address: body.to_address || null,
      reason: body.reason || null,
      status: 'PENDING',
      created_by: actor_id,
      created_at: new Date().toISOString()
    };

    const { data: transferData, error: transferErr } = await supabase.from('transfers').insert([transferPayload]).select().single();
    if (transferErr) {
      console.error('Could not create transfer', transferErr);
      return res.status(500).json({ error: transferErr.message || transferErr });
    }

    try {
      await supabase.from('audit_events').insert([{
        actor_id: actor_id,
        action: 'TRANSFER_CREATED',
        details: { gun_id: gunId, transfer_id: transferData.id, to: transferPayload.to_address },
        timestamp: new Date().toISOString()
      }]);
    } catch (ae) {
      console.warn('Audit write failed', ae && ae.message);
    }

    res.json({ transfer: transferData });
  } catch (err) {
    console.error('POST /guns/:id/transfer error', err);
    res.status(500).json({ error: err.message || err });
  }
});

/**
 * DELETE /api/dealer/guns/:id
 * Soft-delete a gun row in Postgres (set deleted_at and archived_by).
 * Does NOT touch any on-chain state.
 */
router.delete('/guns/:id', async (req, res) => {
  try {
    const actor_id = await getActorIdFromReq(req);
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    // Ensure the row exists
    const { data: existing, error: fetchErr } = await supabase.from('guns').select('*').eq('id', id).maybeSingle();
    if (fetchErr) {
      console.error('Error fetching gun for delete', fetchErr);
      return res.status(500).json({ error: fetchErr.message || fetchErr });
    }
    if (!existing) return res.status(404).json({ error: 'Gun not found' });

    // Soft-delete: mark deleted_at and archived_by fields
    const updates = {
      deleted_at: new Date().toISOString(),
      archived_by: actor_id ?? null,
      status: 'DELETED_IN_APP',
      updated_at: new Date().toISOString()
    };

    const { data: updated, error: updErr } = await supabase.from('guns').update(updates).eq('id', id).select().single();
    if (updErr) {
      console.error('Error soft-deleting gun', updErr);
      return res.status(500).json({ error: updErr.message || updErr });
    }

    // Audit event
    try {
      await supabase.from('audit_events').insert([{
        actor_id: actor_id,
        action: 'SOFT_DELETE',
        details: { gun_id: id },
        timestamp: new Date().toISOString()
      }]);
    } catch (ae) {
      console.warn('Could not write audit event for soft-delete', ae && ae.message);
    }

    res.json({ deleted: true, gun: updated });
  } catch (err) {
    console.error('DELETE /guns/:id error', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

/**
 * GET /activity
 */
router.get('/activity', async (req, res) => {
  try {
    const [gunsResp, salesResp, transfersResp, eventsResp] = await Promise.all([
      supabase.from('guns').select('*'),
      supabase.from('sales').select('*'),
      supabase.from('transfers').select('*'),
      supabase.from('audit_events').select('*').order('timestamp', { ascending: false }).limit(1000),
    ]);

    const guns = gunsResp.data || [];
    const sales = salesResp.data || [];
    const transfers = transfersResp.data || [];
    const events = eventsResp.data || [];

    const ids = new Set();
    events.forEach(e => e.actor_id && ids.add(e.actor_id));
    guns.forEach(g => g.created_by && ids.add(g.created_by));
    sales.forEach(s => s.created_by && ids.add(s.created_by));
    transfers.forEach(t => t.created_by && ids.add(t.created_by));

    let users = [];
    if (ids.size > 0 && supabase.auth && supabase.auth.admin && typeof supabase.auth.admin.listUsers === 'function') {
      const { data: listUsersRes, error: usersErr } = await supabase.auth.admin.listUsers();
      if (usersErr) {
        console.warn('Could not list users', usersErr.message || usersErr);
        users = [];
      } else {
        users = (listUsersRes || []).filter(u => ids.has(u.id));
      }
    }

    res.json({ users, guns, sales, transfers, events });
  } catch (err) {
    console.error('GET /activity error', err);
    res.status(500).json({ error: err.message || err });
  }
});

module.exports = router;
