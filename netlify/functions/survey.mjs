import {
  json, corsHeaders, requireAdmin, ensureSeeded, loadSurvey, saveSurvey,
  requireTenantOrError,
} from "./lib/store.mjs";

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  const { tenant, error } = requireTenantOrError(event, origin);
  if (error) return error;
  if (tenant !== "coco") return json(400, { error: "Survey config is only for CoCo" }, origin);
  const denied = requireAdmin(event, origin, tenant);
  if (denied) return denied;

  try {
    await ensureSeeded(tenant);
    if (event.httpMethod === "GET") {
      const survey = await loadSurvey(tenant);
      return json(200, { survey }, origin);
    }
    if (event.httpMethod === "PUT" || event.httpMethod === "PATCH" || event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const prev = await loadSurvey(tenant);
      const next = await saveSurvey(tenant, {
        ...prev,
        title: body.title != null ? String(body.title) : prev.title,
        sitePickerEnabled: body.sitePickerEnabled != null ? !!body.sitePickerEnabled : prev.sitePickerEnabled,
        phoneNumber: body.phoneNumber != null ? String(body.phoneNumber) : prev.phoneNumber,
        contactEmail: body.contactEmail != null ? String(body.contactEmail) : prev.contactEmail,
        steps: Array.isArray(body.steps) ? body.steps : prev.steps,
      });
      return json(200, { survey: next }, origin);
    }
    return json(405, { error: "Method not allowed" }, origin);
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" }, origin);
  }
}
