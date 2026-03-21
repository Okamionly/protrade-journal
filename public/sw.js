const CACHE_NAME = 'marketphase-v1';
const STATIC_ASSETS = ['/', '/logo-icon.png', '/logo-full.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Network-first for API, cache-first for static
  if (event.request.url.includes('/api/')) return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

/* ── Push Notifications ───────────────────────────────────────────── */

// Handle push events from server
self.addEventListener('push', (event) => {
  let data = { title: 'ProTrade Journal', body: 'Nouvelle notification', url: '/' };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/logo-icon.png',
    badge: '/logo-icon.png',
    vibrate: [100, 50, 100],
    tag: 'protrade-notification',
    renotify: true,
    data: { url: data.url },
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'dismiss', title: 'Fermer' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if possible
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(url);
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  // Analytics or cleanup can go here
});

/* ── Scheduled notification check via periodic sync (if supported) ── */

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkScheduledReminders());
  }
});

async function checkScheduledReminders() {
  try {
    const prefsRaw = await getFromIndexedDB('protrade_notif_prefs');
    if (!prefsRaw) return;

    const prefs = JSON.parse(prefsRaw);
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Daily bias reminder
    if (prefs.dailyBiasReminder && currentTime === prefs.dailyBiasTime) {
      await self.registration.showNotification('Rappel Daily Bias', {
        body: "N'oublie pas de remplir ton biais quotidien !",
        icon: '/logo-icon.png',
        badge: '/logo-icon.png',
        tag: 'bias-reminder',
        data: { url: '/daily-bias' },
        actions: [{ action: 'open', title: 'Remplir' }],
      });
    }

    // Trade review reminder (18:00)
    if (prefs.tradeReviewReminder && currentTime === '18:00') {
      await self.registration.showNotification('Revue des trades', {
        body: 'Revois tes trades de la journee !',
        icon: '/logo-icon.png',
        badge: '/logo-icon.png',
        tag: 'review-reminder',
        data: { url: '/journal' },
        actions: [{ action: 'open', title: 'Revoir' }],
      });
    }
  } catch {
    // Preferences not available
  }
}

// Simple IndexedDB helper for service worker (localStorage is not available)
function getFromIndexedDB(key) {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('protrade-sw', 1);
      request.onupgradeneeded = (e) => {
        e.target.result.createObjectStore('kv');
      };
      request.onsuccess = (e) => {
        const db = e.target.result;
        try {
          const tx = db.transaction('kv', 'readonly');
          const store = tx.objectStore('kv');
          const get = store.get(key);
          get.onsuccess = () => resolve(get.result || null);
          get.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, url, tag } = event.data;
    self.registration.showNotification(title || 'ProTrade Journal', {
      body: body || '',
      icon: '/logo-icon.png',
      badge: '/logo-icon.png',
      tag: tag || 'protrade-notification',
      data: { url: url || '/' },
    });
  }

  // Store preferences in IndexedDB for service worker access
  if (event.data?.type === 'SYNC_PREFERENCES') {
    try {
      const request = indexedDB.open('protrade-sw', 1);
      request.onupgradeneeded = (e) => {
        e.target.result.createObjectStore('kv');
      };
      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(JSON.stringify(event.data.prefs), 'protrade_notif_prefs');
      };
    } catch {
      // IndexedDB not available
    }
  }
});
