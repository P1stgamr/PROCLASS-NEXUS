import type { User } from "firebase/auth";
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from "firebase/messaging";
import type {
  NotificationSendInput,
  NotificationSendResult,
} from "@workspace/api-client-react";
import app from "@/firebase";

const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";

async function request<T>(
  user: User,
  path: string,
  body?: object,
): Promise<T> {
  const token = await user.getIdToken();
  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Notification request failed");
  return data as T;
}

export function sendNotifications(
  user: User,
  input: NotificationSendInput,
): Promise<NotificationSendResult> {
  return request(user, "/notifications/send", input);
}

export async function enablePushNotifications(user: User): Promise<void> {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim();
  if (!vapidKey) {
    throw new Error("Firebase Web Push public key is not configured yet.");
  }
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator)
  ) {
    throw new Error("This browser does not support push notifications.");
  }
  if (!(await isSupported())) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Allow notifications in your browser to receive push alerts.");
  }

  const serviceWorkerPath = `${import.meta.env.BASE_URL}firebase-messaging-sw.js`;
  const serviceWorkerRegistration =
    await navigator.serviceWorker.register(serviceWorkerPath);
  const token = await getToken(getMessaging(app), {
    vapidKey,
    serviceWorkerRegistration,
  });
  if (!token) throw new Error("Could not register this browser for push alerts.");

  await request<{ ok: boolean }>(user, "/notifications/token/register", { token });
}

export async function disablePushNotifications(user: User): Promise<void> {
  await request<{ ok: boolean }>(user, "/notifications/token/revoke");
  if (await isSupported()) {
    await deleteToken(getMessaging(app)).catch(() => false);
  }
}

export async function listenForForegroundPush(
  onNotification: (notification: { title: string; message: string }) => void,
) {
  if (!(await isSupported())) return () => undefined;
  return onMessage(getMessaging(app), (payload) => {
    const title = payload.data?.title || payload.notification?.title || "TaskMint Pro";
    const message = payload.data?.message || payload.notification?.body || "";
    if (message) onNotification({ title, message });
  });
}