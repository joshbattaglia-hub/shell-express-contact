import { Link } from "react-router-dom";
import BrandHeader from "../components/BrandHeader";

export default function ChooserPage() {
  return (
    <div className="page">
      <BrandHeader subtitle="Choose a destination" />
      <section className="hero-card">
        <h1>Shell Express contact</h1>
        <p>Select which experience you want to open.</p>
        <div className="topic-grid" style={{ marginTop: 8 }}>
          <Link className="topic" to="/ca" style={{ textAlign: "center", fontSize: "1.15rem", padding: "22px" }}>
            CA
          </Link>
          <Link className="topic" to="/coco" style={{ textAlign: "center", fontSize: "1.15rem", padding: "22px" }}>
            CoCo
          </Link>
        </div>
      </section>
    </div>
  );
}
