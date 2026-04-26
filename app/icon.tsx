import { ImageResponse } from 'next/og'

// File-convention icon for App Router. Next.js will auto-emit
// <link rel="icon"> pointing at the route this generates, replacing the
// previous stock `favicon.ico`.
//
// Visuals match the in-app brand tile in `components/Header.tsx`:
//   - rounded purple-500 -> blue-500 diagonal gradient
//   - bold white "LW" centered
// Tailwind hex equivalents are inlined so the favicon does not depend on
// Tailwind's runtime CSS being available (it isn't, in the OG runtime).

export const runtime = 'edge'

export const size = {
  width: 32,
  height: 32,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)',
          borderRadius: 6,
          color: '#ffffff',
          fontWeight: 800,
          fontSize: 16,
          letterSpacing: -0.5,
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        LW
      </div>
    ),
    { ...size },
  )
}
