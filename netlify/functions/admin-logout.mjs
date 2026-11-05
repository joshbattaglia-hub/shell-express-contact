import { json, corsHeaders, clearSessionCookie } from "./lib/store.mjs";

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }
  return json(200, { ok: true }, origin, { "Set-Cookie": clearSessionCookie() });
}
