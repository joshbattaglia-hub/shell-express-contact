import {
  json, corsHeaders, requireAdmin, ensureSeeded, listEnquiries, getEnquiry,
  saveEnquiry, melbourneNowIso, requireTenantOrError,
} from "./lib/store.mjs";

const STATUSES = ["new", "in_progress", "closed"];

function toCsv(rows) {
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["reference","createdAt","status","kind","site","answers_or_type","name","email","phone","message","path","emailStatus"];
  const lines = [header.join(",")];
  for (const e of rows) {
    const answers = e.kind === "survey" ? JSON.stringify(e.values || {}) : (e.values?.enquiry_type || "");
    lines.push([
      e.reference, e.createdAt, e.status, e.kind || "form", e.siteName || "",
      answers, e.values?.name, e.values?.email, e.values?.phone, e.values?.message,
      Array.isArray(e.path) ? e.path.join(">") : "",
      e.emailResult?.pending ? e.emailResult.reason : e.emailResult?.ok ? "sent" : e.emailResult?.reason || "",
    ].map(escape).join(","));
  }
  return lines.join("\n");
}

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  const { tenant, error } = requireTenantOrError(event, origin);
  if (error) return error;
  const denied = requireAdmin(event, origin, tenant);
  if (denied) return denied;

  try {
    await ensureSeeded(tenant);
    const qs = event.queryStringParameters || {};
    if (event.httpMethod === "GET") {
      if (qs.id) {
        const e = await getEnquiry(tenant, qs.id);
        if (!e) return json(404, { error: "Not found" }, origin);
        return json(200, { enquiry: e }, origin);
      }
      const all = await listEnquiries(tenant);
      if (qs.format === "csv") {
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${tenant}-enquiries.csv"`,
            ...corsHeaders(origin),
          },
          body: toCsv(all),
        };
      }
      const filtered = qs.status ? all.filter((e) => e.status === qs.status) : all;
      return json(200, { enquiries: filtered, tenant }, origin);
    }
    if (event.httpMethod === "PATCH") {
      const body = JSON.parse(event.body || "{}");
      const id = String(body.id || "").trim();
      if (!id) return json(400, { error: "id required" }, origin);
      const e = await getEnquiry(tenant, id);
      if (!e) return json(404, { error: "Not found" }, origin);
      if (body.status != null) {
        if (!STATUSES.includes(body.status)) return json(400, { error: "invalid status" }, origin);
        e.status = body.status;
      }
      if (body.adminNote != null) e.adminNote = String(body.adminNote);
      e.updatedAt = melbourneNowIso();
      await saveEnquiry(tenant, e);
      return json(200, { enquiry: e }, origin);
    }
    return json(405, { error: "Method not allowed" }, origin);
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" }, origin);
  }
}
