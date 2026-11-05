import { useEffect, useState } from "react";
import { api, type Enquiry } from "../../lib/api";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  in_progress: "In progress",
  closed: "Closed",
};

export default function EnquiriesPage() {
  const [items, setItems] = useState<Enquiry[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const q = filter ? `?status=${encodeURIComponent(filter)}` : "";
      const data = await api<{ enquiries: Enquiry[] }>(`enquiries${q}`);
      setItems(data.enquiries || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function setStatus(id: string, status: string) {
    const data = await api<{ enquiry: Enquiry }>("enquiries", {
      method: "PATCH",
      body: JSON.stringify({ id, status }),
    });
    setItems((prev) => prev.map((e) => (e.id === id ? data.enquiry : e)));
    if (selected?.id === id) setSelected(data.enquiry);
  }

  async function exportCsv() {
    const res = await fetch("/api/enquiries?format=csv", { credentials: "include" });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "enquiries.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="toolbar">
        <h1 style={{ margin: 0, flex: 1, fontSize: "1.4rem" }}>Enquiries</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter status">
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="in_progress">In progress</option>
          <option value="closed">Closed</option>
        </select>
        <button className="btn btn-ghost" type="button" onClick={() => load()} disabled={busy}>
          Refresh
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => exportCsv().catch((e) => setError(e.message))}>
          Export CSV
        </button>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Ref</th>
              <th>When</th>
              <th>Site</th>
              <th>Type</th>
              <th>Name</th>
              <th>Status</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} style={{ cursor: "pointer" }} onClick={() => setSelected(e)}>
                <td><strong>{e.reference}</strong></td>
                <td>{new Date(e.createdAt).toLocaleString("en-AU", { timeZone: "Australia/Melbourne" })}</td>
                <td>{e.siteName}</td>
                <td>{e.values?.enquiry_type}</td>
                <td>{e.values?.name}</td>
                <td><span className={`badge ${e.status}`}>{STATUS_LABEL[e.status] || e.status}</span></td>
                <td className="muted" style={{ maxWidth: 160 }}>
                  {e.emailResult?.pending
                    ? e.emailResult.reason
                    : e.emailResult?.ok
                      ? "Sent"
                      : e.emailResult?.reason || "—"}
                </td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td colSpan={7} className="muted">
                  No enquiries yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="toolbar">
            <h2 style={{ margin: 0, fontSize: "1.15rem", flex: 1 }}>
              {selected.reference}
            </h2>
            <button className="btn btn-ghost" type="button" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <div className="grid-2">
            <div className="stack-sm">
              <div><strong>Site:</strong> {selected.siteName}</div>
              <div><strong>Type:</strong> {selected.values?.enquiry_type}</div>
              <div><strong>Name:</strong> {selected.values?.name}</div>
              <div><strong>Email:</strong> {selected.values?.email}</div>
              <div><strong>Phone:</strong> {selected.values?.phone || "—"}</div>
              <div><strong>Visit:</strong> {selected.values?.visit_at || "—"}</div>
            </div>
            <div className="stack-sm">
              <div>
                <strong>Status</strong>
                <div className="row-actions" style={{ marginTop: 6 }}>
                  {(["new", "in_progress", "closed"] as const).map((s) => (
                    <button
                      key={s}
                      className={`btn ${selected.status === s ? "btn-secondary" : "btn-ghost"}`}
                      type="button"
                      onClick={() => setStatus(selected.id, s)}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <strong>Email routing</strong>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  {selected.emailResult?.pending
                    ? selected.emailResult.reason
                    : selected.emailResult?.ok
                      ? `Sent via ${selected.emailResult.provider || "provider"}`
                      : selected.emailResult?.reason || "—"}
                </p>
              </div>
              {selected.attachment ? (
                <div>
                  <strong>Attachment</strong>
                  <p style={{ margin: "4px 0 0" }}>
                    <a href={`/api/attachment?id=${encodeURIComponent(selected.id)}`} target="_blank" rel="noreferrer">
                      {selected.attachment.filename}
                    </a>
                  </p>
                </div>
              ) : null}
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <strong>Message</strong>
            <p style={{ whiteSpace: "pre-wrap" }}>{selected.values?.message}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
