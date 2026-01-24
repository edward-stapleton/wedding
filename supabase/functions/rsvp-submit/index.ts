import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUILD_ID = "rsvp-submit-2026-01-24a";

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

type SubmitPayload = {
  email: string;
  sitePassword?: string;
  // legacy field (ignored)
  inviteToken?: string;
  debug?: boolean;
  // these are required by our wedding flow
  address_line_1?: string;
  city?: string;
  postcode?: string;
  country?: string;
  first_name?: string;
  last_name?: string;
  rsvp: {
    attending: "yes" | "no" | "maybe";
    dietary_requirements?: string | null;
  };
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }

  const SB_URL = Deno.env.get("SB_URL");
  const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY");

  if (!SB_URL || !SB_SERVICE_ROLE_KEY) {
    return json(500, { error: "missing_server_secrets" });
  }

  const supabaseAdmin = createClient(SB_URL, SB_SERVICE_ROLE_KEY);

  let payload: SubmitPayload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }
  // DEBUG: echo back what the function received (before any DB calls)
  if (payload.debug === true || req.headers.get("x-debug") === "1") {
    return json(200, { ok: true, debug: { received: payload } });
  }

  const email = normaliseEmail(payload.email ?? "");
  if (!email.includes("@")) {
    return json(400, { error: "invalid_email" });
  }

  const access = await validateAccess(payload.sitePassword);
  if (!access.ok) {
    return json(401, { error: "unauthorised", reason: access.reason });
  }

  const attendance = payload.rsvp?.attending;
  if (!["yes", "no", "maybe"].includes(attendance)) {
    return json(400, { error: "invalid_attendance_value" });
  }

  const firstName = (payload.first_name ?? "").trim();
  const lastName = (payload.last_name ?? "").trim();
  if (!firstName || !lastName) {
    return json(400, {
      error: "missing_name",
      details: "Please enter your first name and surname.",
    });
  }

  const addressLine1 = (payload.address_line_1 ?? "").trim();
  const city = (payload.city ?? "").trim();
  const postcode = (payload.postcode ?? "").trim();
  const country = (payload.country ?? "").trim() || null;

  if (!addressLine1 || !city || !postcode) {
    return json(400, {
      error: "missing_address",
      details: "Please enter your address line 1, city, and postcode.",
    });
  }

  // 1) Look up existing guest rows by email
  const { data: foundGuests, error: findErr } = await supabaseAdmin
    .from("guests")
    .select("id, invitation_group_id, email")
    .eq("email", email);

  if (findErr) {
    return json(500, { error: "guest_lookup_failed", details: findErr.message });
  }

  // Returning respondent: update any existing guest rows with this email
  if (foundGuests && foundGuests.length > 0) {
    const { data: updatedGuests, error: updateErr } = await supabaseAdmin
      .from("guests")
      .update({
        attendance,
        dietary: payload.rsvp?.dietary_requirements ?? null,
        // If your guests table has NOT NULL first/last names, keep them consistent on update
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString(),
      })
      .eq("email", email)
      .select("*");

    if (updateErr) {
      return json(500, { error: "guest_update_failed", details: updateErr.message });
    }

    // mark invite as redeemed (if there is one for this email)
    const { error: inviteErr } = await supabaseAdmin
      .from("invites")
      .update({ redeemed_at: new Date().toISOString() })
      .eq("primary_email", email);

    if (inviteErr) {
      return json(500, { error: "invite_update_failed", details: inviteErr.message });
    }

    return json(200, {
      ok: true,
      email,
      rsvp_completed: true,
      guests: updatedGuests ?? [],
    });
  }

  // First-time respondent: find-or-create an invite, then create a primary guest row
  const { data: inviteExisting, error: inviteFindErr } = await supabaseAdmin
    .from("invites")
    .select("id")
    .eq("primary_email", email)
    .maybeSingle();

  if (inviteFindErr) {
    return json(500, { error: "invite_lookup_failed", details: inviteFindErr.message });
  }

  let inviteId = inviteExisting?.id;

  if (!inviteId) {
    const { data: inviteNew, error: inviteCreateErr } = await supabaseAdmin
      .from("invites")
      .insert({
        primary_email: email,
        token: crypto.randomUUID(),
        invite_type: "single",
      })
      .select("id")
      .single();

    if (inviteCreateErr) {
      return json(500, { error: "invite_create_failed", details: inviteCreateErr.message });
    }

    inviteId = inviteNew.id;
  }

  const guestToInsert = {
    invitation_group_id: inviteId,
    role: "primary" as const,
    first_name: firstName,
    last_name: lastName,
    address_line_1: addressLine1,
    city,
    postcode,
    country,
    email,
    attendance,
    dietary: payload.rsvp?.dietary_requirements ?? null,
    updated_at: new Date().toISOString(),
  };

  // TEMP DEBUG: set {"debug": true} in the JSON body to see what we'd insert
  if (payload.debug === true) {
    return json(200, { ok: true, debug: { guestToInsert } });
  }

  const { data: insertedGuests, error: guestInsertErr } = await supabaseAdmin
    .from("guests")
    .insert(guestToInsert)
    .select("*");

  if (guestInsertErr) {
    return json(500, {
      error: "guest_insert_failed",
      details: guestInsertErr.message,
      debug: { guestToInsert },
    });
  }

  const { error: inviteRedeemErr } = await supabaseAdmin
    .from("invites")
    .update({ redeemed_at: new Date().toISOString() })
    .eq("id", inviteId);

  if (inviteRedeemErr) {
    return json(500, { error: "invite_update_failed", details: inviteRedeemErr.message });
  }

  return json(200, {
    ok: true,
    email,
    rsvp_completed: true,
    guests: insertedGuests ?? [],
  });
});