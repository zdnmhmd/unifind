import { Route, Routes } from "react-router-dom";
import { AdminLayout, MainLayout, PublicLayout } from "@/layouts/Layouts";
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

import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { ManagePosts } from "@/pages/admin/ManagePosts";
import { ModerationReports } from "@/pages/admin/ModerationReports";
import { AdminUsers } from "@/pages/admin/AdminUsers";

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
          <Route element={<AdminLayout />}>
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
