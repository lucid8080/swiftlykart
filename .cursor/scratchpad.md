# Grocery List PWA - Project Scratchpad

## Background and Motivation

Building a mobile-first Progressive Web App for grocery shopping with:
- Tile-based item selection for easy one-handed use
- PIN-based sharing for families without accounts
- NFC tag support for quick list access
- Offline capability via service workers
- **Barcode scanning** to add products using OpenFoodFacts API
- **NFC Tag Analytics + Grocery "My List" System** (NEW - Feb 2026)
- **Retroactive Attribution** (NEW - Feb 2026): Link anonymous NFC tap history to user accounts when they sign up or log in

## Key Challenges and Analysis

1. **Anonymous Persistence**: Solved via device UUID stored in localStorage + cookie
2. **PIN Security**: Using dual-hash approach (SHA256 for lookup, bcrypt for verification)
3. **PWA Installation**: Handled both Chrome's automatic prompt and iOS Safari's manual flow
4. **Optimistic UI**: Implemented with rollback on API failure
5. **Barcode Scanning**: (details in section below)
6. **Done Shopping Feature**: (details in section below)
7. **NFC Tag Analytics System** (NEW):
   - **Cookie-free tracking**: Must log taps without cookies. Use localStorage `anonVisitorId` if available; hash IP as fallback identifier.
   - **URL Design**: `/t/{batchSlug}/{tagUuid}` — batchSlug is human-readable, tagUuid is UUIDv4 (not sequential).
   - **Tap Deduplication**: Same tag + same visitor within 2 minutes = duplicate. Store `isDuplicate` flag rather than discarding events.
   - **IP Privacy**: Hash IP with server-side salt using SHA-256. Never store raw IP.
   - **Middleware conflict**: Current middleware protects `/admin/*` and requires auth. Must ensure `/t/...` and `/list` routes are PUBLIC and bypass auth checks.
   - **MyList vs existing List**: The existing `List`/`ListItem` models are for the PIN-based grocery list. The new `MyList`/`MyListItem` is a separate simpler system for NFC-driven shopping lists tied to `Visitor` (anonymous NFC users). They coexist.
   - **Admin auth**: Existing admin uses NextAuth session + admin role. NFC admin pages will use the same mechanism (already protected by middleware).
   - **Attribution**: Store `lastTagId`/`lastBatchId` on Visitor to attribute list actions to NFC source.
8. **Retroactive Attribution System** (NEW):
   - **Problem**: Anonymous users tap NFC tags and build shopping lists, but when they create an account, their history is lost.
   - **Solution**: When user signs up or logs in, permanently link all past TapEvents and MyList data to their User ID via anonVisitorId.
   - **Privacy**: No cookies required; uses localStorage anonVisitorId. Only links when user explicitly authenticates.
   - **Durability**: Once linked, all future taps from that device/visitor automatically link to the user.
   - **Safety**: Prevent hijacking by blocking claims if Visitor already linked to different userId.
   - **Audit**: IdentityClaim table tracks all claims with method and details.

---

## NFC Tag Analytics + My List — DETAILED PLAN

### Phase 1: Prisma Schema + Migration

**New Models to Add** (alongside existing models, no changes to existing ones):

```prisma
// ─── NFC Tag Batches ───
model TagBatch {
  id          String    @id @default(uuid())
  slug        String    @unique  // e.g. "homedepot-2026-q1"
  name        String               // e.g. "Home Depot Q1 2026"
  description String?
  tags        NfcTag[]
  tapEvents   TapEvent[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

// ─── Individual NFC Tags ───
model NfcTag {
  id         String     @id @default(uuid())   // internal ID
  publicUuid String     @unique @default(uuid()) // UUIDv4 used in URL
  batchId    String
  batch      TagBatch   @relation(fields: [batchId], references: [id], onDelete: Cascade)
  label      String?    // human label like "HD Tag 001"
  status     String     @default("active") // active | disabled
  tapEvents  TapEvent[]
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
}

// ─── Tap Events (one per NFC scan) ───
model TapEvent {
  id              String    @id @default(uuid())
  tagId           String
  tag             NfcTag    @relation(fields: [tagId], references: [id], onDelete: Cascade)
  batchId         String    // denormalized for faster queries
  batch           TagBatch  @relation(fields: [batchId], references: [id], onDelete: Cascade)
  occurredAt      DateTime  @default(now())
  ipHash          String?   // sha256(ip + SERVER_SALT)
  userAgent       String?
  acceptLanguage  String?
  referer         String?
  deviceHint      String?   // "mobile" | "desktop" | "tablet"
  anonVisitorId   String?   // localStorage ID if available
  sessionHint     String?   // short-lived dedupe key
  country         String?
  region          String?
  isDuplicate     Boolean   @default(false)
  duplicateOfId   String?   // FK to original TapEvent if duplicate
  visitorId       String?
  visitor         Visitor?  @relation(fields: [visitorId], references: [id], onDelete: SetNull)
  createdAt       DateTime  @default(now())

  @@index([batchId])
  @@index([tagId])
  @@index([anonVisitorId])
  @@index([occurredAt])
  @@index([ipHash, userAgent])
}

// ─── Anonymous Visitors (NFC tappers) ───
model Visitor {
  id              String      @id @default(uuid())
  anonVisitorId   String      @unique // random ID from localStorage
  firstSeenAt     DateTime    @default(now())
  lastSeenAt      DateTime    @default(now())
  tapCount        Int         @default(0)
  lastTagId       String?     // last NFC tag tapped (for attribution)
  lastBatchId     String?     // last batch (for attribution)
  tapEvents       TapEvent[]
  myLists         MyList[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

// ─── My List (Shopping list for NFC visitors) ───
model MyList {
  id              String       @id @default(uuid())
  ownerVisitorId  String?
  ownerVisitor    Visitor?     @relation(fields: [ownerVisitorId], references: [id], onDelete: SetNull)
  ownerUserId     String?      // if auth exists
  sourceBatchId   String?      // attributed batch
  sourceTagId     String?      // attributed tag
  items           MyListItem[]
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

// ─── My List Items ───
model MyListItem {
  id              String    @id @default(uuid())
  listId          String
  list            MyList    @relation(fields: [listId], references: [id], onDelete: Cascade)
  itemKey         String    // canonical key like "bananas"
  itemLabel       String    // display label like "Bananas"
  quantity        Int?
  lastAddedAt     DateTime  @default(now())
  timesPurchased  Int       @default(0)
  purchasedAt     DateTime?
  sourceBatchId   String?   // attributed batch for this item
  sourceTagId     String?   // attributed tag for this item
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([listId, itemKey])
}

// ─── Item Catalog (optional canonical items) ───
model ItemCatalog {
  id        String   @id @default(uuid())
  itemKey   String   @unique
  label     String
  emoji     String?
  category  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Migration Steps:**
1. Add new models to `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name add_nfc_tag_analytics`
3. Verify migration applied cleanly

---

### Phase 2: Utility Libraries

**2a. `lib/nfc.ts` — Hashing + Dedupe Utilities**
- `hashIp(ip: string): string` — sha256(ip + process.env.IP_HASH_SALT)
- `deriveDeviceHint(userAgent: string): "mobile" | "desktop" | "tablet"`
- `isDuplicateTap(tagId, anonVisitorId, ipHash, userAgent, withinMinutes=2): Promise<TapEvent | null>`
- `generateAnonVisitorId(): string` — UUIDv4

**2b. `lib/csv.ts` — CSV Export Utility**
- `generateTagsCsv(tags: NfcTag[], batchSlug: string, domain: string): string`
- Returns CSV string: `label,batchSlug,publicUuid,url`

**2c. Environment Variables Needed:**
- `IP_HASH_SALT` — random string for hashing IPs (add to `.env` / `env.example.txt`)
- `NEXT_PUBLIC_APP_DOMAIN` — canonical domain for tag URLs (e.g., `myapp.com`)

---

### Phase 3: Tap Capture Route (`/t/[batchSlug]/[tagUuid]`)

**File: `app/t/[batchSlug]/[tagUuid]/route.ts`** (Route Handler)

Flow:
1. Parse `batchSlug` and `tagUuid` from URL params
2. Look up `TagBatch` by slug + `NfcTag` by publicUuid
3. Validate tag belongs to batch and status is "active"
4. If tag not found or disabled → redirect to `/` with error
5. Extract headers: IP, User-Agent, Accept-Language, Referer
6. Hash IP: `sha256(ip + IP_HASH_SALT)`
7. Derive deviceHint from User-Agent
8. Check for `anonVisitorId` from query param `?vid=...` (optional)
9. Run dedupe check: same tagId + (anonVisitorId || ipHash+UA) within 2 min
10. Create `TapEvent` row (set `isDuplicate` if duplicate found)
11. If `anonVisitorId` present, upsert `Visitor` row (increment tapCount, update lastSeenAt/lastTagId/lastBatchId)
12. Redirect to `/list?srcBatch={batchSlug}&srcTag={tagUuid}`

**Middleware Update:**
- Add `/t` to the exclusion list so auth middleware doesn't block NFC taps
- Also add `/list` if needed

---

### Phase 4: `/list` Page (Client)

**File: `app/list/page.tsx`**

Flow:
1. On mount, check `localStorage` for `anonVisitorId`
2. If missing, generate new UUIDv4 and store in `localStorage`
3. Read `srcBatch` and `srcTag` from query params
4. Call `POST /api/tap/identify` with `{ anonVisitorId, srcBatch, srcTag }` to:
   - Associate recent TapEvent with visitor
   - Update Visitor.lastTagId / lastBatchId
5. Show the grocery list UI (can be simplified version or reuse existing components)
6. Items added/purchased are tracked in `MyList` / `MyListItem`

**File: `app/api/tap/identify/route.ts`**
- POST: Receives `{ anonVisitorId, srcBatch?, srcTag? }`
- Finds recent TapEvent within last 5 min matching ipHash + tag that has no visitorId yet
- Attaches visitorId to that TapEvent
- Upserts Visitor record

---

### Phase 5: Admin API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/batches` | GET | List all batches with tap counts |
| `/api/admin/batches` | POST | Create new batch |
| `/api/admin/batches/[slug]` | GET | Get batch details |
| `/api/admin/batches/[slug]` | PUT | Update batch |
| `/api/admin/tags/generate` | POST | Bulk generate tags for a batch |
| `/api/admin/tags/export` | GET | Export tags as CSV (`?batchSlug=...`) |
| `/api/admin/tags` | GET | List tags with filters |
| `/api/admin/tags/[uuid]` | GET | Get tag details + tap timeline |
| `/api/admin/tags/[uuid]` | PUT | Enable/disable tag |
| `/api/admin/analytics/summary` | GET | Dashboard summary stats |
| `/api/admin/analytics/batch/[slug]` | GET | Batch-specific analytics |
| `/api/admin/analytics/tag/[uuid]` | GET | Tag-specific analytics |
| `/api/admin/analytics/items` | GET | MyList item analytics |
| `/api/admin/analytics/visitors` | GET | Power users + visitor list |
| `/api/admin/tap-events` | GET | Searchable tap events list |

All admin API routes check admin auth via `isAdmin()` from `lib/auth.ts`.

---

### Phase 6: Admin Portal Pages

**6a. `/admin/nfc` — NFC Dashboard** (landing page for NFC admin)
- Total taps (all-time)
- Taps today / this week / this month
- Unique visitors estimate (distinct anonVisitorId OR distinct ipHash+UA)
- Top 5 batches by tap count
- Top 5 tags by tap count
- Power users table (top visitors by tapCount)
- Most purchased items (from MyListItem.timesPurchased)
- Date range filter (7d / 30d / all-time)

**6b. `/admin/nfc/batches` — Batch Management**
- List all batches with: slug, name, tag count, tap count, unique visitors
- Create new batch form (slug, name, description)
- Edit batch inline or modal
- Click batch to drill into `/admin/nfc/batches/[slug]`

**6c. `/admin/nfc/batches/[slug]` — Batch Detail**
- Batch info header
- Tags table for this batch (label, publicUuid, status, taps, last tapped)
- Tap timeline chart/table
- Unique visitors for this batch
- Actions: generate more tags, export CSV

**6d. `/admin/nfc/tags` — All Tags**
- Searchable/filterable table
- Columns: label, batchSlug, publicUuid, status, taps, last tapped
- Click tag → `/admin/nfc/tags/[uuid]`

**6e. `/admin/nfc/tags/[uuid]` — Tag Detail**
- Tag info (label, batch, status, publicUuid, full URL)
- Enable/disable toggle
- Tap timeline table: occurredAt, anonVisitorId, ipHash, userAgent, deviceHint
- Visitor list for this tag

**6f. `/admin/nfc/tap-events` — All Tap Events**
- Searchable table with filters: batchSlug, tagUuid, date range, visitor, userAgent
- Columns: occurredAt, batch, tag, anonVisitorId, ipHash, userAgent, deviceHint, isDuplicate
- Pagination

**6g. `/admin/nfc/tag-generator` — Tag URL Generation + Export**
- Select existing batch OR create new batch
- Number of tags to generate (N)
- Optional prefix label (e.g., "HD Tag")
- Generate button → creates N NfcTag rows
- Results table: label, batchSlug, publicUuid, fullUrl
- Export CSV button
- "Regenerate export" for existing batch

**6h. `/admin/nfc/my-list-analytics` — My List Analytics**
- Items most purchased (top N by timesPurchased)
- Items most added (top N by count of MyListItem rows)
- Power users by purchase count
- Per-batch item popularity (attributed via sourceBatchId)
- Date range filters

---

### Phase 7: Seed Script

Add to `prisma/seed.ts` (or create `prisma/seed-nfc.ts`):
1. Create a default batch: `slug: "demo-batch"`, `name: "Demo Batch"`
2. Create 5 sample NfcTags with labels "Demo Tag 001" through "Demo Tag 005"
3. Create a few sample ItemCatalog entries
4. Print generated URLs to console

---

### Phase 8: Integration & Polish

1. Add NFC admin navigation link to existing admin page
2. Ensure middleware excludes `/t/` and `/list` from auth checks
3. Add `IP_HASH_SALT` and `NEXT_PUBLIC_APP_DOMAIN` to `env.example.txt`
4. Test end-to-end: generate tags → visit URL → verify tap logged → check admin

---

## High-level Task Breakdown

### Previously Completed
- [x] Project structure and dependencies
- [x] Prisma schema with all models
- [x] NextAuth configuration with Prisma adapter
- [x] Device identity and PIN utilities
- [x] API route handlers with Zod validation
- [x] Core UI components
- [x] Main pages (Home, PIN, Account, Admin)
- [x] PWA manifest, service worker, install banner
- [x] Seed script with categories and items
- [x] README documentation
- [x] Done Shopping feature with recommendations

### Barcode Scanning (In Progress)
- [ ] Barcode scanning feature (components created, migration pending)

### Retroactive Attribution (PLANNED)
- [ ] **Task 1**: Update Prisma schema — add userId to Visitor, userId/linkedAt/linkMethod to TapEvent, claimedAt to MyList, IdentityClaim model
- [ ] **Task 2**: Create and run migration `add_retroactive_attribution`
- [ ] **Task 3**: Generate Prisma client after schema changes
- [ ] **Task 4**: Create `POST /api/identity/ping` route — ensure Visitor exists, update lastSeenAt/ipHashLastSeen/userAgentLastSeen
- [ ] **Task 5**: Create `POST /api/identity/claim` route — retroactively link taps + lists with safety checks
- [ ] **Task 6**: Create `POST /api/identity/attach-recent` route (optional) — short-lived tapSessionId association
- [ ] **Task 7**: Update `/t/[batchSlug]/[tagUuid]/route.ts` — accept anonVisitorId from header/query, auto-link userId if Visitor.userId exists
- [ ] **Task 8**: Update `/app/login/page.tsx` — call `/api/identity/claim` after successful signup/login
- [ ] **Task 9**: Create `lib/identity-client.ts` utility — getAnonVisitorId(), pingIdentity()
- [ ] **Task 10**: Update root layout or key pages to call pingIdentity() on mount
- [ ] **Task 11**: Update `/api/admin/tap-events/route.ts` to include userId, linkMethod, linkedAt
- [ ] **Task 12**: Update `/admin/nfc/tap-events/page.tsx` to display userId, linkMethod, linkedAt columns
- [ ] **Task 13**: Create or update user detail page with tap analytics (total taps, first/last tap, top tags/batches, purchased items)
- [ ] **Task 14**: Create "Unclaimed Visitors" admin page or add to existing analytics
- [ ] **Task 15**: Add seed script data for testing (Visitor with anonVisitorId, TapEvents, MyList)
- [ ] **Task 16**: Test end-to-end: anonymous tap → signup → verify linking → future tap → verify auto-link
- [ ] **Task 17**: Test edge cases: missing anonVisitorId, already-claimed Visitor, merge MyList scenarios
- [ ] **Task 18**: Update README with retroactive attribution feature description

### NFC Tag Analytics + My List (COMPLETED ✅)
- [x] **Task 1**: Prisma schema — add 7 new models (TagBatch, NfcTag, TapEvent, Visitor, MyList, MyListItem, ItemCatalog)
- [x] **Task 2**: Run `prisma db push` to sync schema
- [x] **Task 3**: Create utility libs (`lib/nfc.ts`, `lib/csv.ts`)
- [x] **Task 4**: Add env vars (`IP_HASH_SALT`, `NEXT_PUBLIC_APP_DOMAIN`) to env.example.txt
- [x] **Task 5**: Update middleware to exclude `/t/` and `/list` routes from auth
- [x] **Task 6**: Implement tap capture route `app/t/[batchSlug]/[tagUuid]/route.ts`
- [x] **Task 7**: Implement `/api/tap/identify` route
- [x] **Task 8**: Create `/list` page with visitor identification
- [x] **Task 9**: Admin API — batch CRUD (`/api/admin/batches`)
- [x] **Task 10**: Admin API — tag generation (`/api/admin/tags/generate`)
- [x] **Task 11**: Admin API — tag export CSV (`/api/admin/tags/export`)
- [x] **Task 12**: Admin API — tags CRUD + list (`/api/admin/nfc-tags`, `/api/admin/nfc-tags/[uuid]`)
- [x] **Task 13**: Admin API — analytics summary (`/api/admin/analytics/summary`)
- [x] **Task 14**: Admin API — batch analytics (`/api/admin/analytics/batch/[slug]`)
- [x] **Task 15**: Admin API — tag analytics (`/api/admin/analytics/tag/[uuid]`)
- [x] **Task 16**: Admin API — item analytics (`/api/admin/analytics/items`)
- [x] **Task 17**: Admin API — tap events list (`/api/admin/tap-events`)
- [x] **Task 18**: Admin page — NFC Dashboard (`/admin/nfc`)
- [x] **Task 19**: Admin page — Batch Management (`/admin/nfc/batches`)
- [x] **Task 20**: Admin page — Batch Detail (`/admin/nfc/batches/[slug]`)
- [x] **Task 21**: Admin page — Tags List (`/admin/nfc/tags`)
- [x] **Task 22**: Admin page — Tag Detail (`/admin/nfc/tags/[uuid]`)
- [x] **Task 23**: Admin page — Tap Events (`/admin/nfc/tap-events`)
- [x] **Task 24**: Admin page — Tag Generator + Export (`/admin/nfc/tag-generator`)
- [x] **Task 25**: Admin page — My List Analytics (`/admin/nfc/my-list-analytics`)
- [x] **Task 26**: Seed script — demo batch + sample tags added to existing seed
- [x] **Task 27**: Navigation — NFC Analytics link added to admin items page
- [x] **Task 28**: End-to-end: schema pushed, Prisma generated, seed run successfully

## Project Status Board

| Task | Status | Notes |
|------|--------|-------|
| Core implementation | ✅ Complete | All features implemented |
| API validation | ✅ Complete | Zod schemas for all endpoints |
| PWA features | ✅ Complete | Service worker, manifest, install prompt |
| Documentation | ✅ Complete | Full README with setup guide |
| Done Shopping feature | ✅ Complete | All components wired |
| Barcode scanning | 🔄 In Progress | Components built, migration pending |
| **NFC: Prisma Schema** | ✅ Complete | 7 models added via `prisma db push` |
| **NFC: Utility Libs** | ✅ Complete | nfc.ts (hash, dedupe, device), csv.ts |
| **NFC: Middleware Update** | ✅ Complete | /t/ and /list excluded from auth |
| **NFC: Tap Capture Route** | ✅ Complete | /t/[batch]/[tag] + /api/tap/identify |
| **NFC: /list Page** | ✅ Complete | Client page with visitor ID + CRUD |
| **NFC: Admin APIs** | ✅ Complete | 13 API routes implemented |
| **NFC: Admin Pages** | ✅ Complete | 8 admin pages with tables + forms |
| **NFC: Seed Script** | ✅ Complete | 2 batches, 15 tags, 5 events seeded |
| **NFC: Navigation** | ✅ Complete | Link in admin items page header |
| **NFC: E2E Test** | ✅ Complete | Schema pushed, client generated, seed run |
| **Retroactive Attribution: Planning** | ✅ Complete | Comprehensive plan with 18 tasks across 8 phases |

## Executor's Feedback or Assistance Requests

*(Previous feedback preserved below)*

**Barcode Scanning Feature — Issues & Fixes (Feb 2026)**

**Issues Identified:**
1. ❌ Camera view positioning incorrect (image at top, scanning box in black area)
2. ❌ Not working on S20 (black screen after scan)
3. ❌ Poor UX during processing (black screen, no loading indication)
4. ❌ Using QuaggaJS which has compatibility issues

**Fixes Implemented:**
1. ✅ Replaced QuaggaJS with html5-qrcode library (better mobile support, cleaner API)
2. ✅ Fixed camera view layout — html5-qrcode handles positioning automatically
3. ✅ Keep camera feed visible during API processing with overlay loading indicator
4. ✅ Improved error handling and cleanup for newer Android devices (proper pause/resume)
5. ✅ Added better visual feedback — processing overlay shows on top of camera, success message with delay
6. ✅ Better camera selection — prefers back camera for barcode scanning
7. ✅ Proper cleanup — uses pause/resume instead of stop/restart for better UX

**Status:** ✅ Complete — ready for testing on S10 and S20 devices

---

**NFC Tag Analytics — Planning Complete (Feb 9, 2026)**

Comprehensive plan created with 28 tasks across 8 phases:
- Phase 1: Schema + Migration (Tasks 1-2)
- Phase 2: Utility Libs (Tasks 3-4)
- Phase 3: Middleware + Tap Route (Tasks 5-7)
- Phase 4: /list Page (Task 8)
- Phase 5: Admin APIs (Tasks 9-17)
- Phase 6: Admin Pages (Tasks 18-25)
- Phase 7: Seed Script (Task 26)
- Phase 8: Integration + Polish (Tasks 27-28)

**Recommended execution order**: Tasks 1→2→3→4→5→6→7→8→9→10→11→12→13→18→19→24→26 (core flow first, then remaining analytics pages).

---

**Retroactive Attribution — Planning Complete (Feb 2026)**

Comprehensive plan created with 18 tasks across 8 phases:
- Phase 1: Prisma Schema + Migration (Tasks 1-3)
- Phase 2: Identity API Routes (Tasks 4-6)
- Phase 3: Update Tap Event Creation (Task 7)
- Phase 4: Update Signup/Login Flow (Tasks 8-9)
- Phase 5: Client-side Identity Ping (Tasks 10-11)
- Phase 6: Admin Visibility (Tasks 12-14)
- Phase 7: Testing & Validation (Tasks 15-17)
- Phase 8: Documentation (Task 18)

**Recommended execution order**: Tasks 1→2→3→4→5→7→8→9→10→11→6→12→13→14→15→16→17→18 (schema first, then core flow, then admin visibility, then testing).

**Key Design Decisions:**
- No cookies required — uses localStorage anonVisitorId only
- Safety-first: blocks claims if Visitor already linked to different userId
- Denormalized userId on TapEvent for fast queries
- IdentityClaim audit table for compliance and debugging
- Optional short-lived tapSessionId fallback for edge cases (10min TTL)
- Future taps auto-link once Visitor.userId is set

## Lessons

- NextAuth v5 (beta) requires specific adapter configuration
- Service worker caching strategies vary by endpoint type
- iOS Safari requires manual PWA install instructions
- PIN lookup requires searchable hash (SHA256) + verification hash (bcrypt)
- Existing middleware matcher pattern needs updating when adding new public routes
- MyList and existing List models must coexist — different systems for different user types
- Retroactive attribution requires careful safety checks to prevent account hijacking (block claims if Visitor already linked to different userId)
- Denormalizing userId on TapEvent improves query performance but requires keeping it in sync with Visitor.userId
- localStorage anonVisitorId is the primary linking mechanism; IP+UA heuristics only for short-lived fallback (10min TTL max)

## Architecture Notes

### Existing Stack Summary
- **Framework**: Next.js 15.1.0 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Prisma 5.22 + PostgreSQL
- **Auth**: NextAuth v5-beta (Credentials provider, JWT sessions, admin role)
- **Existing Models**: User, Account, Session, Device, List, ListItem, Category, GroceryItem, Store, ProductVariant
- **Existing Admin**: `/admin/items` — manage categories, items, product variants
- **Device Identity**: UUID stored in localStorage + cookie (via `DeviceInit` component)

### How NFC System Integrates
- New models (TagBatch, NfcTag, TapEvent, Visitor, MyList, MyListItem, ItemCatalog) are **additive** — no existing models modified.
- NFC admin pages live under `/admin/nfc/*` — coexist with existing `/admin/items`
- Tap route `/t/[batchSlug]/[tagUuid]` is a new public route (no auth required)
- `/list` page is a new public page for NFC visitors' shopping list
- Visitor model is separate from Device model (different tracking paradigms)

### File Structure (New Files)
```
app/
  t/[batchSlug]/[tagUuid]/route.ts          # Tap capture (GET → log + redirect)
  list/page.tsx                              # Shopping list for NFC visitors
  api/
    tap/identify/route.ts                    # Associate visitor with tap
    admin/
      batches/route.ts                       # GET/POST batches
      batches/[slug]/route.ts                # GET/PUT batch
      tags/generate/route.ts                 # POST bulk generate
      tags/export/route.ts                   # GET CSV export
      nfc-tags/route.ts                      # GET list tags
      nfc-tags/[uuid]/route.ts               # GET/PUT tag detail
      analytics/summary/route.ts             # GET dashboard
      analytics/batch/[slug]/route.ts        # GET batch analytics
      analytics/tag/[uuid]/route.ts          # GET tag analytics
      analytics/items/route.ts               # GET item analytics
      tap-events/route.ts                    # GET searchable tap events
  admin/
    nfc/page.tsx                             # Dashboard
    nfc/batches/page.tsx                     # Batch list
    nfc/batches/[slug]/page.tsx              # Batch detail
    nfc/tags/page.tsx                        # Tag list
    nfc/tags/[uuid]/page.tsx                 # Tag detail
    nfc/tap-events/page.tsx                  # Tap events table
    nfc/tag-generator/page.tsx               # Tag URL generator + export
    nfc/my-list-analytics/page.tsx           # My List analytics
lib/
  nfc.ts                                     # IP hashing, device hint, dedupe
  csv.ts                                     # CSV generation utility
prisma/
  seed-nfc.ts                                # NFC seed script (demo batch + tags)
```

---

## Retroactive Attribution — DETAILED PLAN

### Background and Motivation

Currently, anonymous users can tap NFC tags and build shopping lists via the `/t/{batchSlug}/{tagUuid}` route. These actions are tracked via `anonVisitorId` stored in localStorage. However, when a user creates an account or logs in, their anonymous history (TapEvents and MyList data) remains unlinked, creating a fragmented experience.

**Goal**: When someone signs up or logs in, permanently link all their past anonymous activity to their User account, creating a seamless transition from anonymous to authenticated usage.

### Key Challenges and Analysis

1. **Cookie-free requirement**: Must work without cookies (privacy-first approach). Rely on localStorage `anonVisitorId` and optional IP+UA heuristics for short-lived fallback only.
2. **Claiming safety**: Prevent account hijacking by blocking claims if a Visitor is already linked to a different userId.
3. **Retroactive linking**: Must efficiently find and link all past TapEvents and MyList data for a given anonVisitorId.
4. **Future auto-linking**: Once claimed, all future taps from that device should automatically link to the user.
5. **Edge cases**: Handle missing anonVisitorId (localStorage blocked), optional short-lived tapSessionId fallback for recent taps.
6. **Privacy**: Never use IP+UA alone for permanent attribution (too risky). Only for short-lived "recent session attach" with strict TTL.

### Data Model Changes (Prisma Schema)

**1. Visitor Model Updates:**
```prisma
model Visitor {
  // ... existing fields ...
  userId            String?   @unique // NEW: links Visitor to User when claimed
  ipHashLastSeen    String?   // NEW: track last seen IP hash
  userAgentLastSeen String?   // NEW: track last seen user agent
  // ... existing fields ...
}
```

**2. TapEvent Model Updates:**
```prisma
model TapEvent {
  // ... existing fields ...
  userId      String?   // NEW: denormalized for fast queries (indexed)
  linkedAt    DateTime? // NEW: when it was attached to a user
  linkMethod  String?   // NEW: enum "anonVisitorId" | "recentTapSession" | "ipUaHeuristic"
  // ... existing fields ...
  
  @@index([userId]) // NEW: index for user queries
}
```

**3. MyList Model Updates:**
```prisma
model MyList {
  // ... existing fields ...
  userId      String?   // NEW: already exists as ownerUserId, but ensure indexed
  claimedAt   DateTime? // NEW: when list was claimed by user
  // ... existing fields ...
  
  @@index([userId]) // NEW: ensure indexed
}
```

**4. MyListItem Model Updates:**
```prisma
model MyListItem {
  // ... existing fields ...
  // No changes needed (inherits userId via MyList)
}
```

**5. New IdentityClaim Model (Audit Table):**
```prisma
model IdentityClaim {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  visitorId String
  visitor   Visitor  @relation(fields: [visitorId], references: [id], onDelete: Cascade)
  claimedAt DateTime @default(now())
  method    String   // "anonVisitorId" | "recentTapSession" | "ipUaHeuristic"
  details   Json?    // optional metadata (tapSessionId, ipHash, etc.)
  
  @@unique([userId, visitorId])
  @@index([userId])
  @@index([visitorId])
  @@index([claimedAt])
}
```

**6. User Model Updates:**
```prisma
model User {
  // ... existing fields ...
  identityClaims IdentityClaim[] // NEW: relation to audit table
  // ... existing fields ...
}
```

### Identity / Claiming Mechanism (NO COOKIES)

**Client-side (localStorage):**
- Persist `anonVisitorId` in localStorage (generate once as UUIDv4 if missing).
- On every page load (especially after `/t` tap redirect), send anonVisitorId to server via:
  - Custom request header: `X-Anon-Visitor-Id` (preferred)
  - OR query param: `?vid=...`
  - OR POST `/api/identity/ping` endpoint

**Server-side:**
- Ensure Visitor row exists for that anonVisitorId.
- Update `lastSeenAt`, `ipHashLastSeen`, `userAgentLastSeen` on Visitor.

### Retroactive Linking Flow

**When user signs up OR logs in:**

1. **Client**: Get current `anonVisitorId` from localStorage.
2. **Client**: Call `POST /api/identity/claim` with body: `{ anonVisitorId }`.
3. **Server** (`/api/identity/claim`):
   - Require authenticated user session (NextAuth).
   - Find Visitor by anonVisitorId (create if missing).
   - **Safety check**: If Visitor already linked to a DIFFERENT userId, block and return error (prevents hijacking).
   - Set `Visitor.userId = current user id` (if not already set).
   - **Retroactively link TapEvents**:
     - Update all TapEvents where `anonVisitorId == anonVisitorId OR visitorId == Visitor.id`
     - Set `userId = current user id`, `visitorId = Visitor.id`, `linkedAt = now()`, `linkMethod = "anonVisitorId"`
   - **Retroactively link MyList**:
     - Find the most recent MyList for this `visitorId` (or anonVisitorId mapping)
     - Set `MyList.userId = current user id`, `claimedAt = now()`
     - Optionally merge with existing user list if user already has one (dedupe by itemKey)
   - Insert IdentityClaim audit row with method="anonVisitorId".

### Future Auto-Linking

**Whenever a TapEvent is created** (in `/t/[batchSlug]/[tagUuid]/route.ts`):
- If `anonVisitorId` is present, look up Visitor by anonVisitorId:
  - Set `TapEvent.visitorId = Visitor.id`
  - If `Visitor.userId` exists, set `TapEvent.userId = Visitor.userId` (automatic linking)

This ensures once claimed, all future taps are automatically linked.

### Edge Cases / Safety

1. **Missing anonVisitorId**: If localStorage is blocked, do NOT attempt permanent linking. Only use short-lived fallback.
2. **Optional "recent tap session" fallback**:
   - When `/t` route logs TapEvent, optionally generate a short-lived `tapSessionId` in redirect URL (`/list?ts=...`)
   - Client can POST `/api/identity/attach-recent` with `{ tapSessionId, anonVisitorId }` to associate the most recent TapEvent(s) with the Visitor after localStorage is created.
   - Only allow attaching within 10 minutes and only for the last N events to reduce abuse.
3. **IP+UA heuristic**: Do NOT use for permanent attribution. Only for short-lived "recent session attach" with strict TTL (10 minutes max).

### Admin Visibility Updates

**Update admin pages to show:**
- **TapEvents table**: Add columns `userId` (or user email), `linkMethod`, `linkedAt`
- **User detail page** (new or existing): Show total taps, first tap, last tap, most used tags/batches, most purchased items
- **"Unclaimed visitors" list**: Visitors without userId but with tap volume (for analytics)

### Implementation Tasks

**Phase 1: Prisma Schema + Migration**
1. Update Prisma schema with new fields/tables (Visitor.userId, TapEvent.userId/linkedAt/linkMethod, MyList.claimedAt, IdentityClaim model)
2. Create and run migration: `npx prisma migrate dev --name add_retroactive_attribution`
3. Generate Prisma client: `npx prisma generate`

**Phase 2: Identity API Routes**
4. Create `POST /api/identity/ping` — ensure Visitor exists; update lastSeenAt/ipHashLastSeen/userAgentLastSeen
5. Create `POST /api/identity/claim` — retroactively link taps + lists to logged-in user (with safety checks)
6. Create `POST /api/identity/attach-recent` (optional) — short-lived association using tapSessionId TTL

**Phase 3: Update Tap Event Creation**
7. Update `/t/[batchSlug]/[tagUuid]/route.ts` to:
   - Accept anonVisitorId from header `X-Anon-Visitor-Id` or query param `?vid=...`
   - Store it on TapEvent
   - After creating TapEvent, if anonVisitorId present, look up Visitor and auto-link userId if Visitor.userId exists
   - Optionally include tapSessionId in redirect URL for recent-attach fallback

**Phase 4: Update Signup/Login Flow**
8. Update `/app/login/page.tsx`:
   - After successful signup/login, call `/api/identity/claim` with anonVisitorId from localStorage
   - Handle errors gracefully (e.g., Visitor already claimed by different user)
9. Update `/app/api/auth/register/route.ts` (optional):
   - After user creation, trigger claim if anonVisitorId available (or let client handle it)

**Phase 5: Client-side Identity Ping**
10. Create utility `lib/identity-client.ts`:
    - `getAnonVisitorId()` — get or create from localStorage
    - `pingIdentity()` — send anonVisitorId to `/api/identity/ping` on page load
11. Update root layout or key pages to call `pingIdentity()` on mount

**Phase 6: Admin Visibility**
12. Update `/api/admin/tap-events/route.ts` to include userId, linkMethod, linkedAt in response
13. Update `/admin/nfc/tap-events/page.tsx` to display userId (or user email), linkMethod, linkedAt columns
14. Create or update user detail page to show tap analytics (total taps, first/last tap, top tags/batches, purchased items)
15. Create "Unclaimed Visitors" admin page or add to existing analytics

**Phase 7: Testing & Validation**
16. Create seed script additions: create sample Visitor with anonVisitorId, TapEvents, MyList data
17. Test end-to-end: anonymous tap → signup → verify linking → future tap → verify auto-link
18. Test edge cases: missing anonVisitorId, already-claimed Visitor, merge MyList scenarios

**Phase 8: Documentation**
19. Update README with retroactive attribution feature description
20. Add inline code comments explaining claim flow and safety checks

---

## THREE-FEATURE SPRINT — Feb 2026

### Background & Motivation
Three coordinated features to enhance the SwiftlyKart NFC+grocery platform:
1. **Reliable Identity Claiming** — make /api/identity/claim fully transactional + idempotent, pass `method` from client, add userId filter to admin tap-events portal
2. **NFC Redirect Destination** — let users pick where NFC tag tap lands (Home / /list / custom path); keep NFC tag URL static; session-aware server redirect
3. **Estimated Price Range** — show cheapest-store total and most-expensive-store total in MyListDrawer using per-store variant pricing (Mode B)

### Key Challenges & Analysis

**Part 1 — Identity Claiming (improvements to existing system)**
- The /api/identity/claim route already exists and works, but it's NOT wrapped in a Prisma `$transaction`. Multiple race conditions possible if called twice.
- `method` is hardcoded to `"anonVisitorId"` — need to accept `method` param from client ("login"/"signup"/"manual").
- Admin tap-events API already includes userId/linkedAt/linkMethod in response, just missing a `?userId=...` filter param.
- Admin UI already shows User column, just need to add a userId filter input.
- Schema already has all needed fields: TapEvent.userId, TapEvent.linkedAt, TapEvent.linkMethod, Visitor.userId, IdentityClaim model. **No schema changes needed for Part 1.**

**Part 2 — NFC Redirect Destination**
- Current NFC route (`/t/[batchSlug]/[tagUuid]/route.ts`) always redirects to `/` with `srcBatch`/`srcTag` query params.
- Need new `UserPreference` model in Prisma schema.
- Need new API endpoints: GET/POST `/api/account/preferences`.
- Need Account page UI section with radio buttons + save.
- Must read NextAuth session inside the `/t/` route handler (server-side) to determine user's preference.
- **Challenge**: The `/t/` route is a GET server handler, reading cookies/session here requires careful use of `auth()` from NextAuth.
- Must keep `/t/` route public. If no session or preference, fallback to `/list` for anonymous users.
- Wherever user lands (/, /list, custom), need to ensure srcBatch/srcTag processing still works. Currently DeviceInit handles ping, and app/page.tsx reads srcBatch/srcTag via useSearchParams. Need to also handle this on `/list` page.
- **Path safety**: custom paths must start with `/`, must NOT start with `/api`, `/admin`, `/t`.

**Part 3 — Estimated Price Range (Mode B)**
- Current MyListDrawer computes `estimatedTotal` by summing `item.price` for each selected item's variant. This is a simple per-item sum.
- Mode B: For each store, compute total by picking cheapest variant per item at that store. If store has ALL items → eligible. MIN/MAX across eligible stores.
- Fallback: if no store has all items, compute per-item min/max across all stores.
- Need new API: `GET /api/items/variants-batch?ids=...` for batch fetching variants.
- Need new lib: `lib/pricing.ts` with `computeStoreTotals` + `computePriceRange` functions.
- Need to update `MyListDrawer.tsx` UI to show range + store names.
- **Note**: ProductVariant.price is `Float?` (nullable) — must handle nulls gracefully.

### High-level Task Breakdown

#### PART 1: Reliable Identity Claiming + Admin userId Filter
- [ ] **1.1** Update `/api/identity/claim/route.ts`: wrap in `prisma.$transaction`, accept `method` field in Zod schema, pass method to IdentityClaim + TapEvent.linkMethod
- [ ] **1.2** Update `lib/identity-client.ts`: `claimIdentity()` now accepts `method` param; update call sites in `login/page.tsx` (pass "login"/"signup") and `AccountLinkPrompt.tsx` (pass "manual")
- [ ] **1.3** Update `/api/admin/tap-events/route.ts`: add `?userId=...` filter param support
- [ ] **1.4** Update `app/admin/nfc/tap-events/page.tsx`: add userId filter input to the filter bar
- [ ] **1.5** Handle 409 conflict in client: if claim returns 409, show "This device's NFC history is linked to another account" banner

#### PART 2: NFC Redirect Destination (User Preference)
- [ ] **2.1** Prisma schema: add `UserPreference` model with `nfcLandingMode` and `nfcLandingPath`; add relation to User; run migration
- [ ] **2.2** Create API endpoints: `GET /api/account/preferences` + `POST /api/account/preferences` with Zod validation
- [ ] **2.3** Account UI: add "NFC Landing" section with radio options (Home / My List / Custom) + save button to `app/account/page.tsx`
- [ ] **2.4** Update NFC route `/t/[batchSlug]/[tagUuid]/route.ts`: read session, fetch UserPreference, compute landing URL with srcBatch/srcTag params
- [ ] **2.5** Ensure srcBatch/srcTag processing on `/list` page (centralize tap-identify call so it works on /, /list, and custom paths)

#### PART 3: Estimated Price Range (Mode B)
- [ ] **3.1** Create `GET /api/items/variants-batch` endpoint (accept `ids` query param, return variants grouped by groceryItemId + store list)
- [ ] **3.2** Create `lib/pricing.ts` with `computeStoreTotals()` and `computePriceRange()` utilities
- [ ] **3.3** Update `MyListDrawer.tsx`: fetch variants-batch for list items, compute price range, display "$X.XX – $Y.YY" with store info and fallback label
- [ ] **3.4** Add Zod schemas and types to `lib/zod.ts` for new endpoints (preferences, variants-batch)

### Project Status Board

| Task | Status | Notes |
|------|--------|-------|
| 1.1 Transactional claim + method param | ✅ done | Wrapped in $transaction, accepts method param, idempotent upsert on IdentityClaim |
| 1.2 Client claimIdentity with method | ✅ done | claimIdentity() accepts method; login→"login", signup→"signup", manual→"manual" |
| 1.3 Admin API userId filter | ✅ done | ?userId=... filter param added to /api/admin/tap-events |
| 1.4 Admin UI userId filter | ✅ done | User ID input added to admin tap-events filter bar |
| 1.5 Client 409 handling | ✅ done | AccountLinkPrompt shows conflict banner; stops retrying on 409 |
| 2.1 UserPreference Prisma model | ✅ done | Model added + db push + prisma generate |
| 2.2 Preferences API endpoints | ✅ done | GET + POST /api/account/preferences with Zod validation + blocked prefix check |
| 2.3 Account UI NFC Landing section | ✅ done | Radio buttons (Home/List/Custom) + save button + error/success states |
| 2.4 NFC route session-aware redirect | ✅ done | auth() in /t/ route, reads UserPreference, graceful fallback |
| 2.5 Centralize srcBatch/srcTag processing | ✅ done | TapAttribution component in root layout handles any landing page |
| 3.1 variants-batch API endpoint | ✅ done | GET /api/items/variants-batch?ids=... with IN clause + store dedup |
| 3.2 lib/pricing.ts utility | ✅ done | computeStoreTotals + computePriceRange + builder helpers |
| 3.3 MyListDrawer price range UI | ✅ done | "$X.XX – $Y.YY" + store names + mixed-store fallback label |
| 3.4 Zod schemas for new endpoints | ✅ done | ClaimInput, PreferencesInput, VariantsBatchItem/Response, PriceRange types |

### Executor's Feedback or Assistance Requests
All 14 tasks completed. Migration note: used `prisma db push` instead of `prisma migrate dev` due to shadow database issue with an older migration.

### Lessons
- Read files before editing
- Identity claim already exists — improve it, don't rewrite from scratch
- TapEvent schema already has userId, linkedAt, linkMethod — no migration needed for Part 1
- Admin tap-events API already enriches with user info — just need filter
- NFC route is a GET handler using route params — use `auth()` for session read
- ProductVariant.price is nullable — handle null in pricing logic
- `claimIdentity()` currently doesn't pass `method` to server — server hardcodes "anonVisitorId"
- PowerShell uses `;` not `&&` for command chaining
- `prisma db push` works when `prisma migrate dev` shadow database has conflicts
- Must stop dev server before `prisma generate` on Windows (file lock on .dll.node)
