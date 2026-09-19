import { User } from "firebase/auth";

export type RewardedAdPlacement = "gift_claim" | "quiz_unlock" | "exam_unlock" | "watch_task";

export interface RewardedAdSession {
  sessionId: string;
  adUnitId: string;
  expiresAt: number;
  remaining: number;
}

export interface RewardedAdResult {
  ok: boolean;
  rewardCoins?: number;
  unlockId?: string;
  message?: string;
  remaining?: number;
}

const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";

async function request<T>(user: User, path: string, body: Record<string, unknown>): Promise<T> {
  const token = await user.getIdToken();
  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Rewarded ad request failed");
  return data as T;
}

export function createRewardedAdSession(
  user: User,
  placement: RewardedAdPlacement,
  referenceId: string,
) {
  return request<RewardedAdSession>(user, "/rewarded-ads/session", { placement, referenceId });
}

export function completeRewardedAdSession(
  user: User,
  sessionId: string,
  providerEvent: string,
) {
  return request<RewardedAdResult>(user, "/rewarded-ads/complete", {
    sessionId,
    providerEvent,
  });
}

export function consumeRewardedAdUnlock(
  user: User,
  unlockId: string,
  placement: RewardedAdPlacement,
  referenceId: string,
) {
  return request<{ ok: true }>(user, "/rewarded-ads/unlock/consume", {
    unlockId,
    placement,
    referenceId,
  });
}