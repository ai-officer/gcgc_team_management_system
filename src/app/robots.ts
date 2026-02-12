import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://tms.hotelsogo-ai.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/privacy-policy', '/terms-of-service'],
        disallow: ['/admin/', '/user/', '/api/', '/administrator/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
