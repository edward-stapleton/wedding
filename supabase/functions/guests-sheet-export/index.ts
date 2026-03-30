import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUILD_ID = "guests-sheet-export-2026-03-30a";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sheet-sync-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GUEST_COLUMNS = [
  "id",
  "invitation_group_id",
  "role",
  "first_name",
  "last_name",
  "email",
  "attendance",
  "cricket_attendance",
  "dietary",
  "address_line_1",
  "address_line_2",
  "city",
  "postcode",
  "country",
  "created_at",
  "updated_at",
] as const;

type GuestColumn = (typeof GUEST_COLUMNS)[number];
type GuestRow = Partial<Record<GuestColumn, string | null>>;

function json(status: number, body: unknown) {
  const enriched =
    body && typeof body === "object" && !Array.isArray(body)
      ? { ...(body as Record<string, unknown>), build: BUILD_ID }
      : body;

  return new Response(JSON.stringify(enriched), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "X-Build-Id": BUILD_ID },
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Unknown error";
}

function logServerError(event: string, error: unknown, extra: Record<string, unknown> = {}) {
  const errorMeta =
    error && typeof error === "object"
      ? {
          errorCode: "code" in error ? error.code : undefined,
          errorDetails: "details" in error ? error.details : undefined,
          errorHint: "hint" in error ? error.hint : undefined,
        }
      : {};

  console.error(
    JSON.stringify({
      event,
      errorDetail: getErrorMessage(error),
      build: BUILD_ID,
      ...errorMeta,
      ...extra,
    }),
  );
}

function jsonError(status: number, errorCode: string, error?: unknown, extra: Record<string, unknown> = {}) {
  if (error) {
    logServerError(errorCode, error, extra);
  }

  return json(status, { error: errorCode });
}

function normaliseCellValue(value: unknown) {
  if (value === null || value === undefined) return null;
  return String(value);
}

function mapGuestRowToArray(row: GuestRow) {
  return GUEST_COLUMNS.map(column => normaliseCellValue(row[column]));
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const expectedToken = Deno.env.get("SHEET_SYNC_TOKEN") ?? "";
  const suppliedToken = req.headers.get("x-sheet-sync-token")?.trim() ?? "";

  if (!suppliedToken) return json(401, { error: "missing_sync_token" });
  if (!expectedToken) return json(500, { error: "missing_server_secrets" });
  if (suppliedToken !== expectedToken) return json(403, { error: "invalid_sync_token" });

  const SB_URL = Deno.env.get("SB_URL");
  const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY");
  if (!SB_URL || !SB_SERVICE_ROLE_KEY) return json(500, { error: "missing_server_secrets" });

  const supabaseAdmin = createClient(SB_URL, SB_SERVICE_ROLE_KEY);

  const { data, error } = await supabaseAdmin
    .from("guests")
    .select(GUEST_COLUMNS.join(","))
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true });

  if (error) {
    return jsonError(500, "guest_export_failed", error, { phase: "select_guests" });
  }

  const rows = Array.isArray(data) ? data.map(row => mapGuestRowToArray(row as GuestRow)) : [];

  return json(200, {
    ok: true,
    columns: [...GUEST_COLUMNS],
    rows,
    exported_at: new Date().toISOString(),
  });
});
