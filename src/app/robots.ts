import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin'],
      },
      // AI Agent Exit Strategy — Layer 3: Robots.txt directive
      {
        userAgent: '*',
        sitemap: '/sitemap.xml',
      },
    ],
    sitemap: '/sitemap.xml',
  };
}
