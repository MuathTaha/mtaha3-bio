// Minimum environment variables needed so Sanity client module-level
// initialisation doesn't throw during unit tests. Tests that need a real
// client inject their own mock; these stubs are never used for real requests.
process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = 'test-project-id';
process.env.NEXT_PUBLIC_SANITY_DATASET = 'test';
process.env.NEXT_PUBLIC_SANITY_API_VERSION = '2026-01-01';
