export const authorName = 'Nivin P Louis';
export const authorGithub = 'https://github.com/NivinLouis';
export const authorLinkedIn = 'https://www.linkedin.com/in/nivin-louis/';
export const authorEmail = 'nivinlouis123@gmail.com';
export const authorDescription =
  'B.Tech AIML Student at Vidya Academy of Science and Technology. Vibe Coder who builds apps that make life easy.';
export const authorKeywords = [
  'Artificial Intelligence',
  'Machine Learning',
  'Web Apps',
  'React',
  'Next.js',
  'Vibe Coding',
] as const;

export const siteName = 'FindPage.ai';

export const siteDescription =
  'FindPage.ai helps students find exact page references in PDFs for faster studying. Built by Nivin P Louis, a B.Tech AIML student and vibe coder who builds apps that make life easy.';

export const siteTitle = `${siteName} - AI PDF page finder | developed by Nivin P Louis`;

export const siteKeywords = [
  'PDF',
  'PDF search',
  'page finder',
  'study assistant',
  'students',
  'textbook',
  'source verification',
  'notes',
  'Gemini',
  'AI',
  siteName,
  ...authorKeywords,
] as const;

// Canonical site URL. Override in Vercel with NEXT_PUBLIC_SITE_URL (recommended).
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || 'https://findpage-ai.vercel.app';
