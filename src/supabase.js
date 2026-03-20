// ── Supabase Configuration ────────────────────────────────────────────────────
// After creating your Supabase project, paste your credentials here
// OR enter them through the in-app Config screen on first launch.
//
// Find these at: supabase.com → Your Project → Settings → API
//
const CONFIG_KEY = "pool_supabase_config";

export function getConfig() {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    url:     import.meta.env.VITE_SUPABASE_URL  ?? "",
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
  };
}

export function saveConfig(url, anonKey) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, anonKey }));
  window.location.reload(); // re-init client with new config
}

export function isConfigured() {
  const { url, anonKey } = getConfig();
  return !!(url && anonKey);
}

// Lazy Supabase client — created once, reused everywhere
let _client = null;
export function getSupabase() {
  if (_client) return _client;
  const { url, anonKey } = getConfig();
  if (!url || !anonKey) return null;
  // Supabase JS is loaded via CDN in index.html to keep bundle clean
  _client = window.supabase.createClient(url, anonKey);
  return _client;
}

// Named export for convenience
export const supabase = new Proxy({}, {
  get(_, prop) {
    const client = getSupabase();
    if (!client) throw new Error("Supabase not configured");
    return client[prop];
  }
});
