// ── Supabase Configuration ────────────────────────────────────────────────────
const CONFIG_KEY = "pool_supabase_config";

export function getConfig() {
  // Env vars (baked in at build time) always take priority
  const envUrl     = import.meta.env.VITE_SUPABASE_URL;
  const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (envUrl && envAnonKey) {
    return { url: envUrl, anonKey: envAnonKey };
  }
  // Fall back to localStorage for manual config screen entry
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { url: "", anonKey: "" };
}

export function saveConfig(url, anonKey) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, anonKey }));
  window.location.reload();
}

export function isConfigured() {
  const { url, anonKey } = getConfig();
  return !!(url && anonKey);
}

let _client = null;
export function getSupabase() {
  if (_client) return _client;
  const { url, anonKey } = getConfig();
  if (!url || !anonKey) return null;
  _client = window.supabase.createClient(url, anonKey);
  return _client;
}

export const supabase = new Proxy({}, {
  get(_, prop) {
    const client = getSupabase();
    if (!client) throw new Error("Supabase not configured");
    return client[prop];
  }
});
