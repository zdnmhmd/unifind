import { useState } from "react";
import { Ban, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { adminService } from "@/services/adminService";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchBar } from "@/components/common/SearchBar";
import { ConfirmModal } from "@/components/common/Modal";
import { EmptyState, ErrorMessage, LoadingSpinner } from "@/components/common/Feedback";
import { formatDate } from "@/constants";
import type { AdminUser } from "@/types";

/**
 * Basic user administration (spec section 27).
 *
 * Deliberately minimal: account management is required system functionality,
 * not one of the project's Lost & Found features (spec sections 4 and 28).
 */
export function AdminUsers() {
  const { data, loading, error, reload } = useApi(signal => adminService.listUsers(signal), []);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);

  const users = (data ?? []).filter(user => {
    if (!search.trim()) return true;
    const needle = search.trim().toLowerCase();
    return (
      user.name.toLowerCase().includes(needle) ||
      user.email.toLowerCase().includes(needle) ||
      (user.department ?? "").toLowerCase().includes(needle)
    );
  });

  async function toggleSuspension() {
    if (!pending) return;
    setBusy(true);
    try {
      await adminService.setSuspended(pending.id, !pending.is_suspended);
      toast.success(pending.is_suspended ? "Member reinstated." : "Member suspended.");
      setPending(null);
      reload();
    } catch (suspendError) {
      toast.error((suspendError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading members…" />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  return (
    <div className="page">
      <PageHeader
        eyebrow="USER ADMINISTRATION"
        title="Registered members."
        description="Every account is tied to a verified UIU email address. Suspend only when it is genuinely necessary."
      />

      <div className="admin-toolbar raised">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, or department…"
        />
        <span className="mono-label">{users.length} MEMBERS</span>
      </div>

      {users.length === 0 ? (
        <EmptyState
          title="No members match that search."
          description="Try a different name, email, or department."
          action="Clear search"
          onAction={() => setSearch("")}
        />
      ) : (
        <div className="table-wrap raised">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Department</th>
                <th scope="col">Role</th>
                <th scope="col">Posts</th>
                <th scope="col">Joined</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className={user.is_suspended ? "row-removed" : ""}>
                  <td>
                    <span className="table-title">{user.name}</span>
                    <span className="mono-label">{user.email.toUpperCase()}</span>
                  </td>
                  <td>{user.department || "—"}</td>
                  <td>
                    {user.role === "admin" ? (
                      <span className="stamp stamp-open">
                        <ShieldCheck size={12} /> ADMIN
                      </span>
                    ) : (
                      <span className="mono-label">MEMBER</span>
                    )}
                  </td>
                  <td className="mono-label">{String(user.item_count).padStart(2, "0")}</td>
                  <td className="mono-label">{formatDate(user.created_at)}</td>
                  <td>
                    {user.role === "admin" ? (
                      <span className="mono-label">—</span>
                    ) : (
                      <button
                        type="button"
                        className={`btn btn-ghost btn-sm ${user.is_suspended ? "" : "danger"}`}
                        onClick={() => setPending(user)}
                      >
                        {user.is_suspended ? (
                          <>
                            <UserCheck size={14} /> Reinstate
                          </>
                        ) : (
                          <>
                            <Ban size={14} /> Suspend
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pending && (
        <ConfirmModal
          title={pending.is_suspended ? "Reinstate this member?" : "Suspend this member?"}
          message={
            pending.is_suspended
              ? `${pending.name} will be able to sign in and use UniFind again.`
              : `${pending.name} will be signed out and blocked from using UniFind until reinstated. Their existing posts stay visible.`
          }
          confirmLabel={pending.is_suspended ? "Reinstate member" : "Suspend member"}
          tone={pending.is_suspended ? "primary" : "danger"}
          busy={busy}
          onConfirm={toggleSuspension}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
