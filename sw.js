/* 오늘분량 — 서비스 워커: 휴대폰 알림(Web Push) 받기 · 알림을 누르면 앱 열기
 *   화면 파일은 따로 저장해 두지 않는다 (항상 최신 화면을 불러온다) */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch (_) {
    d = { body: e.data ? e.data.text() : '' };
  }
  e.waitUntil(self.registration.showNotification(d.title || '오늘분량', {
    body: d.body || '',
    icon: 'logo/png/icon-192.png?v=2',
    tag: d.tag || 'todays-dose',
    renotify: true,
    data: { url: d.url || './' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => c.url.startsWith(self.registration.scope));
    if (open) return open.focus();
    return self.clients.openWindow(url);
  }));
});
