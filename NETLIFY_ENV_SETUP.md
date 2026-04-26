# Netlify Environment Variables Setup

## Best Methods (Ranked)

### 🥇 Method 1: Netlify CLI (Recommended - Automated)

**Easiest and fastest way!**

1. **Install Netlify CLI** (if not already):
   ```bash
   npm install -g netlify-cli
   ```

2. **Link your site** (if not already linked):
   ```bash
   cd ~/Downloads/lastwisheth
   netlify link
   ```
   - Select your site from the list
   - Or create a new site

3. **Run the setup script**:
   ```bash
   chmod +x setup-netlify-env.sh
   ./setup-netlify-env.sh
   ```

   This automatically reads your `.env.local` and sets all variables in Netlify!

### 🥈 Method 2: Netlify CLI Manual (One-by-one)

If you prefer to set them manually:

```bash
# Link to Netlify (if not already)
netlify link

# Set each variable
netlify env:set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID "your-walletconnect-project-id"
netlify env:set MORALIS_API_KEY "your-moralis-key-here"

# Optional
netlify env:set HELIUS_API_KEY "your-helius-key-here"
netlify env:set NEXT_PUBLIC_SOLANA_RPC_URL "https://api.mainnet-beta.solana.com"
netlify env:set UNSTOPPABLE_API_KEY "your-unstoppable-key-here"
netlify env:set PAYMENT_RECEIVER_ADDRESS "lastwish.eth"

# Verify
netlify env:list
```

### 🥉 Method 3: Netlify Dashboard (UI - Manual)

1. Go to https://app.netlify.com
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Click **"Add a variable"**
5. Add each variable:
   - **Key**: `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
   - **Value**: your project ID from [Reown Cloud](https://cloud.reown.com)
   - **Scopes**: Select "All scopes" or "Production"
   - Click **"Save"**
6. Repeat for each variable in `.env.example`

### 📋 Environment Variables

See `.env.example` in the repo for the canonical, commented list. Below is a Netlify-focused summary.

#### Required for production-critical flows

These must be set or the EVM portfolio API and WalletConnect QR flow will be broken / degraded:

| Variable | Used by | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | `lib/wagmi.ts` | Without this, WalletConnect QR will not initialize. |
| `MORALIS_API_KEY` | `app/api/portfolio/evm/route.ts` | Without this, the EVM portfolio API returns a clean configuration error (no crash). |

#### Optional (recommended for full feature set)

| Variable | Used by | Notes |
|----------|---------|-------|
| `HELIUS_API_KEY` | `app/api/portfolio/solana/route.ts` | Upgrades Solana asset discovery. Falls back to public RPC if absent. |
| `NEXT_PUBLIC_SOLANA_RPC_URL` / `SOLANA_RPC_URL` | `app/api/portfolio/solana/route.ts` | Override default Solana RPC URL. Defaults to `https://api.mainnet-beta.solana.com`. |
| `UNSTOPPABLE_API_KEY` | Unstoppable Domains resolution | Optional name resolution. |
| `PAYMENT_RECEIVER_ADDRESS` | `app/api/invoice/create/route.ts`, `app/api/invoice/status/route.ts` | Accepts `0x...` or ENS. Defaults to the lastwish.eth resolved address. |

#### Readiness check

You can verify which required/optional vars are present (locally or in CI) without leaking values:

```bash
npm run check:env
```

The script prints any missing vars and exits non-zero when a required var is missing. It never prints values.

## Quick Reference

### Check current variables:
```bash
netlify env:list
```

### Set a variable:
```bash
netlify env:set VARIABLE_NAME "value"
```

### Delete a variable:
```bash
netlify env:unset VARIABLE_NAME
```

### Import from .env.local (automated):
```bash
./setup-netlify-env.sh
```

## Important Notes

⚠️ **Security:**
- Never commit `.env.local` to git (it's in `.gitignore`)
- Environment variables in Netlify are encrypted
- Use different values for production vs development if needed

💡 **Tips:**
- Variables starting with `NEXT_PUBLIC_` are exposed to the browser
- Other variables are server-side only
- Changes to env vars require a new deployment to take effect

## Troubleshooting

**"Command not found: netlify"**
```bash
npm install -g netlify-cli
```

**"Not linked to a Netlify site"**
```bash
netlify link
```

**Variables not working after setting?**
- Trigger a new deployment: `netlify deploy --prod`
- Or push to git (if auto-deploy is set up)

