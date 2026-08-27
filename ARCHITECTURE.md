# Wedding site — architecture & system notes

General orientation doc for this repo: what it is, how the pieces fit together, and things worth knowing before changing anything. For the email-sending approach specifically, see `supabase/EMAIL_SENDING.md` — not repeated here.

## What this is

A plain static site (no framework, no bundler, no build step) at **edlaura.com**, backed by **Supabase** (Postgres + Edge Functions) for guest data, RSVPs, and server-side logic. Deployed via **GitHub Pages**.

There is a second, completely separate app — the "wedding command-centre" — at **plan.edlaura.com**, in its own repo (`~/Documents/GitHub/wedding-command-centre`). It shares the *same Supabase project* (`ipxbndockmhkfuwjyevi`) but no code, no repo, no build tooling in common. See "Relationship to the command-centre app" below.

## Repo layout

| Path | What it is |
|---|---|
| `index.html` | The main site — hero, RSVP flow, schedule, interactive map, guide, FAQs. Single large page (~86KB). |
| `404.html` | Static not-found page. |
| `rsvp/index.html`, `rsvp-couple/index.html` | Dedicated RSVP entry routes (single guest vs. couple), sharing `script.js` logic. |
| `partials/site-header.html` | `<template>` for the shared nav header, injected at runtime. |
| `config.js` | `window.APP_CONFIG` — Supabase URL/anon key, site password, GA4 ID, Mapbox token/style. |
| `script.js` | ~4,400 lines, all client-side logic (see "Frontend" below). No build step — loaded directly. |
| `data/guide.js`, `data/map.js` | Static data modules: guide-carousel copy, and the Port Meadow route GeoJSON for the map. |
| `assets/` | Site photography, branding, and the cricket-invite illustrations (also used by the email templates). |
| `supabase/schema.sql` | Full Postgres schema (source of truth for table shape). |
| `supabase/migrations/*.sql` | Incremental migrations — see "Data layer" below. |
| `supabase/functions/*` | Deno/TypeScript Edge Functions — see "Edge functions" below. |
| `supabase/email-templates.md`, `supabase/EMAIL_SENDING.md` | Email copy templates, and the operational approach to sending. |
| `google-apps-script/supabase-guests-sync/` | A bound Google Apps Script that pulls guest data into a Google Sheet. |
| `CNAME` | GitHub Pages custom domain (`edlaura.com`). |
| `package.json` | Only declares `serve` as a dev dependency, for local preview (`npm run dev`). Not an app dependency tree. |

## Frontend (`script.js`)

No bundler — `script.js` is loaded as-is, organized into rough functional clusters (not literal file sections, just where things live):

- Hero media fallback / poster handling
- GA4 analytics (event tracking, hashed user IDs)
- RSVP error classification/translation (user-facing error copy)
- **Site password gate** (`enforceSiteGate`, checks `config.js`'s `rsvpPassword`) — see "Auth model" below
- **Mapbox integration** — route bounds, flyover animation, POI popups/layers (the largest single subsystem, ~500 lines)
- Shared header loading + nav sync (uses `partials/site-header.html`)
- Guest profile/session handling — persisted in **`localStorage`**, not server sessions
- Guest lookup against Supabase (calls the `rsvp-lookup` and `rsvp-submit` Edge Functions)
- The RSVP step-flow state machine (~1,800 lines) — step validation, mobile keyboard handling, modal focus-trap, submission
- Guide carousel, FAQ accordion, mobile schedule accordion, timeline, nav toggle

## Data layer (Supabase Postgres)

Two core tables, both RLS-enabled:

- **`public.invites`** — `token` (unique), `invite_type` (`single`/`plusone`), primary contact fields, `expires_at`/`redeemed_at`. Anyone can read by token; only the invited email can update.
- **`public.guests`** — one row **per person** (not per invitation). `invitation_group_id` links a primary + their plusone. `role` (`primary`/`plusone`), `attendance`, `cricket_attendance`, `dietary`, address fields (required for `role='primary'`). RLS: a guest can only read/update their own row (`auth.email() = email`).
  - **Important, confirmed against live data**: each row's own `email` column already holds the correct send-to address, even for plusones without their own inbox (e.g. a +1 whose email is their partner's). Don't assume you need to join back through `invitation_group_id` to find "the real" email — just read the row.

A third table backs the *separate* command-centre app:

- **`public.command_centre_state`** — `key`, `data jsonb`, `updated_at`/`updated_by`. RLS enabled with **zero policies** — only reachable via the `command-centre-api` function's service-role key, never directly from a client.
  - ⚠️ **Known schema drift**: the migration that created this table (`20260707200000_command_centre_state.sql`) constrains `key` to `'seating'` / `'cricket'` only, but the live table currently also has rows keyed `'schedule'` and `'todo'`. Worth reconciling (either a missing migration, or a manual `ALTER` that never got captured) before relying on that check constraint for anything.

Migrations present:
- `20260308103000_drop_guests_email_unique.sql` — removed a unique constraint on `guests.email`, which is why two people (e.g. a couple sharing an inbox) can legitimately have the same email on file.
- `20260707200000_command_centre_state.sql` — adds the table above.

## Edge functions (`supabase/functions/`)

All Deno/TypeScript, all read secrets via `Deno.env.get(...)` (Supabase project secrets — never committed to the repo). None use Supabase Auth JWTs for the admin-style ones; instead each has its own shared-secret header:

| Function | Purpose | Auth |
|---|---|---|
| `rsvp-submit` | Writes/updates a guest's RSVP; RSVP write is authoritative even if the confirmation email fails to send. | Guest-facing, no admin header |
| `rsvp-lookup` | Guest login: validates site password or invite token, looks the guest up by email. | Guest-facing, no admin header |
| `guests-sheet-export` | Read-only dump of `guests` for the Google Sheets sync. | `x-sheet-sync-token` |
| `command-centre-api` | Backend for the separate `plan.edlaura.com` app — returns guest subset + `command_centre_state`, CORS locked to that origin specifically. | `x-cc-token`, service-role key (bypasses RLS) |
| `wedding-weekend-announcement-send` | The "two weeks to go" reminder email, driven by the full `guests` table. | `x-admin-token` |
| `cricket-invite-test-send` | Ad-hoc/one-off sends (see `EMAIL_SENDING.md`). | `x-admin-token` |

## Google Sheets sync (`google-apps-script/supabase-guests-sync/`)

A bound Apps Script that calls `guests-sheet-export` and writes the result into a "Supabase Guests" tab — replaces contents, freezes the header, can install a 12-hour auto-refresh trigger. Configured via Apps Script's own "Script Properties" (project URL + sync token), entirely separate from this repo's secrets.

## Auth / access model — two gates, easy to conflate

1. **Site password gate** — a single shared password (`STARFORD`, in `config.js`'s `rsvpPassword`) for the whole guest-facing site, referenced in guest emails. This ships in public client code — it's a soft gate to keep casual visitors out, not real security.
2. **Guest identity** — no per-guest passwords. Guests are looked up by email; session state ("who's logged in", RSVP-completion flags) lives in the browser's `localStorage`, not a server session.

Neither of these overlaps with the Edge Function admin-header auth (`x-admin-token` etc.) used for sending/export/command-centre calls — those are a separate, developer-only mechanism.

## Relationship to the command-centre app (plan.edlaura.com)

Fully separate app, fully separate repo (`~/Documents/GitHub/wedding-command-centre`), own `CNAME`, no shared code or build tooling — it's a single large hand-authored `index.html` plus an `images/` folder, no `package.json` at all. The **only** connection to this repo is data: it calls `command-centre-api`, which is deployed from *this* repo but lives on the same Supabase project. Changes to that function need deploying from here even though the app consuming it lives elsewhere.

## Deployment

- **Frontend**: GitHub Pages, custom domain via `CNAME`. No `.github/workflows` — Pages must be configured to serve directly from a branch in repo settings, not built via Actions. Pushing to that branch is the deploy.
- **Edge functions**: deployed independently via the Supabase CLI (`supabase functions deploy <name>`) or the Supabase MCP tool `deploy_edge_function` — **not** triggered automatically by a git push. A function's deployed code and its copy in this repo (if any) can drift if one is updated without the other — several ad-hoc functions (e.g. `cricket-invite-test-send`) have been deployed directly without a matching local file at all.

## Other conventions worth knowing

- `supabase/functions/` is Deno/TypeScript; everything else is plain JS with no build step. `.vscode/settings.json` scopes the Deno formatter/linter to that folder only — don't try to `npm install` inside it.
- `node_modules/` exists only to support the local-preview `serve` dependency, not an application dependency tree.
- No test suite and no CI config anywhere in the repo.
- This repo's git history has ~140 remote branches, almost all prefixed `codex/...` — it's been developed heavily via AI coding-agent branches; that's the established working convention here, not an anomaly.
