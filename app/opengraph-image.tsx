import { ImageResponse } from 'next/og';
import { siteName, siteDescription } from '@/lib/site';

export const runtime = 'edge';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background:
            'radial-gradient(900px 700px at 20% 20%, rgba(6,182,212,0.35), transparent 60%), radial-gradient(900px 700px at 80% 30%, rgba(245,158,11,0.25), transparent 55%), linear-gradient(180deg, #050b12, #07101a)',
          color: '#eef6ff',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div
            style={{
              fontSize: 18,
              opacity: 0.9,
              letterSpacing: 0.2,
            }}
          >
            {siteName}
          </div>
          <div style={{ fontSize: 72, lineHeight: 1.05, fontWeight: 700 }}>
            Find the exact page.
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.35, opacity: 0.85, maxWidth: 900 }}>
            {siteDescription}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: 0.9 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: '#06b6d4',
              boxShadow: '0 0 0 6px rgba(6,182,212,0.12)',
            }}
          />
          <div style={{ fontSize: 18 }}>Source-verified study assistant</div>
        </div>
      </div>
    ),
    size
  );
}

