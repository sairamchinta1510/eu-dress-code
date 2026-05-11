# EUDressCode — Design Specification

**Date:** 2026-05-11  
**Project:** `eu-dress-code` (React + TypeScript, Create React App)  
**Status:** Approved

---

## 1. Problem & Goal

Users attending European events (galas, corporate dinners, weddings, conferences) are often unsure what to wear when a dress code is specified on an invitation or calendar invite. EUDressCode solves this by:

1. Providing a comprehensive, visual dress code reference (encyclopedia) with full-outfit model photos for both men and women.
2. Integrating with Outlook calendar so users can see the expected dress code for each upcoming event.
3. Letting users photograph their closet and receive AI-powered feedback on whether they have the right clothes — or what they need to buy.

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React + TypeScript (CRA) | Already scaffolded |
| Styling | CSS Modules + custom theme | Clean & Professional: white/grey bg, dark navy (#2c3e50) accents |
| Layout | Mobile-first responsive | Primary use case: phone in front of closet |
| Auth | MSAL.js (`@azure/msal-browser`) | Microsoft/Outlook sign-in for Graph API |
| Calendar API | Microsoft Graph API (`/me/calendarView`) | Read upcoming Outlook events |
| AI Vision | Google Gemini Vision API (`gemini-1.5-flash`) | Closet photo analysis |
| Gemini proxy | Vercel Serverless Function (`/api/analyze-closet`) | Keeps Gemini API key server-side |
| Photos | Unsplash (curated URLs per dress code/gender) | Real full-body model photos |
| Hosting | Vercel | Serverless functions included, easy CRA deployment |

---

## 3. Pages & Navigation

The app has a persistent bottom navigation bar (mobile) with 3 tabs, plus a global search bar at the top of every page.

```
┌─────────────────────────────────┐
│ 🔍 Search dress codes...        │  ← persistent top bar
├─────────────────────────────────┤
│                                 │
│        [Page Content]           │
│                                 │
├─────────────────────────────────┤
│  👔 Codes  │ 📅 Calendar │ 🪞 Closet │  ← bottom nav
└─────────────────────────────────┘
```

### Page 1 — Dress Code Encyclopedia (`/`)

- Grid of 12 dress code cards: icon + name + one-line occasion description
- Search filters the grid in real time (by name, occasion, clothing item, shoe colour)
- Tapping a card navigates to the detail page (`/dress-codes/:id`)

**Detail page (`/dress-codes/:id`):**
- Header: dress code name, formality badge, typical occasions
- **Men / Women tab toggle**
- Each tab shows:
  - Full-body Unsplash model photo (curated URL, head to toe)
  - Outfit breakdown list:
    - Jacket / Outerwear
    - Shirt / Top
    - Trousers / Skirt / Dress
    - Accessories (tie, belt, bag, etc.)
    - **Shoe type + colour** (explicit)
  - Do's ✅ and Don'ts ❌ section

### Page 2 — Calendar Integration (`/calendar`)

- "Sign in with Microsoft" button (MSAL.js popup flow)
- Once signed in: shows upcoming 7 days of Outlook events
- Each event card displays:
  - Event title, date, time
  - Auto-detected dress code badge (keyword matching on title + description)
  - Tap → full dress code detail + shortcut to Closet Check for that dress code
- Keyword detection rules (examples):
  - "gala", "black tie", "formal dinner" → Black Tie
  - "conference", "board meeting" → Business Formal
  - "client lunch", "office" → Business Casual
  - "garden party", "outdoor" → Resort Casual
- If no dress code detected: shows "Unknown — tap to select manually"

### Page 3 — Closet Check (`/closet`)

- Step 1: Select target dress code (dropdown, pre-filled if arrived from Calendar page)
- Step 2: Upload photo or use camera (mobile `<input type="file" accept="image/*" capture="environment">`)
- Step 3: "Analyse my closet" button → POST to `/api/analyze-closet` serverless function
- Step 4: Results panel:
  - ✅ Items detected that match the dress code
  - ❌ Items missing
  - 🛍️ Suggested items to buy (with search link)
- User can re-upload or change the target dress code and re-analyse

### Global Search

- Persistent `<input>` at top of every page
- Searches across: dress code names, occasion tags, clothing item names, colours
- Results appear as a dropdown overlay linking to dress code detail pages
- Implemented client-side (data is small, no API needed)

---

## 4. Dress Codes — All 12

Each dress code has a static data entry containing: id, name, icon, formality level (1–5), occasions[], men outfit, women outfit, dos[], donts[].

| # | ID | Name | Formality |
|---|---|---|---|
| 1 | `white-tie` | White Tie | 5 — Ultra Formal |
| 2 | `black-tie` | Black Tie | 5 — Very Formal |
| 3 | `black-tie-optional` | Black Tie Optional | 4 — Formal |
| 4 | `morning-dress` | Morning Dress | 4 — Formal (Daytime) |
| 5 | `creative-black-tie` | Creative Black Tie | 4 — Formal Creative |
| 6 | `cocktail` | Cocktail Attire | 3 — Semi-Formal |
| 7 | `lounge-suit` | Lounge Suit | 3 — Semi-Formal |
| 8 | `business-formal` | Business Formal | 3 — Corporate |
| 9 | `business-casual` | Business Casual | 2 — Smart |
| 10 | `smart-casual` | Smart Casual | 2 — Relaxed Smart |
| 11 | `resort-casual` | Resort / Outdoor Casual | 1 — Relaxed |
| 12 | `casual` | Casual | 1 — Everyday |

Each outfit object has the shape:
```ts
interface OutfitDetail {
  photo: string;          // Unsplash URL
  jacket: string;
  top: string;
  bottom: string;         // trousers / skirt / dress
  accessories: string[];
  shoeType: string;
  shoeColour: string;     // explicit colour(s)
  dos: string[];
  donts: string[];
}
```

---

## 5. Serverless Function — `/api/analyze-closet`

**Runtime:** Vercel Serverless (Node.js)  
**Method:** POST  
**Request body:**
```json
{
  "imageBase64": "data:image/jpeg;base64,...",
  "dressCodeId": "lounge-suit"
}
```
**Behaviour:**
1. Receives the base64 image and target dress code ID
2. Looks up the dress code's required outfit items
3. Sends image + structured prompt to Gemini Vision API:
   > "This is a photo of someone's wardrobe. The target dress code is Lounge Suit which requires: dark suit jacket, dress trousers, dress shirt, Oxford shoes (black or dark brown). List which of these items you can see in the wardrobe, and which are missing."
4. Returns structured JSON response:
```json
{
  "found": ["dark suit jacket", "white dress shirt"],
  "missing": ["dress trousers", "Oxford shoes"],
  "suggestions": ["Buy charcoal dress trousers", "Buy black Oxford shoes"]
}
```
**Environment variable required:** `GEMINI_API_KEY`

---

## 6. Microsoft Graph — Calendar Integration

- Library: `@azure/msal-browser`
- Azure App Registration required (user sets up, redirect URI = app URL)
- Scopes: `Calendars.Read`, `User.Read`
- API call: `GET /me/calendarView?startDateTime=...&endDateTime=...`
- Dress code auto-detection: client-side keyword matching (no server call needed)
- Token stored in memory (MSAL default — no localStorage persistence for security)

**Environment variables required:**
- `REACT_APP_MSAL_CLIENT_ID`
- `REACT_APP_MSAL_TENANT_ID`

---

## 7. Data Architecture

All dress code content is **static TypeScript data** (`src/data/dressCodes.ts`) — no database needed. The app is read-only for dress code content. Only the Gemini closet analysis and Microsoft Graph calls are dynamic/network operations.

```
src/
  data/
    dressCodes.ts          # all 12 dress code records (static)
  components/
    SearchBar/             # global search input + dropdown
    BottomNav/             # mobile navigation tabs
    DressCodeCard/         # grid card
    DressCodeDetail/       # detail page with Men/Women tabs
    CalendarView/          # Outlook events list
    ClosetCheck/           # photo upload + results
  pages/
    HomePage.tsx           # grid + search
    DressCodePage.tsx      # detail page
    CalendarPage.tsx       # Outlook integration
    ClosetPage.tsx         # AI closet analysis
  hooks/
    useMsal.ts             # Microsoft auth hook
    useSearch.ts           # search filtering hook
  api/
    analyze-closet.ts      # Vercel serverless function (in /api/ at project root)
```

---

## 8. Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Vercel (server-side) | Gemini Vision API |
| `REACT_APP_MSAL_CLIENT_ID` | `.env` / Vercel | Azure App Registration client ID |
| `REACT_APP_MSAL_TENANT_ID` | `.env` / Vercel | Azure tenant ID |

A `.env.example` file will be committed with placeholder values.

---

## 9. Out of Scope (v1)

- User accounts / saved preferences
- Push notifications for upcoming events
- Shopping integration (prices, buy links)
- Multiple language support
- Dark mode
