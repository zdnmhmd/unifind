import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { AdminLayout, MainLayout, PublicLayout } from "@/layouts/Layouts";
import { LoadingSpinner } from "@/components/common/Feedback";
import { AdminRoute, ProtectedRoute } from "@/components/common/ProtectedRoute";

import { Home } from "@/pages/Home";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";
import { Dashboard } from "@/pages/Dashboard";
import { Browse } from "@/pages/Browse";
import { ItemDetails } from "@/pages/ItemDetails";
import { EditItem, ReportItem } from "@/pages/ReportItem";
import { MyPosts } from "@/pages/MyPosts";
import { Matches } from "@/pages/Matches";
import { Claims } from "@/pages/Claims";
import { Conversation, Messages } from "@/pages/Messages";
import { Notifications } from "@/pages/Notifications";
import { Resolved } from "@/pages/Resolved";
import { Profile } from "@/pages/Profile";
import { NotFound } from "@/pages/NotFound";
import { Verify } from "@/pages/Verify";

/* The admin console is the only thing that pulls in Recharts and TanStack
   Table, and almost nobody who loads UniFind is an administrator. Splitting it
   out keeps roughly 400 kB of charting off the landing page and every member
   screen; it arrives on the first hop into /admin instead. */
const AdminDashboard = lazy(() =>
  import("@/pages/admin/AdminDashboard").then(m => ({ default: m.AdminDashboard }))
);
const ManagePosts = lazy(() =>
  import("@/pages/admin/ManagePosts").then(m => ({ default: m.ManagePosts }))
);
const ModerationReports = lazy(() =>
  import("@/pages/admin/ModerationReports").then(m => ({ default: m.ModerationReports }))
);
const AdminUsers = lazy(() =>
  import("@/pages/admin/AdminUsers").then(m => ({ default: m.AdminUsers }))
);

/** Complete route table — spec section 16. */
export default function App() {
  return (
    <Routes>
      {/* Public: the only pages reachable without signing in. */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* Email confirmation is public on purpose: registering issues no session,
          so this page runs on the pending cookie and guards itself. Entering the
          code is what signs the member in. */}
      <Route path="/verify" element={<Verify />} />

      {/* Authenticated UIU members. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/items/:id" element={<ItemDetails />} />
          <Route path="/items/:id/edit" element={<EditItem />} />
          <Route path="/report/lost" element={<ReportItem mode="lost" />} />
          <Route path="/report/found" element={<ReportItem mode="found" />} />
          <Route path="/my-posts" element={<MyPosts />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/claims" element={<Claims />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:id" element={<Conversation />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/resolved" element={<Resolved />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Administrators only — the API enforces this independently. */}
        <Route element={<AdminRoute />}>
          <Route
            element={
              <Suspense fallback={<LoadingSpinner label="Opening the admin console…" />}>
                <AdminLayout />
              </Suspense>
            }
          >
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/posts" element={<ManagePosts />} />
            <Route path="/admin/reports" element={<ModerationReports />} />
            <Route path="/admin/users" element={<AdminUsers />} />
          </Route>
        </Route>
      </Route>

      <Route element={<MainLayout />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
