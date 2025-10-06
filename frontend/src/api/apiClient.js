// frontend/src/api/client.js
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

function getToken() {
  return localStorage.getItem('token') || null;
}

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// attach token automatically
client.interceptors.request.use(cfg => {
  const t = getToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export default {
  get: (url, cfg) => client.get(url, cfg).then(r => r.data),
  post: (url, body, cfg) => client.post(url, body, cfg).then(r => r.data),
  put: (url, body, cfg) => client.put(url, body, cfg).then(r => r.data),
  del: (url, cfg) => client.delete(url, cfg).then(r => r.data)
};
