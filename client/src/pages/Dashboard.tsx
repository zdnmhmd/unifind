import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  MessageSquare,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { dashboardService } from "@/services/notificationService";
import { matchService } from "@/services/matchService";
import { PageHeader, Panel, StatCard } from "@/components/common/PageHeader";
import { ItemCard } from "@/components/items/ItemCard";
import { EmptyState, ErrorMessage, SkeletonGrid } from "@/components/common/Feedback";
import { useAuth } from "@/context/AuthContext";
import { formatRelative } from "@/constants";
import Dock from "@/components/reactbits/Dock";
import Magnet from "@/components/reactbits/Magnet";

/** The member's central control hub after sign-in (spec section 18). */
export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(signal => dashboardService.get(signal), []);
  const { data: matches } = useApi(signal => matchService.list(signal), []);

  const firstName = user?.name?.split(" ")[0] ?? "member";
  const counts = data?.counts;
  const topMatch = matches?.[0];

  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  return (
    <div className="page">
      <PageHeader
        eyebrow="YOUR PRIVATE UIU SPACE"
        title={`Welcome back, ${firstName}.`}
        description="Here's what's moving in your corner of the network."
        actions={
          <>
            <Magnet padding={55} magnetStrength={7} wrapperClassName="uf-magnet">
              <Link to="/report/lost" className="btn btn-primary">
                <Plus size={16} /> Report lost item
              </Link>
            </Magnet>
            <Link to="/report/found" className="btn btn-secondary">
              <Plus size={16} /> Report found item
            </Link>
            <Link to="/browse" className="btn btn-ghost">
              <Search size={16} /> Browse items
            </Link>
          </>
        }
      />

      {/* Quick jumps to the six places a member actually moves between.
          Desktop only: a magnifying dock depends on hover, which a touch screen
          does not have, and the navbar already covers small screens. */}
      <div className="uf-dock dashboard-dock">
        <Dock
          items={[
            { icon: <Plus size={18} />, label: "Report lost", onClick: () => navigate("/report/lost") },
            { icon: <Package size={18} />, label: "Report found", onClick: () => navigate("/report/found") },
            { icon: <Search size={18} />, label: "Browse", onClick: () => navigate("/browse") },
            { icon: <Sparkles size={18} />, label: "Matches", onClick: () => navigate("/matches") },
            { icon: <ShieldCheck size={18} />, label: "Claims", onClick: () => navigate("/claims") },
            { icon: <MessageSquare size={18} />, label: "Messages", onClick: () => navigate("/messages") },
            { icon: <Bell size={18} />, label: "Alerts", onClick: () => navigate("/notifications") },
          ]}
          panelHeight={64}
          baseItemSize={44}
          magnification={64}
          distance={140}
        />
      </div>

      <div className="stat-grid">
        <StatCard
          label="ACTIVE POSTS"
          value={counts?.active_posts ?? 0}
          note="Your open and pending reports"
          accent
        />
        <StatCard
          label="POSSIBLE MATCHES"
          value={counts?.possible_matches ?? 0}
          note="Rule-based suggestions"
        />
        <StatCard
          label="PENDING CLAIMS"
          value={counts?.pending_claims ?? 0}
          note="Claims awaiting a decision"
        />
        <StatCard
          label="RESOLVED CASES"
          value={counts?.resolved_cases ?? 0}
          note="Items successfully reunited"
        />
      </div>

      <div className="dashboard-grid">
        <Panel
          label="MY ACTIVE REPORTS"
          title="Keep the case moving."
          action={
            <Link to="/my-posts" className="text-button">
              View all <ArrowRight size={14} />
            </Link>
          }
        >
          {loading ? (
            <SkeletonGrid count={3} />
          ) : data && data.recent_items.length > 0 ? (
            <div className="item-grid compact">
              {data.recent_items.map(item => (
                <ItemCard item={item} key={item.id} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No reports yet."
              description="Start by adding the details you remember about a lost or found item."
              action="Report a lost item"
              href="/report/lost"
            />
          )}
        </Panel>

        <div className="dashboard-side">
          <Panel
            label="SMART MATCHES"
            title={topMatch ? "Something lines up." : "Watching for a match."}
            className="match-preview"
            action={
              <Link to="/matches" className="text-button">
                See all <ArrowRight size={14} />
              </Link>
            }
          >
            {topMatch ? (
              <>
                <div className="match-preview-score">
                  <strong>
                    {topMatch.score}
                    <em>%</em>
                  </strong>
                  <div>
                    <p className="mono-label accent">POSSIBLE MATCH</p>
                    <p className="match-preview-titles">
                      {topMatch.own_item.title} → {topMatch.matched_item.title}
                    </p>
                  </div>
                </div>
                <div className="confidence-track recessed">
                  <div className="confidence-fill" style={{ width: `${topMatch.score}%` }} />
                </div>
                <ul className="match-reasons mono-label">
                  {topMatch.reasons.slice(0, 4).map(reason => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <Link to="/matches" className="btn btn-primary btn-sm btn-block">
                  <Sparkles size={15} /> Review match
                </Link>
              </>
            ) : (
              <p className="panel-note">
                As soon as another report shares enough structured details with yours, it will appear
                here for review.
              </p>
            )}
          </Panel>

          <Panel label="RECENT ACTIVITY" title="What just happened.">
            {data && data.recent_activity.length > 0 ? (
              <ul className="activity-list">
                {data.recent_activity.map(entry => (
                  <li key={entry.id}>
                    <Link to={entry.href ?? "/notifications"} className="activity-row">
                      <span className={`activity-dot type-${entry.type}`} aria-hidden="true" />
                      <div>
                        <strong>{entry.title}</strong>
                        {entry.body && <span>{entry.body}</span>}
                      </div>
                      <time className="mono-label">{formatRelative(entry.created_at)}</time>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="panel-note">
                Claims, comments, matches, and messages will show up here as they arrive.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
