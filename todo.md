# UniFind Implementation Checklist

## Migration to the specified stack (React → FastAPI → SQLite)

- [x] Replace the Manus tRPC/Drizzle/MySQL backend with FastAPI + SQLite per spec sections 3 and 40.
- [x] Model User, Item, Claim, ItemMatch, Comment, Conversation, Message, Notification, ContentReport.
- [x] Replace the broken managed-OAuth flow with working registration and sign-in (bcrypt + JWT session cookie).
- [x] Enforce the UIU email rule (`*.uiu.ac.bd`, any department) on both frontend and backend.
- [x] Restyle the interface to the soft industrial skeuomorphism direction in spec sections 31–37.
- [x] Restructure the frontend into components / layouts / pages / services / context / hooks.
- [x] Swap wouter for React Router and build the complete route table from spec section 16.

## Features

- [x] **Feature 1** — Report a lost or found item, with photo upload, saved to SQLite.
- [x] **Feature 2** — Browse with search, type/category/location/status filters, and sorting.
- [x] **Feature 3** — Claims and status tracking (`OPEN → PENDING → RESOLVED`).
- [x] Rule-based Smart Matching with a scored evidence comparison.
- [x] Community comments on listings.
- [x] Private messaging tied to an item or claim.
- [x] Notifications that link to the right destination.
- [x] Resolved gallery.
- [x] User dashboard with summary modules, quick actions, and recent activity.
- [x] Admin dashboard, post moderation, report queue, and basic user administration.
- [x] Email confirmation: a six-digit code mailed to the UIU address, with a soft
      gate that keeps reading open but closes posting and claiming until confirmed
      (spec section 5). Falls back to the backend console when no SMTP is set.

## Quality

- [x] Loading, empty, and error states on every data-driven screen.
- [x] Responsive layouts: 3 cards desktop, 2 tablet, 1 mobile, ~48px touch targets.
- [x] Ownership and admin authorisation enforced server-side, never trusting the frontend.
- [x] API verified end-to-end — `backend/smoke_test.ps1`, 59 checks passing.
- [x] Frontend typecheck and production build clean.
- [x] README with setup commands, demo accounts, API reference, and the faculty demo flow.

## Possible next steps

- [ ] Let a member correct a mistyped email before confirming, instead of
      registering again.
- [ ] Move item photos to an external image bucket instead of `backend/uploads/` (spec section 3).
- [ ] Add a "Not my item" dismissal that hides a specific match pair for that member.
- [ ] Port `backend/smoke_test.ps1` to pytest so it runs cross-platform.
- [ ] Delete `_legacy/` once the old implementation is no longer needed for reference.
