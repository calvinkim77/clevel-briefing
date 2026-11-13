const CACHE = "clevel-briefing-v2";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-180.png"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(req){
  return fetch(req)
    .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
    .catch(() => caches.match(req).then(m => m || caches.match("./index.html")));
}

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;

  const p = url.pathname;

  // content + app shell: network first so updates land immediately, cache for offline
  if (p.endsWith("/data.json") || p.endsWith("/") || p.endsWith("/index.html") || p.endsWith("/sw.js")) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  // static assets (icons, manifest): cache first
  e.respondWith(
    caches.match(e.request).then(m => m || fetch(e.request).then(r => {
      const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r;
    }).catch(() => caches.match("./index.html")))
  );
});
