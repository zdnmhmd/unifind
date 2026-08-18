import { Link } from "react-router-dom";
import { ArrowRight, FileWarning, Package, Users } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { adminService } from "@/services/adminService";
import { PageHeader, Panel, StatCard } from "@/components/common/PageHeader";
import { ErrorMessage, LoadingSpinner } from "@/components/common/Feedback";

/** Admin overview (spec section 27) — platform health at a glance. */
export function AdminDashboard() {
  const { data, loading, error, reload } = useApi(signal => adminService.stats(signal), []);

  if (loading) return <LoadingSpinner label="Loading platform statistics…" />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  return (
    <div className="page">
      <PageHeader
        eyebrow="ADMIN OVERVIEW"
        title="Platform activity."
        description="Careful moderation, clear outcomes. Every action here is checked against your administrator account on the server."
      />

      <div className="stat-grid admin-stat-grid">
        <StatCard label="ACTIVE POSTS" value={data?.active_posts ?? 0} note="Open and pending" accent />
        <StatCard label="LOST POSTS" value={data?.lost_posts ?? 0} note="Currently visible" />
        <StatCard label="FOUND POSTS" value={data?.found_posts ?? 0} note="Currently visible" />
        <StatCard
          label="PENDING MODERATION"
          value={data?.pending_moderation ?? 0}
          note="Open reports"
        />
        <StatCard label="RESOLVED CASES" value={data?.resolved_cases ?? 0} note="Items reunited" />
        <StatCard label="REGISTERED MEMBERS" value={data?.total_users ?? 0} note="UIU accounts" />
      </div>

      <Panel label="QUICK LINKS" title="Where to go next.">
        <div className="quick-links">
          <Link to="/admin/posts" className="quick-link recessed">
            <Package size={20} />
            <div>
              <strong>Manage posts</strong>
              <span>Review, remove, or restore any listing.</span>
            </div>
            <ArrowRight size={16} />
          </Link>

          <Link to="/admin/reports" className="quick-link recessed">
            <FileWarning size={20} />
            <div>
              <strong>Review reports</strong>
              <span>Work through flagged content.</span>
            </div>
            <ArrowRight size={16} />
          </Link>

          <Link to="/admin/users" className="quick-link recessed">
            <Users size={20} />
            <div>
              <strong>User administration</strong>
              <span>Suspend or reinstate a member when necessary.</span>
            </div>
            <ArrowRight size={16} />
          </Link>
        </div>
      </Panel>
    </div>
  );
}
