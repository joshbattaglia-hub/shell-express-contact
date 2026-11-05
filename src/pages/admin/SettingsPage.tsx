import { type FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";

type Settings = {
  fromName: string;
  ccAddress: string;
  emailEnabled: boolean;
};

type EmailInfo = {
  configured: boolean;
  provider: string | null;
  from: string | null;
  hint: string | null;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    fromName: "Shell Express Contact",
    ccAddress: "",
    emailEnabled: false,
  });
  const [email, setEmail] = useState<EmailInfo | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ settings: Settings; email: EmailInfo }>("settings")
      .then((d) => {
        setSettings(d.settings);
        setEmail(d.email);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      const d = await api<{ settings: Settings; email: EmailInfo }>("settings", {
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
          <label htmlFor="ccAddress">CC address (optional)</label>
          <input
            id="ccAddress"
            type="email"
            value={settings.ccAddress}
            onChange={(e) => setSettings({ ...settings, ccAddress: e.target.value })}
          />
        </div>
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
