import { type FormEvent, useEffect, useState } from "react";
import { api, type SiteRecord } from "../../lib/api";

const blank = {
  name: "",
  address: "",
  managerName: "",
  managerEmail: "jbattaglia@libertyretail.com.au",
  active: true,
};

export default function SitesPage() {
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [form, setForm] = useState({ ...blank });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const data = await api<{ sites: SiteRecord[] }>("sites");
    setSites(data.sites || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  function startEdit(s: SiteRecord) {
    setEditId(s.id);
    setForm({
      name: s.name,
      address: s.address || "",
      managerName: s.managerName || "",
      managerEmail: s.managerEmail || "",
      active: s.active !== false,
    });
    setMsg("");
  }

  function reset() {
    setEditId(null);
    setForm({ ...blank });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      if (editId) {
        await api("sites", {
          method: "PATCH",
          body: JSON.stringify({ id: editId, ...form }),
        });
        setMsg("Site updated");
      } else {
        await api("sites", {
          method: "POST",
          body: JSON.stringify(form),
        });
        setMsg("Site added");
      }
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this site?")) return;
    await api("sites", { method: "DELETE", body: JSON.stringify({ id }) });
    await load();
  }

  return (
    <div>
      <h1 style={{ marginTop: 0, fontSize: "1.4rem" }}>Sites</h1>
      {error ? <div className="error-banner">{error}</div> : null}
      {msg ? <div className="success-banner">{msg}</div> : null}

      <form className="card form-stack" onSubmit={onSubmit} style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>{editId ? "Edit site" : "Add site"}</h2>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="name">Site name</label>
            <input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="address">Address</label>
            <input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="managerName">Manager name</label>
            <input id="managerName" value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="managerEmail">Manager email</label>
            <input id="managerEmail" type="email" required value={form.managerEmail} onChange={(e) => setForm({ ...form, managerEmail: e.target.value })} />
          </div>
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Active (shown on public form)
        </label>
        <div className="row-actions">
          <button className="btn btn-primary" type="submit">{editId ? "Save changes" : "Add site"}</button>
          {editId ? (
            <button className="btn btn-ghost" type="button" onClick={reset}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Manager</th>
              <th>Email</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.name}</strong>
                  {s.address ? <div className="muted">{s.address}</div> : null}
                </td>
                <td>{s.managerName || "—"}</td>
                <td>{s.managerEmail}</td>
                <td>{s.active !== false ? "Yes" : "No"}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn btn-ghost" type="button" onClick={() => startEdit(s)}>Edit</button>
                    <button className="btn btn-ghost" type="button" onClick={() => remove(s.id)}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
