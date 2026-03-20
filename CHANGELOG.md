# Pool Time Tracker — Changelog

---

## [1.8] — 2026-03-14 — Deployment Guide

**Output:** `DEPLOY.md`

### ✅ Added
- Step-by-step guide: Supabase → GitHub → GitHub Pages → PWA install
- Schema run instructions with Supabase SQL Editor walkthrough
- Realtime table toggle instructions (Supabase Replication tab)
- Credential setup: env vars (Option A) vs in-app config screen (Option B)
- GitHub repo creation and `git push` commands
- `vite.config.js` base path configuration notes
- `npm run deploy` single-command deployment
- GitHub Pages activation steps
- PWA install instructions for iPhone (Safari) and Android (Chrome)
- First-launch checklist (6 items)
- Troubleshooting table covering 7 common issues
- Security notes on PINs, GPS data, and RLS hardening

---

## [1.7] — 2026-03-14 — PWA

**Outputs:** `public/manifest.json`, `public/service-worker.js`, `index.html`

### ✅ Added
- `manifest.json` — app name, short name, theme color `#38bdf8`, display `standalone`, portrait lock, icon references
- `service-worker.js` — full offline strategy:
  - Install: caches core shell assets
  - Activate: clears stale caches, claims all clients
  - Fetch: network-first for Supabase API, cache-first for CDN and app shell
  - SPA fallback: unmatched routes return `/index.html`
- Background sync via `sync` event — posts `SYNC_REQUEST` to all open clients
- Push notification handler scaffolded for future use
- `index.html` registers SW on `load`, re-dispatches SW messages as `pool_sync_request` window events
- iOS meta tags: `apple-mobile-web-app-capable` and `apple-mobile-web-app-status-bar-style`
- Supabase JS loaded via CDN `<script>` tag before app bundle

---

## [1.6] — 2026-03-14 — SQL Schema

**Output:** `schema.sql`

### ✅ Added
- `time_entries` — one row per clock-in/out pair, `UNIQUE (tech, week_key, day_index, entry_in)` prevents dupes from retry logic
- `gps_points` — every GPS sample: lat, lng, accuracy, timestamp
- `week_submissions` — one row per tech per week, includes `unlocked_at`
- `day_flags` — flagged days per tech per week
- Performance indexes on `(tech, week_key)` across all tables
- `set_updated_at()` trigger on `time_entries` and `day_flags`
- Row Level Security enabled on all tables with open anon policies (ready to harden)
- `ALTER PUBLICATION supabase_realtime` for three tables
- GPS note: broadcast only, no table replication, avoids DB load from high-frequency writes

---

## [1.5] — 2026-03-14 — Full Clean Rewrite + Supabase Backend

**Output:** Complete `src/` project (13 files)

### ✅ Architecture
```
src/
  App.jsx                    # Root — routing, state, all actions
  supabase.js                # Lazy client, config helpers, isConfigured()
  utils.js                   # Constants, date/format helpers, hexAlpha()
  main.jsx                   # React entry point
  hooks/
    useRealtimeSync.js       # Supabase reads, writes, real-time subscriptions
    useGPS.js                # GPS timers, adjustable rate, per-tech tracking
    useOfflineQueue.js       # Queue, flush on reconnect
  components/
    ui.jsx                   # GlobalStyle + all shared primitives
    MapView.jsx              # Leaflet map — routes and live pins
  screens/
    ConfigScreen.jsx         # First-time Supabase setup
    PinScreen.jsx            # Verify / Set PIN pad
    HomeScreen.jsx           # Tech roster
    TechScreen.jsx           # Clock in/out, map, week grid, submit
    ManagerScreen.jsx        # Dashboard, live map, PIN mgmt, CSV
```

### ✅ Supabase
- Loads last 4 weeks on mount
- Real-time `postgres_changes` subscriptions on 3 tables
- Broadcast channel for live GPS (ephemeral — no DB write overhead)
- GPS history persisted to `gps_points` on every sample
- `upsert` with conflict keys for idempotent offline retries
- PINs intentionally local-only, never synced to Supabase

### ✅ Offline
- `useOfflineQueue` serializes actions to localStorage on failure
- Flush triggered by `navigator.onLine` change and SW `sync` event
- Offline banner with queued action count shown on all screens

### ✅ GPS
- `useGPS` hook — per-tech interval timers, immediate capture on clock-in
- `updateRate()` restarts all active timers instantly
- Rate persisted to localStorage across reloads
- `window` custom event `pool_gps_rate` bridges manager rate picker to hook

### ✅ PIN security
- Tap keypad — no keyboard
- Set mode: two-step confirm, re-entry required
- Shake + clear animation on wrong PIN
- Auto-lock 300ms after every clock in/out and submit
- Manager PIN defaults to `1234`
- Pins stored in `pool_pins` localStorage key only

### ✅ Design
- Font pairing: **Syne 800** (headers) + **DM Sans** (body)
- Ink dark palette: `#0d1117 / #161b22 / #21262d`
- Per-tech accent colors applied to: roster avatar, week grid bars, clock button border, map pin, top bar accent
- `100svh` prevents iOS browser chrome overlap
- Composable primitives: `Screen`, `TopBar`, `Card`, `Avatar`, `Badge`, `LiveDot`, `PrimaryBtn`

### ✅ Build
- Vite 5 + `@vitejs/plugin-react`
- `base: "/pool-time/"` pre-set for GitHub Pages
- `npm run deploy` via `gh-pages` package
- React vendor chunk split for better cache performance

---

## [1.4] — 2026-03-14 — PIN Security *(superseded by 1.5)*
## [1.3] — 2026-03-14 — GPS Tracking *(superseded by 1.5)*
## [1.1] — 2026-03-14 — Initial Release *(superseded by 1.5)*

---

## [1.15] — 2026-03-20 — Overtime Report

**Output:** `src/screens/OvertimeScreen.jsx`

### ✅ Added
- Full overtime report screen accessible from Manager dashboard (⏱ OT button)
- Summary bar: total hours, total OT hours, number of techs in OT
- Per-tech rows with weekly total and OT badge (amber = over, green = on track)
- Daily OT breakdown per tech — flags any day over 8h with exact overage
- Week selector dropdown — view any historical week in `appData`
- Threshold constants at top of file: 40h/week, 8h/day (easy to adjust)
- Sorted by OT hours descending so worst offenders appear first

---

## [1.14] — 2026-03-20 — Admin Screen (Dynamic Techs)

**Outputs:** `src/screens/AdminScreen.jsx`, `schema.sql` (techs table), `App.jsx` (dynamic load)

### ✅ Added
- `techs` Supabase table: `id, name, email, active, created_at`
- Default 12 techs seeded via `INSERT … ON CONFLICT DO NOTHING` (safe to re-run)
- `AdminScreen` — add tech (name + optional email), toggle active/inactive, delete with confirmation
- Active/inactive toggle: inactive techs greyed out, excluded from roster
- Delete guard: confirms before delete, preserves historical time entries
- `App.jsx` now loads techs dynamically from Supabase on boot; falls back to hardcoded list if table doesn't exist yet
- `HomeScreen.jsx` accepts `techs` as prop instead of importing hardcoded constant
- ⚙ Techs button added to Manager settings bar (purple)

---

## [1.13] — 2026-03-20 — Per-Tech Weekly Email Summary

**Output:** `supabase/functions/weekly-summary/index.ts`

### ✅ Added
- Supabase Edge Function using Deno + Resend API (free tier: 3,000 emails/month)
- Each active tech receives a formatted HTML email with their weekly time table and total hours
- Manager receives a team summary: all techs ranked by hours, submitted status, grand total
- Scheduled via Supabase Cron: every Monday at 8am UTC
- Covers the previous week automatically using ISO week key calculation
- Branded HTML emails matching app dark theme (Glistening Water header, copyright footer)
- Required env vars: `RESEND_API_KEY`, `MANAGER_EMAIL`, `FROM_EMAIL`
- Gracefully skips techs with no email or no entries that week

---

## [1.12] — 2026-03-20 — Copyright Footer

**Output:** `src/components/ui.jsx`

### ✅ Added
- `Footer` component rendered inside `Screen` — appears automatically on every screen
- Text: © 2026 Glistening Water Pool Services. Created by John Schroeder. All rights reserved.
- Styled: 10px, muted color, 60% opacity, top border separator, `marginTop: auto` pins it to bottom
- Zero changes needed to individual screens — single source of truth in `ui.jsx`

---

## [1.11] — 2026-03-20 — Logo + Full Release Package

**Output:** `pool-time-tracker-v1.11.zip` (64 KB)

### ✅ Added
- `public/logo.jpg` — Glistening Water Pool Services logo bundled into app
- `HomeScreen.jsx` — top bar replaced 💧 text with logo image (height: 36px)
- `index.html` — browser tab favicon + iOS home screen icon point to logo; title updated
- `manifest.json` — app name → "Glistening Water Pool Services", short name → "GW Pool", logo added as PWA icon
- `service-worker.js` — logo added to offline cache

### 📦 Full package contents
```
pool-time-tracker-v1.11.zip
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── supabase.js
│   ├── utils.js
│   ├── hooks/  (useRealtimeSync, useGPS, useOfflineQueue)
│   ├── components/  (ui.jsx, MapView.jsx)
│   └── screens/
│       ├── ConfigScreen.jsx
│       ├── PinScreen.jsx
│       ├── HomeScreen.jsx
│       ├── TechScreen.jsx
│       ├── ManagerScreen.jsx
│       ├── AdminScreen.jsx
│       └── OvertimeScreen.jsx
├── supabase/functions/weekly-summary/index.ts
├── public/  (manifest.json, service-worker.js, logo.jpg)
├── schema.sql
├── index.html
├── vite.config.js
├── package.json
├── DEPLOY.md
└── CHANGELOG.md
```

---

*Glistening Water Pool Services · Vite + React + Supabase + GitHub Pages PWA · v1.11*
