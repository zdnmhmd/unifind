import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { FileWarning, LayoutDashboard, Package, Users } from "lucide-react";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { Logo, LogoMark } from "@/components/common/Logo";
import { useAuth } from "@/context/AuthContext";
import AnimatedContent from "@/components/reactbits/AnimatedContent";
import PillNav from "@/components/reactbits/PillNav";

/* The public shell has a short, flat nav, which is exactly what PillNav is
   for. The authenticated Navbar keeps its own markup: it carries the
   notification panel, the avatar, and sign-out, none of which PillNav models. */
const PUBLIC_LINKS = [
  { label: "Home", href: "/" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Categories", href: "/#categories" },
  { label: "Privacy", href: "/#privacy" },
];

/** Home, Login, Register — the only pages a visitor can reach (spec section 6). */
export function PublicLayout() {
  const { user } = useAuth();

  return (
    <div className="public-shell">
      <header className="public-header">
        <Logo />

        <div className="uf-pillnav public-pillnav">
          <PillNav
            items={PUBLIC_LINKS}
            /* The bare mark, not <Logo>: PillNav already wraps this slot in
               a link, and the pill logo is hidden by CSS here anyway. */
            logoElement={<LogoMark />}
            baseColor="var(--text-primary)"
            pillColor="var(--surface-raised)"
            pillTextColor="var(--text-secondary)"
            hoveredPillTextColor="var(--surface-raised)"
            initialLoadAnimation={false}
          />
        </div>

        <nav className="public-nav-actions">
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
  const { pathname } = useLocation();

  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        {/* Keyed on the path so the entrance replays on every navigation, not
            just the first mount. The distance is deliberately small — this is a
            page settling into place, not a slide-in. */}
        <AnimatedContent key={pathname} distance={26} duration={0.42} threshold={0}>
          <Outlet />
        </AnimatedContent>
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
          <AdminOutlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}

/** Same page entrance as MainLayout, for the admin console. */
function AdminOutlet() {
  const { pathname } = useLocation();
  return (
    <AnimatedContent key={pathname} distance={26} duration={0.42} threshold={0}>
      <Outlet />
    </AnimatedContent>
  );
}
