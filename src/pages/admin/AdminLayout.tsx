import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useTenant, tenantPath } from "../../hooks/useTenant";

export default function AdminLayout() {
  const tenant = useTenant();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const label = tenant === "coco" ? "CoCo" : "CA";
  const base = tenantPath(tenant, "/admin/app");

  useEffect(() => {
    api<{ authenticated: boolean }>(tenant, "admin-session")
      .then((r) => {
        if (!r.authenticated) navigate(tenantPath(tenant, "/admin"), { replace: true });
        else setReady(true);
      })
      .catch(() => navigate(tenantPath(tenant, "/admin"), { replace: true }));
  }, [navigate, tenant]);

  async function logout() {
    await api(tenant, "admin-logout", { method: "POST" }).catch(() => {});
    navigate(tenantPath(tenant, "/admin"));
  }

  if (!ready) return <div className="page"><p className="muted">Checking session…</p></div>;

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/brand/logo-on-light.png" alt="" width={110} height={52} />
          <strong>{label} Admin</strong>
        </div>
        <nav className="admin-nav" aria-label="Admin">
          <NavLink to={`${base}/enquiries`} className={({ isActive }) => (isActive ? "active" : "")}>
            Enquiries
          </NavLink>
          <NavLink to={`${base}/sites`} className={({ isActive }) => (isActive ? "active" : "")}>
            Sites
          </NavLink>
          {tenant === "ca" ? (
            <NavLink to={`${base}/fields`} className={({ isActive }) => (isActive ? "active" : "")}>
              Form fields
            </NavLink>
          ) : (
            <NavLink to={`${base}/survey`} className={({ isActive }) => (isActive ? "active" : "")}>
              Survey
            </NavLink>
          )}
          <NavLink to={`${base}/settings`} className={({ isActive }) => (isActive ? "active" : "")}>
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
