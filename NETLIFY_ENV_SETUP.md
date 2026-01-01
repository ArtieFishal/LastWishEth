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
netlify env:set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID "49fef037b7a144df8d09cb34c87686c3"
netlify env:set MORALIS_API_KEY "your-moralis-key-here"
netlify env:set PAYMENT_RECEIVER_ADDRESS "0x016ae25Ac494B123C40EDb2418d9b1FC2d62279b"

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
   - **Value**: `49fef037b7a144df8d09cb34c87686c3`
   - **Scopes**: Select "All scopes" or "Production"
   - Click **"Save"**
6. Repeat for each variable

### 📋 Required Environment Variables

Your LastWish.eth app needs these variables:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID | `49fef037b7a144df8d09cb34c87686c3` |
| `MORALIS_API_KEY` | Moralis API key for asset fetching | `eyJhbGci...` |
| `PAYMENT_RECEIVER_ADDRESS` | Payment recipient address | `0x016ae25Ac494B123C40EDb2418d9b1FC2d62279b` |

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

