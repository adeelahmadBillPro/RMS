# EasyMenu

Multi-tenant SaaS for restaurants, cafes, fast food, and bakeries.
**Phase 1 ships the foundation** — auth, tenants, onboarding, dashboard shell, super admin, design system, validation layer.

## Tech stack

| Layer        | Choice                                                                    |
| ------------ | ------------------------------------------------------------------------- |
| Framework    | Next.js 14 (App Router, Server Actions, RSC)                              |
| Language     | TypeScript (strict)                                                       |
| Database     | PostgreSQL 17 + Prisma 5                                                  |
| Auth         | NextAuth (Credentials + Google OAuth) with JWT sessions                   |
| Styling      | Tailwind + design tokens (no default shadcn slate — custom orange brand)  |
| Validation   | Zod (shared schemas; client UX + server truth)                            |
| Forms        | React Hook Form + `@hookform/resolvers/zod`                               |
| Realtime     | Pusher wrapper (`lib/realtime/`) — currently no-op until Phase 2          |
| WhatsApp     | Provider abstraction (`lib/whatsapp/`) — `MockWhatsAppProvider` in Phase 1 |
| Payments     | Stripe stub (Phase 5) + manual recording schema (Phase 1)                 |
| Tests        | Vitest                                                                    |

## Local setup

```bash
# 1. Prereqs
node -v          # v22+
pnpm -v          # 10+
psql -V          # PostgreSQL 17

# 2. Env
cp .env.example .env.local   # then fill in DATABASE_URL etc.
cp .env.example .env         # Prisma CLI reads .env, not .env.local

# 3. Install
pnpm install

# 4. Database
psql -U postgres -h localhost -c "CREATE DATABASE easymenu_db;"
pnpm prisma migrate dev
pnpm prisma:rls              # apply Postgres RLS policies
pnpm seed                    # plans + super admin + demo tenant

# 5. Run
pnpm dev   # serves on http://localhost:3100
```

> Port **3100** is used because port 3000 may already be in use (LIS dev server). Override with `next dev --port <n>` if you need to.

## Seeded credentials

| Role        | Email                  | Password   |
| ----------- | ---------------------- | ---------- |
| Super admin | admin@easymenu.dev     | Admin@123  |
| Demo owner  | demo@easymenu.dev      | Demo@123   |

Demo tenant is at `/burgerhub`. Super admin lives at `/super-admin`.

## Scripts

| Command              | Purpose                                       |
| -------------------- | --------------------------------------------- |
| `pnpm dev`           | Run Next.js on port 3100                      |
| `pnpm build`         | Production build                              |
| `pnpm typecheck`     | `tsc --noEmit`                                |
| `pnpm test`          | Vitest unit tests                             |
| `pnpm prisma:migrate`| Create + apply a new migration                |
| `pnpm prisma:push`   | Sync schema without a migration (dev-only)    |
| `pnpm prisma:rls`    | Apply / reapply Postgres RLS policies         |
| `pnpm prisma:studio` | Open Prisma Studio                            |
| `pnpm seed`          | Run `prisma/seed.ts`                          |

## Multi-tenancy contract (READ FIRST)

1. **`tenantId` is never trusted from the client.** Always derive it from the session + the URL slug via `getTenantContext(slug)` in `src/lib/tenant/context.ts`.
2. **Tenant-scoped DB access** must go through `withTenant(tenantId, tx => …)` in `src/lib/db/with-tenant.ts`. That helper sets `app.current_tenant_id` for the transaction so Postgres RLS (`prisma/rls.sql`) takes effect.
3. **Reserved slugs** live in `src/lib/config/app.ts` → `RESERVED_SLUGS`. Never let a tenant register a slug that collides with a top-level route (`admin`, `api`, `r`, `super-admin`, …).
4. **Super admin** bypasses tenant scoping only via the explicit impersonation flow (audit-logged in `AuditLog`). Layout-level guards refuse silent cross-tenant access.

## App name

The product name is `process.env.APP_NAME` (default `EasyMenu`), exposed via `APP.name` from `src/lib/config/app.ts`. **Never hardcode the name in copy** — read it from `APP`. Rename = one env var change.

## Design tokens

Located in:

- `tailwind.config.ts` — token registrations (colors, type scale, radius)
- `src/app/globals.css` — CSS variable definitions (light + dark)

Both must be edited together. Components consume tokens via Tailwind utilities (`bg-primary`, `text-foreground-muted`, etc.) — never hex codes.

## Validation contract

All Zod schemas live in `src/lib/validations/`. **Both** the client form (`useForm` + `zodResolver`) and the server action (`safeParse` inside the `"use server"` function) must use the same schema. The server is the source of truth — do not relax server-side validation to "match what the client sent".

## Roadmap

See `ARCHITECTURE.md` for module breakdown and `DEPLOY.md` for production deployment.
