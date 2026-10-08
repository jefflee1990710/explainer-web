// Shows a finished-generation notice even when this tab is in the background.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data && event.notification.data.href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (href && client.url.includes(href) && "focus" in client) return client.focus();
      }
      if (href && self.clients.openWindow) return self.clients.openWindow(href);
      if (clients[0] && "focus" in clients[0]) return clients[0].focus();
    }),
  );
});
