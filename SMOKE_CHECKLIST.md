# Production Readiness Smoke Checklist

This is the cheap, repeatable gate that catches obvious breakage before/after a
deploy. Two pieces:

1. A short manual checklist (do this before/after any non-trivial change).
2. A 3-test automated smoke spec at `e2e/smoke.spec.ts` (run via npm script).

Risk level: low. These tests do **not** interact with wallets, sign anything,
or hit external APIs.

---

## 1. Manual checklist (≈ 60 seconds)

Run against a production-like build (`npm run build && npm run start`) or
the deployed Netlify URL. Tick every box.

- [ ] `npm run build` exits 0 (no Next.js / TypeScript build errors).
- [ ] `npm run check:env` reports all required vars present
      (or knowingly fails for the env you're checking).
- [ ] `curl -I http://localhost:3000/` returns `200` and **exactly one**
      `Content-Security-Policy` header.
- [ ] `/` renders the hero "Protect Your Crypto Legacy" and the
      **Get Started Free →** CTA links to `/app`.
- [ ] `/app` renders the **Connect Your Wallets** step without throwing
      (no error boundary / no "Something went wrong").
- [ ] `/guide` renders with the **LastWishCrypto** title and the
      **Complete User Guide & Impact Analysis** subtitle.
- [ ] DevTools Console on `/` and `/app`: no CSP violations and no
      uncaught exceptions on first paint.

If all boxes pass, the build is "production-ready enough" to deploy.

---

## 2. Automated smoke (one command)

```bash
# In one terminal
npm run build
npm run start

# In another terminal
npm run test:e2e:smoke
```

What it checks (`e2e/smoke.spec.ts`):

- `/` returns &lt; 400 and shows the hero `<h1>` + the `Get Started Free →`
  CTA pointing at `/app`.
- `/app` returns &lt; 400, shows the **Connect Your Wallets** step heading,
  shows the global header brand, and is **not** in the error boundary.
- `/guide` returns &lt; 400 and shows the title + subtitle headings.

The spec uses `getByRole('heading' | 'link', { name: ... })` so it is robust
against class/style changes. It does **not** require a wallet, MetaMask, or
WalletConnect.

### Notes on the Playwright config

`playwright.config.ts` sets `webServer.reuseExistingServer = !process.env.CI`,
so when you already have `npm run start` (or `npm run dev`) running on port
3000 the smoke spec will reuse it. In CI, set `CI=1` and Playwright will fail
loudly if the port is taken instead of silently reusing a stale server.

If you want to run the smoke against a remote URL (e.g. a Netlify deploy
preview), pass it via the standard Playwright env var:

```bash
PLAYWRIGHT_TEST_BASE_URL=https://deploy-preview-123--lastwishcrypto.netlify.app \
  npm run test:e2e:smoke
```

(That env var is honored automatically by the `baseURL` in
`playwright.config.ts`.)
