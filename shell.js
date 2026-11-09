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
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
  };
  function svg(nom, taille) {
    return '<svg width="' + (taille || 24) + '" height="' + (taille || 24) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[nom] + '</svg>';
  }
  function session() {
    try {
      const s = JSON.parse(localStorage.getItem('sessionAccueil'));
      if (s && RANG[s.niveau] && s.jeton && s.expire > Date.now()) return s;
    } catch (e) {}
    return null;
  }
  const ONGLETS = [
    { id: 'jonction', lib: 'Jonction', href: 'jonction.html', ic: 'sliders', min: 'technicien', fichiers: ['jonction.html'] },
    { id: 'bon', lib: 'Vierge', href: 'intervention.html', ic: 'plus', min: 'technicien', fichiers: ['intervention.html'] },
    { id: 'accueil', lib: 'Accueil', href: './', ic: 'home', min: null, fichiers: ['', 'index.html'] },
    { id: 'commandes', lib: 'Commande', href: 'commandes.html', ic: 'list', min: 'technicien', fichiers: ['commandes.html'] },
    { id: 'finies', lib: 'Finies', href: 'termines.html', ic: 'check', min: 'gestionnaire', fichiers: ['termines.html'] }
  ];
  const SOUS_TITRES = { accueil: 'Les interventions Novafit', jonction: 'Paramètres de jonction', bon: 'Bon d\'intervention vierge',
    commandes: 'Bon d\'intervention de commande', finies: 'Interventions finies' };

  function fichierCourant() { return decodeURIComponent(location.pathname.split('/').pop()); }
  function ongletActif() {
    const f = fichierCourant();
    let id = (ONGLETS.find(o => o.fichiers.indexOf(f) >= 0) || ONGLETS.find(function (o) { return o.id === 'accueil'; })).id;
    // Un bon ouvert depuis une commande reste dans l'onglet Commandes
    if (id === 'bon' && new URLSearchParams(location.search).get('doc')) id = 'commandes';
    return id;
  }
  function themeEffectif() {
    const t = window.NovaTheme ? NovaTheme.get() : 'auto';
    if (t === 'clair' || t === 'sombre') return t;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'sombre' : 'clair';
  }

  function construire() {
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
      h.querySelector('#enteteSous').textContent = SOUS_TITRES[actif] || '';
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
    ONGLETS.forEach(function (o) {
      const ok = !o.min || (s && RANG[s.niveau] >= RANG[o.min]);
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

  window.Shell = { svg: svg };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', construire); else construire();
})();
