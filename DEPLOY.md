# Deploy

Phase 1 deploys cleanly to **Vercel + Neon Postgres**. Day 1 is local; this doc captures the production path so we're not improvising in Phase 6.

## Vercel

1. Push the repo to GitHub (private). Connect to Vercel.
2. Framework: Next.js (auto-detected). Node: 22+.
3. Set build command to default (`next build`). Install command: `pnpm install --frozen-lockfile`.
4. Environment variables (copy from `.env.example`, fill prod values):

   | Variable                         | Notes                                           |
   | -------------------------------- | ----------------------------------------------- |
   | `APP_NAME`                       | `EasyMenu`                                      |
   | `APP_URL`                        | `https://app.easymenu.app`                      |
   | `DATABASE_URL`                   | Neon **pooled** connection string               |
   | `DIRECT_URL`                     | Neon **direct** connection (for migrations)     |
   | `NEXTAUTH_URL`                   | `https://app.easymenu.app`                      |
   | `NEXTAUTH_SECRET`                | `openssl rand -base64 32`                       |
   | `GOOGLE_CLIENT_ID/SECRET`        | optional                                        |
   | `PUSHER_*` / `NEXT_PUBLIC_PUSHER_*` | Phase 2 — leave blank in Phase 1               |
   | `WHATSAPP_ENABLED`               | `false` until Phase 3                           |
   | `WHATSAPP_PROVIDER`              | `mock`                                          |
   | `STRIPE_*`                       | Test keys for Preview, live keys for Production |

5. Add a `vercel.json` (Phase 5) when we add cron jobs for trial expiry.

## Neon Postgres

1. Create a Neon project. **Enable connection pooling** (PgBouncer).
2. Use the **pooled** URL for `DATABASE_URL` (with `?pgbouncer=true&connect_timeout=10`).
3. Use the **direct** URL for `DIRECT_URL` — Prisma needs an unpooled connection for migrations.
4. Run migrations from CI (or once locally against the prod URL): `pnpm prisma migrate deploy`.
5. Apply RLS policies: `psql "$DIRECT_URL" -f prisma/rls.sql`.
6. Seed plans only (do NOT seed the demo tenant on prod): write a `prod-seed.ts` in Phase 5.
7. Enable Neon **branching** for preview deployments — each Vercel preview gets its own DB branch.

## Backups

Neon's Point-in-Time Recovery is enabled by default on paid plans. Turn it on. Verify retention window matches your RPO.

## Domains

- App: `app.easymenu.app`
- Marketing: `easymenu.app` (later — currently the marketing pages live under app)
- Per-tenant subdomain `*.easymenu.app` (Phase 4) — wildcard DNS + Vercel domain config

## Observability

Phase 5 adds Sentry. Until then, structured `console.log` is the only signal — fine for an MVP demo.

## Smoke check after deploy

```bash
curl -sf https://app.easymenu.app/api/health   # → {"status":"ok","db":"up"}
curl -sf https://app.easymenu.app/             # → 200 HTML
```

Both must return 200 before announcing the deploy.
