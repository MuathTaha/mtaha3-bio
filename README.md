# mtaha3.bio

Personal blog + CV. Next.js 16 + Sanity + Vercel.

## Develop

```bash
npm install
cp .env.local.example .env.local
# fill in env vars (see docs/DEPLOY.md)
npm run dev
# open http://localhost:3000
# Sanity Studio at http://localhost:3000/studio
```

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run test` — Vitest unit tests
- `npm run test:e2e` — Playwright E2E tests
- `npm run typecheck` — TypeScript check
- `npm run lint` — ESLint

## Architecture

See `docs/superpowers/specs/2026-04-24-personal-blog-mtaha3-design.md` in the FIBRA HQ repo.
