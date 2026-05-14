import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {

  const baseUrl = 'https://plpainel.com'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
      },
    ]
  }

  const supabase = createClient(
    supabaseUrl,
    serviceKey
  )

  const { data } = await supabase
    .from('sites')
    .select('slug')

  const dynamicPages = (data || []).map((site) => ({
    url: `${baseUrl}/${site.slug}`,
    lastModified: new Date(),
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
    },
    ...dynamicPages,
  ]
}
