# 🗄️ Running Database Migrations for Production

## Important: Run Migrations LOCALLY, Not on Vercel

You run `npx prisma migrate deploy` **on your local machine**, but it connects to your **production database** (Neon).

## Step-by-Step Instructions

### Option 1: Using Your Existing .env File (Easiest)

If your `.env` file already has the production DATABASE_URL (your Neon database):

```powershell
# Navigate to project directory
cd "D:\SAAS project\re-upper"

# Make sure DATABASE_URL in .env points to your Neon production database
# (It should already be set from your .env file)

# Run migrations against production database
npx prisma migrate deploy
```

This will:
- ✅ Read `DATABASE_URL` from your `.env` file
- ✅ Connect to your Neon production database
- ✅ Apply all pending migrations
- ✅ Create all tables and schema

### Option 2: Pull Environment Variables from Vercel

If you've already added `DATABASE_URL` to Vercel:

```powershell
# Navigate to project directory
cd "D:\SAAS project\re-upper"

# Pull environment variables from Vercel
vercel env pull .env.production

# This creates a .env.production file with your Vercel env vars
# Now run migrations using that file
$env:DATABASE_URL = (Get-Content .env.production | Select-String "DATABASE_URL").ToString().Split("=")[1]
npx prisma migrate deploy
```

Or manually:
```powershell
# Open .env.production and copy the DATABASE_URL value
# Then set it temporarily:
$env:DATABASE_URL = "postgresql://neondb_owner:npg_TNoaLJA5Erk7@ep-polished-dream-ait8hcbh-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Run migrations
npx prisma migrate deploy
```

### Option 3: Set DATABASE_URL Temporarily

```powershell
cd "D:\SAAS project\re-upper"

# Set DATABASE_URL for this session only
$env:DATABASE_URL = "your-neon-database-connection-string-here"

# Verify it's set
echo $env:DATABASE_URL

# Run migrations
npx prisma migrate deploy
```

## What Happens When You Run Migrations

1. **Prisma checks** which migrations have already been applied to your database
2. **Applies only new migrations** that haven't been run yet
3. **Creates/updates tables** according to your `prisma/schema.prisma`
4. **Records migration history** in a `_prisma_migrations` table

## Verify Migrations Worked

After running migrations, you can verify:

```powershell
# Check database connection
npx prisma db pull

# Or open Prisma Studio to see your tables
npx prisma studio
# This will open a browser at http://localhost:5555
```

## Important Notes

⚠️ **Never run `prisma migrate dev` on production!**
- `prisma migrate dev` - For development only (creates new migrations)
- `prisma migrate deploy` - For production (applies existing migrations)

⚠️ **Make sure you're pointing to the RIGHT database!**
- Double-check your `DATABASE_URL` before running migrations
- You don't want to accidentally modify a development database

## Troubleshooting

### Error: "Migration X is in a failed state"
```powershell
# Mark migration as rolled back (if safe to do so)
npx prisma migrate resolve --rolled-back "migration_name"
```

### Error: "Database connection failed"
- Check your `DATABASE_URL` is correct
- Verify Neon database is running and accessible
- Ensure connection string includes `?sslmode=require`

### Error: "Migration X has already been applied"
- This is normal if migrations were already run
- Prisma will skip already-applied migrations

## After Migrations

Once migrations are complete:
1. ✅ Your production database schema is ready
2. ✅ You can deploy to Vercel: `vercel --prod`
3. ✅ Your app will connect to the database automatically

## Alternative: Use Prisma Migrate Deploy in Vercel Build

You can also add a build script to run migrations during Vercel deployment, but this is **not recommended** because:
- ❌ Slower deployments
- ❌ Harder to debug migration failures
- ❌ Less control over when migrations run

**Better approach:** Run migrations manually before deploying (as shown above).
