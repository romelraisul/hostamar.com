const self = globalScope;

// Web Push subscription management
let pushSubscription = null;

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  const title = data.title || 'AI Browser Notification';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-96.png',
    image: data.image,
    data: data.data || {},
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    timestamp: data.timestamp || Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  if (action === 'open') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          if (clients.length > 0) {
            return clients[0].focus();
          }
          return self.clients.openWindow(data.url || '/');
        })
    );
  } else if (action === 'dismiss') {
    // Do nothing, notification is already closed
  } else {
    // Default action - open the app
    event.waitUntil(
      self.clients.openWindow(data.url || '/')
    );
  }
});

self.addEventListener('notificationclose', (event) => {
  // Track notification dismissal for analytics
  console.log('Notification closed:', event.notification.tag);
});

// Expose push subscription management to the main thread
self.addEventListener('message', async (event) => {
  const { type, data } = event.data || {};

  if (type === 'subscribe-push') {
    try {
      const subscription = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey)
      });
      pushSubscription = subscription;
      event.source.postMessage({ type: 'push-subscribed', subscription: subscription.toJSON() });
    } catch (error) {
      event.source.postMessage({ type: 'push-error', error: error.message });
    }
  }

  if (type === 'unsubscribe-push') {
    try {
      if (pushSubscription) {
        await pushSubscription.unsubscribe();
        pushSubscription = null;
      }
      event.source.postMessage({ type: 'push-unsubscribed' });
    } catch (error) {
      event.source.postMessage({ type: 'push-error', error: error.message });
    }
  }
});

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
