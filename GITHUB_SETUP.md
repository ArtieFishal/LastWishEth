# GitHub Setup for Auto-Deployment

## ✅ Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `lastwisheth` (or any name you prefer)
3. Description: "LastWish.eth - Crypto Inheritance Instructions Generator"
4. Choose: **Private** (recommended) or **Public**
5. **DO NOT** check "Initialize with README" (you already have code)
6. Click **"Create repository"**

## ✅ Step 2: Copy Your Repository URL

After creating the repo, GitHub will show you a URL like:
- `https://github.com/YOUR_USERNAME/lastwisheth.git`

**Copy this URL** - you'll need it in the next step!

## ✅ Step 3: Connect and Push (Run These Commands)

Open your terminal and run:

```bash
cd ~/Downloads/lastwisheth

# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/lastwisheth.git

# Push to GitHub
git push -u origin main
```

**Note:** You'll be prompted for your GitHub username and password (or personal access token).

## ✅ Step 4: Connect Netlify to GitHub

1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Click **"Deploy with GitHub"**
4. Authorize Netlify to access your GitHub (if first time)
5. Select your `lastwisheth` repository
6. Netlify will auto-detect Next.js settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
7. Click **"Deploy site"**

## ✅ Step 5: Set Environment Variables in Netlify

1. Go to your site in Netlify dashboard
2. Click **"Site settings"** → **"Environment variables"**
3. Add these variables:
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` = `49fef037b7a144df8d09cb34c87686c3`
   - `MORALIS_API_KEY` = (your Moralis key)
   - `PAYMENT_RECEIVER_ADDRESS` = `0x016ae25Ac494B123C40EDb2418d9b1FC2d62279b`
4. Click **"Save"**

## ✅ Step 6: Trigger First Deployment

After connecting, Netlify will automatically:
1. Build your site
2. Deploy it
3. Give you a new URL (or use your existing one)

## 🎉 Done! Auto-Deployment is Now Active

From now on:
- Make changes to your code
- Run: `git add . && git commit -m "Your message" && git push`
- Netlify will **automatically** detect the push and deploy in ~2-3 minutes
- No more manual refreshes needed!

## Quick Daily Workflow

```bash
# After making changes:
git add .
git commit -m "Description of changes"
git push

# Netlify auto-deploys! 🚀
```

