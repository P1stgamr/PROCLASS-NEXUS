import { createHash } from "node:crypto";
import { Router, type IRouter } from "express";
import { getMessaging } from "firebase-admin/messaging";
import {
  RegisterPushTokenBody,
  RegisterPushTokenResponse,
  RevokePushTokensResponse,
  SendNotificationBody,
  SendNotificationResponse,
} from "@workspace/api-zod";
import { adminAuth, adminDb } from "../lib/firebaseAdmin";
import { requireFirebaseAuth, type AuthenticatedRequest } from "../lib/firebaseAuth";

const router: IRouter = Router();
const ADMIN_ROLES = new Set(["admin", "super_admin", "owner"]);
const MAX_MULTICAST_TOKENS = 500;

interface StoredPushToken {
  uid: string;
  key: string;
  token: string;
}

function isSafeUid(uid: string) {
  return ![".", "#", "$", "/", "[", "]"].some((character) => uid.includes(character));
}

router.post(
  "/notifications/send",
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const parsed = SendNotificationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const recipients = [...new Set(parsed.data.recipients)];
    if (recipients.some((uid) => !isSafeUid(uid))) {
      res.status(400).json({ error: "One or more recipient IDs are invalid" });
      return;
    }

    try {
      const roleSnapshot = await adminDb
        .ref(`users/${req.firebaseUser!.uid}/role`)
        .get();
      if (!ADMIN_ROLES.has(String(roleSnapshot.val() || ""))) {
        res.status(403).json({ error: "Admin access is required" });
        return;
      }

      const timestamp = Date.now();
      const updates: Record<string, unknown> = {};
      for (const uid of recipients) {
        const notificationId = adminDb.ref(`notifications/${uid}`).push().key;
        if (!notificationId) throw new Error("Could not create notification ID");
        updates[`notifications/${uid}/${notificationId}`] = {
          type: parsed.data.type,
          message: parsed.data.message,
          timestamp,
          read: false,
        };
      }
      await adminDb.ref().update(updates);

      let pushSent = 0;
      let pushFailed = 0;
      let noPushToken = recipients.length;

      try {
        const [usersSnapshot, tokensSnapshot] = await Promise.all([
          adminDb.ref("users").get(),
          adminDb.ref("pushTokens").get(),
        ]);
        const tokens: StoredPushToken[] = [];

        for (const uid of recipients) {
          if (usersSnapshot.child(uid).child("pushNotificationsEnabled").val() !== true) {
            continue;
          }
          const userTokens = tokensSnapshot.child(uid).val();
          if (!userTokens || typeof userTokens !== "object") continue;

          for (const [key, value] of Object.entries(userTokens)) {
            const token =
              typeof value === "string"
                ? value
                : value && typeof value === "object" && "token" in value
                  ? String(value.token)
                  : "";
            if (token) tokens.push({ uid, key, token });
          }
        }

        const usersWithTokens = new Set(tokens.map(({ uid }) => uid));
        noPushToken = recipients.filter((uid) => !usersWithTokens.has(uid)).length;

        const messaging = getMessaging(adminAuth.app);
        for (let offset = 0; offset < tokens.length; offset += MAX_MULTICAST_TOKENS) {
          const batch = tokens.slice(offset, offset + MAX_MULTICAST_TOKENS);
          try {
            const result = await messaging.sendEachForMulticast({
              tokens: batch.map(({ token }) => token),
              data: {
                title: "TaskMint Pro",
                message: parsed.data.message,
                type: parsed.data.type,
                url: "/notifications",
              },
              webpush: { headers: { Urgency: "normal" } },
            });

            pushSent += result.successCount;
            pushFailed += result.failureCount;
            const invalidTokenRemovals: Record<string, null> = {};
            result.responses.forEach((item, index) => {
              const code = item.error?.code;
              if (
                code === "messaging/registration-token-not-registered" ||
                code === "messaging/invalid-registration-token"
              ) {
                const token = batch[index];
                invalidTokenRemovals[`pushTokens/${token.uid}/${token.key}`] = null;
              }
            });
            if (Object.keys(invalidTokenRemovals).length) {
              await adminDb.ref().update(invalidTokenRemovals);
            }
          } catch (error) {
            pushFailed += batch.length;
            req.log.error({ err: error, batchSize: batch.length }, "Push delivery batch failed");
          }
        }
      } catch (error) {
        // Inbox writes are already committed; do not turn a push outage into a
        // retry that would create duplicate in-app notifications.
        pushFailed = Math.max(pushFailed, recipients.length);
        req.log.error({ err: error }, "Push delivery setup failed after inbox write");
      }

      res.json(
        SendNotificationResponse.parse({
          writtenRecipients: recipients.length,
          pushSent,
          pushFailed,
          noPushToken,
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Could not send notification");
      res.status(500).json({ error: "Could not save the notification" });
    }
  },
);

router.post(
  "/notifications/token/register",
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const parsed = RegisterPushTokenBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const uid = req.firebaseUser!.uid;
    const tokenKey = createHash("sha256").update(parsed.data.token).digest("hex");
    const timestamp = Date.now();
    try {
      await adminDb.ref().update({
        [`pushTokens/${uid}/${tokenKey}`]: {
          token: parsed.data.token,
          updatedAt: timestamp,
        },
        [`users/${uid}/pushNotificationsEnabled`]: true,
      });
      res.json(RegisterPushTokenResponse.parse({ ok: true }));
    } catch (error) {
      req.log.error({ err: error }, "Could not register push token");
      res.status(500).json({ error: "Could not enable push notifications" });
    }
  },
);

router.post(
  "/notifications/token/revoke",
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const uid = req.firebaseUser!.uid;
    try {
      await adminDb.ref().update({
        [`pushTokens/${uid}`]: null,
        [`users/${uid}/pushNotificationsEnabled`]: false,
      });
      res.json(RevokePushTokensResponse.parse({ ok: true }));
    } catch (error) {
      req.log.error({ err: error }, "Could not revoke push tokens");
      res.status(500).json({ error: "Could not disable push notifications" });
    }
  },
);

export default router;