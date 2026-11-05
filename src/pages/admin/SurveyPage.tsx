import { type FormEvent, useEffect, useState } from "react";
import { api, type SurveyConfig } from "../../lib/api";
import { useTenant } from "../../hooks/useTenant";

export default function AdminSurveyPage() {
  const tenant = useTenant();
  const [survey, setSurvey] = useState<SurveyConfig | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (tenant !== "coco") return;
    api<{ survey: SurveyConfig }>(tenant, "survey")
      .then((d) => setSurvey(d.survey))
      .catch((e) => setError(e.message));
  }, [tenant]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!survey) return;
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const d = await api<{ survey: SurveyConfig }>(tenant, "survey", {
        method: "PUT",
        body: JSON.stringify({
          title: survey.title,
          sitePickerEnabled: survey.sitePickerEnabled,
          phoneNumber: survey.phoneNumber,
          contactEmail: survey.contactEmail,
          steps: survey.steps,
        }),
      });
      setSurvey(d.survey);
      setMsg("Survey saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function updateQuestionOption(stepIdx: number, qIdx: number, optIdx: number, value: string) {
    if (!survey) return;
    const steps = structuredClone(survey.steps);
    const opts = steps[stepIdx].questions![qIdx].options || [];
    opts[optIdx] = value;
    steps[stepIdx].questions![qIdx].options = opts;
    setSurvey({ ...survey, steps });
  }

  function addOption(stepIdx: number, qIdx: number) {
    if (!survey) return;
    const steps = structuredClone(survey.steps);
    const opts = steps[stepIdx].questions![qIdx].options || [];
    opts.push("New option");
    steps[stepIdx].questions![qIdx].options = opts;
    setSurvey({ ...survey, steps });
  }

  function removeOption(stepIdx: number, qIdx: number, optIdx: number) {
    if (!survey) return;
    const steps = structuredClone(survey.steps);
    const opts = steps[stepIdx].questions![qIdx].options || [];
    opts.splice(optIdx, 1);
    steps[stepIdx].questions![qIdx].options = opts;
    setSurvey({ ...survey, steps });
  }

  if (tenant !== "coco") {
    return <p className="muted">Survey editor is only available for CoCo.</p>;
  }

  if (!survey) {
    return <p className="muted">{error || "Loading survey…"}</p>;
  }

  return (
    <div>
      <h1 style={{ marginTop: 0, fontSize: "1.4rem" }}>Survey</h1>
      {error ? <div className="error-banner">{error}</div> : null}
      {msg ? <div className="success-banner">{msg}</div> : null}

      <form className="card form-stack" onSubmit={onSubmit} style={{ maxWidth: 720 }}>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={survey.title}
            onChange={(e) => setSurvey({ ...survey, title: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="phone">Contact phone (shown in message)</label>
          <input
            id="phone"
            value={survey.phoneNumber}
            onChange={(e) => setSurvey({ ...survey, phoneNumber: e.target.value })}
            placeholder="xxxxxxxxx"
          />
        </div>
        <div className="field">
          <label htmlFor="email">Contact email (shown in message)</label>
          <input
            id="email"
            type="email"
            value={survey.contactEmail}
            onChange={(e) => setSurvey({ ...survey, contactEmail: e.target.value })}
          />
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={!!survey.sitePickerEnabled}
            onChange={(e) => setSurvey({ ...survey, sitePickerEnabled: e.target.checked })}
          />
          Show site picker on first step (off by default)
        </label>

        {survey.steps.map((step, si) => (
          <div key={step.id} className="card" style={{ boxShadow: "none", background: "var(--bg)" }}>
            <strong>
              Step: {step.id}
              {step.title ? ` — ${step.title}` : ""}
            </strong>
            {step.kind === "message" ? (
              <div className="field" style={{ marginTop: 10 }}>
                <label>Message (use {"{{phone}}"} and {"{{email}}"})</label>
                <textarea
                  value={step.message || ""}
                  onChange={(e) => {
                    const steps = structuredClone(survey.steps);
                    steps[si].message = e.target.value;
                    setSurvey({ ...survey, steps });
                  }}
                />
              </div>
            ) : (
              (step.questions || []).map((q, qi) => (
                <div key={q.id} style={{ marginTop: 12 }}>
                  <div className="field">
                    <label>Question ({q.id})</label>
                    <input
                      value={q.label}
                      onChange={(e) => {
                        const steps = structuredClone(survey.steps);
                        steps[si].questions![qi].label = e.target.value;
                        setSurvey({ ...survey, steps });
                      }}
                    />
                  </div>
                  {q.type === "single" ? (
                    <div className="stack-sm">
                      <p className="muted" style={{ margin: 0, fontSize: ".85rem" }}>
                        Options
                      </p>
                      {(q.options || []).map((opt, oi) => (
                        <div key={oi} style={{ display: "flex", gap: 8 }}>
                          <input
                            style={{ flex: 1 }}
                            value={opt}
                            onChange={(e) => updateQuestionOption(si, qi, oi, e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => removeOption(si, qi, oi)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button type="button" className="btn btn-ghost" onClick={() => addOption(si, qi)}>
                        Add option
                      </button>
                    </div>
                  ) : (
                    <p className="muted" style={{ fontSize: ".85rem" }}>
                      Type: Yes / No
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        ))}

        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save survey"}
        </button>
      </form>
    </div>
  );
}
