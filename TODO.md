# TODO — manual steps Taha must run

1. `npx sanity@latest login` (browser opens)
2. `npx sanity@latest init --env=.env.local --create-project "mtaha3-bio" --dataset production`
3. In the Sanity management dashboard (`sanity.io/manage`):
   - Create a read token → paste into `.env.local` as `SANITY_API_READ_TOKEN`
   - Generate random strings for `SANITY_WEBHOOK_SECRET` and `SANITY_STUDIO_PREVIEW_SECRET`
4. Proceed to Task 5 schemas (already created by prior subagent, just need to be wired up once env is ready).
