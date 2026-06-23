const CACHE_NAME = 'padelhub-v238';
// Separate, long-lived cache for avatar/storage images so a CACHE_NAME bump
// (which wipes the app-shell cache on every deploy) does NOT evict already-
// downloaded avatars. This is what keeps avatars instant across deploys (#131).
const IMG_CACHE_NAME = 'padelhub-img-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// Install — cache static assets.
// S091 (#127): skipWaiting() REMOVED. A new SW now waits until all app windows are
// closed before activating, so users never get a forced mid-session reload. The new
// version applies cleanly on the next full open. (First-ever installs still activate
// immediately — there is no old worker to wait for.)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// Activate — clean old caches and take control of any uncontrolled windows.
// S091 (#127): the SW_UPDATED postMessage (which triggered window.location.reload)
// was REMOVED — the new version is served on the next open, no reload needed.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== IMG_CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — smart caching strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // S092 (#131): Supabase Storage public images (avatars) — cache-first with
  // background revalidation. These are public, stable URLs; before this, the
  // blanket supabase.co bypass below meant every avatar re-downloaded over the
  // network on each cold open, leaving them blank for 4-5s. Now a cached avatar
  // renders instantly while a fresh copy updates the cache in the background, so
  // a later avatar change still appears on the next open. Stored in IMG_CACHE so
  // it survives app-shell cache bumps.
  if (event.request.url.includes('/storage/v1/object/public/')) {
    event.respondWith(
      caches.open(IMG_CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const network = fetch(event.request)
            .then((response) => {
              if (response.ok) cache.put(event.request, response.clone());
              return response;
            })
            .catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  if (event.request.url.includes('supabase.co')) return;
  if (event.request.url.includes('googleapis.com')) return;

  const url = new URL(event.request.url);

  // HTML navigation requests — network-first, ALWAYS
  // This ensures the app shell references the correct JS bundle after redeployment
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Hashed assets (e.g., index-DdI_Nc05.js) — network-first with cache fallback
  // CHANGED from cache-first: after redeployment, old hashes 404 on Vercel.
  // Network-first ensures we always try the live file first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Everything else — network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Push — handle incoming push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'PadelHub', body: 'You have a new notification', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
      tag: data.tag || 'padelhub-default',
      renotify: true,
    })
  );
});

// Notification click — open app or focus existing tab
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  const fullUrl = new URL(url, self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(fullUrl);
          return client.focus();
        }
      }
      return clients.openWindow(fullUrl);
    })
  );
});
