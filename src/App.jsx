import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, isConfigured } from "./supabase";
import { useRealtimeSync } from "./hooks/useRealtimeSync";
import { useGPS } from "./hooks/useGPS";
import { useOfflineQueue } from "./hooks/useOfflineQueue";
import { ConfigScreen } from "./screens/ConfigScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { PinScreen } from "./screens/PinScreen";
import { TechScreen } from "./screens/TechScreen";
import { ManagerScreen } from "./screens/ManagerScreen";
import { AdminScreen } from "./screens/AdminScreen";
import { OvertimeScreen } from "./screens/OvertimeScreen";
import { TECH_COLORS, getWeekKey, todayIndex } from "./utils";

// TECHS is now loaded dynamically from Supabase `techs` table.
// Fallback to this list if the table doesn't exist yet.
export const DEFAULT_TECHS = [
  "Alex Rivera","Brandon Cole","Casey Nguyen","Dana Torres",
  "Eli Santos","Fiona Park","Gabe Morales","Hailey Kim",
  "Ivan Cruz","Jess Webb","Kyle Hunt","Luna Reyes"
];

export let TECHS = [...DEFAULT_TECHS];

export default function App() {
  const [screen, setScreen]         = useState("boot");  // boot|home|pin|tech|manager|pin_manager|pin_set|config|admin|overtime
  const [activeTech, setActiveTech] = useState(null);
  const [pendingTech, setPendingTech] = useState(null);
  const [now, setNow]               = useState(Date.now());
  const [appData, setAppData]       = useState({});
  const [livePos, setLivePos]       = useState({});
  const [online, setOnline]         = useState(navigator.onLine);
  const [techs, setTechs]           = useState(TECHS);

  // Load techs from Supabase (falls back to DEFAULT_TECHS if table missing)
  const loadTechs = useCallback(async () => {
    try {
      const { data, error } = await supabase()
        ?.from("techs").select("name").eq("active", true).order("name") ?? {};
      if (!error && data?.length) {
        const names = data.map(r => r.name);
        TECHS = names;
        setTechs(names);
      }
    } catch (_) { /* table may not exist yet — use defaults */ }
  }, []);

  // Tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Online/offline
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Boot: check config
  useEffect(() => {
    const next = isConfigured() ? "home" : "config";
    setScreen(next);
    if (next === "home") loadTechs();
  }, []);

  // Real-time sync hook
  const { pushEntry, pushGPS, pushSubmission, pushPin, loadInitial } =
    useRealtimeSync({ appData, setAppData, setLivePos });

  // Load initial data once configured
  useEffect(() => {
    if (screen !== "boot" && screen !== "config" && isConfigured()) {
      loadInitial();
    }
  }, [screen]);

  // Offline queue
  const { enqueue } = useOfflineQueue({ online, pushEntry, pushGPS, pushSubmission });

  // GPS hook
  const { startTracking, stopTracking } = useGPS({
    onPoint: (tech, point) => {
      setLivePos(p => ({ ...p, [tech]: point }));
      if (online) pushGPS(tech, point);
      else enqueue({ type: "gps", tech, point });
    }
  });

  // ── Actions ────────────────────────────────────────────────────────────────
  // ── PATCH for App.jsx ─────────────────────────────────────────────────────────
// Replace the clockToggle function with this version.
// The only change: setTimeout redirect now only fires on clock OUT (action === "out").
// On clock IN the tech stays on their TechScreen.

  const clockToggle = useCallback((tech) => {
    const wk  = getWeekKey();
    const day = todayIndex();
    const now = new Date().toISOString();

    setAppData(prev => {
      const next    = structuredClone(prev);
      const week    = next[wk]    ??= {};
      const tw      = week[tech]  ??= { days: {}, submitted: false };
      const dayData = tw.days[day] ??= { entries: [], totalMs: 0, gps: [] };
      const last    = dayData.entries.at(-1);

      let entry;
      if (last && !last.out) {
        // ── CLOCK OUT ──
        last.out  = now;
        last.ms   = new Date(last.out) - new Date(last.in);
        dayData.totalMs = dayData.entries.reduce((s, e) => s + (e.ms ?? 0), 0);
        entry = { ...last, action: "out" };
        stopTracking(tech);
        setLivePos(p => { const n = { ...p }; delete n[tech]; return n; });
      } else {
        // ── CLOCK IN ──
        entry = { in: now, out: null, ms: 0, action: "in" };
        dayData.entries.push(entry);
        startTracking(tech);
      }

      if (online) pushEntry(tech, wk, day, entry);
      else enqueue({ type: "entry", tech, wk, day, entry });

      return next;
    });

    // Only return to home screen on clock OUT
    setAppData(prev => {
      const wk  = getWeekKey();
      const day = todayIndex();
      const dd  = prev[wk]?.[tech]?.days?.[day];
      const last = dd?.entries?.at(-1);
      if (last && last.out) {
        // just clocked out — go home
        setTimeout(() => { setActiveTech(null); setScreen("home"); }, 300);
      }
      // clocked in — stay on tech screen, no redirect
      return prev;
    });
  }, [online, pushEntry, enqueue, startTracking, stopTracking] );
  const submitWeek = useCallback((tech) => {
    const wk  = getWeekKey();
    const ts  = new Date().toISOString();
    setAppData(prev => {
      const next = structuredClone(prev);
      const tw   = next[wk]?.[tech];
      if (tw) { tw.submitted = true; tw.submittedAt = ts; }
      return next;
    });
    if (online) pushSubmission(tech, wk, ts);
    else enqueue({ type: "submission", tech, wk, ts });
    setTimeout(() => { setActiveTech(null); setScreen("home"); }, 300);
  }, [online, pushSubmission, enqueue]);

  const flagDay = useCallback((tech, day) => {
    const wk = getWeekKey();
    setAppData(prev => {
      const next    = structuredClone(prev);
      const dayData = next[wk]?.[tech]?.days?.[day];
      if (dayData) dayData.flagged = !dayData.flagged;
      return next;
    });
  }, []);

  const managerUnlock = useCallback((tech, wk) => {
    setAppData(prev => {
      const next = structuredClone(prev);
      const tw   = next[wk]?.[tech];
      if (tw) { tw.submitted = false; tw.submittedAt = null; }
      return next;
    });
  }, []);

  // ── Derived helpers ────────────────────────────────────────────────────────
  const isClockedIn = useCallback((tech) => {
    const dd = appData[getWeekKey()]?.[tech]?.days?.[todayIndex()];
    return !!(dd?.entries?.at(-1) && !dd.entries.at(-1).out);
  }, [appData]);

  const liveMsFor = useCallback((tech) => {
    const wk  = getWeekKey();
    const day = todayIndex();
    const dd  = appData[wk]?.[tech]?.days?.[day];
    if (!dd) return 0;
    let ms    = dd.totalMs ?? 0;
    const last = dd.entries?.at(-1);
    if (last && !last.out) ms += now - new Date(last.in);
    return ms;
  }, [appData, now]);

  const weekTotalMs = useCallback((tech, wk = getWeekKey()) => {
    const tw = appData[wk]?.[tech];
    if (!tw) return 0;
    return Object.entries(tw.days ?? {}).reduce((sum, [d, dd]) => {
      let ms = dd.totalMs ?? 0;
      if (+d === todayIndex()) {
        const last = dd.entries?.at(-1);
        if (last && !last.out) ms += now - new Date(last.in);
      }
      return sum + ms;
    }, 0);
  }, [appData, now]);

  const techColors = Object.fromEntries(TECHS.map((t, i) => [t, TECH_COLORS[i]]));

  // ── PIN helpers ────────────────────────────────────────────────────────────
  const getPins    = () => { try { return JSON.parse(localStorage.getItem("pool_pins") ?? "{}"); } catch { return {}; } };
  const savePin    = (key, pin) => { const p = getPins(); p[key] = pin; localStorage.setItem("pool_pins", JSON.stringify(p)); };
  const verifyPin  = (key, pin) => getPins()[key] === pin;
  const hasPin     = (key) => !!getPins()[key];
  const MGR_KEY    = "__manager__";
  const DEFAULT_MGR_PIN = "1234";
  const verifyMgr  = (pin) => (getPins()[MGR_KEY] ?? DEFAULT_MGR_PIN) === pin;

  // ── Screen routing ─────────────────────────────────────────────────────────
  const go = (s, opts = {}) => {
    if (opts.tech) setPendingTech(opts.tech);
    setScreen(s);
  };

  if (screen === "boot")   return null;
  if (screen === "config") return <ConfigScreen onSaved={() => setScreen("home")} />;

  if (screen === "pin") return (
    <PinScreen
      title={pendingTech}
      subtitle="Enter your PIN"
      mode="verify"
      onSuccess={() => { setActiveTech(pendingTech); setScreen("tech"); }}
      onCancel={() => { setPendingTech(null); setScreen("home"); }}
      verify={(pin) => verifyPin(pendingTech, pin)}
    />
  );

  if (screen === "pin_set") return (
    <PinScreen
      title={`Welcome, ${pendingTech?.split(" ")[0]}!`}
      subtitle="Create a 4-digit PIN"
      mode="set"
      onSuccess={(pin) => { savePin(pendingTech, pin); setActiveTech(pendingTech); setScreen("tech"); }}
      onCancel={() => { setPendingTech(null); setScreen("home"); }}
    />
  );

  if (screen === "pin_manager") return (
    <PinScreen
      title="MANAGER"
      subtitle="Enter manager PIN"
      mode="verify"
      onSuccess={() => setScreen("manager")}
      onCancel={() => setScreen("home")}
      verify={verifyMgr}
    />
  );

  if (screen === "tech" && activeTech) return (
    <TechScreen
      tech={activeTech}
      appData={appData}
      now={now}
      isClockedIn={isClockedIn(activeTech)}
      liveMs={liveMsFor(activeTech)}
      weekTotalMs={weekTotalMs(activeTech)}
      livePos={livePos[activeTech]}
      techColor={techColors[activeTech]}
      onToggle={() => clockToggle(activeTech)}
      onSubmit={() => submitWeek(activeTech)}
      onFlag={(day) => flagDay(activeTech, day)}
      onChangePin={(pin) => savePin(activeTech, pin)}
      onBack={() => { setActiveTech(null); setScreen("home"); }}
      online={online}
    />
  );

  if (screen === "admin") return (
    <AdminScreen
      onBack={() => setScreen("manager")}
      onSaved={() => { loadTechs(); setScreen("manager"); }}
    />
  );

  if (screen === "overtime") return (
    <OvertimeScreen
      appData={appData}
      techs={techs}
      techColors={techColors}
      onBack={() => setScreen("manager")}
    />
  );

  if (screen === "manager") return (
    <ManagerScreen
      appData={appData}
      now={now}
      weekTotalMs={weekTotalMs}
      techColors={techColors}
      livePos={livePos}
      pins={getPins()}
      online={online}
      onUnlock={managerUnlock}
      onResetPin={(tech, pin) => savePin(tech, pin)}
      onChangeMgrPin={(pin) => savePin(MGR_KEY, pin)}
      onBack={() => setScreen("home")}
      onAdmin={() => setScreen("admin")}
      onOvertime={() => setScreen("overtime")}
    />
  );

  return (
    <HomeScreen
      appData={appData}
      now={now}
      isClockedIn={isClockedIn}
      techColors={techColors}
      online={online}
      livePos={livePos}
      techs={techs}
      onSelectTech={(tech) => {
        setPendingTech(tech);
        setScreen(hasPin(tech) ? "pin" : "pin_set");
      }}
      onManager={() => setScreen("pin_manager")}
    />
  );
}
