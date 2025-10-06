// applicant/applicant.js
// Express router for applicant profile using Supabase (storage + Postgres).
// Usage: const applicantRouter = require('./applicant/applicant');
// app.use('/api', applicantRouter);

const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Environment variables required:
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (server-side), STORAGE_BUCKET (e.g. 'applicant-files')

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'applicant-files';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Immutable (one-time) fields after profile creation — adjust if you want to lock more:
const IMMUTABLE_FIELDS = ['full_name', 'id_number'];

// Helper to get user from Authorization: Bearer <token>
// For dev convenience accepts X-TEST-USER header to impersonate.
async function getUserFromReq(req) {
  const authHeader = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!authHeader) {
    if (process.env.NODE_ENV !== 'production' && req.headers['x-test-user']) {
      // Provide an object with id (string) and optional email
      return { id: String(req.headers['x-test-user']), email: req.headers['x-test-email'] || null };
    }
    return null;
  }
  try {
    const { data, error } = await supabase.auth.getUser(authHeader);
    if (error) {
      // treat as unauthenticated rather than throwing raw error for nicer response
      console.warn('getUserFromReq supabase.auth.getUser error:', error);
      return null;
    }
    return data?.user || null;
  } catch (err) {
    console.error('getUserFromReq unexpected error:', err);
    return null;
  }
}

// Utility: generate storage path
function randomFileName(originalName) {
  const ext = path.extname(originalName || '') || '';
  const name = crypto.randomBytes(10).toString('hex');
  return `${Date.now()}_${name}${ext}`;
}

// Upload buffer to storage and return public URL
async function uploadToStorage(fileBuffer, originalName, folder = '') {
  if (!fileBuffer) return null;
  const fileName = randomFileName(originalName);
  const key = folder ? `${folder}/${fileName}` : fileName;

  // supabase storage upload expects a Buffer/Readable in Node; this should work with memoryStorage buffer
  const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(key, fileBuffer, {
    contentType: 'application/octet-stream',
    upsert: false,
  });

  if (upErr) {
    throw upErr;
  }

  const { data: urlData, error: urlErr } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(key);
  if (urlErr) {
    throw urlErr;
  }
  return urlData?.publicUrl || null;
}

// Sanitize profile output
function profileToClient(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    full_name: row.full_name,
    gender: row.gender,
    id_number: row.id_number,
    dob: row.dob,
    phone: row.phone,
    email: row.email,
    address: row.address,
    province: row.province,
    city: row.city,
    photo_url: row.photo_url,
    pdf1_url: row.pdf1_url,
    pdf2_url: row.pdf2_url,
    created_at: row.created_at,
  };
}

// GET /api/profile  -> returns profile for current user
router.get('/profile', async (req, res) => {
  try {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Unauthenticated' });

    const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();

    if (error) {
      console.error('GET /profile db err', error);
      return res.status(500).json({ error: error.message || String(error) });
    }

    if (!data) return res.status(200).json(null);
    return res.json(profileToClient(data));
  } catch (err) {
    console.error('GET /profile err', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /api/profile  -> create profile (one-time). Accepts multipart formdata for files.
router.post(
  '/profile',
  upload.fields([{ name: 'photo' }, { name: 'pdf1' }, { name: 'pdf2' }]),
  async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: 'Unauthenticated' });

      // Check if profile exists for this user
      const { data: existing, error: exErr } = await supabase.from('profiles').select('id').eq('user_id', user.id).maybeSingle();
      if (exErr) {
        console.error('db check err', exErr);
        return res.status(500).json({ error: 'DB error' });
      }
      if (existing) {
        return res.status(409).json({ error: 'Profile already exists for this account (one-time creation only).' });
      }

      // Required fields
      const { full_name, gender, id_number, dob, phone, email, address, province, city } = req.body;
      if (!full_name || !id_number || !province || !city) {
        return res.status(400).json({ error: 'Required fields: full_name, id_number, province, city' });
      }

      // Upload files (if provided)
      let photo_url = null;
      let pdf1_url = null;
      let pdf2_url = null;

      if (req.files?.photo?.[0]) {
        photo_url = await uploadToStorage(req.files.photo[0].buffer, req.files.photo[0].originalname, `users/${user.id}`);
      }
      if (req.files?.pdf1?.[0]) {
        pdf1_url = await uploadToStorage(req.files.pdf1[0].buffer, req.files.pdf1[0].originalname, `users/${user.id}`);
      }
      if (req.files?.pdf2?.[0]) {
        pdf2_url = await uploadToStorage(req.files.pdf2[0].buffer, req.files.pdf2[0].originalname, `users/${user.id}`);
      }

      // Insert profile
      const insertPayload = {
        user_id: user.id,
        full_name,
        gender: gender || null,
        id_number,
        dob: dob || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        province,
        city,
        photo_url,
        pdf1_url,
        pdf2_url,
      };

      const { data, error } = await supabase.from('profiles').insert(insertPayload).select().maybeSingle();
      if (error) {
        console.error('insert err', error);
        return res.status(400).json({ error: error.message || String(error) });
      }

      return res.status(201).json(profileToClient(data));
    } catch (err) {
      console.error('POST /profile err', err);
      return res.status(500).json({ error: err.message || String(err) });
    }
  }
);

// PUT /api/profile/:id_number -> update allowed fields, or create change requests for location/immutable fields
router.put(
  '/profile/:id_number',
  upload.fields([{ name: 'photo' }, { name: 'pdf1' }, { name: 'pdf2' }]),
  async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: 'Unauthenticated' });

      const idNumberParam = req.params.id_number;
      // load profile
      const { data: existingProfile, error: pErr } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();

      if (pErr) {
        console.error('db read err', pErr);
        return res.status(500).json({ error: 'DB error' });
      }
      if (!existingProfile) return res.status(404).json({ error: 'Profile not found' });
      if (existingProfile.id_number !== idNumberParam) {
        return res.status(403).json({ error: 'ID number in URL does not match your profile' });
      }

      const updates = {};
      const changeRequestsToCreate = [];

      // Handle file uploads first
      if (req.files?.photo?.[0]) {
        const photo_url = await uploadToStorage(req.files.photo[0].buffer, req.files.photo[0].originalname, `users/${user.id}`);
        updates.photo_url = photo_url;
      }
      if (req.files?.pdf1?.[0]) {
        const pdf1_url = await uploadToStorage(req.files.pdf1[0].buffer, req.files.pdf1[0].originalname, `users/${user.id}`);
        updates.pdf1_url = pdf1_url;
      }
      if (req.files?.pdf2?.[0]) {
        const pdf2_url = await uploadToStorage(req.files.pdf2[0].buffer, req.files.pdf2[0].originalname, `users/${user.id}`);
        updates.pdf2_url = pdf2_url;
      }

      // Allowed editable fields directly:
      const DIRECT_EDITABLE = ['phone', 'email', 'address', 'gender'];

      for (const key of DIRECT_EDITABLE) {
        if (req.body[key] !== undefined) {
          updates[key] = req.body[key] || null;
        }
      }

      // Location (province, city) change -> create a change request instead of immediate update
      const provinceNew = req.body.province;
      const cityNew = req.body.city;
      if ((provinceNew && provinceNew !== existingProfile.province) || (cityNew && cityNew !== existingProfile.city)) {
        changeRequestsToCreate.push({
          user_id: user.id,
          field: 'location',
          old_value: JSON.stringify({ province: existingProfile.province, city: existingProfile.city }),
          new_value: JSON.stringify({ province: provinceNew || existingProfile.province, city: cityNew || existingProfile.city }),
          status: 'pending',
        });
      }

      // Immutable fields: if changed, create change-requests instead of applying
      for (const imm of IMMUTABLE_FIELDS) {
        if (req.body[imm] !== undefined && req.body[imm] !== existingProfile[imm]) {
          changeRequestsToCreate.push({
            user_id: user.id,
            field: imm,
            old_value: existingProfile[imm] || null,
            new_value: req.body[imm],
            status: 'pending',
          });
        }
      }

      // Insert change requests if any
      if (changeRequestsToCreate.length > 0) {
        const { error: crErr } = await supabase.from('profile_change_requests').insert(changeRequestsToCreate);
        if (crErr) {
          console.error('creating change requests err', crErr);
          return res.status(500).json({ error: 'Failed to create change request(s)' });
        }
      }

      // Apply direct updates (phone, email, address, gender, files)
      if (Object.keys(updates).length > 0) {
        const { data: updated, error: updErr } = await supabase
          .from('profiles')
          .update(updates)
          .eq('user_id', user.id)
          .select()
          .maybeSingle();

        if (updErr) {
          console.error('apply updates err', updErr);
          return res.status(500).json({ error: 'Failed to update profile' });
        }

        const createdCount = changeRequestsToCreate.length;
        const payload = profileToClient(updated);
        if (createdCount > 0) {
          payload.change_request = { message: `${createdCount} change request(s) created and are pending approval` };
        }
        return res.json(payload);
      } else {
        // No direct updates, but maybe change requests were created
        if (changeRequestsToCreate.length > 0) {
          return res.json({ message: 'Change request(s) created and are pending approval' });
        }
        return res.status(400).json({ error: 'No editable fields provided' });
      }
    } catch (err) {
      console.error('PUT /profile/:id_number err', err);
      return res.status(500).json({ error: err.message || String(err) });
    }
  }
);

// GET /api/profile/change-requests  -> list your change requests
router.get('/profile/change-requests', async (req, res) => {
  try {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Unauthenticated' });

    const { data, error } = await supabase
      .from('profile_change_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message || String(error) });
    return res.json(data || []);
  } catch (err) {
    console.error('GET change-requests err', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// DELETE /api/profile -> forbidden (profile cannot be deleted)
router.delete('/profile', async (req, res) => {
  return res.status(403).json({ error: 'Profile deletion is not allowed' });
});

function isAdminRequest(req) {
  return req.headers['x-admin-key'] && req.headers['x-admin-key'] === process.env.ADMIN_KEY;
}

router.put('/profile/change-requests/:id/approve', express.json(), async (req, res) => {
  try {
    if (!isAdminRequest(req)) return res.status(403).json({ error: 'Not authorized (admin only)' });

    const reqId = req.params.id;
    const { approve } = req.body;
    const { data: cr, error: crErr } = await supabase.from('profile_change_requests').select('*').eq('id', reqId).maybeSingle();

    if (crErr || !cr) return res.status(404).json({ error: 'Change request not found' });

    if (cr.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    if (!approve) {
      const { error: rejErr } = await supabase.from('profile_change_requests').update({ status: 'rejected' }).eq('id', reqId);
      if (rejErr) return res.status(500).json({ error: 'Failed to reject' });
      return res.json({ message: 'Change request rejected' });
    }

    // apply change
    let updateObj = {};
    if (cr.field === 'location') {
      const newLoc = JSON.parse(cr.new_value);
      updateObj.province = newLoc.province;
      updateObj.city = newLoc.city;
    } else {
      updateObj[cr.field] = cr.new_value;
    }

    const { error: updErr } = await supabase.from('profiles').update(updateObj).eq('user_id', cr.user_id);
    if (updErr) {
      console.error('apply approved change err', updErr);
      return res.status(500).json({ error: 'Failed to apply approved change' });
    }

    const { error: doneErr } = await supabase.from('profile_change_requests').update({ status: 'approved' }).eq('id', reqId);
    if (doneErr) {
      console.error('mark approved err', doneErr);
    }

    return res.json({ message: 'Change applied and approved' });
  } catch (err) {
    console.error('approve err', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

module.exports = router;
