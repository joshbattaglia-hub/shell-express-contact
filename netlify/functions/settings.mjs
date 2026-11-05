import {
  json, corsHeaders, requireAdmin, ensureSeeded, loadSettings, saveSettings,
  requireTenantOrError,
} from "./lib/store.mjs";
import { emailStatus } from "./lib/email.mjs";

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  const { tenant, error } = requireTenantOrError(event, origin);
  if (error) return error;
  const denied = requireAdmin(event, origin, tenant);
  if (denied) return denied;

  try {
    await ensureSeeded(tenant);
    if (event.httpMethod === "GET") {
      const settings = await loadSettings(tenant);
      return json(200, { settings, email: emailStatus(), tenant }, origin);
    }
    if (event.httpMethod === "PATCH" || event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const prev = await loadSettings(tenant);
      const next = await saveSettings(tenant, {
        ...prev,
        fromName: body.fromName != null ? String(body.fromName).trim() : prev.fromName,
        ccAddress: body.ccAddress != null ? String(body.ccAddress).trim() : prev.ccAddress,
        emailEnabled: body.emailEnabled != null ? !!body.emailEnabled : prev.emailEnabled,
        phoneNumber: body.phoneNumber != null ? String(body.phoneNumber).trim() : prev.phoneNumber,
        contactEmail: body.contactEmail != null ? String(body.contactEmail).trim() : prev.contactEmail,
        headerSubtext: body.headerSubtext != null ? String(body.headerSubtext) : prev.headerSubtext,
      });
      return json(200, { settings: next, email: emailStatus(), tenant }, origin);
    }
    return json(405, { error: "Method not allowed" }, origin);
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" }, origin);
  }
}
