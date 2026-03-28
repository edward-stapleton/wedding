import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUILD_ID = "rsvp-submit-2026-03-28a";
const SITE_URL = "https://edlaura.com";
const EMAIL_LOGO_URL = `${SITE_URL}/assets/e-and-l-logo.jpg?v=20260222`;

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

function firstToken(value: string) {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  return tokens[0] ?? "";
}

function formatUtcAsDayMonthYearTime(isoTimestamp: string) {
  const timestamp = new Date(isoTimestamp);
  if (Number.isNaN(timestamp.getTime())) {
    return isoTimestamp;
  }

  const day = String(timestamp.getUTCDate()).padStart(2, "0");
  const month = String(timestamp.getUTCMonth() + 1).padStart(2, "0");
  const year = timestamp.getUTCFullYear();
  const hours = String(timestamp.getUTCHours()).padStart(2, "0");
  const minutes = String(timestamp.getUTCMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
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

function renderGuestTextLines(guest: GuestSummary) {
  const lines = [
    `${guest.name}`,
    `- Wedding attendance: ${guest.attendance}`,
    `- Cricket attendance: ${guest.cricketAttendance}`,
  ];
  if (guest.dietary) {
    lines.push(`- Dietary requirements: ${guest.dietary}`);
  }
  return lines;
}

function renderGuestHtml(guest: GuestSummary) {
  const dietaryLine = guest.dietary
    ? `<li style="color:#f7fbe9;margin:0 0 6px;"><strong style="color:#ffffff;">Dietary requirements:</strong> ${escapeHtml(guest.dietary)}</li>`
    : "";
  return [
    `<h3 style="margin:16px 0 8px;font-size:16px;line-height:1.4;color:#ffffff;font-family:'Stack Sans Headline', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">${escapeHtml(guest.name)}</h3>`,
    "<ul style=\"margin:0 0 12px 18px;padding:0;color:#f7fbe9;\">",
    `<li style="color:#f7fbe9;margin:0 0 6px;"><strong style="color:#ffffff;">Wedding attendance:</strong> ${escapeHtml(guest.attendance)}</li>`,
    `<li style="color:#f7fbe9;margin:0 0 6px;"><strong style="color:#ffffff;">Cricket attendance:</strong> ${escapeHtml(guest.cricketAttendance)}</li>`,
    dietaryLine,
    "</ul>",
  ].join("");
}

function buildRsvpConfirmationEmail(model: RsvpEmailModel) {
  const isCreated = model.submissionType === "created";
  const subject = isCreated
    ? "Thanks for completing your RSVP for our wedding!"
    : "We've noted the changes to your wedding RSVP";
  const greetingName = firstToken(model.primaryGuest.name) || "there";
  const submittedAtDisplay = formatUtcAsDayMonthYearTime(model.submittedAtIso);
  const intro = isCreated
    ? "Thanks for your RSVP. We've recorded your details below."
    : "Thanks for updating your RSVP. We've saved your latest details below.";

  const guestTextLines = [
    ...renderGuestTextLines(model.primaryGuest),
    ...(model.plusOneGuest ? ["", ...renderGuestTextLines(model.plusOneGuest)] : []),
  ];
  const addressTextLines = model.address.length
    ? ["", "Address:", ...model.address]
    : [];

  const text = [
    `Hi ${greetingName},`,
    "",
    intro,
    "",
    ...guestTextLines,
    ...addressTextLines,
    "",
    `Saved at (UTC): ${submittedAtDisplay}`,
    "",
    "If you want to check the details of the wedding at any point, feel free to return to the website and log in using your email and the website password!",
    "",
    "With love,",
    "Ed & Laura",
  ].join("\n");

  const addressHtml = model.address.length
    ? [
        "<p style=\"margin:16px 0 8px;color:#ffffff;line-height:1.5;font-family:'Stack Sans Headline', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;\"><strong style=\"color:#ffffff;\">Address:</strong></p>",
        `<p style="margin:0 0 12px;color:#f7fbe9;line-height:1.5;">${model.address.map(line => escapeHtml(line)).join("<br/>")}</p>`,
      ].join("")
    : "";

  const html = [
    "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:100%;min-width:100%;background-color:#EEF3E6;border-collapse:collapse;font-family:'Stack Sans Headline', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;\">",
    "<tr>",
    "<td align=\"center\" style=\"padding:32px 16px;background-color:#EEF3E6;\">",
    "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:100%;max-width:640px;border-collapse:collapse;\">",
    "<tr>",
    "<td style=\"background-color:#4F752A;color:#FFFFFF;line-height:1.5;padding:28px 24px 32px;text-align:left;\">",
    `<div style="text-align:center;margin:0 0 24px;"><img src="${EMAIL_LOGO_URL}" alt="Ed and Laura wedding logo" width="120" height="120" style="display:inline-block;width:120px;height:120px;max-width:120px;border:0;outline:none;text-decoration:none;" /></div>`,
    `<p style="margin:0 0 12px;color:#ffffff;line-height:1.5;">Hi ${escapeHtml(greetingName)},</p>`,
    `<p style="margin:0 0 12px;color:#f7fbe9;line-height:1.5;">${escapeHtml(intro)}</p>`,
    renderGuestHtml(model.primaryGuest),
    model.plusOneGuest ? renderGuestHtml(model.plusOneGuest) : "",
    addressHtml,
    `<p style="margin:16px 0 12px;color:#f7fbe9;line-height:1.5;"><strong style="color:#ffffff;">Saved at (UTC):</strong> ${escapeHtml(submittedAtDisplay)}</p>`,
    `<p style="margin:0 0 12px;color:#f7fbe9;line-height:1.5;">If you want to check the details of the wedding at any point, feel free to return to <a href="${SITE_URL}/" style="color:#ffffff;text-decoration:underline;">the website</a> and log in using your email and the website password!</p>`,
    "<p style=\"margin:0;color:#ffffff;line-height:1.5;\">With love,<br/>Ed &amp; Laura</p>",
    "</td>",
    "</tr>",
    "</table>",
    "</td>",
    "</tr>",
    "</table>",
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
  const analyticsUserIdHash = await buildAnalyticsUserIdHash(email);

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
    return jsonError(500, "guest_lookup_failed", findErr, { email, phase: "find_existing_guests" });
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
      return jsonError(500, "guest_update_failed", primaryUpdateErr, { email, role: "primary", phase: "update_existing_guest" });
    }

    if (includesPlusOne) {
      const { data: plusOneRow, error: plusOneLookupErr } = await supabaseAdmin
        .from("guests")
        .select("id")
        .eq("email", email)
        .eq("role", "plusone")
        .maybeSingle();

      if (plusOneLookupErr) {
        return jsonError(500, "guest_lookup_failed", plusOneLookupErr, { email, role: "plusone", phase: "lookup_existing_plusone" });
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
          return jsonError(500, "guest_update_failed", plusOneUpdateErr, { email, role: "plusone", phase: "update_existing_plusone" });
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
          return jsonError(500, "guest_insert_failed", plusOneInsertErr, { email, role: "plusone", phase: "insert_missing_plusone" });
        }
      }
    }

    const { data: updatedGuests, error: updatedSelectErr } = await supabaseAdmin
      .from("guests")
      .select("*")
      .eq("email", email)
      .order("role", { ascending: true });

    if (updatedSelectErr) {
      return jsonError(500, "guest_lookup_failed", updatedSelectErr, { email, phase: "select_updated_guests" });
    }

    const { error: inviteErr } = await supabaseAdmin
      .from("invites")
      .update({ redeemed_at: now })
      .eq("primary_email", email);

    if (inviteErr) {
      return jsonError(500, "invite_update_failed", inviteErr, { email, phase: "mark_invite_redeemed_existing" });
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
      submission_type: "updated" as SubmissionType,
      analytics_user_id_hash: analyticsUserIdHash,
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
    return jsonError(500, "invite_lookup_failed", inviteFindErr, { email, phase: "find_existing_invite" });
  }

  let inviteId = inviteExisting?.id;
  let createdInviteId: string | null = null;

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
      return jsonError(500, "invite_create_failed", inviteCreateErr, { email, phase: "create_invite" });
    }

    inviteId = inviteNew.id;
    createdInviteId = inviteNew.id;
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
    if (createdInviteId) {
      const { error: inviteCleanupErr } = await supabaseAdmin
        .from("invites")
        .delete()
        .eq("id", createdInviteId);

      if (inviteCleanupErr) {
        logServerError("invite_cleanup_failed", inviteCleanupErr, {
          email,
          inviteId: createdInviteId,
          phase: "cleanup_failed_invite_after_guest_insert_error",
        });
      }
    }

    return jsonError(500, "guest_insert_failed", guestInsertErr, {
      email,
      phase: "insert_new_guests",
      guestCount: guestsToInsert.length,
      inviteId,
      createdInviteId,
    });
  }

  const { error: inviteRedeemErr } = await supabaseAdmin
    .from("invites")
    .update({ redeemed_at: now })
    .eq("id", inviteId);

  if (inviteRedeemErr) {
    return jsonError(500, "invite_update_failed", inviteRedeemErr, { email, phase: "mark_invite_redeemed_new" });
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
    submission_type: "created" as SubmissionType,
    analytics_user_id_hash: analyticsUserIdHash,
    guests: insertedGuests ?? [],
    email_delivery: emailDelivery,
  });
});
