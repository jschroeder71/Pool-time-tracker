# Changelog — Pool Time Tracker

All notable changes to this project are documented here.

---

## [2.0.0] — Current Release

### Summary
Full rewrite as a clean, single-file React PWA. Consolidated all screens, state, and logic into one optimized component. Improved animation system, GPS reliability, and manager tooling.

### Added
- Complete PWA setup: manifest, service worker, offline caching
- GitHub Pages deployment via `npm run deploy`
- Route playback by tech and day in manager map view
- "All Live" mode on map — shows all clocked-in techs simultaneously
- Animated PIN dot entry with shake-on-failure feedback
- SetPinFlow component — confirm step prevents typo lockouts
- GPS interval control from manager dashboard (30s / 1m / 5m / 10m)
- GPS timers automatically restart when interval setting changes
- Overtime warning badge when weekly hours approach 40
- Week selector in manager view — browse any historical week
- Summary cards: Submitted / Pending / No Data counts
- CSV export includes all days, total hours, and submission status
- Manager can unlock submitted weeks per technician
- Manager PIN change flow with confirmation step
- Tech PIN reset from manager dashboard
- Live position indicator (pulsing green dot) on home screen roster

### Changed
- Fonts updated from Syne/DM Sans to Barlow Condensed / Barlow
- GPS capture refactored into `startGPS` / `stopGPS` with ref-based timer management
- Clock-in immediately returns to home screen after action — reduces accidental double-taps
- Map default center set to Orlando area (28.5, -81.3)
- localStorage keys versioned to `v2` — fresh start, no migration from v1

### Fixed
- GPS timer leak on component unmount
- Week total including live time for today's still-open entry
- Map tile layer not re-rendering after route data update
- Leaflet loaded once globally via `useLeaflet` hook — prevents duplicate script injection

---

## [1.8.0]

### Added
- Leaflet map integration in tech view — shows today's GPS trail
- Live position broadcasting to manager map

### Changed
- GPS stored per-day within week data structure
- Map renders only after Leaflet script confirmed loaded

---

## [1.7.0]

### Added
- Manager dashboard — full week view for all 12 technicians
- CSV export from manager view
- Week submission unlock from manager

### Changed
- Manager access gated behind PIN (default: 1234)

---

## [1.6.0]

### Added
- GPS tracking on clock-in, stops on clock-out
- GPS points stored per entry with lat/lng/accuracy/timestamp

### Changed
- GPS uses `getCurrentPosition` polling rather than `watchPosition` for battery efficiency

---

## [1.5.0]

### Added
- Week submission flow with confirmation step
- Submitted state persisted — prevents further edits without manager unlock
- Overtime warning at 40+ hours

---

## [1.4.0]

### Added
- Day flag system — techs or manager can flag a day for review
- Flag indicator (🚩) visible on home screen roster and manager list
- Multiple clock-in/out entries per day supported

### Changed
- Daily total recalculates from all entries on each update

---

## [1.3.0]

### Added
- PIN system for all 12 technicians
- First-time PIN setup flow on first tech login
- PIN verification on subsequent logins
- Manager PIN separate from tech PINs

---

## [1.2.0]

### Added
- Week view in tech screen — hours per day for current week
- Week total displayed with hours and H:M format
- Week key based on Sunday start date

### Changed
- Data keyed by week start date — supports historical data retention

---

## [1.1.0]

### Added
- Initial build — home screen roster for 12 technicians
- Clock in / clock out with timestamp
- Live elapsed time counter (updates every second)
- Daily total accumulation across multiple sessions
- Data persisted to localStorage
- Dark industrial UI with CSS custom properties
