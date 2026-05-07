import { ImageResponse } from 'next/og';
import { getSiteSettings } from '@/sanity/lib/queries';

export const runtime = 'nodejs';
export const alt = 'mtaha.bio — Muath Taha';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function SiteOgImage() {
  const settings = await getSiteSettings();
  const bio = settings.shortBio || 'Builder. Writer. Founder.';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: '#f5f1ea',
          color: '#1a1a1f',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 22,
            letterSpacing: 5,
            textTransform: 'uppercase',
            color: '#7a6d5c',
          }}
        >
          mtaha.bio
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <h1
            style={{
              fontSize: 156,
              lineHeight: 0.95,
              letterSpacing: -3,
              fontWeight: 700,
              margin: 0,
            }}
          >
            Muath Taha
          </h1>
          <p
            style={{
              fontSize: 36,
              lineHeight: 1.3,
              color: '#4a4540',
              margin: 0,
              maxWidth: 1040,
            }}
          >
            {bio}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'monospace',
            fontSize: 20,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: '#7a6d5c',
          }}
        >
          <span>Personal site · Essays · Work</span>
          <span style={{ color: '#c9a64a' }}>@mtaha</span>
        </div>
      </div>
    ),
    size
  );
}
