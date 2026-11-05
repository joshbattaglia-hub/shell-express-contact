import {
  json, corsHeaders, ensureSeeded, saveEnquiry, saveAttachment, makeReference,
  melbourneNowIso, newId, checkRateLimit, clientIp, loadSettings, requireTenantOrError,
  loadSurvey,
} from "./lib/store.mjs";
import { sendEnquiryEmail, buildEnquiryEmail } from "./lib/email.mjs";

const MAX_PHOTO = 4 * 1024 * 1024;

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" }, origin);
  const { tenant, error } = requireTenantOrError(event, origin);
  if (error) return error;

  try {
    const body = JSON.parse(event.body || "{}");
    if (body.website || body.company_url || body._hp) {
      return json(200, { ok: true, reference: makeReference(tenant), honeypot: true }, origin);
    }

    const ip = clientIp(event);
    const rl = await checkRateLimit(tenant, ip);
    if (!rl.ok) {
      return json(429, { error: "Too many submissions. Please try again later.", retryAfterSec: rl.retryAfterSec }, origin);
    }

    const { sites, fields } = await ensureSeeded(tenant);
    const settings = await loadSettings(tenant);
    const id = newId("enq");
    const reference = makeReference(tenant);

    // CoCo survey submission
    if (tenant === "coco" || body.mode === "survey") {
      const survey = await loadSurvey("coco");
      const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
      const path = Array.isArray(body.path) ? body.path : [];
      let siteId = String(body.site_id || answers.site_id || "").trim();
      let site = siteId ? sites.find((s) => s.id === siteId) : null;
      if (survey.sitePickerEnabled && (!site || site.active === false)) {
        return json(400, { error: "Please select a site" }, origin);
      }

      const enquiry = {
        id,
        reference,
        tenant: "coco",
        kind: "survey",
        siteId: site?.id || null,
        siteName: site?.name || null,
        status: "new",
        values: answers,
        path,
        attachment: null,
        createdAt: melbourneNowIso(),
        updatedAt: melbourneNowIso(),
        emailResult: { ok: false, pending: true, reason: "email pending: survey responses are stored only" },
      };
      await saveEnquiry("coco", enquiry);
      return json(201, { ok: true, reference, id, email: { status: "pending", reason: "stored only" } }, origin);
    }

    // CA form submission
    const values = body.values && typeof body.values === "object" ? body.values : body;
    for (const f of fields) {
      if (!f.required || f.type === "file") continue;
      const v = values[f.id];
      if (v == null || String(v).trim() === "") {
        return json(400, { error: `${f.label} is required` }, origin);
      }
    }
    const siteId = String(values.site_id || "").trim();
    const site = sites.find((s) => s.id === siteId);
    if (!site || site.active === false) return json(400, { error: "Please select a valid site" }, origin);
    const email = String(values.email || "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(400, { error: "Please enter a valid email" }, origin);
    }

    let attachment = null;
    if (body.photo && body.photo.dataBase64) {
      const raw = String(body.photo.dataBase64);
      const b64 = raw.includes(",") ? raw.split(",").pop() : raw;
      const buf = Buffer.from(b64, "base64");
      if (buf.length > MAX_PHOTO) return json(400, { error: "Photo must be under 4MB" }, origin);
      const filename = String(body.photo.filename || "photo.jpg").replace(/[^\w.\-]+/g, "_").slice(0, 80);
      const contentType = String(body.photo.contentType || "image/jpeg");
      if (!contentType.startsWith("image/")) return json(400, { error: "Only image attachments are allowed" }, origin);
      const key = await saveAttachment(tenant, id, filename, buf, contentType);
      attachment = { key, filename, contentType, byteSize: buf.length };
    }

    const cleanValues = {};
    for (const f of fields) {
      if (f.type === "file") continue;
      if (values[f.id] != null) cleanValues[f.id] = String(values[f.id]).trim();
    }

    const enquiry = {
      id, reference, tenant, kind: "form",
      siteId: site.id, siteName: site.name, status: "new",
      values: cleanValues, attachment,
      createdAt: melbourneNowIso(), updatedAt: melbourneNowIso(), emailResult: null,
    };
    const mail = buildEnquiryEmail({ enquiry, site, settings });
    const emailResult = await sendEnquiryEmail({ emailEnabled: !!settings.emailEnabled, ...mail });
    enquiry.emailResult = emailResult;
    await saveEnquiry(tenant, enquiry);

    return json(201, {
      ok: true, reference, id,
      email: emailResult.pending
        ? { status: "pending", reason: emailResult.reason }
        : emailResult.ok ? { status: "sent" } : { status: "error", reason: emailResult.reason },
    }, origin);
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" }, origin);
  }
}
