import { json, corsHeaders, verifySession, ensureSeeded, requireTenantOrError } from "./lib/store.mjs";

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  const { tenant, error } = requireTenantOrError(event, origin);
  if (error) return error;
  const ok = verifySession(event, tenant);
  if (ok) {
    try { await ensureSeeded(tenant); } catch (e) { console.error(e); }
  }
  return json(200, { authenticated: ok, tenant }, origin);
}
