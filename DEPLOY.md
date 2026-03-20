# Pool Time Tracker — Deployment Guide

Complete setup from zero to live PWA in ~20 minutes.

---

## What You're Building

```
Techs' phones (PWA — installs like a native app)
        ↓  https://yourname.github.io/pool-time
  GitHub Pages (free hosting, auto-deploys from your repo)
        ↓
  Supabase (real-time database — free tier)
```

---

## Step 1 — Supabase Setup (~5 min)

### 1.1 Create your project
1. Go to **[supabase.com](https://supabase.com)** and sign up / log in
2. Click **New Project**
3. Name it: `pool-time`
4. Set a strong database password (save it somewhere)
5. Pick the region **closest to your location** (reduces latency for GPS)
6. Click **Create new project** — wait ~2 minutes for it to spin up

### 1.2 Run the schema
1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open `schema.sql` from this project
4. Copy the entire contents and paste into the SQL editor
5. Click **Run** (green button)
6. You should see "Success. No rows returned"

### 1.3 Enable Realtime
1. Go to **Database → Replication** in the left sidebar
2. Under **Tables**, find `time_entries`, `week_submissions`, and `day_flags`
3. Toggle each one **ON**
4. `gps_points` does **not** need replication (it uses broadcast channels instead)

### 1.4 Get your credentials
1. Go to **Settings → API** (gear icon in sidebar)
2. Copy and save:
   - **Project URL** — looks like `https://abcdefghijk.supabase.co`
   - **anon public** key — long JWT string starting with `eyJ...`

> ⚠️ Never share your `service_role` key. The `anon` key is safe for client-side use.

---

## Step 2 — GitHub Setup (~5 min)

### 2.1 Create the repository
1. Go to **[github.com](https://github.com)** and log in
2. Click the **+** → **New repository**
3. Name it: `pool-time`
4. Set to **Public** (required for free GitHub Pages)
5. Do **not** check "Add README" — leave it empty
6. Click **Create repository**

### 2.2 Push the code
Open a terminal on your computer and run:

```bash
# Navigate to the project folder
cd path/to/pool-time-tracker

# Install dependencies
npm install

# Initialize git and push
git init
git add .
git commit -m "Initial commit — Pool Time Tracker v1.5"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pool-time.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

---

## Step 3 — Configure the App (~2 min)

### Option A — Environment variables (recommended)
Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Then rebuild and redeploy. The values bake into the build.

### Option B — In-app config screen (easiest)
Leave `.env` empty. On first launch, the app shows a **Connect to Supabase** screen. Enter your URL and anon key there. They're saved to the device's localStorage.

> For techs' phones: use Option B. They'll see the config screen once, you enter the credentials, done.

---

## Step 4 — Deploy to GitHub Pages (~3 min)

### 4.1 Configure the base path
Open `vite.config.js` and confirm the base matches your repo name:

```js
base: "/pool-time/",   // ← must match your GitHub repo name exactly
```

### 4.2 Deploy
```bash
npm run deploy
```

This builds the app and pushes it to the `gh-pages` branch automatically.

### 4.3 Enable GitHub Pages
1. Go to your GitHub repo → **Settings → Pages**
2. Under **Source**, select **Deploy from a branch**
3. Branch: **gh-pages** / folder: **/ (root)**
4. Click **Save**

Your app will be live at:
```
https://YOUR_USERNAME.github.io/pool-time/
```

It takes ~2 minutes to go live the first time.

---

## Step 5 — Install as PWA on Phones (~1 min per phone)

### iPhone (Safari)
1. Open the URL in **Safari** (must be Safari, not Chrome)
2. Tap the **Share** button (box with arrow)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add** — done

### Android (Chrome)
1. Open the URL in **Chrome**
2. Tap the **three-dot menu** → **Add to Home screen**
3. Tap **Add** — done

The app now appears on the home screen like a native app — full screen, no browser bar.

---

## Step 6 — First Launch Checklist

- [ ] Open the app URL
- [ ] Enter your Supabase URL and anon key on the config screen
- [ ] App reloads and shows the tech roster
- [ ] Select a tech → set their PIN
- [ ] Clock in → confirm GPS starts tracking
- [ ] Open manager dashboard (PIN: **1234** — change this first!)
- [ ] Confirm the tech appears as clocked in
- [ ] Open the Live Map tab → confirm tech pin appears

---

## Updating the App

Every future update is two commands:

```bash
git add .
git commit -m "Update description"
git push origin main
npm run deploy
```

All techs get the update instantly — no app store, no installs.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank screen after deploy | Check `base` in `vite.config.js` matches repo name |
| GPS not working | HTTPS is required — GitHub Pages provides this automatically |
| Supabase connection error | Double-check URL has no trailing slash, key is the `anon` key (not `service_role`) |
| Real-time not updating | Confirm tables are toggled ON in Supabase Replication tab |
| App not installing as PWA | Must be HTTPS and opened in Safari (iOS) or Chrome (Android) |
| Manager PIN forgotten | Set a new one via the PINs panel — default is `1234` |

---

## Security Notes

- **PINs** are stored in localStorage on each device only — never sent to Supabase
- **GPS data** is stored in Supabase — visible to anyone with your anon key
- For production hardening, replace the open RLS policies in `schema.sql` with per-user auth
- Rotate your anon key in Supabase Settings if it's ever exposed

---

*Pool Time Tracker v1.5 · GitHub Pages + Supabase + PWA*
