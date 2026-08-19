import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { FieldError } from "@/components/common/Feedback";
import { Logo } from "@/components/common/Logo";
import { isUiuEmail, UIU_EMAIL_ERROR } from "@/constants";

type Errors = {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
  form?: string;
};

export function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  // Already signed in — a session only exists once the email is confirmed.
  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    // Frontend validation is for UX. The backend applies the same UIU domain
    // rule again, because a browser check can always be bypassed (spec s5/s43).
    const next: Errors = {};
    if (name.trim().length < 2) next.name = "Enter your full name.";
    if (!isUiuEmail(email)) next.email = UIU_EMAIL_ERROR;
    if (password.length < 8) next.password = "Use at least 8 characters.";
    if (password !== confirm) next.confirm = "Both passwords must match.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const created = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        department: department.trim() || undefined,
      });
      toast.success("Account created. Enter the code we emailed you to finish.");
      // Straight to the code screen — there is no session yet, so this is the
      // only way in. The details ride along in router state to save a request;
      // /verify can also read them back from the pending cookie on a reload.
      navigate("/verify", { replace: true, state: { verification: created.verification } });
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
        <p className="mono-label accent">CREATE YOUR ACCOUNT</p>
        <h1>Join the network.</h1>
        <p className="auth-lede">
          UniFind is restricted to United International University. Register with the email your
          department issued you — we will send a six-digit code there to confirm it is yours.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>Full name</span>
            <input
              className="recessed"
              value={name}
              autoComplete="name"
              onChange={event => setName(event.target.value)}
              placeholder="e.g. Ayesha Rahman"
            />
            <FieldError message={errors.name} />
          </label>

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
            <p className="field-hint">
              Any UIU department address works — bscse, eee, bba, and the rest.
            </p>
            <FieldError message={errors.email} />
          </label>

          <label className="field">
            <span>
              Department <em>optional</em>
            </span>
            <input
              className="recessed"
              value={department}
              onChange={event => setDepartment(event.target.value)}
              placeholder="e.g. Computer Science & Engineering"
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Password</span>
              <input
                className="recessed"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="At least 8 characters"
              />
              <FieldError message={errors.password} />
            </label>

            <label className="field">
              <span>Confirm password</span>
              <input
                className="recessed"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={event => setConfirm(event.target.value)}
                placeholder="Repeat your password"
              />
              <FieldError message={errors.confirm} />
            </label>
          </div>

          <FieldError message={errors.form} />

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"} <ArrowRight size={17} />
          </button>
        </form>

        <p className="auth-switch">
          Already registered? <Link to="/login">Sign in</Link>
        </p>

        <p className="auth-footnote mono-label">
          <Lock size={13} /> PASSWORDS ARE HASHED — NEVER STORED AS TEXT
        </p>
      </div>
    </div>
  );
}
