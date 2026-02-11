# 🚀 Deploying to Vercel - Step-by-Step Guide

This guide will walk you through deploying your Grocery List PWA to Vercel.

## Prerequisites

- ✅ GitHub repository pushed (already done: `https://github.com/lucid8080/swiftlykart.git`)
- ✅ Vercel account (sign up at [vercel.com](https://vercel.com) if needed)
- ✅ Production PostgreSQL database (see options below)

---

## Step 1: Set Up Production Database

You need a PostgreSQL database for production. Here are your options:

### Option A: Vercel Postgres (Recommended - Easiest)

1. Go to your Vercel dashboard
2. Navigate to **Storage** tab
3. Click **Create Database** → Select **Postgres**
4. Choose a name (e.g., `swiftlykart-db`)
5. Select a region closest to your users
6. Click **Create**
7. **Save the connection string** - you'll need it in Step 3

### Option B: External Database (Neon, Supabase, Railway, etc.)

**Neon (Free tier available):**
1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string (format: `postgresql://user:password@host/dbname`)

**Supabase (Free tier available):**
1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string

**Railway:**
1. Sign up at [railway.app](https://railway.app)
2. Create a new PostgreSQL database
3. Copy the connection string from the Variables tab

---

## Step 2: Import Project to Vercel

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Sign in with GitHub (if not already)

2. **Import Project**
   - Click **Add New** → **Project**
   - Select **Import Git Repository**
   - Find and select `lucid8080/swiftlykart`
   - Click **Import**

3. **Configure Project Settings**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

---

## Step 3: Configure Environment Variables

In the Vercel project settings, add these environment variables:

### Required Variables

```env
# Database Connection
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# NextAuth Configuration
NEXTAUTH_URL="https://your-app-name.vercel.app"
NEXTAUTH_SECRET="generate-a-random-32-char-secret"

# PIN Security
PIN_PEPPER="your-random-pin-pepper-secret"

# NFC Tag Analytics
IP_HASH_SALT="your-random-ip-hash-salt-at-least-32-chars"
NEXT_PUBLIC_APP_DOMAIN="your-app-name.vercel.app"

# Optional: Admin Emails (comma-separated)
ADMIN_EMAILS="your-email@example.com"
```

### How to Add Variables in Vercel:

1. In your project settings, go to **Settings** → **Environment Variables**
2. Click **Add New**
3. Add each variable:
   - **Key**: Variable name (e.g., `DATABASE_URL`)
   - **Value**: The actual value
   - **Environment**: Select **Production**, **Preview**, and **Development** (or just Production)
4. Click **Save**

### Generating Secrets:

**NEXTAUTH_SECRET:**
```bash
# On Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Or use online generator:
# https://generate-secret.vercel.app/32
```

**PIN_PEPPER and IP_HASH_SALT:**
- Use any long random string (32+ characters)
- You can use the same generator or create random strings

---

## Step 4: Run Database Migrations

Before your first deployment, you need to set up your production database schema.

### Option A: Using Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Link your project**:
   ```bash
   cd "D:\SAAS project\re-upper"
   vercel link
   ```
   - Select your project when prompted

4. **Pull environment variables** (so migrations can access DATABASE_URL):
   ```bash
   vercel env pull .env.production
   ```

5. **Run migrations**:
   ```bash
   # Set DATABASE_URL from .env.production
   $env:DATABASE_URL = (Get-Content .env.production | Select-String "DATABASE_URL").ToString().Split("=")[1]
   
   # Run migrations
   npx prisma migrate deploy
   ```

   Or manually:
   ```bash
   # Copy DATABASE_URL from .env.production
   # Then run:
   $env:DATABASE_URL="your-production-database-url"
   npx prisma migrate deploy
   ```

### Option B: Using Prisma Studio (Alternative)

1. Set `DATABASE_URL` environment variable locally to your production database
2. Run:
   ```bash
   npx prisma db push
   ```
   ⚠️ **Note**: `db push` is for prototyping. For production, use `migrate deploy` if you have migrations.

### Option C: Manual SQL (If you have migration files)

1. Connect to your production database using a PostgreSQL client
2. Run the SQL from `prisma/migrations/*/migration.sql` files in order

---

## Step 5: Deploy

1. **In Vercel Dashboard:**
   - Go to your project
   - Click **Deploy** (or push to main branch to trigger auto-deploy)

2. **Or push to GitHub:**
   ```bash
   git push origin main
   ```
   Vercel will automatically detect the push and deploy.

3. **Monitor the deployment:**
   - Watch the build logs in Vercel dashboard
   - Check for any errors

---

## Step 6: Verify Deployment

1. **Check the deployment URL:**
   - Vercel provides a URL like `https://swiftlykart-xxx.vercel.app`
   - Visit the URL in your browser

2. **Test key features:**
   - ✅ Home page loads
   - ✅ Can add items to list
   - ✅ Can create account/login
   - ✅ Admin panel works (if you set ADMIN_EMAILS)

3. **Check logs if issues:**
   - Go to **Deployments** → Click on deployment → **Functions** tab
   - Check for any runtime errors

---

## Step 7: Set Up Custom Domain (Optional)

1. In Vercel project settings, go to **Domains**
2. Add your custom domain (e.g., `swiftlykart.com`)
3. Follow DNS configuration instructions
4. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_DOMAIN` environment variables to your custom domain
5. Redeploy

---

## Troubleshooting

### Build Fails: "Prisma Client not generated"

**Solution:** The `postinstall` script should handle this, but if it fails:
- Check that `prisma generate` runs in build logs
- Ensure `DATABASE_URL` is set (even if migrations haven't run yet)

### Database Connection Errors

**Solution:**
- Verify `DATABASE_URL` is correct in Vercel environment variables
- Check database allows connections from Vercel IPs (most cloud DBs do by default)
- Ensure SSL is enabled: add `?sslmode=require` to connection string

### Migrations Not Applied

**Solution:**
- Run `npx prisma migrate deploy` manually (see Step 4)
- Or use `npx prisma db push` for quick setup (not recommended for production long-term)

### NextAuth Errors

**Solution:**
- Ensure `NEXTAUTH_URL` matches your actual deployment URL
- Verify `NEXTAUTH_SECRET` is set and is a strong random string
- Check that `DATABASE_URL` is accessible (NextAuth needs DB for sessions)

### Environment Variables Not Working

**Solution:**
- After adding variables, **redeploy** the project
- Variables are injected at build time, so changes require a new deployment
- Check variable names match exactly (case-sensitive)

---

## Post-Deployment Checklist

- [ ] Database migrations applied successfully
- [ ] Environment variables configured
- [ ] Site loads without errors
- [ ] Can create account and login
- [ ] Can add items to grocery list
- [ ] Admin panel accessible (if applicable)
- [ ] NFC tag routes work (`/t/[batch]/[tag]`)
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active (automatic with Vercel)

---

## Continuous Deployment

Once set up, Vercel will automatically:
- ✅ Deploy on every push to `main` branch
- ✅ Create preview deployments for pull requests
- ✅ Run builds with your environment variables

Just push to GitHub and Vercel handles the rest!

---

## Need Help?

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment/deployment-guide)
