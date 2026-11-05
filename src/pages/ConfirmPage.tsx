import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import BrandHeader from "../components/BrandHeader";
import { api } from "../lib/api";
import { useTenant, tenantPath } from "../hooks/useTenant";

export default function ConfirmPage() {
  const tenant = useTenant();
  const [params] = useSearchParams();
  const location = useLocation();
  const [headerSubtext, setHeaderSubtext] = useState(
    tenant === "coco" ? "CoCo feedback" : "We're here to help · CA"
  );
  const reference =
    (location.state as { reference?: string } | null)?.reference ||
    params.get("ref") ||
    "";

  useEffect(() => {
    api<{ headerSubtext?: string }>(tenant, "public-config")
      .then((d) => {
        if (d.headerSubtext != null) setHeaderSubtext(d.headerSubtext);
      })
      .catch(() => {});
  }, [tenant]);

  return (
    <div className="page">
      <BrandHeader subtitle={headerSubtext} />
      <section className="hero-card">
        <div className="steps" aria-label="Progress">
          <span className="step-pill">1. Topic</span>
          <span className="step-pill">2. Details</span>
          <span className="step-pill on">3. Done</span>
        </div>
        <h1>Enquiry received</h1>
        <p>
          Thanks for contacting Shell Express. Please keep your reference number
          handy if you need to follow up.
        </p>
        {reference ? (
          <div className="ref-box" aria-label="Reference number">
            {reference}
          </div>
        ) : (
          <p className="muted">Your reference was shown after submit.</p>
        )}
        <Link className="btn btn-secondary" to={tenantPath(tenant)}>
          Back to home
        </Link>
      </section>
    </div>
  );
}
