import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import type { DataSnapshot } from "firebase-admin/database";
import { adminDb } from "../lib/firebaseAdmin";
import { requireFirebaseAuth, type AuthenticatedRequest } from "../lib/firebaseAuth";

type Placement = "gift_claim" | "quiz_unlock" | "exam_unlock" | "watch_task";

const router: IRouter = Router();
const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_MS = 10 * 60 * 1000;

function dateKey(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

function asPositiveInt(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function readAdsSettings(snapshot: DataSnapshot) {
  const raw = snapshot.val() || {};
  const placements = raw.placements || {};
  const adUnitIds = raw.adUnitIds || {};
  return {
    enabled: raw.enabled === true,
    dailyCap: Math.min(asPositiveInt(raw.dailyCap, 10), 100),
    placementEnabled: (placement: Placement) =>
      placements[placement] !== false,
    adUnitIds,
    fallbackAdUnitId: raw.rewardedAdUnitId || "",
  };
}

function validPlacement(value: unknown): value is Placement {
  return ["gift_claim", "quiz_unlock", "exam_unlock", "watch_task"].includes(String(value));
}

async function getSettings() {
  return readAdsSettings(await adminDb.ref("settings/ads").get());
}

async function getDailyCount(uid: string, date = dateKey()) {
  const snapshot = await adminDb.ref(`adStats/${uid}/${date}/count`).get();
  return Number(snapshot.val() || 0);
}

async function incrementDailyCount(uid: string, date: string, cap: number) {
  const result = await adminDb.ref(`adStats/${uid}/${date}/count`).transaction((value) => {
    const current = Number(value || 0);
    return current >= cap ? undefined : current + 1;
  });
  return result.committed ? Number(result.snapshot.val() || 0) : null;
}

async function creditCoins(uid: string, amount: number) {
  if (amount <= 0) return;
  const result = await adminDb.ref(`users/${uid}/coins`).transaction((value) => {
    const current = Number(value || 0);
    return (Number.isFinite(current) ? current : 0) + amount;
  });
  if (!result.committed) throw new Error("Could not credit student coins");

  await adminDb.ref(`earnings/${uid}`).push({
    type: "rewarded_ad",
    amount,
    label: "Rewarded ad reward",
    timestamp: Date.now(),
  });
}

async function completeGift(uid: string, giftId: string, sessionId: string) {
  const giftRef = adminDb.ref(`gifts/${uid}/${giftId}`);
  const result = await giftRef.transaction((gift) => {
    if (!gift || gift.claimed === true) return undefined;
    return { ...gift, claimed: true, claimedAt: Date.now(), claimedByAdSession: sessionId };
  });
  if (!result.committed) throw new Error("Gift is already claimed or unavailable");
  const coins = asPositiveInt(result.snapshot.val()?.coins, 0);
  await creditCoins(uid, coins);
  return { rewardCoins: coins, message: "Gift claimed" };
}

async function completeWatchTask(uid: string, taskId: string) {
  const taskSnapshot = await adminDb.ref(`adTasks/${taskId}`).get();
  const task = taskSnapshot.val();
  if (!task || task.active === false) throw new Error("Ad task is unavailable");

  const progressRef = adminDb.ref(`adTaskProgress/${uid}/${taskId}`);
  const maxWatches = asPositiveInt(task.maxWatchesPerUser, 1);
  const progressResult = await progressRef.transaction((progress) => {
    const current = progress || { watchCount: 0, coinsEarned: 0 };
    if (Number(current.watchCount || 0) >= maxWatches) return undefined;
    return {
      ...current,
      watchCount: Number(current.watchCount || 0) + 1,
      coinsEarned: Number(current.coinsEarned || 0) + asPositiveInt(task.rewardCoins, 0),
      lastWatchedAt: Date.now(),
    };
  });
  if (!progressResult.committed) throw new Error("This ad task has reached its watch limit");
  const rewardCoins = asPositiveInt(task.rewardCoins, 0);
  await creditCoins(uid, rewardCoins);
  return { rewardCoins, message: "Ad task completed" };
}

router.post("/rewarded-ads/session", requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  const uid = req.firebaseUser!.uid;
  const placement = req.body?.placement;
  const referenceId = typeof req.body?.referenceId === "string" ? req.body.referenceId : "";
  if (!validPlacement(placement) || !referenceId) {
    res.status(400).json({ error: "A valid placement and referenceId are required" });
    return;
  }

  try {
    const settings = await getSettings();
    if (!settings.enabled || !settings.placementEnabled(placement)) {
      res.status(503).json({ error: "Rewarded ads are not enabled for this feature" });
      return;
    }
    const adUnitId = settings.adUnitIds[placement] || settings.fallbackAdUnitId;
    if (!adUnitId) {
      res.status(503).json({ error: "No rewarded ad unit is configured" });
      return;
    }

    const usedToday = await getDailyCount(uid);
    if (usedToday >= settings.dailyCap) {
      res.status(429).json({ error: "Daily ad limit reached", remaining: 0 });
      return;
    }

    if (placement === "gift_claim") {
      const gift = await adminDb.ref(`gifts/${uid}/${referenceId}`).get();
      if (!gift.exists() || gift.val()?.claimed === true) {
        res.status(409).json({ error: "Gift is already claimed or unavailable" });
        return;
      }
    }
    if (placement === "watch_task") {
      const task = await adminDb.ref(`adTasks/${referenceId}`).get();
      if (!task.exists() || task.val()?.active === false) {
        res.status(404).json({ error: "Ad task is unavailable" });
        return;
      }
    }

    const sessionId = randomUUID();
    const expiresAt = Date.now() + SESSION_MS;
    await adminDb.ref(`rewardedAdSessions/${sessionId}`).set({
      uid,
      placement,
      referenceId,
      status: "pending",
      createdAt: Date.now(),
      expiresAt,
      adUnitId,
    });

    res.json({
      sessionId,
      adUnitId,
      expiresAt,
      usedToday,
      remaining: settings.dailyCap - usedToday,
    });
  } catch (error) {
    req.log?.error?.(error);
    res.status(500).json({ error: "Could not start rewarded ad session" });
  }
});

router.post("/rewarded-ads/complete", requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  const uid = req.firebaseUser!.uid;
  const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId : "";
  if (!sessionId) {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }

  try {
    const sessionRef = adminDb.ref(`rewardedAdSessions/${sessionId}`);
    const sessionSnapshot = await sessionRef.get();
    const session = sessionSnapshot.val();
    if (!session || session.uid !== uid) {
      res.status(404).json({ error: "Rewarded ad session not found" });
      return;
    }
    if (session.status === "completed") {
      res.json({ ok: true, ...session.result, alreadyCompleted: true });
      return;
    }
    if (session.status !== "pending" || Number(session.expiresAt) < Date.now()) {
      res.status(409).json({ error: "Rewarded ad session expired or already used" });
      return;
    }

    const claim = await sessionRef.transaction((current) => {
      if (!current || current.uid !== uid || current.status !== "pending" || Number(current.expiresAt) < Date.now()) {
        return undefined;
      }
      return { ...current, status: "processing", processingAt: Date.now() };
    });
    if (!claim.committed) {
      const latest = await sessionRef.get();
      if (latest.val()?.status === "completed") {
        res.json({ ok: true, ...latest.val().result, alreadyCompleted: true });
        return;
      }
      res.status(409).json({ error: "Rewarded ad session is already being processed" });
      return;
    }

    const settings = await getSettings();
    const day = dateKey();
    const used = await incrementDailyCount(uid, day, settings.dailyCap);
    if (used === null) {
      res.status(429).json({ error: "Daily ad limit reached", remaining: 0 });
      return;
    }

    let result: Record<string, unknown>;
    if (session.placement === "gift_claim") {
      result = await completeGift(uid, session.referenceId, sessionId);
    } else if (session.placement === "watch_task") {
      result = await completeWatchTask(uid, session.referenceId);
    } else {
      const unlockId = randomUUID();
      await adminDb.ref(`adUnlocks/${uid}/${unlockId}`).set({
        placement: session.placement,
        referenceId: session.referenceId,
        createdAt: Date.now(),
        expiresAt: Date.now() + DAY_MS,
        sessionId,
      });
      result = { unlockId, rewardCoins: 0, message: "Feature unlocked" };
    }

    const completed = { ...result, completedAt: Date.now() };
    await sessionRef.update({ status: "completed", completedAt: completed.completedAt, result: completed });
    await adminDb.ref(`adStats/${uid}/${day}/events/${sessionId}`).set({
      placement: session.placement,
      referenceId: session.referenceId,
      rewardCoins: Number(result.rewardCoins || 0),
      completedAt: completed.completedAt,
    });
    res.json({ ok: true, ...completed, remaining: settings.dailyCap - used });
  } catch (error: any) {
    req.log?.error?.(error);
    res.status(409).json({ error: error?.message || "Could not complete rewarded ad" });
  }
});

router.post("/rewarded-ads/unlock/consume", requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  const uid = req.firebaseUser!.uid;
  const unlockId = typeof req.body?.unlockId === "string" ? req.body.unlockId : "";
  const placement = typeof req.body?.placement === "string" ? req.body.placement : "";
  const referenceId = typeof req.body?.referenceId === "string" ? req.body.referenceId : "";
  if (!unlockId || !placement || !referenceId) {
    res.status(400).json({ error: "unlockId, placement, and referenceId are required" });
    return;
  }

  const unlockRef = adminDb.ref(`adUnlocks/${uid}/${unlockId}`);
  const result = await unlockRef.transaction((unlock) => {
    if (!unlock || unlock.consumedAt || unlock.placement !== placement || unlock.referenceId !== referenceId) {
      return undefined;
    }
    if (Number(unlock.expiresAt) < Date.now()) return undefined;
    return { ...unlock, consumedAt: Date.now() };
  });
  if (!result.committed) {
    res.status(409).json({ error: "This feature unlock is missing, expired, or already used" });
    return;
  }
  res.json({ ok: true });
});

export default router;