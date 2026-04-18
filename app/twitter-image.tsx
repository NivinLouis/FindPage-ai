import { ImageResponse } from 'next/og';
import { siteName } from '@/lib/site';

export const runtime = 'edge';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 72,
          background:
            'radial-gradient(900px 700px at 30% 30%, rgba(6,182,212,0.30), transparent 60%), linear-gradient(180deg, #050b12, #07101a)',
          color: '#eef6ff',
        }}
      >
        <div style={{ fontSize: 20, opacity: 0.9 }}>{siteName}</div>
        <div style={{ marginTop: 22, fontSize: 78, lineHeight: 1.05, fontWeight: 800 }}>
          Stop scrolling.
          <div style={{ opacity: 0.9 }}>Start studying.</div>
        </div>
        <div style={{ marginTop: 18, fontSize: 26, opacity: 0.85 }}>
          Get page references you can verify.
        </div>
      </div>
    ),
    size
  );
}

