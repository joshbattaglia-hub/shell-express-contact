import { Link, useParams } from "react-router-dom";

export default function BrandHeader({
  subtitle,
  compact,
  homeTo,
}: {
  subtitle?: string;
  compact?: boolean;
  homeTo?: string;
}) {
  const { tenant } = useParams();
  const to = homeTo || (tenant ? `/${tenant}` : "/");
  return (
    <header className={`brand-header${compact ? " compact" : ""}`}>
      <Link to={to} className="brand-lockup" aria-label="Shell Express home">
        <img
          src="/brand/logo-on-light.png"
          alt="Shell Express"
          className="brand-logo"
          width={220}
          height={104}
        />
      </Link>
      {subtitle ? <p className="brand-sub">{subtitle}</p> : null}
    </header>
  );
}
