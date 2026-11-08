// Service worker : réseau d'abord (pages toujours à jour), copie en mémoire si pas de réseau.
const CACHE = 'novafit-v3';
const FICHIERS = ['./', 'index.html', 'intervention.html', 'jonction.html', 'config.js',
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(FICHIERS.map(f => c.add(f).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(noms => Promise.all(noms.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

function reseauAvecDelai(url, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('delai')), ms);
    fetch(url, { cache: 'no-cache' }).then(
      r => { clearTimeout(t); resolve(r); },
      err => { clearTimeout(t); reject(err); }
    );
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // les appels Apps Script ne sont pas interceptés
  e.respondWith(
    reseauAvecDelai(req.url, 5000)
      .then(rep => {
        if (rep && rep.ok) {
          const copie = rep.clone();
          caches.open(CACHE).then(c => c.put(req, copie));
        }
        return rep;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(rep => rep || Response.error()))
  );
});
