import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import BrandHeader from "../components/BrandHeader";
import { api, type FieldDef, type PublicSite } from "../lib/api";

export default function EnquiryPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [sites, setSites] = useState<PublicSite[]>([]);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<{
    dataBase64: string;
    filename: string;
    contentType: string;
  } | null>(null);
  const [hp, setHp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api<{ sites: PublicSite[]; fields: FieldDef[] }>("public-config")
      .then((data) => {
        setSites(data.sites || []);
        setFields(data.fields || []);
        const initial: Record<string, string> = {};
        const preType = params.get("type");
        if (preType) initial.enquiry_type = preType;
        setValues(initial);
        setLoaded(true);
      })
      .catch((e) => setError(e.message || "Failed to load form"));
  }, [params]);

  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [fields]
  );

  function setVal(id: string, v: string) {
    setValues((prev) => ({ ...prev, [id]: v }));
  }

  async function onFile(file: File | null, field: FieldDef) {
    if (!file) {
      setPhoto(null);
      return;
    }
    const max = field.maxBytes || 4 * 1024 * 1024;
    if (file.size > max) {
      setError(`Photo must be under ${Math.round(max / (1024 * 1024))}MB`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed");
      return;
    }
    const dataBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
    setPhoto({ dataBase64, filename: file.name, contentType: file.type });
    setError("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api<{ reference: string; id: string }>("submit", {
        method: "POST",
        body: JSON.stringify({
          values,
          photo,
          website: hp,
        }),
      });
      navigate(`/confirm?ref=${encodeURIComponent(res.reference)}`, {
        state: { reference: res.reference },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <BrandHeader subtitle="Enquiry form" compact />
      <div className="steps" aria-label="Progress">
        <span className="step-pill">1. Topic</span>
        <span className="step-pill on">2. Details</span>
        <span className="step-pill">3. Done</span>
      </div>
      <form className="card form-stack" onSubmit={onSubmit} noValidate>
        {error ? <div className="error-banner" role="alert">{error}</div> : null}
        {!loaded ? <p className="muted">Loading form…</p> : null}

        <div className="hp" aria-hidden="true">
          <label>
            Company website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
            />
          </label>
        </div>

        {sortedFields.map((f) => {
          if (f.type === "file") {
            return (
              <div className="field" key={f.id}>
                <label htmlFor={f.id}>
                  {f.label}
                  {f.required ? <span className="req"> *</span> : null}
                </label>
                <input
                  id={f.id}
                  type="file"
                  accept={f.accept || "image/*"}
                  onChange={(e) => onFile(e.target.files?.[0] || null, f)}
                />
                <p className="hint">Optional. Max 4MB. Images only.</p>
              </div>
            );
          }
          if (f.type === "site") {
            return (
              <div className="field" key={f.id}>
                <label htmlFor={f.id}>
                  {f.label}
                  {f.required ? <span className="req"> *</span> : null}
                </label>
                <select
                  id={f.id}
                  required={f.required}
                  value={values[f.id] || ""}
                  onChange={(e) => setVal(f.id, e.target.value)}
                >
                  <option value="">Select a site…</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          }
          if (f.type === "select") {
            return (
              <div className="field" key={f.id}>
                <label htmlFor={f.id}>
                  {f.label}
                  {f.required ? <span className="req"> *</span> : null}
                </label>
                <select
                  id={f.id}
                  required={f.required}
                  value={values[f.id] || ""}
                  onChange={(e) => setVal(f.id, e.target.value)}
                >
                  <option value="">Select…</option>
                  {(f.options || []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            );
          }
          if (f.type === "textarea") {
            return (
              <div className="field" key={f.id}>
                <label htmlFor={f.id}>
                  {f.label}
                  {f.required ? <span className="req"> *</span> : null}
                </label>
                <textarea
                  id={f.id}
                  required={f.required}
                  value={values[f.id] || ""}
                  onChange={(e) => setVal(f.id, e.target.value)}
                />
              </div>
            );
          }
          if (f.type === "checkbox") {
            return (
              <div className="field" key={f.id}>
                <label htmlFor={f.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    id={f.id}
                    type="checkbox"
                    checked={values[f.id] === "yes"}
                    onChange={(e) => setVal(f.id, e.target.checked ? "yes" : "")}
                  />
                  {f.label}
                  {f.required ? <span className="req"> *</span> : null}
                </label>
              </div>
            );
          }
          return (
            <div className="field" key={f.id}>
              <label htmlFor={f.id}>
                {f.label}
                {f.required ? <span className="req"> *</span> : null}
              </label>
              <input
                id={f.id}
                type={f.type === "datetime-local" ? "datetime-local" : f.type}
                required={f.required}
                value={values[f.id] || ""}
                onChange={(e) => setVal(f.id, e.target.value)}
                autoComplete={
                  f.id === "email" ? "email" : f.id === "name" ? "name" : f.id === "phone" ? "tel" : undefined
                }
              />
            </div>
          );
        })}

        <button className="btn btn-primary btn-block" type="submit" disabled={busy || !loaded}>
          {busy ? "Sending…" : "Submit enquiry"}
        </button>
        <p className="muted" style={{ margin: 0, fontSize: ".85rem", textAlign: "center" }}>
          <Link to="/">Back to topics</Link>
        </p>
      </form>
    </div>
  );
}
