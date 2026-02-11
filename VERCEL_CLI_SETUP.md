# 🚀 Vercel CLI Setup Guide

Your project is already linked to Vercel! Here's how to complete the setup.

## ✅ Already Done
- ✅ Vercel CLI installed and logged in
- ✅ Project linked: `lucid8080s-projects/re-upper`
- ✅ GitHub repository connected

## 📝 Next Steps

### 1. Add Environment Variables

Run these commands and paste the values when prompted:

```powershell
# 1. DATABASE_URL (use your Neon database URL from .env)
vercel env add DATABASE_URL production

# 2. NEXTAUTH_SECRET (use the generated value below)
vercel env add NEXTAUTH_SECRET production

# 3. PIN_PEPPER (use the generated value below)
vercel env add PIN_PEPPER production

# 4. IP_HASH_SALT (use the generated value below)
vercel env add IP_HASH_SALT production

# 5. NEXT_PUBLIC_APP_DOMAIN (will be: your-project.vercel.app - update after deploy)
vercel env add NEXT_PUBLIC_APP_DOMAIN production

# 6. NEXTAUTH_URL (will be: https://your-project.vercel.app - update after deploy)
vercel env add NEXTAUTH_URL production

# 7. ADMIN_EMAILS (optional - your email for admin access)
vercel env add ADMIN_EMAILS production
```

### Generated Secrets (Save These!)

```
NEXTAUTH_SECRET: FRIA3elYX0nlWRGkVFw6nJiwTr9gDo2nkVTGDenquOA=
PIN_PEPPER: Hn3fQcSpDzTY6JXsbqtg7V9EM1amWx2O
IP_HASH_SALT: eHGj7ZrlvBR46ywioQzhMEJ5xIgOd8TF
```

**For DATABASE_URL:** Copy from your `.env` file (the Neon database connection string)

**For NEXTAUTH_URL and NEXT_PUBLIC_APP_DOMAIN:** 
- First deploy will give you a URL like `https://re-upper-xxx.vercel.app`
- Add placeholder values now (e.g., `https://re-upper.vercel.app`)
- After first deploy, update with the actual URL

### 2. Run Database Migrations

Before deploying, set up your production database schema:

```powershell
# Pull environment variables locally
vercel env pull .env.production

# Set DATABASE_URL from the pulled file (or manually)
$env:DATABASE_URL = "your-neon-database-url-here"

# Run migrations
npx prisma migrate deploy
```

### 3. Deploy to Production

```powershell
# Deploy to production
vercel --prod
```

Or deploy to preview first:
```powershell
vercel
```

### 4. Update URLs After First Deploy

After the first deployment, Vercel will give you a URL. Update these environment variables:

```powershell
# Update NEXTAUTH_URL
vercel env rm NEXTAUTH_URL production
vercel env add NEXTAUTH_URL production
# Enter: https://your-actual-url.vercel.app

# Update NEXT_PUBLIC_APP_DOMAIN
vercel env rm NEXT_PUBLIC_APP_DOMAIN production
vercel env add NEXT_PUBLIC_APP_DOMAIN production
# Enter: your-actual-url.vercel.app
```

## 🔍 Useful Commands

```powershell
# List all environment variables
vercel env ls

# View a specific variable
vercel env pull .env.production

# Remove a variable
vercel env rm VARIABLE_NAME production

# View deployment logs
vercel logs

# Open project in browser
vercel open
```

## 🐛 Troubleshooting

### Build fails with "Prisma Client not generated"
- This should be handled by the `postinstall` script
- Check build logs in Vercel dashboard

### Database connection errors
- Verify `DATABASE_URL` is correct
- Ensure Neon database allows connections (check Neon dashboard)
- Connection string should include `?sslmode=require`

### Environment variables not working
- Variables are injected at build time
- After adding variables, redeploy: `vercel --prod`

## 📚 Next Steps After Deployment

1. ✅ Test the deployed site
2. ✅ Create an admin account
3. ✅ Test NFC tag routes (`/t/[batch]/[tag]`)
4. ✅ Set up custom domain (optional)
