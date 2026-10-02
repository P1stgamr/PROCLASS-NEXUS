importScripts("https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDEJ74wHklDp-7r0DvHDm4-Ea-pXty1fk4",
  authDomain: "taskmitpro.firebaseapp.com",
  databaseURL: "https://taskmitpro-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "taskmitpro",
  storageBucket: "taskmitpro.firebasestorage.app",
  messagingSenderId: "887447967195",
  appId: "1:887447967195:web:5f88f687398d89bae943fe",
  measurementId: "G-RDSEQVJ7T3",
});

firebase.messaging().onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || "TaskMint Pro";
  const url = data.url || "/notifications";

  return self.registration.showNotification(title, {
    body: data.message || "You have a new notification.",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    data: { url },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(
    event.notification.data?.url || "/notifications",
    self.location.origin,
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ("focus" in client) {
          return client.focus().then(() => {
            if ("navigate" in client) return client.navigate(targetUrl);
          });
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});