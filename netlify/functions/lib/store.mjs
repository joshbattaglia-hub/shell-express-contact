/**
 * Multi-tenant data + auth adapter (Netlify Blobs).
 * Tenants: ca | coco. Keys namespaced under t/{tenant}/.
 * Legacy unprefixed keys migrate into ca once.
 */
import { getStore } from "@netlify/blobs";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";

export const STORE_NAME = "shell-express-contact";
export const TENANTS = ["ca", "coco"];
export const TENANT_LABELS = { ca: "CA", coco: "CoCo" };

const LEGACY = {
  sites: "sites-registry",
  fields: "fields-registry",
  settings: "app-settings",
  enquiries: "enquiries/",
  attachments: "attachments/",
  rate: "rate/",
};

export const SEED_SITES_CA = [
  { name: "Shell Express Moe", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express Campbeltown", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express Forest Hill Chase", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express Mernda", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express Birkdale", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express Edmonton", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express Dianella", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express Bremer", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express Highfields", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express Brookdale", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express West Lakes", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express Geelong West", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express Belmont (VIC)", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
];

export const SEED_SITES_COCO = [
  { name: "Shell Express Horsham", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express Mount Gambier", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express Belmont Maude (NSW)", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express Charlestown", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express Sandy Bay", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Reddy Express Launceston", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Reddy Express Devonport", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express Nowra", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express Phillip", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express Pleasant Corner", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express Ponderosa", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
  { name: "Shell Express Hamilton", address: "", managerName: "", managerEmail: "jbattaglia@libertyretail.com.au" },
];

export const DEFAULT_FIELDS_CA = [
  { id: "enquiry_type", label: "Enquiry type", type: "select", required: true, order: 10, options: ["Feedback", "Complaint", "Compliment", "Lost property", "Fuel/payment issue", "Other"] },
  { id: "site_id", label: "Site", type: "site", required: true, order: 20, options: [] },
  { id: "name", label: "Your name", type: "text", required: true, order: 30, options: [] },
  { id: "email", label: "Email", type: "email", required: true, order: 40, options: [] },
  { id: "phone", label: "Phone", type: "tel", required: false, order: 50, options: [] },
  { id: "visit_at", label: "Date / time of visit", type: "datetime-local", required: false, order: 60, options: [] },
  { id: "message", label: "Message", type: "textarea", required: true, order: 70, options: [] },
  { id: "photo", label: "Photo (optional)", type: "file", required: false, order: 80, options: [], accept: "image/*", maxBytes: 4 * 1024 * 1024 },
];

/** Default CoCo survey config (editable in admin). */
export const DEFAULT_SURVEY_COCO = {
  title: "How did we do today?",
  sitePickerEnabled: false,
  phoneNumber: "xxxxxxxxx",
  contactEmail: "jbattaglia@libertyretail.com.au",
  steps: [
    {
      id: "step1",
      title: "How did we do today?",
      questions: [
        {
          id: "visit_again",
          label: "Will you visit Shell Express again?",
          type: "yesno",
          required: true,
        },
        {
          id: "want_contact",
          label: "Do you have any other feedback you would like to be contacted about?",
          type: "yesno",
          required: true,
        },
      ],
      next: {
        type: "branch",
        // if want_contact === Yes → step2, else → thanks
        rules: [
          { when: { questionId: "want_contact", equals: "Yes" }, goto: "step2" },
        ],
        default: "thanks",
      },
    },
    {
      id: "step2",
      title: "How did we do today?",
      showIf: { questionId: "want_contact", equals: "Yes" },
      questions: [
        {
          id: "feedback_topic",
          label: "What is your feedback in relation to?",
          type: "single",
          required: true,
          options: [
            "Need a printed receipt",
            "Paid for fuel but it didn't dispense",
            "Pre-authorisation query (e.g. paid $50 for fuel, only used $40, how do I get the difference back)",
            "Anything else",
          ],
        },
      ],
      next: { type: "goto", goto: "contact" },
    },
    {
      id: "contact",
      title: "How did we do today?",
      kind: "message",
      message:
        "Please call the Shell Express customer service team on {{phone}} or email {{email}} and we will contact you as soon as possible.",
      next: { type: "finish" },
      showIf: { questionId: "want_contact", equals: "Yes" },
    },
    {
      id: "thanks",
      title: "How did we do today?",
      kind: "message",
      message: "Thank you for your feedback.",
      next: { type: "finish" },
    },
  ],
  updatedAt: null,
};

export const DEFAULT_SETTINGS = {
  fromName: "Shell Express Contact",
  ccAddress: "",
  emailEnabled: false,
  phoneNumber: "xxxxxxxxx",
  contactEmail: "jbattaglia@libertyretail.com.au",
  updatedAt: null,
};

export function isTenant(t) {
  return TENANTS.includes(String(t || "").toLowerCase());
}

export function normalizeTenant(t) {
  const s = String(t || "").toLowerCase();
  return isTenant(s) ? s : null;
}

export function resolveTenant(event) {
  const qs = event.queryStringParameters || {};
  if (qs.tenant && isTenant(qs.tenant)) return normalizeTenant(qs.tenant);
  const path = String(event.path || "");
  const m = path.match(/\/(?:api\/)?(ca|coco)(?:\/|$)/i);
  if (m) return m[1].toLowerCase();
  const raw = String(event.rawUrl || event.headers?.["x-forwarded-url"] || "");
  const m2 = raw.match(/\/api\/(ca|coco)\//i);
  if (m2) return m2[1].toLowerCase();
  return "ca"; // legacy alias
}

function k(tenant, key) {
  return `t/${tenant}/${key}`;
}

export function getAppStore() {
  const siteID =
    process.env.BLOBS_SITE_ID ||
    process.env.NETLIFY_SITE_ID ||
    process.env.SITE_ID;
  const token = process.env.BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN;
  if (siteID && token) {
    return getStore({ name: STORE_NAME, siteID, token, consistency: "strong" });
  }
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export function newId(prefix = "id") {
  return `${prefix}-${randomBytes(8).toString("hex")}`;
}

export function slugify(name) {
  return (
    String(name || "item")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "item"
  );
}

export function melbourneNowIso() {
  return new Date().toISOString();
}

export function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin === "null" ? "*" : origin || "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  };
}

export function json(status, body, origin = "*", extraHeaders = {}) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

function sessionSecret() {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD_CA || process.env.ADMIN_PASSWORD || "shell-express-dev";
}

function cookieName(tenant) {
  return `sec_session_${tenant}`;
}

export function createSessionCookie(tenant) {
  const payload = { role: "admin", tenant, iat: Date.now() };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", sessionSecret()).update(data).digest("base64url");
  const token = `${data}.${sig}`;
  const secure =
    process.env.NODE_ENV === "production" ||
    !!process.env.NETLIFY ||
    !!process.env.CONTEXT ||
    !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  const parts = [
    `${cookieName(tenant)}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=604800",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(tenant) {
  return `${cookieName(tenant)}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function parseCookies(header = "") {
  const out = {};
  for (const part of String(header).split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(v);
  }
  return out;
}

export function verifySession(event, tenant) {
  const cookies = parseCookies(event.headers.cookie || event.headers.Cookie || "");
  const token = cookies[cookieName(tenant)];
  if (!token) return false;
  const [data, sig] = token.split(".");
  if (!data || !sig) return false;
  const expected = createHmac("sha256", sessionSecret()).update(data).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    if (!timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    return payload?.role === "admin" && payload?.tenant === tenant;
  } catch {
    return false;
  }
}

export function requireAdmin(event, origin, tenant) {
  if (!verifySession(event, tenant)) return json(401, { error: "Unauthorized" }, origin);
  return null;
}

export function adminPasswordEnvKey(tenant) {
  return `ADMIN_PASSWORD_${String(tenant).toUpperCase()}`;
}

export function checkAdminPassword(tenant, password) {
  let expected = process.env[adminPasswordEnvKey(tenant)] || "";
  // ca also accepts legacy ADMIN_PASSWORD
  if (!expected && tenant === "ca") expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || !password) return false;
  const a = Buffer.from(String(password));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) {
    timingSafeEqual(Buffer.alloc(32), Buffer.alloc(32));
    return false;
  }
  return timingSafeEqual(a, b);
}

async function copyBlobPrefix(store, fromPrefix, toPrefix) {
  let n = 0;
  for await (const page of store.list({ prefix: fromPrefix, paginate: true })) {
    for (const b of page?.blobs || []) {
      const meta = await store.getWithMetadata(b.key, { type: "arrayBuffer" });
      if (!meta?.data) continue;
      const dest = toPrefix + b.key.slice(fromPrefix.length);
      await store.set(dest, meta.data, { metadata: meta.metadata || {} });
      n += 1;
    }
  }
  return n;
}

/** One-time: move legacy root keys into t/ca/. */
export async function migrateLegacyToCa() {
  const store = getAppStore();
  const flag = await store.get("t/ca/_migrated", { type: "json" });
  if (flag?.ok) return { migrated: false, reason: "already" };

  const caSites = await store.get(k("ca", "sites-registry"), { type: "json" });
  const legacySites = await store.get(LEGACY.sites, { type: "json" });

  if (!caSites?.sites?.length && legacySites?.sites?.length) {
    await store.setJSON(k("ca", "sites-registry"), legacySites);
  }
  const caFields = await store.get(k("ca", "fields-registry"), { type: "json" });
  const legacyFields = await store.get(LEGACY.fields, { type: "json" });
  if (!caFields?.fields?.length && legacyFields?.fields?.length) {
    await store.setJSON(k("ca", "fields-registry"), legacyFields);
  }
  const caSettings = await store.get(k("ca", "app-settings"), { type: "json" });
  const legacySettings = await store.get(LEGACY.settings, { type: "json" });
  if (!caSettings && legacySettings) {
    await store.setJSON(k("ca", "app-settings"), legacySettings);
  }

  // enquiries + attachments
  const existingEnq = [];
  for await (const page of store.list({ prefix: k("ca", "enquiries/"), paginate: true })) {
    existingEnq.push(...(page?.blobs || []));
  }
  if (existingEnq.length === 0) {
    await copyBlobPrefix(store, LEGACY.enquiries, k("ca", "enquiries/"));
    await copyBlobPrefix(store, LEGACY.attachments, k("ca", "attachments/"));
  }

  await store.setJSON("t/ca/_migrated", { ok: true, at: melbourneNowIso() });
  return { migrated: true };
}

function seedSitesList(list) {
  const now = melbourneNowIso();
  return list.map((s) => ({
    id: newId("site"),
    ...s,
    active: true,
    createdAt: now,
    updatedAt: now,
  }));
}

export async function loadSites(tenant) {
  const store = getAppStore();
  const raw = await store.get(k(tenant, "sites-registry"), { type: "json" });
  if (!raw || !Array.isArray(raw.sites)) return { sites: [], seeded: false, revision: 0 };
  return { sites: raw.sites, seeded: !!raw.seeded, revision: Number(raw.revision || 0) };
}

export async function saveSites(tenant, sites, seeded = true, revision = undefined) {
  const store = getAppStore();
  const payload = {
    sites,
    seeded,
    updatedAt: melbourneNowIso(),
  };
  if (revision != null) payload.revision = revision;
  await store.setJSON(k(tenant, "sites-registry"), payload);
}

export async function loadFields(tenant) {
  const store = getAppStore();
  const raw = await store.get(k(tenant, "fields-registry"), { type: "json" });
  if (!raw || !Array.isArray(raw.fields)) return { fields: [], seeded: false };
  return { fields: raw.fields, seeded: !!raw.seeded };
}

export async function saveFields(tenant, fields, seeded = true) {
  const store = getAppStore();
  await store.setJSON(k(tenant, "fields-registry"), {
    fields,
    seeded,
    updatedAt: melbourneNowIso(),
  });
}

export async function loadSettings(tenant) {
  const store = getAppStore();
  const raw = await store.get(k(tenant, "app-settings"), { type: "json" });
  return { ...DEFAULT_SETTINGS, ...(raw || {}) };
}

export async function saveSettings(tenant, settings) {
  const store = getAppStore();
  const next = { ...DEFAULT_SETTINGS, ...settings, updatedAt: melbourneNowIso() };
  await store.setJSON(k(tenant, "app-settings"), next);
  return next;
}

export async function loadSurvey(tenant) {
  const store = getAppStore();
  const raw = await store.get(k(tenant, "survey-config"), { type: "json" });
  if (!raw) return { ...DEFAULT_SURVEY_COCO };
  return { ...DEFAULT_SURVEY_COCO, ...raw };
}

export async function saveSurvey(tenant, survey) {
  const store = getAppStore();
  const next = { ...survey, updatedAt: melbourneNowIso() };
  await store.setJSON(k(tenant, "survey-config"), next);
  return next;
}

export async function ensureSeeded(tenant) {
  if (tenant === "ca") {
    await migrateLegacyToCa();
  }

  const COCO_SITES_REVISION = 2; // replaces any prior CA-copy seed
  const sitesState = await loadSites(tenant);
  let sites = sitesState.sites;
  let createdSites = false;
  if (tenant === "coco" && sitesState.revision !== COCO_SITES_REVISION) {
    sites = seedSitesList(SEED_SITES_COCO);
    await saveSites(tenant, sites, true, COCO_SITES_REVISION);
    createdSites = true;
  } else if (!sites.length && !sitesState.seeded) {
    const seed = tenant === "coco" ? SEED_SITES_COCO : SEED_SITES_CA;
    const rev = tenant === "coco" ? COCO_SITES_REVISION : undefined;
    sites = seedSitesList(seed);
    await saveSites(tenant, sites, true, rev);
    createdSites = true;
  }

  let fields = [];
  let createdFields = false;
  if (tenant === "ca") {
    const fieldsState = await loadFields(tenant);
    fields = fieldsState.fields;
    if (!fields.length && !fieldsState.seeded) {
      fields = DEFAULT_FIELDS_CA.map((f) => ({ ...f }));
      await saveFields(tenant, fields, true);
      createdFields = true;
    }
  }

  const settings = await loadSettings(tenant);
  if (!settings.updatedAt) {
    await saveSettings(tenant, DEFAULT_SETTINGS);
  }

  if (tenant === "coco") {
    const store = getAppStore();
    const survey = await store.get(k("coco", "survey-config"), { type: "json" });
    if (!survey) {
      await saveSurvey("coco", DEFAULT_SURVEY_COCO);
    }
  }

  return { sites, fields, createdSites, createdFields };
}

export function enquiryKey(tenant, id) {
  return k(tenant, `enquiries/${id}.json`);
}

export function attachmentKey(tenant, enquiryId, filename) {
  return k(tenant, `attachments/${enquiryId}/${filename}`);
}

export async function saveEnquiry(tenant, enquiry) {
  const store = getAppStore();
  await store.setJSON(enquiryKey(tenant, enquiry.id), enquiry);
  return enquiry;
}

export async function getEnquiry(tenant, id) {
  const store = getAppStore();
  return (await store.get(enquiryKey(tenant, id), { type: "json" })) || null;
}

export async function listEnquiries(tenant) {
  const store = getAppStore();
  const items = [];
  for await (const page of store.list({
    prefix: k(tenant, "enquiries/"),
    paginate: true,
  })) {
    for (const b of page?.blobs || []) {
      const e = await store.get(b.key, { type: "json" });
      if (e) items.push(e);
    }
  }
  items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return items;
}

export async function saveAttachment(tenant, enquiryId, filename, bytes, contentType) {
  const store = getAppStore();
  const key = attachmentKey(tenant, enquiryId, filename);
  await store.set(key, bytes, {
    metadata: { contentType: contentType || "application/octet-stream", enquiryId },
  });
  return key;
}

export async function getAttachment(key) {
  const store = getAppStore();
  const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
  if (!result?.data) return null;
  return {
    data: result.data,
    contentType: result.metadata?.contentType || "application/octet-stream",
  };
}

export async function checkRateLimit(tenant, ip, { max = 8, windowMs = 15 * 60 * 1000 } = {}) {
  const store = getAppStore();
  const key = k(tenant, `rate/${slugify(ip || "unknown")}`);
  const now = Date.now();
  const raw = (await store.get(key, { type: "json" })) || { hits: [] };
  const hits = (raw.hits || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    return { ok: false, retryAfterSec: Math.ceil((hits[0] + windowMs - now) / 1000) };
  }
  hits.push(now);
  await store.setJSON(key, { hits, updatedAt: melbourneNowIso() });
  return { ok: true };
}

export function makeReference(tenant) {
  const d = new Date();
  const y = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = randomBytes(3).toString("hex").toUpperCase();
  const tag = String(tenant || "ca").toUpperCase();
  return `SE-${tag}-${y}-${rand}`;
}

export function clientIp(event) {
  const xf = event.headers["x-forwarded-for"] || event.headers["X-Forwarded-For"] || "";
  if (xf) return String(xf).split(",")[0].trim();
  return event.headers["client-ip"] || event.headers["x-nf-client-connection-ip"] || "unknown";
}

export function requireTenantOrError(event, origin) {
  const t = resolveTenant(event);
  if (!isTenant(t)) return { tenant: null, error: json(400, { error: "Unknown tenant" }, origin) };
  return { tenant: t, error: null };
}
