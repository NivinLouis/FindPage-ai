export const siteName = 'FindPage.ai';

export const siteDescription =
  'FindPage.ai helps students find the exact pages where a topic is mentioned in PDFs, so they can verify sources and copy what they need into notes.';

// Canonical site URL. Override in Vercel with NEXT_PUBLIC_SITE_URL (recommended).
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || 'https://findpage-ai.vercel.app';

