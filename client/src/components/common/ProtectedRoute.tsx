import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "./Feedback";

/**
 * Gate for every authenticated page (spec section 6).
 *
 * An unauthenticated visitor is sent to /login, and the page they wanted is
 * remembered in router state so sign-in can return them there.
 *
 * This is convenience, not security — the FastAPI routes enforce the same rule
 * independently, so bypassing this in the browser gains nothing.
 */
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner label="Checking your UIU membership…" />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}

/** Additional gate for /admin/* (spec section 27). */
export function AdminRoute() {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner label="Checking administrator access…" />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
