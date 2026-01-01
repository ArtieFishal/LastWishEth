# Deploying LastWish to Netlify

## Prerequisites

1. A Netlify account (sign up at https://www.netlify.com/)
2. Your environment variables ready:
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
   - `MORALIS_API_KEY`
   - `PAYMENT_RECEIVER_ADDRESS`

## Deployment Steps

### Option 1: Deploy via Netlify CLI (Recommended)

1. **Install Netlify CLI** (if not already installed):
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Initialize the site** (from the project root):
   ```bash
   cd ~/Downloads/lastwisheth
   netlify init
   ```
   - Choose "Create & configure a new site"
   - Follow the prompts to name your site

4. **Set environment variables**:
   ```bash
   netlify env:set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID "your_project_id"
   netlify env:set MORALIS_API_KEY "your_moralis_key"
   netlify env:set PAYMENT_RECEIVER_ADDRESS "lastwish.eth"
   ```

5. **Deploy**:
   ```bash
   netlify deploy --prod
   ```

### Option 2: Deploy via Netlify Dashboard (Git-based)

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Connect to Netlify**:
   - Go to https://app.netlify.com/
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub and select your repository
   - Netlify will auto-detect Next.js settings

3. **Set environment variables**:
   - Go to Site settings → Environment variables
   - Add each variable:
     - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
     - `MORALIS_API_KEY`
     - `PAYMENT_RECEIVER_ADDRESS`

4. **Deploy**:
   - Click "Deploy site"
   - Netlify will build and deploy automatically

### Option 3: Deploy via Netlify Drop (Drag & Drop)

1. **Build the project locally**:
   ```bash
   npm run build
   ```

2. **Go to Netlify Drop**:
   - Visit https://app.netlify.com/drop
   - Drag and drop the `.next` folder
   - **Note**: This method won't work well with API routes. Use Option 1 or 2 instead.

## Important Notes

- **API Routes**: This app uses Next.js API routes, so you need the `@netlify/plugin-nextjs` plugin (already configured in `netlify.toml`)
- **Environment Variables**: Make sure all environment variables are set in Netlify dashboard before deploying
- **WalletConnect**: The `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` must be set for wallet connections to work
- **HTTPS**: Netlify provides HTTPS automatically, which is required for Xverse wallet to work properly

## After Deployment

1. Your site will be available at `https://your-site-name.netlify.app`
2. Test wallet connections - they should work better on HTTPS than localhost
3. Xverse wallet should now inject properly since you're on a public HTTPS URL

## Troubleshooting

- If build fails, check the build logs in Netlify dashboard
- Make sure all environment variables are set correctly
- Verify Node.js version (should be 20, configured in netlify.toml)
- Check that `@netlify/plugin-nextjs` is installed (it will be auto-installed during build)

