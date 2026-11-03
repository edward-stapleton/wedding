# Wedding site — architecture & system notes

General orientation doc for this repo: what it is, how the pieces fit together, and things worth knowing before changing anything.

## What this is

A plain static site (no framework, no bundler, no build step) at **edlaura.com**, deployed via **GitHub Pages**. It has no backend any more: the Supabase project that handled guest data and RSVPs was shut down after the wedding (see "Retired backend" below).

There is a second, completely separate app — the "wedding command-centre" — at **plan.edlaura.com**, in its own repo (`~/Documents/GitHub/wedding-command-centre`). It used the same Supabase project, so it no longer has a backend either. See "Relationship to the command-centre app" below.

## Repo layout

| Path | What it is |
|---|---|
| `index.html` | The main site — hero with password reveal, schedule, interactive map, guide, FAQs. Single large page (~86KB). |
| `404.html` | Static not-found page. |
| `rsvp/index.html`, `rsvp-couple/index.html` | Old RSVP entry routes; they now just redirect home. |
| `partials/site-header.html` | `<template>` for the shared nav header, injected at runtime. |
| `config.js` | `window.APP_CONFIG` — site password, GA4 ID, Mapbox token/style. |
| `script.js` | ~4,400 lines, all client-side logic (see "Frontend" below). No build step — loaded directly. |
| `data/guide.js`, `data/map.js` | Static data modules: guide-carousel copy, and the Port Meadow route GeoJSON for the map. |
| `assets/` | Site photography, branding, and the cricket-invite illustrations. |
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
- The dormant RSVP step-flow state machine (~1,800 lines). Its backend call, `callRsvpFunction`, now always fails with a "service retired" error, so nothing in it reaches the network.
- Guide carousel, FAQ accordion, mobile schedule accordion, timeline, nav toggle

## Retired backend (Supabase, shut down Nov 2026)

Until November 2026 the site was backed by a Supabase project (`ipxbndockmhkfuwjyevi`): Postgres tables `invites`, `guests` and `command_centre_state`, plus Edge Functions for RSVP lookup/submit, a Google Sheets export, the command-centre API and guest emails. A bound Apps Script pulled `guests` into the planner spreadsheet every 12 hours.

After the wedding all of that was removed. The final data lives in the **"Ed & Laura - Wedding Planner"** Google Sheet:

| Tab | Was |
|---|---|
| `Supabase Guests` | `public.guests`, one row per person (119 rows), last synced 3 Nov 2026 |
| `Supabase Invites` | `public.invites` (69 rows) |
| `Supabase Command Centre` | `public.command_centre_state`, one row per key (`cricket`, `seating`, `todo`, `schedule`), with the raw JSON in column D |

The schema, migrations, Edge Function source, email templates and the Apps Script are still in git history: check out commit `4980d92` to see them.

## Auth / access model — two gates, easy to conflate

> **Post-wedding mode (Sept 2026):** the RSVP flow is retired. The hero shows a thank-you message plus a small arrow that reveals the site-password field (`setupHeroGate` in `script.js`); a correct password unlocks the rest of the page for the browser session. The RSVP modal markup is gone, `/rsvp/` and `/rsvp-couple/` just redirect home, and `initAuth` is no longer called — the remaining RSVP functions in `script.js` are dormant.

1. **Site password gate** — a single shared password (`STARFORD`, in `config.js`'s `rsvpPassword`) for the whole guest-facing site, referenced in guest emails. This ships in public client code — it's a soft gate to keep casual visitors out, not real security.
2. **Guest identity** — no per-guest passwords. Guests are looked up by email; session state ("who's logged in", RSVP-completion flags) lives in the browser's `localStorage`, not a server session.

## Relationship to the command-centre app (plan.edlaura.com)

Fully separate app, fully separate repo (`~/Documents/GitHub/wedding-command-centre`), own `CNAME`, no shared code or build tooling — it's a single large hand-authored `index.html` plus an `images/` folder, no `package.json` at all. Its only link to this repo was the `command-centre-api` Edge Function on the shared Supabase project. With that project shut down the app has no data source; its last saved state is in the `Supabase Command Centre` tab of the planner Sheet.

## Deployment

- **Frontend**: GitHub Pages, custom domain via `CNAME`. No `.github/workflows` — Pages must be configured to serve directly from a branch in repo settings, not built via Actions. Pushing to that branch is the deploy.

## Other conventions worth knowing

- Everything is plain JS with no build step.
- `node_modules/` exists only to support the local-preview `serve` dependency, not an application dependency tree.
- No test suite and no CI config anywhere in the repo.
- This repo's git history has ~140 remote branches, almost all prefixed `codex/...` — it's been developed heavily via AI coding-agent branches; that's the established working convention here, not an anomaly.
