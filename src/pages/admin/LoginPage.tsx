import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandHeader from "../../components/BrandHeader";
import { api } from "../../lib/api";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ authenticated: boolean }>("admin-session")
      .then((r) => {
        if (r.authenticated) navigate("/admin/app/enquiries", { replace: true });
      })
      .catch(() => {});
  }, [navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("admin-login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      navigate("/admin/app/enquiries");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <BrandHeader subtitle="Admin" compact />
      <form className="card form-stack" onSubmit={onSubmit} style={{ maxWidth: 420, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: "1.35rem" }}>Admin sign in</h1>
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
