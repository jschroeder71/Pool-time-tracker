import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase client ───────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { realtime: { params: { eventsPerSecond: 2 } } }
);

// ── Styles ────────────────────────────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --water: #0ea5e9; --water-dark: #0369a1; --water-glow: #38bdf840;
      --surface: #0f172a; --surface2: #1e293b; --surface3: #334155;
      --border: #475569; --text: #f1f5f9; --text-dim: #94a3b8;
      --green: #22c55e; --red: #ef4444; --amber: #f59e0b; --purple: #a855f7;
      --font-head: 'Barlow Condensed', sans-serif;
      --font-body: 'Barlow', sans-serif;
    }
    body { background: var(--surface); color: var(--text); font-family: var(--font-body); min-height: 100vh; -webkit-tap-highlight-color: transparent; }
    button { cursor: pointer; border: none; outline: none; font-family: var(--font-body); }
    button:active { transform: scale(0.96); }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: var(--surface2); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
    @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 var(--water-glow)} 70%{box-shadow:0 0 0 14px transparent} 100%{box-shadow:0 0 0 0 transparent} }
    @keyframes pulse-green { 0%{box-shadow:0 0 0 0 #22c55e40} 70%{box-shadow:0 0 0 12px transparent} 100%{box-shadow:0 0 0 0 transparent} }
    @keyframes tick { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
    @keyframes pinDot { 0%{transform:scale(0)} 60%{transform:scale(1.3)} 100%{transform:scale(1)} }
    @keyframes spin { to { transform: rotate(360deg); } }
  `}</style>
);

// ── Constants ─────────────────────────────────────────────────────────────────
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const FULL_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DEFAULT_MANAGER_PIN = "1234";
const SAMPLE_RATES = [
  { label: "30 sec", value: 30000 },
  { label: "1 min",  value: 60000 },
  { label: "5 min",  value: 300000 },
  { label: "10 min", value: 600000 },
];
const TECH_COLORS = [
  "#0ea5e9","#22c55e","#f59e0b","#ef4444","#a855f7",
  "#06b6d4","#f97316","#84cc16","#ec4899","#14b8a6","#8b5cf6","#fb923c"
];

// ── Local storage helpers (offline cache only) ────────────────────────────────
const ls = {
  get: (k, fb = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getWeekKey(date = new Date()) {
  const d = new Date(date); d.setHours(0,0,0,0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}
function todayIndex() { return new Date().getDay(); }
function todayName() { return FULL_DAYS[todayIndex()]; }
function formatTime(ms) {
  if (!ms || ms < 0) return "0:00:00";
  const s = Math.floor(ms/1000), h = Math.floor(s/3600);
  const m = Math.floor((s%3600)/60), sc = s%60;
  return `${h}:${String(m).padStart(2,"0")}:${String(sc).padStart(2,"0")}`;
}
function formatHM(ms) {
  if (!ms||ms<0) return "0h 0m";
  const t = Math.floor(ms/60000);
  return `${Math.floor(t/60)}h ${t%60}m`;
}
function formatTimestamp(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
}

// ── Offline queue ─────────────────────────────────────────────────────────────
function enqueue(action, payload) {
  const q = ls.get("pool_offline_queue", []);
  q.push({ id: crypto.randomUUID(), action, payload, ts: new Date().toISOString() });
  ls.set("pool_offline_queue", q);
}

async function flushQueue() {
  const q = ls.get("pool_offline_queue", []);
  if (!q.length) return;
  const remaining = [];
  for (const item of q) {
    try {
      if (item.action === "clock_in") {
        await supabase.from("sessions").upsert(item.payload, { onConflict: "id" });
      } else if (item.action === "clock_out") {
        await supabase.from("sessions").update({ clock_out_at: item.payload.clock_out_at }).eq("id", item.payload.id);
      } else if (item.action === "gps_point") {
        await supabase.from("gps_points").upsert(item.payload, { onConflict: "id" });
      } else if (item.action === "add_tech") {
        await supabase.from("technicians").upsert({ name: item.payload.name }, { onConflict: "name" });
      } else if (item.action === "remove_tech") {
        await supabase.from("technicians").update({ is_active: false }).eq("name", item.payload.name);
      }
    } catch { remaining.push(item); }
  }
  ls.set("pool_offline_queue", remaining);
}

// ── DB helpers ────────────────────────────────────────────────────────────────
async function dbGetTechs() {
  const { data, error } = await supabase.from("technicians").select("name").eq("is_active", true).order("name");
  if (error) throw error;
  return data.map(r => r.name);
}
async function dbAddTech(name) {
  const { error } = await supabase.from("technicians").upsert({ name, is_active: true }, { onConflict: "name" });
  if (error) enqueue("add_tech", { name });
}
async function dbRemoveTech(name) {
  const { error } = await supabase.from("technicians").update({ is_active: false }).eq("name", name);
  if (error) enqueue("remove_tech", { name });
}
async function dbClockIn(tech, weekKey, dayIndex) {
  const id = crypto.randomUUID();
  const clock_in_at = new Date().toISOString();
  const payload = { id, tech_name: tech, clock_in_at, week_key: weekKey, day_index: dayIndex };
  const { error } = await supabase.from("sessions").insert(payload);
  if (error) enqueue("clock_in", payload);
  return { id, clock_in_at };
}
async function dbClockOut(sessionId) {
  const clock_out_at = new Date().toISOString();
  const { error } = await supabase.from("sessions").update({ clock_out_at }).eq("id", sessionId);
  if (error) enqueue("clock_out", { id: sessionId, clock_out_at });
  return clock_out_at;
}
async function dbInsertGps(sessionId, tech, lat, lng, accuracyM) {
  const id = crypto.randomUUID();
  const recorded_at = new Date().toISOString();
  const payload = { id, session_id: sessionId, tech_name: tech, lat, lng, accuracy_m: accuracyM, recorded_at };
  const { error } = await supabase.from("gps_points").insert(payload);
  if (error) enqueue("gps_point", payload);
  return payload;
}
async function dbGetSessions(weekKey) {
  const { data, error } = await supabase.from("sessions").select("*").eq("week_key", weekKey).order("clock_in_at");
  if (error) throw error;
  return data;
}
async function dbGetGpsPoints(sessionId) {
  const { data, error } = await supabase.from("gps_points").select("*").eq("session_id", sessionId).order("recorded_at");
  if (error) throw error;
  return data;
}
async function dbGetLivePositions() {
  const { data, error } = await supabase.from("live_positions").select("*");
  if (error) throw error;
  return data;
}

// ── Leaflet loader ────────────────────────────────────────────────────────────
function useLeaflet() {
  const [ready, setReady] = useState(!!window.L);
  useEffect(() => {
    if (window.L) { setReady(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

// ── Leaflet Map ───────────────────────────────────────────────────────────────
function LeafletMap({ points = [], techColors = {}, livePositions = {}, height = 300, playbackTech = null }) {
  const mapRef = useRef(null);
  const instanceRef = useRef(null);
  const layersRef = useRef([]);

  useEffect(() => {
    if (!window.L) return;
    const L = window.L;
    if (!instanceRef.current) {
      instanceRef.current = L.map(mapRef.current, { zoomControl: true, attributionControl: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(instanceRef.current);
    }
    const map = instanceRef.current;
    layersRef.current.forEach(l => map.removeLayer(l));
    layersRef.current = [];
    const allCoords = [];

    if (points.length > 0) {
      const color = techColors[playbackTech] || "#0ea5e9";
      const coords = points.map(p => [p.lat, p.lng]);
      allCoords.push(...coords);
      layersRef.current.push(L.polyline(coords, { color, weight: 3, opacity: 0.8 }).addTo(map));
      coords.forEach((c, i) => {
        const isLast = i === coords.length - 1;
        layersRef.current.push(
          L.circleMarker(c, { radius: isLast?8:5, color, fillColor: isLast?color:"#fff", fillOpacity:1, weight:2 })
            .bindPopup(formatTimestamp(points[i]?.recorded_at || points[i]?.ts)).addTo(map)
        );
      });
    }

    Object.entries(livePositions).forEach(([tech, pos]) => {
      if (!pos) return;
      const color = techColors[tech] || "#0ea5e9";
      const initials = tech.split(" ").map(n=>n[0]).join("");
      const icon = L.divIcon({
        html: `<div style="background:${color};color:#fff;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:11px;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)">${initials}</div>`,
        className:"", iconSize:[32,32], iconAnchor:[16,16]
      });
      layersRef.current.push(
        L.marker([pos.lat, pos.lng], { icon })
          .bindPopup(`<b>${tech}</b><br/>${formatTimestamp(pos.last_seen_at || pos.ts)}`).addTo(map)
      );
      allCoords.push([pos.lat, pos.lng]);
    });

    if (allCoords.length > 0) map.fitBounds(allCoords, { padding:[30,30], maxZoom:16 });
    else map.setView([28.5,-81.3], 10);
    setTimeout(() => map.invalidateSize(), 100);
  }, [points, livePositions, techColors]);

  return <div ref={mapRef} style={{ height, width:"100%", borderRadius:10, overflow:"hidden", background:"var(--surface3)" }} />;
}

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo({ size = "lg" }) {
  const big = size === "lg";
  return (
    <div style={{ textAlign:"center", lineHeight:1 }}>
      <div style={{ fontFamily:"var(--font-head)", fontWeight:900, fontSize:big?13:11, letterSpacing:big?3:2, color:"var(--water)", marginBottom:2 }}>GLISTENING WATER</div>
      <div style={{ fontFamily:"var(--font-head)", fontWeight:900, fontSize:big?36:24, letterSpacing:big?4:2, color:"var(--text)", lineHeight:1 }}>💧 POOL TIME</div>
      <div style={{ fontFamily:"var(--font-head)", fontWeight:600, fontSize:big?11:9, letterSpacing:big?3:2, color:"var(--text-dim)", marginTop:3 }}>POOL SERVICE · TIME TRACKER</div>
    </div>
  );
}

// ── PIN Pad ───────────────────────────────────────────────────────────────────
function PinPad({ title, subtitle, onSuccess, onCancel, checkPin, resetKey }) {
  const [digits, setDigits] = useState([]);
  const [shake, setShake] = useState(false);
  const [hint, setHint] = useState("");
  useEffect(() => { setDigits([]); setHint(""); setShake(false); }, [resetKey]);

  function press(d) {
    if (digits.length >= 4) return;
    const next = [...digits, d];
    setDigits(next);
    if (next.length === 4) {
      const pin = next.join("");
      setTimeout(() => {
        if (checkPin(pin)) { onSuccess(pin); }
        else { setShake(true); setHint("Incorrect PIN"); setDigits([]); setTimeout(() => { setShake(false); setHint(""); }, 700); }
      }, 120);
    }
  }

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"var(--surface)", padding:24, animation:"fadeIn 0.2s ease" }}>
      <Logo size="lg" />
      <div style={{ marginTop:16, fontFamily:"var(--font-head)", fontSize:20, fontWeight:700, color:"var(--water)", letterSpacing:1, marginBottom:4 }}>{title}</div>
      {subtitle && <div style={{ color:"var(--text-dim)", fontSize:14, marginBottom:28, textAlign:"center" }}>{subtitle}</div>}
      <div style={{ display:"flex", gap:16, marginBottom:8, animation:shake?"shake 0.4s ease":"none" }}>
        {[0,1,2,3].map(i => <div key={i} style={{ width:18, height:18, borderRadius:"50%", background:i<digits.length?"var(--water)":"var(--surface3)", border:`2px solid ${i<digits.length?"var(--water)":"var(--border)"}`, transition:"background 0.15s", animation:i<digits.length?"pinDot 0.2s ease":"none" }} />)}
      </div>
      <div style={{ height:20, color:"var(--red)", fontSize:13, fontFamily:"var(--font-head)", fontWeight:700, letterSpacing:1, marginBottom:16 }}>{hint}</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, width:240 }}>
        {[1,2,3,4,5,6,7,8,9].map(n => <button key={n} onClick={() => press(String(n))} style={{ height:64, borderRadius:12, background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text)", fontFamily:"var(--font-head)", fontWeight:900, fontSize:28 }}>{n}</button>)}
        <button onClick={() => setDigits(d => d.slice(0,-1))} style={{ height:64, borderRadius:12, background:"var(--surface3)", border:"1px solid var(--border)", color:"var(--text-dim)", fontFamily:"var(--font-head)", fontWeight:700, fontSize:20 }}>⌫</button>
        <button onClick={() => press("0")} style={{ height:64, borderRadius:12, background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text)", fontFamily:"var(--font-head)", fontWeight:900, fontSize:28 }}>0</button>
        <button onClick={onCancel} style={{ height:64, borderRadius:12, background:"var(--surface3)", border:"1px solid var(--border)", color:"var(--text-dim)", fontFamily:"var(--font-head)", fontWeight:700, fontSize:14, letterSpacing:1 }}>BACK</button>
      </div>
    </div>
  );
}

function SetPinFlow({ title, onSet, onCancel }) {
  const [step, setStep] = useState("set");
  const [first, setFirst] = useState("");
  if (step === "set") return <PinPad title={title} subtitle="Choose a 4-digit PIN" onSuccess={pin => { setFirst(pin); setStep("confirm"); }} onCancel={onCancel} checkPin={() => true} resetKey="set" />;
  return <PinPad title="Confirm PIN" subtitle="Enter your PIN again" onSuccess={pin => { if (pin === first) onSet(pin); }} onCancel={() => setStep("set")} checkPin={pin => pin === first} resetKey="confirm" />;
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("loading");
  const [online, setOnline] = useState(navigator.onLine);
  const [techs, setTechs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [gpsCache, setGpsCache] = useState({});
  const [livePositions, setLivePositions] = useState({});
  const [sampleRate, setSampleRate] = useState(ls.get("pool_sampleRate", 60000));
  const [selectedTech, setSelectedTech] = useState(null);
  const [pendingTech, setPendingTech] = useState(null);
  const [pins, setPins] = useState(() => ls.get("pool_pins_v2", {}));
  const [flags, setFlags] = useState(() => ls.get("pool_flags", {}));
  const [now, setNow] = useState(Date.now());
  const leafletReady = useLeaflet();
  const gpsTimers = useRef({});
  const activeSessions = useRef({});
  const wk = getWeekKey();

  const persistPins = p => { setPins(p); ls.set("pool_pins_v2", p); };
  const techColors = {};
  techs.forEach((t,i) => techColors[t] = TECH_COLORS[i % TECH_COLORS.length]);

  // Online/offline
  useEffect(() => {
    const on  = () => { setOnline(true); flushQueue(); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Ticker
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  // Init
  useEffect(() => {
    async function init() {
      await flushQueue();
      let techList = ls.get("pool_techs_cache", []);
      try { techList = await dbGetTechs(); ls.set("pool_techs_cache", techList); } catch {}
      setTechs(techList);
      await refreshSessions();
      await refreshLivePositions();
      setScreen("home");
    }
    init();
  }, []);

  async function refreshSessions() {
    try {
      const data = await dbGetSessions(wk);
      setSessions(data);
      ls.set(`pool_sessions_${wk}`, data);
      activeSessions.current = {};
      data.filter(s => !s.clock_out_at).forEach(s => { activeSessions.current[s.tech_name] = { id: s.id, clock_in_at: s.clock_in_at }; });
    } catch {
      const cached = ls.get(`pool_sessions_${wk}`, []);
      setSessions(cached);
      activeSessions.current = {};
      cached.filter(s => !s.clock_out_at).forEach(s => { activeSessions.current[s.tech_name] = { id: s.id, clock_in_at: s.clock_in_at }; });
    }
  }

  async function refreshLivePositions() {
    try {
      const data = await dbGetLivePositions();
      const map = {};
      data.forEach(p => { map[p.tech_name] = p; });
      setLivePositions(map);
    } catch {}
  }

  async function loadGpsForSession(sessionId) {
    if (gpsCache[sessionId]) return gpsCache[sessionId];
    try {
      const pts = await dbGetGpsPoints(sessionId);
      setGpsCache(c => ({ ...c, [sessionId]: pts }));
      return pts;
    } catch { return []; }
  }

  // Live positions polling
  useEffect(() => { const id = setInterval(refreshLivePositions, 30000); return () => clearInterval(id); }, []);

  // GPS
  function startGPS(tech) {
    if (!navigator.geolocation) return;
    async function capture() {
      navigator.geolocation.getCurrentPosition(async pos => {
        const session = activeSessions.current[tech];
        if (!session) return;
        const pt = await dbInsertGps(session.id, tech, pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        setGpsCache(c => ({ ...c, [session.id]: [...(c[session.id]||[]), pt] }));
        setLivePositions(lp => ({ ...lp, [tech]: { tech_name: tech, lat: pt.lat, lng: pt.lng, last_seen_at: pt.recorded_at, session_id: session.id, clock_in_at: session.clock_in_at } }));
      }, null, { enableHighAccuracy: true, timeout: 10000 });
    }
    capture();
    gpsTimers.current[tech] = setInterval(capture, sampleRate);
  }

  function stopGPS(tech) {
    clearInterval(gpsTimers.current[tech]);
    delete gpsTimers.current[tech];
    setLivePositions(lp => { const n = {...lp}; delete n[tech]; return n; });
  }

  useEffect(() => {
    Object.keys(gpsTimers.current).forEach(tech => { clearInterval(gpsTimers.current[tech]); startGPS(tech); });
  }, [sampleRate]);

  // Clock in/out
  async function handleClockToggle(tech) {
    const session = activeSessions.current[tech];
    if (session) {
      const clock_out_at = await dbClockOut(session.id);
      stopGPS(tech);
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, clock_out_at } : s));
      delete activeSessions.current[tech];
    } else {
      const { id, clock_in_at } = await dbClockIn(tech, wk, todayIndex());
      activeSessions.current[tech] = { id, clock_in_at };
      const newSession = { id, tech_name: tech, clock_in_at, clock_out_at: null, week_key: wk, day_index: todayIndex() };
      setSessions(prev => [...prev, newSession]);
      ls.set(`pool_sessions_${wk}`, [...sessions, newSession]);
      startGPS(tech);
    }
    setScreen("home");
    setSelectedTech(null);
  }

  // Computed
  function isClockedIn(tech) { return !!activeSessions.current[tech]; }
  function techSessions(tech, weekKey = wk) { return sessions.filter(s => s.tech_name === tech && s.week_key === weekKey); }
  function sessionMs(s) { return Math.max(0, (s.clock_out_at ? new Date(s.clock_out_at) : now) - new Date(s.clock_in_at)); }
  function dayMs(tech, dayIdx, weekKey = wk) { return techSessions(tech, weekKey).filter(s => s.day_index === dayIdx).reduce((sum,s) => sum + sessionMs(s), 0); }
  function weekTotalMs(tech, weekKey = wk) { return techSessions(tech, weekKey).reduce((sum,s) => sum + sessionMs(s), 0); }
  function todayMs(tech) { return dayMs(tech, todayIndex()); }
  function isSubmitted(tech, weekKey = wk) { return !!ls.get(`pool_submitted_${tech}_${weekKey}`, false); }
  function setSubmitted(tech, weekKey = wk) { ls.set(`pool_submitted_${tech}_${weekKey}`, true); }
  function isFlagged(tech, day, weekKey = wk) { return !!flags[`${tech}|${weekKey}|${day}`]; }
  function toggleFlag(tech, day, weekKey = wk) { const k=`${tech}|${weekKey}|${day}`; const next={...flags,[k]:!flags[k]}; setFlags(next); ls.set("pool_flags", next); }
  function getManagerPin() { return pins["__manager__"] || DEFAULT_MANAGER_PIN; }
  function getTechPin(tech) { return pins[tech] || null; }
  function hasTechPin(tech) { return !!pins[tech]; }

  async function addTech(name) {
    await dbAddTech(name);
    const next = [...techs, name].sort();
    setTechs(next); ls.set("pool_techs_cache", next);
  }
  async function removeTech(name) {
    await dbRemoveTech(name);
    const next = techs.filter(t => t !== name);
    setTechs(next); ls.set("pool_techs_cache", next);
  }

  // Screen routing
  if (screen === "loading") return (
    <><GlobalStyle />
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"var(--surface)", gap:24 }}>
      <Logo size="lg" />
      <div style={{ width:32, height:32, border:"3px solid var(--water-glow)", borderTop:"3px solid var(--water)", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <div style={{ color:"var(--text-dim)", fontSize:13 }}>Connecting to server…</div>
    </div></>
  );

  if (screen === "pin_verify") return <><GlobalStyle /><PinPad
    title={pendingTech} subtitle="Enter your PIN"
    onSuccess={() => { setSelectedTech(pendingTech); setScreen("tech"); }}
    onCancel={() => { setPendingTech(null); setScreen("home"); }}
    checkPin={pin => pin === getTechPin(pendingTech)}
  /></>;

  if (screen === "pin_set_new") return <><GlobalStyle /><SetPinFlow
    title={`Welcome, ${pendingTech?.split(" ")[0]}!`}
    onSet={pin => { persistPins({...pins,[pendingTech]:pin}); setSelectedTech(pendingTech); setScreen("tech"); }}
    onCancel={() => { setPendingTech(null); setScreen("home"); }}
  /></>;

  if (screen === "pin_manager") return <><GlobalStyle /><PinPad
    title="MANAGER ACCESS" subtitle="Enter manager PIN"
    onSuccess={() => setScreen("manager")}
    onCancel={() => setScreen("home")}
    checkPin={pin => pin === getManagerPin()}
  /></>;

  if (screen === "tech" && selectedTech) return <><GlobalStyle /><TechView
    tech={selectedTech}
    isClockedIn={isClockedIn(selectedTech)}
    todayMs={todayMs(selectedTech)}
    weekTotalMs={weekTotalMs(selectedTech)}
    sessions={techSessions(selectedTech)}
    gpsCache={gpsCache}
    loadGpsForSession={loadGpsForSession}
    livePos={livePositions[selectedTech]}
    leafletReady={leafletReady}
    techColors={techColors}
    pins={pins} persistPins={persistPins}
    submitted={isSubmitted(selectedTech)}
    onToggle={() => handleClockToggle(selectedTech)}
    onSubmit={() => { setSubmitted(selectedTech); setScreen("home"); setSelectedTech(null); }}
    onFlag={day => toggleFlag(selectedTech, day)}
    isFlagged={day => isFlagged(selectedTech, day)}
    onBack={() => { setScreen("home"); setSelectedTech(null); }}
    wk={wk} now={now} sessionMs={sessionMs} dayMs={d => dayMs(selectedTech, d)}
  /></>;

  if (screen === "manager") return <><GlobalStyle /><ManagerView
    techs={techs} sessions={sessions} gpsCache={gpsCache}
    loadGpsForSession={loadGpsForSession}
    livePositions={livePositions}
    leafletReady={leafletReady} techColors={techColors}
    pins={pins} persistPins={persistPins}
    sampleRate={sampleRate}
    onSampleRate={v => { setSampleRate(v); ls.set("pool_sampleRate", v); }}
    onChangeManagerPin={pin => persistPins({...pins,"__manager__":pin})}
    onAddTech={addTech} onRemoveTech={removeTech}
    onBack={() => setScreen("home")}
    isSubmitted={isSubmitted} isFlagged={isFlagged}
    online={online} wk={wk} now={now}
    weekTotalMs={weekTotalMs} dayMs={dayMs} sessionMs={sessionMs} techSessions={techSessions}
  /></>;

  return <><GlobalStyle /><HomeView
    techs={techs} livePositions={livePositions}
    isClockedIn={isClockedIn} techColors={techColors}
    isSubmitted={isSubmitted} online={online} wk={wk}
    onSelect={tech => { setPendingTech(tech); setScreen(hasTechPin(tech)?"pin_verify":"pin_set_new"); }}
    onManager={() => setScreen("pin_manager")}
  /></>;
}

// ── HOME VIEW ─────────────────────────────────────────────────────────────────
function HomeView({ techs, livePositions, isClockedIn, techColors, isSubmitted, online, wk, onSelect, onManager }) {
  const clocked = techs.filter(isClockedIn);
  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"var(--surface2)", borderBottom:"2px solid var(--water)", padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <Logo size="sm" />
          <div style={{ color:"var(--text-dim)", fontSize:13, marginTop:4 }}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:10, color:online?"var(--green)":"var(--amber)", fontFamily:"var(--font-head)", fontWeight:700, letterSpacing:1 }}>{online?"● LIVE":"○ OFFLINE"}</span>
          <button onClick={onManager} style={{ background:"var(--surface3)", color:"var(--text-dim)", padding:"8px 16px", borderRadius:8, fontSize:13, fontFamily:"var(--font-head)", fontWeight:700, letterSpacing:1 }}>MANAGER ▸</button>
        </div>
      </div>

      {clocked.length > 0 && (
        <div style={{ background:"#22c55e12", borderBottom:"1px solid #22c55e33", padding:"8px 20px", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background:"var(--green)", display:"inline-block", animation:"pulse-green 1.5s infinite" }} />
          <span style={{ fontSize:13, color:"var(--green)", fontFamily:"var(--font-head)", fontWeight:700, letterSpacing:1 }}>{clocked.length} TECH{clocked.length>1?"S":""} ON THE CLOCK</span>
          <span style={{ marginLeft:"auto", fontSize:12, color:"var(--text-dim)" }}>{clocked.slice(0,3).join(", ")}{clocked.length>3?` +${clocked.length-3} more`:""}</span>
        </div>
      )}

      <div style={{ flex:1, padding:"12px 16px", display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, color:"var(--text-dim)", fontFamily:"var(--font-head)", fontWeight:700, letterSpacing:2, marginBottom:4 }}>SELECT YOUR NAME — PIN REQUIRED</div>
        {techs.map((tech, i) => {
          const clockedIn = isClockedIn(tech);
          const submitted = isSubmitted(tech);
          const color = techColors[tech];
          return (
            <button key={tech} onClick={() => onSelect(tech)} style={{ background:clockedIn?"#22c55e0e":"var(--surface2)", border:`1px solid ${clockedIn?"#22c55e66":"var(--border)"}`, borderRadius:10, padding:"13px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", animation:"slideUp 0.2s ease both", animationDelay:`${i*0.03}s` }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:"50%", flexShrink:0, background:color+"33", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-head)", fontWeight:900, fontSize:14, color }}>
                  {tech.split(" ").map(n=>n[0]).join("")}
                </div>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontWeight:600, fontSize:16 }}>{tech}</div>
                  <div style={{ fontSize:12, color:"var(--text-dim)", marginTop:1 }}>{clockedIn?"● On the clock":submitted?"✓ Week submitted":"Tap to clock in"}</div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {submitted && <span style={{ fontSize:11, fontFamily:"var(--font-head)", fontWeight:700, color:"var(--green)", background:"#22c55e18", padding:"2px 8px", borderRadius:4 }}>DONE</span>}
                {clockedIn && <span style={{ fontSize:18, animation:"tick 1.2s ease-in-out infinite" }}>⏱</span>}
                <span style={{ color:"var(--text-dim)", fontSize:18 }}>›</span>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ padding:"12px 20px", textAlign:"center", color:"var(--text-dim)", fontSize:11, borderTop:"1px solid var(--border)" }}>
        Week of {wk} · Pool Time Tracker v2.0
      </div>
    </div>
  );
}

// ── TECH VIEW ─────────────────────────────────────────────────────────────────
function TechView({ tech, isClockedIn, todayMs, weekTotalMs, sessions, gpsCache, loadGpsForSession, livePos, leafletReady, techColors, pins, persistPins, submitted, onToggle, onSubmit, onFlag, isFlagged, onBack, wk, now, sessionMs, dayMs }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [todayGps, setTodayGps] = useState([]);
  const today = todayIndex();
  const color = techColors[tech] || "var(--water)";
  const weekHours = weekTotalMs / 3600000;

  useEffect(() => {
    const todaySessions = sessions.filter(s => s.day_index === today);
    Promise.all(todaySessions.map(s => loadGpsForSession(s.id)))
      .then(arrays => setTodayGps(arrays.flat().sort((a,b) => new Date(a.recorded_at)-new Date(b.recorded_at))));
  }, [sessions]);

  const weekDays = [1,2,3,4,5,6,0];

  if (showChangePin) return <SetPinFlow title="Change Your PIN" onSet={pin => { persistPins({...pins,[tech]:pin}); setShowChangePin(false); }} onCancel={() => setShowChangePin(false)} />;

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", animation:"fadeIn 0.2s ease" }}>
      <div style={{ background:"var(--surface2)", borderBottom:`2px solid ${color}`, padding:"14px 20px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onBack} style={{ background:"var(--surface3)", color:"var(--text)", borderRadius:8, padding:"6px 12px", fontSize:20 }}>‹</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"var(--font-head)", fontSize:22, fontWeight:900, letterSpacing:0.5 }}>{tech}</div>
          <div style={{ color:"var(--text-dim)", fontSize:12 }}>Week of {wk}</div>
        </div>
        <button onClick={() => setShowChangePin(true)} style={{ background:"var(--surface3)", color:"var(--text-dim)", borderRadius:8, padding:"6px 12px", fontSize:12, fontFamily:"var(--font-head)", fontWeight:700, letterSpacing:1 }}>🔐 PIN</button>
        {submitted && <span style={{ fontSize:11, fontFamily:"var(--font-head)", fontWeight:700, color:"var(--green)", background:"#22c55e18", padding:"3px 10px", borderRadius:4 }}>SUBMITTED</span>}
      </div>

      <div style={{ padding:"24px 20px 16px", display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
        <div style={{ color:"var(--text-dim)", fontSize:12, fontFamily:"var(--font-head)", letterSpacing:2, textTransform:"uppercase" }}>{todayName()}</div>
        <div style={{ fontFamily:"var(--font-head)", fontSize:48, fontWeight:900, letterSpacing:2, color:isClockedIn?color:"var(--text-dim)", animation:isClockedIn?"tick 1s ease-in-out infinite":"none" }}>
          {formatTime(todayMs)}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:livePos?"var(--green)":"var(--text-dim)" }}>
          {livePos ? <><span style={{ width:8, height:8, borderRadius:"50%", background:"var(--green)", display:"inline-block", animation:"pulse-green 1.5s infinite" }} /> GPS active</> : isClockedIn ? "⏳ Acquiring GPS..." : "📍 GPS tracks when clocked in"}
        </div>

        {!submitted && (
          <button onClick={onToggle} style={{ width:172, height:172, borderRadius:"50%", background:isClockedIn?`radial-gradient(circle,${color}18,${color}06)`:`radial-gradient(circle,var(--green)22,var(--green)08)`, border:`3px solid ${isClockedIn?color:"var(--green)"}`, color:isClockedIn?color:"var(--green)", fontFamily:"var(--font-head)", fontWeight:900, fontSize:22, letterSpacing:2, animation:isClockedIn?"pulse-ring 1.5s infinite":"none", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4 }}>
            <span style={{ fontSize:36 }}>{isClockedIn?"◼":"▶"}</span>
            {isClockedIn?"CLOCK OUT":"CLOCK IN"}
          </button>
        )}
        {submitted && (
          <div style={{ width:172, height:172, borderRadius:"50%", background:"#22c55e12", border:"3px solid #22c55e55", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"var(--green)", fontFamily:"var(--font-head)", fontWeight:900, fontSize:16, letterSpacing:1 }}>
            <span style={{ fontSize:40 }}>✓</span>SUBMITTED
          </div>
        )}

        {sessions.filter(s => s.day_index === today).length > 0 && (
          <div style={{ width:"100%", background:"var(--surface2)", borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"8px 14px", borderBottom:"1px solid var(--border)", fontSize:11, fontFamily:"var(--font-head)", fontWeight:700, letterSpacing:2, color:"var(--text-dim)" }}>TODAY'S ENTRIES</div>
            {sessions.filter(s => s.day_index === today).map((s,i,arr) => (
              <div key={s.id} style={{ padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:i<arr.length-1?"1px solid #47556922":"none" }}>
                <div style={{ fontSize:13 }}>
                  <span style={{ color:"var(--green)" }}>{formatTimestamp(s.clock_in_at)}</span>
                  <span style={{ color:"var(--text-dim)", margin:"0 8px" }}>→</span>
                  <span style={{ color:s.clock_out_at?"var(--red)":"var(--text-dim)" }}>{s.clock_out_at?formatTimestamp(s.clock_out_at):"now"}</span>
                </div>
                <span style={{ fontFamily:"var(--font-head)", fontWeight:700, fontSize:14, color:"var(--text-dim)" }}>{formatHM(sessionMs(s))}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {leafletReady && (isClockedIn || todayGps.length > 0) && (
        <div style={{ padding:"0 16px 12px" }}>
          <button onClick={() => setShowMap(s=>!s)} style={{ width:"100%", padding:"10px", borderRadius:10, background:showMap?"var(--surface3)":"var(--surface2)", border:"1px solid var(--border)", color:"var(--text)", fontFamily:"var(--font-head)", fontWeight:700, fontSize:14, letterSpacing:1 }}>
            {showMap?"▲ HIDE MAP":"▼ SHOW TODAY'S ROUTE"} {todayGps.length>0&&`(${todayGps.length} pts)`}
          </button>
          {showMap && <div style={{ marginTop:8 }}><LeafletMap points={todayGps} techColors={techColors} livePositions={livePos?{[tech]:livePos}:{}} playbackTech={tech} height={260} /></div>}
        </div>
      )}

      <div style={{ height:1, background:"var(--border)" }} />

      <div style={{ padding:"16px 20px", flex:1 }}>
        <div style={{ fontSize:11, color:"var(--text-dim)", fontFamily:"var(--font-head)", fontWeight:700, letterSpacing:2, marginBottom:10 }}>WEEK OVERVIEW</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6 }}>
          {weekDays.map(d => {
            const ms = dayMs(d);
            const hrs = ms/3600000;
            const isToday = d === today;
            const flagged = isFlagged(d);
            const hasData = ms > 0;
            const gpsCount = sessions.filter(s=>s.day_index===d).reduce((n,s)=>(gpsCache[s.id]?.length||0)+n, 0);
            return (
              <button key={d} onClick={() => !submitted && onFlag(d)} style={{ background:isToday?color+"18":"var(--surface2)", border:`1px solid ${isToday?color:flagged?"var(--amber)":"var(--border)"}`, borderRadius:8, padding:"10px 4px", display:"flex", flexDirection:"column", alignItems:"center", gap:5, opacity:!hasData&&d!==today?0.5:1 }}>
                <span style={{ fontSize:10, fontFamily:"var(--font-head)", fontWeight:700, letterSpacing:1, color:isToday?color:"var(--text-dim)" }}>{DAYS[d]}</span>
                <div style={{ width:"100%", height:36, background:"var(--surface3)", borderRadius:4, overflow:"hidden", display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
                  <div style={{ height:`${Math.min(100,(hrs/10)*100)}%`, minHeight:hasData?3:0, background:flagged?"var(--amber)":isToday?color:"var(--green)", borderRadius:4, transition:"height 0.4s ease" }} />
                </div>
                <span style={{ fontSize:10, fontFamily:"var(--font-head)", fontWeight:700, color:hasData?"var(--text)":"var(--text-dim)" }}>{hasData?`${hrs.toFixed(1)}h`:"--"}</span>
                {gpsCount>0&&<span style={{ fontSize:9, color:"var(--text-dim)" }}>📍{gpsCount}</span>}
                {flagged&&<span style={{ fontSize:10 }}>🚩</span>}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop:6, fontSize:11, color:"var(--text-dim)", textAlign:"right" }}>Tap day to flag</div>
      </div>

      <div style={{ padding:"16px 20px", background:"var(--surface2)", borderTop:"1px solid var(--border)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div>
            <div style={{ fontSize:12, color:"var(--text-dim)", fontFamily:"var(--font-head)", letterSpacing:1 }}>WEEK TOTAL</div>
            <div style={{ fontFamily:"var(--font-head)", fontWeight:900, fontSize:36, letterSpacing:1, color:weekHours>=40?"var(--amber)":"var(--text)" }}>
              {weekHours.toFixed(2)}<span style={{ fontSize:16, color:"var(--text-dim)", marginLeft:4 }}>hrs</span>
            </div>
          </div>
          {weekHours>=40&&<span style={{ fontSize:11, fontFamily:"var(--font-head)", fontWeight:700, color:"var(--amber)", background:"#f59e0b18", padding:"3px 10px", borderRadius:4 }}>OT LIKELY</span>}
        </div>
        {!submitted ? (
          showConfirm ? (
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setShowConfirm(false)} style={{ flex:1, padding:14, borderRadius:10, background:"var(--surface3)", color:"var(--text)", fontFamily:"var(--font-head)", fontWeight:700, fontSize:16 }}>CANCEL</button>
              <button onClick={()=>{onSubmit();setShowConfirm(false);}} style={{ flex:2, padding:14, borderRadius:10, background:"var(--green)", color:"#fff", fontFamily:"var(--font-head)", fontWeight:900, fontSize:18, letterSpacing:1 }}>✓ CONFIRM</button>
            </div>
          ) : (
            <button onClick={()=>setShowConfirm(true)} disabled={weekTotalMs===0} style={{ width:"100%", padding:16, borderRadius:10, background:weekTotalMs===0?"var(--surface3)":"var(--water)", color:weekTotalMs===0?"var(--text-dim)":"#fff", fontFamily:"var(--font-head)", fontWeight:900, fontSize:20, letterSpacing:1, opacity:weekTotalMs===0?0.5:1 }}>SUBMIT WEEK →</button>
          )
        ) : (
          <div style={{ padding:16, borderRadius:10, background:"#22c55e12", border:"1px solid #22c55e44", textAlign:"center", fontFamily:"var(--font-head)", fontWeight:700, fontSize:15, color:"var(--green)" }}>✓ Week Submitted</div>
        )}
      </div>
    </div>
  );
}

// ── MANAGER VIEW ──────────────────────────────────────────────────────────────
function ManagerView({ techs, sessions, gpsCache, loadGpsForSession, livePositions, leafletReady, techColors, pins, persistPins, sampleRate, onSampleRate, onChangeManagerPin, onAddTech, onRemoveTech, onBack, isSubmitted, isFlagged, online, wk, now, weekTotalMs, dayMs, sessionMs, techSessions }) {
  const [tab, setTab] = useState("list");
  const [expandedTech, setExpandedTech] = useState(null);
  const [playback, setPlayback] = useState({ tech: null, sessionId: null });
  const [playbackPts, setPlaybackPts] = useState([]);
  const [showPinMgr, setShowPinMgr] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [showChangeMgrPin, setShowChangeMgrPin] = useState(false);
  const [resetTech, setResetTech] = useState(null);
  const [newTechName, setNewTechName] = useState("");
  const [selectedWk, setSelectedWk] = useState(wk);

  useEffect(() => {
    if (!playback.sessionId) { setPlaybackPts([]); return; }
    loadGpsForSession(playback.sessionId).then(setPlaybackPts);
  }, [playback.sessionId]);

  const weeks = [...new Set(sessions.map(s => s.week_key))].sort().reverse();
  if (!weeks.includes(wk)) weeks.unshift(wk);

  const submitted = techs.filter(t => isSubmitted(t, selectedWk));
  const pending   = techs.filter(t => !isSubmitted(t, selectedWk) && techSessions(t, selectedWk).length > 0);
  const noData    = techs.filter(t => techSessions(t, selectedWk).length === 0);

  function exportCSV() {
    const rows = [["Tech","Week",...FULL_DAYS,"Total Hours","Submitted"]];
    techs.forEach(tech => {
      const dayHours = [0,1,2,3,4,5,6].map(d => (dayMs(tech,d,selectedWk)/3600000).toFixed(2));
      rows.push([tech, selectedWk, ...dayHours, (weekTotalMs(tech,selectedWk)/3600000).toFixed(2), isSubmitted(tech,selectedWk)?"Yes":"No"]);
    });
    const csv = rows.map(r=>r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download = `timesheet_${selectedWk}.csv`; a.click();
  }

  if (showChangeMgrPin) return <SetPinFlow title="Change Manager PIN" onSet={pin=>{onChangeManagerPin(pin);setShowChangeMgrPin(false);}} onCancel={()=>setShowChangeMgrPin(false)} />;
  if (resetTech) return <SetPinFlow title={`Reset PIN: ${resetTech}`} onSet={pin=>{persistPins({...pins,[resetTech]:pin});setResetTech(null);}} onCancel={()=>setResetTech(null)} />;

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", animation:"fadeIn 0.2s ease" }}>
      <div style={{ background:"var(--surface2)", borderBottom:"2px solid var(--water)", padding:"14px 20px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onBack} style={{ background:"var(--surface3)", color:"var(--text)", borderRadius:8, padding:"6px 12px", fontSize:20 }}>‹</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"var(--font-head)", fontSize:22, fontWeight:900, letterSpacing:0.5 }}>MANAGER DASHBOARD</div>
          <div style={{ fontSize:11, color:online?"var(--green)":"var(--amber)", fontFamily:"var(--font-head)", fontWeight:700, letterSpacing:1 }}>{online?"● LIVE — Supabase connected":"○ OFFLINE — using cached data"}</div>
        </div>
        <button onClick={exportCSV} style={{ background:"var(--water)", color:"#fff", borderRadius:8, padding:"8px 14px", fontFamily:"var(--font-head)", fontWeight:700, fontSize:13, letterSpacing:1 }}>↓ CSV</button>
      </div>

      {/* Settings */}
      <div style={{ background:"var(--surface2)", borderBottom:"1px solid var(--border)", padding:"10px 16px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <span style={{ fontSize:12, color:"var(--text-dim)", fontFamily:"var(--font-head)", fontWeight:700, letterSpacing:1 }}>GPS:</span>
        <div style={{ display:"flex", gap:6 }}>
          {SAMPLE_RATES.map(r => <button key={r.value} onClick={() => onSampleRate(r.value)} style={{ padding:"4px 10px", borderRadius:6, fontSize:12, fontFamily:"var(--font-head)", fontWeight:700, letterSpacing:1, background:sampleRate===r.value?"var(--water)":"var(--surface3)", color:sampleRate===r.value?"#fff":"var(--text-dim)" }}>{r.label}</button>)}
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <button onClick={()=>{setShowRoster(s=>!s);setShowPinMgr(false);}} style={{ padding:"4px 12px", borderRadius:6, fontSize:12, fontFamily:"var(--font-head)", fontWeight:700, letterSpacing:1, background:"var(--surface3)", color:"var(--text-dim)" }}>👷 ROSTER</button>
          <button onClick={()=>{setShowPinMgr(s=>!s);setShowRoster(false);}} style={{ padding:"4px 12px", borderRadius:6, fontSize:12, fontFamily:"var(--font-head)", fontWeight:700, letterSpacing:1, background:"var(--surface3)", color:"var(--text-dim)" }}>🔐 PINs</button>
        </div>
      </div>

      {/* Roster panel */}
      {showRoster && (
        <div style={{ background:"#1e293bcc", borderBottom:"1px solid var(--border)", padding:"12px 16px", animation:"slideUp 0.2s ease" }}>
          <div style={{ fontSize:11, fontFamily:"var(--font-head)", fontWeight:700, letterSpacing:2, color:"var(--text-dim)", marginBottom:10 }}>ROSTER — synced to Supabase</div>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <input value={newTechName} onChange={e=>setNewTechName(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"&&newTechName.trim()){onAddTech(newTechName.trim());setNewTechName("");} }}
              placeholder="First Last"
              style={{ flex:1, padding:"8px 12px", borderRadius:8, background:"var(--surface3)", border:"1px solid var(--border)", color:"var(--text)", fontFamily:"var(--font-body)", fontSize:14, outline:"none" }} />
            <button onClick={()=>{ if(newTechName.trim()){onAddTech(newTechName.trim());setNewTechName("");} }} style={{ padding:"8px 14px", borderRadius:8, background:"var(--water)", color:"#fff", fontFamily:"var(--font-head)", fontWeight:700, fontSize:13, letterSpacing:1 }}>+ ADD</button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {techs.map(t => (
              <div key={t} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"var(--surface3)", borderRadius:8, padding:"8px 12px" }}>
                <span style={{ fontSize:14, fontWeight:600 }}>{t}</span>
                <button onClick={()=>{ if(window.confirm(`Remove ${t}?`)) onRemoveTech(t); }} style={{ background:"#ef444422", color:"var(--red)", border:"1px solid #ef444444", borderRadius:6, padding:"4px 10px", fontFamily:"var(--font-head)", fontWeight:700, fontSize:12 }}>REMOVE</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PIN panel */}
      {showPinMgr && (
        <div style={{ background:"#1e293bcc", borderBottom:"1px solid var(--border)", padding:"12px 16px", animation:"slideUp 0.2s ease" }}>
          <div style={{ fontSize:11, fontFamily:"var(--font-head)", fontWeight:700, letterSpacing:2, color:"var(--text-dim)", marginBottom:10 }}>PIN MANAGEMENT</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:10 }}>
            {techs.map(t => <button key={t} onClick={()=>setResetTech(t)} style={{ padding:"5px 12px", borderRadius:6, fontSize:12, background:"var(--surface3)", color:pins[t]?"var(--text)":"var(--amber)", fontFamily:"var(--font-head)", fontWeight:700, border:`1px solid ${pins[t]?"var(--border)":"var(--amber)44"}` }}>{t.split(" ")[0]} {pins[t]?"✓":"(no PIN)"}</button>)}
          </div>
          <button onClick={()=>setShowChangeMgrPin(true)} style={{ padding:"6px 14px", borderRadius:6, fontSize:12, background:"var(--purple)22", color:"var(--purple)", fontFamily:"var(--font-head)", fontWeight:700, letterSpacing:1, border:"1px solid var(--purple)44" }}>Change Manager PIN</button>
        </div>
      )}

      {/* Week selector */}
      <div style={{ padding:"10px 16px", background:"var(--surface2)", borderBottom:"1px solid var(--border)", display:"flex", gap:8, overflowX:"auto" }}>
        {weeks.map(w => <button key={w} onClick={()=>setSelectedWk(w)} style={{ padding:"6px 14px", borderRadius:6, whiteSpace:"nowrap", fontSize:13, fontFamily:"var(--font-head)", fontWeight:700, letterSpacing:1, background:selectedWk===w?"var(--water)":"var(--surface3)", color:selectedWk===w?"#fff":"var(--text-dim)" }}>{w===wk?`THIS WEEK (${w})`:w}</button>)}
      </div>

      {/* Summary cards */}
      <div style={{ padding:"12px 16px", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
        {[{label:"SUBMITTED",val:submitted.length,color:"var(--green)"},{label:"PENDING",val:pending.length,color:"var(--amber)"},{label:"NO DATA",val:noData.length,color:"var(--text-dim)"}].map(({label,val,color})=>(
          <div key={label} style={{ background:"var(--surface2)", border:`1px solid ${color}44`, borderRadius:10, padding:"12px 10px", textAlign:"center" }}>
            <div style={{ fontFamily:"var(--font-head)", fontWeight:900, fontSize:32, color }}>{val}</div>
            <div style={{ fontSize:10, color:"var(--text-dim)", fontFamily:"var(--font-head)", letterSpacing:1 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:"1px solid var(--border)", padding:"0 16px" }}>
        {["list","map"].map(t => <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:"10px", fontFamily:"var(--font-head)", fontWeight:700, fontSize:14, letterSpacing:1, background:"transparent", color:tab===t?"var(--water)":"var(--text-dim)", borderBottom:tab===t?"2px solid var(--water)":"2px solid transparent" }}>{t==="list"?"👥 TECHS":"🗺️ LIVE MAP"}</button>)}
      </div>

      {/* MAP TAB */}
      {tab==="map" && leafletReady && (
        <div style={{ padding:"12px 16px", flex:1 }}>
          <div style={{ fontSize:11, color:"var(--text-dim)", fontFamily:"var(--font-head)", letterSpacing:1, marginBottom:8 }}>LIVE POSITIONS · {Object.keys(livePositions).length} techs visible</div>
          <LeafletMap points={playbackPts} techColors={techColors} livePositions={livePositions} playbackTech={playback.tech} height={300} />
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:11, fontFamily:"var(--font-head)", fontWeight:700, letterSpacing:2, color:"var(--text-dim)", marginBottom:8 }}>ROUTE PLAYBACK</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button onClick={()=>setPlayback({tech:null,sessionId:null})} style={{ padding:"5px 12px", borderRadius:6, fontSize:12, fontFamily:"var(--font-head)", fontWeight:700, background:!playback.tech?"var(--water)":"var(--surface3)", color:!playback.tech?"#fff":"var(--text-dim)" }}>ALL LIVE</button>
              {techs.map(t => {
                const s = sessions.find(x => x.tech_name===t && x.day_index===todayIndex() && x.week_key===wk);
                if (!s) return null;
                return <button key={t} onClick={()=>setPlayback({tech:t,sessionId:s.id})} style={{ padding:"5px 12px", borderRadius:6, fontSize:12, fontFamily:"var(--font-head)", fontWeight:700, background:playback.tech===t?techColors[t]:"var(--surface3)", color:playback.tech===t?"#fff":"var(--text-dim)" }}>{t.split(" ")[0]}</button>;
              })}
            </div>
          </div>
        </div>
      )}

      {/* LIST TAB */}
      {tab==="list" && (
        <div style={{ flex:1, padding:"0 16px 20px", display:"flex", flexDirection:"column", gap:8, marginTop:12 }}>
          {techs.map(tech => {
            const total = weekTotalMs(tech, selectedWk);
            const sub = isSubmitted(tech, selectedWk);
            const hasAny = total > 0;
            const isExpanded = expandedTech === tech;
            const isLive = !!livePositions[tech];
            const color = techColors[tech];
            return (
              <div key={tech} style={{ background:"var(--surface2)", border:`1px solid ${sub?"#22c55e55":"var(--border)"}`, borderRadius:10, overflow:"hidden" }}>
                <button onClick={()=>setExpandedTech(isExpanded?null:tech)} style={{ width:"100%", padding:"12px 14px", background:"transparent", color:"var(--text)", display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0, background:color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-head)", fontWeight:900, fontSize:13, color }}>
                    {tech.split(" ").map(n=>n[0]).join("")}
                  </div>
                  <div style={{ flex:1, textAlign:"left" }}>
                    <div style={{ fontWeight:600, fontSize:15, display:"flex", alignItems:"center", gap:6 }}>
                      {tech}
                      {isLive&&<span style={{ width:7, height:7, borderRadius:"50%", background:"var(--green)", display:"inline-block", animation:"pulse-green 1.5s infinite" }}/>}
                    </div>
                    <div style={{ fontSize:12, color:"var(--text-dim)" }}>{sub?"✓ Submitted":hasAny?"Not submitted":"No entries this week"}</div>
                  </div>
                  <div style={{ textAlign:"right", marginRight:8 }}>
                    <div style={{ fontFamily:"var(--font-head)", fontWeight:900, fontSize:20 }}>{(total/3600000).toFixed(2)}</div>
                    <div style={{ fontSize:10, color:"var(--text-dim)" }}>hrs</div>
                  </div>
                  <span style={{ color:"var(--text-dim)" }}>{isExpanded?"▲":"▼"}</span>
                </button>

                {isExpanded && (
                  <div style={{ borderTop:"1px solid var(--border)", padding:"10px 14px", animation:"slideUp 0.15s ease" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6, marginBottom:12 }}>
                      {[1,2,3,4,5,6,0].map(d => {
                        const ms = dayMs(tech, d, selectedWk);
                        const flagged = isFlagged(tech, d, selectedWk);
                        const gpsCount = sessions.filter(s=>s.tech_name===tech&&s.day_index===d&&s.week_key===selectedWk).reduce((n,s)=>(gpsCache[s.id]?.length||0)+n, 0);
                        return (
                          <div key={d} style={{ background:flagged?"#f59e0b12":"var(--surface3)", borderRadius:6, padding:"6px 4px", textAlign:"center", border:flagged?"1px solid #f59e0b44":"1px solid transparent" }}>
                            <div style={{ fontSize:10, fontFamily:"var(--font-head)", fontWeight:700, color:"var(--text-dim)", letterSpacing:1 }}>{DAYS[d]}</div>
                            <div style={{ fontFamily:"var(--font-head)", fontWeight:700, fontSize:13, marginTop:4 }}>{ms>0?`${(ms/3600000).toFixed(1)}h`:"--"}</div>
                            {gpsCount>0&&<div style={{ fontSize:9, color:"var(--text-dim)", marginTop:2 }}>📍{gpsCount}</div>}
                            {flagged&&<div style={{ fontSize:10 }}>🚩</div>}
                          </div>
                        );
                      })}
                    </div>
                    {techSessions(tech, selectedWk).map(s => (
                      <div key={s.id} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"2px 0", color:"var(--text-dim)" }}>
                        <span>{DAYS[s.day_index]}: {formatTimestamp(s.clock_in_at)} → {s.clock_out_at?formatTimestamp(s.clock_out_at):"active"}</span>
                        <span style={{ fontFamily:"var(--font-head)", fontWeight:700 }}>{formatHM(sessionMs(s))}</span>
                      </div>
                    ))}
                    <div style={{ display:"flex", gap:8, marginTop:10 }}>
                      <button onClick={()=>{ setTab("map"); const s=sessions.find(x=>x.tech_name===tech&&x.day_index===todayIndex()); if(s) setPlayback({tech,sessionId:s.id}); }} style={{ padding:"7px 14px", borderRadius:8, background:"var(--surface3)", color:"var(--water)", fontFamily:"var(--font-head)", fontWeight:700, fontSize:13, letterSpacing:1 }}>🗺️ VIEW ROUTE</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
