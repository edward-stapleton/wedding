# Guests Sheet Export

This function exposes a read-only export of `public.guests` for the Google Sheets sync.

## Required secrets

Set these in Supabase before deploying:

- `SB_URL`
- `SB_SERVICE_ROLE_KEY`
- `SHEET_SYNC_TOKEN`

`SHEET_SYNC_TOKEN` should be a long random shared secret used only by the sheet sync.

## Endpoint

- `POST /functions/v1/guests-sheet-export`
- Required header: `x-sheet-sync-token: <your-secret>`

Success responses return:

- `columns`: schema-order guest columns
- `rows`: row arrays aligned with `columns`
- `exported_at`: ISO timestamp for the export

## Deploy

1. Set secrets:
   - `supabase secrets set SHEET_SYNC_TOKEN='your-random-long-secret'`
2. Deploy function:
   - `supabase functions deploy guests-sheet-export`
3. Verify with a request:
   - `curl -sS -X POST 'https://ipxbndockmhkfuwjyevi.supabase.co/functions/v1/guests-sheet-export' -H 'x-sheet-sync-token: your-random-long-secret'`
