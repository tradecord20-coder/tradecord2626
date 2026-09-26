
self.addEventListener("push", function(event) {
    const data = event.data ? event.data.json() : { title: "Notification", body: "New update available!" };
    const options = {
        body: data.body,
        icon: "/icon.png",
        badge: "/badge.png"
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", function(event) {
    event.notification.close();
    event.waitUntil(clients.openWindow("/"));
});
