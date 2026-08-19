import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { FieldError } from "@/components/common/Feedback";
import { claimSchema, type ClaimValues } from "@/lib/schemas";

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
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClaimValues>({
    resolver: zodResolver(claimSchema),
    mode: "onTouched",
    defaultValues: { message: "" },
  });

  const busy = submitting || isSubmitting;

  return (
    <Modal title="Claim this item" description={`Regarding: ${itemTitle}`} onClose={onClose}>
      {/* A real <form> so Enter submits and the browser treats it as one unit;
          the dialog's own actions row stays where it was. */}
      <form onSubmit={handleSubmit(values => onSubmit(values.message.trim()))} noValidate>
        <div className="claim-hint recessed">
          <ShieldCheck size={18} />
          <p>
            Describe a detail only the owner would know — a mark, what's inside, or where you last
            had it. The poster reviews this before approving anything.
          </p>
        </div>

        <label className="field">
          <span>Verification message</span>
          <textarea
            className="recessed"
            rows={5}
            maxLength={2000}
            placeholder="e.g. My wallet has a small silver logo inside and contains my UIU ID."
            {...register("message")}
          />
          <FieldError message={errors.message?.message} />
        </label>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Submitting…" : "Submit claim"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
