import { api } from "./api";
import type { Claim } from "@/types";

export const claimService = {
  /** Submit an ownership claim with a short verification message. */
  create: (itemId: number, verificationMessage: string) =>
    api.post<Claim>(`/api/items/${itemId}/claims`, {
      verification_message: verificationMessage,
    }),

  /** Both directions: claims received on own posts, and claims submitted. */
  list: (signal?: AbortSignal) => api.get<Claim[]>("/api/claims", signal),

  review: (claimId: number, status: "approved" | "rejected") =>
    api.patch<Claim>(`/api/claims/${claimId}`, { status }),
};
