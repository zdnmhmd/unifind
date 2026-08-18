import { Link } from "react-router-dom";
import { ArrowRight, HandHeart, Lock, MessagesSquare, Search, Tag } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { itemService } from "@/services/itemService";

const STEPS = [
  {
    number: "01",
    icon: Tag,
    title: "REPORT",
    body: "Post your lost or found item with the structured details that matter.",
  },
  {
    number: "02",
    icon: Search,
    title: "MATCH",
    body: "Search manually, or let UniFind surface possible matches for you.",
  },
  {
    number: "03",
    icon: MessagesSquare,
    title: "CONNECT",
    body: "Message another UIU member safely, inside the university network.",
  },
  {
    number: "04",
    icon: HandHeart,
    title: "REUNITE",
    body: "Verify ownership, hand the item back, and mark the case resolved.",
  },
];

/**
 * Public landing page (spec section 17).
 *
 * Listings are private, so nothing here shows an actual item — only anonymous
 * counters and an explanation of how the network works.
 */
export function Home() {
  const { data: stats } = useApi(signal => itemService.publicStats(signal), []);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="mono-label accent">UIU LOST &amp; FOUND NETWORK</p>
          <h1>
            Lost something? Find it within your <em>university community.</em>
          </h1>
          <p className="hero-lede">
            UniFind is the private network where UIU students, faculty, and staff report lost and
            found belongings, surface possible matches, and get things back to their owners.
          </p>

          <div className="hero-actions">
            <Link to="/login" className="btn btn-primary btn-lg">
              Sign in with UIU email <ArrowRight size={18} />
            </Link>
            <Link to="/register" className="btn btn-secondary btn-lg">
              Create account
            </Link>
          </div>

          <p className="hero-note mono-label">
            <Lock size={14} /> PRIVATE TO VERIFIED @*.UIU.AC.BD MEMBERS
          </p>
        </div>

        <div className="hero-panel raised">
          <div className="hero-panel-head">
            <span className="pulse-dot" aria-hidden="true" />
            <span className="mono-label">NETWORK STATUS · ACTIVE</span>
          </div>

          <dl className="hero-stats">
            <div>
              <dt className="mono-label">ACTIVE REPORTS</dt>
              <dd>{String(stats?.active_reports ?? 0).padStart(2, "0")}</dd>
            </div>
            <div>
              <dt className="mono-label">POSSIBLE MATCHES</dt>
              <dd>{String(stats?.possible_matches ?? 0).padStart(2, "0")}</dd>
            </div>
            <div>
              <dt className="mono-label">ITEMS REUNITED</dt>
              <dd className="accent">{String(stats?.items_reunited ?? 0).padStart(2, "0")}</dd>
            </div>
          </dl>

          <p className="hero-panel-note">
            Anonymous counters only. Item details, names, and locations stay inside the network.
          </p>
        </div>
      </section>

      <section className="section" id="how-it-works">
        <header className="section-head">
          <p className="mono-label accent">HOW UNIFIND WORKS</p>
          <h2>From a missing item to a real reunion.</h2>
        </header>

        <div className="step-grid">
          {STEPS.map(({ number, icon: Icon, title, body }) => (
            <article className="step-card raised" key={number}>
              <span className="mono-label accent">{number}</span>
              <div className="step-icon recessed">
                <Icon size={20} />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section privacy-section" id="privacy">
        <div className="privacy-card raised">
          <div className="step-icon recessed">
            <Lock size={22} />
          </div>
          <div>
            <p className="mono-label accent">BUILT FOR THE UIU COMMUNITY</p>
            <h2>Your belongings stay inside the network.</h2>
            <p>
              Lost and found listings are never public. Registration is restricted to official UIU
              email addresses, and every post, claim, message, and moderation action is checked on
              the server against your university account.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
