import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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

async function validateAccess(sitePassword?: string) {
  const expectedPassword = Deno.env.get("RSVP_SITE_PASSWORD") ?? "";
  if (!expectedPassword) return { ok: false as const, reason: "server_password_not_set" };

  if (sitePassword && sitePassword === expectedPassword) {
    return { ok: true as const };
  }

  return { ok: false as const, reason: "bad_password" };
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

  if (guestsErr) return json(500, { error: "guest_lookup_failed", details: guestsErr.message });

  const { data: invite, error: inviteErr } = await supabaseAdmin
    .from("invites")
    .select("redeemed_at")
    .eq("primary_email", email)
    .maybeSingle();

  if (inviteErr) return json(500, { error: "invite_lookup_failed", details: inviteErr.message });

  return json(200, {
    ok: true,
    email,
    rsvp_completed: Boolean(invite?.redeemed_at),
    guests: guests ?? [],
  });
});
