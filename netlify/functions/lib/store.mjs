/**
 * Data + auth adapter for Netlify Blobs.
 * Swap this module (or point adapters below) when moving off Netlify.
 */
import { getStore } from "@netlify/blobs";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";

export const STORE_NAME = "shell-express-contact";
const SITES_KEY = "sites-registry";
const FIELDS_KEY = "fields-registry";
const SETTINGS_KEY = "app-settings";
const ENQUIRIES_PREFIX = "enquiries/";
const ATTACH_PREFIX = "attachments/";
const RATE_PREFIX = "rate/";

export const SEED_SITES = [
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

export const DEFAULT_FIELDS = [
  {
    id: "enquiry_type",
    label: "Enquiry type",
    type: "select",
    required: true,
    order: 10,
    options: ["Feedback", "Complaint", "Compliment", "Lost property", "Fuel/payment issue", "Other"],
  },
  {
    id: "site_id",
    label: "Site",
    type: "site",
    required: true,
    order: 20,
    options: [],
  },
  {
    id: "name",
    label: "Your name",
    type: "text",
    required: true,
    order: 30,
    options: [],
  },
  {
    id: "email",
    label: "Email",
    type: "email",
    required: true,
    order: 40,
    options: [],
  },
  {
    id: "phone",
    label: "Phone",
    type: "tel",
    required: false,
    order: 50,
    options: [],
  },
  {
    id: "visit_at",
    label: "Date / time of visit",
    type: "datetime-local",
    required: false,
    order: 60,
    options: [],
  },
  {
    id: "message",
    label: "Message",
    type: "textarea",
    required: true,
    order: 70,
    options: [],
  },
  {
    id: "photo",
    label: "Photo (optional)",
    type: "file",
    required: false,
    order: 80,
    options: [],
    accept: "image/*",
    maxBytes: 4 * 1024 * 1024,
  },
];

export const DEFAULT_SETTINGS = {
  fromName: "Shell Express Contact",
  ccAddress: "",
  emailEnabled: false,
  updatedAt: null,
};

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
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "shell-express-dev";
}

export function createSessionCookie() {
  const payload = { role: "admin", iat: Date.now() };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", sessionSecret()).update(data).digest("base64url");
  const token = `${data}.${sig}`;
  const secure = process.env.NODE_ENV === "production" || !!process.env.NETLIFY || !!process.env.CONTEXT || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  const parts = [
    `sec_session=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=604800",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie() {
  return "sec_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
}

export function parseCookies(header = "") {
  const out = {};
  for (const part of String(header).split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function verifySession(event) {
  const cookies = parseCookies(event.headers.cookie || event.headers.Cookie || "");
  const token = cookies.sec_session;
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
    return payload?.role === "admin";
  } catch {
    return false;
  }
}

export function requireAdmin(event, origin) {
  if (!verifySession(event)) return json(401, { error: "Unauthorized" }, origin);
  return null;
}

export function checkAdminPassword(password) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || !password) return false;
  const a = Buffer.from(String(password));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) {
    timingSafeEqual(Buffer.alloc(32), Buffer.alloc(32));
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function loadSites() {
  const store = getAppStore();
  const raw = await store.get(SITES_KEY, { type: "json" });
  if (!raw || !Array.isArray(raw.sites)) return { sites: [], seeded: false };
  return { sites: raw.sites, seeded: !!raw.seeded };
}

export async function saveSites(sites, seeded = true) {
  const store = getAppStore();
  await store.setJSON(SITES_KEY, { sites, seeded, updatedAt: melbourneNowIso() });
}

export async function loadFields() {
  const store = getAppStore();
  const raw = await store.get(FIELDS_KEY, { type: "json" });
  if (!raw || !Array.isArray(raw.fields)) return { fields: [], seeded: false };
  return { fields: raw.fields, seeded: !!raw.seeded };
}

export async function saveFields(fields, seeded = true) {
  const store = getAppStore();
  await store.setJSON(FIELDS_KEY, { fields, seeded, updatedAt: melbourneNowIso() });
}

export async function loadSettings() {
  const store = getAppStore();
  const raw = await store.get(SETTINGS_KEY, { type: "json" });
  return { ...DEFAULT_SETTINGS, ...(raw || {}) };
}

export async function saveSettings(settings) {
  const store = getAppStore();
  const next = { ...DEFAULT_SETTINGS, ...settings, updatedAt: melbourneNowIso() };
  await store.setJSON(SETTINGS_KEY, next);
  return next;
}

export async function ensureSeeded() {
  const sitesState = await loadSites();
  let sites = sitesState.sites;
  let createdSites = false;
  if (!sites.length && !sitesState.seeded) {
    const now = melbourneNowIso();
    sites = SEED_SITES.map((s) => ({
      id: newId("site"),
      ...s,
      active: true,
      createdAt: now,
      updatedAt: now,
    }));
    await saveSites(sites, true);
    createdSites = true;
  }

  const fieldsState = await loadFields();
  let fields = fieldsState.fields;
  let createdFields = false;
  if (!fields.length && !fieldsState.seeded) {
    fields = DEFAULT_FIELDS.map((f) => ({ ...f }));
    await saveFields(fields, true);
    createdFields = true;
  }

  const settings = await loadSettings();
  if (!settings.updatedAt) {
    await saveSettings(DEFAULT_SETTINGS);
  }

  return { sites, fields, createdSites, createdFields };
}

export function enquiryKey(id) {
  return `${ENQUIRIES_PREFIX}${id}.json`;
}

export function attachmentKey(enquiryId, filename) {
  return `${ATTACH_PREFIX}${enquiryId}/${filename}`;
}

export async function saveEnquiry(enquiry) {
  const store = getAppStore();
  await store.setJSON(enquiryKey(enquiry.id), enquiry);
  return enquiry;
}

export async function getEnquiry(id) {
  const store = getAppStore();
  return (await store.get(enquiryKey(id), { type: "json" })) || null;
}

export async function listEnquiries() {
  const store = getAppStore();
  const items = [];
  for await (const page of store.list({ prefix: ENQUIRIES_PREFIX, paginate: true })) {
    for (const b of page?.blobs || []) {
      const e = await store.get(b.key, { type: "json" });
      if (e) items.push(e);
    }
  }
  items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return items;
}

export async function saveAttachment(enquiryId, filename, bytes, contentType) {
  const store = getAppStore();
  const key = attachmentKey(enquiryId, filename);
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

/** Simple IP rate limit: max N submissions per window. */
export async function checkRateLimit(ip, { max = 8, windowMs = 15 * 60 * 1000 } = {}) {
  const store = getAppStore();
  const key = `${RATE_PREFIX}${slugify(ip || "unknown")}`;
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

export function makeReference() {
  const d = new Date();
  const y = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `SE-${y}-${rand}`;
}

export function clientIp(event) {
  const xf = event.headers["x-forwarded-for"] || event.headers["X-Forwarded-For"] || "";
  if (xf) return String(xf).split(",")[0].trim();
  return event.headers["client-ip"] || event.headers["x-nf-client-connection-ip"] || "unknown";
}
