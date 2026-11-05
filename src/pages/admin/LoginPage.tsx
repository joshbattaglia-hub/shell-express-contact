import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BrandHeader from "../../components/BrandHeader";
import { api, type Tenant } from "../../lib/api";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tab: Tenant = params.get("t") === "coco" ? "coco" : "ca";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ authenticated: boolean }>(tab, "admin-session")
      .then((r) => {
        if (r.authenticated) navigate(`/admin/app/enquiries?t=${tab}`, { replace: true });
      })
      .catch(() => {});
  }, [navigate, tab]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(tab, "admin-login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      navigate(`/admin/app/enquiries?t=${tab}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <BrandHeader subtitle="Admin" compact homeTo="/" />
      <form className="card form-stack" onSubmit={onSubmit} style={{ maxWidth: 420, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: "1.35rem" }}>Admin sign in</h1>
        <p className="muted" style={{ margin: 0, fontSize: ".9rem" }}>
          One password for CA and CoCo. Switch tenants after sign-in.
        </p>
        {error ? <div className="error-banner">{error}</div> : null}
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
