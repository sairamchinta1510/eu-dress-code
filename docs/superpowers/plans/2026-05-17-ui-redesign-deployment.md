# UI Redesign & Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Bold & Striking dark theme (glassmorphism cards, red/amber gradient accent) to the EU Dress Code Guide and prepare deployment artifacts for tadpoleindustries.com.

**Architecture:** CSS variables drive the entire theme — updating `theme.css` cascades to all components. Each component then adds glassmorphism-specific styles. Deployment splits the app: static `build/` to existing hosting via FTP, Gemini API to Vercel (free). An `REACT_APP_API_URL` env var bridges them.

**Tech Stack:** React 19, TypeScript, CSS Modules, CRA (react-scripts 5), Vercel serverless (api/), `@google/generative-ai`

---

## File Map

| File | Change |
|---|---|
| `src/styles/theme.css` | Replace all vars with dark theme tokens |
| `src/index.css` | Set `body { background: #0d1117 }` |
| `src/App.module.css` | Adjust max-width to 420px, dark bg |
| `src/components/DressCodeCard/DressCodeCard.tsx` | Add formality badge |
| `src/components/DressCodeCard/DressCodeCard.module.css` | Glassmorphism card |
| `src/components/DressCodeCard/DressCodeCard.test.tsx` | Test badge rendering |
| `src/pages/HomePage.tsx` | Add section label |
| `src/pages/HomePage.module.css` | Dark header + accent bar |
| `src/components/SearchBar/SearchBar.module.css` | Dark search styles |
| `src/components/BottomNav/BottomNav.module.css` | Frosted glass + max-width fix |
| `src/hooks/useLLMSearch.ts` | Support `REACT_APP_API_URL` |
| `src/hooks/useLLMSearch.test.ts` | Test absolute URL construction |
| `api/search.ts` | Add CORS headers + OPTIONS handler |
| `public/.htaccess` | Apache SPA fallback rule |
| `.env.production` | `REACT_APP_API_URL=<vercel-url>` |
| `.env.example` | Document new env var |

---

### Task 1: Dark Theme Foundation

**Files:**
- Modify: `src/styles/theme.css`
- Modify: `src/index.css`
- Modify: `src/App.module.css`

- [ ] **Step 1: Replace `theme.css` with dark theme variables**

Replace the entire contents of `src/styles/theme.css` with:

```css
:root {
  --bg: #0d1117;
  --surface: rgba(255, 255, 255, 0.05);
  --surface-hover: rgba(255, 255, 255, 0.08);
  --border: rgba(255, 255, 255, 0.09);
  --border-hover: rgba(255, 107, 107, 0.3);
  --accent: #ff6b6b;
  --accent-2: #ffa500;
  --accent-gradient: linear-gradient(135deg, #ff6b6b, #ffa500);
  --text: #ffffff;
  --text-muted: rgba(255, 255, 255, 0.4);
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.4);
  --success: #34c759;
  --danger: #ff6b6b;
  --nav-bg: rgba(13, 17, 23, 0.95);
  --nav-height: 64px;
  --header-height: 56px;
  --radius: 12px;
  --shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
}

a {
  color: inherit;
  text-decoration: none;
}

img {
  max-width: 100%;
}
```

- [ ] **Step 2: Update `index.css` body background**

Replace the entire contents of `src/index.css` with:

```css
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #0d1117;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
```

- [ ] **Step 3: Update `App.module.css` for dark bg and 420px shell**

Replace the entire contents of `src/App.module.css` with:

```css
.app {
  max-width: 420px;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--bg);
  position: relative;
}

.main {
  padding-bottom: var(--nav-height);
  min-height: 100vh;
}
```

- [ ] **Step 4: Verify the build compiles**

```bash
cd C:\Users\schinta\eu-dress-code
npm run build 2>&1 | tail -5
```

Expected: `Successfully compiled.` (or similar — no errors).

- [ ] **Step 5: Run existing tests to confirm nothing is broken**

```bash
npm test -- --watchAll=false --ci 2>&1 | tail -15
```

Expected: same pass count as before (41 passing, 1 skip).

- [ ] **Step 6: Commit**

```bash
git add src/styles/theme.css src/index.css src/App.module.css
git commit -m "feat: apply dark theme CSS variables and app shell"
```

---

### Task 2: DressCodeCard — Glassmorphism + Formality Badge

**Files:**
- Modify: `src/components/DressCodeCard/DressCodeCard.tsx`
- Modify: `src/components/DressCodeCard/DressCodeCard.module.css`
- Modify: `src/components/DressCodeCard/DressCodeCard.test.tsx`

- [ ] **Step 1: Add failing tests for the badge**

Add to the bottom of `src/components/DressCodeCard/DressCodeCard.test.tsx`:

```tsx
test('shows "Formal" badge for formality 5', () => {
  const whiteTie = dressCodes.find((d) => d.id === 'white-tie')!;
  render(
    <MemoryRouter>
      <DressCodeCard dressCode={whiteTie} />
    </MemoryRouter>
  );
  expect(screen.getByText('Formal')).toBeInTheDocument();
});

test('shows "Semi" badge for formality 3', () => {
  render(
    <MemoryRouter>
      <DressCodeCard dressCode={loungeSuit} />
    </MemoryRouter>
  );
  expect(screen.getByText('Semi')).toBeInTheDocument();
});

test('shows "Casual" badge for formality ≤ 2', () => {
  const casual = dressCodes.find((d) => d.formality <= 2)!;
  render(
    <MemoryRouter>
      <DressCodeCard dressCode={casual} />
    </MemoryRouter>
  );
  expect(screen.getByText('Casual')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run new tests to confirm they fail**

```bash
npm test -- --watchAll=false --ci --testPathPattern="DressCodeCard" 2>&1 | tail -20
```

Expected: 3 failures — `Unable to find an element with the text: Formal` etc.

- [ ] **Step 3: Update `DressCodeCard.tsx` with badge logic**

Replace the entire contents of `src/components/DressCodeCard/DressCodeCard.tsx` with:

```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { DressCode } from '../../types';
import styles from './DressCodeCard.module.css';

interface Props {
  dressCode: DressCode;
}

function formalityBadge(level: number): { label: string; cls: string } {
  if (level >= 4) return { label: 'Formal', cls: styles.badgeFormal };
  if (level === 3) return { label: 'Semi', cls: styles.badgeSemi };
  return { label: 'Casual', cls: styles.badgeCasual };
}

function iconWrapClass(level: number): string {
  if (level >= 4) return `${styles.iconWrapper} ${styles.iconFormal}`;
  if (level === 3) return `${styles.iconWrapper} ${styles.iconSemi}`;
  return `${styles.iconWrapper} ${styles.iconCasual}`;
}

const formalityDots = (level: number) =>
  Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < level ? styles.dotFilled : styles.dotEmpty} aria-hidden="true" />
  ));

const DressCodeCard: React.FC<Props> = ({ dressCode }) => {
  const badge = formalityBadge(dressCode.formality);
  return (
    <Link to={`/dress-codes/${dressCode.id}`} className={styles.card}>
      <div className={iconWrapClass(dressCode.formality)}>
        <span className={styles.icon} aria-hidden="true">{dressCode.icon}</span>
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{dressCode.name}</h3>
        <p className={styles.label}>{dressCode.formalityLabel}</p>
        <div className={styles.dots} aria-label={`Formality: ${dressCode.formality} out of 5`}>
          {formalityDots(dressCode.formality)}
        </div>
        <p className={styles.occasion}>{dressCode.occasions[0]}</p>
      </div>
      <span className={`${styles.badge} ${badge.cls}`}>{badge.label}</span>
    </Link>
  );
};

export default DressCodeCard;
```

- [ ] **Step 4: Replace `DressCodeCard.module.css` with glassmorphism styles**

Replace the entire contents of `src/components/DressCodeCard/DressCodeCard.module.css` with:

```css
.card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  text-decoration: none;
  transition: background 0.2s, border-color 0.2s;
  cursor: pointer;
}

.card:hover {
  background: var(--surface-hover);
  border-color: var(--border-hover);
}

/* Icon wrapper base */
.iconWrapper {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Icon wrapper variants by formality */
.iconFormal {
  background: rgba(255, 107, 107, 0.2);
  border: 1px solid rgba(255, 107, 107, 0.2);
}

.iconSemi {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.iconCasual {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.icon {
  font-size: 22px;
}

.body {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 2px;
}

.label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 5px;
}

.dots {
  display: flex;
  gap: 3px;
  margin-bottom: 5px;
}

.dotFilled {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  display: inline-block;
}

.dotEmpty {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  display: inline-block;
}

.occasion {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

/* Formality badge pill */
.badge {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 20px;
  white-space: nowrap;
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 2px;
}

.badgeFormal {
  background: rgba(255, 107, 107, 0.18);
  color: #ff6b6b;
  border: 1px solid rgba(255, 107, 107, 0.3);
}

.badgeSemi {
  background: rgba(255, 165, 0, 0.15);
  color: #ffa500;
  border: 1px solid rgba(255, 165, 0, 0.25);
}

.badgeCasual {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

- [ ] **Step 5: Run all DressCodeCard tests**

```bash
npm test -- --watchAll=false --ci --testPathPattern="DressCodeCard" 2>&1 | tail -15
```

Expected: 6 tests pass (3 original + 3 new badge tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/DressCodeCard/
git commit -m "feat: glassmorphism card design with formality badges"
```

---

### Task 3: HomePage — Dark Header + Section Label

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/HomePage.module.css`

- [ ] **Step 1: Update `HomePage.tsx` to add section label**

Replace the entire contents of `src/pages/HomePage.tsx` with:

```tsx
import React from 'react';
import SearchBar from '../components/SearchBar/SearchBar';
import DressCodeCard from '../components/DressCodeCard/DressCodeCard';
import { dressCodes } from '../data/dressCodes';
import styles from './HomePage.module.css';

const HomePage: React.FC = () => (
  <div className={styles.page}>
    <header className={styles.header}>
      <div className={styles.headerTop}>
        <div className={styles.accentBar} aria-hidden="true" />
        <div>
          <h1 className={styles.title}>EU Dress Code Guide</h1>
          <p className={styles.subtitle}>Know exactly what to wear, every time</p>
        </div>
      </div>
      <div className={styles.searchWrapper}>
        <SearchBar />
      </div>
    </header>
    <section className={styles.grid} aria-label="Dress codes">
      <p className={styles.sectionLabel}>All Dress Codes · {dressCodes.length}</p>
      {dressCodes.map((dc) => (
        <DressCodeCard key={dc.id} dressCode={dc} />
      ))}
    </section>
  </div>
);

export default HomePage;
```

- [ ] **Step 2: Replace `HomePage.module.css` with dark header styles**

Replace the entire contents of `src/pages/HomePage.module.css` with:

```css
.page {
  min-height: 100vh;
  padding-bottom: var(--nav-height);
  background: var(--bg);
}

.header {
  background: linear-gradient(160deg, #161b22 0%, #0d1117 100%);
  padding: 20px 16px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.headerTop {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
}

/* 4px red→amber vertical accent bar */
.accentBar {
  width: 4px;
  min-height: 36px;
  background: linear-gradient(180deg, #ff6b6b, #ffa500);
  border-radius: 2px;
  flex-shrink: 0;
  margin-top: 2px;
}

.title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.3px;
  margin: 0 0 3px;
  color: #fff;
}

.subtitle {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}

.searchWrapper {
  position: relative;
}

.grid {
  padding: 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sectionLabel {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 2px;
}
```

- [ ] **Step 3: Run existing HomePage tests**

```bash
npm test -- --watchAll=false --ci --testPathPattern="HomePage" 2>&1 | tail -15
```

Expected: all pass (the test uses `getByRole('combobox')` for the search bar — nothing changed there).

- [ ] **Step 4: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.module.css
git commit -m "feat: dark header with accent bar and section label on home page"
```

---

### Task 4: SearchBar — Dark Theme

**Files:**
- Modify: `src/components/SearchBar/SearchBar.module.css`

No logic changes — CSS only. Existing tests continue to pass unchanged.

- [ ] **Step 1: Replace `SearchBar.module.css` with dark styles**

Replace the entire contents of `src/components/SearchBar/SearchBar.module.css` with:

```css
.wrapper {
  position: relative;
  z-index: 200;
}

.inputRow {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius);
  padding: 0 12px;
  gap: 8px;
  transition: border-color 0.2s;
}

.inputRow:focus-within {
  border-color: rgba(255, 107, 107, 0.4);
}

.searchIcon {
  font-size: 15px;
  color: var(--text-muted);
  flex-shrink: 0;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
}

.input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  padding: 12px 0;
  background: transparent;
  color: #fff;
}

.input::placeholder {
  color: var(--text-muted);
  font-size: 13px;
}

.clear {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-muted);
  padding: 4px;
}

.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #161b22;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 320px;
  overflow-y: auto;
}

.result {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.result:hover {
  background: rgba(255, 255, 255, 0.05);
}

.resultActive {
  background: rgba(255, 255, 255, 0.05);
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.resultIcon {
  font-size: 22px;
  flex-shrink: 0;
}

.resultName {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.resultSub {
  font-size: 12px;
  color: var(--text-muted);
}

.noResults {
  padding: 16px;
  color: var(--text-muted);
  font-size: 14px;
  text-align: center;
}

.spinner {
  font-size: 16px;
  flex-shrink: 0;
  animation: spin 1s linear infinite;
  display: inline-block;
  color: var(--text-muted);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.reason {
  font-size: 12px;
  color: var(--accent);
  font-style: italic;
  margin-top: 2px;
}

.errorMsg {
  padding: 12px 16px;
  color: var(--danger);
  font-size: 14px;
}
```

- [ ] **Step 2: Run SearchBar tests**

```bash
npm test -- --watchAll=false --ci --testPathPattern="SearchBar" 2>&1 | tail -15
```

Expected: all pass (tests check behaviour, not CSS class names).

- [ ] **Step 3: Commit**

```bash
git add src/components/SearchBar/SearchBar.module.css
git commit -m "feat: dark theme for search bar"
```

---

### Task 5: BottomNav — Frosted Glass + Max-Width Fix

**Files:**
- Modify: `src/components/BottomNav/BottomNav.module.css`

- [ ] **Step 1: Replace `BottomNav.module.css` with frosted glass styles**

Replace the entire contents of `src/components/BottomNav/BottomNav.module.css` with:

```css
.nav {
  position: fixed;
  bottom: 0;
  /* Centre within 420px app shell */
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 420px;
  height: var(--nav-height);
  background: var(--nav-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 100;
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 16px;
  color: rgba(255, 255, 255, 0.3);
  transition: color 0.2s;
  flex: 1;
  text-decoration: none;
}

.tab:global(.active) {
  color: var(--accent);
  font-weight: 600;
}

.icon {
  font-size: 22px;
}

.label {
  font-size: 11px;
  letter-spacing: 0.3px;
}
```

- [ ] **Step 2: Run BottomNav tests**

```bash
npm test -- --watchAll=false --ci --testPathPattern="BottomNav" 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 3: Run full test suite**

```bash
npm test -- --watchAll=false --ci 2>&1 | tail -10
```

Expected: 41 pass, 1 skip. No regressions.

- [ ] **Step 4: Commit**

```bash
git add src/components/BottomNav/BottomNav.module.css
git commit -m "feat: frosted glass bottom nav with red active state"
```

---

### Task 6: API URL Env Var + CORS Headers

**Files:**
- Modify: `src/hooks/useLLMSearch.ts`
- Modify: `src/hooks/useLLMSearch.test.ts`
- Modify: `api/search.ts`

This makes the frontend work with a separately-deployed API (tadpoleindustries.com frontend + Vercel API).

- [ ] **Step 1: Add a failing test for the absolute URL construction**

Open `src/hooks/useLLMSearch.test.ts`. Add this test inside the existing `describe('useLLMSearch', ...)` block, after the last `it(...)`:

```ts
  it('uses REACT_APP_API_URL as base URL when set', async () => {
    const originalEnv = process.env.REACT_APP_API_URL;
    process.env.REACT_APP_API_URL = 'https://my-api.vercel.app';

    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ id: 'black-tie', relevance: 5, reason: 'Exact match' }] }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const { result } = renderHook(() => useLLMSearch(dressCodes));
    await act(async () => { result.current.search('black tie'); });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith(
      'https://my-api.vercel.app/api/search',
      expect.any(Object)
    );

    process.env.REACT_APP_API_URL = originalEnv;
  });
```

- [ ] **Step 2: Run the new test to confirm it fails**

```bash
npm test -- --watchAll=false --ci --testPathPattern="useLLMSearch" 2>&1 | tail -15
```

Expected: 1 failure — fetch called with `/api/search` not the absolute URL.

- [ ] **Step 3: Update `useLLMSearch.ts` to support `REACT_APP_API_URL`**

Find line 41 in `src/hooks/useLLMSearch.ts`:
```ts
      const res = await fetch('/api/search', {
```
Replace it with:
```ts
      const baseUrl = process.env.REACT_APP_API_URL ?? '';
      const res = await fetch(`${baseUrl}/api/search`, {
```

- [ ] **Step 4: Run all useLLMSearch tests**

```bash
npm test -- --watchAll=false --ci --testPathPattern="useLLMSearch" 2>&1 | tail -15
```

Expected: all pass (including the new absolute URL test).

- [ ] **Step 5: Add CORS headers to `api/search.ts`**

Add the following block at the very top of the `handler` function body in `api/search.ts`, before the method check:

```ts
  // CORS — allow the production frontend origin and localhost for dev
  const origin = req.headers.origin as string | undefined;
  const allowed = [
    process.env.ALLOWED_ORIGIN ?? '',
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean);
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
```

The handler now looks like:
```ts
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — allow the production frontend origin and localhost for dev
  const origin = req.headers.origin as string | undefined;
  const allowed = [
    process.env.ALLOWED_ORIGIN ?? '',
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean);
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // ... rest of handler unchanged
```

- [ ] **Step 6: Run full test suite**

```bash
npm test -- --watchAll=false --ci 2>&1 | tail -10
```

Expected: 42 pass, 1 skip (new test added).

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useLLMSearch.ts src/hooks/useLLMSearch.test.ts api/search.ts
git commit -m "feat: support REACT_APP_API_URL for split deployment; add CORS to API"
```

---

### Task 7: Deployment Files

**Files:**
- Create: `public/.htaccess`
- Create: `.env.production`
- Modify: `.env.example`

These files prepare the app for deployment to tadpoleindustries.com (static) + Vercel (API).

- [ ] **Step 1: Create `public/.htaccess` for Apache SPA routing**

Create `public/.htaccess` with:

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

CRA copies everything in `public/` into `build/` automatically — this file will be at the root of the built site.

- [ ] **Step 2: Create `.env.production`**

Create `.env.production` with:

```
# Production API URL — set to your Vercel deployment URL after running `npx vercel --prod`
REACT_APP_API_URL=https://eu-dress-code.vercel.app
```

> **Note:** After running `npx vercel --prod`, update this URL to the actual Vercel URL shown in the output, then re-run `npm run build` before uploading.

- [ ] **Step 3: Update `.env.example`**

Open `.env.example` and add at the bottom:

```
# Production API URL (for split deployment — static frontend + Vercel API)
REACT_APP_API_URL=https://your-project.vercel.app

# CORS allowed origin in Vercel API (set to https://tadpoleindustries.com in Vercel dashboard)
ALLOWED_ORIGIN=https://tadpoleindustries.com
```

- [ ] **Step 4: Run a production build to verify everything compiles**

```bash
npm run build 2>&1 | tail -10
```

Expected: `The build folder is ready to be deployed.`

Also confirm `build/.htaccess` exists:

```bash
Test-Path "C:\Users\schinta\eu-dress-code\build\.htaccess"
```

Expected: `True`

- [ ] **Step 5: Commit**

```bash
git add public/.htaccess .env.production .env.example
git commit -m "feat: add deployment files for tadpoleindustries.com (htaccess + env)"
```

---

## Deployment Steps (After All Tasks Complete)

These are manual steps, not part of the automated plan:

**1. Deploy API to Vercel (one-time):**
```powershell
cd C:\Users\schinta\eu-dress-code
npx vercel login          # opens browser for auth
npx vercel --prod         # deploys api/ folder; note the URL shown
```
In the Vercel dashboard → Project Settings → Environment Variables, add:
- `GEMINI_API_KEY` = `AIzaSyDCTDklM_82f6jYeC9NiGDQ-2QhuZz6dKw`
- `ALLOWED_ORIGIN` = `https://tadpoleindustries.com`

**2. Update `.env.production` with the real Vercel URL**, then rebuild:
```powershell
npm run build
```

**3. Upload `build/` folder contents to tadpoleindustries.com** via FTP/cPanel File Manager. Upload to the `public_html/` root (or a subdirectory if the domain points to one). The `.htaccess` handles all SPA routing.
