# UniFind

The private Lost &amp; Found network for **United International University (UIU)**.

UIU students, faculty, and staff report lost or found belongings, search existing
reports, see rule-based Smart Match suggestions, message each other privately,
submit ownership claims, and close a case once an item is back with its owner.

**Stack:** React (Vite + TypeScript) → FastAPI (Python) → SQLite

---

## 1. What you need installed

| Tool | Version | Check with |
| --- | --- | --- |
| Python | 3.10 or newer | `py --version` |
| Node.js | 18 or newer | `node --version` |

---

## 2. Run it (first time)

You need **two terminals** — one for the backend, one for the frontend.

### Terminal 1 — backend (FastAPI + SQLite)

Run these in order, from the project root:

```bash
cd backend
```

```bash
py -3.12 -m venv venv
```

```bash
venv\Scripts\python.exe -m pip install -r requirements.txt
```

```bash
venv\Scripts\python.exe seed.py
```

```bash
venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

The API is now on **http://127.0.0.1:8000**, with interactive docs at
**http://127.0.0.1:8000/docs**.

> On macOS or Linux, use `python3 -m venv venv` and `venv/bin/python` instead.

### Terminal 2 — frontend (React)

From the project root:

```bash
npm install
```

```bash
npm run dev
```

Open **http://localhost:5173**.

Vite proxies `/api` and `/uploads` to the backend, so both run on one origin in
the browser and no CORS setup is needed.

## 3. Run it (every time after that)

```bash
cd backend && venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

```bash
npm run dev
```

---

## 4. Demo accounts

`seed.py` creates four accounts. The password for all of them is **`UniFind2026`**.

| Email | Role |
| --- | --- |
| `ayesha@bscse.uiu.ac.bd` | member |
| `tanvir@eee.uiu.ac.bd` | member |
| `nusrat@bba.uiu.ac.bd` | member |
| `admin@uiu.ac.bd` | **administrator** |

All four are created already confirmed, so the demonstration never waits on an
inbox. It also creates six items, including a lost/found pair that produces a
high-confidence Smart Match you can show immediately.

To start over with a clean database, delete `backend/unifind.db` and run
`seed.py` again.

> **Upgrading a database made before email confirmation existed?** New tables
> are created automatically, but SQLite will not add the two new `users`
> columns on its own. Either delete `unifind.db` and re-seed, or run once:
>
> ```bash
> sqlite3 backend/unifind.db "ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT 0; ALTER TABLE users ADD COLUMN verified_at DATETIME;"
> ```

---

## 5. Project structure

```
unifind/
├── backend/                  FastAPI + SQLite
│   ├── main.py               App entry point, routers, CORS, /uploads
│   ├── database.py           SQLite engine, session, get_db dependency
│   ├── models.py             Tables: User, EmailVerification, Item, Claim,
│   │                         ItemMatch, Comment, Conversation, Message,
│   │                         Notification, ContentReport
│   ├── schemas.py            Pydantic validation + the UIU email rule
│   ├── auth.py               bcrypt hashing, JWT session cookie, route guards,
│   │                         six-digit confirmation codes
│   ├── mailer.py             Sends the confirmation code (stdlib SMTP)
│   ├── matching.py           Rule-based Smart Match scoring
│   ├── helpers.py            Item serialisation + notification helper
│   ├── seed.py               Demo accounts and items
│   ├── routers/
│   │   ├── auth.py           register / login / logout / me / verify / resend
│   │   ├── items.py          Report, browse, search, filter, edit, status, upload
│   │   ├── claims.py         Submit, list, approve/reject
│   │   ├── comments.py       Community comment threads
│   │   ├── matches.py        Smart Match results
│   │   ├── messages.py       Conversations and messages
│   │   ├── notifications.py  In-app notifications
│   │   ├── dashboard.py      Dashboard, public stats, content flagging
│   │   └── admin.py          Admin stats, post moderation, users
│   └── unifind.db            Created on first run (git-ignored)
│
└── client/                   React frontend
    └── src/
        ├── components/
        │   ├── common/       Navbar, Footer, ProtectedRoute, AdminRoute,
        │   │                 SearchBar, FilterPanel, StatusBadge, ImageUploader,
        │   │                 Modal, ConfirmModal, PageHeader, Panel, StatCard,
        │   │                 LoadingSpinner, EmptyState, ErrorMessage
        │   ├── items/        ItemCard, ItemForm
        │   ├── claims/       ClaimModal
        │   ├── matches/      MatchCard
        │   └── messages/     MessageBubble, CommentRow
        ├── layouts/          PublicLayout, MainLayout, AdminLayout
        ├── pages/            One file per route (+ pages/admin/)
        ├── services/         api, auth, item, claim, comment, match,
        │                     message, notification, admin
        ├── context/          AuthContext
        ├── hooks/            useApi, useDebounced
        ├── types.ts          API response shapes
        ├── constants.ts      Categories, locations, UIU email rule, formatters
        └── index.css         The complete design system
```

---

## 6. Routes

### Public
| Route | Page |
| --- | --- |
| `/` | Home |
| `/login` | Sign in |
| `/register` | Create account |

### Authenticated UIU members
| Route | Page |
| --- | --- |
| `/verify` | Confirm your UIU email |
| `/dashboard` | Dashboard |
| `/browse` | Browse lost &amp; found items |
| `/items/:id` | Item details |
| `/items/:id/edit` | Edit own post |
| `/report/lost` | Report lost item |
| `/report/found` | Report found item |
| `/my-posts` | My posts |
| `/matches` | Possible matches |
| `/claims` | Claims |
| `/messages` | Message inbox |
| `/messages/:id` | Conversation |
| `/notifications` | Notifications |
| `/resolved` | Resolved gallery |
| `/profile` | Profile |

### Administrators
| Route | Page |
| --- | --- |
| `/admin` | Admin dashboard |
| `/admin/posts` | Manage posts |
| `/admin/reports` | Moderation queue |
| `/admin/users` | User administration |

Anything else renders the 404 page.

---

## 7. API

Full interactive documentation: **http://127.0.0.1:8000/docs**

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account (UIU email required) |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Current member |
| GET | `/api/auth/pending` | Who the confirmation screen is waiting on |
| POST | `/api/auth/verify` | Confirm the UIU email with the code — this is also the sign-in |
| POST | `/api/auth/resend` | Send a fresh code (once a minute) |
| GET | `/api/items` | Browse — supports `search`, `type`, `category`, `location`, `status`, `mine`, `sort` |
| GET | `/api/items/{id}` | Item details |
| POST | `/api/items` | Report an item |
| PUT | `/api/items/{id}` | Edit own item |
| PATCH | `/api/items/{id}/status` | Change case status |
| DELETE | `/api/items/{id}` | Withdraw own item |
| POST | `/api/items/upload` | Upload one photo, returns its URL |
| GET/POST | `/api/items/{id}/comments` | Community comments |
| POST | `/api/items/{id}/claims` | Submit an ownership claim |
| GET | `/api/claims` | Claims received and submitted |
| PATCH | `/api/claims/{id}` | Approve or reject a claim |
| GET | `/api/matches` | Smart Match suggestions |
| GET/POST | `/api/conversations` | Inbox / start a conversation |
| GET | `/api/conversations/{id}` | One thread |
| POST | `/api/conversations/{id}/messages` | Send a message |
| GET | `/api/notifications` | Notifications |
| PATCH | `/api/notifications/{id}/read` | Mark one read |
| PATCH | `/api/notifications/read-all` | Mark all read |
| GET | `/api/dashboard` | Dashboard summary |
| GET | `/api/stats` | Anonymous counters for the public Home page |
| POST | `/api/reports` | Flag content for moderation |
| GET | `/api/admin/stats` | Admin statistics |
| GET | `/api/admin/posts` | All posts, including removed ones |
| PATCH | `/api/admin/posts/{id}/remove` · `/restore` | Moderate a post |
| GET | `/api/admin/reports` | Moderation queue |
| PATCH | `/api/admin/reports/{id}` | Review a report |
| GET | `/api/admin/users` | Registered members |
| PATCH | `/api/admin/users/{id}` | Suspend or reinstate |

---

## 8. How Smart Matching works

When a **lost** item is reported, it is compared against every open/pending
**found** item (and vice versa). Scores come from `backend/matching.py`:

| Signal | Points |
| --- | --- |
| Same category | +30 |
| Similar title (shared word of 3+ letters) | +25 |
| Same location | +20 |
| Same colour | +15 |
| Same brand | +10 |
| Reported within 3 days of each other | +10 |
| Shared description keyword | +5 |

Pairs scoring **40 or more** are stored and shown on `/matches`. The score is
capped at **99** so the interface can never claim certainty — it always reads
*possible match*, and the member verifies ownership through a claim.

Matches are recalculated whenever an item is created, edited, or has its status
changed, and a resolved or withdrawn item drops out of matching entirely.

---

## 8b. Claim and item state rules

A claim decision is visible to a student and acted on by them, so it is final.
`review_claim` in [`backend/routers/claims.py`](backend/routers/claims.py)
enforces one transition and no more:

| Entity | Allowed | Refused |
| --- | --- | --- |
| Claim | `submitted → approved`, `submitted → rejected` | anything after a decision (`409`) |
| Item | `open ↔ pending`, `open/pending → resolved`, `resolved → resolved` | `resolved → open/pending` (`409`) |

Approving a claim also **closes the competing ones**. Every other `submitted`
claim on that item is rejected in the same transaction and its claimant is
notified, so one item can never carry two approvals and nobody is left waiting
on a decision that has already been made. A second approval arriving
concurrently is refused by an explicit check rather than by timing.

`resolved` is terminal because it is what puts an item in the resolved gallery
and drops it out of Smart Matching — members are told the case is finished, and
reopening it would revive a post everybody had stopped watching. Setting the same
status twice still succeeds, because retries and double-clicks happen.

**Every transition is recorded.** `claim_decisions` stores the claim, the actor,
their role (`owner` or `admin`), the previous and new status, an optional reason,
and the timestamp. Rows are only ever inserted. The claim row shows where a claim
ended up; this shows how it got there, which is what an administrator needs when
a student disputes a decision. The reason is kept in the audit trail rather than
shown to the claimant, so a reviewer can be candid.

---

## 9. Email confirmation

Registering creates the account and mails a six-digit code, and **issues no
session at all**. Entering the correct code on `/verify` is what confirms the
address *and* signs the member in — one step, so the confirmation can never be
skipped by closing the tab.

This is a **hard gate**. Nothing in UniFind is reachable while unconfirmed, and
`/api/auth/me` answers `401` for a registered-but-unconfirmed account.

| Cookie | Issued by | Good for |
| --- | --- | --- |
| `unifind_session` | `/verify` and `/login` | Everything — this is the sign-in |
| `unifind_pending` | `/register`, and `/login` for an unconfirmed account | `/api/auth/verify`, `/api/auth/resend`, `/api/auth/pending` — nothing else |

Both are httpOnly and signed with the same key, so the pending token carries
`purpose: "verify"` and `get_pending_user` checks it. Without that, a pending
token would decode perfectly well as a session and hand out an account nobody
had confirmed.

Signing in with a correct password on an unconfirmed account returns `403` with
`{"code": "email_unverified"}`, mails a fresh code, and sets the pending cookie —
so someone who abandoned registration simply signs in to pick it back up. The
React app reads that `code` and routes to `/verify`.

`get_verified_user` in `backend/auth.py` still guards posting, claiming,
commenting, and messaging. It should now be unreachable, and stays as the second
lock: if a session is ever issued before confirmation by mistake, writes still
refuse it.

**Why a stored code and not a signed link.** A six-digit code is about twenty
bits: a million guesses, which is nothing. So unlike a JWT link it cannot defend
itself, and the code carries its own protection instead —

- stored as a **bcrypt hash**, never in plain text;
- **expires after 10 minutes**, and only one code is live per member at a time;
- **five wrong attempts burns it**, after which even the correct code is dead
  and a new one must be requested;
- **resend is limited to once a minute**, so the endpoint cannot be used to
  mail-bomb a UIU address;
- generated with `secrets`, never `random` — `random` is seeded from the clock,
  so a couple of observed codes would predict the rest.

**Running it without a mail server.** If `UNIFIND_SMTP_HOST` is not set, the code
is printed to the backend console instead of being emailed, and the confirmation
screen shows it directly. So the whole flow runs on a laptop with no credentials
and no inbox. Setting the SMTP variables in section 11 switches it to real email
with no code change. The on-screen code is suppressed when
`UNIFIND_ENV=production`.

**A production deploy must set the SMTP variables.** The gate is hard, so with no
mail server nobody can complete a registration — the code has nowhere to go and
the on-screen fallback is off in production. Three things make that fail safely
rather than silently:

1. **The backend says so at boot.** `UNIFIND_ENV=production` with no
   `UNIFIND_SMTP_HOST` logs a warning during startup, so it surfaces in the
   deploy log instead of in a confused student's registration form. It is not
   fatal — browsing and the seeded accounts still work.
2. **An undeliverable registration is rolled back.** If the code cannot be sent,
   `/register` deletes the account it just created and returns `503`. Otherwise
   the member would be left with an account that can never be confirmed *and*
   that blocks their own email from registering again with a `409`. Rolling it
   back means they simply retry once the mail server is configured.
3. **The confirmation screen never mentions configuration.** The six-digit code
   is only ever shown on a development backend. In production an undelivered
   code shows "The email did not go out" with a resend, not an SMTP note.

Members who registered *before* the mail server was configured recover on their
own: signing in mails them a fresh code and returns them to the confirmation
screen.

The four seeded demo accounts are created already confirmed, so the faculty
demonstration in section 12 never touches this.

---

## 10. Security and validation

- Passwords are hashed with **bcrypt**. Plain text is never stored, and the hash
  is never returned by the API. Confirmation codes are hashed the same way.
- Email confirmation is rate limited and attempt capped — see section 9.
- **The backend refuses to start in production with the development signing
  key.** `UNIFIND_SECRET_KEY` defaults to a value committed in this repository so
  local development works out of the box; anyone who can read the repo could use
  it to forge a session for any account, administrators included. With
  `UNIFIND_ENV=production` and that default still in place, `assert_production_secret`
  in [`backend/auth.py`](backend/auth.py) raises at startup rather than serving
  traffic. This one is fatal, unlike the SMTP warning, because it is not degraded
  service — it is no authentication at all.
- Claim decisions are final and audited — see section 8b.
- The session is a **JWT in an httpOnly cookie**, so page JavaScript cannot read
  it.
- The **UIU email rule** (`*.uiu.ac.bd`, any department subdomain) is enforced in
  `backend/schemas.py` on registration and re-checked on every request in
  `backend/auth.py`. The React forms check it too, but only for fast feedback —
  the backend never trusts the frontend.
- Listings are private: every item, claim, match, message, comment, and
  notification route requires a signed-in member.
- A member can only edit, delete, or change the status of **their own** posts,
  and only the poster can approve or reject a claim on their item.
- `/api/admin/*` requires the `admin` role, checked server-side. The
  `AdminRoute` guard in React is convenience only.
- `identifying_details` — the private proof used during a claim — is stripped
  from API responses for everyone except the member who posted the item.
- Conversations are readable only by their two participants.
- Queries go through SQLAlchemy with bound parameters, so search input cannot
  inject SQL.
- Uploaded filenames are generated server-side, so a crafted name cannot escape
  the upload directory.

---

## 11. Configuration

Backend settings are environment variables. Copy `backend/.env.example` to
`backend/.env` to change them — every one has a working development default, so
`.env` is optional locally.

| Variable | Default | Purpose |
| --- | --- | --- |
| `UNIFIND_SECRET_KEY` | dev fallback | Signs the session cookie. **Must be set in production.** |
| `UNIFIND_ENV` | `development` | Set to `production` to mark the cookie `Secure` (requires HTTPS). |
| `UNIFIND_UPLOAD_DIR` | `backend/uploads/` | Where item photos are written. |
| `UNIFIND_ALLOWED_ORIGINS` | — | Extra browser origins allowed to call the API. |
| `UNIFIND_SMTP_HOST` | — | Mail server for confirmation codes. Unset means the code is printed to the backend console instead — fine locally, but a production deploy needs this set or nobody can finish registering. |
| `UNIFIND_SMTP_PORT` | `587` | 465 is treated as implicit TLS; anything else uses STARTTLS. |
| `UNIFIND_SMTP_USER` · `UNIFIND_SMTP_PASSWORD` | — | Credentials, if the server needs them. |
| `UNIFIND_MAIL_FROM` | `UniFind <no-reply@uiu.ac.bd>` | From address on the confirmation email. |

**Note on image storage:** photos are written to `backend/uploads/`, which is
git-ignored so member uploads are never committed. For a real deployment, either
point `UNIFIND_UPLOAD_DIR` at a mounted volume outside the project, or replace
the `upload_photo` handler in `backend/routers/items.py` with a call to an image bucket
(S3 / Cloudinary) — SQLite already stores only the URL, so nothing else changes.

---

## 12. Faculty demonstration flow

1. Start both servers (section 2).
2. Sign in as `ayesha@bscse.uiu.ac.bd` / `UniFind2026`.
3. Open **Report lost item**.
4. Submit: *Samsung Galaxy S24* · Electronics · Black · Main Library · a description.
5. The success screen confirms it saved, and shows any possible matches found.
6. Open **Browse** — the new Samsung phone is there.
7. Search `Samsung`, then filter **Electronics** + **Lost**.
8. Open the item's details page.
9. Sign in as `tanvir@eee.uiu.ac.bd` in a second browser or private window and
   submit a **claim** — the case moves `OPEN → PENDING`.
10. Back as Ayesha, approve the claim and mark the case **RESOLVED**.
11. Open **Matches** to show the rule-based Smart Match with its evidence table.
12. Sign in as `admin@uiu.ac.bd` and open `/admin`.

This proves the full round trip: **React → FastAPI → SQLite → FastAPI → React**.

---

## 13. Feature status

**Working end-to-end (React → FastAPI → SQLite):**

| Feature | Status |
| --- | --- |
| **Feature 1** — Lost/Found item reporting | Complete, with photo upload |
| **Feature 2** — Browse, search, filter, sort | Complete |
| **Feature 3** — Claims &amp; status tracking (`OPEN → PENDING → RESOLVED`) | Complete |
| Email confirmation (six-digit code + hard gate) | Complete |
| Smart Matching | Complete (rule-based) |
| Comments | Complete |
| Private messaging | Complete |
| Notifications | Complete |
| Resolved gallery | Complete |
| Admin dashboard &amp; moderation | Complete |

Authentication, registration, and user accounts are required system
functionality — they are deliberately **not** counted as one of the numbered
project features.

**Frontend:** every route in section 6 is built and connected to live data.

---

## 14. Verifying the API

`backend/smoke_test.ps1` exercises the whole API against a running backend — the
UIU email rule, protected routes, the report → browse → search → claim →
resolve flow, Smart Matching, ownership rules, privacy of identifying details
and conversations, admin moderation, the claim/item state rules, and email
confirmation with its hard gate. 72 checks.

With the backend running, from PowerShell:

```bash
powershell -File backend/smoke_test.ps1
```

It writes test data into `unifind.db`. To get back to clean demo data, stop the
backend, delete `backend/unifind.db`, and run `seed.py` again.

---

## 15. Notes

- `_legacy/` holds the previous TypeScript/tRPC/Drizzle implementation, kept for
  reference only. Nothing in the running app imports it, and it can be deleted.
- There is no campus map, and no latitude/longitude fields. Location is
  structured — a known campus place, or free text when "Other" is chosen.
