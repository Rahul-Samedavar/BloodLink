importScripts("https://cdnjs.cloudflare.com/ajax/libs/firebase/10.0.0/firebase-app-compat.min.js");
importScripts("https://cdnjs.cloudflare.com/ajax/libs/firebase/10.0.0/firebase-messaging-compat.min.js");

firebase.initializeApp(
    //Add FCM CONFIG HERE
);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log("Received background message", payload);
    const { title, link_url, ...options } = payload.data;
    notification_options.data.link_url = link_url;

    // Customize notification here
    self.registration.showNotification(title, { ...notification_options, ...options });
});

self.addEventListener("notificationclick", (event) => {
    console.log("Click:", event);
    event.notification.close();

    event.waitUntil(clients.matchAll({ type: "window" }).then((clientList) => {
        console.log("what is client list", clientList);
        for (const client of clientList) {
            if (client.url === "/" && "focus" in client) return client.focus();
        }
        if (clients.openWindow && Boolean(event.notification.data.link_url)) return clients.openWindow(event.notification.data.link_url);
    }).catch(err => {
        console.log("There was an error waitUntil:", err);
    }));
});