import { useMemo, useState } from "react";
import { Ban, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { useApi } from "@/hooks/useApi";
import { adminService } from "@/services/adminService";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchBar } from "@/components/common/SearchBar";
import { DataTable } from "@/components/common/DataTable";
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

  const users = data ?? [];

  const columns = useMemo<ColumnDef<AdminUser, unknown>[]>(
    () => [
      {
        id: "member",
        header: "Member",
        accessorFn: row => `${row.name} ${row.email}`,
        cell: ({ row }) => (
          <>
            <span className="table-title">{row.original.name}</span>
            <span className="mono-label">{row.original.email.toUpperCase()}</span>
          </>
        ),
      },
      {
        id: "department",
        header: "Department",
        accessorFn: row => row.department ?? "",
        cell: ({ row }) => row.original.department || "—",
      },
      {
        id: "role",
        header: "Role",
        accessorKey: "role",
        cell: ({ row }) =>
          row.original.role === "admin" ? (
            <span className="stamp stamp-open">
              <ShieldCheck size={12} /> ADMIN
            </span>
          ) : (
            <span className="mono-label">MEMBER</span>
          ),
      },
      {
        id: "posts",
        header: "Posts",
        accessorKey: "item_count",
        cell: ({ row }) => (
          <span className="mono-label">{String(row.original.item_count).padStart(2, "0")}</span>
        ),
      },
      {
        id: "joined",
        header: "Joined",
        // Sort on the raw timestamp, display the formatted date.
        accessorFn: row => new Date(row.created_at).getTime(),
        cell: ({ row }) => <span className="mono-label">{formatDate(row.original.created_at)}</span>,
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.role === "admin" ? (
            <span className="mono-label">—</span>
          ) : (
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${row.original.is_suspended ? "" : "danger"}`}
              onClick={() => setPending(row.original)}
            >
              {row.original.is_suspended ? (
                <>
                  <UserCheck size={14} /> Reinstate
                </>
              ) : (
                <>
                  <Ban size={14} /> Suspend
                </>
              )}
            </button>
          ),
      },
    ],
    []
  );

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
          title="No members yet."
          description="Accounts appear here as soon as UIU members register."
        />
      ) : (
        <DataTable
          columns={columns}
          data={users}
          globalFilter={search}
          rowClassName={user => (user.is_suspended ? "row-removed" : "")}
          emptyMessage="No members match that search."
        />
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
