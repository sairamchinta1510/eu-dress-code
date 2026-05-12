# EUDressCode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first React + TypeScript app that shows all 12 EU dress codes with full model photos, integrates with Outlook calendar via Microsoft Graph, and lets users analyse their closet with Google Gemini Vision AI.

**Architecture:** React SPA (CRA + TypeScript) for the frontend with React Router for navigation. A Vercel serverless function at `api/analyze-closet.ts` proxies Gemini Vision calls to keep the API key server-side. Microsoft calendar integration uses MSAL.js in the browser directly.

**Tech Stack:** React 19, TypeScript, react-router-dom v6, @azure/msal-browser, @azure/msal-react, @google/generative-ai (server-side only), CSS Modules, Vercel

---

## File Map

```
eu-dress-code/
├── api/
│   └── analyze-closet.ts          # Vercel serverless — Gemini Vision proxy
├── src/
│   ├── types/
│   │   └── index.ts               # DressCode, OutfitDetail, CalendarEvent, ClosetResult
│   ├── data/
│   │   └── dressCodes.ts          # All 12 dress codes (static)
│   ├── styles/
│   │   └── theme.css              # CSS variables + global reset
│   ├── hooks/
│   │   ├── useSearch.ts           # Filters dress codes by query string
│   │   └── useMsal.ts             # Microsoft auth + Graph API calls
│   ├── components/
│   │   ├── BottomNav/
│   │   │   ├── BottomNav.tsx
│   │   │   └── BottomNav.module.css
│   │   ├── SearchBar/
│   │   │   ├── SearchBar.tsx
│   │   │   └── SearchBar.module.css
│   │   ├── DressCodeCard/
│   │   │   ├── DressCodeCard.tsx
│   │   │   └── DressCodeCard.module.css
│   │   ├── DressCodeDetail/
│   │   │   ├── DressCodeDetail.tsx
│   │   │   └── DressCodeDetail.module.css
│   │   ├── CalendarView/
│   │   │   ├── CalendarView.tsx
│   │   │   └── CalendarView.module.css
│   │   └── ClosetCheck/
│   │       ├── ClosetCheck.tsx
│   │       └── ClosetCheck.module.css
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── DressCodePage.tsx
│   │   ├── CalendarPage.tsx
│   │   └── ClosetPage.tsx
│   ├── App.tsx                    # BrowserRouter + Routes + Layout shell
│   ├── App.module.css
│   ├── index.tsx                  # unchanged
│   └── msalConfig.ts              # MSAL PublicClientApplication config
├── .env.example
├── vercel.json
└── package.json
```

---

## Task 1: Install Dependencies & Project Setup

**Files:**
- Modify: `package.json`
- Create: `.env.example`
- Create: `vercel.json`

- [ ] **Step 1: Install frontend dependencies**

```bash
cd C:\Users\schinta\eu-dress-code
npm install react-router-dom @azure/msal-browser @azure/msal-react
npm install --save-dev @types/react-router-dom
```

Expected: packages added, no errors.

- [ ] **Step 2: Install serverless function dependency (Gemini SDK)**

```bash
npm install @google/generative-ai
npm install --save-dev @vercel/node
```

Expected: packages added.

- [ ] **Step 3: Create `.env.example`**

```
# Microsoft Azure App Registration
REACT_APP_MSAL_CLIENT_ID=your-azure-client-id-here
REACT_APP_MSAL_TENANT_ID=your-azure-tenant-id-here

# Google Gemini (Vercel server-side only — never commit the real key)
GEMINI_API_KEY=your-gemini-api-key-here
```

- [ ] **Step 4: Create `vercel.json`**

```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 5: Add `.env.local` to `.gitignore`** (it may already be there from CRA)

Open `.gitignore` and confirm `.env.local` and `.env` are listed. If not, append:
```
.env.local
.env
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example vercel.json .gitignore
git commit -m "chore: install dependencies and project setup"
```

---

## Task 2: Types & Dress Code Data

**Files:**
- Create: `src/types/index.ts`
- Create: `src/data/dressCodes.ts`
- Test: `src/data/dressCodes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/data/dressCodes.test.ts`:

```ts
import { dressCodes } from './dressCodes';

describe('dressCodes data', () => {
  it('has exactly 12 entries', () => {
    expect(dressCodes).toHaveLength(12);
  });

  it('every dress code has a unique id', () => {
    const ids = dressCodes.map((d) => d.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(12);
  });

  it('every dress code has men and women outfits with shoeColour', () => {
    dressCodes.forEach((d) => {
      expect(d.men.shoeColour).toBeTruthy();
      expect(d.women.shoeColour).toBeTruthy();
    });
  });

  it('every dress code has at least one occasion', () => {
    dressCodes.forEach((d) => {
      expect(d.occasions.length).toBeGreaterThan(0);
    });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- --watchAll=false --testPathPattern=dressCodes.test
```

Expected: FAIL — `Cannot find module './dressCodes'`

- [ ] **Step 3: Create `src/types/index.ts`**

```ts
export interface OutfitDetail {
  photo: string;
  jacket: string;
  top: string;
  bottom: string;
  accessories: string[];
  shoeType: string;
  shoeColour: string;
  dos: string[];
  donts: string[];
}

export interface DressCode {
  id: string;
  name: string;
  icon: string;
  formality: 1 | 2 | 3 | 4 | 5;
  formalityLabel: string;
  occasions: string[];
  description: string;
  keywords: string[];
  men: OutfitDetail;
  women: OutfitDetail;
}

export interface CalendarEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  bodyPreview?: string;
  detectedDressCodeId?: string;
}

export interface ClosetResult {
  found: string[];
  missing: string[];
  suggestions: string[];
}
```

- [ ] **Step 4: Create `src/data/dressCodes.ts`**

```ts
import { DressCode } from '../types';

// Photos: Unsplash source URLs (development). Replace with curated Unsplash API
// photo IDs for production. Format: https://images.unsplash.com/photo-{ID}?w=400&h=600&fit=crop
const PHOTO = {
  whiteTieMen: 'https://source.unsplash.com/400x600/?tailcoat,white-tie,man,formal',
  whiteTieWomen: 'https://source.unsplash.com/400x600/?ballgown,white-tie,gown,woman',
  blackTieMen: 'https://source.unsplash.com/400x600/?tuxedo,black-tie,man',
  blackTieWomen: 'https://source.unsplash.com/400x600/?evening-gown,black-tie,woman',
  blackTieOptMen: 'https://source.unsplash.com/400x600/?suit,formal,man',
  blackTieOptWomen: 'https://source.unsplash.com/400x600/?cocktail-dress,formal,woman',
  morningMen: 'https://source.unsplash.com/400x600/?morning-dress,tailcoat,man',
  morningWomen: 'https://source.unsplash.com/400x600/?day-dress,hat,elegant,woman',
  creativeMen: 'https://source.unsplash.com/400x600/?velvet-jacket,creative,fashion,man',
  creativeWomen: 'https://source.unsplash.com/400x600/?statement-dress,fashion,woman',
  cocktailMen: 'https://source.unsplash.com/400x600/?dark-suit,cocktail,man',
  cocktailWomen: 'https://source.unsplash.com/400x600/?cocktail-dress,woman',
  loungeMen: 'https://source.unsplash.com/400x600/?lounge-suit,business,man',
  loungeWomen: 'https://source.unsplash.com/400x600/?trouser-suit,smart,woman',
  bizFormalMen: 'https://source.unsplash.com/400x600/?business-formal,suit,tie,man',
  bizFormalWomen: 'https://source.unsplash.com/400x600/?business-formal,blazer,woman',
  bizCasualMen: 'https://source.unsplash.com/400x600/?business-casual,chinos,man',
  bizCasualWomen: 'https://source.unsplash.com/400x600/?business-casual,blouse,woman',
  smartCasualMen: 'https://source.unsplash.com/400x600/?smart-casual,blazer,jeans,man',
  smartCasualWomen: 'https://source.unsplash.com/400x600/?smart-casual,woman',
  resortMen: 'https://source.unsplash.com/400x600/?linen,resort,man',
  resortWomen: 'https://source.unsplash.com/400x600/?sundress,resort,woman',
  casualMen: 'https://source.unsplash.com/400x600/?casual,jeans,man',
  casualWomen: 'https://source.unsplash.com/400x600/?casual,woman',
};

export const dressCodes: DressCode[] = [
  {
    id: 'white-tie',
    name: 'White Tie',
    icon: '🎩',
    formality: 5,
    formalityLabel: 'Ultra Formal',
    occasions: ['State banquets', 'Opera galas', 'Royal events', 'Formal balls'],
    description: 'The most formal dress code in existence. Reserved for the grandest ceremonial occasions.',
    keywords: ['white tie', 'cravate blanche', 'ultra formal', 'ball', 'state banquet', 'tailcoat'],
    men: {
      photo: PHOTO.whiteTieMen,
      jacket: 'Black wool tailcoat with silk-faced lapels',
      top: 'White piqué wing-collar dress shirt with white piqué waistcoat',
      bottom: 'Black dress trousers with double silk braid down each leg',
      accessories: ['White piqué bow tie', 'White pocket square', 'White gloves (optional)', 'Cufflinks'],
      shoeType: 'Patent leather Oxford or court shoe',
      shoeColour: 'Black patent leather',
      dos: ['Press the tailcoat the night before', 'Ensure waistcoat is fully visible', 'Wear white gloves for very formal occasions'],
      donts: ['Never wear a coloured bow tie', 'Never substitute a regular suit', 'Do not skip the waistcoat'],
    },
    women: {
      photo: PHOTO.whiteTieWomen,
      jacket: 'Opera coat or fur stole (optional)',
      top: 'Full-length ball gown or formal evening dress',
      bottom: 'Floor-length skirt — ball gown or A-line silhouette',
      accessories: ['Long gloves (elbow or above)', 'Tiara or formal jewellery', 'Structured evening clutch'],
      shoeType: 'Court heel or strappy evening sandal',
      shoeColour: 'Satin to match gown, or silver/gold',
      dos: ['Choose floor-length only', 'Invest in long gloves', 'Wear formal jewellery'],
      donts: ['Never wear a short dress', 'Avoid casual handbags', 'Do not wear overly casual heels'],
    },
  },
  {
    id: 'black-tie',
    name: 'Black Tie',
    icon: '🕴️',
    formality: 5,
    formalityLabel: 'Very Formal',
    occasions: ['Award ceremonies', 'Charity galas', 'Formal dinners', 'Corporate black tie events'],
    description: 'Classic evening formality. The tuxedo is king for men; floor-length elegance for women.',
    keywords: ['black tie', 'tuxedo', 'dinner jacket', 'gala', 'formal dinner', 'award', 'evening'],
    men: {
      photo: PHOTO.blackTieMen,
      jacket: 'Black or midnight-blue tuxedo jacket with silk or satin lapels',
      top: 'White pleated or marcella dress shirt',
      bottom: 'Matching black trousers with single silk braid',
      accessories: ['Black silk bow tie', 'Black cummerbund or waistcoat', 'White pocket square', 'Cufflinks'],
      shoeType: 'Oxford or Derby dress shoe',
      shoeColour: 'Black patent leather or highly polished black leather',
      dos: ['Wear a proper bow tie (not pre-tied)', 'Polish shoes to a mirror shine', 'Keep accessories minimal'],
      donts: ['Never wear a long necktie with a tuxedo', 'Avoid brown shoes', 'Do not skip cufflinks'],
    },
    women: {
      photo: PHOTO.blackTieWomen,
      jacket: 'Elegant wrap or tailored evening jacket (optional)',
      top: 'Floor-length evening gown or chic tailored jumpsuit in luxe fabric',
      bottom: 'Floor-length skirt or wide-leg evening trousers',
      accessories: ['Evening clutch', 'Statement jewellery', 'Wrap or shawl (optional)'],
      shoeType: 'Strappy heeled sandal or court heel',
      shoeColour: 'Black, gold, silver, or nude',
      dos: ['Floor-length is safest', 'Choose luxe fabrics (silk, satin, velvet)', 'Statement earrings elevate any look'],
      donts: ['Avoid casual fabrics like cotton', 'Do not wear overly casual shoes', 'Avoid day bags'],
    },
  },
  {
    id: 'black-tie-optional',
    name: 'Black Tie Optional',
    icon: '✨',
    formality: 4,
    formalityLabel: 'Formal',
    occasions: ['Upscale weddings', 'Charity fundraisers', 'Formal anniversary dinners'],
    description: 'Flexibility between black tie and a very smart lounge suit. Tuxedo welcome but not required.',
    keywords: ['black tie optional', 'formal', 'wedding', 'smart', 'evening'],
    men: {
      photo: PHOTO.blackTieOptMen,
      jacket: 'Tuxedo jacket OR dark charcoal/navy lounge suit jacket',
      top: 'White dress shirt',
      bottom: 'Matching suit trousers',
      accessories: ['Bow tie or classic silk tie', 'Pocket square'],
      shoeType: 'Oxford or Derby dress shoe',
      shoeColour: 'Black or very dark brown',
      dos: ['When in doubt choose the tuxedo', 'Ensure suit is freshly pressed', 'Match belt and shoes'],
      donts: ['Avoid light-coloured suits', 'Do not wear novelty ties', 'No casual loafers'],
    },
    women: {
      photo: PHOTO.blackTieOptWomen,
      jacket: 'Evening jacket or tailored blazer (optional)',
      top: 'Cocktail dress or floor-length gown',
      bottom: 'Knee-length to floor-length skirt or evening trousers',
      accessories: ['Evening bag', 'Elegant jewellery'],
      shoeType: 'Heeled sandal or court heel',
      shoeColour: 'Black, nude, silver, or metallic',
      dos: ['Midi or floor-length preferred', 'Dress up or dress down within the range', 'Heels elevate the look'],
      donts: ['Avoid casual dresses', 'Do not wear trainers', 'Avoid overly casual accessories'],
    },
  },
  {
    id: 'morning-dress',
    name: 'Morning Dress',
    icon: '🎖️',
    formality: 4,
    formalityLabel: 'Formal (Daytime)',
    occasions: ['Royal Ascot', 'Formal daytime weddings', 'Graduation ceremonies', 'Garden parties at palaces'],
    description: 'Traditional formal daytime attire. The only occasion to wear a tailcoat before 6 pm.',
    keywords: ['morning dress', 'ascot', 'wedding', 'daytime formal', 'top hat', 'tailcoat'],
    men: {
      photo: PHOTO.morningMen,
      jacket: 'Black or grey morning coat (tailcoat cut away at front)',
      top: 'White shirt with turn-down or wing collar, waistcoat',
      bottom: 'Grey or black striped morning trousers',
      accessories: ['Silver or grey tie or cravat', 'Top hat (optional)', 'Pocket square', 'Gloves (optional)'],
      shoeType: 'Oxford lace-up',
      shoeColour: 'Black or dark Oxford tan',
      dos: ['Top hat adds authenticity', 'Match waistcoat colour carefully', 'Press trousers with a sharp crease'],
      donts: ['Never wear a lounge suit instead', 'Avoid novelty cravats', 'Do not wear brown shoes with black coat'],
    },
    women: {
      photo: PHOTO.morningWomen,
      jacket: 'Tailored jacket or smart coat',
      top: 'Smart day dress or skirt suit in muted tones',
      bottom: 'Midi-length skirt or tailored dress',
      accessories: ['Hat or fascinator (required at Ascot)', 'Smart gloves', 'Structured handbag'],
      shoeType: 'Court shoe or block heel',
      shoeColour: 'Nude, navy, grey, or cream',
      dos: ['A hat is essential at Royal Ascot', 'Choose structured silhouettes', 'Dress in muted or pastel tones'],
      donts: ['Avoid mini skirts', 'Do not wear casual flats', 'Avoid overly casual hats or no hat at Ascot'],
    },
  },
  {
    id: 'creative-black-tie',
    name: 'Creative Black Tie',
    icon: '🎨',
    formality: 4,
    formalityLabel: 'Formal Creative',
    occasions: ['Art galas', 'Fashion industry events', 'Creative industry awards', 'Film premieres'],
    description: 'Black tie with personality. Follow the black tie framework but inject colour, texture, or bold accessories.',
    keywords: ['creative black tie', 'art gala', 'fashion', 'premiere', 'bold', 'velvet', 'colour'],
    men: {
      photo: PHOTO.creativeMen,
      jacket: 'Tuxedo jacket in a bold colour or texture (velvet, burgundy, navy, jewel tones)',
      top: 'White or black dress shirt, or coloured silk shirt',
      bottom: 'Matching or contrasting formal trousers',
      accessories: ['Statement bow tie or necktie', 'Bold pocket square', 'Interesting cufflinks'],
      shoeType: 'Pointed dress shoe or patent Oxford',
      shoeColour: 'Black, burgundy, navy, or deep jewel tone',
      dos: ['Pick one bold element and build around it', 'Velvet jacket is a safe creative choice', 'Quality accessories make the look'],
      donts: ['Do not go so creative you look informal', 'Avoid clashing patterns everywhere', 'Do not skip the dress shirt'],
    },
    women: {
      photo: PHOTO.creativeWomen,
      jacket: 'Statement blazer or structured jacket (optional)',
      top: 'Dramatic cocktail or evening dress with personality',
      bottom: 'Bold colour, unusual silhouette, or statement fabric',
      accessories: ['Statement jewellery', 'Artistic clutch', 'Heels in an unexpected colour'],
      shoeType: 'Statement heel or artistic shoe',
      shoeColour: 'Any bold or elegant colour',
      dos: ['Embrace colour, texture, and silhouette', 'Artistic jewellery is encouraged', 'Show personal style within formal bounds'],
      donts: ['Do not sacrifice elegance for quirkiness', 'Avoid looking costume-like', 'Do not wear casual fabrics'],
    },
  },
  {
    id: 'cocktail',
    name: 'Cocktail Attire',
    icon: '🍸',
    formality: 3,
    formalityLabel: 'Semi-Formal',
    occasions: ['Corporate parties', 'Evening receptions', 'Semi-formal weddings', 'Product launches'],
    description: 'Smart and polished evening wear. The cocktail dress is the default for women; a dark suit for men.',
    keywords: ['cocktail', 'semi-formal', 'reception', 'party', 'evening', 'corporate party'],
    men: {
      photo: PHOTO.cocktailMen,
      jacket: 'Dark suit jacket (navy, charcoal, or black)',
      top: 'White or pale dress shirt',
      bottom: 'Matching suit trousers',
      accessories: ['Classic silk tie', 'Pocket square (optional)'],
      shoeType: 'Oxford or Derby',
      shoeColour: 'Black or dark brown',
      dos: ['Wear a tie', 'Ensure suit is clean and pressed', 'Polish shoes'],
      donts: ['Avoid casual chinos', 'Do not skip the tie', 'Avoid novelty socks that clash'],
    },
    women: {
      photo: PHOTO.cocktailWomen,
      jacket: 'Evening jacket or blazer (optional)',
      top: 'Knee-length cocktail dress or chic midi with elegant top',
      bottom: 'Knee to midi length skirt',
      accessories: ['Clutch or small structured bag', 'Elegant jewellery'],
      shoeType: 'Heeled sandal, court heel, or dressy flat',
      shoeColour: 'Black, nude, metallic (gold or silver)',
      dos: ['Knee-length is the classic choice', 'Heels are expected', 'Keep accessories elegant'],
      donts: ['Avoid floor-length (too formal)', 'Do not wear casual flats', 'Avoid overly casual bags'],
    },
  },
  {
    id: 'lounge-suit',
    name: 'Lounge Suit',
    icon: '💼',
    formality: 3,
    formalityLabel: 'Semi-Formal',
    occasions: ['Business lunches', 'Conferences', 'Semi-formal weddings', 'Official meetings'],
    description: 'The standard European business and social suit. Versatile and widely expected across professional and social settings.',
    keywords: ['lounge suit', 'suit', 'conference', 'business lunch', 'wedding', 'meeting'],
    men: {
      photo: PHOTO.loungeMen,
      jacket: 'Two or three-piece suit in navy, charcoal, or grey',
      top: 'White or pale blue dress shirt',
      bottom: 'Matching suit trousers, well-pressed',
      accessories: ['Tie (optional but recommended)', 'Pocket square', 'Belt matching shoes'],
      shoeType: 'Oxford or Derby lace-up',
      shoeColour: 'Black or dark brown',
      dos: ['Match belt to shoes', 'Tie adds formality when in doubt', 'Navy suit is the most versatile choice'],
      donts: ['Avoid mixing suit separates in clashing tones', 'Do not wear trainers', 'Avoid novelty ties'],
    },
    women: {
      photo: PHOTO.loungeWomen,
      jacket: 'Tailored blazer or suit jacket',
      top: 'Smart blouse or cami under blazer',
      bottom: 'Trouser suit, midi dress, or tailored skirt',
      accessories: ['Structured handbag', 'Simple jewellery'],
      shoeType: 'Block heel, court shoe, or smart loafer',
      shoeColour: 'Nude, black, or navy',
      dos: ['A trouser suit reads as polished and modern', 'Midi dress is equally appropriate', 'Keep accessories understated'],
      donts: ['Avoid overly casual dresses', 'Do not wear trainers', 'Avoid very casual sandals'],
    },
  },
  {
    id: 'business-formal',
    name: 'Business Formal',
    icon: '🏢',
    formality: 3,
    formalityLabel: 'Corporate',
    occasions: ['Board meetings', 'Law firms', 'Banking', 'Client presentations', 'Formal interviews'],
    description: 'Conservative corporate attire. Every detail communicates professionalism and authority.',
    keywords: ['business formal', 'board meeting', 'corporate', 'office', 'interview', 'law firm', 'banking'],
    men: {
      photo: PHOTO.bizFormalMen,
      jacket: 'Dark conservative suit — black, charcoal, or navy',
      top: 'White or light blue dress shirt, always with a tie',
      bottom: 'Matching suit trousers with sharp crease',
      accessories: ['Conservative silk tie', 'Leather belt matching shoes', 'Minimal cufflinks'],
      shoeType: 'Oxford lace-up — most conservative choice',
      shoeColour: 'Black (preferred) or very dark brown',
      dos: ['Black shoes are safest', 'Keep tie pattern conservative (stripes or small pattern)', 'Suit must fit perfectly'],
      donts: ['Never go without a tie', 'Avoid loud colours or patterns', 'Do not wear loafers in formal banking or legal settings'],
    },
    women: {
      photo: PHOTO.bizFormalWomen,
      jacket: 'Tailored blazer or suit jacket — dark neutral tones',
      top: 'Conservative blouse or fitted shirt in white, cream, or pale tones',
      bottom: 'Tailored trousers or pencil skirt (knee length or below)',
      accessories: ['Structured leather handbag', 'Small conservative jewellery'],
      shoeType: 'Court shoe with modest heel (5–7 cm)',
      shoeColour: 'Black, nude, or navy',
      dos: ['Choose structured, tailored silhouettes', 'Nude or black court shoes are universally appropriate', 'Keep jewellery understated'],
      donts: ['Avoid revealing necklines', 'Do not wear mini skirts', 'Avoid casual handbags or tote bags'],
    },
  },
  {
    id: 'business-casual',
    name: 'Business Casual',
    icon: '👔',
    formality: 2,
    formalityLabel: 'Smart',
    occasions: ['Everyday office', 'Client visits', 'Business travel', 'After-work drinks', 'Casual Fridays'],
    description: 'Smart but relaxed. No tie required, but still polished and put-together.',
    keywords: ['business casual', 'office', 'client meeting', 'client lunch', 'smart', 'work'],
    men: {
      photo: PHOTO.bizCasualMen,
      jacket: 'Blazer or smart unstructured jacket (optional)',
      top: 'Polo shirt, button-down, or collared shirt — no tie needed',
      bottom: 'Chinos, smart trousers, or well-fitting dark jeans (office-dependent)',
      accessories: ['Smart watch', 'Leather belt'],
      shoeType: 'Smart brogue, loafer, or Derby',
      shoeColour: 'Brown, tan, or black',
      dos: ['Chinos + button-down is a reliable default', 'Loafers in tan or brown work well', 'Smart watch elevates the look'],
      donts: ['Avoid ripped or distressed jeans', 'Do not wear trainers unless the office permits', 'Avoid overly casual t-shirts'],
    },
    women: {
      photo: PHOTO.bizCasualWomen,
      jacket: 'Light blazer or cardigan',
      top: 'Blouse, smart top, or fitted knit',
      bottom: 'Smart trousers, a-line skirt, or tailored jeans',
      accessories: ['Smart handbag or tote', 'Simple jewellery'],
      shoeType: 'Smart flat, low heel, or ankle boot',
      shoeColour: 'Any neutral — nude, black, grey, or tan',
      dos: ['A blazer instantly elevates any outfit', 'Ankle boots work well in autumn/winter', 'Smart tote is office-appropriate'],
      donts: ['Avoid overly casual t-shirts', 'Do not wear flip-flops', 'Avoid very revealing tops'],
    },
  },
  {
    id: 'smart-casual',
    name: 'Smart Casual',
    icon: '🧥',
    formality: 2,
    formalityLabel: 'Relaxed Smart',
    occasions: ['Casual restaurants', 'Dates', 'Casual Fridays', 'Weekend gatherings', 'Art galleries'],
    description: 'The most widely misunderstood dress code. Smart enough to impress; casual enough to be comfortable.',
    keywords: ['smart casual', 'casual friday', 'restaurant', 'relaxed', 'date', 'weekend'],
    men: {
      photo: PHOTO.smartCasualMen,
      jacket: 'Blazer or smart bomber jacket',
      top: 'Open-collar shirt, quality t-shirt, or fine-knit jumper',
      bottom: 'Dark slim jeans, chinos, or casual trousers — no rips',
      accessories: ['Smart watch or minimal bracelet', 'Leather belt optional'],
      shoeType: 'Smart trainer, loafer, or Chelsea boot',
      shoeColour: 'White, grey, tan, or black',
      dos: ['Dark jeans + blazer is the fail-safe combo', 'Clean smart trainers are acceptable', 'Fit is everything'],
      donts: ['Avoid ripped jeans', 'No hoodies', 'Do not wear overly formal shoes (they clash)'],
    },
    women: {
      photo: PHOTO.smartCasualWomen,
      jacket: 'Blazer, leather jacket, or smart denim jacket',
      top: 'Smart blouse, fine-knit jumper, or quality tee',
      bottom: 'Tailored trousers, neat midi skirt, or dark jeans',
      accessories: ['Tote or cross-body bag', 'Simple jewellery or statement piece'],
      shoeType: 'Smart trainer, ankle boot, or loafer',
      shoeColour: 'Any colour — match to outfit tone',
      dos: ['Mix smart and casual pieces intentionally', 'Ankle boots are a versatile anchor', 'A structured bag polishes any look'],
      donts: ['Avoid purely casual items (hoodies, gym wear)', 'Do not mix too many clashing tones', 'Avoid scruffy trainers'],
    },
  },
  {
    id: 'resort-casual',
    name: 'Resort / Outdoor Casual',
    icon: '🌴',
    formality: 1,
    formalityLabel: 'Relaxed',
    occasions: ['Garden parties', 'Yacht events', 'Beach weddings', 'Outdoor festivals', 'Mediterranean holidays'],
    description: 'Relaxed and summery but still put-together. Linen is your best friend.',
    keywords: ['resort', 'outdoor', 'garden party', 'yacht', 'beach wedding', 'casual outdoor', 'linen', 'summer'],
    men: {
      photo: PHOTO.resortMen,
      jacket: 'Linen blazer or unstructured summer jacket (optional)',
      top: 'Open-collar linen or cotton shirt',
      bottom: 'Linen or cotton trousers, or chinos in light tones',
      accessories: ['Sunglasses', 'Woven belt', 'Smart watch'],
      shoeType: 'Leather loafer, espadrille, or leather sandal',
      shoeColour: 'Tan, white, or natural leather',
      dos: ['Embrace light colours — cream, white, pale blue', 'Linen breathes in the heat', 'Roll sleeves for a relaxed look'],
      donts: ['Avoid heavy dark suit fabrics', 'Do not wear dress Oxford shoes (too formal)', 'Avoid neon or garish prints'],
    },
    women: {
      photo: PHOTO.resortWomen,
      jacket: 'Linen blazer or kimono-style layer',
      top: 'Sundress, linen blouse, or co-ord top',
      bottom: 'Sundress, linen wide-leg trousers, or midi skirt',
      accessories: ['Straw or structured tote', 'Sun hat', 'Layered jewellery'],
      shoeType: 'Sandal, espadrille, or wedge',
      shoeColour: 'Tan, white, gold, or natural',
      dos: ['Sundresses are perfect for garden parties', 'A straw hat adds a chic resort touch', 'Light fabrics keep you cool and polished'],
      donts: ['Avoid overly formal heels on grass', 'Do not wear heavy fabrics', 'Avoid gym-style clothing'],
    },
  },
  {
    id: 'casual',
    name: 'Casual',
    icon: '👕',
    formality: 1,
    formalityLabel: 'Everyday',
    occasions: ['Informal gatherings', 'Weekends', 'Casual lunches', 'Social events with friends'],
    description: 'Everyday comfortable clothing. No dress code rules — just be clean, neat, and yourself.',
    keywords: ['casual', 'everyday', 'relaxed', 'weekend', 'informal', 'jeans', 'trainers'],
    men: {
      photo: PHOTO.casualMen,
      jacket: 'Denim jacket, hoodie, or casual overshirt',
      top: 'T-shirt, casual shirt, or sweatshirt',
      bottom: 'Jeans, joggers, or casual shorts',
      accessories: ['Baseball cap (optional)', 'Backpack or tote'],
      shoeType: 'Trainer, casual sneaker, or casual loafer',
      shoeColour: 'White, grey, navy, or any colour',
      dos: ['Wear what you feel comfortable in', 'Clean, fitting clothes always look better', 'Express your personal style'],
      donts: ['Avoid clothes with offensive graphics', 'Stained or torn clothing is best avoided', 'No formal shoes — they look out of place'],
    },
    women: {
      photo: PHOTO.casualWomen,
      jacket: 'Denim jacket, hoodie, or casual cardigan',
      top: 'T-shirt, casual blouse, or knit top',
      bottom: 'Jeans, casual trousers, leggings, or casual skirt',
      accessories: ['Crossbody or tote bag', 'Casual jewellery'],
      shoeType: 'Trainer, flat, or casual sandal',
      shoeColour: 'Any colour',
      dos: ['Prioritise comfort and personal style', 'Well-fitting basics always look clean', 'Have fun with colour and prints'],
      donts: ['Avoid formal attire that feels out of place', 'Overly creased or unwashed clothing', 'No stilettos — out of place for casual settings'],
    },
  },
];

export const getDressCodeById = (id: string): DressCode | undefined =>
  dressCodes.find((d) => d.id === id);
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test -- --watchAll=false --testPathPattern=dressCodes.test
```

Expected: PASS — 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/data/dressCodes.ts src/data/dressCodes.test.ts
git commit -m "feat: add dress code types and all 12 dress code data entries"
```

---

## Task 3: Theme CSS, App Shell & Routing

**Files:**
- Create: `src/styles/theme.css`
- Modify: `src/index.tsx`
- Create: `src/msalConfig.ts`
- Modify: `src/App.tsx`
- Create: `src/App.module.css`
- Create: `src/components/BottomNav/BottomNav.tsx`
- Create: `src/components/BottomNav/BottomNav.module.css`

- [ ] **Step 1: Write failing test for BottomNav**

Create `src/components/BottomNav/BottomNav.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BottomNav from './BottomNav';

test('renders all three navigation tabs', () => {
  render(
    <MemoryRouter>
      <BottomNav />
    </MemoryRouter>
  );
  expect(screen.getByText(/Dress Codes/i)).toBeInTheDocument();
  expect(screen.getByText(/Calendar/i)).toBeInTheDocument();
  expect(screen.getByText(/Closet/i)).toBeInTheDocument();
});

test('highlights the active tab', () => {
  render(
    <MemoryRouter initialEntries={['/calendar']}>
      <BottomNav />
    </MemoryRouter>
  );
  const calendarLink = screen.getByText(/Calendar/i).closest('a');
  expect(calendarLink).toHaveClass('active');
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- --watchAll=false --testPathPattern=BottomNav.test
```

Expected: FAIL — cannot find module.

- [ ] **Step 3: Create `src/styles/theme.css`**

```css
:root {
  --navy: #2c3e50;
  --navy-light: #34495e;
  --accent: #e74c3c;
  --bg: #f8f9fa;
  --surface: #ffffff;
  --border: #dee2e6;
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --success: #28a745;
  --danger: #dc3545;
  --radius: 10px;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  --nav-height: 64px;
  --header-height: 56px;
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

- [ ] **Step 4: Import theme in `src/index.tsx`**

Replace the contents of `src/index.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/theme.css';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 5: Create `src/msalConfig.ts`**

```ts
import { Configuration, PublicClientApplication } from '@azure/msal-browser';

const msalConfiguration: Configuration = {
  auth: {
    clientId: process.env.REACT_APP_MSAL_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_MSAL_TENANT_ID || 'common'}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const msalInstance = new PublicClientApplication(msalConfiguration);

export const loginRequest = {
  scopes: ['User.Read', 'Calendars.Read'],
};
```

- [ ] **Step 6: Create `src/components/BottomNav/BottomNav.tsx`**

```tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './BottomNav.module.css';

const BottomNav: React.FC = () => (
  <nav className={styles.nav}>
    <NavLink to="/" end className={({ isActive }) => isActive ? `${styles.tab} active` : styles.tab}>
      <span className={styles.icon}>👔</span>
      <span className={styles.label}>Dress Codes</span>
    </NavLink>
    <NavLink to="/calendar" className={({ isActive }) => isActive ? `${styles.tab} active` : styles.tab}>
      <span className={styles.icon}>📅</span>
      <span className={styles.label}>Calendar</span>
    </NavLink>
    <NavLink to="/closet" className={({ isActive }) => isActive ? `${styles.tab} active` : styles.tab}>
      <span className={styles.icon}>🪞</span>
      <span className={styles.label}>Closet</span>
    </NavLink>
  </nav>
);

export default BottomNav;
```

- [ ] **Step 7: Create `src/components/BottomNav/BottomNav.module.css`**

```css
.nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--nav-height);
  background: var(--surface);
  border-top: 1px solid var(--border);
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
  color: var(--text-secondary);
  transition: color 0.2s;
  flex: 1;
}

.tab.active,
.tab:global(.active) {
  color: var(--navy);
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

- [ ] **Step 8: Rewrite `src/App.tsx`**

```tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './msalConfig';
import BottomNav from './components/BottomNav/BottomNav';
import HomePage from './pages/HomePage';
import DressCodePage from './pages/DressCodePage';
import CalendarPage from './pages/CalendarPage';
import ClosetPage from './pages/ClosetPage';
import styles from './App.module.css';

const App: React.FC = () => (
  <MsalProvider instance={msalInstance}>
    <BrowserRouter>
      <div className={styles.app}>
        <main className={styles.main}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dress-codes/:id" element={<DressCodePage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/closet" element={<ClosetPage />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  </MsalProvider>
);

export default App;
```

- [ ] **Step 9: Create `src/App.module.css`**

```css
.app {
  max-width: 480px;
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

- [ ] **Step 10: Create stub pages** (so routing compiles)

Create `src/pages/HomePage.tsx`:
```tsx
import React from 'react';
const HomePage: React.FC = () => <div>Home</div>;
export default HomePage;
```

Create `src/pages/DressCodePage.tsx`:
```tsx
import React from 'react';
const DressCodePage: React.FC = () => <div>Dress Code Detail</div>;
export default DressCodePage;
```

Create `src/pages/CalendarPage.tsx`:
```tsx
import React from 'react';
const CalendarPage: React.FC = () => <div>Calendar</div>;
export default CalendarPage;
```

Create `src/pages/ClosetPage.tsx`:
```tsx
import React from 'react';
const ClosetPage: React.FC = () => <div>Closet</div>;
export default ClosetPage;
```

- [ ] **Step 11: Run tests**

```bash
npm test -- --watchAll=false --testPathPattern=BottomNav.test
```

Expected: PASS.

- [ ] **Step 12: Verify app compiles**

```bash
npm run build 2>&1 | tail -5
```

Expected: `Compiled successfully.`

- [ ] **Step 13: Commit**

```bash
git add src/
git commit -m "feat: app shell with routing, theme, and bottom navigation"
```

---

## Task 4: SearchBar Component & useSearch Hook

**Files:**
- Create: `src/hooks/useSearch.ts`
- Create: `src/hooks/useSearch.test.ts`
- Create: `src/components/SearchBar/SearchBar.tsx`
- Create: `src/components/SearchBar/SearchBar.module.css`

- [ ] **Step 1: Write failing tests for useSearch**

Create `src/hooks/useSearch.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react';
import { useSearch } from './useSearch';
import { dressCodes } from '../data/dressCodes';

describe('useSearch', () => {
  it('returns all dress codes when query is empty', () => {
    const { result } = renderHook(() => useSearch(dressCodes, ''));
    expect(result.current).toHaveLength(12);
  });

  it('filters by dress code name', () => {
    const { result } = renderHook(() => useSearch(dressCodes, 'black tie'));
    expect(result.current.length).toBeGreaterThanOrEqual(1);
    expect(result.current.some((d) => d.id === 'black-tie')).toBe(true);
  });

  it('filters by occasion keyword', () => {
    const { result } = renderHook(() => useSearch(dressCodes, 'gala'));
    expect(result.current.length).toBeGreaterThanOrEqual(1);
  });

  it('filters by shoe colour', () => {
    const { result } = renderHook(() => useSearch(dressCodes, 'patent leather'));
    expect(result.current.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty array when no match', () => {
    const { result } = renderHook(() => useSearch(dressCodes, 'xyznotaword'));
    expect(result.current).toHaveLength(0);
  });

  it('is case-insensitive', () => {
    const { result } = renderHook(() => useSearch(dressCodes, 'CASUAL'));
    expect(result.current.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- --watchAll=false --testPathPattern=useSearch.test
```

Expected: FAIL — cannot find module.

- [ ] **Step 3: Create `src/hooks/useSearch.ts`**

```ts
import { useMemo } from 'react';
import { DressCode } from '../types';

const getSearchableText = (d: DressCode): string => [
  d.name,
  d.description,
  ...d.occasions,
  ...d.keywords,
  d.men.jacket, d.men.top, d.men.bottom,
  ...d.men.accessories,
  d.men.shoeType, d.men.shoeColour,
  d.women.jacket, d.women.top, d.women.bottom,
  ...d.women.accessories,
  d.women.shoeType, d.women.shoeColour,
].join(' ').toLowerCase();

export const useSearch = (dressCodes: DressCode[], query: string): DressCode[] =>
  useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dressCodes;
    return dressCodes.filter((d) => getSearchableText(d).includes(q));
  }, [dressCodes, query]);
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test -- --watchAll=false --testPathPattern=useSearch.test
```

Expected: PASS — 6 tests pass.

- [ ] **Step 5: Create `src/components/SearchBar/SearchBar.tsx`**

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { dressCodes } from '../../data/dressCodes';
import { useSearch } from '../../hooks/useSearch';
import styles from './SearchBar.module.css';

interface Props {
  query: string;
  onChange: (q: string) => void;
}

const SearchBar: React.FC<Props> = ({ query, onChange }) => {
  const results = useSearch(dressCodes, query);
  const navigate = useNavigate();
  const showDropdown = query.trim().length > 0;

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputRow}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          className={styles.input}
          type="search"
          placeholder="Search dress codes, occasions, shoe colour…"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Search dress codes"
        />
        {query && (
          <button className={styles.clear} onClick={() => onChange('')} aria-label="Clear search">✕</button>
        )}
      </div>
      {showDropdown && (
        <ul className={styles.dropdown} role="listbox">
          {results.length === 0 && (
            <li className={styles.noResults}>No dress codes found</li>
          )}
          {results.map((d) => (
            <li
              key={d.id}
              className={styles.result}
              role="option"
              onClick={() => { onChange(''); navigate(`/dress-codes/${d.id}`); }}
            >
              <span className={styles.resultIcon}>{d.icon}</span>
              <div>
                <div className={styles.resultName}>{d.name}</div>
                <div className={styles.resultSub}>{d.formalityLabel}</div>
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

- [ ] **Step 6: Create `src/components/SearchBar/SearchBar.module.css`**

```css
.wrapper {
  position: relative;
  z-index: 200;
}

.inputRow {
  display: flex;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0 12px;
  gap: 8px;
}

.searchIcon {
  font-size: 16px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  padding: 12px 0;
  background: transparent;
  color: var(--text-primary);
}

.input::placeholder {
  color: var(--text-secondary);
}

.clear {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  padding: 4px;
}

.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  list-style: none;
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
  background: var(--bg);
}

.resultIcon {
  font-size: 22px;
  flex-shrink: 0;
}

.resultName {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.resultSub {
  font-size: 12px;
  color: var(--text-secondary);
}

.noResults {
  padding: 16px;
  color: var(--text-secondary);
  font-size: 14px;
  text-align: center;
}
```

- [ ] **Step 7: Commit**

```bash
git add src/hooks/ src/components/SearchBar/
git commit -m "feat: useSearch hook and SearchBar component with dropdown"
```

---

## Task 5: DressCodeCard Component

**Files:**
- Create: `src/components/DressCodeCard/DressCodeCard.tsx`
- Create: `src/components/DressCodeCard/DressCodeCard.module.css`
- Test: `src/components/DressCodeCard/DressCodeCard.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/components/DressCodeCard/DressCodeCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DressCodeCard from './DressCodeCard';
import { dressCodes } from '../../data/dressCodes';

const loungeSuit = dressCodes.find((d) => d.id === 'lounge-suit')!;

test('renders dress code name and icon', () => {
  render(
    <MemoryRouter>
      <DressCodeCard dressCode={loungeSuit} />
    </MemoryRouter>
  );
  expect(screen.getByText('Lounge Suit')).toBeInTheDocument();
  expect(screen.getByText('💼')).toBeInTheDocument();
});

test('renders formality label', () => {
  render(
    <MemoryRouter>
      <DressCodeCard dressCode={loungeSuit} />
    </MemoryRouter>
  );
  expect(screen.getByText('Semi-Formal')).toBeInTheDocument();
});

test('links to the dress code detail page', () => {
  render(
    <MemoryRouter>
      <DressCodeCard dressCode={loungeSuit} />
    </MemoryRouter>
  );
  const link = screen.getByRole('link');
  expect(link).toHaveAttribute('href', '/dress-codes/lounge-suit');
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- --watchAll=false --testPathPattern=DressCodeCard.test
```

Expected: FAIL.

- [ ] **Step 3: Create `src/components/DressCodeCard/DressCodeCard.tsx`**

```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { DressCode } from '../../types';
import styles from './DressCodeCard.module.css';

interface Props {
  dressCode: DressCode;
}

const formalityDots = (level: number) =>
  Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < level ? styles.dotFilled : styles.dotEmpty} />
  ));

const DressCodeCard: React.FC<Props> = ({ dressCode }) => (
  <Link to={`/dress-codes/${dressCode.id}`} className={styles.card}>
    <div className={styles.iconWrapper}>
      <span className={styles.icon}>{dressCode.icon}</span>
    </div>
    <div className={styles.body}>
      <h3 className={styles.name}>{dressCode.name}</h3>
      <p className={styles.label}>{dressCode.formalityLabel}</p>
      <div className={styles.dots}>{formalityDots(dressCode.formality)}</div>
      <p className={styles.occasion}>{dressCode.occasions[0]}</p>
    </div>
  </Link>
);

export default DressCodeCard;
```

- [ ] **Step 4: Create `src/components/DressCodeCard/DressCodeCard.module.css`**

```css
.card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  transition: box-shadow 0.2s, transform 0.15s;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow);
  transform: translateY(-1px);
}

.iconWrapper {
  width: 48px;
  height: 48px;
  background: var(--bg);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon {
  font-size: 24px;
}

.body {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 16px;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 2px;
}

.label {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.dots {
  display: flex;
  gap: 3px;
  margin-bottom: 6px;
}

.dotFilled {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--navy);
}

.dotEmpty {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border);
}

.occasion {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

- [ ] **Step 5: Run tests**

```bash
npm test -- --watchAll=false --testPathPattern=DressCodeCard.test
```

Expected: PASS — 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/DressCodeCard/
git commit -m "feat: DressCodeCard component with formality indicator"
```

---

## Task 6: HomePage

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Create: `src/pages/HomePage.module.css`
- Test: `src/pages/HomePage.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/pages/HomePage.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';

test('renders page title', () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>);
  expect(screen.getByText(/EU Dress Code Guide/i)).toBeInTheDocument();
});

test('renders all 12 dress code cards', () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>);
  expect(screen.getByText('White Tie')).toBeInTheDocument();
  expect(screen.getByText('Casual')).toBeInTheDocument();
});

test('search filters visible cards', () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>);
  const input = screen.getByPlaceholderText(/Search dress codes/i);
  fireEvent.change(input, { target: { value: 'white tie' } });
  // dropdown shows results; the grid itself is unaffected (search navigates via dropdown)
  expect(input).toHaveValue('white tie');
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- --watchAll=false --testPathPattern=HomePage.test
```

Expected: FAIL.

- [ ] **Step 3: Replace `src/pages/HomePage.tsx`**

```tsx
import React, { useState } from 'react';
import SearchBar from '../components/SearchBar/SearchBar';
import DressCodeCard from '../components/DressCodeCard/DressCodeCard';
import { dressCodes } from '../data/dressCodes';
import styles from './HomePage.module.css';

const HomePage: React.FC = () => {
  const [query, setQuery] = useState('');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>EU Dress Code Guide</h1>
        <p className={styles.subtitle}>Know exactly what to wear, every time</p>
        <div className={styles.searchWrapper}>
          <SearchBar query={query} onChange={setQuery} />
        </div>
      </header>
      <section className={styles.grid}>
        {dressCodes.map((dc) => (
          <DressCodeCard key={dc.id} dressCode={dc} />
        ))}
      </section>
    </div>
  );
};

export default HomePage;
```

- [ ] **Step 4: Create `src/pages/HomePage.module.css`**

```css
.page {
  min-height: 100vh;
}

.header {
  background: var(--navy);
  color: #fff;
  padding: 24px 16px 20px;
}

.title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.3px;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 14px;
  opacity: 0.75;
  margin-bottom: 16px;
}

.searchWrapper {
  /* ensure SearchBar dropdown overlaps header correctly */
}

.grid {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
```

- [ ] **Step 5: Run tests**

```bash
npm test -- --watchAll=false --testPathPattern=HomePage.test
```

Expected: PASS — 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.module.css src/pages/HomePage.test.tsx
git commit -m "feat: HomePage with dress code grid and search bar"
```

---

## Task 7: DressCodeDetail Component & DressCodePage

**Files:**
- Create: `src/components/DressCodeDetail/DressCodeDetail.tsx`
- Create: `src/components/DressCodeDetail/DressCodeDetail.module.css`
- Modify: `src/pages/DressCodePage.tsx`
- Create: `src/pages/DressCodePage.module.css`
- Test: `src/components/DressCodeDetail/DressCodeDetail.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/components/DressCodeDetail/DressCodeDetail.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DressCodeDetail from './DressCodeDetail';
import { dressCodes } from '../../data/dressCodes';

const blackTie = dressCodes.find((d) => d.id === 'black-tie')!;

test('renders dress code name', () => {
  render(<MemoryRouter><DressCodeDetail dressCode={blackTie} /></MemoryRouter>);
  expect(screen.getByText('Black Tie')).toBeInTheDocument();
});

test('renders Men tab by default', () => {
  render(<MemoryRouter><DressCodeDetail dressCode={blackTie} /></MemoryRouter>);
  expect(screen.getByRole('tab', { name: /men/i })).toHaveAttribute('aria-selected', 'true');
});

test('switches to Women tab on click', () => {
  render(<MemoryRouter><DressCodeDetail dressCode={blackTie} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('tab', { name: /women/i }));
  expect(screen.getByRole('tab', { name: /women/i })).toHaveAttribute('aria-selected', 'true');
});

test('shows shoe colour', () => {
  render(<MemoryRouter><DressCodeDetail dressCode={blackTie} /></MemoryRouter>);
  expect(screen.getByText(/Black patent leather/i)).toBeInTheDocument();
});

test('shows dos and donts', () => {
  render(<MemoryRouter><DressCodeDetail dressCode={blackTie} /></MemoryRouter>);
  expect(screen.getByText(/Wear a proper bow tie/i)).toBeInTheDocument();
  expect(screen.getByText(/Never wear a long necktie/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- --watchAll=false --testPathPattern=DressCodeDetail.test
```

Expected: FAIL.

- [ ] **Step 3: Create `src/components/DressCodeDetail/DressCodeDetail.tsx`**

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DressCode, OutfitDetail } from '../../types';
import styles from './DressCodeDetail.module.css';

interface Props {
  dressCode: DressCode;
}

const OutfitView: React.FC<{ outfit: OutfitDetail; gender: 'men' | 'women' }> = ({ outfit, gender }) => (
  <div className={styles.outfit}>
    <div className={styles.photoWrapper}>
      <img
        src={outfit.photo}
        alt={`${gender === 'men' ? 'Man' : 'Woman'} wearing the dress code`}
        className={styles.photo}
        loading="lazy"
      />
    </div>
    <div className={styles.details}>
      <h3 className={styles.sectionTitle}>Outfit Breakdown</h3>
      <ul className={styles.outfitList}>
        <li><span className={styles.fieldLabel}>Jacket / Outerwear</span><span>{outfit.jacket}</span></li>
        <li><span className={styles.fieldLabel}>Top / Shirt</span><span>{outfit.top}</span></li>
        <li><span className={styles.fieldLabel}>Bottom</span><span>{outfit.bottom}</span></li>
        <li>
          <span className={styles.fieldLabel}>Accessories</span>
          <span>{outfit.accessories.join(', ')}</span>
        </li>
        <li><span className={styles.fieldLabel}>Shoe Type</span><span>{outfit.shoeType}</span></li>
        <li className={styles.shoeColour}>
          <span className={styles.fieldLabel}>👟 Shoe Colour</span>
          <span className={styles.shoeColourValue}>{outfit.shoeColour}</span>
        </li>
      </ul>

      <h3 className={styles.sectionTitle}>Do's &amp; Don'ts</h3>
      <ul className={styles.doList}>
        {outfit.dos.map((item, i) => (
          <li key={i} className={styles.doItem}>✅ {item}</li>
        ))}
      </ul>
      <ul className={styles.dontList}>
        {outfit.donts.map((item, i) => (
          <li key={i} className={styles.dontItem}>❌ {item}</li>
        ))}
      </ul>
    </div>
  </div>
);

const DressCodeDetail: React.FC<Props> = ({ dressCode }) => {
  const [tab, setTab] = useState<'men' | 'women'>('men');
  const navigate = useNavigate();

  return (
    <div className={styles.wrapper}>
      <button className={styles.back} onClick={() => navigate(-1)}>← Back</button>

      <div className={styles.header}>
        <span className={styles.headerIcon}>{dressCode.icon}</span>
        <div>
          <h1 className={styles.name}>{dressCode.name}</h1>
          <span className={styles.formalityBadge}>{dressCode.formalityLabel}</span>
        </div>
      </div>

      <p className={styles.description}>{dressCode.description}</p>

      <div className={styles.occasions}>
        {dressCode.occasions.map((occ) => (
          <span key={occ} className={styles.occasionTag}>{occ}</span>
        ))}
      </div>

      <div className={styles.tabs} role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'men'}
          className={tab === 'men' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setTab('men')}
        >
          👔 Men
        </button>
        <button
          role="tab"
          aria-selected={tab === 'women'}
          className={tab === 'women' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setTab('women')}
        >
          👗 Women
        </button>
      </div>

      <OutfitView outfit={tab === 'men' ? dressCode.men : dressCode.women} gender={tab} />
    </div>
  );
};

export default DressCodeDetail;
```

- [ ] **Step 4: Create `src/components/DressCodeDetail/DressCodeDetail.module.css`**

```css
.wrapper {
  padding-bottom: 24px;
}

.back {
  background: none;
  border: none;
  color: var(--navy);
  font-size: 15px;
  font-weight: 600;
  padding: 16px;
  cursor: pointer;
  display: block;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px 16px;
}

.headerIcon {
  font-size: 48px;
}

.name {
  font-size: 26px;
  font-weight: 800;
  color: var(--navy);
}

.formalityBadge {
  background: var(--navy);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.description {
  padding: 0 16px 12px;
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.occasions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 16px 16px;
}

.occasionTag {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 12px;
  padding: 4px 12px;
  color: var(--text-secondary);
}

.tabs {
  display: flex;
  border-bottom: 2px solid var(--border);
  margin: 0 16px;
}

.tab {
  flex: 1;
  padding: 12px;
  background: none;
  border: none;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}

.tabActive {
  color: var(--navy);
  border-bottom-color: var(--navy);
}

.outfit {
  padding: 16px;
}

.photoWrapper {
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: 20px;
  max-height: 480px;
}

.photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
  display: block;
}

.details {}

.sectionTitle {
  font-size: 14px;
  font-weight: 700;
  color: var(--navy);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  margin-top: 20px;
}

.outfitList {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.outfitList li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  color: var(--text-primary);
}

.fieldLabel {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.shoeColour {
  background: var(--bg);
  border-radius: 8px;
  padding: 10px 12px !important;
  border: none !important;
}

.shoeColourValue {
  font-weight: 700;
  color: var(--navy);
  font-size: 15px;
}

.doList, .dontList {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.doItem, .dontItem {
  font-size: 14px;
  line-height: 1.4;
  padding: 8px 12px;
  border-radius: 8px;
}

.doItem {
  background: #f0fff4;
  color: #1a6b30;
}

.dontItem {
  background: #fff5f5;
  color: #8b1a1a;
}
```

- [ ] **Step 5: Replace `src/pages/DressCodePage.tsx`**

```tsx
import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { getDressCodeById } from '../data/dressCodes';
import DressCodeDetail from '../components/DressCodeDetail/DressCodeDetail';

const DressCodePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dressCode = getDressCodeById(id || '');

  if (!dressCode) return <Navigate to="/" replace />;

  return <DressCodeDetail dressCode={dressCode} />;
};

export default DressCodePage;
```

- [ ] **Step 6: Run tests**

```bash
npm test -- --watchAll=false --testPathPattern=DressCodeDetail.test
```

Expected: PASS — 5 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/DressCodeDetail/ src/pages/DressCodePage.tsx
git commit -m "feat: dress code detail page with Men/Women tabs and full outfit breakdown"
```

---

## Task 8: Calendar — useMsal Hook, CalendarView & CalendarPage

**Files:**
- Create: `src/hooks/useMsal.ts`
- Create: `src/hooks/useMsal.test.ts`
- Create: `src/components/CalendarView/CalendarView.tsx`
- Create: `src/components/CalendarView/CalendarView.module.css`
- Modify: `src/pages/CalendarPage.tsx`
- Create: `src/pages/CalendarPage.module.css`

- [ ] **Step 1: Write failing tests for useMsal utilities**

Create `src/hooks/useMsal.test.ts`:

```ts
import { detectDressCode } from './useMsal';

describe('detectDressCode', () => {
  it('detects black tie from "gala"', () => {
    expect(detectDressCode('Annual Gala Dinner', '')).toBe('black-tie');
  });

  it('detects business formal from "board meeting"', () => {
    expect(detectDressCode('Board Meeting Q2', '')).toBe('business-formal');
  });

  it('detects lounge suit from "wedding"', () => {
    expect(detectDressCode('Sarah and James Wedding', '')).toBe('lounge-suit');
  });

  it('detects resort casual from "garden party"', () => {
    expect(detectDressCode('Summer Garden Party', '')).toBe('resort-casual');
  });

  it('returns undefined for unknown events', () => {
    expect(detectDressCode('Random Team Sync', '')).toBeUndefined();
  });

  it('checks body preview when title has no match', () => {
    expect(detectDressCode('Friday Event', 'black tie required')).toBe('black-tie');
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- --watchAll=false --testPathPattern=useMsal.test
```

Expected: FAIL.

- [ ] **Step 3: Create `src/hooks/useMsal.ts`**

```ts
import { useState, useCallback } from 'react';
import { useMsal as useMsalLib } from '@azure/msal-react';
import { loginRequest } from '../msalConfig';
import { CalendarEvent } from '../types';

const KEYWORD_MAP: Array<{ patterns: string[]; dressCodeId: string }> = [
  { patterns: ['white tie'], dressCodeId: 'white-tie' },
  { patterns: ['black tie optional'], dressCodeId: 'black-tie-optional' },
  { patterns: ['black tie', 'gala', 'formal dinner', 'award ceremony', 'award dinner'], dressCodeId: 'black-tie' },
  { patterns: ['morning dress', 'ascot'], dressCodeId: 'morning-dress' },
  { patterns: ['creative black tie'], dressCodeId: 'creative-black-tie' },
  { patterns: ['cocktail', 'evening reception'], dressCodeId: 'cocktail' },
  { patterns: ['lounge suit', 'wedding', 'conference', 'summit'], dressCodeId: 'lounge-suit' },
  { patterns: ['board meeting', 'board of directors', 'formal meeting', 'interview'], dressCodeId: 'business-formal' },
  { patterns: ['client meeting', 'client lunch', 'client visit', 'office', 'team meeting'], dressCodeId: 'business-casual' },
  { patterns: ['garden party', 'outdoor', 'barbecue', 'bbq', 'yacht', 'boat'], dressCodeId: 'resort-casual' },
];

export const detectDressCode = (title: string, body: string): string | undefined => {
  const text = `${title} ${body}`.toLowerCase();
  for (const entry of KEYWORD_MAP) {
    if (entry.patterns.some((p) => text.includes(p))) {
      return entry.dressCodeId;
    }
  }
  return undefined;
};

export const useMsal = () => {
  const { instance, accounts } = useMsalLib();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignedIn = accounts.length > 0;
  const userName = accounts[0]?.name ?? '';
  const userEmail = accounts[0]?.username ?? '';

  const signIn = useCallback(async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (e: any) {
      setError(e.message ?? 'Sign in failed');
    }
  }, [instance]);

  const signOut = useCallback(() => {
    instance.logoutPopup();
  }, [instance]);

  const fetchEvents = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const account = accounts[0];
      const token = await instance.acquireTokenSilent({ ...loginRequest, account });
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + 7);

      const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${now.toISOString()}&endDateTime=${end.toISOString()}&$orderby=start/dateTime&$top=20`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token.accessToken}` },
      });

      if (!res.ok) throw new Error('Failed to fetch calendar events');

      const data = await res.json();
      const mapped: CalendarEvent[] = (data.value ?? []).map((e: any) => ({
        id: e.id,
        subject: e.subject,
        start: e.start,
        end: e.end,
        bodyPreview: e.bodyPreview,
        detectedDressCodeId: detectDressCode(e.subject ?? '', e.bodyPreview ?? ''),
      }));
      setEvents(mapped);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [instance, accounts, isSignedIn]);

  return { isSignedIn, userName, userEmail, events, loading, error, signIn, signOut, fetchEvents };
};
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --watchAll=false --testPathPattern=useMsal.test
```

Expected: PASS — 6 tests pass.

- [ ] **Step 5: Create `src/components/CalendarView/CalendarView.tsx`**

```tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarEvent } from '../../types';
import { getDressCodeById } from '../../data/dressCodes';
import styles from './CalendarView.module.css';

interface Props {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const CalendarView: React.FC<Props> = ({ events, loading, error, onRefresh }) => {
  const navigate = useNavigate();

  useEffect(() => { onRefresh(); }, [onRefresh]);

  if (loading) return <div className={styles.state}>Loading calendar…</div>;
  if (error) return <div className={styles.stateError}>{error} <button onClick={onRefresh}>Retry</button></div>;
  if (events.length === 0) return <div className={styles.state}>No events in the next 7 days.</div>;

  return (
    <ul className={styles.list}>
      {events.map((event) => {
        const dc = event.detectedDressCodeId ? getDressCodeById(event.detectedDressCodeId) : null;
        return (
          <li
            key={event.id}
            className={styles.item}
            onClick={() => dc && navigate(`/dress-codes/${dc.id}`)}
          >
            <div className={styles.eventHeader}>
              <div>
                <p className={styles.subject}>{event.subject}</p>
                <p className={styles.time}>{formatDate(event.start.dateTime)}</p>
              </div>
              {dc ? (
                <span className={styles.badge}>{dc.icon} {dc.name}</span>
              ) : (
                <span className={styles.badgeUnknown}>Unknown</span>
              )}
            </div>
            {event.bodyPreview && (
              <p className={styles.preview}>{event.bodyPreview.slice(0, 80)}…</p>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default CalendarView;
```

- [ ] **Step 6: Create `src/components/CalendarView/CalendarView.module.css`**

```css
.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.item:hover {
  box-shadow: var(--shadow);
}

.eventHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.subject {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.time {
  font-size: 12px;
  color: var(--text-secondary);
}

.badge {
  background: var(--navy);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 16px;
  white-space: nowrap;
  flex-shrink: 0;
}

.badgeUnknown {
  background: var(--border);
  color: var(--text-secondary);
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 16px;
  white-space: nowrap;
  flex-shrink: 0;
}

.preview {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.state {
  padding: 40px 16px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 15px;
}

.stateError {
  padding: 40px 16px;
  text-align: center;
  color: var(--danger);
  font-size: 15px;
}
```

- [ ] **Step 7: Replace `src/pages/CalendarPage.tsx`**

```tsx
import React from 'react';
import { useMsal } from '../hooks/useMsal';
import CalendarView from '../components/CalendarView/CalendarView';
import styles from './CalendarPage.module.css';

const CalendarPage: React.FC = () => {
  const { isSignedIn, userName, userEmail, events, loading, error, signIn, signOut, fetchEvents } = useMsal();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>📅 Calendar</h1>
        {isSignedIn ? (
          <div className={styles.user}>
            <div>
              <p className={styles.userName}>{userName}</p>
              <p className={styles.userEmail}>{userEmail}</p>
            </div>
            <button className={styles.signOutBtn} onClick={signOut}>Sign out</button>
          </div>
        ) : (
          <div className={styles.signInSection}>
            <p className={styles.signInText}>Connect your Outlook calendar to see dress codes for upcoming events.</p>
            <button className={styles.signInBtn} onClick={signIn}>
              <span>Sign in with Microsoft</span>
            </button>
          </div>
        )}
      </header>
      {isSignedIn && (
        <CalendarView events={events} loading={loading} error={error} onRefresh={fetchEvents} />
      )}
    </div>
  );
};

export default CalendarPage;
```

- [ ] **Step 8: Create `src/pages/CalendarPage.module.css`**

```css
.page {
  min-height: 100vh;
}

.header {
  background: var(--navy);
  color: #fff;
  padding: 24px 16px 20px;
}

.title {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 16px;
}

.signInSection {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.signInText {
  font-size: 14px;
  opacity: 0.85;
  line-height: 1.5;
}

.signInBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: #fff;
  color: var(--navy);
  border: none;
  border-radius: var(--radius);
  padding: 12px 20px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
}

.user {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.userName {
  font-size: 15px;
  font-weight: 600;
}

.userEmail {
  font-size: 12px;
  opacity: 0.75;
}

.signOutBtn {
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.3);
  color: #fff;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
}
```

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useMsal.ts src/hooks/useMsal.test.ts src/components/CalendarView/ src/pages/CalendarPage.tsx src/pages/CalendarPage.module.css
git commit -m "feat: Outlook calendar integration with dress code auto-detection"
```

---

## Task 9: Closet Check Component & ClosetPage

**Files:**
- Create: `src/components/ClosetCheck/ClosetCheck.tsx`
- Create: `src/components/ClosetCheck/ClosetCheck.module.css`
- Modify: `src/pages/ClosetPage.tsx`
- Create: `src/pages/ClosetPage.module.css`
- Test: `src/components/ClosetCheck/ClosetCheck.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/components/ClosetCheck/ClosetCheck.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClosetCheck from './ClosetCheck';

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      found: ['dark suit jacket', 'white dress shirt'],
      missing: ['dress trousers', 'Oxford shoes'],
      suggestions: ['Buy charcoal dress trousers', 'Buy black Oxford shoes'],
    }),
  }) as any;
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders dress code selector', () => {
  render(<MemoryRouter><ClosetCheck /></MemoryRouter>);
  expect(screen.getByLabelText(/target dress code/i)).toBeInTheDocument();
});

test('renders upload button', () => {
  render(<MemoryRouter><ClosetCheck /></MemoryRouter>);
  expect(screen.getByText(/upload closet photo/i)).toBeInTheDocument();
});

test('analyse button is disabled when no photo uploaded', () => {
  render(<MemoryRouter><ClosetCheck /></MemoryRouter>);
  expect(screen.getByRole('button', { name: /analyse my closet/i })).toBeDisabled();
});

test('shows results after successful analysis', async () => {
  render(<MemoryRouter><ClosetCheck initialDressCodeId="lounge-suit" /></MemoryRouter>);

  const file = new File(['fake'], 'closet.jpg', { type: 'image/jpeg' });
  const input = screen.getByTestId('photo-input');
  fireEvent.change(input, { target: { files: [file] } });

  fireEvent.click(screen.getByRole('button', { name: /analyse my closet/i }));

  await waitFor(() => {
    expect(screen.getByText(/dark suit jacket/i)).toBeInTheDocument();
    expect(screen.getByText(/dress trousers/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- --watchAll=false --testPathPattern=ClosetCheck.test
```

Expected: FAIL.

- [ ] **Step 3: Create `src/components/ClosetCheck/ClosetCheck.tsx`**

```tsx
import React, { useState, useRef } from 'react';
import { dressCodes } from '../../data/dressCodes';
import { ClosetResult } from '../../types';
import styles from './ClosetCheck.module.css';

interface Props {
  initialDressCodeId?: string;
}

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const ClosetCheck: React.FC<Props> = ({ initialDressCodeId }) => {
  const [dressCodeId, setDressCodeId] = useState(initialDressCodeId || 'lounge-suit');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ClosetResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setResult(null);
    setError(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleAnalyse = async () => {
    if (!photo) return;
    setLoading(true);
    setError(null);
    try {
      const imageBase64 = await toBase64(photo);
      const res = await fetch('/api/analyze-closet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, dressCodeId }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data: ClosetResult = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.field}>
        <label htmlFor="dressCodeSelect" className={styles.label}>Target Dress Code</label>
        <select
          id="dressCodeSelect"
          aria-label="Target dress code"
          className={styles.select}
          value={dressCodeId}
          onChange={(e) => setDressCodeId(e.target.value)}
        >
          {dressCodes.map((dc) => (
            <option key={dc.id} value={dc.id}>{dc.icon} {dc.name}</option>
          ))}
        </select>
      </div>

      <div className={styles.photoSection}>
        {preview ? (
          <div className={styles.previewWrapper}>
            <img src={preview} alt="Closet preview" className={styles.preview} />
            <button className={styles.changeBtn} onClick={() => { setPhoto(null); setPreview(null); setResult(null); }}>
              Change Photo
            </button>
          </div>
        ) : (
          <button className={styles.uploadBtn} onClick={() => inputRef.current?.click()}>
            <span className={styles.uploadIcon}>📷</span>
            <span>Upload Closet Photo</span>
          </button>
        )}
        <input
          data-testid="photo-input"
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className={styles.hiddenInput}
        />
      </div>

      <button
        className={styles.analyseBtn}
        onClick={handleAnalyse}
        disabled={!photo || loading}
      >
        {loading ? 'Analysing…' : '🔍 Analyse My Closet'}
      </button>

      {error && <p className={styles.error}>{error}</p>}

      {result && (
        <div className={styles.results}>
          {result.found.length > 0 && (
            <div className={styles.resultSection}>
              <h3 className={styles.resultTitle}>✅ You Have</h3>
              <ul className={styles.resultList}>
                {result.found.map((item, i) => (
                  <li key={i} className={styles.foundItem}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {result.missing.length > 0 && (
            <div className={styles.resultSection}>
              <h3 className={styles.resultTitle}>❌ Missing</h3>
              <ul className={styles.resultList}>
                {result.missing.map((item, i) => (
                  <li key={i} className={styles.missingItem}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {result.suggestions.length > 0 && (
            <div className={styles.resultSection}>
              <h3 className={styles.resultTitle}>🛍️ Suggested Purchases</h3>
              <ul className={styles.resultList}>
                {result.suggestions.map((item, i) => (
                  <li key={i} className={styles.suggestionItem}>
                    {item}
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(item + ' buy')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.shopLink}
                    >
                      Search →
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClosetCheck;
```

- [ ] **Step 4: Create `src/components/ClosetCheck/ClosetCheck.module.css`**

```css
.wrapper {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.select {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
  font-size: 15px;
  background: var(--surface);
  color: var(--text-primary);
  outline: none;
  appearance: none;
  cursor: pointer;
}

.photoSection {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.uploadBtn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: var(--surface);
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 36px;
  cursor: pointer;
  font-size: 15px;
  color: var(--text-secondary);
  width: 100%;
  transition: border-color 0.2s;
}

.uploadBtn:hover {
  border-color: var(--navy);
  color: var(--navy);
}

.uploadIcon {
  font-size: 36px;
}

.hiddenInput {
  display: none;
}

.previewWrapper {
  position: relative;
  border-radius: var(--radius);
  overflow: hidden;
}

.preview {
  width: 100%;
  max-height: 300px;
  object-fit: cover;
  display: block;
  border-radius: var(--radius);
}

.changeBtn {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
}

.analyseBtn {
  background: var(--navy);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  padding: 16px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
  transition: opacity 0.2s;
}

.analyseBtn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.error {
  color: var(--danger);
  font-size: 14px;
  padding: 12px;
  background: #fff5f5;
  border-radius: 8px;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.resultSection {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
}

.resultTitle {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 12px;
  color: var(--navy);
}

.resultList {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.foundItem {
  font-size: 14px;
  padding: 8px 12px;
  background: #f0fff4;
  color: #1a6b30;
  border-radius: 8px;
}

.missingItem {
  font-size: 14px;
  padding: 8px 12px;
  background: #fff5f5;
  color: #8b1a1a;
  border-radius: 8px;
}

.suggestionItem {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  padding: 8px 12px;
  background: #fffbf0;
  color: #7a5c00;
  border-radius: 8px;
  gap: 12px;
}

.shopLink {
  font-size: 13px;
  font-weight: 700;
  color: var(--navy);
  white-space: nowrap;
  flex-shrink: 0;
}
```

- [ ] **Step 5: Replace `src/pages/ClosetPage.tsx`**

```tsx
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ClosetCheck from '../components/ClosetCheck/ClosetCheck';
import styles from './ClosetPage.module.css';

const ClosetPage: React.FC = () => {
  const [params] = useSearchParams();
  const initialDressCodeId = params.get('dressCodeId') || undefined;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>🪞 Closet Check</h1>
        <p className={styles.subtitle}>Upload a photo of your wardrobe and AI will tell you what you have — and what to buy.</p>
      </header>
      <ClosetCheck initialDressCodeId={initialDressCodeId} />
    </div>
  );
};

export default ClosetPage;
```

- [ ] **Step 6: Create `src/pages/ClosetPage.module.css`**

```css
.page {
  min-height: 100vh;
}

.header {
  background: var(--navy);
  color: #fff;
  padding: 24px 16px 20px;
}

.title {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 6px;
}

.subtitle {
  font-size: 14px;
  opacity: 0.8;
  line-height: 1.5;
}
```

- [ ] **Step 7: Run tests**

```bash
npm test -- --watchAll=false --testPathPattern=ClosetCheck.test
```

Expected: PASS — 4 tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/ClosetCheck/ src/pages/ClosetPage.tsx src/pages/ClosetPage.module.css
git commit -m "feat: closet check with AI vision photo analysis and results"
```

---

## Task 10: Serverless Function — `/api/analyze-closet.ts`

**Files:**
- Create: `api/analyze-closet.ts`

- [ ] **Step 1: Create `api/analyze-closet.ts`**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

const DRESS_CODE_ITEMS: Record<string, string[]> = {
  'white-tie': ['black tailcoat', 'white waistcoat', 'white dress shirt', 'black dress trousers with silk braid', 'patent leather Oxford shoes'],
  'black-tie': ['tuxedo jacket', 'white dress shirt', 'black trousers with silk braid', 'black bow tie', 'black patent leather dress shoes'],
  'black-tie-optional': ['dark suit jacket', 'white dress shirt', 'matching trousers', 'Oxford dress shoes'],
  'morning-dress': ['morning coat or tailcoat', 'waistcoat', 'striped morning trousers', 'cravat or formal tie', 'Oxford shoes'],
  'creative-black-tie': ['tuxedo or statement dinner jacket', 'dress shirt', 'formal trousers', 'statement accessories', 'dress shoes'],
  'cocktail': ['dark suit jacket', 'white dress shirt', 'matching suit trousers', 'tie', 'Oxford shoes'],
  'lounge-suit': ['suit jacket', 'dress shirt', 'matching suit trousers', 'belt', 'Oxford or Derby shoes'],
  'business-formal': ['dark conservative suit jacket', 'white dress shirt', 'matching trousers', 'conservative tie', 'black Oxford shoes'],
  'business-casual': ['blazer or smart jacket', 'polo or button-down shirt', 'chinos or smart trousers', 'smart brogue or loafer'],
  'smart-casual': ['blazer', 'quality shirt or t-shirt', 'dark jeans or chinos', 'smart trainer or Chelsea boot'],
  'resort-casual': ['linen shirt or casual shirt', 'linen or cotton trousers', 'loafers or leather sandals'],
  'casual': ['t-shirt or casual shirt', 'jeans or casual trousers', 'trainers or casual shoes'],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, dressCodeId } = req.body as { imageBase64?: string; dressCodeId?: string };

  if (!imageBase64 || !dressCodeId) {
    return res.status(400).json({ error: 'imageBase64 and dressCodeId are required' });
  }

  const requiredItems = DRESS_CODE_ITEMS[dressCodeId];
  if (!requiredItems) {
    return res.status(400).json({ error: `Unknown dressCodeId: ${dressCodeId}` });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

    const prompt = `You are a fashion expert analysing a wardrobe photo.
The person needs clothing suitable for: ${dressCodeId.replace(/-/g, ' ')}.

Required items for this dress code:
${requiredItems.map((item) => `- ${item}`).join('\n')}

Look carefully at the wardrobe photo and determine:
1. Which of the required items you can see clearly
2. Which required items are missing
3. One shopping suggestion for each missing item (concise, e.g. "Buy charcoal slim-fit suit trousers")

Respond ONLY with valid JSON — no markdown, no explanation — in exactly this format:
{"found": ["item1", "item2"], "missing": ["item3"], "suggestions": ["Buy item3 suggestion"]}`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType, data: base64Data } },
    ]);

    const text = result.response.text().trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('Gemini did not return valid JSON');
    }

    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    return res.status(200).json(parsed);
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? 'Analysis failed' });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors (or only pre-existing CRA errors unrelated to new files).

- [ ] **Step 3: Commit**

```bash
git add api/analyze-closet.ts
git commit -m "feat: Vercel serverless function for Gemini Vision closet analysis"
```

---

## Task 11: Final Wiring, Environment Files & Build Verification

**Files:**
- Create: `.env.example` (already done in Task 1 — verify)
- Modify: `.gitignore`
- Verify: full build passes

- [ ] **Step 1: Add link from CalendarView to ClosetCheck for a specific dress code**

In `src/components/CalendarView/CalendarView.tsx`, update the event `onClick` to pass dressCodeId to the closet page:

```tsx
// Change:
onClick={() => dc && navigate(`/dress-codes/${dc.id}`)}

// To:
onClick={() => dc && navigate(`/dress-codes/${dc.id}`)}
// Also add a "Check Closet" button inside each event item (after the .eventHeader div):
```

Add inside the `<li>` element, after `.eventHeader`:

```tsx
{dc && (
  <button
    className={styles.closetBtn}
    onClick={(e) => { e.stopPropagation(); navigate(`/closet?dressCodeId=${dc.id}`); }}
  >
    🪞 Check my closet for {dc.name}
  </button>
)}
```

Add to `CalendarView.module.css`:
```css
.closetBtn {
  margin-top: 10px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
  color: var(--navy);
  font-weight: 600;
  width: 100%;
  text-align: left;
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test -- --watchAll=false 2>&1 | tail -20
```

Expected: All test suites pass.

- [ ] **Step 3: Run full production build**

```bash
npm run build 2>&1 | tail -10
```

Expected: `Compiled successfully.`

- [ ] **Step 4: Verify `.env.example` is committed and `.env.local` is in `.gitignore`**

```bash
git status
```

Expected: clean working tree.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: final wiring — closet shortcut from calendar, all tests pass, build verified"
```

---

## Post-Implementation: Deployment to Vercel

These steps are manual (not automated) and require the user to complete them:

1. **Azure App Registration** (for Outlook calendar):
   - Go to [portal.azure.com](https://portal.azure.com) → Azure Active Directory → App Registrations → New Registration
   - Set redirect URI to your Vercel URL (e.g. `https://eu-dress-code.vercel.app`)
   - Add API permissions: `Calendars.Read`, `User.Read` (Delegated)
   - Copy **Client ID** and **Tenant ID** to Vercel env vars

2. **Vercel deployment**:
   ```bash
   npx vercel --prod
   ```
   - Set environment variables in Vercel dashboard: `GEMINI_API_KEY`, `REACT_APP_MSAL_CLIENT_ID`, `REACT_APP_MSAL_TENANT_ID`
