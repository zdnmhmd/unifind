import { useApi } from "@/hooks/useApi";
import { itemService } from "@/services/itemService";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, ErrorMessage, SkeletonGrid } from "@/components/common/Feedback";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate, ITEM_PLACEHOLDER } from "@/constants";

/**
 * Resolved Gallery (spec section 15).
 *
 * Shows only that a reunion happened — no conversations, no claim messages, and
 * no member details beyond the item itself.
 */
export function Resolved() {
  const { data, loading, error, reload } = useApi(
    signal => itemService.list({ status: "resolved", sort: "recent" }, signal),
    []
  );

  const items = data ?? [];

  return (
    <div className="page">
      <PageHeader
        eyebrow="RESOLVED GALLERY"
        title="Successfully reunited."
        description="Proof that the network works. Private details stay private — this page shows only the returns."
      />

      {error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : loading ? (
        <SkeletonGrid count={4} />
      ) : items.length > 0 ? (
        <div className="gallery-grid">
          {items.map(item => (
            <article className="gallery-card raised" key={item.id}>
              <div className="gallery-image recessed">
                <img
                  src={item.image_url || ITEM_PLACEHOLDER}
                  alt={item.title}
                  loading="lazy"
                  onError={event => {
                    (event.currentTarget as HTMLImageElement).src = ITEM_PLACEHOLDER;
                  }}
                />
              </div>
              <div className="gallery-body">
                <StatusBadge status="resolved" />
                <h3>{item.title}</h3>
                <p className="mono-label">
                  SUCCESSFULLY REUNITED · {formatDate(item.updated_at).toUpperCase()}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No resolved cases yet."
          description="When an item is returned and the owner closes the report, it will appear here."
          action="Browse active reports"
          href="/browse"
        />
      )}
    </div>
  );
}
