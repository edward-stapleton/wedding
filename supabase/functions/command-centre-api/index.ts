import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUILD_ID = "command-centre-api-2026-07-07a";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://plan.edlaura.com",
  "Access-Control-Allow-Headers": "content-type, x-cc-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const GUEST_COLUMNS = ["first_name", "last_name", "attendance", "cricket_attendance", "dietary"] as const;

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

function jsonError(status: number, errorCode: string, error?: unknown) {
  if (error) console.error(JSON.stringify({ event: errorCode, errorDetail: getErrorMessage(error), build: BUILD_ID }));
  return json(status, { error: errorCode });
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const expectedToken = Deno.env.get("CC_API_TOKEN") ?? "";
  const suppliedToken = req.headers.get("x-cc-token")?.trim() ?? "";
  if (!suppliedToken) return json(401, { error: "missing_token" });
  if (!expectedToken) return json(500, { error: "missing_server_secrets" });
  if (suppliedToken !== expectedToken) return json(403, { error: "invalid_token" });

  const SB_URL = Deno.env.get("SB_URL");
  const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY");
  if (!SB_URL || !SB_SERVICE_ROLE_KEY) return json(500, { error: "missing_server_secrets" });

  const supabaseAdmin = createClient(SB_URL, SB_SERVICE_ROLE_KEY);

  if (req.method === "GET") {
    const [guestsRes, stateRes] = await Promise.all([
      supabaseAdmin.from("guests").select(GUEST_COLUMNS.join(",")),
      supabaseAdmin.from("command_centre_state").select("key,data,updated_at,updated_by"),
    ]);

    if (guestsRes.error) return jsonError(500, "guests_fetch_failed", guestsRes.error);
    if (stateRes.error) return jsonError(500, "state_fetch_failed", stateRes.error);

    const state: Record<string, { data: unknown; updated_at: string; updated_by: string | null }> = {};
    for (const row of stateRes.data ?? []) {
      state[row.key as string] = { data: row.data, updated_at: row.updated_at, updated_by: row.updated_by };
    }

    return json(200, {
      ok: true,
      guests: guestsRes.data ?? [],
      seating: state.seating?.data ?? {},
      seating_updated_at: state.seating?.updated_at ?? null,
      seating_updated_by: state.seating?.updated_by ?? null,
      cricket: state.cricket?.data ?? {},
      cricket_updated_at: state.cricket?.updated_at ?? null,
      cricket_updated_by: state.cricket?.updated_by ?? null,
      generated_at: new Date().toISOString(),
    });
  }

  if (req.method === "POST") {
    let body: { type?: string; data?: unknown; updated_by?: string };
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "invalid_json" });
    }

    if (body.type !== "seating" && body.type !== "cricket") {
      return json(400, { error: "invalid_type" });
    }
    if (typeof body.data !== "object" || body.data === null) {
      return json(400, { error: "invalid_data" });
    }

    const { error } = await supabaseAdmin
      .from("command_centre_state")
      .update({
        data: body.data,
        updated_at: new Date().toISOString(),
        updated_by: typeof body.updated_by === "string" ? body.updated_by.slice(0, 200) : null,
      })
      .eq("key", body.type);

    if (error) return jsonError(500, "state_update_failed", error);
    return json(200, { ok: true });
  }

  return json(405, { error: "method_not_allowed" });
});
