import { get, push, ref, runTransaction, update } from "firebase/database";
import { db } from "@/firebase";

export const COMMUNITY_COMMISSION_RATE = 5;
export const COMMUNITY_MIN_WITHDRAWAL = 100;

export type Community = {
  id: string;
  ownerUid: string;
  name: string;
  description?: string;
  logo?: string;
  status: "active" | "suspended";
  commissionRate: number;
  specialBenefits?: {
    featured?: boolean;
    verified?: boolean;
    priority?: boolean;
  };
  createdAt: number;
  students?: Record<string, any>;
};

export function isPlatformAdmin(role?: string) {
  return role === "admin" || role === "super_admin" || role === "owner";
}

export async function awardCoinsWithCommunityCommission(
  uid: string,
  amount: number,
  type: string,
  sourceId?: string,
) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const userSnapshot = await get(ref(db, `users/${uid}`));
  const user = userSnapshot.val();
  if (!user) throw new Error("Student profile not found");

  const coinResult = await runTransaction(ref(db, `users/${uid}/coins`), (current) => {
    const currentCoins = Number(current || 0);
    return Number.isFinite(currentCoins) ? currentCoins + amount : amount;
  });
  if (!coinResult.committed) throw new Error("Could not credit student coins");

  const communityId = user.communityId;
  if (!communityId) return;
  const communitySnapshot = await get(ref(db, `communities/${communityId}`));
  const community = communitySnapshot.val();
  if (!community || community.status !== "active") return;

  const commission = Math.max(
    0,
    Math.floor(amount * (Number(community.commissionRate ?? COMMUNITY_COMMISSION_RATE) / 100)),
  );
  if (commission <= 0) return;

  const logRef = push(ref(db, `communityCommissionLogs/${communityId}`));
  const balanceRef = ref(db, `communityBalances/${communityId}/balance`);
  const balanceResult = await runTransaction(balanceRef, (current) => Number(current || 0) + commission);
  if (!balanceResult.committed) throw new Error("Could not credit community commission");

  await setCommissionLog(communityId, logRef.key!, {
    uid,
    studentName: user.name || "Student",
    amount,
    commission,
    type,
    sourceId: sourceId || null,
    createdAt: Date.now(),
  });
}

async function setCommissionLog(communityId: string, logId: string, log: Record<string, unknown>) {
  await update(ref(db), { [`communityCommissionLogs/${communityId}/${logId}`]: log });
}