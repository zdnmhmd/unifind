import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { FieldError } from "@/components/common/Feedback";
import { Logo } from "@/components/common/Logo";
import { isUiuEmail, UIU_EMAIL_ERROR } from "@/constants";

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // Where the member was headed before ProtectedRoute intercepted them.
  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  if (user) return <Navigate to={redirectTo} replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const next: typeof errors = {};
    if (!isUiuEmail(email)) next.email = UIU_EMAIL_ERROR;
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success("Signed in. Welcome back.");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrors({ form: (error as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card raised">
        <Logo />
        <p className="mono-label accent">WELCOME BACK</p>
        <h1>Sign in to your space.</h1>
        <p className="auth-lede">Use your official UIU account to continue where you left off.</p>

        <form onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>UIU email</span>
            <input
              className="recessed"
              type="email"
              autoComplete="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="you@bscse.uiu.ac.bd"
            />
            <FieldError message={errors.email} />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              className="recessed"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Your password"
            />
            <FieldError message={errors.password} />
          </label>

          <FieldError message={errors.form} />

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"} <ArrowRight size={17} />
          </button>
        </form>

        <p className="auth-switch">
          New to UniFind? <Link to="/register">Create an account</Link>
        </p>

        <p className="auth-footnote mono-label">
          <Lock size={13} /> LISTINGS STAY PRIVATE UNTIL YOU ARE SIGNED IN
        </p>
      </div>
    </div>
  );
}
