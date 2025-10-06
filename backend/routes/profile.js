// backend/routes/profile.js
const express = require("express");
const multer = require("multer");
const { supabase, bucket, hasServiceRole } = require("../supabaseClient");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// local uploads fallback (if you ever want local storage)
function ensureUploadsDir() {
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  return uploadsDir;
}

async function generateApplicantId() {
  const { data, error } = await supabase
    .from("profiles")
    .select("applicant_id")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("generateApplicantId error:", error);
    throw error;
  }

  let nextNumber = 1;
  if (data && data.length > 0 && data[0].applicant_id) {
    const last = data[0].applicant_id;
    const match = String(last).match(/^AP-(\d{1,})$/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }
  return `AP-${String(nextNumber).padStart(5, "0")}`;
}

// helper: save file to supabase storage (if bucket+service role available) or local fallback
async function saveFileToStorage(fileBuffer, originalName, idNumber, keyLabel) {
  const ext = path.extname(originalName) || ".pdf";
  const filename = `${idNumber}_${keyLabel}_${uuidv4()}${ext}`;

  if (bucket && hasServiceRole) {
    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(filename, fileBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadErr) {
      console.error("Supabase storage upload error:", uploadErr);
      throw uploadErr;
    }

    // get public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename);
    // urlData.publicUrl or urlData?.publicUrl depending on SDK; return string if present
    return (urlData && (urlData.publicUrl || urlData.public_url || urlData.publicURL)) || urlData?.publicUrl || `/uploads/${filename}`;
  }

  // local fallback
  const uploadsDir = ensureUploadsDir();
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, fileBuffer);
  return `uploads/${filename}`;
}

/**
 * GET /api/profile
 * Returns the most recent profile row or null
 */
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("GET /api/profile supabase error:", error);
      return res.status(500).json({ error: error.message || "DB error" });
    }

    return res.json((data && data.length > 0) ? data[0] : null);
  } catch (err) {
    console.error("GET /api/profile unexpected error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/profile
 * Create profile: if id_number exists -> update instead of duplicate.
 * Accepts multipart/form-data: fields + pdf1,pdf2
 */
router.post("/", upload.fields([{ name: "pdf1" }, { name: "pdf2" }]), async (req, res) => {
  try {
    console.log("→ POST /api/profile received");
    console.log("body:", req.body);
    console.log("files:", Object.keys(req.files || {}));

    const { full_name, gender, id_number, dob, phone } = req.body;
    if (!full_name || !id_number) {
      return res.status(400).json({ error: "full_name and id_number are required" });
    }

    // check existing by id_number
    const { data: existingRows, error: fetchErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id_number", id_number)
      .limit(1);

    if (fetchErr) {
      console.error("POST check existing error:", fetchErr);
      return res.status(500).json({ error: fetchErr.message || "DB error" });
    }

    // handle file uploads, produce public URLs (or local paths)
    const uploadedPaths = {};
    if (req.files) {
      for (const key of ["pdf1", "pdf2"]) {
        if (req.files[key] && req.files[key][0]) {
          const file = req.files[key][0];
          const saved = await saveFileToStorage(file.buffer, file.originalname, id_number, key);
          uploadedPaths[`${key}_path`] = saved;
          console.log(`Uploaded ${key}:`, saved);
        }
      }
    }

    if (existingRows && existingRows.length > 0) {
      // already exists -> update instead of creating duplicate
      const existing = existingRows[0];

      // do not allow changing id_number or applicant_id; only update mutable fields
      const updatePayload = {
        gender: (gender !== undefined ? gender : existing.gender),
        dob: (dob !== undefined ? dob : existing.dob),
        phone: (phone !== undefined ? phone : existing.phone),
        pdf1_path: uploadedPaths.pdf1_path || existing.pdf1_path || null,
        pdf2_path: uploadedPaths.pdf2_path || existing.pdf2_path || null,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedData, error: updateErr } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id_number", id_number)
        .select()
        .single();

      if (updateErr) {
        console.error("Supabase update error:", updateErr);
        return res.status(500).json({ error: updateErr.message || "Update failed" });
      }

      return res.json(updatedData);
    } else {
      // create new row
      const applicant_id = await generateApplicantId();
      const rowId = uuidv4();

      const insertPayload = {
        id: rowId,
        applicant_id,
        full_name,
        gender: gender || null,
        id_number,
        dob: dob || null,
        phone: phone || null,
        pdf1_path: uploadedPaths.pdf1_path || null,
        pdf2_path: uploadedPaths.pdf2_path || null,
      };

      const { data: insertedData, error: insertErr } = await supabase
        .from("profiles")
        .insert([insertPayload])
        .select()
        .single();

      if (insertErr) {
        console.error("Supabase insert error:", insertErr);
        return res.status(500).json({ error: insertErr.message || "Insert failed" });
      }

      return res.json(insertedData);
    }
  } catch (err) {
    console.error("POST /api/profile unexpected error:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

/**
 * PUT /api/profile/:id_number
 * Update an existing profile by government id_number.
 * Accepts multipart/form-data for possible updated PDFs.
 */
router.put("/:id_number", upload.fields([{ name: "pdf1" }, { name: "pdf2" }]), async (req, res) => {
  try {
    const id_number = req.params.id_number;
    const { full_name, gender, dob, phone } = req.body;

    // check exists
    const { data: existingRows, error: fetchErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id_number", id_number)
      .limit(1);

    if (fetchErr) {
      console.error("PUT check existing error:", fetchErr);
      return res.status(500).json({ error: fetchErr.message || "DB error" });
    }
    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const existing = existingRows[0];

    // handle file uploads
    const uploadedPaths = {};
    if (req.files) {
      for (const key of ["pdf1", "pdf2"]) {
        if (req.files[key] && req.files[key][0]) {
          const file = req.files[key][0];
          const saved = await saveFileToStorage(file.buffer, file.originalname, id_number, key);
          uploadedPaths[`${key}_path`] = saved;
          console.log(`Uploaded ${key}:`, saved);
        }
      }
    }

    // Prepare update payload (only mutable fields)
    const updatePayload = {
      ...(full_name !== undefined ? { full_name } : {}),
      ...(gender !== undefined ? { gender } : {}),
      ...(dob !== undefined ? { dob } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(uploadedPaths.pdf1_path ? { pdf1_path: uploadedPaths.pdf1_path } : {}),
      ...(uploadedPaths.pdf2_path ? { pdf2_path: uploadedPaths.pdf2_path } : {}),
      updated_at: new Date().toISOString(),
    };

    const { data: updatedData, error: updateErr } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id_number", id_number)
      .select()
      .single();

    if (updateErr) {
      console.error("Supabase update error:", updateErr);
      return res.status(500).json({ error: updateErr.message || "Update failed" });
    }

    return res.json(updatedData);
  } catch (err) {
    console.error("PUT /api/profile unexpected error:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

module.exports = router;
