import {
  json, corsHeaders, requireAdmin, ensureSeeded, loadFields, saveFields,
  newId, melbourneNowIso, requireTenantOrError,
} from "./lib/store.mjs";

const ALLOWED_TYPES = ["text","email","tel","textarea","select","date","datetime-local","checkbox","file","site"];

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  const { tenant, error } = requireTenantOrError(event, origin);
  if (error) return error;
  if (tenant !== "ca") return json(400, { error: "Form fields are only for CA; CoCo uses survey config" }, origin);
  const denied = requireAdmin(event, origin, tenant);
  if (denied) return denied;

  try {
    await ensureSeeded(tenant);
    if (event.httpMethod === "GET") {
      const { fields } = await loadFields(tenant);
      return json(200, { fields: [...fields].sort((a,b)=>(a.order||0)-(b.order||0)) }, origin);
    }
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      if (Array.isArray(body.reorder)) {
        const { fields } = await loadFields(tenant);
        const byId = Object.fromEntries(fields.map((f) => [f.id, f]));
        const next = [];
        body.reorder.forEach((id, i) => { if (byId[id]) next.push({ ...byId[id], order: (i + 1) * 10 }); });
        for (const f of fields) if (!next.find((x) => x.id === f.id)) next.push(f);
        await saveFields(tenant, next, true);
        return json(200, { fields: next }, origin);
      }
      const label = String(body.label || "").trim();
      const type = String(body.type || "text").trim();
      if (!label) return json(400, { error: "Label required" }, origin);
      if (!ALLOWED_TYPES.includes(type)) return json(400, { error: "Invalid type" }, origin);
      const { fields } = await loadFields(tenant);
      const maxOrder = fields.reduce((m, f) => Math.max(m, f.order || 0), 0);
      const field = {
        id: body.id ? String(body.id).trim() : newId("field"),
        label, type, required: !!body.required,
        order: body.order != null ? Number(body.order) : maxOrder + 10,
        options: Array.isArray(body.options) ? body.options.map(String).map((s)=>s.trim()).filter(Boolean)
          : String(body.optionsText||"").split("\n").map((s)=>s.trim()).filter(Boolean),
        accept: body.accept || (type === "file" ? "image/*" : null),
        maxBytes: type === "file" ? Number(body.maxBytes || 4*1024*1024) : null,
        help: body.help ? String(body.help) : null,
        updatedAt: melbourneNowIso(),
      };
      if (fields.some((f) => f.id === field.id)) return json(400, { error: "Field id already exists" }, origin);
      fields.push(field);
      await saveFields(tenant, fields, true);
      return json(201, { field }, origin);
    }
    if (event.httpMethod === "PATCH") {
      const body = JSON.parse(event.body || "{}");
      const id = String(body.id || "").trim();
      if (!id) return json(400, { error: "id required" }, origin);
      const { fields } = await loadFields(tenant);
      const idx = fields.findIndex((f) => f.id === id);
      if (idx === -1) return json(404, { error: "Field not found" }, origin);
      const cur = fields[idx];
      const next = {
        ...cur,
        label: body.label != null ? String(body.label).trim() : cur.label,
        type: body.type != null ? body.type : cur.type,
        required: body.required != null ? !!body.required : cur.required,
        order: body.order != null ? Number(body.order) : cur.order,
        options: body.options != null
          ? (Array.isArray(body.options) ? body.options : String(body.options).split("\n")).map(String).map((s)=>s.trim()).filter(Boolean)
          : cur.options,
        help: body.help != null ? String(body.help) : cur.help,
        updatedAt: melbourneNowIso(),
      };
      fields[idx] = next;
      await saveFields(tenant, fields, true);
      return json(200, { field: next }, origin);
    }
    if (event.httpMethod === "DELETE") {
      const body = JSON.parse(event.body || "{}");
      const id = String(body.id || event.queryStringParameters?.id || "").trim();
      if (!id) return json(400, { error: "id required" }, origin);
      if (id === "site_id") return json(400, { error: "The Site field cannot be removed" }, origin);
      const { fields } = await loadFields(tenant);
      const next = fields.filter((f) => f.id !== id);
      if (next.length === fields.length) return json(404, { error: "Field not found" }, origin);
      await saveFields(tenant, next, true);
      return json(200, { ok: true }, origin);
    }
    return json(405, { error: "Method not allowed" }, origin);
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" }, origin);
  }
}
