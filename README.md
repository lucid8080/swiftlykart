# 🛒 Grocery List PWA

A mobile-first Progressive Web App for managing grocery lists with clickable tiles, PIN-based sharing, and NFC tag support.

## Features

- 📱 **Mobile-First Design** - Optimized for phones with responsive desktop support
- 🎯 **Tile-Based Selection** - Tap items to add/remove from your list
- 🔐 **PIN Access** - Share lists via 4-digit PIN codes
- 📲 **NFC Support** - Scan NFC tags to instantly load lists
- 🌙 **Dark Mode** - Automatic theme switching with manual override
- 📴 **Offline Support** - Works without internet via service worker caching
- ⚡ **Optimistic UI** - Instant feedback with server sync

## Tech Stack

- **Frontend**: React 19, Next.js 15 (App Router), TypeScript 5
- **Styling**: Tailwind CSS 4, Lucide Icons
- **Backend**: Next.js Route Handlers
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js v5 (beta) with Credentials provider
- **Validation**: Zod schemas

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd grocery-list-pwa
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Copy `env.example.txt` to `.env.local`:
   ```bash
   cp env.example.txt .env.local
   ```
   
   Configure these variables:
   ```env
   # Database (PostgreSQL)
   DATABASE_URL="postgresql://user:password@localhost:5432/grocery_list?schema=public"
   
   # NextAuth Configuration
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-super-secret-key-at-least-32-characters-long"
   
   # PIN Security Pepper (used for SHA256 lookup hash)
   PIN_PEPPER="your-pin-pepper-secret-value"
   
   # Optional: Admin emails (comma-separated)
   ADMIN_EMAILS="admin@example.com"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   pnpm prisma generate
   
   # Run migrations
   pnpm prisma migrate dev
   
   # Seed with grocery items
   pnpm prisma db seed
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### PWA Icons

Replace the placeholder icons in `public/icons/` with proper PNG files:

- `icon-192.png` (192x192)
- `icon-192-maskable.png` (192x192 with 10% safe zone padding)
- `icon-512.png` (512x512)
- `icon-512-maskable.png` (512x512 with 10% safe zone padding)

Use tools like [Maskable.app](https://maskable.app/editor) or [PWA Builder](https://www.pwabuilder.com/imageGenerator) to generate these.

## How It Works

### Anonymous Device Persistence

Users can use the app without creating an account:

1. **First Visit**: A unique device ID (UUID) is generated
2. **Storage**: The ID is stored in both `localStorage` and a cookie (`g_device`)
3. **List Creation**: A grocery list is automatically created and linked to the device
4. **Persistence**: The list persists across sessions on the same device/browser

When a user creates an account:
- Their device list is merged into their account
- Future visits on that device use the account list
- Other devices can sign in to access the same list

### PIN Access System

PINs allow sharing lists without accounts:

1. **Creating a PIN**: Authenticated users can set a 4-digit PIN in Account settings
2. **Security**: 
   - PINs are stored using both SHA256 (for lookup) and bcrypt (for verification)
   - The SHA256 hash uses a server-side pepper for additional security
   - Rate limiting prevents brute-force attacks (5 attempts per 15 minutes)
3. **Using a PIN**: Enter at `/pin` or include in URL as `?pin=1234`

### NFC Tag Integration

Write URLs to NFC tags for instant list access:

#### URL Formats

1. **With PIN** (recommended for shared lists):
   ```
   https://yourdomain.com/?pin=1234
   ```
   
2. **Device-based** (for personal use):
   ```
   https://yourdomain.com/
   ```

#### Writing NFC Tags

Use any NFC writing app:
- **Android**: NFC Tools, NFC TagWriter
- **iOS**: NFC TagWriter by NXP

Steps:
1. Open NFC writing app
2. Select "Write" > "URL"
3. Enter your grocery list URL with PIN
4. Tap an NFC tag to write

#### Scanning Behavior

When a user scans an NFC tag:
1. Phone opens the URL in browser
2. If PIN is in URL, it's automatically verified
3. On success, the list loads immediately
4. URL is cleaned (PIN removed) for security

### PWA Installation

#### Android / Chrome

1. Chrome shows an "Add to Home Screen" banner automatically
2. Users can also install via browser menu (⋮ > Install app)
3. The app runs in standalone mode with full-screen UI

#### iOS Safari

iOS doesn't support automatic install prompts, so:
1. The app shows a "How to add to Home Screen" modal
2. Instructions guide users through Share > Add to Home Screen
3. Dismissal is remembered for 7 days

#### Features When Installed

- Full-screen UI (no browser chrome)
- App icon on home screen
- Offline access via service worker
- Faster load times from cache

## API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/items` | Get all categories and items |
| GET | `/api/list` | Get current user's list |
| POST | `/api/list/toggle` | Toggle item selection |
| POST | `/api/list/clear` | Clear all selected items |
| POST | `/api/pin/resolve` | Verify PIN and get list access |

### Authenticated

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/account/pin` | Set PIN for user's list |
| DELETE | `/api/account/pin` | Remove PIN |
| POST | `/api/device/link` | Link device to account |

### Admin Only

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/categories` | Manage categories |
| PUT/DELETE | `/api/admin/categories/[id]` | Update/delete category |
| GET/POST | `/api/admin/items` | Manage grocery items |
| PUT/DELETE | `/api/admin/items/[id]` | Update/delete item |

## Project Structure

```
├── app/
│   ├── api/                 # API route handlers
│   │   ├── auth/            # NextAuth endpoints
│   │   ├── admin/           # Admin CRUD endpoints
│   │   ├── list/            # List management
│   │   └── pin/             # PIN resolution
│   ├── account/             # Account settings page
│   ├── admin/               # Admin panel
│   ├── login/               # Login/register page
│   ├── pin/                 # PIN entry page
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   ├── manifest.ts          # PWA manifest
│   └── page.tsx             # Home page
├── components/
│   ├── AddToHomeBanner.tsx  # PWA install prompt
│   ├── CategoryChips.tsx    # Category filter chips
│   ├── DeviceInit.tsx       # Device ID initialization
│   ├── Header.tsx           # App header
│   ├── ItemTile.tsx         # Grocery item tile
│   ├── MyListDrawer.tsx     # Selected items drawer
│   ├── Providers.tsx        # Context providers
│   ├── SearchInput.tsx      # Search input
│   ├── ServiceWorkerRegister.tsx
│   └── ThemeToggle.tsx      # Theme switcher
├── hooks/
│   ├── useDevice.ts         # Device ID hook
│   └── useList.ts           # List management hook
├── lib/
│   ├── auth.ts              # NextAuth configuration
│   ├── db.ts                # Prisma client
│   ├── device.ts            # Device identity utilities
│   ├── list.ts              # List resolution logic
│   ├── pin.ts               # PIN hashing/verification
│   ├── utils.ts             # Utility functions
│   └── zod.ts               # Zod schemas
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed data
└── public/
    ├── icons/               # PWA icons
    └── sw.js                # Service worker
```

## Development

### Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Database commands
pnpm prisma migrate dev    # Run migrations
pnpm prisma db seed        # Seed data
pnpm prisma studio         # Open database GUI

# Linting
pnpm lint
```

### Adding New Grocery Items

1. Open Prisma Studio: `pnpm prisma studio`
2. Navigate to GroceryItem table
3. Add items with name, icon (emoji), and category

Or use the admin panel at `/admin/items` (requires admin role).

### Admin Access

Set admin emails in environment:
```env
ADMIN_EMAILS="admin@example.com,another@example.com"
```

Users with these emails automatically get admin role on sign in.

## Deployment

### Vercel (Recommended)

See **[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)** for a complete step-by-step guide.

**Quick Summary:**
1. Push to GitHub ✅ (already done)
2. Import project to Vercel
3. Set up production PostgreSQL database
4. Configure environment variables
5. Run database migrations
6. Deploy!

### Docker

```dockerfile
# Example Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

### Environment Variables for Production

Ensure these are set:
- `DATABASE_URL` - Production PostgreSQL connection string
- `NEXTAUTH_URL` - Your production URL (e.g., https://groceries.example.com)
- `NEXTAUTH_SECRET` - Strong random secret (generate with `openssl rand -base64 32`)
- `PIN_PEPPER` - Unique secret for PIN hashing

## License

MIT
