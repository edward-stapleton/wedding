import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUILD_ID = "rsvp-submit-2026-02-21a";

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
  // required by this flow
  address_line_1?: string;
  city?: string;
  postcode?: string;
  country?: string;
  first_name?: string;
  last_name?: string;
  rsvp: {
    attending: "yes" | "no";
    cricket_attending: "yes" | "no";
    dietary_requirements?: string | null;
    plusone?: {
      first_name?: string;
      last_name?: string;
      attending: "yes" | "no";
      cricket_attending: "yes" | "no";
      dietary_requirements?: string | null;
    } | null;
  };
};

function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

function normaliseYesNo(value: unknown) {
  const normalized = value?.toString().trim().toLowerCase();
  if (normalized === "yes" || normalized === "no") {
    return normalized;
  }
  return "";
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

  const primaryAttendance = normaliseYesNo(payload.rsvp?.attending);
  const primaryCricketAttendance = normaliseYesNo(payload.rsvp?.cricket_attending);
  if (!primaryAttendance) {
    return json(400, { error: "invalid_attendance_value" });
  }
  if (!primaryCricketAttendance) {
    return json(400, { error: "invalid_cricket_attendance_value" });
  }

  const plusOnePayload = payload.rsvp?.plusone ?? null;
  const includesPlusOne = plusOnePayload !== null;
  const plusOneAttendance = includesPlusOne ? normaliseYesNo(plusOnePayload?.attending) : "";
  const plusOneCricketAttendance = includesPlusOne
    ? normaliseYesNo(plusOnePayload?.cricket_attending)
    : "";

  if (includesPlusOne && !plusOneAttendance) {
    return json(400, { error: "invalid_plusone_attendance_value" });
  }

  if (includesPlusOne && !plusOneCricketAttendance) {
    return json(400, { error: "invalid_plusone_cricket_attendance_value" });
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

  const now = new Date().toISOString();

  const { data: foundGuests, error: findErr } = await supabaseAdmin
    .from("guests")
    .select("id, role, invitation_group_id")
    .eq("email", email);

  if (findErr) {
    return json(500, { error: "guest_lookup_failed", details: findErr.message });
  }

  if (foundGuests && foundGuests.length > 0) {
    const { error: primaryUpdateErr } = await supabaseAdmin
      .from("guests")
      .update({
        attendance: primaryAttendance,
        cricket_attendance: primaryCricketAttendance,
        dietary: payload.rsvp?.dietary_requirements ?? null,
        first_name: firstName,
        last_name: lastName,
        address_line_1: addressLine1,
        city,
        postcode,
        country,
        updated_at: now,
      })
      .eq("email", email)
      .eq("role", "primary");

    if (primaryUpdateErr) {
      return json(500, { error: "guest_update_failed", details: primaryUpdateErr.message });
    }

    if (includesPlusOne) {
      const { data: plusOneRow, error: plusOneLookupErr } = await supabaseAdmin
        .from("guests")
        .select("id")
        .eq("email", email)
        .eq("role", "plusone")
        .maybeSingle();

      if (plusOneLookupErr) {
        return json(500, { error: "guest_lookup_failed", details: plusOneLookupErr.message });
      }

      if (plusOneRow?.id) {
        const { error: plusOneUpdateErr } = await supabaseAdmin
          .from("guests")
          .update({
            attendance: plusOneAttendance,
            cricket_attendance: plusOneCricketAttendance,
            dietary: plusOnePayload?.dietary_requirements ?? null,
            first_name: (plusOnePayload?.first_name ?? "").trim(),
            last_name: (plusOnePayload?.last_name ?? "").trim(),
            address_line_1: addressLine1,
            city,
            postcode,
            country,
            updated_at: now,
          })
          .eq("id", plusOneRow.id);

        if (plusOneUpdateErr) {
          return json(500, { error: "guest_update_failed", details: plusOneUpdateErr.message });
        }
      } else {
        const primaryGroupId = foundGuests.find(row => row.role === "primary")?.invitation_group_id;
        if (!primaryGroupId) {
          return json(500, { error: "missing_invitation_group" });
        }

        const { error: plusOneInsertErr } = await supabaseAdmin
          .from("guests")
          .insert({
            invitation_group_id: primaryGroupId,
            role: "plusone",
            first_name: (plusOnePayload?.first_name ?? "").trim(),
            last_name: (plusOnePayload?.last_name ?? "").trim(),
            email,
            attendance: plusOneAttendance,
            cricket_attendance: plusOneCricketAttendance,
            dietary: plusOnePayload?.dietary_requirements ?? null,
            address_line_1: addressLine1,
            city,
            postcode,
            country,
            updated_at: now,
          });

        if (plusOneInsertErr) {
          return json(500, { error: "guest_insert_failed", details: plusOneInsertErr.message });
        }
      }
    }

    const { data: updatedGuests, error: updatedSelectErr } = await supabaseAdmin
      .from("guests")
      .select("*")
      .eq("email", email)
      .order("role", { ascending: true });

    if (updatedSelectErr) {
      return json(500, { error: "guest_lookup_failed", details: updatedSelectErr.message });
    }

    const { error: inviteErr } = await supabaseAdmin
      .from("invites")
      .update({ redeemed_at: now })
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
        invite_type: includesPlusOne ? "plusone" : "single",
      })
      .select("id")
      .single();

    if (inviteCreateErr) {
      return json(500, { error: "invite_create_failed", details: inviteCreateErr.message });
    }

    inviteId = inviteNew.id;
  }

  const guestsToInsert: Array<Record<string, unknown>> = [
    {
      invitation_group_id: inviteId,
      role: "primary",
      first_name: firstName,
      last_name: lastName,
      address_line_1: addressLine1,
      city,
      postcode,
      country,
      email,
      attendance: primaryAttendance,
      cricket_attendance: primaryCricketAttendance,
      dietary: payload.rsvp?.dietary_requirements ?? null,
      updated_at: now,
    },
  ];

  if (includesPlusOne) {
    guestsToInsert.push({
      invitation_group_id: inviteId,
      role: "plusone",
      first_name: (plusOnePayload?.first_name ?? "").trim(),
      last_name: (plusOnePayload?.last_name ?? "").trim(),
      address_line_1: addressLine1,
      city,
      postcode,
      country,
      email,
      attendance: plusOneAttendance,
      cricket_attendance: plusOneCricketAttendance,
      dietary: plusOnePayload?.dietary_requirements ?? null,
      updated_at: now,
    });
  }

  if (payload.debug === true) {
    return json(200, { ok: true, debug: { guestsToInsert } });
  }

  const { data: insertedGuests, error: guestInsertErr } = await supabaseAdmin
    .from("guests")
    .insert(guestsToInsert)
    .select("*")
    .order("role", { ascending: true });

  if (guestInsertErr) {
    return json(500, {
      error: "guest_insert_failed",
      details: guestInsertErr.message,
      debug: { guestsToInsert },
    });
  }

  const { error: inviteRedeemErr } = await supabaseAdmin
    .from("invites")
    .update({ redeemed_at: now })
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
