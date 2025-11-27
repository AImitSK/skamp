import { createClient } from 'next-sanity'
import { apiVersion, dataset, projectId } from './env'

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  // CDN deaktiviert, um immer aktuelle Daten zu bekommen
  // Caching wird stattdessen durch Next.js revalidate gesteuert
  useCdn: false,
})
