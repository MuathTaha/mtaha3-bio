# Deployment — mtaha3.bio

## One-time setup

### 1. Sanity
- Create project at https://sanity.io/manage (already done via `sanity init`).
- In Studio → API → Tokens: create a read token → `SANITY_API_READ_TOKEN`.
- In Studio → API → Webhooks: create a webhook:
  - URL: `https://mtaha3.bio/api/revalidate`
  - Dataset: production
  - Trigger on: Create, Update, Delete
  - Filter: `_type in ["post","tag","project","siteSettings","experience","book"]`
    (any type left out of this filter never reaches `/api/revalidate`, so edits to it
    only appear on the next 60-second revalidate rather than immediately)
  - Projection: `{ _type, slug }`
  - HTTP method: POST
  - Secret: generate and store as `SANITY_WEBHOOK_SECRET`.

### 2. Resend — newsletter

The footer form posts to `/api/newsletter/subscribe`, which stores the address as a
Resend contact and sends a one-off welcome email (`src/lib/welcomeEmail.ts`).

- Sign up at resend.com.
- **Audience**: Resend keeps a single audience per account rather than named ones, so
  there is nothing to create — just read its ID into `RESEND_AUDIENCE_ID`. If the
  dashboard doesn't show it, list it over the API:
  `curl -s https://api.resend.com/audiences -H "Authorization: Bearer <key>"`
- **API key** → `RESEND_API_KEY`. It must be **full access**: a sending-only key
  cannot write contacts, and the form will fail on every submission.
- **Domain**: add `mtaha3.bio` and the DNS records Resend shows at Name.com. Only the
  welcome email needs this — collecting contacts works before the domain is verified,
  so an unverified domain shows as subscriptions saved with no welcome sent.
- **Sender** → `RESEND_FROM_EMAIL`, e.g. `Muath Taha <hello@mtaha3.bio>`, on the
  verified domain. Defaults to that address when unset.

Behaviour worth knowing: a repeat submission of the same address succeeds without
sending a second welcome, and a welcome that fails to send never loses the
subscription — it is logged and the visitor still sees success.

Nothing in the site emails subscribers after this. New-post announcements are sent
from Resend's dashboard as broadcasts, or would need building.

### 3. GitHub
- Create public repo `mtaha3/mtaha3-comments`. Settings → Features → Enable Discussions.
- Visit https://giscus.app, paste repo, pick the "General" category. Copy `data-repo-id` and `data-category-id` to `NEXT_PUBLIC_GISCUS_REPO_ID` / `NEXT_PUBLIC_GISCUS_CATEGORY_ID`.

### 4. Analytics

Three are wired up, and each needs a step outside the code:

- **Google Analytics 4** — create a GA4 property at analytics.google.com and put the
  Measurement ID (G-XXXXX) in `NEXT_PUBLIC_GA_ID`. Without that variable the tag
  never renders and nothing is tracked. GA4 sets cookies, so an EU audience needs a
  consent banner.
- **Plausible** — add the site in Plausible, then set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`
  to the domain exactly as registered there (`mtaha3.bio`, no scheme or trailing
  slash); a mismatch silently records nothing. The tag only renders when that
  variable is set. Cookieless and GDPR-friendly, so no consent banner. Unlike the
  other two it is a paid service beyond the trial. `plausible.io` is allowed in the
  CSP's `script-src` and `connect-src` — the beacon is blocked without the latter.
  To count visitors that ad blockers would otherwise hide, Plausible can be proxied
  through a Next rewrite; not set up here.
- **Vercel Web Analytics** — installing `@vercel/analytics` is not enough; turn it on
  in the Vercel project under Analytics. Cookieless, so no consent banner. In
  production its script and beacon are same-origin under `/_vercel/insights/`, which
  the CSP's `'self'` already allows — no CSP change needed.

Custom events go through `trackEvent()` in `src/lib/analytics.ts`, which fans out to
GA4 and Plausible under one name so a Plausible goal and a GA4 event can't drift
apart. Currently sent: `newsletter_signup`, `cv_download`, and `search` (with the
search term). Each name has to be registered as a goal in Plausible before it shows
up in its dashboard.

### 5. Vercel
- Push repo to GitHub. Import into Vercel. Add all env vars from `.env.local`.
- Vercel auto-builds on push to main.

### 6. Name.com DNS — mtaha3.bio

**First delete the parking records.** A fresh Name.com registration ships with A
records for `@` and `www` pointing at `91.195.240.94` (Name.com's parking page).
Both must be removed or they will win over anything added below.

| Type  | Host    | Answer                    | TTL |
|-------|---------|---------------------------|-----|
| ALIAS | @       | cname.vercel-dns.com      | 300 |
| CNAME | www     | cname.vercel-dns.com      | 300 |
| TXT   | _resend | (Resend SPF/DKIM records) | 300 |

Name.com labels the apex-flattening record **ALIAS** (older docs say ANAME). Use
whatever records the Vercel dashboard prints for this domain — if it offers an A
record (`76.76.21.21`) instead of ALIAS, either is fine.

In Vercel project `mtaha3-bio` (org `fibra-digital-solutions`) → Domains → add
`mtaha3.bio` and `www.mtaha3.bio`. Set apex primary; `www` redirects to apex.
Also set `NEXT_PUBLIC_SITE_URL=https://mtaha3.bio` in the project's environment
variables and redeploy — sitemap, robots, and canonical URLs all read it.

## Post-deploy smoke test

- [ ] `https://mtaha3.bio/` returns 200 with valid TLS
- [ ] `/studio` loads, can edit Site Settings
- [ ] Create a test post in Studio → publish → appears on home within 10s
- [ ] `/rss.xml` serves valid XML
- [ ] Newsletter form submits and email appears in Resend audience
- [ ] Giscus loads on a post page; can log in and comment
- [ ] GA4 Real-Time shows a visit within 60s of loading the page
- [ ] Lighthouse scores: Performance ≥ 90, Accessibility ≥ 95 on `/` (mobile)
