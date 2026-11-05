import {
  json,
  corsHeaders,
  requireAdmin,
  ensureSeeded,
  loadFields,
  saveFields,
  newId,
  melbourneNowIso,
} from "./lib/store.mjs";

const ALLOWED_TYPES = [
  "text",
  "email",
  "tel",
  "textarea",
  "select",
  "date",
  "datetime-local",
  "checkbox",
  "file",
  "site",
];

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }
  const denied = requireAdmin(event, origin);
  if (denied) return denied;

  try {
    await ensureSeeded();

    if (event.httpMethod === "GET") {
      const { fields } = await loadFields();
      const sorted = [...fields].sort((a, b) => (a.order || 0) - (b.order || 0));
      return json(200, { fields: sorted }, origin);
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      // Bulk reorder
      if (Array.isArray(body.reorder)) {
        const { fields } = await loadFields();
        const byId = Object.fromEntries(fields.map((f) => [f.id, f]));
        const next = [];
        body.reorder.forEach((id, i) => {
          if (byId[id]) next.push({ ...byId[id], order: (i + 1) * 10 });
        });
        // keep any missing at end
        for (const f of fields) {
          if (!next.find((x) => x.id === f.id)) next.push(f);
        }
        await saveFields(next, true);
        return json(200, { fields: next }, origin);
      }

      const label = String(body.label || "").trim();
      const type = String(body.type || "text").trim();
      if (!label) return json(400, { error: "Label required" }, origin);
      if (!ALLOWED_TYPES.includes(type)) {
        return json(400, { error: `type must be one of ${ALLOWED_TYPES.join(", ")}` }, origin);
      }
      const { fields } = await loadFields();
      const maxOrder = fields.reduce((m, f) => Math.max(m, f.order || 0), 0);
      const field = {
        id: body.id ? String(body.id).trim() : newId("field"),
        label,
        type,
        required: !!body.required,
        order: body.order != null ? Number(body.order) : maxOrder + 10,
        options: Array.isArray(body.options)
          ? body.options.map((o) => String(o).trim()).filter(Boolean)
          : String(body.optionsText || "")
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
        accept: body.accept || (type === "file" ? "image/*" : null),
        maxBytes: type === "file" ? Number(body.maxBytes || 4 * 1024 * 1024) : null,
        help: body.help ? String(body.help) : null,
        updatedAt: melbourneNowIso(),
      };
      if (fields.some((f) => f.id === field.id)) {
        return json(400, { error: "Field id already exists" }, origin);
      }
      fields.push(field);
      await saveFields(fields, true);
      return json(201, { field }, origin);
    }

    if (event.httpMethod === "PATCH") {
      const body = JSON.parse(event.body || "{}");
      const id = String(body.id || "").trim();
      if (!id) return json(400, { error: "id required" }, origin);
      const { fields } = await loadFields();
      const idx = fields.findIndex((f) => f.id === id);
      if (idx === -1) return json(404, { error: "Field not found" }, origin);
      const cur = fields[idx];
      if (body.type != null && !ALLOWED_TYPES.includes(body.type)) {
        return json(400, { error: `type must be one of ${ALLOWED_TYPES.join(", ")}` }, origin);
      }
      const next = {
        ...cur,
        label: body.label != null ? String(body.label).trim() : cur.label,
        type: body.type != null ? body.type : cur.type,
        required: body.required != null ? !!body.required : cur.required,
        order: body.order != null ? Number(body.order) : cur.order,
        options:
          body.options != null
            ? Array.isArray(body.options)
              ? body.options.map((o) => String(o).trim()).filter(Boolean)
              : String(body.options)
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean)
            : cur.options,
        help: body.help != null ? String(body.help) : cur.help,
        updatedAt: melbourneNowIso(),
      };
      if (!next.label) return json(400, { error: "Label required" }, origin);
      fields[idx] = next;
      await saveFields(fields, true);
      return json(200, { field: next }, origin);
    }

    if (event.httpMethod === "DELETE") {
      const body = JSON.parse(event.body || "{}");
      const id = String(body.id || event.queryStringParameters?.id || "").trim();
      if (!id) return json(400, { error: "id required" }, origin);
      if (id === "site_id") {
        return json(400, { error: "The Site field is required and cannot be removed" }, origin);
      }
      const { fields } = await loadFields();
      const next = fields.filter((f) => f.id !== id);
      if (next.length === fields.length) return json(404, { error: "Field not found" }, origin);
      await saveFields(next, true);
      return json(200, { ok: true }, origin);
    }

    return json(405, { error: "Method not allowed" }, origin);
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" }, origin);
  }
}
