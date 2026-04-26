import { ImageResponse } from 'next/og'

// File-convention Apple touch icon. Next.js will auto-emit
// <link rel="apple-touch-icon"> pointing at the route this generates.
// Matches the in-app brand tile (see components/Header.tsx) and `app/icon.tsx`.

export const runtime = 'edge'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

export default function AppleIcon() {
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
          borderRadius: 36,
          color: '#ffffff',
          fontWeight: 800,
          fontSize: 100,
          letterSpacing: -3,
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
