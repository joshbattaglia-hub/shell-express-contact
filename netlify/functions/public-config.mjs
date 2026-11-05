import { json, corsHeaders, ensureSeeded } from "./lib/store.mjs";

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" }, origin);
  try {
    const { sites, fields } = await ensureSeeded();
    const publicSites = sites
      .filter((s) => s.active !== false)
      .map((s) => ({ id: s.id, name: s.name, address: s.address || "" }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const publicFields = [...fields]
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        required: !!f.required,
        options: f.options || [],
        accept: f.accept || null,
        maxBytes: f.maxBytes || null,
        help: f.help || null,
      }));
    return json(200, { sites: publicSites, fields: publicFields }, origin);
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" }, origin);
  }
}
