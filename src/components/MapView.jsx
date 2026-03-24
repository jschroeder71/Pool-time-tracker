import { useEffect, useRef, useState } from "react";
import { formatTS } from "../utils";

// ── Leaflet loader ────────────────────────────────────────────────────────────
function useLeaflet() {
  const [ready, setReady] = useState(!!window.L);
  useEffect(() => {
    if (window.L) { setReady(true); return; }
    // CSS
    const link  = document.createElement("link");
    link.rel    = "stylesheet";
    link.href   = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);
    // JS
    const script  = document.createElement("script");
    script.src    = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);
  return ready;
}

// ── MapView ───────────────────────────────────────────────────────────────────
export function MapView({ points = [], livePos = {}, techColors = {}, height = 280, playTech = null }) {
  const leafletReady = useLeaflet();
  const elRef   = useRef(null);
  const mapRef  = useRef(null);
  const lyrsRef = useRef([]);

  // Init map only once Leaflet is loaded
  useEffect(() => {
    if (!leafletReady || !elRef.current || mapRef.current) return;
    mapRef.current = window.L.map(elRef.current, { zoomControl: true, attributionControl: false });
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(mapRef.current);
    mapRef.current.setView([28.5, -81.4], 10);
  }, [leafletReady]);

  // Update layers when data or readiness changes
  useEffect(() => {
    if (!leafletReady || !window.L || !mapRef.current) return;
    const L   = window.L;
    const map = mapRef.current;

    lyrsRef.current.forEach(l => map.removeLayer(l));
    lyrsRef.current = [];

    const allCoords = [];

    // Route playback
    if (points.length > 1) {
      const color  = techColors[playTech] ?? "#38bdf8";
      const coords = points.map(p => [p.lat, p.lng]);
      allCoords.push(...coords);

      const line = L.polyline(coords, { color, weight: 3, opacity: 0.85 }).addTo(map);
      lyrsRef.current.push(line);

      points.forEach((p, i) => {
        const isLast = i === points.length - 1;
        const dot = L.circleMarker([p.lat, p.lng], {
          radius: isLast ? 9 : 5,
          color,
          fillColor: isLast ? color : "#fff",
          fillOpacity: 1,
          weight: 2,
        }).bindPopup(`<b>${formatTS(p.ts)}</b>`).addTo(map);
        lyrsRef.current.push(dot);
      });
    }

    // Live tech pins
    Object.entries(livePos).forEach(([tech, pos]) => {
      if (!pos) return;
      const color    = techColors[tech] ?? "#38bdf8";
      const initials = tech.split(" ").map(n => n[0]).join("");
      const icon     = L.divIcon({
        html: `<div style="background:${color};color:#fff;font-family:Syne,sans-serif;font-weight:800;font-size:11px;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5)">${initials}</div>`,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const m = L.marker([pos.lat, pos.lng], { icon })
        .bindPopup(`<b>${tech}</b><br/>${formatTS(pos.ts)}`)
        .addTo(map);
      lyrsRef.current.push(m);
      allCoords.push([pos.lat, pos.lng]);
    });

    if (allCoords.length > 0) {
      try { map.fitBounds(allCoords, { padding: [28, 28], maxZoom: 16 }); }
      catch {}
    }

    setTimeout(() => map.invalidateSize(), 80);
  }, [leafletReady, points, livePos, techColors, playTech]);

  return (
    <div style={{ position: "relative", height, width: "100%", borderRadius: 12, overflow: "hidden", background: "#21262d" }}>
      {!leafletReady && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          color: "#8b949e", fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700,
        }}>
          Loading map…
        </div>
      )}
      <div ref={elRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
