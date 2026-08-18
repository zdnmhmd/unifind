import { Link } from "react-router-dom";
import { LogOut, Mail, ShieldCheck, University } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import { dashboardService } from "@/services/notificationService";
import { PageHeader, Panel, StatCard } from "@/components/common/PageHeader";
import { formatDate } from "@/constants";

export function Profile() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const { data } = useApi(signal => dashboardService.get(signal), []);

  const counts = data?.counts;
  const initials = (user?.name ?? "UIU")
    .split(" ")
    .map(word => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="page page-narrow">
      <PageHeader
        eyebrow="YOUR PROFILE"
        title="Account details."
        description="Your UniFind membership is tied to your official university email."
      />

      <Panel className="profile-panel">
        <div className="profile-head">
          <span className="avatar-chip large" aria-hidden="true">
            {initials}
          </span>
          <div>
            <h2>{user?.name}</h2>
            <p className="mono-label">
              {isAdmin ? "ADMINISTRATOR" : "VERIFIED UIU MEMBER"} · JOINED{" "}
              {user ? formatDate(user.created_at).toUpperCase() : ""}
            </p>
          </div>
        </div>

        <dl className="profile-facts recessed">
          <div>
            <dt className="mono-label">
              <Mail size={13} /> EMAIL
            </dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt className="mono-label">
              <University size={13} /> DEPARTMENT
            </dt>
            <dd>{user?.department || "Not specified"}</dd>
          </div>
          <div>
            <dt className="mono-label">
              <ShieldCheck size={13} /> ROLE
            </dt>
            <dd>{isAdmin ? "Administrator" : "Regular member"}</dd>
          </div>
        </dl>

        <div className="stat-grid">
          <StatCard label="ACTIVE POSTS" value={counts?.active_posts ?? 0} accent />
          <StatCard label="POSSIBLE MATCHES" value={counts?.possible_matches ?? 0} />
          <StatCard label="PENDING CLAIMS" value={counts?.pending_claims ?? 0} />
          <StatCard label="RESOLVED CASES" value={counts?.resolved_cases ?? 0} />
        </div>

        <div className="profile-actions">
          <Link to="/my-posts" className="btn btn-secondary">
            Manage my posts
          </Link>
          {isAdmin && (
            <Link to="/admin" className="btn btn-ghost">
              Open admin console
            </Link>
          )}
          <button
            type="button"
            className="btn btn-ghost danger"
            onClick={async () => {
              await logout();
              navigate("/", { replace: true });
            }}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </Panel>
    </div>
  );
}
