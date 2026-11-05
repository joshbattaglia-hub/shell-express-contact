import {
  json,
  corsHeaders,
  requireAdmin,
  ensureSeeded,
  loadSettings,
  saveSettings,
} from "./lib/store.mjs";
import { emailStatus } from "./lib/email.mjs";

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }
  const denied = requireAdmin(event, origin);
  if (denied) return denied;

  try {
    await ensureSeeded();

    if (event.httpMethod === "GET") {
      const settings = await loadSettings();
      return json(200, { settings, email: emailStatus() }, origin);
    }

    if (event.httpMethod === "PATCH" || event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const prev = await loadSettings();
      const next = await saveSettings({
        ...prev,
        fromName: body.fromName != null ? String(body.fromName).trim() : prev.fromName,
        ccAddress: body.ccAddress != null ? String(body.ccAddress).trim() : prev.ccAddress,
        emailEnabled: body.emailEnabled != null ? !!body.emailEnabled : prev.emailEnabled,
      });
      return json(200, { settings: next, email: emailStatus() }, origin);
    }

    return json(405, { error: "Method not allowed" }, origin);
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" }, origin);
  }
}
