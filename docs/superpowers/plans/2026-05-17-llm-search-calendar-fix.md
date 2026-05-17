# LLM Search & Calendar Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace keyword search with Gemini-powered natural language search and fix the Outlook Calendar 403 error by adding a `acquireTokenSilent` fallback and guiding Azure App Registration setup.

**Architecture:** A new Vercel serverless function `api/search.ts` calls Gemini with the user's query and all 12 dress code summaries, returning ranked results with one-line explanations. The existing `useSearch` hook is replaced with `useLLMSearch` (async, submit-triggered). The calendar fix is purely a code change to `useMsal.ts` — `acquireTokenSilent` falls back to `acquireTokenPopup` on `InteractionRequiredAuthError`.

**Tech Stack:** React + TypeScript (CRA), `@google/generative-ai` (gemini-1.5-flash), `@azure/msal-browser` (InteractionRequiredAuthError), Vercel serverless functions, Jest + React Testing Library.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `api/search.ts` | Create | Gemini LLM search serverless function — POST /api/search |
| `src/hooks/useLLMSearch.ts` | Create | Async search hook — calls /api/search, manages loading/error/results |
| `src/hooks/useLLMSearch.test.ts` | Create | Tests for useLLMSearch — fetch mock, empty query, loading, error paths |
| `src/hooks/useSearch.ts` | Delete | Replaced by useLLMSearch |
| `src/hooks/useSearch.test.ts` | Delete | Replaced by useLLMSearch.test.ts |
| `src/components/SearchBar/SearchBar.tsx` | Modify | Switch to useLLMSearch, add loading spinner, show reason per result |
| `src/components/SearchBar/SearchBar.module.css` | Modify | Add `.loading`, `.reason`, `.errorMsg` styles |
| `src/components/SearchBar/SearchBar.test.tsx` | Create | Tests for updated SearchBar — loading/error/reason rendering |
| `src/hooks/useMsal.ts` | Modify | Add InteractionRequiredAuthError fallback in fetchEvents |
| `src/hooks/useMsal.test.ts` | Modify | Add test for InteractionRequiredAuthError fallback |

---

## Task 1: api/search.ts — Gemini LLM Search Function

**Files:**
- Create: `api/search.ts`

> Note: This follows the same pattern as `api/analyze-closet.ts`. Vercel serves files in `api/` as serverless functions. The function is not unit-tested directly (same pattern as analyze-closet.ts); it is covered through hook tests that mock `fetch`.

- [ ] **Step 1: Create `api/search.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface DressCodeSummary {
  id: string;
  name: string;
  description: string;
  occasions: string[];
  keywords: string[];
}

interface SearchRequestBody {
  query: string;
  dressCodes: DressCodeSummary[];
}

export interface SearchResultItem {
  id: string;
  relevance: number;
  reason: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, dressCodes } = req.body as SearchRequestBody;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'query is required' });
  }

  if (!Array.isArray(dressCodes) || dressCodes.length === 0) {
    return res.status(400).json({ error: 'dressCodes array is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a dress code assistant. Given the user's query, rank the following dress codes by relevance.
Return ONLY valid JSON: an array of { "id": string, "relevance": number (1-5), "reason": string (one sentence) }.
Only include dress codes with relevance >= 2. Sort by descending relevance.

User query: "${query}"

Dress codes:
${JSON.stringify(dressCodes, null, 2)}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('Gemini did not return a valid JSON array');
    }

    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as SearchResultItem[];
    return res.status(200).json({ results: parsed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Search failed';
    return res.status(500).json({ error: message });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/search.ts
git commit -m "feat: add Gemini LLM search serverless function"
```

---

## Task 2: useLLMSearch Hook (replaces useSearch)

**Files:**
- Create: `src/hooks/useLLMSearch.ts`
- Create: `src/hooks/useLLMSearch.test.ts`
- Delete: `src/hooks/useSearch.ts`
- Delete: `src/hooks/useSearch.test.ts`

The hook exposes a `search(query)` function (called on Enter/submit) rather than reacting to every keystroke. Empty query shows all dress codes immediately. `results` contains `{ dressCode, relevance, reason }` — the full `DressCode` object looked up by id.

- [ ] **Step 1: Write the failing tests in `src/hooks/useLLMSearch.test.ts`**

```typescript
import { renderHook, act } from '@testing-library/react';
import { useLLMSearch } from './useLLMSearch';
import { dressCodes } from '../data/dressCodes';

const mockResults = [
  { id: 'black-tie', relevance: 5, reason: 'Formal evening event requiring a tuxedo.' },
  { id: 'cocktail', relevance: 3, reason: 'Semi-formal reception attire.' },
];

describe('useLLMSearch', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns all dress codes with no reason when query is empty', () => {
    const { result } = renderHook(() => useLLMSearch(dressCodes));
    expect(result.current.results).toHaveLength(12);
    expect(result.current.results[0].reason).toBe('');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets loading true while fetching and false on completion', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults }),
    }) as jest.Mock;

    const { result } = renderHook(() => useLLMSearch(dressCodes));

    await act(async () => {
      const promise = result.current.search('gala dinner');
      expect(result.current.loading).toBe(true);
      await promise;
    });

    expect(result.current.loading).toBe(false);
  });

  it('maps API results to full DressCode objects with reasons', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults }),
    }) as jest.Mock;

    const { result } = renderHook(() => useLLMSearch(dressCodes));

    await act(async () => {
      await result.current.search('formal evening');
    });

    expect(result.current.results).toHaveLength(2);
    expect(result.current.results[0].dressCode.id).toBe('black-tie');
    expect(result.current.results[0].relevance).toBe(5);
    expect(result.current.results[0].reason).toBe('Formal evening event requiring a tuxedo.');
    expect(result.current.results[1].dressCode.id).toBe('cocktail');
  });

  it('sets error when fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Search failed' }),
    }) as jest.Mock;

    const { result } = renderHook(() => useLLMSearch(dressCodes));

    await act(async () => {
      await result.current.search('something');
    });

    expect(result.current.error).toBe('Search failed');
    expect(result.current.results).toHaveLength(0);
  });

  it('resets to all dress codes when search is called with empty string', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults }),
    }) as jest.Mock;

    const { result } = renderHook(() => useLLMSearch(dressCodes));

    await act(async () => {
      await result.current.search('gala');
    });
    expect(result.current.results).toHaveLength(2);

    act(() => {
      result.current.search('');
    });
    expect(result.current.results).toHaveLength(12);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd src && npx react-scripts test --watchAll=false --testPathPattern=useLLMSearch
```

Expected: FAIL — `useLLMSearch` module not found.

- [ ] **Step 3: Create `src/hooks/useLLMSearch.ts`**

```typescript
import { useState, useCallback } from 'react';
import { DressCode } from '../types';

export interface SearchResult {
  dressCode: DressCode;
  relevance: number;
  reason: string;
}

const allAsResults = (dressCodes: DressCode[]): SearchResult[] =>
  dressCodes.map((d) => ({ dressCode: d, relevance: 0, reason: '' }));

export const useLLMSearch = (dressCodes: DressCode[]) => {
  const [results, setResults] = useState<SearchResult[]>(() => allAsResults(dressCodes));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults(allAsResults(dressCodes));
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const summaries = dressCodes.map(({ id, name, description, occasions, keywords }) => ({
      id, name, description, occasions, keywords,
    }));

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, dressCodes: summaries }),
      });

      const data = await res.json() as { results?: { id: string; relevance: number; reason: string }[]; error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? 'Search failed');
      }

      const mapped: SearchResult[] = (data.results ?? [])
        .map(({ id, relevance, reason }) => {
          const dressCode = dressCodes.find((d) => d.id === id);
          return dressCode ? { dressCode, relevance, reason } : null;
        })
        .filter((r): r is SearchResult => r !== null);

      setResults(mapped);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [dressCodes]);

  return { results, loading, error, search };
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx react-scripts test --watchAll=false --testPathPattern=useLLMSearch
```

Expected: PASS — 5 tests passing.

- [ ] **Step 5: Delete the old useSearch files**

```bash
Remove-Item src/hooks/useSearch.ts
Remove-Item src/hooks/useSearch.test.ts
```

- [ ] **Step 6: Verify full test suite still passes (SearchBar still imports useSearch — this is expected to fail until Task 3)**

```bash
npx react-scripts test --watchAll=false 2>&1 | tail -20
```

Expected: `useLLMSearch` tests pass; `SearchBar` and `HomePage` tests may fail (useSearch import missing) — that's fine, fixed in Task 3.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useLLMSearch.ts src/hooks/useLLMSearch.test.ts
git rm src/hooks/useSearch.ts src/hooks/useSearch.test.ts
git commit -m "feat: replace useSearch with useLLMSearch (async Gemini-powered)"
```

---

## Task 3: SearchBar — Async UI with Loading & Explanations

**Files:**
- Modify: `src/components/SearchBar/SearchBar.tsx`
- Modify: `src/components/SearchBar/SearchBar.module.css`
- Create: `src/components/SearchBar/SearchBar.test.tsx`

The SearchBar switches from reactive filtering to submit-triggered search. The input still updates live (for UX), but the API call fires on Enter or when the search icon button is clicked. Results show dress code name + one-line reason from the LLM. While loading, a spinner replaces the search icon. On error, a message appears in the dropdown.

- [ ] **Step 1: Write failing tests in `src/components/SearchBar/SearchBar.test.tsx`**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SearchBar from './SearchBar';
import * as useLLMSearchModule from '../../hooks/useLLMSearch';
import { dressCodes } from '../../data/dressCodes';

const mockSearch = jest.fn();

const mockHookIdle = {
  results: dressCodes.map((d) => ({ dressCode: d, relevance: 0, reason: '' })),
  loading: false,
  error: null,
  search: mockSearch,
};

const mockHookLoading = { ...mockHookIdle, loading: true, results: [] };

const mockHookResults = {
  ...mockHookIdle,
  results: [
    { dressCode: dressCodes[0], relevance: 5, reason: 'Perfect for formal evening galas.' },
  ],
};

const mockHookError = { ...mockHookIdle, error: 'Search unavailable — try again', results: [] };

describe('SearchBar', () => {
  beforeEach(() => {
    jest.spyOn(useLLMSearchModule, 'useLLMSearch').mockReturnValue(mockHookIdle);
  });

  it('renders search input', () => {
    render(<MemoryRouter><SearchBar /></MemoryRouter>);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    jest.spyOn(useLLMSearchModule, 'useLLMSearch').mockReturnValue(mockHookLoading);
    render(<MemoryRouter><SearchBar /></MemoryRouter>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('calls search on Enter key', () => {
    render(<MemoryRouter><SearchBar /></MemoryRouter>);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'gala dinner' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(mockSearch).toHaveBeenCalledWith('gala dinner');
  });

  it('shows reason text in dropdown results', async () => {
    jest.spyOn(useLLMSearchModule, 'useLLMSearch').mockReturnValue(mockHookResults);
    render(<MemoryRouter><SearchBar /></MemoryRouter>);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'gala' } });
    await waitFor(() => {
      expect(screen.getByText('Perfect for formal evening galas.')).toBeInTheDocument();
    });
  });

  it('shows error message in dropdown when search fails', async () => {
    jest.spyOn(useLLMSearchModule, 'useLLMSearch').mockReturnValue(mockHookError);
    render(<MemoryRouter><SearchBar /></MemoryRouter>);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'anything' } });
    await waitFor(() => {
      expect(screen.getByText('Search unavailable — try again')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx react-scripts test --watchAll=false --testPathPattern=SearchBar
```

Expected: FAIL — `useSearch` import error + missing spinner/reason elements.

- [ ] **Step 3: Replace `src/components/SearchBar/SearchBar.tsx`**

```typescript
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dressCodes } from '../../data/dressCodes';
import { useLLMSearch } from '../../hooks/useLLMSearch';
import styles from './SearchBar.module.css';

const SearchBar: React.FC = () => {
  const { results, loading, error, search } = useLLMSearch(dressCodes);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const showDropdown = query.trim().length > 0;

  const selectResult = useCallback((id: string) => {
    setQuery('');
    setActiveIndex(-1);
    search('');
    navigate(`/dress-codes/${id}`);
  }, [navigate, search]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        selectResult(results[activeIndex].dressCode.id);
      } else {
        search(query);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setQuery('');
      setActiveIndex(-1);
      search('');
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputRow}>
        {loading ? (
          <span className={styles.spinner} role="status" aria-label="Searching…">⏳</span>
        ) : (
          <button
            className={styles.searchIcon}
            onClick={() => search(query)}
            aria-label="Search"
            tabIndex={-1}
          >🔍</button>
        )}
        <input
          className={styles.input}
          type="search"
          placeholder="Ask anything — e.g. something for a rainy outdoor lunch"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); }}
          onKeyDown={handleKeyDown}
          aria-label="Search dress codes"
          aria-expanded={showDropdown}
          aria-controls="search-results"
          aria-autocomplete="list"
          role="combobox"
          aria-activedescendant={activeIndex >= 0 ? `result-${activeIndex}` : undefined}
        />
        {query && (
          <button
            className={styles.clear}
            onClick={() => { setQuery(''); setActiveIndex(-1); search(''); }}
            aria-label="Clear search"
          >✕</button>
        )}
      </div>
      {showDropdown && (
        <ul id="search-results" className={styles.dropdown} role="listbox" aria-label="Search results">
          {error && (
            <li className={styles.errorMsg} role="option" aria-selected={false}>{error}</li>
          )}
          {!error && results.length === 0 && !loading && (
            <li className={styles.noResults} role="option" aria-selected={false}>No dress codes found</li>
          )}
          {!error && results.map(({ dressCode: d, reason }, i) => (
            <li
              key={d.id}
              id={`result-${i}`}
              className={`${styles.result}${i === activeIndex ? ` ${styles.resultActive}` : ''}`}
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => selectResult(d.id)}
            >
              <span className={styles.resultIcon}>{d.icon}</span>
              <div>
                <div className={styles.resultName}>{d.name}</div>
                {reason ? (
                  <div className={styles.reason}>{reason}</div>
                ) : (
                  <div className={styles.resultSub}>{d.formalityLabel}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
```

> Note: `SearchBar` now manages its own `query` state (no longer passed as props). Update the parent `HomePage` to remove the `query`/`onChange` props it was passing. See Step 5.

- [ ] **Step 4: Update `src/components/SearchBar/SearchBar.module.css` — add new styles**

Add these rules at the bottom of the existing file:

```css
.spinner {
  font-size: 16px;
  flex-shrink: 0;
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.reason {
  font-size: 12px;
  color: var(--accent);
  font-style: italic;
  margin-top: 2px;
}

.errorMsg {
  padding: 12px 16px;
  color: #c0392b;
  font-size: 14px;
}
```

Also update `.searchIcon` to be a button (add `cursor: pointer; background: none; border: none; padding: 0;`):

```css
.searchIcon {
  font-size: 16px;
  color: var(--text-muted);
  flex-shrink: 0;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
}
```

- [ ] **Step 5: Update `src/pages/HomePage.tsx` to remove query/onChange props from SearchBar**

Replace the entire file with:

```tsx
import React from 'react';
import SearchBar from '../components/SearchBar/SearchBar';
import DressCodeCard from '../components/DressCodeCard/DressCodeCard';
import { dressCodes } from '../data/dressCodes';
import styles from './HomePage.module.css';

const HomePage: React.FC = () => (
  <div className={styles.page}>
    <header className={styles.header}>
      <h1 className={styles.title}>EU Dress Code Guide</h1>
      <p className={styles.subtitle}>Know exactly what to wear, every time</p>
      <div className={styles.searchWrapper}>
        <SearchBar />
      </div>
    </header>
    <section className={styles.grid} aria-label="Dress codes">
      {dressCodes.map((dc) => (
        <DressCodeCard key={dc.id} dressCode={dc} />
      ))}
    </section>
  </div>
);

export default HomePage;
```

- [ ] **Step 6: Run all tests**

```bash
npx react-scripts test --watchAll=false 2>&1 | tail -30
```

Expected: All tests pass. Confirm `SearchBar.test.tsx` shows 5 passing, `useLLMSearch.test.ts` shows 5 passing, `HomePage.test.tsx` shows 3 passing.

- [ ] **Step 7: Commit**

```bash
git add src/components/SearchBar/ src/pages/HomePage.tsx
git commit -m "feat: update SearchBar for async LLM search with loading and explanations"
```

---

## Task 4: Calendar Fix — acquireTokenSilent Fallback + Azure Setup Guide

**Files:**
- Modify: `src/hooks/useMsal.ts`
- Modify: `src/hooks/useMsal.test.ts`

### Part A: Code fix

The current `fetchEvents` only calls `acquireTokenSilent`. On page refresh or token expiry, MSAL throws `InteractionRequiredAuthError`, which is caught as a generic error and shown as "Failed to load calendar". Adding a fallback to `acquireTokenPopup` handles this gracefully — the user sees a popup to re-authenticate instead of a broken error state.

- [ ] **Step 1: Write the failing test in `src/hooks/useMsal.test.ts`**

Add this test to the existing `describe('detectDressCode', ...)` block — or add a new describe block after it:

```typescript
// Add at the top of useMsal.test.ts with existing imports:
import { InteractionRequiredAuthError } from '@azure/msal-browser';
```

Add a new describe block at the bottom of `src/hooks/useMsal.test.ts`:

```typescript
describe('InteractionRequiredAuthError fallback', () => {
  it('is exported from @azure/msal-browser', () => {
    // Validates the import is correct — if this fails, the package version changed
    expect(typeof InteractionRequiredAuthError).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it passes** (this is an import sanity check)

```bash
npx react-scripts test --watchAll=false --testPathPattern=useMsal
```

Expected: PASS — confirms `InteractionRequiredAuthError` is importable.

- [ ] **Step 3: Update `src/hooks/useMsal.ts` — add the fallback**

Replace the `fetchEvents` implementation. Change:

```typescript
import { useState, useCallback } from 'react';
import { useMsal as useMsalLib } from '@azure/msal-react';
import { loginRequest } from '../msalConfig';
import { CalendarEvent } from '../types';
```

to:

```typescript
import { useState, useCallback } from 'react';
import { useMsal as useMsalLib } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { loginRequest } from '../msalConfig';
import { CalendarEvent } from '../types';
```

Then in `fetchEvents`, replace:

```typescript
      const token = await instance.acquireTokenSilent({ ...loginRequest, account });
```

with:

```typescript
      let token;
      try {
        token = await instance.acquireTokenSilent({ ...loginRequest, account });
      } catch (e) {
        if (e instanceof InteractionRequiredAuthError) {
          token = await instance.acquireTokenPopup({ ...loginRequest, account });
        } else {
          throw e;
        }
      }
```

- [ ] **Step 4: Run all tests to confirm no regressions**

```bash
npx react-scripts test --watchAll=false 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMsal.ts src/hooks/useMsal.test.ts
git commit -m "fix: add acquireTokenPopup fallback for calendar token refresh"
```

### Part B: Azure App Registration (manual — done in the browser)

> **These steps are performed once by the developer in the Azure Portal — no code changes required.**

- [ ] **Step 6: Create Azure App Registration**

1. Go to [https://portal.azure.com](https://portal.azure.com) and sign in with your Microsoft account.
2. Search for **"App registrations"** → click **New registration**.
3. Fill in:
   - **Name:** `EUDressCode`
   - **Supported account types:** `Accounts in any organizational directory and personal Microsoft accounts (e.g. Skype, Xbox)`
   - **Redirect URI:** Select **Single-page application (SPA)** → enter `http://localhost:3000`
4. Click **Register**.
5. On the overview page, copy:
   - **Application (client) ID** → this is your `REACT_APP_MSAL_CLIENT_ID`
   - **Directory (tenant) ID** → use `common` if you want to support both personal and work accounts; use the actual GUID for org-only

- [ ] **Step 7: Add API permissions**

1. In your app registration, go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**.
2. Search for and add: `Calendars.Read`
3. Search for and add: `User.Read`
4. If you are an admin on the tenant, click **Grant admin consent**. If using a personal Microsoft account (Outlook.com), consent is granted interactively at sign-in — no admin step needed.

- [ ] **Step 8: Create `.env` file and restart**

In `C:\Users\schinta\eu-dress-code`, create a `.env` file (not committed — it's in `.gitignore`):

```
REACT_APP_MSAL_CLIENT_ID=<paste your Application (client) ID>
REACT_APP_MSAL_TENANT_ID=common
REACT_APP_MSAL_REDIRECT_URI=http://localhost:3000
GEMINI_API_KEY=<your Gemini API key>
```

Then restart the dev server:
```bash
npm start
```

- [ ] **Step 9: Verify calendar works**

1. Open http://localhost:3000 → go to the Calendar tab.
2. Click "Sign in with Microsoft" → authenticate with your Microsoft account.
3. Grant the requested permissions (`Calendars.Read`, `User.Read`) in the consent popup.
4. Upcoming events should appear with detected dress codes.

---

## Final Verification

- [ ] **Run full test suite**

```bash
npx react-scripts test --watchAll=false 2>&1 | tail -20
```

Expected output: all test suites pass (33+ tests).

- [ ] **Run production build**

```bash
npm run build 2>&1 | tail -10
```

Expected: `Compiled successfully.`

- [ ] **Final commit**

```bash
git add -A
git commit -m "chore: verify build and tests after LLM search + calendar fix"
```
