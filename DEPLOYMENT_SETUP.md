# Netlify Auto-Deployment Setup

## Current Issue
Netlify is NOT automatically deploying because:
- No Git remote is configured
- Changes aren't being pushed to a repository
- Netlify needs to be connected to a Git repo for auto-deployment

## How Netlify Auto-Deployment Works

Netlify automatically deploys when you:
1. Push code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Have that repository connected to your Netlify site
3. Netlify watches for pushes and triggers a new build automatically

## Setup Auto-Deployment (Choose One Method)

### Method 1: Connect to GitHub (Recommended)

1. **Create a GitHub repository:**
   ```bash
   cd ~/Downloads/lastwisheth
   git add .
   git commit -m "Initial commit with all features"
   ```

2. **Create a new repo on GitHub:**
   - Go to https://github.com/new
   - Name it `lastwisheth` (or whatever you want)
   - Don't initialize with README (you already have code)
   - Click "Create repository"

3. **Connect your local repo to GitHub:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/lastwisheth.git
   git branch -M main
   git push -u origin main
   ```

4. **Connect Netlify to GitHub:**
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Choose "GitHub"
   - Authorize Netlify to access your GitHub
   - Select your `lastwisheth` repository
   - Netlify will auto-detect Next.js settings
   - Click "Deploy site"

5. **Configure build settings (if needed):**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: `20`

6. **Set environment variables in Netlify:**
   - Go to Site settings → Environment variables
   - Add:
     - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
     - `MORALIS_API_KEY`
     - `PAYMENT_RECEIVER_ADDRESS`

### Method 2: Use Netlify CLI (Current Manual Method)

If you're using Netlify CLI, you need to manually deploy each time:

```bash
# Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

**This is why you have to manually refresh - CLI deployments are manual!**

## After Setting Up Auto-Deployment

Once connected to Git:
1. Make your code changes
2. Commit: `git add . && git commit -m "Your message"`
3. Push: `git push`
4. Netlify automatically detects the push and deploys
5. You'll see the deployment in Netlify dashboard
6. No manual refresh needed - it deploys automatically!

## Quick Commands for Daily Use

```bash
# After making changes:
git add .
git commit -m "Description of changes"
git push

# Netlify will automatically deploy in ~2-3 minutes
```

## Troubleshooting

- **Not deploying?** Check Netlify dashboard → Deploys tab
- **Build failing?** Check build logs in Netlify
- **Environment variables missing?** Add them in Netlify dashboard
- **Still seeing old version?** Hard refresh (Cmd+Shift+R / Ctrl+Shift+R) or clear browser cache

