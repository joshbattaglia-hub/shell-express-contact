import {
  json,
  corsHeaders,
  checkAdminPassword,
  createSessionCookie,
  ensureSeeded,
} from "./lib/store.mjs";

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" }, origin);
  try {
    const body = JSON.parse(event.body || "{}");
    if (!checkAdminPassword(body.password)) {
      return json(401, { error: "Invalid password" }, origin);
    }
    await ensureSeeded();
    return json(200, { ok: true }, origin, { "Set-Cookie": createSessionCookie() });
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" }, origin);
  }
}
