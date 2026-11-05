/**
 * Email adapter. Supports:
 *  - Resend (RESEND_API_KEY + EMAIL_FROM)
 *  - Generic SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM)
 * Never throws to callers for "not configured" — returns a pending status instead.
 * Do NOT wire Gmail/connectors here.
 */
import { recipientsFromSite } from "./recipients.mjs";

function configuredProvider() {
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) return "resend";
  if (process.env.SMTP_HOST && process.env.EMAIL_FROM) return "smtp";
  return null;
}

export function emailStatus() {
  const provider = configuredProvider();
  return {
    configured: !!provider,
    provider,
    from: process.env.EMAIL_FROM || null,
    hint: provider
      ? null
      : "Email not configured. Set RESEND_API_KEY + EMAIL_FROM (verified domain), or SMTP_HOST/PORT/USER/PASS + EMAIL_FROM.",
  };
}

function resolveFromAddress(from, fromName) {
  const raw = String(from || "").trim();
  // EMAIL_FROM may already be "Name <email@domain>" — use as-is
  if (/<[^>]+@[^>]+>/.test(raw)) return raw;
  if (fromName && raw) return `${fromName} <${raw}>`;
  return raw;
}

async function sendResend({ to, cc, from, fromName, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddr = resolveFromAddress(from, fromName);
  const body = {
    from: fromAddr,
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
    html,
  };
  if (cc) body.cc = Array.isArray(cc) ? cc : [cc];

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, provider: "resend", error: data?.message || res.statusText };
  }
  return { ok: true, provider: "resend", id: data.id || null };
}

async function sendSmtp({ to, cc, from, fromName, subject, text }) {
  // Lightweight SMTP via raw sockets is fragile; use nodemailer only if present.
  // For portability we attempt a dynamic import and otherwise report pending.
  let nodemailer;
  try {
    nodemailer = await import("nodemailer");
  } catch {
    return {
      ok: false,
      provider: "smtp",
      error: "nodemailer not installed. Add it as a dependency, or use Resend.",
    };
  }
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  const info = await transporter.sendMail({
    from: fromName ? `"${fromName}" <${from}>` : from,
    to: Array.isArray(to) ? to.join(", ") : to,
    cc: cc ? (Array.isArray(cc) ? cc.join(", ") : cc) : undefined,
    subject,
    text,
  });
  return { ok: true, provider: "smtp", id: info.messageId || null };
}

/**
 * Attempt to send. If emailEnabled is false or provider missing, returns pending.
 */
export async function sendEnquiryEmail({
  emailEnabled,
  to,
  cc,
  fromName,
  subject,
  text,
  html,
}) {
  if (!emailEnabled) {
    return {
      ok: false,
      pending: true,
      reason: "email pending: disabled in settings",
    };
  }
  const provider = configuredProvider();
  if (!provider) {
    return {
      ok: false,
      pending: true,
      reason: "email pending: not configured",
    };
  }
  const from = process.env.EMAIL_FROM;
  try {
    if (provider === "resend") {
      const r = await sendResend({ to, cc, from, fromName, subject, text, html });
      if (!r.ok) return { ok: false, pending: false, reason: r.error, provider };
      return { ok: true, pending: false, provider, id: r.id };
    }
    const r = await sendSmtp({ to, cc, from, fromName, subject, text });
    if (!r.ok) return { ok: false, pending: false, reason: r.error, provider };
    return { ok: true, pending: false, provider, id: r.id };
  } catch (err) {
    return {
      ok: false,
      pending: false,
      reason: err?.message || "send failed",
      provider,
    };
  }
}

export function buildEnquiryEmail({ enquiry, site, settings }) {
  const subject = `[Shell Express] ${enquiry.reference} — ${enquiry.values?.enquiry_type || "Enquiry"} — ${site?.name || "Site"}`;
  const lines = [
    `New Shell Express customer enquiry`,
    ``,
    `Reference: ${enquiry.reference}`,
    `Site: ${site?.name || enquiry.siteId}`,
    `Type: ${enquiry.values?.enquiry_type || ""}`,
    `Name: ${enquiry.values?.name || ""}`,
    `Email: ${enquiry.values?.email || ""}`,
    `Phone: ${enquiry.values?.phone || ""}`,
    `Visit: ${enquiry.values?.visit_at || ""}`,
    ``,
    `Message:`,
    enquiry.values?.message || "",
    ``,
    `Submitted: ${enquiry.createdAt}`,
    `Status: ${enquiry.status}`,
  ];
  if (enquiry.attachment) {
    lines.push(``, `Attachment: ${enquiry.attachment.filename} (stored in admin)`);
  }
  const text = lines.join("\n");
  const html = `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")}</pre>`;
  const to = recipientsFromSite(site);
  return {
    to,
    cc: settings?.ccAddress || undefined,
    fromName: settings?.fromName || "Shell Express Contact",
    subject,
    text,
    html,
  };
}

export { recipientsFromSite, parseManagerEmails, formatManagerEmails } from "./recipients.mjs";

