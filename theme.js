// Theme partagé (clair / sombre / auto) - préférence enregistrée dans CE navigateur uniquement
(function () {
  var CLE = 'novaTheme';
  function lire() { try { var t = localStorage.getItem(CLE); return (t === 'clair' || t === 'sombre') ? t : 'auto'; } catch (e) { return 'auto'; } }
  function appliquer(t) {
    var r = document.documentElement;
    if (t === 'clair' || t === 'sombre') r.setAttribute('data-theme', t); else r.removeAttribute('data-theme');
  }
  appliquer(lire());
  window.NovaTheme = {
    get: lire,
    set: function (t) {
      try { if (t === 'clair' || t === 'sombre') localStorage.setItem(CLE, t); else localStorage.removeItem(CLE); } catch (e) {}
      appliquer(t);
    }
  };
})();
