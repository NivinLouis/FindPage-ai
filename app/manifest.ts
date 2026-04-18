import { MetadataRoute } from 'next';
import { siteName } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: 'FindPage',
    description: 'Find exact page references in PDFs for faster studying.',
    start_url: '/',
    display: 'standalone',
    background_color: '#07101a',
    theme_color: '#06b6d4',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}

