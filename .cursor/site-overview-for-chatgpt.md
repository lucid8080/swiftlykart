# SwiftlyKart — Complete Site Overview for ChatGPT

> Use this document as context when prompting ChatGPT about fixes or features for this project.

---

## 1. What Is This App?

**SwiftlyKart** is a mobile-first Progressive Web App (PWA) for grocery shopping. It lets users:
- Browse grocery items organized by category (Produce, Dairy, Meat, Pantry, etc.)
- Tap tile-based item cards to add/remove items from their shopping list
- Long-press tiles to see store-specific product variants (e.g., "Gala Apples at Walmart")
- Scan barcodes to add products via the OpenFoodFacts API
- Share lists via 4-digit PINs (family sharing without accounts)
- Access lists via NFC tags (tap a physical tag → open the app with the list)
- Track NFC tag analytics (admin dashboard for tap events, visitors, batches)
- Retroactively link anonymous NFC activity to user accounts on signup/login

**App Name**: SwiftlyKart  
**Brand Colors**: Warm earthy orange palette (#ed7712 primary)  
**Font**: Outfit (Google Fonts)

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 15.1.0 |
| React | React | 19.0.0 |
| Language | TypeScript | 5.7.2 |
| Styling | Tailwind CSS | v4.0.0 |
| Database | PostgreSQL via Prisma ORM | Prisma 5.22.0 |
| Auth | NextAuth v5 (beta) | 5.0.0-beta.29 |
| Validation | Zod | 3.25.0 |
| Icons | Lucide React | 0.468.0 |
| Barcode | @zxing/library | 0.20.0 |
| Theming | next-themes | 0.4.4 |
| IDs | uuid | 11.0.3 |
| Passwords | bcryptjs | 2.4.3 |
| CSS Utils | clsx, tailwind-merge | - |

**Dev server**: `npm run dev` runs on port 3001  
**HTTPS dev**: `npm run dev:https` via a custom simple-https-server.js  
**Database**: PostgreSQL (connection via `DATABASE_URL` env var)

---

## 3. Project File Structure

```
app/
├── layout.tsx              # Root layout (Providers, DeviceInit, ServiceWorkerRegister, AccountLinkPrompt)
├── page.tsx                # Home page — main grocery browsing + item selection UI
├── globals.css             # Tailwind + custom CSS variables (light/dark themes)
├── manifest.ts             # PWA manifest
├── loading.tsx             # Global loading spinner
├── error.tsx               # Global error boundary
├── not-found.tsx           # 404 page
├── login/page.tsx          # Login + Register page (email/password credentials)
├── pin/page.tsx            # 4-digit PIN entry page (for shared list access)
├── account/page.tsx        # Account settings (PIN, device linking, share, sign out)
├── list/page.tsx           # "My List" page for anonymous NFC visitors (separate from main grocery list)
├── t/[batchSlug]/[tagUuid]/route.ts  # NFC tap capture route (GET → log tap → redirect to /)
├── admin/
│   ├── items/page.tsx      # Admin: manage categories, items, product variants, stores
│   ├── users/page.tsx      # Admin: manage users
│   └── nfc/
│       ├── page.tsx                    # NFC Dashboard (total taps, unique visitors, top batches/tags)
│       ├── batches/page.tsx            # Batch management (create/edit/list)
│       ├── batches/[slug]/page.tsx     # Batch detail (tags table, tap timeline)
│       ├── tags/page.tsx               # All tags list (searchable, filterable)
│       ├── tags/[uuid]/page.tsx        # Tag detail (tap timeline, enable/disable)
│       ├── tap-events/page.tsx         # All tap events (searchable table with pagination)
│       ├── tag-generator/page.tsx      # Generate tag URLs + CSV export
│       └── my-list-analytics/page.tsx  # My List item analytics (most purchased, most added)
├── api/
│   ├── auth/
│   │   ├── [...nextauth]/route.ts      # NextAuth handler
│   │   └── register/route.ts           # POST register new user
│   ├── items/route.ts                  # GET all grocery items by category
│   ├── items/[id]/variants/route.ts    # GET product variants for a grocery item
│   ├── list/route.ts                   # GET current user's grocery list
│   ├── list/toggle/route.ts            # POST toggle item in list (add/remove)
│   ├── list/clear/route.ts             # POST clear all items from list
│   ├── list/my/route.ts               # GET/POST/PUT/DELETE — NFC visitor "My List" (anonymous)
│   ├── pin/resolve/route.ts            # POST verify PIN and attach list to device
│   ├── account/pin/route.ts            # GET/POST/DELETE — manage user's PIN
│   ├── device/link/route.ts            # POST link device to user account
│   ├── barcode/scan/route.ts           # POST scan barcode → look up via OpenFoodFacts
│   ├── recommendations/route.ts        # POST get store recommendations for items not found
│   ├── tap/identify/route.ts           # POST associate NFC tap with anonymous visitor
│   ├── identity/
│   │   ├── ping/route.ts              # POST ensure Visitor exists, update lastSeenAt
│   │   ├── claim/route.ts             # POST retroactively link anon taps to logged-in user
│   │   └── attach-recent/route.ts     # POST short-lived tapSessionId association
│   └── admin/
│       ├── batches/route.ts            # GET/POST batches
│       ├── batches/[slug]/route.ts     # GET/PUT batch detail
│       ├── tags/generate/route.ts      # POST bulk generate NFC tags
│       ├── tags/export/route.ts        # GET CSV export of tags
│       ├── nfc-tags/route.ts           # GET list all NFC tags
│       ├── nfc-tags/[uuid]/route.ts    # GET/PUT tag detail
│       ├── analytics/summary/route.ts  # GET dashboard summary
│       ├── analytics/batch/[slug]/route.ts  # GET batch analytics
│       ├── analytics/tag/[uuid]/route.ts    # GET tag analytics
│       ├── analytics/items/route.ts    # GET MyList item analytics
│       ├── tap-events/route.ts         # GET searchable tap events
│       ├── categories/route.ts         # GET/POST categories
│       ├── categories/[id]/route.ts    # PUT/DELETE category
│       ├── items/route.ts              # GET/POST grocery items
│       ├── items/[id]/route.ts         # PUT/DELETE grocery item
│       ├── stores/route.ts             # GET/POST stores
│       ├── users/route.ts              # GET users
│       ├── variants/route.ts           # GET/POST product variants
│       ├── variants/[id]/route.ts      # PUT/DELETE variant
│       ├── debug/tag-link/route.ts     # Debug route for tag linking
│       └── manual-link-taps/route.ts   # Manual tap linking

components/
├── Header.tsx                  # Sticky header with logo, theme toggle, scan button, auth
├── SearchInput.tsx             # Search input with Cmd+K shortcut, clear button
├── CategoryChips.tsx           # Horizontal scrollable category filter pills with emojis
├── ItemTile.tsx                # Square tile button for each grocery item (tap to toggle, long-press for variants)
├── MyListDrawer.tsx            # Bottom sheet (mobile) / sidebar (desktop) showing selected items
├── ProductSelectionDialog.tsx  # Bottom sheet dialog for choosing product variants (by store/type)
├── BarcodeScanner.tsx          # Wrapper for barcode scanner (dynamic import to avoid SSR)
├── BarcodeScannerInner.tsx     # Actual barcode scanner using @zxing/library (camera access)
├── DoneShoppingDialog.tsx      # "Did you find everything?" dialog
├── ItemsNotFoundDialog.tsx     # "Which items weren't found?" dialog
├── RecommendationsDisplay.tsx  # Store recommendations for items not found
├── AddToHomeBanner.tsx         # PWA install prompt (Chrome auto + iOS manual instructions)
├── AccountLinkPrompt.tsx       # Prompt to link NFC taps to user account after login
├── DeviceInit.tsx              # Initializes device UUID + pings identity server on load
├── ServiceWorkerRegister.tsx   # Registers /sw.js service worker
├── Providers.tsx               # SessionProvider (NextAuth) + ThemeProvider (next-themes)
├── ThemeToggle.tsx             # Light/Dark/System theme cycle button

hooks/
├── index.ts
├── useDevice.ts               # Device ID hook
├── useList.ts                 # Main hook: fetches items + list, manages optimistic toggle/clear

lib/
├── auth.ts         # NextAuth config (Credentials provider, JWT, admin role, Prisma adapter)
├── db.ts           # Prisma client singleton
├── device.ts       # Server-side device ID extraction from cookies/headers
├── device-client.ts # Client-side device ID (localStorage + cookie), getDeviceHeaders()
├── device-server.ts # Server-side device utilities
├── identity-client.ts # Client-side: getAnonVisitorId(), pingIdentity(), claimIdentity()
├── list.ts         # List utility functions
├── nfc.ts          # hashIp(), deriveDeviceHint(), findDuplicateTap(), extractClientIp(), upsertVisitor()
├── csv.ts          # CSV generation for tag export
├── pin.ts          # PIN hashing (SHA256 for lookup, bcrypt for verification)
├── utils.ts        # cn() (clsx + tailwind-merge), generateUUID()
├── zod.ts          # All Zod schemas + TypeScript types (login, register, pin, toggleItem, groceryItem, category, API response types)

middleware.ts       # Auth middleware: protects /account (auth required), /admin (admin role required)
                    # Excludes: /t/ (NFC taps), /list, /api, static files

prisma/
├── schema.prisma   # Full database schema (see Section 4 below)
├── seed.ts         # Seed script (categories, items, stores, variants, demo NFC data)
├── migrations/     # Migration files

public/
├── sw.js           # Service worker for PWA offline support
├── logo/           # App logos, favicons, web manifests
├── icons/          # Additional icons
```

---

## 4. Database Schema (Prisma)

### Core Models (Grocery List System)

**User** — Authenticated users (NextAuth)
- `id`, `name`, `email`, `password`, `role` ("user" | "admin"), `image`
- Relations: accounts, sessions, devices, lists, identityClaims

**Account** — NextAuth OAuth accounts (not actively used, Credentials-only for now)

**Session** — NextAuth sessions

**Device** — Anonymous device tracking
- `deviceId` (UUID from localStorage/cookie) — unique per browser
- Optional `userId` link when user logs in

**List** — Shopping lists (the main grocery list system)
- `ownerUserId` OR `ownerDeviceId` — can belong to user or anonymous device
- `pinLookup` (SHA256 hash for fast lookup), `pinHash` (bcrypt for verification)
- Contains `ListItem[]`

**ListItem** — Items in a shopping list
- Links to `GroceryItem` + optional `ProductVariant`
- `active` boolean (true = in cart)

**Category** — Grocery categories (Produce, Dairy, Meat, Pantry, Frozen, etc.)
- Has many `GroceryItem[]`

**GroceryItem** — Master list of grocery items (Apples, Milk, Chicken, etc.)
- `name`, `icon` (emoji), `categoryId`, `isActive`, `sortOrder`
- Has many `ProductVariant[]`

**Store** — Grocery stores (Walmart, Target, etc.)
- `name`, `logo`

**ProductVariant** — Store-specific products
- Links `GroceryItem` to `Store`
- `name` (e.g., "Gala Apples"), `imageUrl`, `price`, `barcode` (EAN/UPC)

### NFC Tag Analytics Models

**TagBatch** — Campaign grouping for NFC tags
- `slug` (URL-friendly, e.g., "homedepot-2026-q1"), `name`, `description`
- Has many `NfcTag[]`, `TapEvent[]`

**NfcTag** — Individual NFC tags
- `publicUuid` (UUIDv4 used in URL — not guessable), `batchId`, `label`, `status` ("active" | "disabled")
- Has many `TapEvent[]`

**TapEvent** — One row per NFC scan / URL visit
- `tagId`, `batchId` (denormalized), `occurredAt`
- Tracking: `ipHash`, `userAgent`, `acceptLanguage`, `referer`, `deviceHint`, `anonVisitorId`
- Dedup: `isDuplicate`, `duplicateOfId`
- Attribution: `visitorId`, `userId`, `linkedAt`, `linkMethod`

**Visitor** — Anonymous NFC tappers (tracked via localStorage anonVisitorId)
- `anonVisitorId` (UUID from localStorage), `firstSeenAt`, `lastSeenAt`, `tapCount`
- `lastTagId`, `lastBatchId` (for attribution)
- `userId` (linked when user claims identity)
- Has many `TapEvent[]`, `MyList[]`, `IdentityClaim[]`

**MyList** — Shopping list for anonymous NFC visitors (separate from the main List system)
- `ownerVisitorId`, `ownerUserId`, `sourceBatchId`, `sourceTagId`, `claimedAt`
- Has many `MyListItem[]`

**MyListItem** — Items in an NFC visitor's shopping list
- `itemKey` (canonical, e.g., "bananas"), `itemLabel` (display, e.g., "Bananas")
- `quantity`, `timesPurchased`, `purchasedAt`
- `sourceBatchId`, `sourceTagId` (attribution)

**ItemCatalog** — Canonical item reference for MyList
- `itemKey`, `label`, `emoji`, `category`

**IdentityClaim** — Audit table for retroactive attribution
- `userId`, `visitorId`, `claimedAt`, `method`, `details`
- Tracks when anonymous visitors are linked to user accounts

---

## 5. Authentication & Identity System

### Auth (NextAuth v5 beta)
- **Provider**: Credentials only (email + password)
- **Strategy**: JWT sessions
- **Adapter**: Prisma adapter
- **Roles**: "user" (default) and "admin" (set via `ADMIN_EMAILS` env var)
- **Password hashing**: bcrypt (12 rounds)
- **New user event**: Auto-creates a default "My Groceries" list

### Device Identity
- On app load, `DeviceInit` component generates a UUID, stores it in localStorage AND a cookie (`g_device`)
- Every API call includes the device ID via `x-device-id` header (from `getDeviceHeaders()`)
- Server extracts device ID from header or cookie to identify anonymous users

### Anonymous Visitor Identity (NFC System)
- A separate `anonVisitorId` UUID is stored in localStorage (key: `anonVisitorId`)
- Created when user first visits via NFC tag or on first page load
- Used to track taps and shopping list activity without cookies
- `DeviceInit` calls `pingIdentity()` on every page load to keep Visitor record updated

### Retroactive Attribution
- When user signs up or logs in, `claimIdentity()` is called with their `anonVisitorId`
- Server links all past TapEvents and MyList data to the user account
- Safety: blocks if Visitor is already linked to a different user
- After claiming, future taps auto-link to user via `Visitor.userId`

### Middleware
- `/account` — requires authentication (redirects to /login)
- `/admin/*` — requires admin role (redirects to / if not admin)
- Excluded from auth: `/t/` (NFC taps), `/list`, `/api`, static files

---

## 6. Key User Flows

### Flow 1: Normal Grocery Shopping
1. User opens app → `DeviceInit` creates device UUID
2. Home page loads categories + items via `GET /api/items`
3. User taps item tiles to add/remove from list (`POST /api/list/toggle`)
4. "My List" drawer shows selected items (bottom sheet on mobile, sidebar on desktop)
5. Long-press a tile → `ProductSelectionDialog` opens showing store variants
6. "Done Shopping" → asks if everything was found → can get store recommendations

### Flow 2: PIN-based Sharing
1. Authenticated user goes to Account page → sets a 4-digit PIN
2. PIN is dual-hashed: SHA256 (for fast DB lookup) + bcrypt (for verification)
3. Share link: `https://domain.com/?pin=1234`
4. Recipient opens link → PIN auto-resolves → loads the shared list
5. Can also manually enter PIN on the `/pin` page

### Flow 3: NFC Tag Tap
1. User taps physical NFC tag → browser opens `https://domain.com/t/{batchSlug}/{tagUuid}`
2. Server route (`app/t/[batchSlug]/[tagUuid]/route.ts`) handles the GET request:
   - Looks up batch by slug + tag by publicUuid
   - Validates tag is active and belongs to batch
   - Extracts IP, User-Agent, creates hashed IP
   - Checks for duplicate tap (same tag + same visitor within 2 min)
   - Creates TapEvent row
   - Upserts Visitor record
   - Redirects to `/?srcBatch={slug}&srcTag={uuid}`
3. Home page detects `srcBatch`/`srcTag` query params → calls `POST /api/tap/identify`
4. Visitor is associated with the tap event

### Flow 4: NFC Visitor "My List" (at `/list`)
1. Visitor arrives at `/list` (redirected from NFC or direct)
2. Page creates/retrieves `anonVisitorId` from localStorage
3. Identifies visitor via `POST /api/tap/identify`
4. Shows a simple shopping list UI (add items, set quantity, mark purchased, remove)
5. All actions go through `GET/POST/PUT/DELETE /api/list/my`

### Flow 5: Account Link (Retroactive Attribution)
1. After login/signup, `claimIdentity()` is called with anonVisitorId
2. `POST /api/identity/claim` links all past TapEvents and MyList to user
3. `AccountLinkPrompt` component shows a banner prompting users to link
4. Once linked, future NFC taps auto-link via Visitor.userId

---

## 7. Component Details

### Header (`components/Header.tsx`)
- Sticky top bar with logo ("SwiftlyKart"), theme toggle, barcode scan button
- Shows user avatar/icon if logged in, "Sign in" button if not
- Barcode scan button: hidden on mobile (shown inline with search), visible on desktop

### Home Page (`app/page.tsx`)
- Client component using `useList()` hook
- Search bar + category chips (horizontal scrollable filter)
- Items grid: 2 columns on mobile, up to 5 on desktop
- Each item is an `ItemTile` — tap to toggle, long-press for product variants
- `MyListDrawer` at bottom (mobile) or right sidebar (desktop)
- `BarcodeScanner` overlay when scan button is tapped
- Handles PIN from URL (`?pin=...`) and NFC attribution (`?srcBatch=...&srcTag=...`)

### ItemTile (`components/ItemTile.tsx`)
- Square aspect-ratio button showing emoji icon + item name
- Selected state: orange border, checkmark, scale animation
- Long-press (500ms touch or mouse): opens ProductSelectionDialog
- Shows product type + store name when a variant is selected

### MyListDrawer (`components/MyListDrawer.tsx`)
- Mobile: bottom sheet (expandable, 85vh max height)
- Desktop: fixed right sidebar (320px wide)
- Shows selected items with emoji, name, product type, store name
- "Done Shopping" button triggers done flow (DoneShoppingDialog → ItemsNotFoundDialog → RecommendationsDisplay)
- "Clear" button removes all items
- Shows estimated price total

### ProductSelectionDialog (`components/ProductSelectionDialog.tsx`)
- Apple-style bottom sheet
- Toggle between "Store" and "Type" view modes
- Groups show expandable lists of product variants
- Swipe left or click to expand a group
- Each variant can be selected (adds to list with that specific variant)

### BarcodeScanner (`components/BarcodeScanner.tsx` + `BarcodeScannerInner.tsx`)
- Dynamically imported (no SSR)
- Uses @zxing/library for camera-based barcode scanning
- Scans EAN/UPC barcodes → sends to `POST /api/barcode/scan` → looks up on OpenFoodFacts
- On success, adds the product to the list

### AddToHomeBanner (`components/AddToHomeBanner.tsx`)
- PWA install prompt
- Chrome/Edge: uses `beforeinstallprompt` event
- iOS Safari: shows manual 3-step instructions
- Dismissable for 7 days

### AccountLinkPrompt (`components/AccountLinkPrompt.tsx`)
- Floating card prompting authenticated users to link NFC taps
- Shows after login if user has anonVisitorId
- "Link Now" button calls claimIdentity()
- Dismissable per-user

---

## 8. Styling System

### CSS Variables (globals.css)
Light mode:
- `--background: #fffbf5` (warm cream)
- `--foreground: #1a1207` (dark brown)
- `--card: #ffffff`
- `--muted: #f5f0e8`
- `--border: #e8dfd2`
- `--ring: #ed7712` (focus ring — orange)
- `--selected-bg: #fef7ee`, `--selected-border: #f19232`

Dark mode:
- `--background: #0f0d0a`
- `--foreground: #f5f0e8`
- `--card: #1a1612`
- `--muted: #262119`
- `--border: #3d352a`

### Tailwind Custom Colors
- `primary-50` through `primary-950` (warm orange scale)
- `accent-50` through `accent-950` (green scale for success states)

### Utility Classes
- `.focus-ring` — consistent focus-visible ring styling
- `.transition-colors-fast` — 150ms color transitions
- `.safe-bottom` / `.safe-top` — PWA safe area padding
- `.bg-background`, `.bg-card`, `.bg-muted`, `.bg-selected` — CSS variable backgrounds
- `.text-foreground`, `.text-muted-foreground` — CSS variable text colors

### Animations
- `.animate-slide-up` / `.animate-slide-down` — bottom sheet enter/exit
- `.animate-fade-in` — backdrop fade
- `.stagger-1` through `.stagger-5` — staggered animation delays

---

## 9. API Routes Summary

### Public APIs (no auth required)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/items` | GET | Get all grocery items grouped by category |
| `/api/items/[id]/variants` | GET | Get product variants for a grocery item |
| `/api/list` | GET | Get current user's/device's shopping list |
| `/api/list/toggle` | POST | Add/remove item from list |
| `/api/list/clear` | POST | Clear all items from list |
| `/api/list/my` | GET/POST/PUT/DELETE | NFC visitor "My List" CRUD |
| `/api/pin/resolve` | POST | Verify PIN and attach list to device |
| `/api/account/pin` | GET/POST/DELETE | Manage user's PIN |
| `/api/device/link` | POST | Link device to user account |
| `/api/barcode/scan` | POST | Scan barcode → OpenFoodFacts lookup |
| `/api/recommendations` | POST | Get store recommendations |
| `/api/tap/identify` | POST | Associate NFC tap with visitor |
| `/api/identity/ping` | POST | Ensure Visitor exists, update lastSeenAt |
| `/api/identity/claim` | POST | Retroactively link anon taps to user |
| `/api/identity/attach-recent` | POST | Short-lived tapSessionId association |
| `/api/auth/register` | POST | Register new user |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handlers |

### Admin APIs (admin role required)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/batches` | GET/POST | List/create NFC tag batches |
| `/api/admin/batches/[slug]` | GET/PUT | Batch detail/update |
| `/api/admin/tags/generate` | POST | Bulk generate NFC tags |
| `/api/admin/tags/export` | GET | Export tags as CSV |
| `/api/admin/nfc-tags` | GET | List all NFC tags |
| `/api/admin/nfc-tags/[uuid]` | GET/PUT | Tag detail/update (enable/disable) |
| `/api/admin/analytics/summary` | GET | Dashboard summary stats |
| `/api/admin/analytics/batch/[slug]` | GET | Batch-specific analytics |
| `/api/admin/analytics/tag/[uuid]` | GET | Tag-specific analytics |
| `/api/admin/analytics/items` | GET | MyList item analytics |
| `/api/admin/tap-events` | GET | Searchable tap events list |
| `/api/admin/categories` | GET/POST | Category CRUD |
| `/api/admin/categories/[id]` | PUT/DELETE | Category update/delete |
| `/api/admin/items` | GET/POST | Grocery item CRUD |
| `/api/admin/items/[id]` | PUT/DELETE | Grocery item update/delete |
| `/api/admin/stores` | GET/POST | Store CRUD |
| `/api/admin/variants` | GET/POST | Product variant CRUD |
| `/api/admin/variants/[id]` | PUT/DELETE | Variant update/delete |
| `/api/admin/users` | GET | List all users |

---

## 10. Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | Base URL for NextAuth (e.g., `http://localhost:3001`) |
| `NEXTAUTH_SECRET` | Secret for JWT signing |
| `ADMIN_EMAILS` | Comma-separated admin emails |
| `IP_HASH_SALT` | Random string for hashing IPs (privacy) |
| `NEXT_PUBLIC_APP_DOMAIN` | Canonical domain for NFC tag URLs |

---

## 11. Current Status & Known Issues

### Completed Features ✅
- Full grocery list PWA with tile-based UI
- PIN-based list sharing (dual-hash security)
- NFC tag tap capture + analytics (28 tasks complete)
- Admin dashboard for NFC analytics (8 admin pages)
- Barcode scanning components (migration pending)
- Retroactive attribution planning (18 tasks planned)
- Dark/light/system theme support
- PWA install prompt (Chrome + iOS Safari)
- Service worker for offline support
- "Done Shopping" flow with store recommendations

### In Progress 🔄
- Barcode scanning: components built, database migration needs to be applied
- Retroactive Attribution: plan complete, implementation tasks 1-18 pending

### Architecture Notes
- Two separate list systems coexist:
  1. **List/ListItem** — main grocery list (PIN-based, device-based, or user-based)
  2. **MyList/MyListItem** — NFC visitor shopping list (anonymous, simpler)
- Device identity (UUID) and Visitor identity (anonVisitorId) are separate systems
- All admin API routes check admin auth via `isAdmin()` from `lib/auth.ts`
- Middleware uses a negative matcher pattern to exclude public routes

---

## 12. Key Patterns Used

1. **Optimistic UI**: List toggles update UI immediately, roll back on API failure
2. **Dual-hash PINs**: SHA256 for fast DB lookup, bcrypt for secure verification
3. **Cookie-free NFC tracking**: Uses localStorage `anonVisitorId` only, never cookies
4. **IP privacy**: IPs are SHA256-hashed with server salt, never stored raw
5. **Tap deduplication**: Same tag + same visitor within 2 minutes = flagged as duplicate
6. **Dynamic imports**: BarcodeScanner is dynamically imported to avoid SSR issues with camera APIs
7. **Responsive design**: Mobile bottom sheet ↔ Desktop sidebar for MyListDrawer
8. **Memo optimization**: ItemTile, SearchInput, CategoryChips, MyListDrawer, ProductSelectionDialog are all `memo()`-wrapped

---

## 13. How to Reference Specific Files

When asking ChatGPT about fixes, reference files like:
- **Home page**: `app/page.tsx` (the main grocery browsing UI)
- **List hook**: `hooks/useList.ts` (data fetching + optimistic updates)
- **Item tiles**: `components/ItemTile.tsx`
- **List drawer**: `components/MyListDrawer.tsx`
- **Product dialog**: `components/ProductSelectionDialog.tsx`
- **Barcode scanner**: `components/BarcodeScannerInner.tsx`
- **NFC tap route**: `app/t/[batchSlug]/[tagUuid]/route.ts`
- **Auth config**: `lib/auth.ts`
- **Database schema**: `prisma/schema.prisma`
- **Middleware**: `middleware.ts`
- **Styles**: `app/globals.css`
- **Identity client**: `lib/identity-client.ts`
- **NFC utilities**: `lib/nfc.ts`
- **Zod schemas**: `lib/zod.ts`
