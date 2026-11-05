/**
 * Manager email parsing / normalization.
 * Accepts a string (comma/semicolon/whitespace separated), an array, or a site record.
 * Stores both managerEmails[] and managerEmail (normalized comma string) for compatibility.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function splitEmailInput(input) {
  if (Array.isArray(input)) {
    return input.flatMap((v) => splitEmailInput(v));
  }
  return String(input || "")
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @returns {{ ok: true, emails: string[] } | { ok: false, emails: string[], error: string }}
 */
export function parseManagerEmails(input) {
  const parts = splitEmailInput(input);
  const emails = [];
  const seen = new Set();
  for (const part of parts) {
    const email = part.toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return { ok: false, emails: [], error: `Invalid email address: ${part}` };
    }
    if (!seen.has(email)) {
      seen.add(email);
      emails.push(email);
    }
  }
  if (!emails.length) {
    return { ok: false, emails: [], error: "At least one manager email is required" };
  }
  return { ok: true, emails };
}

export function formatManagerEmails(emails) {
  if (!emails) return "";
  if (typeof emails === "string") {
    const parsed = parseManagerEmails(emails);
    return parsed.ok ? parsed.emails.join(", ") : String(emails).trim();
  }
  return (Array.isArray(emails) ? emails : []).map((e) => String(e).trim().toLowerCase()).filter(Boolean).join(", ");
}

/** Recipients for Resend `to` — always an array of strings. */
export function recipientsFromSite(site) {
  if (!site) return [];
  if (Array.isArray(site.managerEmails) && site.managerEmails.length) {
    const parsed = parseManagerEmails(site.managerEmails);
    return parsed.ok ? parsed.emails : [];
  }
  const parsed = parseManagerEmails(site.managerEmail);
  return parsed.ok ? parsed.emails : [];
}

/** Normalize a site record for API responses / storage. */
export function normalizeSiteRecord(site) {
  if (!site || typeof site !== "object") return site;
  const managerName =
    String(site.managerName ?? site.manager ?? site.manager_name ?? "").trim();
  const parsed = parseManagerEmails(
    site.managerEmails != null && (Array.isArray(site.managerEmails) ? site.managerEmails.length : String(site.managerEmails).trim())
      ? site.managerEmails
      : site.managerEmail
  );
  const managerEmails = parsed.ok ? parsed.emails : splitEmailInput(site.managerEmail).map((e) => e.toLowerCase());
  const managerEmail = formatManagerEmails(managerEmails);
  return {
    ...site,
    managerName,
    managerEmail,
    managerEmails,
  };
}
