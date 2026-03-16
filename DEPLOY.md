# Pool Time Tracker — Deployment Guide

## Overview

Pool Time Tracker is a React PWA built with Vite. It runs entirely in the browser using localStorage — no backend, no database, no accounts. Deploy once to GitHub Pages and your team accesses it via URL or installs it as a home screen app.

---

## Prerequisites

- Node.js 18+ installed
- A GitHub account and a repository created (e.g. `pool-time-tracker`)
- Git installed and configured

---

## 1. First-Time Setup

```bash
# Clone or initialize your repo
git clone https://github.com/YOUR_USERNAME/pool-time-tracker.git
cd pool-time-tracker

# Install dependencies
npm install
```

---

## 2. Local Development

```bash
npm run dev
```

Opens at `http://localhost:5173`. Hot reload is enabled — changes reflect instantly.

---

## 3. Deploy to GitHub Pages

### 3a. Set your repo name in the deploy script

Open `package.json`. In the `deploy` script, replace `/pool-time-tracker/` with your actual GitHub repo name:

```json
"deploy": "VITE_BASE=/your-repo-name/ vite build && gh-pages -d dist"
```

### 3b. Enable GitHub Pages in your repo settings

1. Go to your repo on GitHub
2. Settings → Pages
3. Source: **Deploy from a branch**
4. Branch: `gh-pages` / `/(root)`
5. Save

### 3c. Run the deploy command

```bash
npm run deploy
```

This builds the app and pushes the `dist/` folder to the `gh-pages` branch automatically.

Your app will be live at:
```
https://YOUR_USERNAME.github.io/your-repo-name/
```

Subsequent deploys: just run `npm run deploy` again.

---

## 4. Custom Domain (Optional)

If you have a custom domain (e.g. `time.yourcompany.com`):

1. Add a `CNAME` file to the `public/` folder containing your domain:
   ```
   time.yourcompany.com
   ```
2. Use the custom deploy script instead:
   ```bash
   npm run deploy:custom
   ```
3. Point your DNS to GitHub Pages per [GitHub's documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

---

## 5. PWA Installation

### iOS (Safari)
1. Open the app URL in Safari
2. Tap the **Share** button (box with arrow)
3. Scroll down → **Add to Home Screen**
4. Tap **Add**

### Android (Chrome)
1. Open the app URL in Chrome
2. Tap the **three-dot menu**
3. Tap **Add to Home Screen** or **Install App**
4. Confirm

> Techs should install the app to their home screen for the best experience — full screen, offline support, fast launch.

---

## 6. App Icons

The manifest references `icon-192.png` and `icon-512.png` in the `public/` folder. These files are **not included** — you'll need to add them before deploying.

Quick options:
- Use any image editor to export a square PNG at 192×192 and 512×512
- Use [realfavicongenerator.net](https://realfavicongenerator.net) to generate a full icon set
- A simple blue droplet or your company logo works well

---

## 7. Data & Privacy

- All time tracking data is stored in **localStorage** on each device
- No data is transmitted to any server
- Data persists until the browser cache is cleared or the app is uninstalled
- Manager PIN is stored locally — default is `1234`, change it on first use

### Backing Up Data (Manual)

From the browser console on a device with data:
```javascript
// Export
copy(localStorage.getItem("pool_tt_v2"));

// Import (paste into console on new device)
localStorage.setItem("pool_tt_v2", `PASTE_DATA_HERE`);
```

---

## 8. Updating the App

```bash
# Make your changes, then:
npm run deploy
```

Users will get the update the next time they load the app with a network connection. The service worker handles cache invalidation automatically.

---

## 9. Troubleshooting

| Problem | Fix |
|---|---|
| Blank page after deploy | Check `VITE_BASE` in `package.json` matches your repo name exactly, including slashes |
| App not updating after deploy | Hard reload: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows). Or clear site data in browser settings |
| GPS not working | GPS requires HTTPS. GitHub Pages serves HTTPS by default — local dev (`localhost`) also works |
| Map not loading | Leaflet loads from CDN — requires internet connection. Cached tiles work offline after first load |
| PIN forgotten | Manager can reset any tech PIN from Manager Dashboard → 🔐 PINs panel |
| Manager PIN forgotten | Open browser console and run: `localStorage.removeItem("pool_pins_v2")` — resets all PINs |

---

## 10. Tech Stack Reference

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Build tool | Vite 5 |
| Styling | Inline styles + CSS variables |
| Fonts | Barlow Condensed, Barlow (Google Fonts) |
| Maps | Leaflet 1.9 (loaded from CDN) |
| Storage | localStorage |
| Offline | Service Worker (Cache API) |
| Deployment | GitHub Pages via `gh-pages` |
