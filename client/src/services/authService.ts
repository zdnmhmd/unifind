import { api } from "./api";
import type { User } from "@/types";

export const authService = {
  register: (payload: {
    name: string;
    email: string;
    password: string;
    department?: string;
  }) => api.post<User>("/api/auth/register", payload),

  login: (payload: { email: string; password: string }) =>
    api.post<User>("/api/auth/login", payload),

  logout: () => api.post<{ success: boolean }>("/api/auth/logout"),

  /** Throws ApiError(401) when there is no valid session. */
  me: (signal?: AbortSignal) => api.get<User>("/api/auth/me", signal),
};
