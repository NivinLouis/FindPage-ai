import { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/', // Keep API routes private from crawlers
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
