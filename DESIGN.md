# EasyMenu Design System

This file is the source of truth for design decisions on EasyMenu. It exists so future work doesn't re-decide the same questions every time.

If something here is wrong or you want to change it, update this file in the same PR — don't ship a one-off exception silently.

## Voice

EasyMenu is a tool for restaurant owners — busy people running a business. The product should feel like:

- **Calm under pressure.** No emoji confetti. No "hooray, you saved!" toasts. The system reports facts.
- **Food-app DNA on the customer side.** Big photos, swipeable categories, one-tap add. Mouth-watering, not corporate.
- **Operator-grade DNA on the dashboard side.** Information dense, scannable, fast. Like a POS, not a SaaS marketing page.
- **Pakistan-first defaults.** Currency PKR, JazzCash + Easypaisa + Bank, Bike not Truck for delivery. Phone format `03001234567`.

## Tokens

All colors, spacing, radii, and motion live in [tailwind.config.ts](tailwind.config.ts) and [src/app/globals.css](src/app/globals.css). Never hardcode a hex outside those files. If you need a new token, add it.

### Color

| Token | Light | Dark | When to use |
|---|---|---|---|
| `--background` | `#FCFCF9` | near-black | Page background |
| `--surface` | white-ish | dark-grey | Cards, raised content |
| `--surface-muted` | `#F5F5F4` | mid-grey | Inputs, badges, subtle bg |
| `--border` | `#E7E5E4` | dark-border | All borders |
| `--foreground` | `#1C1917` | white | Primary text |
| `--foreground-muted` | `#57534E` | light-grey | Secondary text — passes WCAG AA on surface-muted |
| `--foreground-subtle` | `~#807466` | mid-grey | Tertiary / decorative — passes WCAG AA-large only |
| `--primary` | `#EA580C` | same | Primary action, brand |
| `--primary-subtle` | `#FFF7ED` | dark-tint | Active state, primary chips |
| `--success/warning/danger/info` | semantic | — | Status only — never decorative |

**Per-tenant brand color:** `tenant.brandColor` is applied to hero accents (carousel deal cards) only. Buttons stay global `--primary` so contrast/a11y stay safe.

### Typography

Defined as `text-display`, `text-h1`, `text-h2`, `text-h3`, `text-body-lg`, `text-body`, `text-sm`, `text-xs`. Use these. Don't reach for `text-xl`/`text-2xl` directly — that drifts the scale.

Headings: left-align by default. Centered headings only for confirmation/empty states (where the eye has nothing else to anchor on).

### Spacing

Tailwind defaults. Common patterns:

- Page section: `py-6` mobile, `py-12` desktop
- Card padding: `p-4` for compact, `p-6` for hero
- Between sections in a list: `space-y-4` mobile, `space-y-6` desktop

### Border radius

3 sizes used:

- `rounded-md` (6px) — inputs, buttons, small chips
- `rounded-2xl` (16px) — cards, content panels
- `rounded-3xl` (24px) — hero panels, big featured blocks
- `rounded-full` — chips, pills, sticky cart pill, avatars

Don't introduce a 4th radius without strong reason.

### Icons

Always [lucide-react](https://lucide.dev/). Sizes:

- `h-3 w-3` — inside small badges/chips only
- `h-3.5 w-3.5` — inline-with-text decoration (Flame next to "Hot deal")
- `h-4 w-4` — buttons, list items, most icon-only buttons
- `h-5 w-5` — feature card heads, stat tiles
- `h-6 w-6` — page-title icons (next to `h1`)
- `h-7 w-7` — hero status icons (rare)

Pakistan-specific: **`Bike` for delivery, never `Truck`.** Customers and riders use motorbikes here.

## Animations

Defined as keyframes in [tailwind.config.ts](tailwind.config.ts). All animations respect `prefers-reduced-motion: reduce` (handled in [globals.css](src/app/globals.css)).

| Animation | When to use |
|---|---|
| `animate-fade-in` | Items appearing in a list (use `animationDelay` for stagger) |
| `animate-scale-in` | Sticky cart pill appears, badge pop on add-to-cart |
| `animate-slide-in-down` | Hero appearing on dashboard mount (one per page max) |
| `animate-slide-up` | Subsequent stat tiles after the hero (staggered) |
| `animate-btn-shine` | Button click sweep (already wired into `<Button>`) |
| `animate-gradient-pan` | Auth marketing panel headline only |
| `animate-caret` | Auth typewriter caret blink only |

**Rules:**
- One signature animation per screen (e.g. dashboard slide-in-down on hero, then staggered slide-ups). Don't animate everything.
- Hover lift: `hover:-translate-y-0.5 hover:shadow-md` is the default for any clickable card.
- Active scale: `active:scale-95` (or `[0.97]` for buttons) on any tappable. Wired into `<Button>`; add explicitly for non-Button clickables.

## Micro-interactions ("emotion")

Use [src/lib/ui/haptics.ts](src/lib/ui/haptics.ts) for tap feedback. Light vibration on supported devices, no-op everywhere else. Already wired into:

- `<Button>` on every click → `haptic.light()`
- Customer quick-add (+/-), heart toggle, tip chips → `haptic.light()`
- Order placed successfully → `haptic.success()`
- Error / out-of-stock / cancel → `haptic.warn()`

When adding a new high-frequency interactive element, call `haptic.light()` in the click handler.

## Component conventions

### Buttons

[src/components/ui/button.tsx](src/components/ui/button.tsx) — variants `primary`, `secondary`, `ghost`, `destructive`, `outline`, `link`. Sizes `sm`, `md`, `lg`, `icon`.

- Primary action per screen: ONE `primary` button. Everything else `secondary` / `ghost`.
- Destructive action: `variant="destructive"` + confirm dialog.
- Icon-only: `size="icon"` + REQUIRED `aria-label`.

### Forms

React Hook Form + Zod resolver. Field structure:

```tsx
<FormField>
  <Label htmlFor="x" required>Label</Label>
  <Input id="x" {...register("x")} invalid={!!errors.x} />
  <FieldHint>Optional hint</FieldHint>
  <FieldError message={errors.x?.message} />
</FormField>
```

Never use `placeholder` as the only label.

### Empty / loading / error states

Every list-fetching page must have all three:

- **Loading:** `loading.tsx` next to the page, using `<Skeleton>` shapes that match the content.
- **Empty:** in-component, with a friendly message and a primary action (don't leave the user stranded).
- **Error:** `error.tsx` boundary at the route group level (e.g. `/r/[slug]/error.tsx` covers all customer routes).

See [src/app/r/[slug]/loading.tsx](src/app/r/[slug]/loading.tsx) and [error.tsx](src/app/r/[slug]/error.tsx) as references.

### Dialogs

Radix `<Dialog>` from [src/components/ui/dialog.tsx](src/components/ui/dialog.tsx). Mobile bottom-sheet shape on small screens (rounded-t-3xl), centered card on `sm+`. Already keyboard-safe (`max-h-[calc(100dvh-2rem)]`, `overscroll-contain`).

### Skeletons

Use [src/components/ui/skeleton.tsx](src/components/ui/skeleton.tsx). Block shapes that approximate the final content's silhouette so the page doesn't jump on hydration.

## What we don't do

These are anti-patterns for EasyMenu specifically. If you find yourself reaching for one, ask why.

1. **3-column centered icon-card "features" grid.** Canonical AI slop. Use asymmetric layouts (1 large + 5 small, etc.).
2. **Centered everything.** Headings, descriptions, and CTAs all centered = no anchor for the eye. Left-align by default.
3. **Decorative emoji in copy.** No 🍳, 🔥, 🎉. The product is calm.
4. **Purple/violet/indigo gradients.** We are orange (`--primary` `#EA580C`). No "AI gradient" headlines.
5. **Decorative blobs.** One ambient glow per hero is fine; two competes for attention.
6. **Generic copy.** "Welcome to EasyMenu" → "Run your restaurant from one calm, fast workspace." Specific > generic.
7. **`Truck` icon for delivery.** Always `Bike` (Pakistan context).
8. **Cards everywhere.** A card must EARN itself — interactive surface OR distinct content group. Don't wrap every paragraph in a card.

## Phase D backlog (post-launch)

These were considered and explicitly deferred:

- ~~**Address autocomplete** (Google Maps Places API)~~ — shipped via [`AddressAutocomplete`](src/components/ui/address-autocomplete.tsx). Needs `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` set in `.env.local`; falls back to plain input if missing. Setup steps in [`.env.example`](.env.example).
- **Phone OTP verification** — needs SMS provider (Twilio/Vonage/local PK gateway). Currently phone is unverified
- **Favorites synced to DB** — currently localStorage-per-device. Sync needs `CustomerFavorite` model + login flow
- **SMS notifications on order status** — same SMS provider dependency as OTP
- **Multi-language** — i18n setup, Urdu translations
- **Multi-currency** — currency comes from `tenant.currency` but `formatMoney` is hardcoded PKR
- **Allergen / dietary filters** — needs tag fields on `MenuItem`
- **Live menu updates via Pusher** — env vars documented in `.env.example`, requires Pusher account
- **Dedicated `/r/[slug]/cart` page** (currently drawer modal)

When you pick one of these up, move it out of this section + update the relevant convention above.
