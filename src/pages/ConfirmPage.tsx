import { Link, useLocation, useSearchParams } from "react-router-dom";
import BrandHeader from "../components/BrandHeader";
import { useTenant, tenantPath } from "../hooks/useTenant";

export default function ConfirmPage() {
  const tenant = useTenant();
  const [params] = useSearchParams();
  const location = useLocation();
  const reference =
    (location.state as { reference?: string } | null)?.reference ||
    params.get("ref") ||
    "";

  return (
    <div className="page">
      <BrandHeader subtitle="Thank you" />
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
