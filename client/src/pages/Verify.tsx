import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { FieldError } from "@/components/common/Feedback";
import { Logo } from "@/components/common/Logo";
import { authService } from "@/services/authService";
import type { Verification } from "@/types";

const CODE_LENGTH = 6;

/** Matches RESEND_COOLDOWN_SECONDS in backend/auth.py. */
const RESEND_COOLDOWN = 60;

/**
 * Email confirmation (spec section 5).
 *
 * The member arrives here straight after registering, already signed in but not
 * yet confirmed. Reading UniFind works meanwhile; posting and claiming do not,
 * which is what makes this worth completing rather than skipping.
 */
export function Verify() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Register hands the code details over in router state so the dev-mode code
  // can be shown without a second request.
  const handoff = (location.state as { verification?: Verification } | null)?.verification;

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(handoff ? RESEND_COOLDOWN : 0);
  const [devCode, setDevCode] = useState<string | null>(handoff?.dev_code ?? null);
  const [delivered, setDelivered] = useState<boolean>(handoff?.sent ?? true);

  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  // Tick the resend cooldown down to zero.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(seconds => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  // Nothing to confirm — either signed out, or already done.
  if (!user) return <Navigate to="/login" replace />;
  if (user.is_verified) return <Navigate to="/dashboard" replace />;

  async function submitCode(code: string) {
    setSubmitting(true);
    setError(undefined);
    try {
      const { message } = await authService.verify(code);
      // Pull the updated member down so the banner and the gates clear at once.
      await refresh();
      toast.success(message);
      navigate("/dashboard", { replace: true });
    } catch (caught) {
      setError((caught as Error).message);
      setDigits(Array(CODE_LENGTH).fill(""));
      inputs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < CODE_LENGTH - 1) inputs.current[index + 1]?.focus();

    // Submitting on the last digit saves a click; people expect it here.
    const code = next.join("");
    if (code.length === CODE_LENGTH && !next.includes("")) void submitCode(code);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) inputs.current[index + 1]?.focus();
  }

  /** Spread a pasted code across the boxes — everyone pastes from their mail app. */
  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    event.preventDefault();

    const next = Array(CODE_LENGTH).fill("");
    pasted.split("").forEach((digit, index) => {
      next[index] = digit;
    });
    setDigits(next);
    inputs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();

    if (pasted.length === CODE_LENGTH) void submitCode(pasted);
  }

  async function handleResend() {
    setError(undefined);
    try {
      const result = await authService.resend();
      setDevCode(result.dev_code);
      setDelivered(result.sent);
      setCooldown(RESEND_COOLDOWN);
      setDigits(Array(CODE_LENGTH).fill(""));
      inputs.current[0]?.focus();
      toast.success(
        result.sent ? `A new code is on its way to ${result.email}.` : "A new code was generated."
      );
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card raised">
        <Logo />
        <p className="mono-label accent">CONFIRM YOUR UIU EMAIL</p>
        <h1>Check your inbox.</h1>
        <p className="auth-lede">
          We sent a six-digit code to <strong>{user.email}</strong>. Enter it below to finish
          setting up your account. You can browse UniFind meanwhile — reporting an item and
          claiming one stay closed until your address is confirmed.
        </p>

        {!delivered && (
          <div className="verify-devnote recessed">
            <p className="mono-label">NO MAIL SERVER CONFIGURED</p>
            <p>
              The backend has no SMTP host set, so the code was printed to its console instead of
              being emailed.
              {devCode && (
                <>
                  {" "}
                  For this development build it is <code>{devCode}</code>.
                </>
              )}
            </p>
          </div>
        )}

        <div className="verify-code" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={element => {
                inputs.current[index] = element;
              }}
              className="recessed"
              value={digit}
              onChange={event => handleChange(index, event.target.value)}
              onKeyDown={event => handleKeyDown(index, event)}
              disabled={submitting}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
              maxLength={1}
            />
          ))}
        </div>

        <FieldError message={error} />

        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={submitting || digits.includes("")}
          onClick={() => void submitCode(digits.join(""))}
        >
          {submitting ? "Confirming…" : "Confirm my email"} <CheckCircle2 size={17} />
        </button>

        <button
          type="button"
          className="text-button verify-resend"
          onClick={() => void handleResend()}
          disabled={cooldown > 0}
        >
          <RefreshCw size={14} />
          {cooldown > 0 ? `Send another code in ${cooldown}s` : "Send another code"}
        </button>

        <p className="auth-switch">
          Wrong address? <Link to="/profile">Check your profile</Link>
        </p>

        <p className="auth-footnote mono-label">
          <Mail size={13} /> CODES EXPIRE AFTER {handoff?.expires_in_minutes ?? 10} MINUTES
        </p>
      </div>
    </div>
  );
}
