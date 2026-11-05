import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";

export default function AdminLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api<{ authenticated: boolean }>("admin-session")
      .then((r) => {
        if (!r.authenticated) navigate("/admin", { replace: true });
        else setReady(true);
      })
      .catch(() => navigate("/admin", { replace: true }));
  }, [navigate]);

  async function logout() {
    await api("admin-logout", { method: "POST" }).catch(() => {});
    navigate("/admin");
  }

  if (!ready) return <div className="page"><p className="muted">Checking session…</p></div>;

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/brand/logo-on-light.png" alt="" width={110} height={52} />
          <strong>Admin</strong>
        </div>
        <nav className="admin-nav" aria-label="Admin">
          <NavLink to="/admin/app/enquiries" className={({ isActive }) => (isActive ? "active" : "")}>
            Enquiries
          </NavLink>
          <NavLink to="/admin/app/sites" className={({ isActive }) => (isActive ? "active" : "")}>
            Sites
          </NavLink>
          <NavLink to="/admin/app/fields" className={({ isActive }) => (isActive ? "active" : "")}>
            Form fields
          </NavLink>
          <NavLink to="/admin/app/settings" className={({ isActive }) => (isActive ? "active" : "")}>
            Settings
          </NavLink>
        </nav>
        <button className="btn btn-ghost" type="button" onClick={logout}>
          Sign out
        </button>
      </header>
      <main className="admin-body">
        <Outlet />
      </main>
    </div>
  );
}
