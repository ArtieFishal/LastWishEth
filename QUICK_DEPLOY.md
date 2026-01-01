# Quick Netlify Deployment - Dashboard Method

Since the CLI needs interactive input, let's use the Netlify Dashboard (faster and easier):

## 🚀 Steps (5 minutes):

### 1. Build the project (if not already built):
```bash
cd ~/Downloads/lastwisheth
npm run build
```

### 2. Go to Netlify Dashboard:
- Open: https://app.netlify.com/
- Click: **"Add new site"** → **"Deploy manually"**

### 3. Deploy:
- Drag and drop the **`.next`** folder onto the deploy area
- Wait for upload to complete

### 4. Set Environment Variables:
- Go to: **Site settings** → **Environment variables**
- Click **"Add variable"** and add these three:

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID = 49fef037b7a144df8d09cb34c87686c3
MORALIS_API_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjcwNjAzOGEwLTc1YzktNDQ0Ny05YTI5LTY5NGIxMDZlMTM0NiIsIm9yZ0lkIjoiNDY0MTgwIiwidXNlcklkIjoiNDc3NTQ1IiwidHlwZUlkIjoiNTY1Y2RlNzUtMDFjYi00M2UxLThlYTgtZTY4NWI0N2EyNjgwIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NTQ3NTU2MjcsImV4cCI6NDkxMDUxNTYyN30.Rru_OTDV_nI01CSLaDjktBZaPL7DhveYKS_ZKbM6738
PAYMENT_RECEIVER_ADDRESS = lastwish.eth
```

### 5. Redeploy:
- After setting environment variables, go to **"Deploys"** tab
- Click **"Trigger deploy"** → **"Deploy site"**

## ✅ That's it!

Your site will be live at: `https://your-site-name.netlify.app`

**Note:** For Next.js with API routes, you might need to:
- Go to **Site settings** → **Build & deploy**
- Set **Build command:** `npm run build`
- Set **Publish directory:** `.next`
- Install the **@netlify/plugin-nextjs** plugin (Netlify should auto-detect it)

---

**Alternative:** If you prefer CLI, you can run `netlify init` and answer the prompts interactively.

