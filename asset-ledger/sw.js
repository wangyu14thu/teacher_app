const CACHE = "fangcun-v4-banklogos";
const BANK_LOGOS = ["abc.svg", "bob.svg", "boc.svg", "bocom.svg", "bosc.svg", "ccb.svg", "ceb.svg", "cgb.svg", "cib.svg", "citic.svg", "cmb.svg", "cmbc.svg", "hxb.svg", "icbc.svg", "nbcb.svg", "pab.svg", "psbc.svg", "spdb.svg"].map(file => `./assets/banks/${file}`);
const FILES = ["./", "./index.html?v=banklogos-4", "./styles.css?v=banklogos-4", "./app.js?v=banklogos-4", "./manifest.webmanifest", "./icon.svg", ...BANK_LOGOS];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener("fetch", event => event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request))));
