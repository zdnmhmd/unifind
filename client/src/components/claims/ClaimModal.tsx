import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { FieldError } from "@/components/common/Feedback";

/**
 * Ownership claim dialog (spec section 10).
 *
 * The verification message is the whole point: it's how a claimant shows they
 * know something about the item that isn't in the public listing.
 */
export function ClaimModal({
  itemTitle,
  submitting,
  onSubmit,
  onClose,
}: {
  itemTitle: string;
  submitting: boolean;
  onSubmit: (message: string) => Promise<void>;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (message.trim().length < 10) {
      setError("Add at least a sentence that shows this item is yours.");
      return;
    }
    setError(null);
    await onSubmit(message.trim());
  }

  return (
    <Modal
      title="Claim this item"
      description={`Regarding: ${itemTitle}`}
      onClose={onClose}
    >
      <div className="claim-hint recessed">
        <ShieldCheck size={18} />
        <p>
          Describe a detail only the owner would know — a mark, what's inside, or where you last had
          it. The poster reviews this before approving anything.
        </p>
      </div>

      <label className="field">
        <span>Verification message</span>
        <textarea
          className="recessed"
          rows={5}
          value={message}
          maxLength={2000}
          onChange={event => setMessage(event.target.value)}
          placeholder="e.g. My wallet has a small silver logo inside and contains my UIU ID."
        />
        <FieldError message={error} />
      </label>

      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Submitting…" : "Submit claim"}
        </button>
      </div>
    </Modal>
  );
}
