import { useCallback, useRef } from "react";
import { getSupabase } from "../supabase";
import { getWeekKey, todayIndex } from "../utils";

// ── useRealtimeSync ───────────────────────────────────────────────────────────
// Manages all Supabase reads, writes, and real-time subscriptions.
// Keeps appData in sync across every device with zero polling.

export function useRealtimeSync({ appData, setAppData, setLivePos }) {
  const subRef = useRef(null);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function mergeEntry(prev, { tech, week_key, day_index, entry_in, entry_out, duration_ms }) {
    const next    = structuredClone(prev);
    const week    = next[week_key]  ??= {};
    const tw      = week[tech]      ??= { days: {}, submitted: false };
    const dd      = tw.days[day_index] ??= { entries: [], totalMs: 0, gps: [] };
    const existing = dd.entries.findIndex(e => e.in === entry_in);
    const entry    = { in: entry_in, out: entry_out, ms: duration_ms ?? 0 };
    if (existing >= 0) dd.entries[existing] = entry;
    else dd.entries.push(entry);
    dd.totalMs = dd.entries.reduce((s, e) => s + (e.ms ?? 0), 0);
    return next;
  }

  function mergeSubmission(prev, { tech, week_key, submitted_at }) {
    const next = structuredClone(prev);
    const tw   = next[week_key]?.[tech];
    if (tw) { tw.submitted = true; tw.submittedAt = submitted_at; }
    return next;
  }

  // ── Initial load ───────────────────────────────────────────────────────────
  const loadInitial = useCallback(async () => {
    const db = getSupabase();
    if (!db) return;

    // Load last 4 weeks
    const weeks = Array.from({ length: 4 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      return getWeekKey(d);
    });

    const [{ data: entries }, { data: submissions }, { data: flags }] = await Promise.all([
      db.from("time_entries").select("*").in("week_key", weeks),
      db.from("week_submissions").select("*").in("week_key", weeks),
      db.from("day_flags").select("*").in("week_key", weeks),
    ]);

    setAppData(prev => {
      let next = structuredClone(prev);
      (entries ?? []).forEach(row => { next = mergeEntry(next, row); });
      (submissions ?? []).forEach(({ tech, week_key, submitted_at }) => {
        next = mergeSubmission(next, { tech, week_key, submitted_at });
      });
      (flags ?? []).forEach(({ tech, week_key, day_index, flagged }) => {
        const dd = next[week_key]?.[tech]?.days?.[day_index];
        if (dd) dd.flagged = flagged;
      });
      return next;
    });

    // Subscribe to real-time changes
    if (subRef.current) db.removeChannel(subRef.current);

    subRef.current = db.channel("pool-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "time_entries" },
        ({ new: row }) => setAppData(prev => mergeEntry(prev, row)))
      .on("postgres_changes", { event: "*", schema: "public", table: "week_submissions" },
        ({ new: row }) => setAppData(prev => mergeSubmission(prev, row)))
      .on("postgres_changes", { event: "*", schema: "public", table: "day_flags" },
        ({ new: { tech, week_key, day_index, flagged } }) => setAppData(prev => {
          const next = structuredClone(prev);
          const dd   = next[week_key]?.[tech]?.days?.[day_index];
          if (dd) dd.flagged = flagged;
          return next;
        }))
      .on("broadcast", { event: "gps" }, ({ payload }) => {
        setLivePos(p => ({ ...p, [payload.tech]: payload.point }));
      })
      .on("broadcast", { event: "gps_stop" }, ({ payload }) => {
        setLivePos(p => { const n = { ...p }; delete n[payload.tech]; return n; })
      })
      .subscribe();
  }, [setAppData, setLivePos]);

  // ── Writes ─────────────────────────────────────────────────────────────────
  const pushEntry = useCallback(async (tech, week_key, day_index, entry) => {
    const db = getSupabase();
    if (!db) return;
    await db.from("time_entries").upsert({
      tech, week_key, day_index,
      entry_in:   entry.in,
      entry_out:  entry.out,
      duration_ms: entry.ms ?? 0,
    }, { onConflict: "tech,week_key,day_index,entry_in" });
  }, []);

  const pushGPS = useCallback(async (tech, point) => {
    const db = getSupabase();
    if (!db) return;
    // Broadcast live position (ephemeral — no DB write for live dot)
    db.channel("pool-realtime").send({
      type: "broadcast", event: "gps",
      payload: { tech, point }
    });
    // Persist to DB for history
    await db.from("gps_points").insert({
      tech,
      week_key:  getWeekKey(),
      day_index: todayIndex(),
      lat: point.lat, lng: point.lng,
      accuracy: point.acc,
      captured_at: point.ts,
    });
  }, []);

  const pushSubmission = useCallback(async (tech, week_key, submitted_at) => {
    const db = getSupabase();
    if (!db) return;
    await db.from("week_submissions").upsert(
      { tech, week_key, submitted_at },
      { onConflict: "tech,week_key" }
    );
  }, []);

  const pushPin = useCallback(async (tech, pin_hash) => {
    // Pins stay local only — never sent to Supabase for security
    // This is intentionally a no-op for the DB layer
  }, []);

  return { pushEntry, pushGPS, pushSubmission, pushPin, loadInitial };
}
