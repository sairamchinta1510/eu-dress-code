# EUDressCode — LLM Search & Calendar Fix Design
**Date:** 2026-05-17  
**Status:** Approved

---

## 1. Problem Statement

Two issues to address:
1. The current search (`useSearch.ts`) is a simple string `includes()` filter — it fails for natural language queries like *"something for a rainy outdoor lunch"* and returns nothing for paraphrased intent.
2. The Outlook Calendar feature returns a 403 from the Microsoft Graph API because no real Azure App Registration exists — the placeholder `client_id` has no granted `Calendars.Read` scope.

---

## 2. LLM Search

### Goal
Replace keyword matching with Gemini-powered semantic search that accepts natural language queries and returns ranked dress codes with a one-line explanation per result.

### Architecture
- New Vercel serverless function `api/search.ts` — Gemini API key stays server-side (same pattern as `api/analyze-closet.ts`).
- Existing `src/hooks/useSearch.ts` is removed and replaced with `src/hooks/useLLMSearch.ts`.
- `SearchBar` component is updated to handle async state (loading, error, results with explanations).

### Data Flow
```
User types query → presses Enter
  → SearchBar calls POST /api/search { query, dressCodes: DressCodeSummary[] }
  → api/search sends query + dress code context to Gemini (gemini-1.5-flash)
  → Gemini returns ranked list: { id: string, relevance: 1–5, reason: string }[]
  → useLLMSearch maps IDs back to full DressCode objects
  → SearchBar renders ranked results with reason lines in dropdown
```

### api/search.ts (new)
- `POST /api/search`
- Request body: `{ query: string, dressCodes: { id: string, name: string, description: string, occasions: string[], keywords: string[] }[] }`
- Builds a Gemini prompt with all dress code summaries and the user's query
- Instructs Gemini to return a JSON array: `{ id, relevance, reason }[]`, sorted by descending relevance, only including codes with relevance ≥ 2
- Returns `200 { results: { id, relevance, reason }[] }` or `500 { error }` on failure
- Requires `GEMINI_API_KEY` env var (same as `api/analyze-closet.ts`)

### useLLMSearch.ts (replaces useSearch.ts)
- Exports `useLLMSearch(dressCodes: DressCode[], query: string)`
- Returns `{ results: SearchResult[], loading: boolean, error: string | null }`
- `SearchResult = { dressCode: DressCode, relevance: number, reason: string }`
- Uses `useCallback` + `useState`; fires on query change (only when query is non-empty and user has submitted)
- Falls back to showing all dress codes when query is empty

### SearchBar component changes
- Adds a search button (magnifying glass icon) alongside the input, enabled on Enter key too
- Shows a loading spinner while awaiting the API response
- Dropdown results show dress code name + one-line `reason` from LLM
- Shows error message if API call fails (e.g. "Search unavailable — try again")
- Maintains existing keyboard accessibility (combobox ARIA pattern)

### Prompt design
```
You are a dress code assistant. Given the user's query, rank the following dress codes by relevance.
Return ONLY valid JSON: an array of { "id": string, "relevance": number (1–5), "reason": string (one sentence) }.
Only include dress codes with relevance >= 2. Sort by descending relevance.

User query: "{query}"

Dress codes:
{dressCodes as JSON}
```

---

## 3. Calendar Fix (Azure App Registration)

### Problem
`useMsal.ts` calls `acquireTokenSilent` with scope `['Calendars.Read', 'User.Read']`. The Microsoft Graph API returns 403 because there is no real Azure App Registration — the placeholder `REACT_APP_MSAL_CLIENT_ID` in `.env` has no permissions granted.

### Solution
The MSAL code is already correct. The fix is purely configuration: create a real Azure App Registration and wire the real credentials into `.env`.

### Azure App Registration Steps
The following steps are performed once in the Azure Portal by the user:

1. Go to [portal.azure.com](https://portal.azure.com) → **Azure Active Directory** → **App registrations** → **New registration**
2. Name: `EUDressCode` (or any name)
3. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts** (to support Outlook.com personal accounts)
4. Redirect URI: **Single-page application (SPA)** → `http://localhost:3000`
   - Add `https://<your-vercel-domain>` for production
5. Click **Register** — copy the **Application (client) ID** and **Directory (tenant) ID**
6. Go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**
   - Add: `Calendars.Read`, `User.Read`
7. Click **Grant admin consent** (if using a personal Microsoft account, consent is granted at sign-in — no admin step needed)
8. Update `.env`:
   ```
   REACT_APP_MSAL_CLIENT_ID=<paste Application ID>
   REACT_APP_MSAL_TENANT_ID=<paste Directory ID>  (or use "common" for multi-tenant)
   REACT_APP_MSAL_REDIRECT_URI=http://localhost:3000
   ```
9. Restart dev server (`npm start`)

### Code fix: acquireTokenSilent fallback
The current `useMsal.ts` only calls `acquireTokenSilent`. If the token cache is empty on first load, this throws `InteractionRequiredAuthError`. Add a fallback to `acquireTokenPopup` to handle this gracefully:

```ts
import { InteractionRequiredAuthError } from '@azure/msal-browser';

// In fetchEvents:
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

This prevents silent failures after page refresh or token expiry.

---

## 4. Files Changed

| File | Change |
|------|--------|
| `api/search.ts` | New — Gemini LLM search serverless function |
| `src/hooks/useLLMSearch.ts` | New — replaces `useSearch.ts` |
| `src/hooks/useSearch.ts` | Deleted |
| `src/hooks/useSearch.test.ts` | Deleted — replaced by `useLLMSearch.test.ts` |
| `src/components/SearchBar/SearchBar.tsx` | Updated — async results, loading, explanations |
| `src/components/SearchBar/SearchBar.module.css` | Updated — loading + reason styles |
| `src/hooks/useLLMSearch.test.ts` | New — replaces `useSearch.test.ts` |
| `.env.example` | No change (already documents required vars) |

---

## 5. Testing

- `api/search.ts`: Unit test with mocked Gemini response — valid JSON, malformed JSON (error path), empty results
- `useLLMSearch.ts`: Unit tests — empty query returns all dress codes, loading state, error state, maps results correctly
- `SearchBar`: Update existing tests — mock `useLLMSearch`, test loading spinner renders, test explanation text renders
- `useMsal.ts`: Add test for `InteractionRequiredAuthError` fallback path
