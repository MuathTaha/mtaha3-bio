// Centralized, runtime-validated environment configuration.
// Server-only secrets must NOT be referenced from client components — keep
// them in `serverEnv` and import only from server modules / route handlers.
// Public values prefixed `NEXT_PUBLIC_` are safe to import from anywhere.

import { z } from 'zod';

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
const isDev = process.env.NODE_ENV !== 'production';

const publicSchema = z.object({
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().min(1, 'NEXT_PUBLIC_SANITY_PROJECT_ID is required'),
  NEXT_PUBLIC_SANITY_DATASET:    z.string().default('production'),
  NEXT_PUBLIC_SANITY_API_VERSION: z.string().default('2026-04-25'),
  NEXT_PUBLIC_SITE_URL:          z.string().url().default('https://mtaha.bio'),
  NEXT_PUBLIC_GA_ID:             z.string().optional(),
  NEXT_PUBLIC_GISCUS_REPO:       z.string().optional(),
  NEXT_PUBLIC_GISCUS_REPO_ID:    z.string().optional(),
  NEXT_PUBLIC_GISCUS_CATEGORY_ID: z.string().optional(),
});

const serverSchema = z.object({
  SANITY_API_READ_TOKEN:        z.string().optional(),
  SANITY_WEBHOOK_SECRET:        z.string().optional(),
  SANITY_STUDIO_PREVIEW_SECRET: z.string().optional(),
  RESEND_API_KEY:               z.string().optional(),
  RESEND_AUDIENCE_ID:           z.string().optional(),
});

function parseOrFail<T extends z.ZodTypeAny>(schema: T, raw: Record<string, unknown>, label: string): z.infer<T> {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;

  const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  const msg = `Invalid ${label} environment configuration:\n${issues}`;

  // During build phase, soft-warn so that Vercel can still build preview
  // deployments where some secrets are deliberately unset. At runtime we
  // throw — a missing project id should never be served.
  if (isBuildPhase || isDev) {
    console.warn(`[env] ${msg}\n(continuing in ${isBuildPhase ? 'build' : 'dev'} mode)`);
    return raw as z.infer<T>;
  }
  throw new Error(msg);
}

export const publicEnv = parseOrFail(publicSchema, {
  NEXT_PUBLIC_SANITY_PROJECT_ID:  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  NEXT_PUBLIC_SANITY_DATASET:     process.env.NEXT_PUBLIC_SANITY_DATASET,
  NEXT_PUBLIC_SANITY_API_VERSION: process.env.NEXT_PUBLIC_SANITY_API_VERSION,
  NEXT_PUBLIC_SITE_URL:           process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_GA_ID:              process.env.NEXT_PUBLIC_GA_ID,
  NEXT_PUBLIC_GISCUS_REPO:        process.env.NEXT_PUBLIC_GISCUS_REPO,
  NEXT_PUBLIC_GISCUS_REPO_ID:     process.env.NEXT_PUBLIC_GISCUS_REPO_ID,
  NEXT_PUBLIC_GISCUS_CATEGORY_ID: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID,
}, 'public');

export const serverEnv = parseOrFail(serverSchema, {
  SANITY_API_READ_TOKEN:        process.env.SANITY_API_READ_TOKEN,
  SANITY_WEBHOOK_SECRET:        process.env.SANITY_WEBHOOK_SECRET,
  SANITY_STUDIO_PREVIEW_SECRET: process.env.SANITY_STUDIO_PREVIEW_SECRET,
  RESEND_API_KEY:               process.env.RESEND_API_KEY,
  RESEND_AUDIENCE_ID:           process.env.RESEND_AUDIENCE_ID,
}, 'server');
