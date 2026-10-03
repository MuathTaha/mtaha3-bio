import { createClient } from 'next-sanity';
import { publicEnv, serverEnv } from '@/lib/env';

export const projectId = publicEnv.NEXT_PUBLIC_SANITY_PROJECT_ID;
export const dataset = publicEnv.NEXT_PUBLIC_SANITY_DATASET;
export const apiVersion = publicEnv.NEXT_PUBLIC_SANITY_API_VERSION;

/**
 * Server-rendered pages read through this client. `useCdn` is false on purpose:
 * the publish webhook invalidates a page the instant Sanity accepts the change,
 * so the regeneration that follows races the CDN's own purge and would bake
 * pre-publish content into a page Next then treats as fresh for 60s. Going
 * straight to the API costs one uncached request per regeneration, which ISR
 * already bounds.
 */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  perspective: 'published',
});

export const draftClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: serverEnv.SANITY_API_READ_TOKEN,
  perspective: 'previewDrafts',
});
