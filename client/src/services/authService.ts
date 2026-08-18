import { api } from "./api";
import type { User, Verification } from "@/types";

/** Registration also starts email confirmation, so it returns more than a user. */
export type RegisterResult = User & { verification: Verification };

export const authService = {
  register: (payload: {
    name: string;
    email: string;
    password: string;
    department?: string;
  }) => api.post<RegisterResult>("/api/auth/register", payload),

  login: (payload: { email: string; password: string }) =>
    api.post<User>("/api/auth/login", payload),

  logout: () => api.post<{ success: boolean }>("/api/auth/logout"),

  /** Throws ApiError(401) when there is no valid session. */
  me: (signal?: AbortSignal) => api.get<User>("/api/auth/me", signal),

  /** Confirm the UIU address with the six-digit code that was emailed. */
  verify: (code: string) =>
    api.post<{ user: User; message: string }>("/api/auth/verify", { code }),

  /** Ask for a fresh code. The backend allows this once a minute. */
  resend: () => api.post<Verification>("/api/auth/resend"),
};
