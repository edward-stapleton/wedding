# Supabase Guests Google Sheets Sync

This is a bound Google Apps Script project for syncing `public.guests` into a worksheet named `Supabase Guests`.

## What it does

- Adds a `Supabase Sync` menu to the spreadsheet
- Creates or reuses the `Supabase Guests` tab
- Replaces the tab contents with the latest export from Supabase
- Freezes the header row and reapplies a filter
- Stores sync metadata in `R1:R2`
- Can install an hourly refresh trigger

## Script Properties

Set these in the bound Apps Script project under:
`Project Settings` -> `Script properties`

- `SUPABASE_PROJECT_URL=https://ipxbndockmhkfuwjyevi.supabase.co`
- `SHEET_SYNC_TOKEN=<same value as the Supabase secret>`

## Setup

1. Open the target spreadsheet.
2. Open `Extensions` -> `Apps Script`.
3. Replace the default script contents with `Code.gs` from this folder.
4. Replace the manifest with `appsscript.json` from this folder.
5. Add the required Script Properties.
6. Run `syncSupabaseGuests` once and grant permissions.
7. Run `installHourlyGuestsSyncTrigger` once.

After that, the spreadsheet will have a manual sync menu and an hourly refresh trigger.
