// ============================================================
// src/LiveMap.jsx
// Output 1.5 — Manager Live Map
// Pool Time Tracker
// Requires: leaflet (already in project), @supabase/supabase-js
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { getLivePositions, subscribeToLivePositions, getRouteForSession } from "./lib/supabase";

/* ----------------------------------------------------------
   Leaflet CSS — inject once
---------------------------------------------------------- */
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS  = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function injectLeaflet() {
  if (document.getElementById("leaflet-css")) return Promise.resolve();
  return new Promise(resolve => {
    const link  = document.createElement("link");
    link.id     = "leaflet-css";
    link.rel    = "stylesheet";
    link.href   = LEAFLET_CSS;
    document.head.appendChild(link);

    const script  = document.createElement("script");
    script.src    = LEAFLET_JS;
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

/* ----------------------------------------------------------
   Helpers
---------------------------------------------------------- */
function fmtDuration(secs) {
  if (!secs && secs !== 0) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtLastSeen(iso) {
  if (!iso) return "—";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return fmtTime(iso);
}

const STATUS_COLOR = {
  active:  "#10b981",
  idle:    "#f59e0b",
  offline: "#64748b",
};

/* ----------------------------------------------------------
   Styles
---------------------------------------------------------- */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  .lm-root {
    font-family: 'DM Sans', sans-serif;
    background: #080d14;
    color: #e2e8f0;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ---- top bar ---- */
  .lm-topbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    background: rgba(13,22,38,0.98);
    border-bottom: 1px solid rgba(99,179,237,0.12);
    z-index: 500;
    flex-shrink: 0;
  }

  .lm-logo {
    width: 32px; height: 32px;
    background: linear-gradient(135deg, #3b82f6, #06b6d4);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
    box-shadow: 0 0 16px rgba(59,130,246,0.4);
  }

  .lm-title {
    font-family: 'Syne', sans-serif;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.3px;
    color: #f0f6ff;
    flex: 1;
  }

  .lm-pill {
    display: flex; align-items: center; gap: 6px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .lm-pill.live {
    background: rgba(16,185,129,0.12);
    border: 1px solid rgba(16,185,129,0.25);
    color: #34d399;
  }

  .lm-pill.offline {
    background: rgba(100,116,139,0.12);
    border: 1px solid rgba(100,116,139,0.2);
    color: #64748b;
  }

  .lm-dot-pulse {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #10b981;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(0.7); }
  }

  .lm-refresh-btn {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    color: #94a3b8;
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .lm-refresh-btn:hover { background: rgba(255,255,255,0.09); color: #e2e8f0; }

  /* ---- layout ---- */
  .lm-body {
    flex: 1;
    display: flex;
    overflow: hidden;
    position: relative;
  }

  /* ---- sidebar ---- */
  .lm-sidebar {
    width: 260px;
    flex-shrink: 0;
    background: rgba(10,17,28,0.97);
    border-right: 1px solid rgba(99,179,237,0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 200;
  }

  .lm-sidebar-header {
    padding: 14px 16px 10px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }

  .lm-sidebar-title {
    font-family: 'Syne', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #475569;
    margin-bottom: 2px;
  }

  .lm-tech-count {
    font-size: 22px;
    font-weight: 300;
    color: #60a5fa;
    font-family: 'Syne', sans-serif;
  }

  .lm-tech-count span {
    font-size: 12px;
    color: #475569;
    font-weight: 400;
  }

  .lm-tech-list {
    overflow-y: auto;
    flex: 1;
    padding: 8px 0;
  }

  .lm-tech-list::-webkit-scrollbar { width: 3px; }
  .lm-tech-list::-webkit-scrollbar-track { background: transparent; }
  .lm-tech-list::-webkit-scrollbar-thumb { background: rgba(99,179,237,0.2); border-radius: 2px; }

  .lm-tech-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    cursor: pointer;
    transition: background 0.15s;
    border-left: 3px solid transparent;
  }

  .lm-tech-row:hover { background: rgba(255,255,255,0.04); }

  .lm-tech-row.selected {
    background: rgba(59,130,246,0.08);
    border-left-color: #3b82f6;
  }

  .lm-tech-avatar {
    width: 32px; height: 32px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px;
    font-weight: 700;
    font-family: 'Syne', sans-serif;
    flex-shrink: 0;
    position: relative;
  }

  .lm-status-ring {
    position: absolute;
    inset: -2px;
    border-radius: 50%;
    border: 2px solid;
  }

  .lm-tech-info { flex: 1; min-width: 0; }

  .lm-tech-name {
    font-size: 13px;
    font-weight: 500;
    color: #cbd5e1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lm-tech-meta {
    font-size: 11px;
    color: #475569;
    margin-top: 1px;
  }

  .lm-hours-badge {
    font-size: 11px;
    font-weight: 600;
    color: #60a5fa;
    background: rgba(59,130,246,0.1);
    padding: 2px 7px;
    border-radius: 10px;
  }

  /* ---- map ---- */
  .lm-map-wrap {
    flex: 1;
    position: relative;
  }

  #lm-map {
    width: 100%;
    height: 100%;
  }

  /* ---- popup ---- */
  .lm-popup {
    font-family: 'DM Sans', sans-serif;
    min-width: 200px;
  }

  .lm-popup-name {
    font-family: 'Syne', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .lm-popup-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
  }

  .lm-popup-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #475569;
    margin-bottom: 4px;
  }

  .lm-popup-val {
    font-weight: 500;
    color: #1e293b;
    text-align: right;
    max-width: 130px;
  }

  .lm-popup-address {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
    font-size: 11px;
    color: #64748b;
    line-height: 1.4;
  }

  .lm-popup-route-btn {
    margin-top: 10px;
    width: 100%;
    padding: 7px;
    background: #3b82f6;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
  }

  /* ---- route panel ---- */
  .lm-route-panel {
    position: absolute;
    bottom: 20px;
    right: 16px;
    background: rgba(10,17,28,0.95);
    border: 1px solid rgba(99,179,237,0.15);
    border-radius: 12px;
    padding: 14px 16px;
    z-index: 400;
    min-width: 220px;
    backdrop-filter: blur(12px);
    animation: slideUp 0.2s ease;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .lm-route-title {
    font-family: 'Syne', sans-serif;
    font-size: 12px;
    font-weight: 700;
    color: #60a5fa;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .lm-route-close {
    background: none; border: none;
    color: #475569; cursor: pointer; font-size: 16px; line-height: 1;
  }

  .lm-route-close:hover { color: #94a3b8; }

  .lm-route-stat {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 3px;
  }

  /* ---- loading / error states ---- */
  .lm-overlay {
    position: absolute;
    inset: 0;
    background: rgba(8,13,20,0.85);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 600;
    gap: 12px;
  }

  .lm-spinner {
    width: 32px; height: 32px;
    border: 3px solid rgba(59,130,246,0.2);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .lm-overlay-text {
    font-size: 13px;
    color: #475569;
  }

  .lm-error-box {
    background: rgba(244,63,94,0.1);
    border: 1px solid rgba(244,63,94,0.25);
    border-radius: 10px;
    padding: 14px 18px;
    font-size: 13px;
    color: #fb7185;
    max-width: 300px;
    text-align: center;
    line-height: 1.5;
  }

  /* ---- empty state ---- */
  .lm-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 8px;
    color: #334155;
    font-size: 13px;
    text-align: center;
    padding: 24px;
  }

  .lm-empty-icon { font-size: 36px; margin-bottom: 4px; }
`;

/* ----------------------------------------------------------
   Avatar colour palette (deterministic by name)
---------------------------------------------------------- */
const AVATAR_COLORS = [
  ["#1e3a5f","#60a5fa"], ["#1a3a2a","#34d399"], ["#3b1f3f","#a78bfa"],
  ["#3f2a1a","#fb923c"], ["#1f3040","#38bdf8"], ["#3a1f1f","#f87171"],
];

function avatarStyle(name) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  const [bg, color] = AVATAR_COLORS[idx];
  return { background: bg, color };
}

function initials(name) {
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

/* ----------------------------------------------------------
   Component
---------------------------------------------------------- */
export default function LiveMap() {
  const mapRef       = useRef(null);
  const leafletRef   = useRef(null);   // L instance
  const markersRef   = useRef({});     // technicianId → L.marker
  const routeLineRef = useRef(null);

  const [positions, setPositions]     = useState([]);
  const [selected, setSelected]       = useState(null);  // technician_id
  const [routeData, setRouteData]     = useState(null);  // { name, points }
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  // ---- init Leaflet ----
  useEffect(() => {
    injectLeaflet().then(() => setLeafletReady(true));
  }, []);

  useEffect(() => {
    if (!leafletReady) return;
    const L = window.L;
    if (mapRef.current && !leafletRef.current) {
      const map = L.map("lm-map", {
        center:    [28.5, -81.4],  // Central Florida default
        zoom:      11,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      leafletRef.current = map;
    }
  }, [leafletReady]);

  // ---- fetch positions ----
  const fetchPositions = useCallback(async () => {
    try {
      const data = await getLivePositions();
      setPositions(data);
      setLastRefresh(new Date());
      setError(null);
    } catch (e) {
      setError(e.message || "Failed to load positions");
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- initial fetch + realtime subscription ----
  useEffect(() => {
    fetchPositions();
    const unsub = subscribeToLivePositions(fetchPositions);
    return unsub;
  }, [fetchPositions]);

  // ---- sync markers to map ----
  useEffect(() => {
    if (!leafletRef.current || !leafletReady) return;
    const L = window.L;
    const map = leafletRef.current;
    const seen = new Set();

    positions.forEach(pos => {
      seen.add(pos.technician_id);
      const { lat, lng } = pos;
      const color = STATUS_COLOR.active;

      const svgIcon = L.divIcon({
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
        html: `
          <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="18" r="14" fill="${color}" fill-opacity="0.18"/>
            <circle cx="18" cy="18" r="9"  fill="${color}"/>
            <circle cx="18" cy="18" r="14" fill="none" stroke="${color}" stroke-width="1.5" stroke-opacity="0.5">
              <animate attributeName="r" from="9" to="17" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="stroke-opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite"/>
            </circle>
          </svg>`,
      });

      const popupHtml = `
        <div class="lm-popup">
          <div class="lm-popup-name">
            <span class="lm-popup-dot" style="background:${color}"></span>
            ${pos.technician_name}
          </div>
          <div class="lm-popup-row">
            <span>Status</span>
            <span class="lm-popup-val" style="color:${color}">● Clocked In</span>
          </div>
          <div class="lm-popup-row">
            <span>Clock-in</span>
            <span class="lm-popup-val">${fmtTime(pos.clock_in_at)}</span>
          </div>
          <div class="lm-popup-row">
            <span>Hours today</span>
            <span class="lm-popup-val">${fmtDuration(pos.session_duration_secs)}</span>
          </div>
          <div class="lm-popup-row">
            <span>Last seen</span>
            <span class="lm-popup-val">${fmtLastSeen(pos.last_seen_at)}</span>
          </div>
          ${pos.current_address ? `<div class="lm-popup-address">📍 ${pos.current_address}</div>` : ""}
          <button class="lm-popup-route-btn" onclick="window._lmShowRoute('${pos.technician_id}','${pos.technician_name}','${pos.session_id}')">
            Show Route →
          </button>
        </div>`;

      if (markersRef.current[pos.technician_id]) {
        markersRef.current[pos.technician_id]
          .setLatLng([lat, lng])
          .setIcon(svgIcon)
          .getPopup()?.setContent(popupHtml);
      } else {
        const marker = L.marker([lat, lng], { icon: svgIcon })
          .bindPopup(popupHtml, { maxWidth: 260, className: "lm-leaflet-popup" })
          .addTo(map);
        markersRef.current[pos.technician_id] = marker;
      }
    });

    // remove stale markers (techs who clocked out)
    Object.keys(markersRef.current).forEach(id => {
      if (!seen.has(id)) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });
  }, [positions, leafletReady]);

  // ---- route handler (bridge for Leaflet popup buttons) ----
  useEffect(() => {
    window._lmShowRoute = async (techId, techName, sessionId) => {
      try {
        const pts = await getRouteForSession(sessionId);
        if (!pts.length) return;

        if (routeLineRef.current) {
          leafletRef.current.removeLayer(routeLineRef.current);
        }

        const L = window.L;
        const latlngs = pts.map(p => [p.lat, p.lng]);
        routeLineRef.current = L.polyline(latlngs, {
          color: "#3b82f6",
          weight: 3,
          opacity: 0.85,
          dashArray: "6 4",
        }).addTo(leafletRef.current);

        leafletRef.current.fitBounds(routeLineRef.current.getBounds(), { padding: [30, 30] });
        setRouteData({ name: techName, points: pts });
        setSelected(techId);
      } catch (e) {
        console.error("Route load failed:", e);
      }
    };
    return () => { delete window._lmShowRoute; };
  }, []);

  const clearRoute = () => {
    if (routeLineRef.current) {
      leafletRef.current?.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }
    setRouteData(null);
    setSelected(null);
  };

  const focusTech = (pos) => {
    if (!leafletRef.current) return;
    leafletRef.current.setView([pos.lat, pos.lng], 14, { animate: true });
    markersRef.current[pos.technician_id]?.openPopup();
    setSelected(pos.technician_id);
  };

  // ---- render ----
  return (
    <>
      <style>{css}</style>
      <div className="lm-root">

        {/* top bar */}
        <div className="lm-topbar">
          <div className="lm-logo">🏊</div>
          <div className="lm-title">Live Field Map</div>
          <div className={`lm-pill ${error ? "offline" : "live"}`}>
            {!error && <span className="lm-dot-pulse" />}
            {error ? "Offline" : "Live"}
          </div>
          <button className="lm-refresh-btn" onClick={fetchPositions} title="Refresh now">
            ↻
          </button>
        </div>

        <div className="lm-body">

          {/* sidebar */}
          <div className="lm-sidebar">
            <div className="lm-sidebar-header">
              <div className="lm-sidebar-title">Active Technicians</div>
              <div className="lm-tech-count">
                {positions.length} <span>/ 12 clocked in</span>
              </div>
            </div>
            <div className="lm-tech-list">
              {positions.length === 0 && !loading && (
                <div className="lm-empty" style={{ height: "auto", padding: "32px 16px" }}>
                  <div className="lm-empty-icon">🔇</div>
                  No technicians currently clocked in
                </div>
              )}
              {positions.map(pos => {
                const av = avatarStyle(pos.technician_name);
                return (
                  <div
                    key={pos.technician_id}
                    className={`lm-tech-row ${selected === pos.technician_id ? "selected" : ""}`}
                    onClick={() => focusTech(pos)}
                  >
                    <div className="lm-tech-avatar" style={{ background: av.background, color: av.color }}>
                      {initials(pos.technician_name)}
                      <span className="lm-status-ring" style={{ borderColor: STATUS_COLOR.active }} />
                    </div>
                    <div className="lm-tech-info">
                      <div className="lm-tech-name">{pos.technician_name}</div>
                      <div className="lm-tech-meta">{fmtLastSeen(pos.last_seen_at)}</div>
                    </div>
                    <div className="lm-hours-badge">{fmtDuration(pos.session_duration_secs)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* map */}
          <div className="lm-map-wrap" ref={mapRef}>
            <div id="lm-map" />

            {loading && (
              <div className="lm-overlay">
                <div className="lm-spinner" />
                <div className="lm-overlay-text">Loading live positions…</div>
              </div>
            )}

            {error && !loading && (
              <div className="lm-overlay">
                <div className="lm-error-box">
                  ⚠️ {error}
                  <br /><br />
                  <button className="lm-refresh-btn" style={{ width: "100%" }} onClick={fetchPositions}>
                    Retry
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && positions.length === 0 && (
              <div className="lm-overlay" style={{ background: "rgba(8,13,20,0.5)" }}>
                <div className="lm-empty">
                  <div className="lm-empty-icon">🗺️</div>
                  No technicians are currently clocked in.<br />
                  Markers will appear here as techs start their shifts.
                </div>
              </div>
            )}

            {/* route info panel */}
            {routeData && (
              <div className="lm-route-panel">
                <div className="lm-route-title">
                  Route — {routeData.name}
                  <button className="lm-route-close" onClick={clearRoute}>×</button>
                </div>
                <div className="lm-route-stat">📍 {routeData.points.length} GPS points</div>
                <div className="lm-route-stat">
                  🕐 From {fmtTime(routeData.points[0]?.recorded_at)} → {fmtTime(routeData.points.at(-1)?.recorded_at)}
                </div>
                {routeData.points.at(-1)?.address && (
                  <div className="lm-route-stat" style={{ marginTop: 6, color: "#60a5fa" }}>
                    Last known: {routeData.points.at(-1).address}
                  </div>
                )}
              </div>
            )}

            {/* last refresh timestamp */}
            {lastRefresh && (
              <div style={{
                position: "absolute", bottom: 8, left: 8,
                background: "rgba(8,13,20,0.7)",
                borderRadius: 6, padding: "3px 8px",
                fontSize: 10, color: "#334155",
                zIndex: 300, letterSpacing: "0.3px",
              }}>
                Updated {fmtLastSeen(lastRefresh.toISOString())}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
