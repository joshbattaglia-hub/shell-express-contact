import { json, corsHeaders, verifySession, ensureSeeded } from "./lib/store.mjs";

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }
  const ok = verifySession(event);
  if (ok) {
    try { await ensureSeeded(); } catch (e) { console.error(e); }
  }
  return json(200, { authenticated: ok }, origin);
}
