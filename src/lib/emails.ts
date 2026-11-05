const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function parseManagerEmailsClient(input: string): { ok: true; emails: string[] } | { ok: false; error: string } {
  const parts = String(input || "")
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const emails: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const email = part.toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return { ok: false, error: `Invalid email address: ${part}` };
    }
    if (!seen.has(email)) {
      seen.add(email);
      emails.push(email);
    }
  }
  if (!emails.length) return { ok: false, error: "At least one manager email is required" };
  return { ok: true, emails };
}

export function displayManagerName(site: {
  managerName?: string;
  manager?: string;
  manager_name?: string;
}): string {
  return (
    String(site.managerName || "").trim() ||
    String(site.manager || "").trim() ||
    String(site.manager_name || "").trim() ||
    ""
  );
}

export function displayManagerEmails(site: {
  managerEmail?: string;
  managerEmails?: string[];
}): string {
  if (Array.isArray(site.managerEmails) && site.managerEmails.length) {
    return site.managerEmails.join(", ");
  }
  return String(site.managerEmail || "");
}
