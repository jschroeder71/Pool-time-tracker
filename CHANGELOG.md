# Changelog — Pool Time Tracker

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.2] — Supabase Live Map — 2026-03-19

### Added
- **`supabase/schema.sql`** — Full database schema for Supabase (Postgres):
  - `technicians` table — roster of field techs (PINs remain localStorage only)
  - `sessions` table — clock-in/out records with computed `duration_secs` column
  - `gps_points` table — one row per GPS ping, indexed by session and technician
  - `live_positions` view — latest GPS point per active session, used by the manager map
  - Row Level Security (RLS) policies — anon read/insert for app clients
  - Supabase Realtime enabled on `gps_points` and `sessions` tables
- **`src/lib/supabase.js`** — Supabase client + all DB helper functions:
  - `getTechnicians()` / `getTechnicianByName()`
  - `clockIn(technicianId)` / `clockOut(sessionId)` / `getActiveSession()`
  - `getHoursToday(technicianId)` — total hours worked today, handles active sessions
  - `recordGpsPoint({...})` — called every 60 s by the tracking interval
  - `getRouteForSession(sessionId)` — ordered GPS points for route drawing
  - `getLivePositions()` — reads `live_positions` view for manager map
  - `subscribeToLivePositions(onUpdate)` — Realtime subscription, returns unsubscribe fn
  - `getSessionsForExport(from, to)` + `downloadCsv(rows)` — CSV export helpers
- **`src/LiveMap.jsx`** — Manager live map component:
  - Dark CartoDB tile layer matching app theme
  - Animated SVG pulse markers for each clocked-in technician
  - Left sidebar showing all active techs with hours worked + last seen timestamp
  - Popup on marker tap: name, status, clock-in time, hours today, last seen, current address
  - "Show Route" button in popup draws the tech's full GPS route as a dashed polyline
  - Route info panel (bottom-right) shows point count, time range, and last known address
  - Supabase Realtime subscription — map updates instantly on new GPS insert or clock-out
  - Loading, error, and empty states handled gracefully
  - "Updated X ago" timestamp bottom-left of map

### Architecture — Hybrid Model
- **PINs:** localStorage only (unchanged)
- **Sessions + GPS:** Supabase (shared across devices)
- Avoids a full rewrite while enabling true real-time multi-device visibility

### Environment Variables Required
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Integration Notes
```bash
npm install @supabase/supabase-js
```
```jsx
// Router
import LiveMap from './LiveMap';
<Route path="/manager/map" element={<LiveMap />} />

// Replace localStorage clock-in with:
import { clockIn, recordGpsPoint, clockOut } from './lib/supabase';
```

### Files Changed
| File | Change |
|---|---|
| `supabase/schema.sql` | New — run once in Supabase SQL Editor |
| `src/lib/supabase.js` | New — Supabase client + all helper functions |
| `src/LiveMap.jsx` | New — manager live map component |
| `CHANGELOG.md` | Updated |

---

## [1.1] — Help Screen — 2026-03-18

### Added
- **In-app Help Screen** (`src/HelpScreen.jsx`) — tabbed React component covering all 7 features
- Technician Tab: PWA install, PIN setup, clock in/out, GPS tracking, offline mode
- Manager Tab: dashboard, live map, CSV export, PIN management, offline behaviour
- Quick Reference Cards, collapsible accordion sections, tip/info callout boxes
- Dark theme; Syne + DM Sans fonts

---

## [1.0] — Initial Release

### Added
- PWA scaffold (Vite + React 18)
- 4-digit PIN authentication (localStorage)
- Clock in / clock out with session timer
- GPS route tracking via Leaflet
- Manager dashboard
- CSV export
- Offline support via service worker
- GitHub Actions → GitHub Pages deploy pipeline
- `public/manifest.json` + `public/service-worker.js`

---

*Versioning follows feature milestones.*
