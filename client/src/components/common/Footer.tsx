import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <Logo />
          <p>The private Lost &amp; Found network for United International University.</p>
        </div>
        <div className="footer-flow mono-label">
          REPORT <span>→</span> MATCH <span>→</span> CONNECT <span>→</span> REUNITE
        </div>
        <p className="footer-legal mono-label">
          © {new Date().getFullYear()} UNIFIND · UNITED INTERNATIONAL UNIVERSITY
        </p>
      </div>
    </footer>
  );
}
