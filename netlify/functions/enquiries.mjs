import {
  json,
  corsHeaders,
  requireAdmin,
  ensureSeeded,
  listEnquiries,
  getEnquiry,
  saveEnquiry,
  melbourneNowIso,
} from "./lib/store.mjs";

const STATUSES = ["new", "in_progress", "closed"];

function toCsv(rows) {
  if (!rows.length) return "reference,createdAt,status,site,type,name,email,phone,message\n";
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = [
    "reference",
    "createdAt",
    "status",
    "site",
    "type",
    "name",
    "email",
    "phone",
    "visit_at",
    "message",
    "emailStatus",
  ];
  const lines = [header.join(",")];
  for (const e of rows) {
    lines.push(
      [
        e.reference,
        e.createdAt,
        e.status,
        e.siteName,
        e.values?.enquiry_type,
        e.values?.name,
        e.values?.email,
        e.values?.phone,
        e.values?.visit_at,
        e.values?.message,
        e.emailResult?.pending
          ? e.emailResult.reason
          : e.emailResult?.ok
            ? "sent"
            : e.emailResult?.reason || "",
      ]
        .map(escape)
        .join(",")
    );
  }
  return lines.join("\n");
}

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }
  const denied = requireAdmin(event, origin);
  if (denied) return denied;

  try {
    await ensureSeeded();
    const qs = event.queryStringParameters || {};

    if (event.httpMethod === "GET") {
      if (qs.id) {
        const e = await getEnquiry(qs.id);
        if (!e) return json(404, { error: "Not found" }, origin);
        return json(200, { enquiry: e }, origin);
      }
      const all = await listEnquiries();
      if (qs.format === "csv") {
        const csv = toCsv(all);
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="enquiries.csv"',
            ...corsHeaders(origin),
          },
          body: csv,
        };
      }
      const status = qs.status;
      const filtered = status ? all.filter((e) => e.status === status) : all;
      return json(200, { enquiries: filtered }, origin);
    }

    if (event.httpMethod === "PATCH") {
      const body = JSON.parse(event.body || "{}");
      const id = String(body.id || "").trim();
      if (!id) return json(400, { error: "id required" }, origin);
      const e = await getEnquiry(id);
      if (!e) return json(404, { error: "Not found" }, origin);
      if (body.status != null) {
        if (!STATUSES.includes(body.status)) {
          return json(400, { error: "status must be new, in_progress, or closed" }, origin);
        }
        e.status = body.status;
      }
      if (body.adminNote != null) e.adminNote = String(body.adminNote);
      e.updatedAt = melbourneNowIso();
      await saveEnquiry(e);
      return json(200, { enquiry: e }, origin);
    }

    return json(405, { error: "Method not allowed" }, origin);
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" }, origin);
  }
}
