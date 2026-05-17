# UI Redesign & Deployment — Design Spec
**Date:** 2026-05-17  
**Status:** Approved

---

## 1. Problem & Goal

The EU Dress Code Guide app needs a more professional visual identity before being published to **tadpoleindustries.com**. The current UI uses a flat navy/orange palette and plain white cards that feel utilitarian. The goal is to apply a bold, refined dark theme with glassmorphism to lift the visual quality — without changing any functionality — and then deploy it to the custom domain.

---

## 2. Design Direction: Bold & Striking (Style C)

Dark background with glassmorphism cards and a red/amber gradient accent.

**Core palette:**
| Token | Value | Use |
|---|---|---|
| `--bg` | `#0d1117` | App background |
| `--surface` | `rgba(255,255,255,0.05)` | Card backgrounds |
| `--surface-hover` | `rgba(255,255,255,0.08)` | Card hover state |
| `--border` | `rgba(255,255,255,0.09)` | Card borders |
| `--border-hover` | `rgba(255,107,107,0.3)` | Card hover border |
| `--accent` | `#ff6b6b` | Primary accent (red) |
| `--accent-2` | `#ffa500` | Secondary accent (amber) |
| `--accent-gradient` | `linear-gradient(135deg, #ff6b6b, #ffa500)` | Icon backgrounds, accent bar |
| `--text` | `#ffffff` | Primary text |
| `--text-muted` | `rgba(255,255,255,0.4)` | Secondary text |
| `--nav-bg` | `rgba(13,17,23,0.95)` | Bottom nav background |
| `--nav-height` | `64px` | (unchanged) |
| `--radius` | `12px` | Card border radius (increased from 8px) |
| `--shadow` | `0 8px 32px rgba(0,0,0,0.4)` | Card shadow |

---

## 3. Component Changes

### 3.1 `theme.css`
Replace all existing CSS variables with the new dark theme tokens above. The `--navy`, `--navy-light` tokens are removed; all components that used them migrate to `--bg`, `--accent`, or explicit dark values.

### 3.2 `DressCodeCard`

**Visual changes:**
- Card: glassmorphism panel — semi-transparent background, subtle border, no hard drop shadow
- Icon wrapper: colour-coded by formality:
  - `formality 4–5` (Formal): gradient warm glow (`rgba(255,107,107,0.25)` bg + `rgba(255,107,107,0.2)` border)
  - `formality 3` (Semi-Formal): muted glass (`rgba(255,255,255,0.07)` bg)
  - `formality 1–2` (Casual): very subtle (`rgba(255,255,255,0.04)` bg)
- Formality dots: filled dots use `--accent` (#ff6b6b), empty use `rgba(255,255,255,0.12)`
- **New: formality badge pill** (right side of card):
  - `formality 4–5`: red pill — "Formal"
  - `formality 3`: amber pill — "Semi"
  - `formality 1–2`: grey pill — "Casual"
- Card name: `#ffffff`, occupation text: `--text-muted`
- Hover: background lifts to `--surface-hover`, border tints to `--border-hover`

**No changes to:** card data, routing, or accessibility attributes.

### 3.3 `HomePage`

**Header:**
- Background: `linear-gradient(160deg, #161b22 0%, #0d1117 100%)`
- Add a 4px wide red/amber gradient vertical accent bar left of the title (`linear-gradient(180deg, #ff6b6b, #ffa500)`)
- Title: white, 18px, 800 weight
- Subtitle: `--text-muted`, 12px
- Bottom border: `1px solid rgba(255,255,255,0.06)`

**Grid section:**
- Background: `--bg`
- Add a small section label above cards: "All Dress Codes · {count}" in uppercase muted text

### 3.4 `SearchBar`

- Input row background: `rgba(255,255,255,0.06)`, border: `rgba(255,255,255,0.1)`
- Input text: `#ffffff`, placeholder: `--text-muted`
- Search icon: `--text-muted`
- Dropdown: `background: #161b22`, border: `rgba(255,255,255,0.1)`
- Result hover: `background: rgba(255,255,255,0.05)`
- Active result outline: `2px solid #ff6b6b`
- Reason text: `--accent` (already uses `var(--accent)`)
- Error text: `#ff6b6b`
- Spinner: `--text-muted`

### 3.5 `BottomNav`

- Background: `rgba(13,17,23,0.95)` with `backdrop-filter: blur(12px)`
- Top border: `1px solid rgba(255,255,255,0.07)`
- Active tab: icon + label coloured `#ff6b6b` (red); remove the navy `border-top` active indicator
- Inactive tabs: `rgba(255,255,255,0.3)`

### 3.6 `CalendarPage` and `ClosetPage`

Both pages inherit the dark theme through CSS variables — no component-level changes needed. Verify visually after variable update that error and success states still read clearly (use `--accent` for highlights, `--danger: #ff6b6b` replacing `#dc3545`).

---

## 4. Desktop Shell

The app stays mobile-first. On screens wider than 480px, the app is centered in a 420px max-width column on `--bg` background. No grid or layout changes for desktop — it renders like an app on a desktop browser.

```css
/* In App.tsx or index.css */
.app-shell {
  max-width: 420px;
  margin: 0 auto;
  min-height: 100vh;
  position: relative;
}
```

**BottomNav fix:** Because `BottomNav` uses `position: fixed`, it ignores the container width and stretches full-viewport. Change its CSS to:
```css
.nav {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 420px;
  /* rest unchanged */
}
```

---

## 5. Deployment to tadpoleindustries.com

### 5.1 Strategy

The app has two parts that need different hosting:

| Part | Type | Hosting |
|---|---|---|
| React frontend | Static files | tadpoleindustries.com (existing) |
| `api/search.ts` (Gemini) | Node.js serverless | Vercel (free tier) |

Since the hosting type at tadpoleindustries.com is unknown, the safest plan is a **split deployment**:
1. Build the React app as static files (`npm run build` → `build/`)
2. Upload the `build/` folder to tadpoleindustries.com via FTP/cPanel/SFTP
3. Deploy the API to Vercel (separate, free)
4. Set `REACT_APP_API_URL` in `.env.production` to point to the deployed Vercel API URL

### 5.2 API URL Configuration

Currently the frontend calls `/api/search` (relative URL, relies on CRA proxy in dev). For production the call must go to an absolute URL.

**Change needed in `useLLMSearch.ts`:**
```ts
const API_URL = process.env.REACT_APP_API_URL ?? '';
// call: `${API_URL}/api/search`
```

**`.env.production`:**
```
REACT_APP_API_URL=https://<your-vercel-project>.vercel.app
```

### 5.3 Vercel API Deployment Steps (one-time)

1. `npx vercel login` (browser OAuth, one-time)
2. `npx vercel --prod` from the project root — deploys only the `api/` folder
3. Set `GEMINI_API_KEY` in Vercel project environment variables
4. Note the deployed URL (e.g., `eu-dress-code.vercel.app`)

### 5.4 Static File Upload to tadpoleindustries.com

After setting `REACT_APP_API_URL`:
1. `npm run build` — produces `build/`
2. Upload contents of `build/` to the web root of tadpoleindustries.com (or a subdirectory)
3. Configure server to serve `index.html` for all routes (SPA fallback):
   - **Apache**: add `.htaccess` with `FallbackResource /index.html`
   - **Nginx**: `try_files $uri /index.html`
   - **cPanel**: File Manager upload + Redirect rule

An `.htaccess` file will be generated as part of the build artifacts to handle SPA routing.

### 5.5 CORS

The Vercel API needs to allow requests from `tadpoleindustries.com`. Add `Access-Control-Allow-Origin` header in `api/search.ts` for the production origin.

---

## 6. Files Changed

| File | Change |
|---|---|
| `src/styles/theme.css` | Full CSS variable overhaul |
| `src/index.css` | Body background: `#0d1117` |
| `src/App.tsx` | Wrap in `.app-shell` div |
| `src/App.module.css` | Add `.appShell` max-width centering |
| `src/pages/HomePage.module.css` | Dark header, section label |
| `src/pages/HomePage.tsx` | Add section label with count |
| `src/components/DressCodeCard/DressCodeCard.tsx` | Add formality badge |
| `src/components/DressCodeCard/DressCodeCard.module.css` | Glassmorphism card styles |
| `src/components/SearchBar/SearchBar.module.css` | Dark search styles |
| `src/components/BottomNav/BottomNav.module.css` | Frosted glass nav |
| `src/hooks/useLLMSearch.ts` | Support `REACT_APP_API_URL` prefix |
| `.env.production` | `REACT_APP_API_URL=<vercel-url>` |
| `public/.htaccess` | Apache SPA fallback rule |
| `api/search.ts` | Add CORS header for production origin |

---

## 7. Out of Scope

- Font changes (system font stack is sufficient; adding Inter would require a Google Fonts CDN dependency)
- Dark/light mode toggle
- Changes to CalendarPage or ClosetPage component structure
- DNS configuration (user manages their own domain)
- CI/CD pipeline setup
