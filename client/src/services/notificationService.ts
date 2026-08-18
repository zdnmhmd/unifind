import { api } from "./api";
import type { Dashboard, Notification } from "@/types";

export const notificationService = {
  list: (signal?: AbortSignal) => api.get<Notification[]>("/api/notifications", signal),

  markRead: (id: number) =>
    api.patch<{ success: boolean }>(`/api/notifications/${id}/read`),

  markAllRead: () => api.patch<{ success: boolean }>("/api/notifications/read-all"),
};

export const dashboardService = {
  get: (signal?: AbortSignal) => api.get<Dashboard>("/api/dashboard", signal),
};

export const reportService = {
  /** Flag a post, comment, or member for admin review. */
  flag: (payload: {
    target_type: "item" | "comment" | "user";
    target_id: number;
    reason: string;
  }) => api.post<{ success: boolean }>("/api/reports", payload),
};
