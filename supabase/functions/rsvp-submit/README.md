# RSVP Submit Email Integration (Resend)

This function sends RSVP confirmation emails through Resend after successful RSVP writes.

## Required secrets

Set these in Supabase before deploying:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (example: `Edward & Laura <hello@yourdomain.com>`)

Optional:

- `RSVP_CONFIRMATION_REPLY_TO` (defaults to `RESEND_FROM_EMAIL`)
  - Single address: `person@example.com`
  - Multiple addresses: `person1@example.com,person2@example.com`

## Delivery behavior

- RSVP writes are the source of truth.
- Email sending is non-blocking.
- If email fails (or secrets are missing), the function still returns RSVP success.
- Success responses include `email_delivery` with one of:
  - `sent`
  - `failed`
  - `skipped`

## Deploy

1. Set secrets:
   - `supabase secrets set RESEND_API_KEY=...`
   - `supabase secrets set RESEND_FROM_EMAIL='Edward & Laura <hello@yourdomain.com>'`
   - `supabase secrets set RSVP_CONFIRMATION_REPLY_TO='edwardstapleton@me.com,lem.harford@gmail.com'` (optional)
2. Deploy function:
   - `supabase functions deploy rsvp-submit`
3. Verify:
   - Submit RSVP once (expect `created` email).
   - Submit again (expect `updated` email).
