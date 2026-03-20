import { useRef, useCallback } from "react";

// ── useGPS ────────────────────────────────────────────────────────────────────
// Manages geolocation watchers per tech.
// Supports configurable sample rate stored in localStorage.

const RATE_KEY = "pool_gps_rate";
export const getGPSRate   = () => parseInt(localStorage.getItem(RATE_KEY) ?? "60000");
export const setGPSRate   = (ms) => localStorage.setItem(RATE_KEY, String(ms));

export function useGPS({ onPoint }) {
  const timers  = useRef({});   // { [tech]: intervalId }
  const watches = useRef({});   // { [tech]: watchId } — for live accuracy

  const capture = useCallback((tech) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => onPoint(tech, {
        lat: coords.latitude,
        lng: coords.longitude,
        acc: Math.round(coords.accuracy),
        ts:  new Date().toISOString(),
      }),
      (err) => console.warn("GPS error:", err.message),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 }
    );
  }, [onPoint]);

  const startTracking = useCallback((tech) => {
    if (timers.current[tech]) return; // already tracking
    capture(tech); // immediate first capture
    timers.current[tech] = setInterval(() => capture(tech), getGPSRate());
  }, [capture]);

  const stopTracking = useCallback((tech) => {
    clearInterval(timers.current[tech]);
    delete timers.current[tech];
  }, []);

  const updateRate = useCallback((ms) => {
    setGPSRate(ms);
    // Restart all active timers with new rate
    Object.keys(timers.current).forEach(tech => {
      clearInterval(timers.current[tech]);
      timers.current[tech] = setInterval(() => capture(tech), ms);
    });
  }, [capture]);

  return { startTracking, stopTracking, updateRate };
}
