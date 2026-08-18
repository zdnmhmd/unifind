import type { ReactNode } from "react";

/** One shared page heading so no screen re-implements its own (spec section 38). */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="mono-label accent">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="page-header-description">{description}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  );
}

/** Raised panel used across the dashboard, details, and admin screens. */
export function Panel({
  title,
  label,
  action,
  className = "",
  children,
}: {
  title?: string;
  label?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`panel raised ${className}`}>
      {(title || label || action) && (
        <div className="panel-head">
          <div>
            {label && <p className="mono-label">{label}</p>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Dashboard summary tile. The value uses the monospace metadata face. */
export function StatCard({
  label,
  value,
  note,
  accent = false,
}: {
  label: string;
  value: number | string;
  note?: string;
  accent?: boolean;
}) {
  return (
    <div className={`stat-card raised ${accent ? "stat-accent" : ""}`}>
      <p className="mono-label">{label}</p>
      <strong className="stat-value">
        {typeof value === "number" ? String(value).padStart(2, "0") : value}
      </strong>
      {note && <span className="stat-note">{note}</span>}
    </div>
  );
}
