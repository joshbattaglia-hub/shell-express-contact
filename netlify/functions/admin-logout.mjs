import { json, corsHeaders, clearSessionCookie, requireTenantOrError } from "./lib/store.mjs";

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  const { tenant, error } = requireTenantOrError(event, origin);
  if (error) return error;
  return json(200, { ok: true }, origin, { "Set-Cookie": clearSessionCookie(tenant) });
}
