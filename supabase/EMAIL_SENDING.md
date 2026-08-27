# Sending emails for this project — approach & notes

How ad-hoc/bulk emails actually get sent for this wedding, why it's done this way, and things worth remembering next time.

## The problem this solves

There's a Resend MCP integration available in Claude Code, but its OAuth token expires periodically. When it does, `send-email`/`send-batch-emails` calls don't fail cleanly — they just hang for a long time before eventually erroring with `MCP server "resend" requires re-authorization (token expired)`. That's expensive (burns tokens/time) and easy to mistake for a different bug.

**Fix when it happens:** run `/mcp` to re-authorize, and retry. But for anything beyond a one-off test, prefer the approach below — it sidesteps the MCP connection entirely.

## The approach: a Supabase Edge Function that calls the Resend REST API directly

This project already has Resend secrets configured on the Supabase project (used by `rsvp-submit`):

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` — currently `Ed & Laura <hi@edlaura.com>`
- `RSVP_CONFIRMATION_REPLY_TO` — currently `edwardstapleton@me.com,lem.harford@gmail.com`

These are **Supabase project secrets**, not in the local repo — there's no `.env` with them checked in, and there shouldn't be. To use them, deploy an Edge Function that reads `Deno.env.get(...)` and POSTs to `https://api.resend.com/emails`, then invoke it with `curl`. No API key ever needs to leave Supabase or be pasted into a chat.

This is exactly the pattern `rsvp-submit/index.ts` and `wedding-weekend-announcement-send` already use. For one-off/ad-hoc sends (test emails, a specific sub-list of guests, a one-time announcement), the simplest thing is a small dedicated function rather than touching those two — they're wired into the live RSVP flow / guest-table-driven announcement flow and shouldn't be repurposed for one-off content.

### Pattern for a one-off send function

1. Write a small `Deno.serve` handler with:
   - A hardcoded `ADMIN_TOKEN` string, checked against an `x-admin-token` header (matches the existing `wedding-weekend-announcement-send` pattern — simple, no JWT needed, `verify_jwt: false`).
   - `mode: "dry_run"` — returns the recipient list without sending anything. Always run this first.
   - `mode: "send"` — actually sends, looping recipients with a small delay between calls.
   - Recipients as a `{ name, email }` array mapped through one shared HTML/text template with a `{{NAME}}` placeholder, rather than duplicating the template per person.
2. Deploy with the Supabase MCP tool `deploy_edge_function` (or `supabase functions deploy <name>` from the CLI).
3. `curl` it directly — much faster and more reliable than the Resend MCP tools:

   ```bash
   # dry run first
   curl -sS -X POST 'https://ipxbndockmhkfuwjyevi.supabase.co/functions/v1/<function-name>' \
     -H 'Content-Type: application/json' \
     -H 'x-admin-token: <token>' \
     -d '{"mode":"dry_run"}'

   # then actually send
   curl -sS -X POST 'https://ipxbndockmhkfuwjyevi.supabase.co/functions/v1/<function-name>' \
     -H 'Content-Type: application/json' \
     -H 'x-admin-token: <token>' \
     -d '{"mode":"send"}'
   ```

4. To change recipients or copy later, redeploy the same function with an updated `ROSTER`/template — Supabase versions each deploy, so there's a history.

**Currently live:** `cricket-invite-test-send` — used to send the Starford Invitational cricket match email. Its `ROSTER` array and templates get redeployed each time the recipient list or copy changes; there's no need to keep old versions around, just redeploy.

### Security note

The `ADMIN_TOKEN` is hardcoded in the function source (visible to anyone who can read the deployed function via the Supabase dashboard or MCP `get_edge_function`). That's fine for an internal, short-lived, ad-hoc sending tool — but don't reuse this pattern for anything sensitive, and don't leave sending functions with real guest PII deployed indefinitely longer than needed.

## Other useful things learned along the way

**Guest emails already resolve +1s correctly.** The `guests` table has one row per person (not per invitation), and each row's `email` column already holds the correct address to send to — even for a plus-one who doesn't have their own inbox. Example: Scott Stacey (a +1) has `email = molly.daly@gmail.com` directly on his own row. There's no need to join back to `invitation_group_id` to find "the primary's email" — just use the row's own `email` column, and use `first_name` for the salutation. This was confirmed against the live data before relying on it.

**Some people share an inbox.** Nic Wells and his +1 Ned Smith both have `email = nicholassimonwells@gmail.com`. Sending both "Hi Nic," and "Hi Ned," versions means two separate emails land in the same inbox — that's expected, not a bug, unless a merged email is specifically wanted instead.

**Where the actual email drafts live.** The canonical draft for the cricket invite is `starford-cricket-selection-elliot.html` at the repo root (not in `wedding-command-centre`, which is a separate app/repo entirely — plan.edlaura.com — and has nothing to do with sending emails). When editing copy, update that file **and** the deployed Edge Function's inline template, since the function doesn't read the HTML file at runtime — its template is a separate copy baked into the function source.

**From/reply-to convention for guest-facing email:**
- From: `Ed & Laura <hi@edlaura.com>`
- Reply-To: `edwardstapleton@me.com, lem.harford@gmail.com`

**Domain:** `edlaura.com`, verified in Resend, `eu-west-1`.

**Other existing Edge Functions**, for context on what already exists before writing something new:
- `rsvp-submit` — writes RSVP + sends confirmation email (blocking write, non-blocking email).
- `rsvp-lookup` — magic-link guest lookup.
- `guests-sheet-export` — exports guest data.
- `command-centre-api` — backs the separate `wedding-command-centre` app (plan.edlaura.com), unrelated to guest-facing email.
- `wedding-weekend-announcement-send` — the general "2 weeks to go" reminder email, driven by the full `guests` table (anyone who RSVP'd yes), with its own `dry_run`/`test`/`send` modes.
