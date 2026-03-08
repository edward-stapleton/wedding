import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUILD_ID = "rsvp-lookup-2026-03-08a";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

type LookupPayload = {
  email: string;
  sitePassword?: string;
  inviteToken?: string;
};

function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hashBytes = Array.from(new Uint8Array(digest));
  return hashBytes.map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function buildAnalyticsUserIdHash(email: string) {
  const salt = Deno.env.get("ANALYTICS_HASH_SALT") ?? "";
  if (!salt) return "";
  return await sha256Hex(`${email}${salt}`);
}

async function validateAccess(sitePassword?: string) {
  const expectedPassword = Deno.env.get("RSVP_SITE_PASSWORD") ?? "";
  if (!expectedPassword) return { ok: false as const, reason: "server_password_not_set" };

  if (sitePassword && sitePassword === expectedPassword) {
    return { ok: true as const };
  }

  return { ok: false as const, reason: "bad_password" };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Unknown error";
}

function hasCompletedRsvp(guests: Array<{ attendance?: string | null }> | null | undefined) {
  if (!Array.isArray(guests) || guests.length === 0) return false;
  return guests.some(guest => typeof guest.attendance === "string" && guest.attendance.trim() !== "");
}

function logServerError(event: string, error: unknown, extra: Record<string, unknown> = {}) {
  console.error(
    JSON.stringify({
      event,
      errorDetail: getErrorMessage(error),
      build: BUILD_ID,
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

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const SB_URL = Deno.env.get("SB_URL");
  const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY");
  if (!SB_URL || !SB_SERVICE_ROLE_KEY) return json(500, { error: "missing_server_secrets" });

  const supabaseAdmin = createClient(SB_URL, SB_SERVICE_ROLE_KEY);

  let payload: LookupPayload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const email = normaliseEmail(payload.email ?? "");
  if (!email.includes("@")) return json(400, { error: "invalid_email" });

  const access = await validateAccess(payload.sitePassword);
  if (!access.ok) return json(401, { error: "unauthorised", reason: access.reason });

  const { data: guests, error: guestsErr } = await supabaseAdmin
    .from("guests")
    .select("*")
    .eq("email", email);

  if (guestsErr) return jsonError(500, "guest_lookup_failed", guestsErr, { email, phase: "lookup_guests" });

  const analyticsUserIdHash = await buildAnalyticsUserIdHash(email);

  return json(200, {
    ok: true,
    email,
    rsvp_completed: hasCompletedRsvp(guests),
    analytics_user_id_hash: analyticsUserIdHash,
    guests: guests ?? [],
  });
});
