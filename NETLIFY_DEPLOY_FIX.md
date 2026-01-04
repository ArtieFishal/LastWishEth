# Netlify Deploy Fix - "Preparing repo" Error

## Quick Fix (Try This First)

1. **Clear cache and retry:**
   - Go to Netlify Dashboard → Your Site → Deploys
   - Click "Trigger deploy" → "Clear cache and deploy site"
   - This often fixes transient repo/prep errors

## If That Doesn't Work

### Option 1: Reconnect Repository (Most Common Fix)

1. Go to **Site settings** → **Build & deploy** → **Repository**
2. Click **"Reconnect repository"** or **"Change repository"**
3. Re-authorize Netlify to access your GitHub repository
4. This refreshes authentication tokens
5. Trigger a new deploy

### Option 2: Check Repository Access

1. Verify the repository is **public** or Netlify has access:
   - Go to GitHub → Your repository → Settings → Collaborators
   - Ensure Netlify app has access (if private repo)
2. If private, you may need to:
   - Add Netlify as a collaborator, OR
   - Use a deploy key, OR
   - Make the repository public

### Option 3: Check for Hidden Issues

The repository has been checked and is clean:
- ✅ No large files (>100MB)
- ✅ No Git LFS
- ✅ No submodules
- ✅ `.next` directory properly ignored
- ✅ Repository size: 6.13 MiB (normal)

### Option 4: Manual Deploy Test

Test if the repository can be cloned:

```bash
# Test clone (should work)
git clone https://github.com/ArtieFishal/LastWishEth.git test-clone
cd test-clone
rm -rf test-clone
```

If this fails, there's a repository access issue.

## Next Steps

1. **Try the quick fix first** (clear cache and retry)
2. **If still failing**, reconnect the repository
3. **Check the full deploy log** in Netlify for specific error messages
4. **Share the exact error** from the "Preparing repo" section if it persists

## Common Causes (Already Checked)

- ❌ Large files - None found
- ❌ Git LFS - Not configured
- ❌ Submodules - None found
- ✅ Repository is clean and ready

The issue is most likely:
- Transient Netlify service issue (retry fixes it)
- Authentication token expired (reconnect fixes it)

