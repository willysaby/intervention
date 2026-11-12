/* Fonctions communes : session, appels au script, visionneuse de PDF */
(function () {
  const CLE_SESSION = 'sessionAccueil';
  const RANG = { technicien: 1, gestionnaire: 2, admin: 3 };
  const LIBELLES = { technicien: 'Technicien', gestionnaire: 'Gestionnaire', admin: 'Administrateur' };
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';

  function urlApi() {
    const u = (window.CONFIG && window.CONFIG.URL_API) || '';
    return u && u.indexOf('COLLE_ICI') !== 0 ? u : '';
  }

  function session() {
    try {
      const s = JSON.parse(localStorage.getItem(CLE_SESSION));
      if (s && RANG[s.niveau] && Array.isArray(s.droits) && s.jeton && s.expire > Date.now()) return s;
    } catch (e) {}
    return null;
  }

  // Droit du compte connecté (l'administrateur les a tous)
  function peut(droit) {
    const s = session();
    return !!s && (s.droits.indexOf('admin') >= 0 || s.droits.indexOf(droit) >= 0);
  }

  // Identifiant d'appareil : généré une fois, gardé dans le navigateur, envoyé à la connexion (suivi des appareils)
  function appareil() {
    let id = '';
    try { id = localStorage.getItem('idAppareil') || ''; } catch (e) {}
    if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) {
      const t = new Uint8Array(12);
      (window.crypto || { getRandomValues: function (a) { for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); } }).getRandomValues(t);
      id = Array.prototype.map.call(t, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      try { localStorage.setItem('idAppareil', id); } catch (e) {}
    }
    const ua = navigator.userAgent || '';
    const os = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Appareil';
    const nav = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'navigateur';
    return { id: id, libelle: os + ' · ' + nav };
  }

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  // Même règle que le script : sans espaces, minuscules (sert à retrouver le PDF d'un bon par son N° de commande)
  function cleCommande(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, '');
  }

  function erreur(code, message) {
    const e = new Error(message);
    e.code = code;
    return e;
  }

  // delai : durée maximale d'attente (ms). Au-delà, on abandonne et la page se rabat sur ses données enregistrées.
  async function api(action, donnees, delai) {
    const u = urlApi();
    if (!u) throw erreur('config', 'Adresse du script non renseignée (URL_API dans config.js).');
    const s = session();
    if (!s) throw erreur('session', 'Connecte-toi depuis l\'accueil.');
    const ctrl = new AbortController();
    const minuteur = setTimeout(function () { ctrl.abort(); }, delai || 15000);
    let r, res;
    try {
      r = await fetch(u, { method: 'POST', body: JSON.stringify(Object.assign({ action: action, jeton: s.jeton }, donnees || {})), signal: ctrl.signal });
      res = await r.json();
    } catch (e) {
      clearTimeout(minuteur);
      if (r && !ctrl.signal.aborted) throw erreur('serveur', 'Réponse inattendue du script (nouvelle version à déployer dans Apps Script ?).');
      throw erreur('reseau', 'Réseau trop faible ou absent : le serveur n\'a pas répondu à temps.');
    }
    clearTimeout(minuteur);
    if (!res.ok) throw erreur(res.code || 'serveur', res.erreur || 'Erreur du script.');
    return res;
  }

  // Remplace la page par un message (connexion absente, niveau insuffisant...)
  function bloquer(message) {
    const page = document.getElementById('page');
    page.innerHTML = '';
    const boite = document.createElement('div');
    boite.className = 'erreurPage';
    boite.textContent = message;
    const lien = document.createElement('a');
    lien.href = './';
    lien.textContent = '← Accueil';
    boite.appendChild(document.createElement('br'));
    boite.appendChild(lien);
    page.appendChild(boite);
  }

  // Vérifie la connexion et le niveau minimum ; sinon affiche le message et renvoie null
  // Vérifie la connexion et le droit demandé (jonction, intervention, nc, achats, gestion, fournisseurs, admin)
  function exiger(droit) {
    const s = session();
    if (!s) { bloquer('Connecte-toi depuis l\'accueil pour accéder à cette page.'); return null; }
    if (!peut(droit)) {
      bloquer('Ton compte n\'a pas accès à cette page.');
      return null;
    }
    return s;
  }

  /* ---------- Visionneuse de PDF ---------- */
  let visio = null, jeton = 0, urlBlob = '', defilement = 0;

  function construireVisio() {
    if (visio) return visio;
    visio = document.createElement('div');
    visio.id = 'visio';
    visio.hidden = true;
    visio.innerHTML =
      '<div class="visioBarre"><button type="button" class="btn" id="vRetour">← Retour</button>' +
      '<button type="button" class="btn vert" id="vAction" hidden></button></div>' +
      '<div id="vTitre"></div><div id="vInfo"></div><div id="vCorps"></div>' +
      '<div class="visioPied"><button type="button" class="btn" id="vOuvrir" hidden>Ouvrir dans le lecteur PDF</button></div>';
    document.body.appendChild(visio);
    visio.querySelector('#vRetour').onclick = function () { history.back(); };
    window.addEventListener('popstate', function () { if (!visio.hidden) cacherVisio(); });
    return visio;
  }

  function cacherVisio() {
    jeton++;
    visio.hidden = true;
    document.getElementById('page').hidden = false;
    window.scrollTo(0, defilement);
  }

  function chargerPdfJs() {
    return new Promise(function (resolve, reject) {
      if (window.pdfjsLib) return resolve();
      const s = document.createElement('script');
      s.src = PDFJS + 'pdf.min.js';
      s.onload = function () {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
        resolve();
      };
      s.onerror = function () { reject(new Error('pdf.js')); };
      document.head.appendChild(s);
    });
  }

  function octets(base64) {
    const bin = atob(base64);
    const t = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) t[i] = bin.charCodeAt(i);
    return t;
  }

  async function dessinerPdf(bytes, corps, moi) {
    await chargerPdfJs();
    const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    for (let n = 1; n <= pdf.numPages; n++) {
      if (moi !== jeton) return;
      const page = await pdf.getPage(n);
      const largeur = corps.clientWidth || 360;
      const echelle = largeur / page.getViewport({ scale: 1 }).width;
      const vp = page.getViewport({ scale: echelle * dpr });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      corps.appendChild(canvas);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    }
  }

  // ---------- File d'envoi différé (NC, achats, fournisseurs) : gardée sur l'appareil tant que le réseau manque ----------
  const CLE_FILE = 'fileAttente';
  function lireFile() { try { return JSON.parse(localStorage.getItem(CLE_FILE)) || []; } catch (e) { return []; } }
  function ecrireFile(l) { try { localStorage.setItem(CLE_FILE, JSON.stringify(l)); } catch (e) {} }
  function nouvelIdFile() { return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function garderEnFile(action, donnees, libelle) {
    const l = lireFile();
    const id = (donnees && donnees.idEnvoi) || nouvelIdFile();
    if (!l.some(function (x) { return x.id === id; })) l.push({ id: id, action: action, donnees: donnees, libelle: libelle || action, ts: Date.now() });
    ecrireFile(l);
    document.dispatchEvent(new CustomEvent('nova:file'));
  }
  // Envoie tout de suite ; sans réseau, garde sur l'appareil. Renvoie { enAttente: true } dans ce cas.
  async function envoyerOuGarder(action, donnees, libelle, delai) {
    if (!navigator.onLine) { garderEnFile(action, donnees, libelle); return { enAttente: true }; }
    try { return await api(action, donnees, delai || 30000); }
    catch (e) { if (e.code === 'reseau') { garderEnFile(action, donnees, libelle); return { enAttente: true }; } throw e; }
  }
  let fileEnCours = false;
  async function viderFile() {
    if (fileEnCours || !navigator.onLine || !session()) return { envoyes: 0 };
    fileEnCours = true;
    let envoyes = 0, erreurs = 0;
    for (const it of lireFile()) {
      if (it.erreur) { erreurs++; continue; }
      try {
        await api(it.action, it.donnees, 90000);
        ecrireFile(lireFile().filter(function (x) { return x.id !== it.id; }));
        envoyes++;
      } catch (e) {
        if (e.code === 'reseau' || e.code === 'session') break;
        if (/^four(Ajouter|Sauver)$/.test(it.action) && /existe déjà/.test(e.message)) { ecrireFile(lireFile().filter(function (x) { return x.id !== it.id; })); envoyes++; continue; }
        ecrireFile(lireFile().map(function (x) { return x.id === it.id ? Object.assign({}, x, { erreur: e.message }) : x; }));
        erreurs++;
      }
    }
    fileEnCours = false;
    document.dispatchEvent(new CustomEvent('nova:file', { detail: { envoyes: envoyes, erreurs: erreurs } }));
    return { envoyes: envoyes, erreurs: erreurs };
  }
  function retirerDeFile(id) { ecrireFile(lireFile().filter(function (x) { return x.id !== id; })); document.dispatchEvent(new CustomEvent('nova:file')); }
  window.addEventListener('online', function () { setTimeout(viderFile, 1500); });
  window.addEventListener('load', function () { if (lireFile().length) setTimeout(viderFile, 2000); });

  // Lit le contact et l'email du client dans le texte du bon de commande (sans IA)
  function contactDepuisLignes(lignes) {
    const res = { contact: '', email: '' };
    const RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
    const interne = function (e) { return /@novafit\.fr$/i.test(e); };
    for (let i = 0; i < lignes.length; i++) {
      const m = lignes[i].match(/Contact\s*:\s*(.*)$/i);
      if (m && !res.contact) {
        res.contact = m[1].replace(/^(M\.|Mr|Mme|Mlle|Monsieur|Madame)\s+/i, '').replace(/\s+/g, ' ').trim();
      }
      // Email : l'adresse peut etre sur la ligne suivante et coupee sur 2 ou 3 lignes
      const e = lignes[i].match(/E-?mail\s*:\s*(.*)$/i);
      if (e && !res.email) {
        let s = e[1].trim();
        for (let k = 1; k <= 3 && i + k < lignes.length; k++) {
          const suite = lignes[i + k].trim();
          if (!suite || /\s/.test(suite) || (s && /\s/.test(s))) break;
          s += suite;
        }
        const f = s.match(RE);
        if (f && !interne(f[0])) res.email = f[0].toLowerCase();
      }
    }
    if (!res.email) {
      const tous = (lignes.join('\n').match(new RegExp(RE.source, 'g')) || []).filter(function (x) { return !interne(x); });
      res.email = (tous[0] || '').toLowerCase();
    }
    return res;
  }

  async function extraireContact(bytes) {
    try {
      await chargerPdfJs();
      const pdf = await window.pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
      const lignes = [];
      for (let n = 1; n <= Math.min(pdf.numPages, 2); n++) {
        const tc = await (await pdf.getPage(n)).getTextContent();
        const rangs = [];
        tc.items.forEach(function (it) {
          if (!it.str || !it.str.trim()) return;
          const y = Math.round(it.transform[5]);
          let r = rangs.find(function (z) { return Math.abs(z.y - y) <= 2; });
          if (!r) { r = { y: y, items: [] }; rangs.push(r); }
          r.items.push({ x: it.transform[4], s: it.str });
        });
        rangs.sort(function (a, b) { return b.y - a.y; });
        rangs.forEach(function (r) {
          r.items.sort(function (a, b) { return a.x - b.x; });
          lignes.push(r.items.map(function (i) { return i.s; }).join(' '));
        });
      }
      return contactDepuisLignes(lignes);
    } catch (e) { return { contact: '', email: '' }; }
  }

  // options : { id, titre, action: { texte, fn }, surDocument(octets) }
  async function ouvrirVisio(o) {
    const v = construireVisio();
    defilement = window.pageYOffset || 0;
    history.pushState({ visio: 1 }, '');
    document.getElementById('page').hidden = true;
    v.hidden = false;
    window.scrollTo(0, 0);
    const moi = ++jeton;
    const bouton = v.querySelector('#vAction');
    if (o.action) {
      bouton.textContent = o.action.texte;
      bouton.onclick = o.action.fn;
      bouton.hidden = false;
    } else {
      bouton.hidden = true;
    }
    v.querySelector('#vTitre').textContent = o.titre || '';
    const info = v.querySelector('#vInfo'), corps = v.querySelector('#vCorps'), ouvrir = v.querySelector('#vOuvrir');
    corps.innerHTML = '';
    ouvrir.hidden = true;
    info.textContent = 'Chargement du document...';
    try {
      const doc = o.donnees ? { donnees: o.donnees } : await api('document', { id: o.id }, 45000);
      if (moi !== jeton) return;
      const bytes = octets(doc.donnees);
      if (o.surDocument) { try { o.surDocument(bytes); } catch (e) {} }
      if (urlBlob) URL.revokeObjectURL(urlBlob);
      urlBlob = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      ouvrir.onclick = function () { window.open(urlBlob, '_blank'); };
      ouvrir.hidden = false;
      try {
        await dessinerPdf(bytes, corps, moi);
        if (moi === jeton) info.textContent = '';
      } catch (e) {
        if (moi === jeton) info.textContent = 'Aperçu impossible ici : utilise « Ouvrir dans le lecteur PDF ».';
      }
    } catch (e) {
      if (moi === jeton) info.textContent = e.message;
    }
  }

  window.Nova = {
    RANG: RANG, LIBELLES: LIBELLES, session: session, api: api, norm: norm, cleCommande: cleCommande,
    peut: peut, appareil: appareil, bloquer: bloquer, exiger: exiger, ouvrirVisio: ouvrirVisio, extraireContact: extraireContact, envoyerOuGarder: envoyerOuGarder, viderFile: viderFile, lireFile: lireFile, retirerDeFile: retirerDeFile, garderEnFile: garderEnFile, contactDepuisLignes: contactDepuisLignes, urlApi: urlApi
  };
})();
