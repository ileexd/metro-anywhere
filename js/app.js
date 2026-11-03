// Metro Anywhere app. Static: basemap and naming read public map tiles, nothing else runs on a server.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var TILEJSON = 'https://tiles.openfreemap.org/planet';
  var STYLE = { light: 'https://tiles.openfreemap.org/styles/positron', dark: 'https://tiles.openfreemap.org/styles/dark' };
  var catalog = window.MA_CATALOG;
  var systems = {}, pending = {};
  window.MA = { sys: function (s) { systems[s.id] = s; if (pending[s.id]) pending[s.id](s); } };

  var S = { id: 'tokyo', target: [121.5305, 25.0375], rot: 0, opacity: 100, lang: 'local', style: 'auto', off: {}, netOff: {}, netOn: {}, renames: {}, zoom: null, theme: null };
  var map, sys, plane = null, tileCache = new Map(), tileBase = null, runId = 0, names = {}, selected = null, handles = {}, styleReady = false, cc = null, ccFor = null;

  function toast(m) { var t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 3500); }

  /* ---------- share link ---------- */
  function encodeState() {
    var o = { s: S.id, t: S.target.map(function (v) { return +v.toFixed(4); }), r: S.rot, l: S.lang === 'en' ? 1 : 0, o: S.opacity };
    if (S.style !== 'auto') o.y = S.style;
    if (map) o.z = +map.getZoom().toFixed(2);
    if (Object.keys(S.off).length) o.x = Object.keys(S.off);
    if (Object.keys(S.netOff).length) o.nf = Object.keys(S.netOff);
    if (Object.keys(S.netOn).length) o.nn = Object.keys(S.netOn);
    if (Object.keys(S.renames).length) o.n = S.renames;
    return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodeState(h) {
    try {
      var o = JSON.parse(decodeURIComponent(escape(atob(h.replace(/-/g, '+').replace(/_/g, '/')))));
      if (o.s && catalog.systems.some(function (c) { return c.id === o.s; })) S.id = o.s;
      if (o.t) S.target = o.t;
      if (typeof o.r === 'number') S.rot = o.r;
      S.lang = o.l ? 'en' : 'local';
      if (o.o) S.opacity = o.o;
      if (o.y) S.style = o.y;
      if (o.z) S.zoom = o.z;
      (o.x || []).forEach(function (k) { S.off[k] = 1; });
      (o.nf || []).forEach(function (k) { S.netOff[k] = 1; });
      (o.nn || []).forEach(function (k) { S.netOn[k] = 1; });
      S.renames = o.n || {};
      return true;
    } catch (e) { return false; }
  }
  function writeHash() { try { history.replaceState(null, '', '#' + encodeState()); } catch (e) { /* file:// on some browsers */ } }

  /* ---------- system loading ---------- */
  function loadSystem(id) {
    if (systems[id]) return Promise.resolve(systems[id]);
    return new Promise(function (ok, no) {
      pending[id] = ok;
      var el = document.createElement('script');
      el.src = 'data/' + id + '.js';
      el.onerror = function () { no(new Error('Could not load data for ' + id)); };
      document.head.appendChild(el);
    });
  }
  function netOn(n) { var k = String(n.id); if (S.netOff[k]) return false; if (S.netOn[k]) return true; return !!n.core; }
  function visibleLines() {
    var out = [];
    sys.networks.forEach(function (n) { if (netOn(n)) n.lines.forEach(function (l) { if (!S.off[l.id]) out.push(l); }); });
    return out;
  }
  function visibleStations() {
    var on = {}; visibleLines().forEach(function (l) { on[l.id] = 1; });
    var out = [];
    sys.stations.forEach(function (s, i) { if (s.l.some(function (x) { return on[x]; })) out.push({ i: i, s: s }); });
    return out;
  }
  function lineById(id) { var a = id.split('.'); return sys.networks[+a[0]].lines[+a[1]]; }

  /* ---------- geometry ---------- */
  // Source geometry goes into metres once. Moving or rotating only reruns the inverse projection.
  function prepare() {
    var c = sys.center; plane = { lines: {}, coarse: {}, st: [] };
    sys.networks.forEach(function (n) {
      n.lines.forEach(function (l) {
        plane.lines[l.id] = l.paths.map(function (f) {
          var a = new Float64Array(f.length);
          for (var i = 0; i < f.length; i += 2) { var q = Geo.forward(c, [f[i], f[i + 1]]); a[i] = q[0]; a[i + 1] = q[1]; }
          return a;
        });
        plane.coarse[l.id] = plane.lines[l.id].map(function (a) { return decimate(a, 120); });
      });
    });
    sys.stations.forEach(function (s, i) { plane.st[i] = Geo.forward(c, s.p); });
    var r = 0; visibleStations().forEach(function (v) { var q = plane.st[v.i]; r = Math.max(r, Math.hypot(q[0], q[1])); });
    plane.radius = r || 5000;
  }
  function decimate(a, m) {
    var out = [a[0], a[1]], lx = a[0], ly = a[1];
    for (var i = 2; i < a.length - 2; i += 2) { if (Math.abs(a[i] - lx) + Math.abs(a[i + 1] - ly) > m) { out.push(a[i], a[i + 1]); lx = a[i]; ly = a[i + 1]; } }
    out.push(a[a.length - 2], a[a.length - 1]);
    return out;
  }
  function placePt(xy) { return Geo.inverse(S.target, Geo.rotate(xy, S.rot)); }
  function lineFeatures(coarse) {
    var fs = [], src = coarse ? plane.coarse : plane.lines;
    visibleLines().forEach(function (l) {
      src[l.id].forEach(function (a) {
        var co = [];
        for (var i = 0; i < a.length; i += 2) co.push(placePt([a[i], a[i + 1]]));
        // Keep lines continuous across the antimeridian.
        for (var j = 1; j < co.length; j++) { while (co[j][0] - co[j - 1][0] > 180) co[j][0] -= 360; while (co[j][0] - co[j - 1][0] < -180) co[j][0] += 360; }
        fs.push({ type: 'Feature', properties: { id: l.id, color: l.color }, geometry: { type: 'LineString', coordinates: co } });
      });
    });
    return { type: 'FeatureCollection', features: fs };
  }
  function stKey(i) { return S.id + ':' + i; }
  function shown(i) {
    var r = names[i] || {}, s = sys.stations[i], rn = S.renames[i] || {};
    return { local: rn.l || r.local || '', en: rn.e || r.en || '', r: r, s: s };
  }
  function stationFeatures(withNames) {
    var fs = [];
    visibleStations().forEach(function (v) {
      var d = shown(v.i), on = v.s.l.filter(function (x) { return !S.off[x]; });
      var first = lineById(on[0] || v.s.l[0]);
      fs.push({ type: 'Feature', properties: { i: v.i, c: first.color, x: on.length > 1 ? 1 : 0, f: d.r.flag ? 1 : 0, nl: withNames ? d.local : '', ne: withNames ? (d.en || d.local) : '' }, geometry: { type: 'Point', coordinates: placePt(plane.st[v.i]) } });
    });
    return { type: 'FeatureCollection', features: fs };
  }

  /* ---------- rendering ---------- */
  function addLayers() {
    if (map.getSource('ma-lines')) return;
    map.addSource('ma-lines', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, tolerance: .2 });
    map.addSource('ma-stations', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'ma-case', type: 'line', source: 'ma-lines', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2.5, 14, 8] } });
    map.addLayer({ id: 'ma-line', type: 'line', source: 'ma-lines', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 14, 5] } });
    map.addLayer({ id: 'ma-hit', type: 'line', source: 'ma-lines', paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': 16 } });
    map.addLayer({ id: 'ma-st', type: 'circle', source: 'ma-stations', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, ['case', ['==', ['get', 'x'], 1], 3, 1.8], 13, ['case', ['==', ['get', 'x'], 1], 8, 5]], 'circle-color': ['case', ['==', ['get', 'f'], 1], '#ffc800', '#ffffff'], 'circle-stroke-color': ['case', ['==', ['get', 'x'], 1], '#10182b', ['get', 'c']], 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 13, 2.5] } });
    map.addLayer({ id: 'ma-label', type: 'symbol', source: 'ma-stations', layout: {
      'text-field': ['get', S.lang === 'en' ? 'ne' : 'nl'], 'text-font': ['Noto Sans Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 9, 10, 14, 14],
      'text-anchor': 'left', 'text-offset': [.8, 0], 'text-variable-anchor': ['left', 'right', 'top', 'bottom'], 'text-radial-offset': .75, 'text-justify': 'auto', 'text-max-width': 9,
      'symbol-sort-key': ['-', 1, ['get', 'x']], 'text-padding': 3 },
      paint: { 'text-color': '#10182b', 'text-halo-color': '#ffffff', 'text-halo-width': 1.6 } });
    ['ma-st', 'ma-hit'].forEach(function (id) {
      map.on('click', id, function (e) { if (dragging.moved) return; if (id === 'ma-st' && e.features[0]) { openCard(e.features[0].properties.i); e.originalEvent.stopPropagation(); } });
      map.on('mouseenter', id, function () { map.getCanvas().style.cursor = id === 'ma-st' ? 'pointer' : 'move'; });
      map.on('mouseleave', id, function () { map.getCanvas().style.cursor = ''; });
    });
    applyOpacity(); setBasemapLang();
  }
  function setBasemapLang() {
    var st = map.getStyle(); if (!st) return;
    var expr = S.lang === 'en' ? ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name']] : ['get', 'name'];
    st.layers.forEach(function (l) { if (l.type === 'symbol' && l.layout && l.layout['text-field'] && l.id.indexOf('ma-') !== 0) { try { map.setLayoutProperty(l.id, 'text-field', expr); } catch (e) { /* layer without text */ } } });
  }
  function applyOpacity() {
    var o = S.opacity / 100;
    if (!map.getLayer('ma-line')) return;
    map.setPaintProperty('ma-line', 'line-opacity', o);
    map.setPaintProperty('ma-case', 'line-opacity', o * .9);
    map.setPaintProperty('ma-st', 'circle-opacity', o);
    map.setPaintProperty('ma-st', 'circle-stroke-opacity', o);
    map.setPaintProperty('ma-label', 'text-opacity', Math.max(.4, o));
  }
  function draw(coarse, withNames) {
    if (!styleReady) return;
    map.getSource('ma-lines').setData(lineFeatures(coarse));
    map.getSource('ma-stations').setData(stationFeatures(withNames));
    placeHandles();
  }
  function placeHandles() {
    if (!handles.center) return;
    handles.center.setLngLat(S.target);
    handles.rot.setLngLat(placePt([0, plane.radius * .6]));
  }

  /* ---------- naming ---------- */
  function fetchTile(key) {
    return tileBaseUrl().then(function (b) {
      var attempt = function (n) {
        return fetch(b.replace('{z}/{x}/{y}', key)).then(function (r) {
          if (r.status === 404 || r.status === 204) return null;
          if (!r.ok) throw new Error('tile ' + r.status);
          return r.arrayBuffer().then(function (a) { return new Uint8Array(a); });
        }).catch(function (e) { if (n > 0) return new Promise(function (ok) { setTimeout(ok, 500 * (3 - n)); }).then(function () { return attempt(n - 1); }); throw e; });
      };
      return attempt(2);
    });
  }
  function tileBaseUrl() {
    if (tileBase) return tileBase;
    tileBase = fetch(TILEJSON).then(function (r) { return r.json(); }).then(function (j) { return j.tiles[0]; });
    return tileBase;
  }
  // Inside a listed metro area means within 5 km of that system's existing default network.
  var HOST_M = 5000;
  function hostFor(p) {
    if (S.style !== 'auto') return S.style === 'general' ? null : S.style;
    var idx = catalog.metroIndex, best = null, bd = HOST_M;
    for (var id in idx) {
      var b = idx[id];
      if (p[0] < b.b[0] || p[0] > b.b[2] || p[1] < b.b[1] || p[1] > b.b[3]) continue;
      var a = b.p;
      for (var i = 0; i < a.length; i += 2) { var d = Geo.dist(p, [a[i], a[i + 1]]); if (d < bd) { bd = d; best = id; } }
    }
    return best;
  }
  function countryLang() {
    var key = S.target.map(function (v) { return v.toFixed(1); }).join(',');
    if (ccFor === key) return Promise.resolve(cc);
    // The nearest country label in a coarse map tile is enough to pick direction words and pinyin.
    var t = Geo.tileOf(S.target[0], S.target[1], 3);
    return fetchTile('3/' + t[0] + '/' + t[1]).then(function (bytes) {
      ccFor = key; cc = null; if (!bytes) return null;
      var d = MVT.decode(bytes, ['place']).place, best = Infinity;
      if (d) d.features.forEach(function (f) {
        if (f.props.class !== 'country' || !f.props.iso_a2 || !f.geom) return;
        var q = MVT.toLngLat(f.geom[0][0][0], f.geom[0][0][1], 3, t[0], t[1], d.extent), m = Geo.dist(q, S.target);
        if (m < best) { best = m; cc = f.props.iso_a2.toLowerCase(); }
      });
      return best < 2500000 ? cc : (cc = null);
    }).catch(function () { return null; });
  }
  function nameNow() {
    var id = ++runId, list = visibleStations();
    var st = list.map(function (v) { var p = placePt(plane.st[v.i]); return { id: v.i, p: p, host: hostFor(p) }; });
    var bar = $('prog-bar'), prog = $('prog');
    prog.hidden = false; bar.style.width = '4%';
    $('status-text').textContent = 'Naming ' + st.length + ' stations…';
    $('tiers').innerHTML = '';
    countryLang().then(function (code) {
      if (id !== runId) return null;
      var lang = Naming.CC_LANG[code] || 'en';
      // Pinyin is only reliable for Chinese place names, so Japanese kanji stays untranslated without a source.
      var zh = lang === 'zh';
      if (zh !== Translit._zh) { Translit._zh = zh; Translit.useChinese(zh); tileCache.clear(); }
      return Naming.run({
        stations: st, lang: lang, cache: tileCache, fetchTile: fetchTile, general: Profiles.general,
        getProfile: function (h) { return Profiles.byId[h] || null; }, getBudget: function (h) { return catalog.budget && catalog.budget[h]; }, isCancelled: function () { return id !== runId; },
        onProgress: function (p) { if (id !== runId) return; bar.style.width = Math.round(4 + 96 * p.done / p.total) + '%'; $('status-text').textContent = p.label + ': ' + p.done + ' of ' + p.total + ' map tiles'; },
        onPartial: function (res) { if (id !== runId) return; store(res); draw(false, true); summary(res, true); }
      });
    }).then(function (o) {
      if (!o || id !== runId) return;
      store(o.results); draw(false, true); summary(o.results, false); prog.hidden = true;
      if (selected !== null) openCard(selected);
      if (o.failedTiles) toast(o.failedTiles + ' map tiles failed to load. Some names may be less specific.');
      writeHash();
    }).catch(function (e) {
      if (id !== runId) return;
      prog.hidden = true; $('status-text').textContent = 'Naming stopped: ' + e.message + '. Check your connection and move the system to try again.';
    });
  }
  function store(res) { names = {}; res.forEach(function (r) { if (r) names[r.id] = r; }); window.MA_NAMES = names; }
  function summary(res, part) {
    var c = { 1: 0, 2: 0, 3: 0 }, fl = 0, un = 0;
    res.forEach(function (r) { if (!r) return; c[r.tier]++; if (r.flag) fl++; if (!r.en) un++; });
    $('status-text').textContent = res.length + ' stations named' + (part ? ', refining…' : '');
    var h = '<span title="Matched a real station within 400 m">Existing ' + c[1] + '</span><span title="Generated in the local system\'s style">Local style ' + c[2] + '</span><span title="Generated with the general scheme">General ' + c[3] + '</span>';
    if (fl) h += '<span class="flag" title="In water or empty land">Flagged ' + fl + '</span>';
    if (un) h += '<span title="No reliable English source. The local name is shown">No English ' + un + '</span>';
    $('tiers').innerHTML = h;
    window.MA_STATS = { c: c, flagged: fl, noEnglish: un, final: !part };
  }

  /* ---------- station card ---------- */
  var KIND = { station: 'Existing station', neighbourhood: 'Neighbourhood', landmark: 'Landmark', road: 'Road', intersection: 'Intersection', direction: 'Direction from a place', nearest: 'Nearest named feature', none: 'Nothing nearby' };
  var TIER = { 1: 'Existing station match', 2: 'Local system style', 3: 'General scheme' };
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
  function openCard(i) {
    selected = i; var d = shown(i), r = d.r, main = S.lang === 'en' ? (d.en || d.local) : d.local, alt = S.lang === 'en' ? d.local : (d.en || '');
    $('card').hidden = false;
    $('card-title').textContent = main || 'Naming…';
    $('card-alt').textContent = alt && alt !== main ? alt : (S.lang === 'en' && !d.en ? 'No English source' : '');
    $('card-lines').innerHTML = d.s.l.filter(function (x) { return !S.off[x]; }).map(function (x) { var l = lineById(x); return '<b style="background:' + esc(l.color) + '" title="' + esc(l.name) + '">' + esc(l.ref || l.en || l.name) + '</b>'; }).join('');
    var how = r.tier ? (r.kind === 'station' ? 'Matched ' + r.src + ' at ' + r.d + ' m' : KIND[r.kind] + ': ' + r.src + (r.d ? ' at ' + r.d + ' m' : '')) : '';
    var real = d.s.n ? d.s.n + (d.s.e && d.s.e !== d.s.n ? ' (' + d.s.e + ')' : '') : 'No name in source';
    $('card-why').innerHTML = (r.tier ? '<dt>Rule</dt><dd>' + esc(TIER[r.tier]) + '</dd><dt>Source</dt><dd>' + esc(how) + '</dd>' : '') +
      (r.enHow === 'transliterated' ? '<dt>English</dt><dd>Transliterated</dd>' : '') +
      (r.flag ? '<dt>Flag</dt><dd class="flagged">' + (r.flag === 'water' ? 'Station is in water' : 'Empty land, nothing close by') + '</dd>' : '') +
      (S.renames[i] ? '<dt>Edited</dt><dd>You renamed this station</dd>' : '') +
      '<dt>Real name</dt><dd>' + esc(real) + ' in ' + esc(sys.name) + '</dd>';
    $('rn-local').value = d.local; $('rn-en').value = d.en;
  }

  /* ---------- UI ---------- */
  function renderLayers() {
    var box = $('layers'); box.innerHTML = '';
    sys.networks.forEach(function (n) {
      var d = document.createElement('details'); d.className = 'net';
      var sm = document.createElement('summary'), cb = document.createElement('input');
      cb.type = 'checkbox'; cb.id = 'net-' + n.id; cb.checked = netOn(n); cb.setAttribute('aria-label', n.name);
      cb.addEventListener('click', function (e) { e.stopPropagation(); });
      cb.addEventListener('change', function () {
        var k = String(n.id); delete S.netOff[k]; delete S.netOn[k];
        if (cb.checked && !n.core) S.netOn[k] = 1;
        if (!cb.checked && n.core) S.netOff[k] = 1;
        relayer();
      });
      var nm = document.createElement('span'); nm.textContent = n.name;
      var ct = document.createElement('span'); ct.className = 'count'; ct.textContent = n.lines.length + (n.lines.length === 1 ? ' line' : ' lines');
      sm.appendChild(cb); sm.appendChild(nm); sm.appendChild(ct); d.appendChild(sm);
      var wrap = document.createElement('div'); wrap.className = 'lines';
      n.lines.forEach(function (l) {
        var lb = document.createElement('label'), c2 = document.createElement('input'), dot = document.createElement('span'), t = document.createElement('span');
        c2.type = 'checkbox'; c2.id = 'line-' + l.id.replace('.', '-'); c2.checked = !S.off[l.id];
        c2.addEventListener('change', function () { if (c2.checked) delete S.off[l.id]; else S.off[l.id] = 1; relayer(); });
        dot.className = 'dot'; dot.style.background = l.color; t.textContent = l.en || l.name;
        lb.appendChild(c2); lb.appendChild(dot); lb.appendChild(t); wrap.appendChild(lb);
      });
      d.appendChild(wrap); box.appendChild(d);
    });
  }
  var relayerT;
  function relayer() { prepareRadius(); draw(false, true); clearTimeout(relayerT); relayerT = setTimeout(function () { nameNow(); writeHash(); }, 300); }
  function prepareRadius() { var r = 0; visibleStations().forEach(function (v) { var q = plane.st[v.i]; r = Math.max(r, Math.hypot(q[0], q[1])); }); plane.radius = r || 5000; }
  function qaOf(id) { return (qaLive[id] || (catalog.qa && catalog.qa[id])) || null; }
  var qaLive = {};
  function setSubtitle() {
    var c = catalog.systems.filter(function (x) { return x.id === S.id; })[0], q = qaOf(S.id), st = visibleStations().length;
    var bits = esc(c.local !== c.name ? c.local + ', ' + c.country : c.country) + '. ' + st + ' stations.';
    if (q && q.status === 'fail') bits += ' <span class="warn-chip">Data check failed: ' + esc(q.issues[0] || '') + '</span>';
    else if (q && q.status === 'warn') bits += ' <span class="warn-chip">Data warning: ' + esc(q.issues[0] || '') + '</span>';
    $('sys-sub').innerHTML = bits;
  }
  function selectSystem(id, opts) {
    opts = opts || {};
    var c = catalog.systems.filter(function (x) { return x.id === id; })[0];
    $('sys-search').value = c.name;
    return loadSystem(id).then(function (s) {
      if (!opts.keep) { S.off = {}; S.netOff = {}; S.netOn = {}; S.renames = {}; }
      S.id = id; sys = s; names = {}; selected = null; $('card').hidden = true;
      prepare(); renderLayers(); setSubtitle();
      if (!opts.keep) fit();
      draw(false, false); placeHandles(); nameNow(); writeHash();
    }).catch(function (e) { toast(e.message + '. Try another system.'); });
  }
  function fit() {
    var r = plane.radius * 1.15, n = Geo.inverse(S.target, [0, r]), s = Geo.inverse(S.target, [0, -r]), e = Geo.inverse(S.target, [r, 0]), w = Geo.inverse(S.target, [-r, 0]);
    var mobile = window.innerWidth < 720;
    map.fitBounds([[w[0], s[1]], [e[0], n[1]]], { padding: mobile ? { top: 20, bottom: window.innerHeight * .5, left: 20, right: 20 } : { top: 30, bottom: 30, left: 370, right: 30 }, duration: 500, maxZoom: 14 });
  }
  function combo(input, listEl, source, onPick) {
    var items = [], cur = -1;
    function close() { listEl.hidden = true; input.setAttribute('aria-expanded', 'false'); cur = -1; }
    function render(arr) {
      items = arr; listEl.innerHTML = ''; cur = -1;
      arr.forEach(function (it) {
        var li = document.createElement('li');
        if (it.group) { li.className = 'grp'; li.textContent = it.group; listEl.appendChild(li); return; }
        li.setAttribute('role', 'option');
        li.innerHTML = '<span>' + esc(it.label) + '</span>' + (it.note ? '<small>' + esc(it.note) + '</small>' : '');
        li.addEventListener('mousedown', function (e) { e.preventDefault(); onPick(it); close(); });
        listEl.appendChild(li);
      });
      listEl.hidden = !arr.length; input.setAttribute('aria-expanded', String(!!arr.length));
    }
    input.addEventListener('input', function () { source(input.value, render); });
    input.addEventListener('focus', function () { input.select(); source(input.dataset.all ? '' : input.value, render); });
    input.addEventListener('blur', function () { setTimeout(close, 100); });
    input.addEventListener('keydown', function (e) {
      var opts = items.filter(function (x) { return !x.group; }), lis = listEl.querySelectorAll('[role=option]');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); if (!opts.length) return;
        cur = (cur + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length;
        lis.forEach(function (l, i) { l.setAttribute('aria-selected', i === cur ? 'true' : 'false'); if (i === cur) l.scrollIntoView({ block: 'nearest' }); });
      } else if (e.key === 'Enter') { e.preventDefault(); var it = opts[cur < 0 ? 0 : cur]; if (it) { onPick(it); close(); input.blur(); } }
      else if (e.key === 'Escape') close();
    });
  }
  function systemSource(q, cb) {
    q = (q || '').toLowerCase().trim();
    var out = [], last = null;
    catalog.systems.slice().sort(function (a, b) { return a.region < b.region ? -1 : a.region > b.region ? 1 : a.name < b.name ? -1 : 1; }).forEach(function (c) {
      if (q && (c.name + ' ' + c.local + ' ' + c.country).toLowerCase().indexOf(q) < 0) return;
      if (!q && c.region !== last) { out.push({ group: c.region }); last = c.region; }
      out.push({ label: c.name, note: c.country, id: c.id });
    });
    cb(out);
  }
  var placeT;
  function placeSource(q, cb) {
    clearTimeout(placeT);
    if (!q || q.length < 2) return cb([]);
    placeT = setTimeout(function () {
      fetch('https://photon.komoot.io/api/?limit=6&q=' + encodeURIComponent(q)).then(function (r) { return r.json(); }).then(function (j) {
        cb((j.features || []).map(function (f) { var p = f.properties; return { label: p.name || p.city || q, note: [p.city, p.state, p.country].filter(function (x, i, a) { return x && x !== p.name && a.indexOf(x) === i; }).slice(0, 2).join(', '), p: f.geometry.coordinates }; }));
      }).catch(function () { toast('Place search is not reachable right now. Drag the system on the map instead.'); });
    }, 300);
  }
  function moveTo(p) { S.target = p; fit(); draw(false, false); nameNow(); writeHash(); }
  function setRot(v, live) {
    S.rot = ((Math.round(v) % 360) + 360) % 360; $('rot').value = S.rot; $('rot-n').value = S.rot;
    if (live) draw(true, false); else { draw(false, false); nameNow(); writeHash(); }
  }
  function setLang(l) {
    S.lang = l; $('lang-local').setAttribute('aria-pressed', l === 'local'); $('lang-en').setAttribute('aria-pressed', l === 'en');
    if (styleReady) { map.setLayoutProperty('ma-label', 'text-field', ['get', l === 'en' ? 'ne' : 'nl']); setBasemapLang(); }
    if (selected !== null) openCard(selected);
    writeHash();
  }

  /* ---------- drag and rotate ---------- */
  var dragging = { on: false, moved: false };
  var rafDraw = false;
  function liveDraw() { if (rafDraw) return; rafDraw = true; requestAnimationFrame(function () { rafDraw = false; draw(true, false); }); }
  function setupHandles() {
    var c = document.createElement('div'); c.className = 'handle'; c.title = 'Drag to move the system'; c.setAttribute('aria-label', 'Move handle');
    var r = document.createElement('div'); r.className = 'handle rot'; r.textContent = '↻'; r.title = 'Drag to rotate the system'; r.setAttribute('aria-label', 'Rotate handle');
    handles.center = new maplibregl.Marker({ element: c, draggable: true }).setLngLat(S.target).addTo(map);
    handles.rot = new maplibregl.Marker({ element: r, draggable: true }).setLngLat(S.target).addTo(map);
    handles.center.on('drag', function () { var q = handles.center.getLngLat(); S.target = [q.lng, q.lat]; liveDraw(); });
    handles.center.on('dragend', function () { var q = handles.center.getLngLat(); S.target = [q.lng, q.lat]; draw(false, false); nameNow(); writeHash(); });
    handles.rot.on('drag', function () { var q = handles.rot.getLngLat(); setRot(Geo.bearing(S.target, [q.lng, q.lat]), true); });
    handles.rot.on('dragend', function () { setRot(S.rot, false); });
    // Grab the lines directly.
    function start(e) {
      if (e.originalEvent.touches && e.originalEvent.touches.length > 1) return;
      e.preventDefault(); dragging.on = true; dragging.moved = false;
      var st = map.project(S.target), off = [st.x - e.point.x, st.y - e.point.y];
      function mv(ev) {
        var q = map.unproject([ev.point.x + off[0], ev.point.y + off[1]]);
        S.target = [q.lng, q.lat]; dragging.moved = true; liveDraw();
      }
      function up() {
        map.off('mousemove', mv); map.off('touchmove', mv); map.off('mouseup', up); map.off('touchend', up);
        dragging.on = false;
        if (dragging.moved) { draw(false, false); nameNow(); writeHash(); }
        setTimeout(function () { dragging.moved = false; }, 0);
      }
      map.on('mousemove', mv); map.on('touchmove', mv); map.once('mouseup', up); map.once('touchend', up);
    }
    map.on('mousedown', 'ma-hit', start);
    map.on('touchstart', 'ma-hit', start);
  }

  /* ---------- export ---------- */
  function savePng() {
    map.once('render', function () {
      var g = map.getCanvas(), out = document.createElement('canvas'), ratio = g.width / g.clientWidth;
      out.width = g.width; out.height = g.height + Math.round(34 * ratio);
      var x = out.getContext('2d'); x.fillStyle = '#14306b'; x.fillRect(0, 0, out.width, out.height);
      x.drawImage(g, 0, 0);
      x.fillStyle = '#ffffff'; x.font = '700 ' + Math.round(14 * ratio) + 'px "Overpass", Arial, sans-serif'; x.textBaseline = 'middle';
      var y = g.height + 17 * ratio;
      x.fillText('Metro Anywhere: ' + sys.name + ' at true scale', 10 * ratio, y);
      x.font = Math.round(11 * ratio) + 'px "Overpass", Arial, sans-serif'; x.textAlign = 'right';
      x.fillText('© OpenStreetMap contributors, OpenFreeMap, OpenMapTiles', out.width - 10 * ratio, y);
      out.toBlob(function (b) {
        var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'metro-anywhere-' + S.id + '.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
        toast('Saved PNG');
      });
    });
    map.triggerRepaint();
  }
  function copyLink() {
    writeHash(); var u = location.href;
    var fb = function () { var t = $('sys-sub'); toast('Copy this link from the address bar.'); };
    if (navigator.clipboard) navigator.clipboard.writeText(u).then(function () { toast('Link copied'); }).catch(fb); else fb();
  }

  /* ---------- QA ---------- */
  function renderQA() {
    var body = document.querySelector('#qa-table tbody'), c = { pass: 0, warn: 0, fail: 0, none: 0 }; body.innerHTML = '';
    catalog.systems.forEach(function (s) {
      var q = qaOf(s.id), st = q ? q.status : 'none'; c[st]++;
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + esc(s.name) + '</td><td><span class="pill ' + st + '">' + ({ pass: 'Pass', warn: 'Warn', fail: 'Fail', none: 'Not run' })[st] + '</span></td><td class="n">' + (q ? q.stations + (q.expected ? ' / ' + q.expected : '') : '') + '</td><td class="n">' + (q ? q.lines + (q.expectedLines ? ' / ' + q.expectedLines : '') : '') + '</td><td>' + esc(q ? q.issues.join('. ') : '') + '</td>';
      tr.style.cursor = 'pointer'; tr.addEventListener('click', function () { $('qa').close(); selectSystem(s.id); });
      body.appendChild(tr);
    });
    $('qa-sum').textContent = c.pass + ' pass, ' + c.warn + ' warn, ' + c.fail + ' fail, ' + c.none + ' not run. ' + (qaRan ? 'Checked in this browser just now.' : 'Build checks from ' + catalog.built + '. Station counts compare against published figures.');
  }
  var qaRan = false;
  function runQA() {
    var list = catalog.systems.slice(), i = 0, btn = $('qa-run'); btn.disabled = true;
    (function next() {
      if (i >= list.length) { btn.disabled = false; btn.textContent = 'Run all'; qaRan = true; renderQA(); setSubtitle(); return; }
      var c = list[i++]; btn.textContent = 'Checking ' + i + ' of ' + list.length;
      loadSystem(c.id).then(function (s) { qaLive[c.id] = QA.check(s, c); }).catch(function () { qaLive[c.id] = { status: 'fail', stations: 0, lines: 0, issues: ['Data file did not load'] }; }).then(function () { renderQA(); setTimeout(next, 30); });
    })();
  }

  /* ---------- theme ---------- */
  function dark() { return S.theme ? S.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; }
  function applyTheme(init) {
    if (S.theme) document.documentElement.setAttribute('data-theme', S.theme);
    $('theme').textContent = dark() ? 'Light map' : 'Dark map';
    if (!init) { styleReady = false; map.setStyle(dark() ? STYLE.dark : STYLE.light); }
  }

  /* ---------- boot ---------- */
  function boot() {
    var hasHash = location.hash.length > 1 && decodeState(location.hash.slice(1));
    map = new maplibregl.Map({
      container: 'map', style: dark() ? STYLE.dark : STYLE.light, center: S.target, zoom: S.zoom || 10,
      attributionControl: { compact: true }, preserveDrawingBuffer: true, localIdeographFontFamily: '"Noto Sans CJK TC","PingFang TC","Microsoft JhengHei","Noto Sans CJK KR","Apple SD Gothic Neo",sans-serif', dragRotate: false, pitchWithRotate: false
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 140, unit: 'metric' }), 'bottom-right');
    if (maplibregl.setRTLTextPlugin) { try { maplibregl.setRTLTextPlugin('vendor/mapbox-gl-rtl-text.js', true); } catch (e) { /* labels stay unshaped */ } }
    window.MA_MAP = map;
    map.on('style.load', function () {
      styleReady = true; addLayers();
      if (sys) { draw(false, Object.keys(names).length > 0); setLang(S.lang); }
    });
    map.on('moveend', function () { if (sys) writeHash(); });

    combo($('sys-search'), $('sys-list'), systemSource, function (it) { selectSystem(it.id); });
    $('sys-search').dataset.all = '1';
    combo($('place-search'), $('place-list'), placeSource, function (it) { moveTo(it.p); $('place-search').value = it.label; });
    $('rot').addEventListener('input', function () { setRot(+this.value, true); });
    $('rot').addEventListener('change', function () { setRot(+this.value, false); });
    $('rot-n').addEventListener('change', function () { setRot(+this.value || 0, false); });
    $('opa').value = S.opacity;
    $('opa').addEventListener('input', function () { S.opacity = +this.value; applyOpacity(); });
    $('opa').addEventListener('change', writeHash);
    $('lang-local').addEventListener('click', function () { setLang('local'); });
    $('lang-en').addEventListener('click', function () { setLang('en'); });
    $('copy').addEventListener('click', copyLink);
    $('png').addEventListener('click', savePng);
    $('qa-open').addEventListener('click', function () { renderQA(); $('qa').showModal(); });
    $('qa-x').addEventListener('click', function () { $('qa').close(); });
    $('qa-run').addEventListener('click', runQA);
    $('theme').addEventListener('click', function () { S.theme = dark() ? 'light' : 'dark'; applyTheme(false); });
    $('card-x').addEventListener('click', function () { $('card').hidden = true; selected = null; });
    $('card-form').addEventListener('submit', function (e) {
      e.preventDefault(); var l = $('rn-local').value.trim(), n = $('rn-en').value.trim(), r = names[selected] || {};
      var o = {}; if (l && l !== r.local) o.l = l; if (n && n !== r.en) o.e = n;
      if (o.l || o.e) S.renames[selected] = o; else delete S.renames[selected];
      draw(false, true); openCard(selected); writeHash(); toast('Name saved');
    });
    $('rn-reset').addEventListener('click', function () { delete S.renames[selected]; draw(false, true); openCard(selected); writeHash(); });
    $('collapse').addEventListener('click', function () { var c = $('panel').classList.toggle('closed'); this.textContent = c ? 'Show' : 'Hide'; this.setAttribute('aria-expanded', String(!c)); });
    var sel = $('style-sel'), o0 = document.createElement('option'); o0.value = 'auto'; o0.textContent = 'Auto, from the location'; sel.appendChild(o0);
    var og = document.createElement('option'); og.value = 'general'; og.textContent = 'General scheme'; sel.appendChild(og);
    catalog.systems.slice().sort(function (a, b) { return a.name < b.name ? -1 : 1; }).forEach(function (c) { var o = document.createElement('option'); o.value = c.id; o.textContent = c.name + ' style'; sel.appendChild(o); });
    sel.value = S.style;
    function styleNote() {
      var p = S.style === 'auto' ? null : S.style === 'general' ? Profiles.general : Profiles.byId[S.style], ex = catalog.examples && catalog.examples[S.style];
      $('style-note').textContent = p ? p.note + (ex && ex.length ? '. Real examples: ' + ex.join(', ') : '') : 'Uses the local system within 5 km of its network, and the general scheme elsewhere.';
    }
    sel.addEventListener('change', function () { S.style = sel.value; styleNote(); nameNow(); writeHash(); });
    styleNote();
    applyTheme(true);
    setRot(S.rot, true);
    map.on('load', function () {
      loadSystem(S.id).then(function (s) {
        sys = s; prepare(); setupHandles(); setLang(S.lang);
        $('sys-search').value = catalog.systems.filter(function (x) { return x.id === S.id; })[0].name;
        renderLayers(); setSubtitle();
        if (!hasHash || !S.zoom) fit();
        draw(false, false); nameNow();
      }).catch(function (e) { toast(e.message); });
    });
    window.MA_S = S; window.MA_API = { selectSystem: selectSystem, moveTo: moveTo, setRot: setRot, setLang: setLang, visibleStations: visibleStations, plane: function () { return plane; }, sys: function () { return sys; }, placePt: placePt };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
