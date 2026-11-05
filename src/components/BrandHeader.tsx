import { Link } from "react-router-dom";

export default function BrandHeader({
  subtitle,
  compact,
}: {
  subtitle?: string;
  compact?: boolean;
}) {
  return (
    <header className={`brand-header${compact ? " compact" : ""}`}>
      <Link to="/" className="brand-lockup" aria-label="Shell Express home">
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
