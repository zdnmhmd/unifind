import { Link, NavLink, Outlet } from "react-router-dom";
import { FileWarning, LayoutDashboard, Package, Users } from "lucide-react";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { Logo } from "@/components/common/Logo";
import { useAuth } from "@/context/AuthContext";

/** Home, Login, Register — the only pages a visitor can reach (spec section 6). */
export function PublicLayout() {
  const { user } = useAuth();

  return (
    <div className="public-shell">
      <header className="public-header">
        <Logo />
        <nav>
          <a href="#how-it-works">How it works</a>
          <a href="#privacy">Privacy</a>
          {user ? (
            <Link to="/dashboard" className="btn btn-primary btn-sm">
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-button">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Create account
              </Link>
            </>
          )}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

/** Every authenticated member page.
 *
 * No confirm-your-email banner: a session is only ever issued after the code is
 * confirmed, so nobody who reaches these pages has an unconfirmed address.
 */
export function MainLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

const ADMIN_LINKS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/posts", label: "Manage Posts", icon: Package, end: false },
  { to: "/admin/reports", label: "Moderation", icon: FileWarning, end: false },
  { to: "/admin/users", label: "Users", icon: Users, end: false },
];

/**
 * Admin area (spec section 27) — visually distinct from the member dashboard
 * through the darker console rail, but built from the same design system.
 */
export function AdminLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="admin-shell">
        <aside className="admin-rail raised">
          <p className="mono-label accent">ADMIN CONSOLE</p>
          <nav>
            {ADMIN_LINKS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `admin-link ${isActive ? "active" : ""}`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}
