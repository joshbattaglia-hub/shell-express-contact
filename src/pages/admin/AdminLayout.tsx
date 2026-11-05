import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { api, type Tenant } from "../../lib/api";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const tenant: Tenant = params.get("t") === "coco" ? "coco" : "ca";
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!params.get("t")) {
      setParams({ t: "ca" }, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => {
    api<{ authenticated: boolean }>(tenant, "admin-session")
      .then((r) => {
        if (!r.authenticated) navigate(`/admin?t=${tenant}`, { replace: true });
        else setReady(true);
      })
      .catch(() => navigate(`/admin?t=${tenant}`, { replace: true }));
  }, [navigate, tenant]);

  function switchTenant(next: Tenant) {
    const path = location.pathname;
    // When switching, land on a sensible page for that tenant
    let dest = path;
    if (next === "coco" && path.includes("/fields")) dest = "/admin/app/survey";
    if (next === "ca" && path.includes("/survey")) dest = "/admin/app/fields";
    navigate(`${dest}?t=${next}`);
  }

  async function logout() {
    await api(tenant, "admin-logout", { method: "POST" }).catch(() => {});
    navigate(`/admin?t=${tenant}`);
  }

  if (!ready) return <div className="page"><p className="muted">Checking session…</p></div>;

  const q = `?t=${tenant}`;

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/brand/logo-on-light.png" alt="" width={110} height={52} />
          <strong>Admin</strong>
        </div>
        <div className="tenant-switch" role="tablist" aria-label="Tenant">
          <button
            type="button"
            role="tab"
            aria-selected={tenant === "ca"}
            className={`tenant-tab${tenant === "ca" ? " active" : ""}`}
            onClick={() => switchTenant("ca")}
          >
            CA
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tenant === "coco"}
            className={`tenant-tab${tenant === "coco" ? " active" : ""}`}
            onClick={() => switchTenant("coco")}
          >
            CoCo
          </button>
        </div>
        <nav className="admin-nav" aria-label="Admin">
          <NavLink to={`/admin/app/enquiries${q}`} className={({ isActive }) => (isActive ? "active" : "")}>
            {tenant === "coco" ? "Responses" : "Enquiries"}
          </NavLink>
          <NavLink to={`/admin/app/sites${q}`} className={({ isActive }) => (isActive ? "active" : "")}>
            Sites
          </NavLink>
          {tenant === "ca" ? (
            <NavLink to={`/admin/app/fields${q}`} className={({ isActive }) => (isActive ? "active" : "")}>
              Form fields
            </NavLink>
          ) : (
            <NavLink to={`/admin/app/survey${q}`} className={({ isActive }) => (isActive ? "active" : "")}>
              Survey
            </NavLink>
          )}
          <NavLink to={`/admin/app/settings${q}`} className={({ isActive }) => (isActive ? "active" : "")}>
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
