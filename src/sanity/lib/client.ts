import { createClient } from 'next-sanity';
import { publicEnv, serverEnv } from '@/lib/env';

export const projectId = publicEnv.NEXT_PUBLIC_SANITY_PROJECT_ID;
export const dataset = publicEnv.NEXT_PUBLIC_SANITY_DATASET;
export const apiVersion = publicEnv.NEXT_PUBLIC_SANITY_API_VERSION;

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
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
