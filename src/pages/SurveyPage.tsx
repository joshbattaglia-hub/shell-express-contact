import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import BrandHeader from "../components/BrandHeader";
import { api, type PublicSite, type SurveyConfig, type SurveyStep } from "../lib/api";
import { useTenant, tenantPath } from "../hooks/useTenant";

function fillTemplate(msg: string, phone: string, email: string) {
  return String(msg || "")
    .replace(/\{\{\s*phone\s*\}\}/gi, phone || "xxxxxxxxx")
    .replace(/\{\{\s*email\s*\}\}/gi, email || "");
}

function nextStepId(step: SurveyStep, answers: Record<string, string>): string | null {
  const n = step.next;
  if (!n) return null;
  if (n.type === "finish") return null;
  if (n.type === "goto") return n.goto || null;
  if (n.type === "branch") {
    for (const rule of n.rules || []) {
      const v = answers[rule.when.questionId];
      if (v === rule.when.equals) return rule.goto;
    }
    return n.default || null;
  }
  return null;
}

export default function SurveyPage() {
  const tenant = useTenant();
  const [survey, setSurvey] = useState<SurveyConfig | null>(null);
  const [sites, setSites] = useState<PublicSite[]>([]);
  const [stepId, setStepId] = useState<string>("step2");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [path, setPath] = useState<string[]>(["step2"]);
  const [siteId, setSiteId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ reference: string } | null>(null);
  const [logged, setLogged] = useState(false);
  const [headerSubtext, setHeaderSubtext] = useState("CoCo feedback");

  useEffect(() => {
    if (tenant !== "coco") return;
    api<{ survey: SurveyConfig; sites: PublicSite[]; headerSubtext?: string }>(tenant, "public-config")
      .then((d) => {
        setSurvey(d.survey);
        setSites(d.sites || []);
        if (d.headerSubtext != null) setHeaderSubtext(d.headerSubtext);
        const first = d.survey?.steps?.[0]?.id || "step2";
        setStepId(first);
        setPath([first]);
      })
      .catch((e) => setError(e.message || "Failed to load survey"));
  }, [tenant]);

  const step = useMemo(
    () => survey?.steps?.find((s) => s.id === stepId) || null,
    [survey, stepId]
  );

  async function logAndFinish(finalAnswers: Record<string, string>, finalPath: string[]) {
    if (logged) return;
    setBusy(true);
    setError("");
    try {
      const res = await api<{ reference: string }>(tenant, "submit", {
        method: "POST",
        body: JSON.stringify({
          mode: "survey",
          answers: finalAnswers,
          path: finalPath,
          site_id: siteId || undefined,
          website: "",
        }),
      });
      setLogged(true);
      setDone({ reference: res.reference });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save response");
    } finally {
      setBusy(false);
    }
  }

  function setAnswer(qid: string, value: string) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  function canAdvance(s: SurveyStep): boolean {
    if (s.kind === "message") return true;
    for (const q of s.questions || []) {
      if (q.required && !String(answers[q.id] || "").trim()) return false;
    }
    if (survey?.sitePickerEnabled && s.id === (survey.steps[0]?.id) && !siteId) return false;
    return true;
  }

  async function goNext() {
    if (!step || !survey) return;
    if (!canAdvance(step)) {
      setError("Please answer all required questions");
      return;
    }
    setError("");
    const nid = nextStepId(step, answers);
    if (!nid) {
      await logAndFinish(answers, path);
      return;
    }
    const next = survey.steps.find((s) => s.id === nid);
    const newPath = [...path, nid];
    setStepId(nid);
    setPath(newPath);
    // Auto-log when landing on a terminal message step
    if (next && next.kind === "message" && (!next.next || next.next.type === "finish")) {
      await logAndFinish(answers, newPath);
    }
  }

  if (tenant !== "coco") {
    return <Navigate to={tenantPath(tenant)} replace />;
  }

  if (done) {
    const msgStep = step?.kind === "message" ? step : survey?.steps.find((s) => s.id === stepId);
    const msg = fillTemplate(
      msgStep?.message || "Thank you for your feedback.",
      survey?.phoneNumber || "",
      survey?.contactEmail || ""
    );
    return (
      <div className="page">
        <BrandHeader subtitle={headerSubtext} />
        <section className="hero-card survey-card">
          <h1>{msgStep?.title || survey?.title || "Thank you"}</h1>
          <p className="survey-message">{msg}</p>
          {done.reference ? (
            <div className="ref-box" aria-label="Reference number">
              {done.reference}
            </div>
          ) : null}
          <Link className="btn btn-secondary" to="/coco/survey">
            Done
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <BrandHeader subtitle={headerSubtext} />
      <section className="hero-card survey-card">
        {error ? <div className="error-banner" role="alert">{error}</div> : null}
        {!survey || !step ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            <h1>{step.title || survey.title}</h1>

            {survey.sitePickerEnabled && step.id === survey.steps[0]?.id ? (
              <div className="field" style={{ marginBottom: 16 }}>
                <label htmlFor="site_id">Site</label>
                <select
                  id="site_id"
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  required
                >
                  <option value="">Select a site…</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {step.kind === "message" ? (
              <p className="survey-message">
                {fillTemplate(step.message || "", survey.phoneNumber, survey.contactEmail)}
              </p>
            ) : (
              <div className="survey-questions">
                {(step.questions || []).map((q) => (
                  <div className="survey-q" key={q.id}>
                    <p className="survey-q-label">
                      {q.label}
                      {q.required ? <span className="req"> *</span> : null}
                    </p>
                    {q.type === "yesno" ? (
                      <div className="yesno" role="group" aria-label={q.label}>
                        {["Yes", "No"].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            className={`topic yesno-btn${answers[q.id] === opt ? " active" : ""}`}
                            onClick={() => setAnswer(q.id, opt)}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="topic-grid" role="list">
                        {(q.options || []).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            role="listitem"
                            className={`topic${answers[q.id] === opt ? " active" : ""}`}
                            onClick={() => setAnswer(q.id, opt)}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="survey-actions">
              {step.kind === "message" && (!step.next || step.next.type === "finish") ? (
                <button
                  className="btn btn-primary btn-block"
                  type="button"
                  disabled={busy}
                  onClick={() => logAndFinish(answers, path)}
                >
                  {busy ? "Saving…" : "Finish"}
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-block"
                  type="button"
                  disabled={busy || !canAdvance(step)}
                  onClick={goNext}
                >
                  {busy ? "Saving…" : "Continue"}
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
