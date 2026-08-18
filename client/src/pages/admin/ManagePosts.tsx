import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { adminService } from "@/services/adminService";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchBar } from "@/components/common/SearchBar";
import { StatusBadge, TypeBadge } from "@/components/common/StatusBadge";
import { ConfirmModal } from "@/components/common/Modal";
import { EmptyState, ErrorMessage, LoadingSpinner } from "@/components/common/Feedback";
import { formatDate } from "@/constants";
import type { Item } from "@/types";

/** Admin post management (spec section 28). */
export function ManagePosts() {
  const { data, loading, error, reload } = useApi(signal => adminService.listPosts(signal), []);
  const [search, setSearch] = useState("");
  const [pendingRemove, setPendingRemove] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);

  const posts = (data ?? []).filter(item => {
    if (!search.trim()) return true;
    const needle = search.trim().toLowerCase();
    return (
      item.title.toLowerCase().includes(needle) ||
      item.owner_name.toLowerCase().includes(needle) ||
      item.category.toLowerCase().includes(needle)
    );
  });

  async function removePost() {
    if (!pendingRemove) return;
    setBusy(true);
    try {
      await adminService.removePost(pendingRemove.id);
      toast.success("Post removed from the network.");
      setPendingRemove(null);
      reload();
    } catch (removeError) {
      toast.error((removeError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function restorePost(item: Item) {
    try {
      await adminService.restorePost(item.id);
      toast.success("Post restored.");
      reload();
    } catch (restoreError) {
      toast.error((restoreError as Error).message);
    }
  }

  if (loading) return <LoadingSpinner label="Loading listings…" />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  return (
    <div className="page">
      <PageHeader
        eyebrow="MANAGE POSTS"
        title="All listings."
        description="Every report on the platform, including ones already removed, so a removal can always be reviewed."
      />

      <div className="admin-toolbar raised">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by title, member, or category…"
        />
        <span className="mono-label">{posts.length} LISTINGS</span>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          title="No listings match that search."
          description="Try a different item name, member, or category."
          action="Clear search"
          onAction={() => setSearch("")}
        />
      ) : (
        <div className="table-wrap raised">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Type</th>
                <th scope="col">Member</th>
                <th scope="col">Status</th>
                <th scope="col">Reported</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(item => (
                <tr key={item.id} className={item.is_removed ? "row-removed" : ""}>
                  <td>
                    <Link to={`/items/${item.id}`} className="table-title">
                      {item.title}
                    </Link>
                    <span className="mono-label">{item.category.toUpperCase()}</span>
                  </td>
                  <td>
                    <TypeBadge type={item.type} />
                  </td>
                  <td>{item.owner_name}</td>
                  <td>
                    {item.is_removed ? (
                      <span className="stamp stamp-rejected">REMOVED</span>
                    ) : (
                      <StatusBadge status={item.status} />
                    )}
                  </td>
                  <td className="mono-label">{formatDate(item.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      <Link to={`/items/${item.id}`} className="btn btn-ghost btn-sm">
                        <Eye size={14} /> View
                      </Link>
                      {item.is_removed ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => restorePost(item)}
                        >
                          <RotateCcw size={14} /> Restore
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm danger"
                          onClick={() => setPendingRemove(item)}
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pendingRemove && (
        <ConfirmModal
          title="Remove this post?"
          message={`"${pendingRemove.title}" will disappear from Browse and Smart Matching for all members. You can restore it afterwards.`}
          confirmLabel="Remove post"
          tone="danger"
          busy={busy}
          onConfirm={removePost}
          onCancel={() => setPendingRemove(null)}
        />
      )}
    </div>
  );
}
