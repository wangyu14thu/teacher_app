const CACHE = "fangcun-v6-desktop";
const BANK_LOGOS = ["abc.svg", "bob.svg", "boc.svg", "bocom.svg", "bosc.svg", "ccb.svg", "ceb.svg", "cgb.svg", "cib.svg", "citic.svg", "cmb.svg", "cmbc.svg", "hxb.svg", "icbc.svg", "nbcb.svg", "pab.svg", "psbc.svg", "spdb.svg"].map(file => `./assets/banks/${file}`);
const FILES = ["./", "./index.html", "./styles.css?v=desktop-6", "./app.js?v=banklogos-4", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", ...BANK_LOGOS];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put("./index.html", copy));
      return response;
    }).catch(() => caches.match("./index.html")));
    return;
  }
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request)));
});
