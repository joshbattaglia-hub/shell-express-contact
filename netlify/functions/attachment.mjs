import {
  json, corsHeaders, requireAdmin, getEnquiry, getAttachment, requireTenantOrError,
} from "./lib/store.mjs";

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  const { tenant, error } = requireTenantOrError(event, origin);
  if (error) return error;
  const denied = requireAdmin(event, origin, tenant);
  if (denied) return denied;
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" }, origin);
  try {
    const id = event.queryStringParameters?.id;
    if (!id) return json(400, { error: "id required" }, origin);
    const e = await getEnquiry(tenant, id);
    if (!e?.attachment?.key) return json(404, { error: "No attachment" }, origin);
    const file = await getAttachment(e.attachment.key);
    if (!file) return json(404, { error: "Attachment missing" }, origin);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="${e.attachment.filename || "file"}"`,
        ...corsHeaders(origin),
      },
      body: Buffer.from(file.data).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" }, origin);
  }
}
