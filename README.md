# Shell Express Contact

Customer enquiry / contact landing page for Shell Express (Liberty Retail), modelled on a typical site-and-topic contact flow.

**Preview:** https://shell-express-contact.netlify.app

## Stack

Same pattern as SiteSnap:

- Static React (Vite) front end
- Netlify Functions (`/api/*`)
- Netlify Blobs for sites, form fields, enquiries, attachments, rate limits
- Admin session cookie (`ADMIN_PASSWORD` env)

## Portability

Data, email and auth sit behind small adapters so the app can move off Netlify later:

| Concern | Module | Swap notes |
|---------|--------|------------|
| Persistence | `netlify/functions/lib/store.mjs` | Replace `getAppStore()` / blob helpers with another KV or DB |
| Email | `netlify/functions/lib/email.mjs` | Resend + SMTP adapters; add providers without touching submit logic |
| Auth | `checkAdminPassword` / session helpers in `store.mjs` | Password + HMAC cookie; replace with your IdP later |

Front end talks only to `/api/*`.

## Public flow

1. `/` — choose enquiry topic
2. `/enquire` — dynamic form (fields from admin) + site dropdown + optional photo
3. `/confirm` — reference number

Spam controls: honeypot field + IP rate limit (Blobs).

## Admin (`/admin`)

Password-protected. Manage:

- **Sites** — name, address, manager name/email, active flag
- **Form fields** — add / edit / remove / reorder (types: text, email, tel, textarea, select, date, datetime-local, checkbox, file, site)
- **Enquiries** — list, status (new / in progress / closed), detail, CSV export
- **Settings** — from name, CC, email on/off

## Email (disabled until configured)

Enquiries are **always stored**. Email is attempted only when:

1. Settings → **Email on** is checked, **and**
2. Env vars are set for a provider

### Option A — Resend (recommended later)

1. Create a Resend account (not done for this preview — needs your OK)
2. Add + verify a domain (DNS records Resend shows)
3. In Netlify → Site configuration → Environment variables:

```bash
RESEND_API_KEY=re_...
EMAIL_FROM=contact@your-domain.example
ADMIN_PASSWORD=...   # already set for admin
SESSION_SECRET=...   # optional; defaults to ADMIN_PASSWORD
```

4. Turn **Email on** in admin Settings

### Option B — Microsoft 365 / generic SMTP

Ask IT for SMTP credentials, then set:

```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=noreply@your-domain.example
```

(Requires adding the `nodemailer` dependency before SMTP works.)

Until configured, each enquiry shows **`email pending: not configured`** (or disabled) in admin.

## Local / deploy

```bash
npm install
npm run build
netlify deploy --prod   # or link site first
```

Required env:

| Var | Purpose |
|-----|---------|
| `ADMIN_PASSWORD` | Admin login at `/admin` (set in Netlify UI → Project configuration → Environment variables) |
| `SESSION_SECRET` | Signs the admin cookie (optional; falls back to `ADMIN_PASSWORD`) |
| `BLOBS_SITE_ID` / `BLOBS_TOKEN` | Needed for Netlify Blobs when deploy is CLI-based (already set on this preview) |

Optional email vars as above.

## Seeded sites

All manager emails default to `jbattaglia@libertyretail.com.au`. Addresses left blank.

Moe, Campbeltown, Forest Hill Chase, Mernda, Birkdale, Edmonton, Dianella, Bremer, Highfields, Brookdale, West Lakes, Geelong West, Belmont (VIC).
