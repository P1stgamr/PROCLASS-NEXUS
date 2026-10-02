import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { listenForForegroundPush } from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";

export function NotificationPushListener() {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (
      !currentUser ||
      userProfile?.pushNotificationsEnabled !== true ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | undefined;
    listenForForegroundPush(({ title, message }) => {
      if (active) toast({ title, description: message, duration: 8000 });
    })
      .then((stop) => {
        if (active) unsubscribe = stop;
        else stop();
      })
      .catch((error) => {
        console.error("Could not listen for foreground notifications:", error);
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [currentUser, userProfile?.pushNotificationsEnabled, toast]);

  return null;
}