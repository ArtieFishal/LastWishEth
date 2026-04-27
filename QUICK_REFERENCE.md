# LastWish.eth - Quick Reference Card

**Checkpoint:** `v1.0.0-checkpoint` | **Date:** January 4, 2026

---

## 🎯 Quick Stats

- **Max Wallets:** 20
- **Max Beneficiaries:** 10
- **Standard Price:** $42.00
- **ETH Amount (Standard):** 0.014 ETH

---

## 💰 Pricing

```typescript
// lib/pricing.ts
Standard: $42.00
ETH Price: ~$3,000/ETH
```

---

## 🔑 Environment Variables (Netlify)

```
MORALIS_API_KEY=...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
PAYMENT_RECEIVER_ADDRESS=lastwish.eth
NETLIFY_AUTH_TOKEN=... (optional but recommended)
```

---

## 📁 Key Files

- **Main App:** `app/page.tsx`
- **Pricing Logic:** `lib/pricing.ts`
- **PDF Generator:** `lib/pdf-generator.ts`
- **User Guide:** `app/guide/page.tsx`
- **Config:** `netlify.toml`

---

## 🚀 Deploy Commands

```bash
# Build locally
npm run build

# Test
npm test

# Deploy (auto via Netlify on push)
git push origin main
```

---

## 🔄 Restore Checkpoint

```bash
git checkout v1.0.0-checkpoint
```

---

## 🐛 Common Issues

1. **Special price not showing:** Check date in `lib/pricing.ts` (should be 2026-02-01)
2. **Build fails:** Check Netlify logs, verify env vars
3. **Payment not verifying:** Check Etherscan API, verify amount matches

---

## 📞 Quick Links

- **GitHub:** https://github.com/ArtieFishal/LastWishEth
- **Netlify:** Check dashboard for site URL
- **Full Docs:** See `BUILD_SUMMARY.md`

---

**Last Updated:** January 4, 2026

