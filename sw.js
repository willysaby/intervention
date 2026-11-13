// Service worker : copie locale d'abord (ouverture instantanée même avec un réseau très faible),
// mise à jour en arrière-plan. Les nouvelles versions sont donc prises en compte à l'ouverture suivante.
const CACHE = 'novafit-v39';
const FICHIERS = ['./', 'index.html', 'intervention.html', 'jonction.html', 'commandes.html', 'termines.html', 'nc.html', 'nc-ajout.html', 'achats.html', 'achat-nouveau.html', 'fournisseurs.html', 'utilisateurs.html',
  'commun.js', 'commun.css', 'theme.js', 'theme.css', 'shell.js', 'shell.css', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(FICHIERS.map(f =>
        fetch(f, { cache: 'reload' }).then(r => { if (r && r.ok) return c.put(f, r); }).catch(() => {}))))
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

// Renvoie la copie locale tout de suite si elle existe ; sinon attend le réseau (8 s maximum).
// Dans tous les cas, la copie est rafraîchie en arrière-plan quand le réseau répond.
function copieLocaleOuReseau(e, req, ignoreSearch) {
  const maj = fetch(req, { cache: 'no-cache' }).then(rep => {
    if (rep && (rep.ok || rep.type === 'opaque')) {
      const copie = rep.clone();
      caches.open(CACHE).then(c => c.put(req, copie));
    }
    return rep;
  });
  e.waitUntil(maj.catch(() => {}));
  return caches.match(req, { ignoreSearch: !!ignoreSearch }).then(rep => {
    if (rep) return rep;
    return Promise.race([
      maj,
      new Promise((_, rejet) => setTimeout(() => rejet(new Error('delai')), 8000))
    ]).catch(() => Response.error());
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    e.respondWith(copieLocaleOuReseau(e, req, true));
  } else if (req.url.indexOf(PDFJS) === 0) {
    e.respondWith(copieLocaleOuReseau(e, req, false));   // lecteur de PDF : gardé après la première utilisation
  }
  // les appels Apps Script ne sont pas interceptés
});
