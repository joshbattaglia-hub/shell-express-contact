import { type FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useTenant } from "../../hooks/useTenant";

type Settings = {
  fromName: string;
  ccAddress: string;
  emailEnabled: boolean;
  phoneNumber?: string;
  contactEmail?: string;
  headerSubtext?: string;
};

const DEFAULT_HEADER: Record<string, string> = {
  ca: "We're here to help · CA",
  coco: "CoCo feedback",
};

type EmailInfo = {
  configured: boolean;
  provider: string | null;
  from: string | null;
  hint: string | null;
};

export default function SettingsPage() {
  const tenant = useTenant();
  const [settings, setSettings] = useState<Settings>({
    fromName: "Shell Express Contact",
    ccAddress: "",
    emailEnabled: false,
    phoneNumber: "xxxxxxxxx",
    contactEmail: "jbattaglia@libertyretail.com.au",
    headerSubtext: DEFAULT_HEADER.ca,
  });
  const [email, setEmail] = useState<EmailInfo | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ settings: Settings; email: EmailInfo }>(tenant, "settings")
      .then((d) => {
        setSettings({
          fromName: d.settings.fromName || "Shell Express Contact",
          ccAddress: d.settings.ccAddress || "",
          emailEnabled: !!d.settings.emailEnabled,
          phoneNumber: d.settings.phoneNumber || "xxxxxxxxx",
          contactEmail: d.settings.contactEmail || "jbattaglia@libertyretail.com.au",
          headerSubtext:
            d.settings.headerSubtext != null
              ? d.settings.headerSubtext
              : DEFAULT_HEADER[tenant] || "",
        });
        setEmail(d.email);
      })
      .catch((e) => setError(e.message));
  }, [tenant]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      const d = await api<{ settings: Settings; email: EmailInfo }>(tenant, "settings", {
        method: "PATCH",
        body: JSON.stringify(settings),
      });
      setSettings(d.settings);
      setEmail(d.email);
      setMsg("Settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0, fontSize: "1.4rem" }}>Settings</h1>
      {error ? <div className="error-banner">{error}</div> : null}
      {msg ? <div className="success-banner">{msg}</div> : null}

      <form className="card form-stack" onSubmit={onSubmit} style={{ maxWidth: 560 }}>
        <div className="field">
          <label htmlFor="fromName">From name</label>
          <input
            id="fromName"
            value={settings.fromName}
            onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="headerSubtext">Header subtext</label>
          <input
            id="headerSubtext"
            value={settings.headerSubtext || ""}
            onChange={(e) => setSettings({ ...settings, headerSubtext: e.target.value })}
            placeholder={DEFAULT_HEADER[tenant] || ""}
          />
          <p className="hint">Shown under the logo on public {tenant === "coco" ? "CoCo" : "CA"} pages. Plain text only.</p>
        </div>
        <div className="field">
          <label htmlFor="ccAddress">CC address (optional)</label>
          <input
            id="ccAddress"
            type="email"
            value={settings.ccAddress}
            onChange={(e) => setSettings({ ...settings, ccAddress: e.target.value })}
          />
        </div>
        {tenant === "coco" ? (
          <>
            <div className="field">
              <label htmlFor="phoneNumber">Public phone number</label>
              <input
                id="phoneNumber"
                value={settings.phoneNumber || ""}
                onChange={(e) => setSettings({ ...settings, phoneNumber: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="contactEmail">Public contact email</label>
              <input
                id="contactEmail"
                type="email"
                value={settings.contactEmail || ""}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
              />
            </div>
          </>
        ) : null}
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={settings.emailEnabled}
            onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })}
          />
          Email on (still requires provider env vars)
        </label>

        <div className="card" style={{ background: "var(--yellow-20)", boxShadow: "none" }}>
          <strong>Email provider status</strong>
          <p className="muted" style={{ marginBottom: 0 }}>
            {email?.configured
              ? `Configured: ${email.provider} (from ${email.from})`
              : email?.hint || "Not configured"}
          </p>
          <p className="muted" style={{ fontSize: ".85rem" }}>
            Later: create a Resend account, verify a domain (DNS records), set
            <code> RESEND_API_KEY</code> and <code>EMAIL_FROM</code> in Netlify env —
            or ask IT for Microsoft 365 SMTP (<code>SMTP_HOST/PORT/USER/PASS</code> +
            <code> EMAIL_FROM</code>). No third-party sign-up was done for this preview.
          </p>
        </div>

        <button className="btn btn-primary" type="submit">
          Save settings
        </button>
      </form>
    </div>
  );
}
