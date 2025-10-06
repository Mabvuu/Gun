const rawBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
let API_BASE = String(rawBase).replace(/\/+$/,'');      // trim trailing slashes
API_BASE = API_BASE.replace(/\/api$/i,'');              // drop trailing "/api" if provided

export async function createApplication(formData){
  const url = `${API_BASE}/api/applications`;
  console.log('[createApplication] posting to', url);
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    // credentials: 'include' // uncomment if you use cookies/session auth
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>({ error: 'unknown' }));
    throw new Error(err.error || 'request failed');
  }
  const json = await res.json();
  console.log('createApplication response', json);
  return json;
}
