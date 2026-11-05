import { type FormEvent, useEffect, useState } from "react";
import { api, type FieldDef } from "../../lib/api";
import { useTenant } from "../../hooks/useTenant";

const TYPES = [
  "text",
  "email",
  "tel",
  "textarea",
  "select",
  "date",
  "datetime-local",
  "checkbox",
  "file",
  "site",
];

export default function FieldsPage() {
  const tenant = useTenant();
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    label: "",
    type: "text",
    required: false,
    optionsText: "",
  });
  const [editId, setEditId] = useState<string | null>(null);

  async function load() {
    const data = await api<{ fields: FieldDef[] }>(tenant, "fields");
    setFields(data.fields || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  function startEdit(f: FieldDef) {
    setEditId(f.id);
    setForm({
      label: f.label,
      type: f.type,
      required: !!f.required,
      optionsText: (f.options || []).join("\n"),
    });
  }

  function reset() {
    setEditId(null);
    setForm({ label: "", type: "text", required: false, optionsText: "" });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    const payload = {
      label: form.label,
      type: form.type,
      required: form.required,
      options: form.optionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    try {
      if (editId) {
        await api(tenant, "fields", { method: "PATCH", body: JSON.stringify({ id: editId, ...payload }) });
        setMsg("Field updated");
      } else {
        await api(tenant, "fields", { method: "POST", body: JSON.stringify(payload) });
        setMsg("Field added");
      }
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this field?")) return;
    try {
      await api(tenant, "fields", { method: "DELETE", body: JSON.stringify({ id }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function move(id: string, dir: -1 | 1) {
    const ids = fields.map((f) => f.id);
    const idx = ids.indexOf(id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[idx], next[j]] = [next[j], next[idx]];
    await api(tenant, "fields", { method: "POST", body: JSON.stringify({ reorder: next }) });
    await load();
  }

  return (
    <div>
      <h1 style={{ marginTop: 0, fontSize: "1.4rem" }}>Form fields</h1>
      <p className="muted">
        These fields drive the public enquiry form. The Site field is required for routing.
      </p>
      {error ? <div className="error-banner">{error}</div> : null}
      {msg ? <div className="success-banner">{msg}</div> : null}

      <form className="card form-stack" onSubmit={onSubmit} style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>{editId ? "Edit field" : "Add field"}</h2>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="label">Label</label>
            <input id="label" required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="type">Type</label>
            <select id="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        {(form.type === "select") ? (
          <div className="field">
            <label htmlFor="options">Options (one per line)</label>
            <textarea id="options" value={form.optionsText} onChange={(e) => setForm({ ...form, optionsText: e.target.value })} />
          </div>
        ) : null}
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} />
          Required
        </label>
        <div className="row-actions">
          <button className="btn btn-primary" type="submit">{editId ? "Save changes" : "Add field"}</button>
          {editId ? <button className="btn btn-ghost" type="button" onClick={reset}>Cancel</button> : null}
        </div>
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Order</th>
              <th>Label</th>
              <th>Id</th>
              <th>Type</th>
              <th>Required</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f, i) => (
              <tr key={f.id}>
                <td>
                  <div className="row-actions">
                    <button className="btn btn-ghost" type="button" onClick={() => move(f.id, -1)} disabled={i === 0}>↑</button>
                    <button className="btn btn-ghost" type="button" onClick={() => move(f.id, 1)} disabled={i === fields.length - 1}>↓</button>
                  </div>
                </td>
                <td><strong>{f.label}</strong></td>
                <td><code>{f.id}</code></td>
                <td>{f.type}</td>
                <td>{f.required ? "Yes" : "No"}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn btn-ghost" type="button" onClick={() => startEdit(f)}>Edit</button>
                    <button className="btn btn-ghost" type="button" onClick={() => remove(f.id)} disabled={f.id === "site_id"}>Remove</button>
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
