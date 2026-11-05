# Express Help — Domain & email setup

Site: **shell-express-contact** on Netlify  
Primary domain: **https://expresshelp.com.au**  
Aliases (301 → primary): www.expresshelp.com.au, expresshelp.au, www.expresshelp.au, expresshelp.site, www.expresshelp.site  
Default Netlify URL (kept working): **https://shell-express-contact.netlify.app**

Do **not** change nameservers away from VentraIP. Use VentraIP’s free DNS Hosting only.  
`.au` registration may still be pending — finish that before DNS/SSL will fully work for `.au` names.

---

## 1. What Netlify already has

Configured on the Netlify site (no nameserver change):

| Role | Hostname |
| --- | --- |
| Primary custom domain | `expresshelp.com.au` |
| Alias | `www.expresshelp.com.au` |
| Alias | `expresshelp.au` |
| Alias | `www.expresshelp.au` |
| Alias | `expresshelp.site` |
| Alias | `www.expresshelp.site` |
| Default | `shell-express-contact.netlify.app` |

Redirects in `netlify.toml` send every alias (and HTTP) to **https://expresshelp.com.au**.  
SSL certificates are issued by Netlify **after** DNS points correctly — Domain management → HTTPS → Verify DNS configuration / Provision certificate. You cannot force HTTPS until a cert exists.

### Exact Netlify DNS targets (external DNS)

Confirmed from [Netlify external DNS docs](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/):

| Purpose | Type | Value |
| --- | --- | --- |
| Apex (bare domain) | **A** | `75.2.60.5` (Netlify load balancer) |
| Optional apex (if provider supports ALIAS/ANAME/flattened CNAME) | ALIAS/ANAME | `apex-loadbalancer.netlify.com` |
| `www` | **CNAME** | `shell-express-contact.netlify.app` |

Prefer the A record at VentraIP unless their DNS UI offers ALIAS/ANAME for apex.  
Remove any **AAAA** (IPv6) records — Netlify’s load-balancer IP path does not use them for certs.

---

## 2. VentraIP DNS — step by step (all three domains)

Repeat for each of:

1. `expresshelp.com.au` (primary)
2. `expresshelp.au`
3. `expresshelp.site`

### Open DNS hosting

1. Sign in to **VIPcontrol** (VentraIP).
2. Open the domain → **DNS Hosting** / **Manage DNS**.
3. Stay on VentraIP nameservers (do not switch to Netlify DNS or another host).

### Delete parking / defaults

Delete any default parking records that conflict, for example:

- Apex **A** / **AAAA** pointing at VentraIP parking or an old host
- Apex or `www` **CNAME** to parking
- Extra apex **A** records (keep only Netlify’s)

### Records to add (TTL: 3600, or VentraIP default)

#### For `expresshelp.com.au`

| Type | Host / Name | Value | TTL |
| --- | --- | --- | --- |
| A | `@` (or blank / apex) | `75.2.60.5` | 3600 |
| CNAME | `www` | `shell-express-contact.netlify.app` | 3600 |

#### For `expresshelp.au`

| Type | Host / Name | Value | TTL |
| --- | --- | --- | --- |
| A | `@` | `75.2.60.5` | 3600 |
| CNAME | `www` | `shell-express-contact.netlify.app` | 3600 |

#### For `expresshelp.site`

| Type | Host / Name | Value | TTL |
| --- | --- | --- | --- |
| A | `@` | `75.2.60.5` | 3600 |
| CNAME | `www` | `shell-express-contact.netlify.app` | 3600 |

Notes:

- Some UIs want the host as `@` or the bare domain; others leave Host empty for apex.
- CNAME target should be `shell-express-contact.netlify.app` **without** a trailing dot unless VentraIP requires one.
- Propagation can take minutes to 24+ hours. Check with [dnschecker.org](https://dnschecker.org) (A → `75.2.60.5`, CNAME www → netlify.app).
- Pending **.au registration** must complete before `.com.au` / `.au` DNS is authoritative.

### After DNS propagates

1. Netlify → Project **shell-express-contact** → **Domain management**.
2. Confirm domains show as verified / DNS ready.
3. **HTTPS** → Verify DNS configuration → **Provision certificate**.
4. Once the cert exists, HTTPS is enforced (and aliases 301 to the apex).

---

## 3. Resend for `noreply@expresshelp.com.au` (Joshua signs up)

Do **not** use a third-party signup from this bot. Joshua completes Resend himself (free tier is enough to start).

1. Go to [https://resend.com](https://resend.com) and create a free account.
2. **Domains** → **Add domain** → `expresshelp.com.au`.
3. Choose region **ap-northeast-1 (Tokyo)** if offered; otherwise the closest Asia-Pacific / available region.
4. Resend shows DNS records to add at VentraIP on **expresshelp.com.au**. Typical pattern (copy the **exact** values Resend shows — do not invent):

| Type | Host (typical) | Purpose |
| --- | --- | --- |
| TXT | `resend._domainkey` | DKIM |
| MX | `send` | Return-path / bounce domain |
| TXT | `send` | SPF for the send subdomain |
| TXT | `_dmarc` (optional but recommended) | DMARC, e.g. `v=DMARC1; p=none;` |

5. Add those records in VIPcontrol → `expresshelp.com.au` → Manage DNS. Wait for Resend to show the domain as **Verified**.
6. Resend → **API Keys** → create a key with **Sending access only**. Copy it once.
7. Netlify → Site → **Environment variables** (Production / all scopes as appropriate):

| Key | Value |
| --- | --- |
| `RESEND_API_KEY` | *(the send-only key)* |
| `EMAIL_FROM` | `Shell Express <noreply@expresshelp.com.au>` |

8. Redeploy the site (or trigger a clear env refresh) so Functions pick up the vars.
9. Open **https://expresshelp.com.au/admin** (or the netlify.app `/admin`), sign in, switch **CA** and **CoCo** tabs, open **Settings**, turn **Email on**, Save.
10. Submit a test CA enquiry to confirm delivery to the site manager email.

App code posts to Resend’s current API: `POST https://api.resend.com/emails` with Bearer auth (`netlify/functions/lib/email.mjs`).

---

## 4. Admin reminder

- One admin: **/admin** — password from Netlify env **`ADMIN_PASSWORD`** only.
- Inside admin, use the **CA / CoCo** switcher; data stays separate per tenant.
- `/ca/admin` and `/coco/admin` redirect to `/admin?t=ca|coco`.
- Public forms do not link to admin.

---

## 5. Quick checklist

- [ ] `.au` registration complete  
- [ ] VentraIP A + www CNAME on all three domains; parking records removed  
- [ ] Netlify domains verified + TLS provisioned  
- [ ] Resend domain verified + `RESEND_API_KEY` + `EMAIL_FROM` set  
- [ ] Email toggled on in CA and CoCo settings  
- [ ] Test enquiry received  

