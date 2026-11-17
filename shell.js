/* Habillage commun : en-tête (logo, titre, actualiser, clair/sombre) + barre d'onglets en bas */
(function () {
  const RANG = { technicien: 1, gestionnaire: 2, admin: 3 };
  const I = {
    home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    sliders: '<path d="M4 6h8M16 6h4M4 12h2M10 12h10M4 18h10M18 18h2"/><circle cx="14" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="18" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h2l2.4 11h11.2l2-8H6.2"/>',
    tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><path d="M8 8h.01"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14a6.5 6.5 0 0 1 3 6"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7 6.3 21l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    camera: '<path d="M4 8h3l1.6-2.2A1 1 0 0 1 9.4 5.4h5.2a1 1 0 0 1 .8.4L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 9"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    pen: '<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19l-4 1z"/><path d="M14 7l3 3"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
  };
  function svg(nom, taille) {
    return '<svg width="' + (taille || 24) + '" height="' + (taille || 24) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[nom] + '</svg>';
  }
  function session() {
    try {
      const s = JSON.parse(localStorage.getItem('sessionAccueil'));
      if (s && RANG[s.niveau] && Array.isArray(s.droits) && s.jeton && s.expire > Date.now()) return s;
    } catch (e) {}
    return null;
  }
  function peut(droit) {
    const s = session();
    return !!s && (s.droits.indexOf('admin') >= 0 || s.droits.indexOf(droit) >= 0);
  }
  const ONGLETS = [
    { id: 'jonction', lib: 'Jonction', href: 'jonction.html', ic: 'sliders', droit: 'jonction', fichiers: ['jonction.html'] },
    { id: 'inter', lib: 'Intervention', href: 'commandes.html', ic: 'wrench', droit: 'intervention', fichiers: ['commandes.html', 'intervention.html', 'distance.html'] },
    { id: 'accueil', lib: 'Accueil', href: './', ic: 'home', droit: null, fichiers: ['', 'index.html'] },
    { id: 'finies', lib: 'Finies', href: 'termines.html', ic: 'check', droit: 'gestion', fichiers: ['termines.html'] }
  ];
  // Menu des gestionnaires et administrateurs : seuls les onglets auxquels le compte a droit apparaissent
  const ONGLETS_GEST = [
    { id: 'jonction', lib: 'Jonction', href: 'jonction.html', ic: 'sliders', droit: 'jonction', fichiers: ['jonction.html'] },
    { id: 'inter', lib: 'Intervention', href: 'commandes.html', ic: 'wrench', droit: ['intervention', 'gestion'], fichiers: ['commandes.html', 'intervention.html', 'termines.html', 'distance.html'] },
    { id: 'accueil', lib: 'Accueil', href: './', ic: 'home', droit: null, fichiers: ['', 'index.html', 'utilisateurs.html', 'fournisseurs.html', 'maintenance.html'] },
    { id: 'achats', lib: 'Achats', href: 'achats.html', ic: 'cart', droit: 'achats', fichiers: ['achats.html', 'achat-nouveau.html'] },
    { id: 'nc', lib: 'NC', href: 'nc.html', ic: 'alert', droit: 'nc', fichiers: ['nc.html', 'nc-ajout.html'] }
  ];
  function menuGest() { return ['gestion', 'nc', 'achats', 'fournisseurs', 'admin'].some(peut); }
  function autorise(o) { return !o.droit || [].concat(o.droit).some(peut); }
  const SOUS_TITRES = { accueil: 'Les interventions Novafit', jonction: 'Paramètres de jonction', bon: 'Bon d\'intervention vierge',
    commandes: 'Bon d\'intervention de commande', finies: 'Interventions finies', inter: 'Interventions', achats: 'Achats fournisseurs', nc: 'Non-conformités' };

  const TITRES_PAGES = { 'maintenance.html': 'Maintenance', 'nc.html': 'Non-conformités', 'nc-ajout.html': 'Ajouter une non-conformité', 'achats.html': 'Achats fournisseurs', 'achat-nouveau.html': 'Nouvelle commande', 'fournisseurs.html': 'Annuaire des fournisseurs', 'utilisateurs.html': 'Utilisateurs et droits' };
  function fichierCourant() { return decodeURIComponent(location.pathname.split('/').pop()); }
  function ongletActif() {
    const f = fichierCourant();
    if (menuGest()) return (ONGLETS_GEST.find(o => o.fichiers.indexOf(f) >= 0) || ONGLETS_GEST[2]).id;
    let id = (ONGLETS.find(o => o.fichiers.indexOf(f) >= 0) || ONGLETS.find(function (o) { return o.id === 'accueil'; })).id;
    return id;
  }
  function themeEffectif() {
    const t = window.NovaTheme ? NovaTheme.get() : 'auto';
    if (t === 'clair' || t === 'sombre') return t;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'sombre' : 'clair';
  }

  function construire() {
    document.querySelectorAll('.rond[data-ic]').forEach(function (e) { e.innerHTML = svg(e.getAttribute('data-ic'), 28); });
    const actif = ongletActif();
    if (actif !== 'jonction') document.body.classList.add('avecBarre');
    if (actif !== 'jonction') document.body.classList.add('avecEntete');
    const s = session();

    {
      const h = document.createElement('div');
      h.className = 'enteteApp';
      h.innerHTML =
        '<div class="enteteLogo"><img src="icon-192.png" alt=""></div>' +
        '<div class="enteteTitres"><b>Novafit</b><span id="enteteSous"></span></div>' +
        '<button type="button" class="enteteBtn" id="btnRecharger" aria-label="Actualiser">' + svg('refresh', 22) + '</button>' +
        '<button type="button" class="enteteBtn" id="btnTheme" aria-label="Changer de thème"></button>';
      document.body.insertBefore(h, document.body.firstChild);
      h.querySelector('#enteteSous').textContent = TITRES_PAGES[fichierCourant()] || SOUS_TITRES[actif] || '';
      ['.enteteLogo', '.enteteTitres'].forEach(function (q) { const e = h.querySelector(q); e.style.cursor = 'pointer'; e.setAttribute('role', 'link'); e.setAttribute('aria-label', 'Retour à l\'accueil'); e.onclick = function () { location.href = './'; }; });
      h.querySelector('#btnRecharger').onclick = function () { location.reload(); };
      const bt = h.querySelector('#btnTheme');
      const maj = function () { bt.innerHTML = svg(themeEffectif() === 'sombre' ? 'sun' : 'moon', 22); };
      bt.onclick = function () { NovaTheme.set(themeEffectif() === 'sombre' ? 'clair' : 'sombre'); maj(); };
      maj();
    }

    if (actif === 'jonction') { // Jonction garde son propre bandeau (mêmes icônes, bouton Accueil au centre)
      document.querySelectorAll('[data-ic]').forEach(function (e) { e.innerHTML = svg(e.getAttribute('data-ic'), 22); });
      return;
    }
    const nav = document.createElement('nav');
    nav.className = 'barreOnglets';
    const liste = menuGest() ? ONGLETS_GEST.filter(function (o) { return !o.droit || autorise(o); }) : ONGLETS;
    liste.forEach(function (o) {
      const ok = autorise(o);
      const a = document.createElement('a');
      a.href = ok ? o.href : './';
      a.className = (o.id === actif ? 'on ' : '') + (ok ? '' : 'ferme');
      a.innerHTML = svg(ok ? o.ic : 'lock', 22) + '<span>' + o.lib + '</span>';
      if (!ok) {
        a.title = s ? 'Niveau insuffisant' : 'Connecte-toi depuis l\'accueil';
        if (s) a.onclick = function (e) { e.preventDefault(); };
      }
      nav.appendChild(a);
    });
    document.body.appendChild(nav);
  }


  // ---------- Contrôle de migration : prévient (niveau 1) ou bloque (niveau 2) les gens restés sur l'ancienne adresse ----------
  // Le niveau se règle dans Maintenance (0 rien, 1 avertissement, 2 blocage). Sur la nouvelle adresse, rien ne s'affiche jamais.
  function envoisEnAttente() {
    let n = 0;
    try { n += (window.Nova && Nova.lireFile ? Nova.lireFile().length : 0); } catch (e) {}
    try { n += (JSON.parse(localStorage.getItem('bonsEnAttente')) || []).length; } catch (e) {}
    return n;
  }
  function migrationAppliquer(m) {
    document.querySelectorAll('.migBandeau, .migBloc').forEach(function (e) { e.remove(); });
    if (!m || !m.niveau || !m.adresse) return;
    let hote = '';
    try { hote = new URL(m.adresse).hostname; } catch (e) { return; }
    if (location.hostname === hote) return;   // déjà sur la nouvelle adresse
    const f = fichierCourant(), accueil = (f === '' || f === 'index.html');
    const att = envoisEnAttente();
    const attTxt = att ? 'Tu as ' + att + ' envoi' + (att > 1 ? 's' : '') + ' en attente sur cet appareil : ouvre l\'accueil ici pour les envoyer AVANT de changer (ils ne suivent pas sur la nouvelle adresse).' : '';
    const lien = '<a class="plein" href="' + m.adresse.replace(/"/g, '') + '">Ouvrir la nouvelle version</a>';
    const aide = 'Sur téléphone : ouvre la nouvelle adresse dans Chrome, menu ⋮ puis « Ajouter à l\'écran d\'accueil », et supprime l\'ancienne icône. Tu devras te reconnecter avec ton code.';
    if (m.niveau === 1 || (m.niveau === 2 && att && accueil)) {
      if (m.niveau === 1) { try { if (sessionStorage.getItem('migrationMasquee')) return; } catch (e) {} }
      const b = document.createElement('div');
      b.className = 'migBandeau' + (m.niveau === 2 ? ' rouge' : '');
      b.innerHTML = '<b>' + (m.niveau === 2 ? 'Cette version va être coupée' : 'Cette version est ancienne') + '</b>Novafit a changé d\'adresse. ' + (attTxt ? attTxt + ' ' : '') + aide +
        '<div class="migBoutons">' + lien + (m.niveau === 1 ? '<button type="button" id="migPlusTard">Plus tard</button>' : '') + '</div>';
      document.body.appendChild(b);
      const pt = b.querySelector('#migPlusTard');
      if (pt) pt.onclick = function () { try { sessionStorage.setItem('migrationMasquee', '1'); } catch (e) {} b.remove(); };
    } else if (m.niveau === 2) {
      const o = document.createElement('div');
      o.className = 'migBloc';
      o.innerHTML = '<div class="migCarte"><h2>Cette version n\'est plus utilisable</h2>Novafit a changé d\'adresse. Pour continuer, utilise la nouvelle version.' +
        (attTxt ? '<p><b>' + attTxt + '</b></p>' : '') + '<p>' + aide + '</p>' +
        '<div class="migBoutons">' + lien + (att ? '<a href="./">Envoyer mes envois en attente</a>' : '') + '</div>' +
        '<small>Si tu penses que c\'est une erreur, préviens l\'administrateur.</small></div>';
      document.body.appendChild(o);
    }
  }
  function migrationControle() {
    if (!window.CONFIG || !CONFIG.URL_API) return;
    let cache = null;
    try { cache = JSON.parse(localStorage.getItem('migrationEtat')); } catch (e) {}
    if (cache) migrationAppliquer(cache);   // dernier niveau connu (marche aussi hors ligne)
    if (!navigator.onLine) return;
    const ctl = window.AbortController ? new AbortController() : null;
    if (ctl) setTimeout(function () { ctl.abort(); }, 8000);
    fetch(CONFIG.URL_API, { method: 'POST', body: JSON.stringify({ action: 'migrationEtat' }), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) return;
        const m = { niveau: j.niveau, adresse: j.adresse };
        try { localStorage.setItem('migrationEtat', JSON.stringify(m)); } catch (e) {}
        migrationAppliquer(m);
      }).catch(function () {});
  }
  function demarrer() { construire(); migrationControle(); }

  window.Shell = { svg: svg };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();
})();
