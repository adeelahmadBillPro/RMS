# Architecture

## Layout

```
src/
├─ app/
│  ├─ (marketing)/       Public landing + pricing
│  ├─ (auth)/            Login, signup, forgot/reset, verify-email
│  ├─ (onboarding)/      5-step wizard (one-shot per user)
│  ├─ (dashboard)/       /[tenantSlug]/* — tenant workspace
│  ├─ (super-admin)/     /super-admin/*  — platform tools
│  └─ api/               NextAuth route + /api/health
├─ components/
│  ├─ ui/                Tokenized primitives (Button, Input, Card, …)
│  │  └─ states/         Loading / Empty / Error (mandatory per screen)
│  ├─ auth/              Signup / Login forms (client)
│  ├─ marketing/         Site header & footer
│  ├─ onboarding/        Wizard
│  ├─ dashboard/         Sidebar, Topbar, MobileTabBar
│  └─ providers/         ThemeProvider, SessionProvider, Toaster
├─ lib/
│  ├─ auth/              NextAuth config, password helpers, session helpers
│  ├─ audit/             Centralised AuditLog writer
│  ├─ config/            APP constants + FEATURES + RESERVED_SLUGS
│  ├─ constants/         Plan seeds + trial constants
│  ├─ db/                Prisma client + withTenant() RLS helper
│  ├─ payments/          Manual recording types + Stripe stub
│  ├─ realtime/          Pusher provider wrapper (REALTIME_EVENTS contract)
│  ├─ tenant/            getTenantContext()
│  ├─ validations/       Shared Zod schemas (single source of truth)
│  ├─ whatsapp/          Provider abstraction + MockWhatsAppProvider
│  ├─ fonts.ts           Inter / JetBrains Mono / Noto Nastaliq
│  └─ utils.ts           cn / slugify / money helpers
├─ server/
│  └─ actions/           Server Actions (auth, onboarding, super-admin)
├─ types/                Module augmentation (next-auth.d.ts)
└─ middleware.ts         Route guard (public / auth / super-admin / tenant)

prisma/
├─ schema.prisma         Phase 1 models
├─ migrations/           Migration history
├─ rls.sql               Postgres RLS policies (defense-in-depth)
└─ seed.ts               Plans + super admin + demo tenant

tests/unit/              Vitest smoke tests (validations, slugs, route map)
```

## Phase 1 data model

```
User ─── TenantMembership ─── Tenant ─── Subscription ─── Plan
 │            (role)            │
 │                              ├── MenuCategorySeed (placeholder for Phase 2)
 │                              └── AuditLog
 │
 ├── Account (NextAuth)
 ├── Session (NextAuth)
 └── AuditLog (actor)
```

Every tenant-scoped table has `tenantId`, `createdAt`, `updatedAt`, `deletedAt`.
Phase 2 expands this with `Branch`, `Table`, `MenuCategory`, `MenuItem`, `MenuVariant`, `Modifier`, `Ingredient`, `Recipe`, `RecipeItem`, `Order`, `OrderItem`, `Payment`, etc.

## Auth flow

```
signup → POST /api/auth/csrf
       → signupAction (server) hashes pw, creates User
       → signIn("credentials") issues JWT
       → JWT callback fetches isSuperAdmin + memberships
       → onboarding wizard (one-shot) → tenant + trial sub created in single transaction
       → redirect /[tenantSlug]
```

Route guards:

- `middleware.ts` — coarse: rejects unauthenticated access to non-public routes; restricts `/super-admin/*` to `isSuperAdmin`.
- `[tenantSlug]/layout.tsx` — fine-grained: verifies the user has a membership for `tenantSlug`. Super admin without a membership is bounced to `/super-admin/tenants?notice=use-impersonation`.
- `getTenantContext(slug)` — every server action / RSC read inside a tenant route MUST call this.

## Multi-tenant isolation: two layers

1. **Application** — `withTenant(tenantId, …)` wraps queries. Tenant ID always comes from session-derived membership, never from the request body.
2. **Database** — Postgres RLS (`prisma/rls.sql`) enables row filters on `TenantMembership`, `MenuCategorySeed`, `AuditLog`. The `withTenant` helper sets `app.current_tenant_id` per transaction so the policy fires.

If application logic forgets to scope, RLS catches it. If RLS is missing, application logic catches it. Both layers must be intact.

## Realtime

`src/lib/realtime/` exports a single `realtime.trigger(channel, event, data)` API. The Pusher dependency is intentionally NOT installed in Phase 1 — the implementation no-ops with a console log. Phase 2 adds `pusher` + `pusher-js` and the real client.

Channels: `private-tenant-{tenantId}`. Events from `REALTIME_EVENTS` (e.g. `order.created`). Keep all event names in that constant; don't ad-hoc strings.

## WhatsApp

`getWhatsAppProvider()` returns the active provider — `MockWhatsAppProvider` in Phase 1. Phase 3 adds `MetaCloudProvider` (and optionally `TwilioProvider`) implementing the same `WhatsAppProvider` interface. Switch via `WHATSAPP_PROVIDER=meta` env. UI gates additionally check `isWhatsAppEnabled()` (`WHATSAPP_ENABLED=true`).

## Payments

- **SaaS subscriptions** — Stripe (Phase 5). The stub at `lib/payments/stripe-stub.ts` exists so subscription-aware UI compiles today.
- **In-app (customer → restaurant)** — Phase 1 records payments manually. The schema includes `verification: UNVERIFIED | PENDING | VERIFIED | FAILED` so Phase 3 webhooks can flip the status without schema changes.

## Design system

All tokens flow through CSS variables (`globals.css`) → Tailwind utilities (`tailwind.config.ts`). No raw hex codes in components. Brand color is `#EA580C` (orange-600), shifting to `#FB923C` in dark mode for contrast.

Every screen ships four states: **Loading** (skeleton), **Empty** (CTA), **Error** (retry), **Populated**. Helpers in `components/ui/states/`.

## Phase 2 plan (preview)

1. Branch + Table + Menu (Category + Item + Variant + Modifier + ModifierGroup) CRUD
2. Ingredient + Recipe + RecipeItem; cost-per-plate + auto-deduct on order complete
3. Order + OrderItem + OrderItemModifier + OrderStatusLog
4. POS cashier screen (touch grid, split payments, EOD)
5. Kitchen Display System with realtime + age coloring
6. Real Pusher wiring + tenant private channels with auth endpoint
