import { Link, Navigate } from "react-router-dom";
import BrandHeader from "../components/BrandHeader";
import { useTenant, tenantPath } from "../hooks/useTenant";

const TOPICS = [
  "Feedback",
  "Complaint",
  "Compliment",
  "Lost property",
  "Fuel/payment issue",
  "Other",
];

export default function HomePage() {
  const tenant = useTenant();

  if (tenant === "coco") {
    return <Navigate to={tenantPath("coco", "/survey")} replace />;
  }

  return (
    <div className="page">
      <BrandHeader subtitle="We're here to help · CA" />
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
              className="topic"
              role="listitem"
              to={`${tenantPath(tenant, "/enquire")}?type=${encodeURIComponent(t)}`}
            >
              {t}
            </Link>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 18, marginBottom: 0, fontSize: ".9rem" }}>
          Or{" "}
          <Link to={tenantPath(tenant, "/enquire")}>open the full enquiry form</Link>
          {" · "}
          <Link to="/">Switch destination</Link>
        </p>
      </section>
    </div>
  );
}
