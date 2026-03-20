// ============================================================
// src/lib/supabase.js
// Output 1.4 — Supabase client + all DB helper functions
// Pool Time Tracker — Hybrid architecture
// ============================================================
// PINs:        localStorage only (unchanged)
// Sessions:    Supabase (synced from device)
// GPS points:  Supabase (synced every 60 s while clocked in)
// Live map:    Supabase Realtime subscription
// ============================================================

import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------
// Client
// Set these in your .env file:
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJ...
// ------------------------------------------------------------
const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  console.warn('[supabase] Missing env vars — check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  realtime: { params: { eventsPerSecond: 2 } },
});


// ============================================================
// TECHNICIANS
// ============================================================

/**
 * Fetch all active technicians.
 * @returns {Promise<Array>}
 */
export async function getTechnicians() {
  const { data, error } = await supabase
    .from('technicians')
    .select('id, name, is_active, created_at')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data;
}

/**
 * Fetch a single technician by name (used on login).
 * @param {string} name
 * @returns {Promise<Object|null>}
 */
export async function getTechnicianByName(name) {
  const { data, error } = await supabase
    .from('technicians')
    .select('id, name')
    .eq('name', name)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}


// ============================================================
// SESSIONS
// ============================================================

/**
 * Create a new session (clock in).
 * @param {string} technicianId  UUID from technicians table
 * @returns {Promise<Object>}    The new session row
 */
export async function clockIn(technicianId) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ technician_id: technicianId, clock_in_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Close an active session (clock out).
 * @param {string} sessionId  UUID of the open session
 * @returns {Promise<Object>}  The updated session row
 */
export async function clockOut(sessionId) {
  const { data, error } = await supabase
    .from('sessions')
    .update({ clock_out_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Get all sessions for a technician (most recent first).
 * @param {string} technicianId
 * @param {number} [limit=50]
 * @returns {Promise<Array>}
 */
export async function getSessionsForTech(technicianId, limit = 50) {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, clock_in_at, clock_out_at, duration_secs')
    .eq('technician_id', technicianId)
    .order('clock_in_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

/**
 * Get the active (unclosed) session for a technician, if any.
 * @param {string} technicianId
 * @returns {Promise<Object|null>}
 */
export async function getActiveSession(technicianId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, clock_in_at')
    .eq('technician_id', technicianId)
    .is('clock_out_at', null)
    .order('clock_in_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Get total hours worked today for a technician.
 * @param {string} technicianId
 * @returns {Promise<number>}  Hours as a decimal (e.g. 5.25)
 */
export async function getHoursToday(technicianId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('sessions')
    .select('clock_in_at, clock_out_at')
    .eq('technician_id', technicianId)
    .gte('clock_in_at', startOfDay.toISOString());
  if (error) throw error;

  const totalSecs = data.reduce((acc, s) => {
    const start = new Date(s.clock_in_at).getTime();
    const end   = s.clock_out_at ? new Date(s.clock_out_at).getTime() : Date.now();
    return acc + Math.max(0, (end - start) / 1000);
  }, 0);

  return Math.round((totalSecs / 3600) * 100) / 100; // 2 decimal places
}


// ============================================================
// GPS POINTS
// ============================================================

/**
 * Record a single GPS ping for an active session.
 * Called every 60 seconds by the tracking interval.
 * @param {Object} opts
 * @param {string} opts.sessionId
 * @param {string} opts.technicianId
 * @param {number} opts.lat
 * @param {number} opts.lng
 * @param {number} [opts.accuracyM]
 * @param {string} [opts.address]   Reverse-geocoded address (optional)
 * @returns {Promise<Object>}
 */
export async function recordGpsPoint({ sessionId, technicianId, lat, lng, accuracyM, address }) {
  const { data, error } = await supabase
    .from('gps_points')
    .insert({
      session_id:    sessionId,
      technician_id: technicianId,
      lat,
      lng,
      accuracy_m:    accuracyM ?? null,
      address:       address   ?? null,
      recorded_at:   new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Get all GPS points for a session (ordered oldest→newest for route drawing).
 * @param {string} sessionId
 * @returns {Promise<Array<{lat, lng, recorded_at, address}>>}
 */
export async function getRouteForSession(sessionId) {
  const { data, error } = await supabase
    .from('gps_points')
    .select('lat, lng, recorded_at, address')
    .eq('session_id', sessionId)
    .order('recorded_at', { ascending: true });
  if (error) throw error;
  return data;
}


// ============================================================
// LIVE MAP — manager view
// ============================================================

/**
 * Fetch current live positions for all clocked-in technicians.
 * Reads from the `live_positions` view (latest GPS per active session).
 * @returns {Promise<Array>}
 */
export async function getLivePositions() {
  const { data, error } = await supabase
    .from('live_positions')
    .select('*');
  if (error) throw error;
  return data;
}

/**
 * Subscribe to real-time GPS point inserts.
 * Calls `onUpdate` whenever any technician records a new GPS ping.
 * Returns an unsubscribe function — call it on component unmount.
 *
 * Usage:
 *   const unsub = subscribeToLivePositions(() => fetchAndSetPositions());
 *   useEffect(() => () => unsub(), []);
 *
 * @param {Function} onUpdate  Callback fired on new GPS insert
 * @returns {Function}         Unsubscribe function
 */
export function subscribeToLivePositions(onUpdate) {
  const channel = supabase
    .channel('live-gps')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'gps_points' },
      () => onUpdate()
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'sessions' },
      () => onUpdate()  // catches clock-out events (tech disappears from map)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}


// ============================================================
// CSV EXPORT (manager)
// ============================================================

/**
 * Fetch all sessions within a date range, formatted for CSV export.
 * @param {Date} from
 * @param {Date} to
 * @returns {Promise<Array>}
 */
export async function getSessionsForExport(from, to) {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id,
      clock_in_at,
      clock_out_at,
      duration_secs,
      technicians ( name )
    `)
    .gte('clock_in_at', from.toISOString())
    .lte('clock_in_at', to.toISOString())
    .order('clock_in_at', { ascending: false });
  if (error) throw error;

  return data.map(s => ({
    technician:   s.technicians?.name ?? 'Unknown',
    date:         new Date(s.clock_in_at).toLocaleDateString(),
    clock_in:     new Date(s.clock_in_at).toLocaleTimeString(),
    clock_out:    s.clock_out_at ? new Date(s.clock_out_at).toLocaleTimeString() : 'Active',
    hours:        s.duration_secs ? (s.duration_secs / 3600).toFixed(2) : '—',
    session_id:   s.id,
  }));
}

/**
 * Convert session export rows to a CSV string and trigger browser download.
 * @param {Array}  rows    From getSessionsForExport()
 * @param {string} filename
 */
export function downloadCsv(rows, filename = 'pool-time-export.csv') {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
