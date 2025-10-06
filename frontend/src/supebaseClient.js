/**

* src/supebaseClient.js
* Safe Supabase client that works for CRA and Vite builds.
* Adds a cross-version helper `getCurrentUser()` and re-exports `supabase`.
  */

import { createClient } from '@supabase/supabase-js';

// Try CRA style, then Vite style, safely without referencing bare `process`
const SUPABASE_URL =
(typeof globalThis !== 'undefined' && globalThis.process && globalThis.process.env && globalThis.process.env.REACT_APP_SUPABASE_URL) ||
(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
'';

const SUPABASE_ANON_KEY =
(typeof globalThis !== 'undefined' && globalThis.process && globalThis.process.env && globalThis.process.env.REACT_APP_SUPABASE_ANON_KEY) ||
(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
'';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
console.warn('Missing Supabase config: set REACT_APP_SUPABASE_URL/REACT_APP_SUPABASE_ANON_KEY (CRA) or VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY (Vite).');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**

* Cross-version helper to return the current signed-in user (or null).
* * For supabase-js v2: prefers auth.getUser() then auth.getSession()
* * For supabase-js v1: falls back to auth.user()
*
* Returns the user object or null.
  */
  export async function getCurrentUser() {
  try {
  // supabase-js v2: auth.getUser()
  if (supabase.auth && typeof supabase.auth.getUser === 'function') {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
  console.warn('supabase.auth.getUser error', error);
  return null;
  }
  return data?.user ?? null;
  }

  // supabase-js v2: auth.getSession()
  if (supabase.auth && typeof supabase.auth.getSession === 'function') {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
  console.warn('supabase.auth.getSession error', error);
  return null;
  }
  return data?.session?.user ?? null;
  }

  // supabase-js v1: auth.user()
  if (supabase.auth && typeof supabase.auth.user === 'function') {
  return supabase.auth.user();
  }

  // If none of the above exist, try reading session from auth.session (older)
  if (supabase.auth && supabase.auth.session) {
  return supabase.auth.session()?.user ?? null;
  }

  return null;
  } catch (err) {
  console.error('getCurrentUser unexpected error', err);
  return null;
  }
  }

/**

* Convenience helper to sign out across versions.
  */
  export async function signOut() {
  try {
  if (supabase.auth && typeof supabase.auth.signOut === 'function') {
  return await supabase.auth.signOut();
  }
  // older clients might not have signOut; noop
  return null;
  } catch (err) {
  console.error('signOut error', err);
  throw err;
  }
  }

// also export default for older imports if any code expects a default export
export default supabase;
