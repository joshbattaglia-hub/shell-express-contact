import {
  json, corsHeaders, requireAdmin, ensureSeeded, loadSites, saveSites,
  newId, melbourneNowIso, requireTenantOrError,
} from "./lib/store.mjs";

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  const { tenant, error } = requireTenantOrError(event, origin);
  if (error) return error;
  const denied = requireAdmin(event, origin, tenant);
  if (denied) return denied;

  try {
    await ensureSeeded(tenant);
    if (event.httpMethod === "GET") {
      const { sites } = await loadSites(tenant);
      return json(200, { sites, tenant }, origin);
    }
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const name = String(body.name || "").trim();
      if (!name) return json(400, { error: "Name required" }, origin);
      const { sites, revision } = await loadSites(tenant);
      const site = {
        id: newId("site"), name,
        address: String(body.address || "").trim(),
        managerName: String(body.managerName || "").trim(),
        managerEmail: String(body.managerEmail || "").trim().toLowerCase(),
        active: body.active !== false,
        createdAt: melbourneNowIso(), updatedAt: melbourneNowIso(),
      };
      if (!site.managerEmail || !site.managerEmail.includes("@")) {
        return json(400, { error: "Manager email required" }, origin);
      }
      sites.push(site);
      await saveSites(tenant, sites, true, revision || undefined);
      return json(201, { site }, origin);
    }
    if (event.httpMethod === "PATCH") {
      const body = JSON.parse(event.body || "{}");
      const id = String(body.id || "").trim();
      if (!id) return json(400, { error: "id required" }, origin);
      const { sites, revision } = await loadSites(tenant);
      const idx = sites.findIndex((s) => s.id === id);
      if (idx === -1) return json(404, { error: "Site not found" }, origin);
      const cur = sites[idx];
      const next = {
        ...cur,
        name: body.name != null ? String(body.name).trim() : cur.name,
        address: body.address != null ? String(body.address).trim() : cur.address,
        managerName: body.managerName != null ? String(body.managerName).trim() : cur.managerName,
        managerEmail: body.managerEmail != null ? String(body.managerEmail).trim().toLowerCase() : cur.managerEmail,
        active: body.active != null ? !!body.active : cur.active,
        updatedAt: melbourneNowIso(),
      };
      if (!next.name) return json(400, { error: "Name required" }, origin);
      if (!next.managerEmail || !next.managerEmail.includes("@")) {
        return json(400, { error: "Manager email required" }, origin);
      }
      sites[idx] = next;
      await saveSites(tenant, sites, true, revision || undefined);
      return json(200, { site: next }, origin);
    }
    if (event.httpMethod === "DELETE") {
      const body = JSON.parse(event.body || "{}");
      const id = String(body.id || event.queryStringParameters?.id || "").trim();
      if (!id) return json(400, { error: "id required" }, origin);
      const { sites, revision } = await loadSites(tenant);
      const next = sites.filter((s) => s.id !== id);
      if (next.length === sites.length) return json(404, { error: "Site not found" }, origin);
      await saveSites(tenant, next, true, revision || undefined);
      return json(200, { ok: true }, origin);
    }
    return json(405, { error: "Method not allowed" }, origin);
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" }, origin);
  }
}
