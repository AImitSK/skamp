import { defineLive } from 'next-sanity'
import { client } from './client'
import { token } from './env'

export const { sanityFetch, SanityLive } = defineLive({
  client,
  // Server-Token aktiviert für Live-Updates aus Sanity
  serverToken: token,
  browserToken: false,
})
