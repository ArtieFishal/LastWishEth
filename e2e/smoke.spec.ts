import { test, expect } from '@playwright/test'

/**
 * Production-readiness smoke tests.
 *
 * These tests are intentionally minimal and selector-stable:
 *   - They only check that key public routes render (no wallet interaction).
 *   - They use accessible role-based selectors so trivial UI tweaks don't break them.
 *   - They are the "obvious breakage" gate — fast to run, easy to keep green.
 *
 * Run via:
 *   npm run test:e2e:smoke
 *
 * Acceptance: validate that `/`, `/app`, and `/guide` all load and render their
 * expected top-of-page content without requiring a connected wallet.
 */

const mockPacketPath = '/mock/lastwish-mock-complete-packet.pdf'

test.describe('Smoke - public routes render', () => {
  test('home page (/) loads with hero heading and primary CTA', async ({ page }) => {
    const response = await page.goto('/')
    expect(response, 'navigation response').not.toBeNull()
    expect(response!.status(), 'home should respond 200').toBeLessThan(400)

    // Hero h1 — stable across visual tweaks because of the literal copy.
    await expect(
      page.getByRole('heading', { name: /Protect Your Crypto Legacy/i, level: 1 }),
    ).toBeVisible()

    // Primary CTA links to /app. Using role+name avoids brittle class selectors.
    const cta = page.getByRole('link', { name: /Get Started Free/i })
    await expect(cta).toBeVisible()
    await expect(cta).toHaveAttribute('href', '/app')
  })

  test('/app loads without requiring wallet connect', async ({ page }) => {
    const response = await page.goto('/app')
    expect(response, 'navigation response').not.toBeNull()
    expect(response!.status(), '/app should respond 200').toBeLessThan(400)

    // Default step is 'connect'; this heading lives inside that step's panel.
    await expect(
      page.getByRole('heading', { name: /Connect Your Wallets/i }),
    ).toBeVisible()

    // Brand from the Header component — confirms global chrome rendered too.
    // The accessible name is "LW LastWish" (logo span + brand span), so match a substring.
    await expect(page.getByRole('link', { name: /LastWish/i }).first()).toBeVisible()

    // Hard guard: page must not have crashed into the error boundary.
    await expect(page.getByText(/Something went wrong/i)).toHaveCount(0)
  })

  test('/guide loads with title and table of contents', async ({ page }) => {
    const response = await page.goto('/guide')
    expect(response, 'navigation response').not.toBeNull()
    expect(response!.status(), '/guide should respond 200').toBeLessThan(400)

    await expect(
      page.getByRole('heading', { name: /^LastWishCrypto$/i, level: 1 }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /Complete User Guide & Impact Analysis/i }),
    ).toBeVisible()
  })

  test('/contact loads with support email and response time', async ({ page }) => {
    const response = await page.goto('/contact')
    expect(response, 'navigation response').not.toBeNull()
    expect(response!.status(), '/contact should respond 200').toBeLessThan(400)

    await expect(
      page.getByRole('heading', { name: /Contact LastWishCrypto/i, level: 1 }),
    ).toBeVisible()
    await expect(page.getByText('support@lastwishcrypto.com')).toBeVisible()
    await expect(page.getByText(/Response time/i).first()).toBeVisible()
  })

  test('/sample-document links open the mock packet PDF', async ({ page, request }) => {
    const response = await page.goto('/sample-document')
    expect(response, 'navigation response').not.toBeNull()
    expect(response!.status(), '/sample-document should respond 200').toBeLessThan(400)

    for (const name of [/View full mock packet/i, /Open the example packet/i]) {
      const link = page.getByRole('link', { name })
      await expect(link).toBeVisible()
      await expect(link).toHaveAttribute('href', mockPacketPath)
    }

    const headResponse = await request.head(mockPacketPath)
    const pdfResponse = headResponse.status() === 405
      ? await request.get(mockPacketPath)
      : headResponse

    expect(pdfResponse.status(), 'mock packet PDF should not be 404').not.toBe(404)
    expect(pdfResponse.status(), 'mock packet PDF should respond successfully').toBeLessThan(400)
    expect(pdfResponse.headers()['content-type']).toContain('application/pdf')
  })
})
