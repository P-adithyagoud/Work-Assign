// ──────────────────────────────────────────────
// Supabase Auth Client
// Credentials are loaded from Flask /api/config
// (which reads from .env) — no hardcoding needed
// ──────────────────────────────────────────────

const { createClient } = supabase;
let sb = null;

// Initialize Supabase client from backend config
async function initSupabase() {
  if (sb) return sb;
  const resp = await fetch("/api/config");
  const cfg  = await resp.json();
  sb = createClient(cfg.supabase_url, cfg.supabase_anon_key);
  return sb;
}

// ──────────────────────────────────────────────
// Auth Guards
// ──────────────────────────────────────────────

async function getSession() {
  const client = await initSupabase();
  const { data: { session } } = await client.auth.getSession();
  return session;
}

async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = "/login";
    return null;
  }
  return session;
}

async function requireGuest() {
  const session = await getSession();
  if (session) {
    window.location.href = "/";
  }
}

// ──────────────────────────────────────────────
// Auth Actions
// ──────────────────────────────────────────────

async function signUp(email, password) {
  const client = await initSupabase();
  const { data, error } = await client.auth.signUp({ email, password });
  return { data, error };
}

async function signIn(email, password) {
  const client = await initSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  return { data, error };
}

async function signOut() {
  const client = await initSupabase();
  await client.auth.signOut();
  window.location.href = "/login";
}
