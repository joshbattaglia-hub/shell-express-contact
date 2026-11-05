import {
  json, corsHeaders, checkAdminPassword, createSessionCookie,
  ensureSeeded, requireTenantOrError,
} from "./lib/store.mjs";

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" }, origin);
  const { tenant, error } = requireTenantOrError(event, origin);
  if (error) return error;
  try {
    const body = JSON.parse(event.body || "{}");
    if (!checkAdminPassword(tenant, body.password)) {
      return json(401, { error: "Invalid password" }, origin);
    }
    await ensureSeeded(tenant);
    return json(200, { ok: true, tenant }, origin, { "Set-Cookie": createSessionCookie(tenant) });
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" }, origin);
  }
}
