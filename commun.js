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
      if (s && RANG[s.niveau] && s.jeton && s.expire > Date.now()) return s;
    } catch (e) {}
    return null;
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
  function exiger(minimum) {
    const s = session();
    if (!s) { bloquer('Connecte-toi depuis l\'accueil pour accéder à cette page.'); return null; }
    if (RANG[s.niveau] < RANG[minimum]) {
      bloquer('Accès réservé aux ' + (minimum === 'admin' ? 'administrateurs.' : 'gestionnaires et aux administrateurs.'));
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

  // options : { id, titre, action: { texte, fn } }
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
      const doc = await api('document', { id: o.id }, 45000);
      if (moi !== jeton) return;
      const bytes = octets(doc.donnees);
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
    bloquer: bloquer, exiger: exiger, ouvrirVisio: ouvrirVisio, urlApi: urlApi
  };
})();
