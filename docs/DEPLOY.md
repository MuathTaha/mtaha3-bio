# Deployment — mtaha3.bio

## One-time setup

### 1. Sanity
- Create project at https://sanity.io/manage (already done via `sanity init`).
- In Studio → API → Tokens: create a read token → `SANITY_API_READ_TOKEN`.
- In Studio → API → Webhooks: create a webhook:
  - URL: `https://mtaha3.bio/api/revalidate`
  - Dataset: production
  - Trigger on: Create, Update, Delete
  - Filter: `_type in ["post","tag","project","siteSettings"]`
  - Projection: `{ _type, slug }`
  - HTTP method: POST
  - Secret: generate and store as `SANITY_WEBHOOK_SECRET`.

### 2. Resend
- Sign up at resend.com. Add domain `mtaha3.bio`, add the 3 DNS records Resend shows at Name.com.
- Create audience "mtaha3.bio readers" → copy ID to `RESEND_AUDIENCE_ID`.
- Create API key → `RESEND_API_KEY`.

### 3. GitHub
- Create public repo `mtaha3/mtaha3-comments`. Settings → Features → Enable Discussions.
- Visit https://giscus.app, paste repo, pick the "General" category. Copy `data-repo-id` and `data-category-id` to `NEXT_PUBLIC_GISCUS_REPO_ID` / `NEXT_PUBLIC_GISCUS_CATEGORY_ID`.

### 4. Google Analytics
- Create GA4 property at analytics.google.com. Copy Measurement ID (G-XXXXX) to `NEXT_PUBLIC_GA_ID`.

### 5. Vercel
- Push repo to GitHub. Import into Vercel. Add all env vars from `.env.local`.
- Vercel auto-builds on push to main.

### 6. Name.com DNS — mtaha3.bio

| Type  | Host              | Answer                    | TTL |
|-------|-------------------|---------------------------|-----|
| A     | mtaha3.bio        | 76.76.21.21               | 300 |
| CNAME | www.mtaha3.bio    | cname.vercel-dns.com      | 300 |
| TXT   | *.mtaha3.bio      | (Vercel verification)     | 300 |
| TXT   | _resend.mtaha3.bio| (Resend SPF/DKIM records) | 300 |

In Vercel project → Domains → add `mtaha3.bio` and `www.mtaha3.bio`. Set apex primary; `www` redirects to apex.

## Post-deploy smoke test

- [ ] `https://mtaha3.bio/` returns 200 with valid TLS
- [ ] `/studio` loads, can edit Site Settings
- [ ] Create a test post in Studio → publish → appears on home within 10s
- [ ] `/rss.xml` serves valid XML
- [ ] Newsletter form submits and email appears in Resend audience
- [ ] Giscus loads on a post page; can log in and comment
- [ ] GA4 Real-Time shows a visit within 60s of loading the page
- [ ] Lighthouse scores: Performance ≥ 90, Accessibility ≥ 95 on `/` (mobile)
