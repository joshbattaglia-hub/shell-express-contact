import {
  json,
  corsHeaders,
  requireAdmin,
  ensureSeeded,
  loadSites,
  saveSites,
  newId,
  melbourneNowIso,
} from "./lib/store.mjs";

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
      const { sites } = await loadSites();
      return json(200, { sites }, origin);
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const name = String(body.name || "").trim();
      if (!name) return json(400, { error: "Name required" }, origin);
      const { sites } = await loadSites();
      const site = {
        id: newId("site"),
        name,
        address: String(body.address || "").trim(),
        managerName: String(body.managerName || "").trim(),
        managerEmail: String(body.managerEmail || "").trim().toLowerCase(),
        active: body.active !== false,
        createdAt: melbourneNowIso(),
        updatedAt: melbourneNowIso(),
      };
      if (!site.managerEmail || !site.managerEmail.includes("@")) {
        return json(400, { error: "Manager email required" }, origin);
      }
      sites.push(site);
      await saveSites(sites, true);
      return json(201, { site }, origin);
    }

    if (event.httpMethod === "PATCH") {
      const body = JSON.parse(event.body || "{}");
      const id = String(body.id || "").trim();
      if (!id) return json(400, { error: "id required" }, origin);
      const { sites } = await loadSites();
      const idx = sites.findIndex((s) => s.id === id);
      if (idx === -1) return json(404, { error: "Site not found" }, origin);
      const cur = sites[idx];
      const next = {
        ...cur,
        name: body.name != null ? String(body.name).trim() : cur.name,
        address: body.address != null ? String(body.address).trim() : cur.address,
        managerName: body.managerName != null ? String(body.managerName).trim() : cur.managerName,
        managerEmail:
          body.managerEmail != null
            ? String(body.managerEmail).trim().toLowerCase()
            : cur.managerEmail,
        active: body.active != null ? !!body.active : cur.active,
        updatedAt: melbourneNowIso(),
      };
      if (!next.name) return json(400, { error: "Name required" }, origin);
      if (!next.managerEmail || !next.managerEmail.includes("@")) {
        return json(400, { error: "Manager email required" }, origin);
      }
      sites[idx] = next;
      await saveSites(sites, true);
      return json(200, { site: next }, origin);
    }

    if (event.httpMethod === "DELETE") {
      const body = JSON.parse(event.body || "{}");
      const id = String(body.id || event.queryStringParameters?.id || "").trim();
      if (!id) return json(400, { error: "id required" }, origin);
      const { sites } = await loadSites();
      const next = sites.filter((s) => s.id !== id);
      if (next.length === sites.length) return json(404, { error: "Site not found" }, origin);
      await saveSites(next, true);
      return json(200, { ok: true }, origin);
    }

    return json(405, { error: "Method not allowed" }, origin);
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" }, origin);
  }
}
