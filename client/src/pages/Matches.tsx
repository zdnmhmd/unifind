import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { matchService } from "@/services/matchService";
import { messageService } from "@/services/messageService";
import { PageHeader } from "@/components/common/PageHeader";
import { MatchCard } from "@/components/matches/MatchCard";
import { EmptyState, ErrorMessage, LoadingSpinner } from "@/components/common/Feedback";

/** Smart Matching results — the standout feature (spec sections 11 and 23). */
export function Matches() {
  const { data, loading, error, reload } = useApi(signal => matchService.list(signal), []);
  const navigate = useNavigate();

  const matches = data ?? [];

  async function contact(itemId: number) {
    try {
      const conversation = await messageService.start(itemId);
      navigate(`/messages/${conversation.id}`);
    } catch (startError) {
      toast.error((startError as Error).message);
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="RULE-BASED SMART MATCHING"
        title="Possible matches."
        description="UniFind compares category, title, color, brand, place, and timing — then shows you the evidence. It never decides who owns an item."
      />

      {error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : loading ? (
        <LoadingSpinner label="Comparing report details…" />
      ) : matches.length > 0 ? (
        <div className="match-list">
          {matches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              onContact={() => contact(match.matched_item.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No possible matches yet."
          description="When another report shares enough structured details with one of yours, it will appear here for review."
          action="Browse active reports"
          href="/browse"
        />
      )}
    </div>
  );
}
