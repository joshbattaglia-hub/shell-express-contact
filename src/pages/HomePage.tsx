import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import BrandHeader from "../components/BrandHeader";
import { api } from "../lib/api";
import { useTenant, tenantPath } from "../hooks/useTenant";

const TOPICS = [
  "Feedback",
  "Complaint",
  "Compliment",
  "Lost property",
  "Fuel/payment issue",
  "Other",
];

const DEFAULT_SUB = "We're here to help · CA";

export default function HomePage() {
  const tenant = useTenant();
  const [headerSubtext, setHeaderSubtext] = useState(DEFAULT_SUB);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    if (tenant === "coco") return;
    api<{ headerSubtext?: string }>(tenant, "public-config")
      .then((d) => {
        if (d.headerSubtext != null) setHeaderSubtext(d.headerSubtext);
      })
      .catch(() => {});
  }, [tenant]);

  if (tenant === "coco") {
    return <Navigate to={tenantPath("coco", "/survey")} replace />;
  }

  return (
    <div className="page">
      <BrandHeader subtitle={headerSubtext} />
      <section className="hero-card">
        <h1>Contact Shell Express</h1>
        <p>
          Choose a topic to start your enquiry. We'll route it to the right
          site manager.
        </p>
        <div className="topic-grid" role="list">
          {TOPICS.map((t) => (
            <Link
              key={t}
              className={`topic${chosen === t ? " active" : ""}`}
              role="listitem"
              aria-current={chosen === t ? "true" : undefined}
              to={`${tenantPath(tenant, "/enquire")}?type=${encodeURIComponent(t)}`}
              onPointerDown={() => setChosen(t)}
            >
              {t}
            </Link>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 18, marginBottom: 0, fontSize: ".9rem" }}>
          Or{" "}
          <Link to={tenantPath(tenant, "/enquire")}>open the full enquiry form</Link>.
        </p>
      </section>
    </div>
  );
}
