import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUILD_ID = "rsvp-submit-2026-02-22a";

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

type SubmissionType = "created" | "updated";
type EmailDeliveryStatus = "sent" | "failed" | "skipped";

type GuestRecord = {
  role?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  attendance?: string | null;
  cricket_attendance?: string | null;
  dietary?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
};

type GuestSummary = {
  name: string;
  attendance: string;
  cricketAttendance: string;
  dietary: string | null;
};

type RsvpEmailModel = {
  recipientEmail: string;
  submissionType: SubmissionType;
  submittedAtIso: string;
  primaryGuest: GuestSummary;
  plusOneGuest: GuestSummary | null;
  address: string[];
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

function cleanText(value: unknown) {
  return value?.toString().trim() ?? "";
}

function formatYesNo(value: unknown) {
  const normalized = normaliseYesNo(value);
  if (normalized === "yes") return "Yes";
  if (normalized === "no") return "No";
  return "Not provided";
}

function formatGuestName(firstName: unknown, lastName: unknown) {
  const first = cleanText(firstName);
  const last = cleanText(lastName);
  const combined = `${first} ${last}`.trim();
  return combined || "Guest";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toGuestSummary(guest: GuestRecord | undefined, fallbackName = "Guest"): GuestSummary {
  if (!guest) {
    return {
      name: fallbackName,
      attendance: "Not provided",
      cricketAttendance: "Not provided",
      dietary: null,
    };
  }

  const name = formatGuestName(guest.first_name, guest.last_name) || fallbackName;
  const dietary = cleanText(guest.dietary);

  return {
    name,
    attendance: formatYesNo(guest.attendance),
    cricketAttendance: formatYesNo(guest.cricket_attendance),
    dietary: dietary || null,
  };
}

function buildAddressLines(primaryGuest: GuestRecord | undefined) {
  if (!primaryGuest) return [];

  const line1 = cleanText(primaryGuest.address_line_1);
  const line2 = cleanText(primaryGuest.address_line_2);
  const city = cleanText(primaryGuest.city);
  const postcode = cleanText(primaryGuest.postcode);
  const country = cleanText(primaryGuest.country);

  const locality = [city, postcode].filter(Boolean).join(", ");
  return [line1, line2, locality, country].filter(Boolean);
}

function buildRsvpEmailModel(params: {
  recipientEmail: string;
  submissionType: SubmissionType;
  submittedAtIso: string;
  guests: GuestRecord[];
}): RsvpEmailModel {
  const primaryRow = params.guests.find(row => row.role === "primary") ?? params.guests[0];
  const plusOneRow = params.guests.find(row => row.role === "plusone");

  return {
    recipientEmail: params.recipientEmail,
    submissionType: params.submissionType,
    submittedAtIso: params.submittedAtIso,
    primaryGuest: toGuestSummary(primaryRow),
    plusOneGuest: plusOneRow ? toGuestSummary(plusOneRow, "Plus one") : null,
    address: buildAddressLines(primaryRow),
  };
}

function renderGuestTextLines(label: string, guest: GuestSummary) {
  const lines = [
    `${label}: ${guest.name}`,
    `- Wedding attendance: ${guest.attendance}`,
    `- Cricket attendance: ${guest.cricketAttendance}`,
  ];
  if (guest.dietary) {
    lines.push(`- Dietary requirements: ${guest.dietary}`);
  }
  return lines;
}

function renderGuestHtml(label: string, guest: GuestSummary) {
  const dietaryLine = guest.dietary
    ? `<li><strong>Dietary requirements:</strong> ${escapeHtml(guest.dietary)}</li>`
    : "";
  return [
    `<h3 style="margin:16px 0 8px;font-size:16px;">${escapeHtml(label)}: ${escapeHtml(guest.name)}</h3>`,
    "<ul style=\"margin:0 0 12px 18px;padding:0;\">",
    `<li><strong>Wedding attendance:</strong> ${escapeHtml(guest.attendance)}</li>`,
    `<li><strong>Cricket attendance:</strong> ${escapeHtml(guest.cricketAttendance)}</li>`,
    dietaryLine,
    "</ul>",
  ].join("");
}

function buildRsvpConfirmationEmail(model: RsvpEmailModel) {
  const isCreated = model.submissionType === "created";
  const subject = isCreated ? "We've received your RSVP" : "Your RSVP changes have been saved";
  const greetingName = model.primaryGuest.name || "there";
  const intro = isCreated
    ? "Thanks for your RSVP. We've recorded your details below."
    : "Thanks for updating your RSVP. We've saved your latest details below.";

  const guestTextLines = [
    ...renderGuestTextLines("Guest 1", model.primaryGuest),
    ...(model.plusOneGuest ? ["", ...renderGuestTextLines("Guest 2", model.plusOneGuest)] : []),
  ];
  const addressTextLines = model.address.length
    ? ["", "Address:", ...model.address.map(line => `- ${line}`)]
    : [];

  const text = [
    `Hi ${greetingName},`,
    "",
    intro,
    "",
    ...guestTextLines,
    ...addressTextLines,
    "",
    `Saved at (UTC): ${model.submittedAtIso}`,
    "",
    "With love,",
    "Edward & Laura",
  ].join("\n");

  const addressHtml = model.address.length
    ? [
        "<p style=\"margin:16px 0 8px;\"><strong>Address:</strong></p>",
        "<ul style=\"margin:0 0 12px 18px;padding:0;\">",
        ...model.address.map(line => `<li>${escapeHtml(line)}</li>`),
        "</ul>",
      ].join("")
    : "";

  const html = [
    "<div style=\"font-family:Arial, sans-serif; max-width:640px; color:#1f2937; line-height:1.5;\">",
    `<p>Hi ${escapeHtml(greetingName)},</p>`,
    `<p>${escapeHtml(intro)}</p>`,
    renderGuestHtml("Guest 1", model.primaryGuest),
    model.plusOneGuest ? renderGuestHtml("Guest 2", model.plusOneGuest) : "",
    addressHtml,
    `<p><strong>Saved at (UTC):</strong> ${escapeHtml(model.submittedAtIso)}</p>`,
    "<p>With love,<br/>Edward &amp; Laura</p>",
    "</div>",
  ].join("");

  return { subject, html, text };
}

function extractResendErrorDetail(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Unknown Resend error";
  }

  const obj = payload as Record<string, unknown>;
  if (typeof obj.message === "string" && obj.message.trim()) {
    return obj.message;
  }
  if (typeof obj.error === "string" && obj.error.trim()) {
    return obj.error;
  }
  if (Array.isArray(obj.errors) && obj.errors.length > 0) {
    const first = obj.errors[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const firstObj = first as Record<string, unknown>;
      if (typeof firstObj.message === "string") return firstObj.message;
    }
  }

  return "Unknown Resend error";
}

async function sendRsvpConfirmationEmail(params: {
  to: string;
  from: string;
  replyTo: string | string[];
  subject: string;
  html: string;
  text: string;
  apiKey: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      reply_to: params.replyTo,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    return {
      ok: false as const,
      resendStatusCode: response.status,
      errorDetail: extractResendErrorDetail(payload),
    };
  }

  const emailId =
    payload && typeof payload === "object" && typeof (payload as Record<string, unknown>).id === "string"
      ? ((payload as Record<string, unknown>).id as string)
      : null;

  return {
    ok: true as const,
    resendStatusCode: response.status,
    emailId,
  };
}

function parseReplyToAddresses(rawReplyTo: string, fallbackFromAddress: string) {
  const entries = rawReplyTo
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    return [fallbackFromAddress];
  }

  return entries;
}

async function maybeSendRsvpConfirmationEmail(params: {
  to: string;
  submissionType: SubmissionType;
  guests: GuestRecord[];
  submittedAtIso: string;
}): Promise<EmailDeliveryStatus> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "";
  const resendReplyToRaw = Deno.env.get("RSVP_CONFIRMATION_REPLY_TO") ?? "";

  if (!resendApiKey || !resendFromEmail) {
    console.warn(
      JSON.stringify({
        event: "email_skipped_missing_config",
        submissionType: params.submissionType,
        to: params.to,
        status: "skipped",
        build: BUILD_ID,
      }),
    );
    return "skipped";
  }

  const model = buildRsvpEmailModel({
    recipientEmail: params.to,
    submissionType: params.submissionType,
    submittedAtIso: params.submittedAtIso,
    guests: params.guests,
  });
  const message = buildRsvpConfirmationEmail(model);
  const replyToAddresses = parseReplyToAddresses(resendReplyToRaw, resendFromEmail);
  const resendReplyTo = replyToAddresses.length === 1 ? replyToAddresses[0] : replyToAddresses;

  try {
    const result = await sendRsvpConfirmationEmail({
      to: params.to,
      from: resendFromEmail,
      replyTo: resendReplyTo,
      subject: message.subject,
      html: message.html,
      text: message.text,
      apiKey: resendApiKey,
    });

    if (!result.ok) {
      console.error(
        JSON.stringify({
          event: "rsvp_confirmation_email",
          submissionType: params.submissionType,
          to: params.to,
          status: "failed",
          resendStatusCode: result.resendStatusCode,
          errorDetail: result.errorDetail,
          build: BUILD_ID,
        }),
      );
      return "failed";
    }

    console.log(
      JSON.stringify({
        event: "rsvp_confirmation_email",
        submissionType: params.submissionType,
        to: params.to,
        status: "sent",
        resendStatusCode: result.resendStatusCode,
        email_id: result.emailId,
        build: BUILD_ID,
      }),
    );
    return "sent";
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "rsvp_confirmation_email",
        submissionType: params.submissionType,
        to: params.to,
        status: "failed",
        resendStatusCode: null,
        errorDetail: error instanceof Error ? error.message : "Unknown email error",
        build: BUILD_ID,
      }),
    );
    return "failed";
  }
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

    const emailDelivery = await maybeSendRsvpConfirmationEmail({
      to: email,
      submissionType: "updated",
      guests: (updatedGuests ?? []) as GuestRecord[],
      submittedAtIso: now,
    });

    return json(200, {
      ok: true,
      email,
      rsvp_completed: true,
      guests: updatedGuests ?? [],
      email_delivery: emailDelivery,
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

  const emailDelivery = await maybeSendRsvpConfirmationEmail({
    to: email,
    submissionType: "created",
    guests: (insertedGuests ?? []) as GuestRecord[],
    submittedAtIso: now,
  });

  return json(200, {
    ok: true,
    email,
    rsvp_completed: true,
    guests: insertedGuests ?? [],
    email_delivery: emailDelivery,
  });
});
