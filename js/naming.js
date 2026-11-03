// Deterministic station naming. No LLM. All matching runs locally on decoded map tiles.
(function (root) {
  var isNode = typeof module !== 'undefined';
  var Geo = isNode ? require('./geo.js') : root.Geo;
  var MVT = isNode ? require('./mvt.js') : root.MVT;
  var Tr = isNode ? require('./translit.js') : root.Translit;

  var MATCH_M = 400;
  var RAIL = { subway: 1, light_rail: 1, monorail: 1, station: 1, halt: 1 };
  // Landmarks a station could plausibly be named after. Clinics, pocket parks, and shops are left out.
  var LAND_SUB = { university: 5, college: 5, hospital: 4, stadium: 4, mall: 4, department_store: 3, museum: 3, castle: 3, zoo: 3, theme_park: 3, aquarium: 3, cathedral: 2 };
  var BAD_LAND = /診所|诊所|クリニック|의원|clinic|dental|社區公園|小區|幼兒園|幼稚園|活動中心/i;
  var PLACE = { neighbourhood: [1, 900], quarter: [1, 1000], suburb: [1.1, 1300], village: [1.2, 1200], hamlet: [1.3, 800], locality: [1.6, 700], island: [1.5, 1200], town: [2, 2500], city: [3, 4000] };
  var BAD_ROAD = /出口|入口|交流道|匝道|系統|ランプ|インターチェンジ|\bexit\b|\binterchange\b|\bramp\b|\bjunction\b|\btunnel\b|\bservice\b/i;
  var ROAD_RANK = { motorway: 3, trunk: 2, primary: 0, secondary: 0, tertiary: .3, minor: .6, service: 3, track: 3, path: 4 };
  var DIRS = {
    en: ['North', 'East', 'South', 'West'], zh: ['北', '東', '南', '西'], ja: ['北', '東', '南', '西'], ko: ['북', '동', '남', '서'],
    es: ['Norte', 'Este', 'Sur', 'Oeste'], pt: ['Norte', 'Leste', 'Sul', 'Oeste'], fr: ['Nord', 'Est', 'Sud', 'Ouest'], de: ['Nord', 'Ost', 'Süd', 'West'],
    it: ['Nord', 'Est', 'Sud', 'Ovest'], nl: ['Noord', 'Oost', 'Zuid', 'West'], ru: ['Север', 'Восток', 'Юг', 'Запад'], tr: ['Kuzey', 'Doğu', 'Güney', 'Batı'],
    pl: ['Północ', 'Wschód', 'Południe', 'Zachód'], ar: ['شمال', 'شرق', 'جنوب', 'غرب'], sv: ['Norra', 'Östra', 'Södra', 'Västra'], el: ['Βόρεια', 'Ανατολικά', 'Νότια', 'Δυτικά'],
    is: ['Norður', 'Austur', 'Suður', 'Vestur'], th: ['เหนือ', 'ตะวันออก', 'ใต้', 'ตะวันตก'], hi: ['उत्तर', 'पूर्व', 'दक्षिण', 'पश्चिम']
  };
  var CC_LANG = { tw: 'zh', cn: 'zh', hk: 'zh', jp: 'ja', kr: 'ko', kp: 'ko', es: 'es', mx: 'es', ar: 'es', cl: 'es', co: 'es', pe: 'es', ve: 'es', ec: 'es', bo: 'es', uy: 'es', py: 'es', pt: 'pt', br: 'pt', fr: 'fr', be: 'fr', de: 'de', at: 'de', ch: 'de', it: 'it', nl: 'nl', ru: 'ru', ua: 'ru', by: 'ru', tr: 'tr', pl: 'pl', sa: 'ar', eg: 'ar', ae: 'ar', se: 'sv', gr: 'el', is: 'is', th: 'th', in: 'hi' };

  // Display width: CJK and Hangul glyphs count double, so limits compare across scripts.
  function width(s) { var w = 0; Array.from(s || '').forEach(function (c) { w += /[\u1100-\u11FF\u2E80-\u9FFF\uAC00-\uD7A3\uF900-\uFAFF\uFF00-\uFF60]/.test(c) ? 2 : 1; }); return w; }
  var DEFAULT_LIMIT = { w: 24, cjk: 12, en: 28 };
  function limitFor(s, budget) { var b = budget || DEFAULT_LIMIT; return /[\u2E80-\u9FFF\uAC00-\uD7A3]/.test(s || '') ? (b.cjk || DEFAULT_LIMIT.cjk) : (b.w || DEFAULT_LIMIT.w); }
  function fits(local, en, budget) { return width(local) <= limitFor(local, budget) && (!en || en.length <= ((budget && budget.en) || DEFAULT_LIMIT.en)); }
  // Drop parentheticals and alternates. Station signs show one name.
  function tidy(s) { if (!s) return s; var t = s.replace(/\s*[(（\[].*?[)）\]]\s*/g, ' ').split(/\s+\/\s+|;/)[0].trim(); return t || s; }
  // Road names lose section and lane numbers: 南港路三段109巷 becomes 南港路.
  function tidyRoad(s) { if (!s) return s; var t = tidy(s).replace(/[一二三四五六七八九十0-9]+段.*$/, '').replace(/[0-9０-９]+[巷弄].*$/, '').replace(/^Sec(tion|\.)?\s*\d+,?\s*/i, '').replace(/,?\s*(Sec(tion|\.)?\s*\d+|Lane\s+\d+|Alley\s+\d+).*$/i, '').trim(); return t || s; }
  function latin(s) { return Tr.isLatin(s) ? s : null; }
  function englishOf(p) {
    var e = p['name:en'] || latin(p.name_en) || latin(p.name);
    if (e) return { en: e, how: 'source' };
    var i = latin(p['name:ja_rm']) || latin(p['name:ja-Latn']) || latin(p['name:ko-Latn']) || latin(p['name:zh-Latn-pinyin']) || latin(p.name_int) || latin(p['name:latin']);
    if (i) return { en: i, how: 'transliterated' };
    var t = Tr.translit(p.name);
    if (t) return { en: t, how: 'transliterated' };
    return { en: null, how: 'none' };
  }
  // Reduce a decoded tile to the features naming needs, so the raw tile can be dropped.
  function digest(tile, z, x, y) {
    var out = { rail: [], places: [], lands: [], roads: [], waterNames: [], water: [] };
    function pt(l, g) { return MVT.toLngLat(g[0][0][0], g[0][0][1], z, x, y, l.extent); }
    function centroid(l, g) { var r = g[0], sx = 0, sy = 0; for (var i = 0; i < r.length; i++) { sx += r[i][0]; sy += r[i][1]; } return MVT.toLngLat(sx / r.length, sy / r.length, z, x, y, l.extent); }
    function rec(p, ll, extra, fn) { var e = englishOf(p), f = fn || function (x) { return x; }, o = { name: f(p.name), en: f(e.en), how: e.how, p: ll }; for (var k in extra) o[k] = extra[k]; return o; }
    var l = tile.poi;
    if (l) l.features.forEach(function (f) {
      var p = f.props; if (!p.name || !f.geom || !f.geom[0]) return;
      if (p.class === 'railway' && RAIL[p.subclass]) out.rail.push(rec(p, pt(l, f.geom), { sub: p.subclass }));
      var w = LAND_SUB[p.subclass];
      if (w && p.class !== 'railway' && !BAD_LAND.test(p.name)) out.lands.push(rec(p, pt(l, f.geom), { w: w, sub: p.subclass || p.class }, tidy));
    });
    l = tile.park;
    if (l) l.features.forEach(function (f) { var p = f.props; if (p.name && f.geom && f.geom[0] && !BAD_LAND.test(p.name) && p.class !== 'protected_area' && p.class !== 'national_park' && p.class !== 'nature_reserve') out.lands.push(rec(p, centroid(l, f.geom), { w: 2, sub: 'park' }, tidy)); });
    l = tile.place;
    if (l) l.features.forEach(function (f) { var p = f.props; if (p.name && f.geom && f.geom[0] && p.class !== 'country' && p.class !== 'continent' && p.class !== 'state' && p.class !== 'province') out.places.push(rec(p, pt(l, f.geom), { cls: p.class, cc: p.iso_a2 }, tidy)); });
    l = tile.transportation_name;
    if (l) l.features.forEach(function (f) {
      var p = f.props; if (!p.name || BAD_ROAD.test(p.name) || !f.geom) return;
      if (ROAD_RANK[p.class] === undefined || ROAD_RANK[p.class] >= 3) return;
      f.geom.forEach(function (ring) {
        var flat = []; ring.forEach(function (c) { var q = MVT.toLngLat(c[0], c[1], z, x, y, l.extent); flat.push(q[0], q[1]); });
        out.roads.push(rec(p, [flat[0], flat[1]], { cls: p.class, line: flat }, tidyRoad));
      });
    });
    l = tile.water_name;
    if (l) l.features.forEach(function (f) { var p = f.props; if (p.name && f.geom && f.geom[0]) out.waterNames.push(rec(p, pt(l, f.geom), { cls: p.class }, tidy)); });
    l = tile.mountain_peak;
    if (l) l.features.forEach(function (f) { var p = f.props; if (p.name && f.geom && f.geom[0]) out.waterNames.push(rec(p, pt(l, f.geom), { cls: 'peak' }, tidy)); });
    l = tile.water;
    if (l) l.features.forEach(function (f) {
      if (f.type !== 3 || !f.geom) return;
      out.water.push(f.geom.map(function (ring) { var flat = []; ring.forEach(function (c) { var q = MVT.toLngLat(c[0], c[1], z, x, y, l.extent); flat.push(q[0], q[1]); }); return flat; }));
    });
    return out;
  }
  var LAYERS = ['poi', 'park', 'place', 'transportation_name', 'water_name', 'mountain_peak', 'water'];
  function inWater(p, polys) {
    for (var i = 0; i < polys.length; i++) {
      var inside = false, rings = polys[i];
      for (var r = 0; r < rings.length; r++) {
        var f = rings[r];
        for (var a = 0, b = f.length - 2; a < f.length; b = a, a += 2) {
          if ((f[a + 1] > p[1]) !== (f[b + 1] > p[1]) && p[0] < (f[b] - f[a]) * (p[1] - f[a + 1]) / (f[b + 1] - f[a + 1]) + f[a]) inside = !inside;
        }
      }
      if (inside) return true;
    }
    return false;
  }
  function dirIndex(deg) { return Math.round(deg / 90) % 4; }
  function apply(fmt, x) { return (fmt || '{x}').replace('{x}', x); }
  function clean(s, re) { if (!s || !re) return s; var t = s.replace(new RegExp(re, 'iu'), '').trim(); return t || s; }
  function abbr(s, list) { if (!s || !list) return s; list.forEach(function (a) { s = s.replace(new RegExp(a[0], 'giu'), a[1]); }); return s; }

  function nearest(list, p, maxM) {
    var best = null, bd = maxM;
    list.forEach(function (f) { var d = Geo.dist(p, f.p); if (d < bd) { bd = d; best = f; } });
    return best ? { f: best, d: bd } : null;
  }
  function pickPlace(d, p, prof, budget, weakOk) {
    var best = null, score = Infinity;
    d.places.forEach(function (f) {
      var c = PLACE[f.cls]; if (!c) return;
      if (!weakOk && (f.cls === 'city' || f.cls === 'town')) return;
      if (!fits(clean(f.name, prof.placeStrip), f.en, budget)) return;
      var dm = Geo.dist(p, f.p); if (dm > c[1]) return;
      var s = dm * c[0]; if (s < score) { score = s; best = { f: f, d: dm }; }
    });
    return best;
  }
  function pickLand(d, p, prof, budget) {
    var best = null, score = Infinity;
    d.lands.forEach(function (f) { if (!fits(clean(f.name, prof.landStrip) + (prof.landmarkFmt ? '前' : ''), f.en, budget)) return; var dm = Geo.dist(p, f.p); if (dm > 400) return; var s = dm / f.w; if (s < score) { score = s; best = { f: f, d: dm }; } });
    return best;
  }
  function roadsNear(d, p, maxM) {
    var seen = {};
    d.roads.forEach(function (f) {
      var dm = Geo.ptLine(p, f.line); if (dm > maxM) return;
      var s = dm * (1 + ROAD_RANK[f.cls]);
      if (!seen[f.name] || s < seen[f.name].s) seen[f.name] = { f: f, d: dm, s: s };
    });
    return Object.keys(seen).map(function (k) { return seen[k]; }).sort(function (a, b) { return a.s - b.s || (a.f.name < b.f.name ? -1 : 1); });
  }
  function linesTouch(a, b) {
    for (var i = 0; i < a.length; i += 2) if (Geo.ptLine([a[i], a[i + 1]], b) < 25) return true;
    for (var j = 0; j < b.length; j += 2) if (Geo.ptLine([b[j], b[j + 1]], a) < 25) return true;
    return false;
  }
  // One candidate name of a given kind, with the profile's formatting applied.
  function candidate(kind, d, p, prof, budget, weakOk) {
    var hit, local, en;
    if (kind === 'neighbourhood') {
      hit = pickPlace(d, p, prof, budget, weakOk); if (!hit) return null;
      local = clean(hit.f.name, prof.placeStrip); en = clean(hit.f.en, prof.placeStripEn);
      return { local: local, en: en, how: hit.f.how, kind: kind, src: hit.f.name, d: hit.d };
    }
    if (kind === 'landmark') {
      hit = pickLand(d, p, prof, budget); if (!hit) return null;
      local = apply(hit.f.w >= 5 ? (prof.collegeFmt || prof.landmarkFmt) : prof.landmarkFmt, clean(hit.f.name, prof.landStrip));
      en = hit.f.en ? apply(hit.f.w >= 5 ? (prof.collegeFmtEn || prof.landmarkFmtEn) : prof.landmarkFmtEn, hit.f.en) : null;
      return { local: local, en: en, how: hit.f.how, kind: kind, src: hit.f.name, d: hit.d };
    }
    if (kind === 'road') {
      var rs = roadsNear(d, p, 170).filter(function (x) { return fits(abbr(clean(x.f.name, prof.roadTrim), prof.abbr), x.f.en && abbr(clean(x.f.en, prof.roadTrimEn), prof.abbrEn), budget); });
      if (!rs.length) return null;
      hit = rs[0];
      return { local: abbr(clean(hit.f.name, prof.roadTrim), prof.abbr), en: hit.f.en ? abbr(clean(hit.f.en, prof.roadTrimEn), prof.abbrEn) : null, how: hit.f.how, kind: kind, src: hit.f.name, d: hit.d };
    }
    if (kind === 'intersection') {
      var r2 = roadsNear(d, p, 170);
      for (var i = 0; i < r2.length && i < 5; i++) for (var j = i + 1; j < r2.length && j < 6; j++) {
        if (!linesTouch(r2[i].f.line, r2[j].f.line)) continue;
        var a = abbr(clean(r2[i].f.name, prof.joinStrip), prof.abbr), b = abbr(clean(r2[j].f.name, prof.joinStrip), prof.abbr);
        if (a === b) continue;
        var ae = r2[i].f.en && abbr(clean(r2[i].f.en, prof.joinStripEn), prof.abbrEn), be = r2[j].f.en && abbr(clean(r2[j].f.en, prof.joinStripEn), prof.abbrEn);
        if (!fits(a + prof.join + b, ae && be ? ae + prof.joinEn + be : null, budget)) continue;
        return { local: a + prof.join + b, en: ae && be ? ae + prof.joinEn + be : null, how: r2[i].f.how, kind: kind, src: r2[i].f.name + ' + ' + r2[j].f.name, d: r2[i].d };
      }
    }
    return null;
  }

  // Merge digests of several tiles into a view for one station.
  function viewOf(digests) {
    var v = { rail: [], places: [], lands: [], roads: [], waterNames: [], water: [] };
    digests.forEach(function (d) { for (var k in v) { var a = d[k]; for (var i = 0; i < a.length; i++) v[k].push(a[i]); } });
    return v;
  }
  function tilesAround(p, z, marginM) {
    var c = Geo.tileFrac(p[0], p[1], z), x = Math.floor(c[0]), y = Math.floor(c[1]), n = Math.pow(2, z);
    var size = 2 * Math.PI * Geo.R * Math.cos(p[1] * Math.PI / 180) / n;
    var m = marginM / size, xs = [x], ys = [y], fx = c[0] - x, fy = c[1] - y;
    if (fx < m) xs.push(x - 1); if (fx > 1 - m) xs.push(x + 1);
    if (fy < m) ys.push(y - 1); if (fy > 1 - m) ys.push(y + 1);
    var out = [];
    xs.forEach(function (tx) { ys.forEach(function (ty) { if (ty >= 0 && ty < n) out.push(z + '/' + ((tx % n + n) % n) + '/' + ty); }); });
    return out;
  }

  /**
   * opts: stations [{id,p:[lon,lat],host:cityId|null}], getProfile(cityId)->profile, general (profile),
   *       fetchTile(key)->Promise<Uint8Array|null>, cache Map, lang, onProgress(info), isCancelled()
   * Returns [{id,local,en,enHow,tier,kind,src,d,flag}] and calls onPartial(results) after each pass.
   */
  function run(opts) {
    var cache = opts.cache || new Map(), stations = opts.stations, lang = opts.lang || 'en', results = {}, failed = 0;
    function load(keys, label) {
      var todo = keys.filter(function (k) { return !cache.has(k); }), done = 0, total = todo.length, idx = 0;
      if (!total) return Promise.resolve();
      function worker() {
        if (idx >= todo.length || (opts.isCancelled && opts.isCancelled())) return Promise.resolve();
        var k = todo[idx++];
        return opts.fetchTile(k).then(function (bytes) {
          var a = k.split('/').map(Number);
          cache.set(k, bytes && bytes.length ? digest(MVT.decode(bytes, LAYERS), a[0], a[1], a[2]) : viewOf([]));
        }).catch(function () { failed++; }).then(function () {
          done++; if (opts.onProgress) opts.onProgress({ label: label, done: done, total: total });
          return worker();
        });
      }
      var pool = []; for (var i = 0; i < (opts.concurrency || 8); i++) pool.push(worker());
      return Promise.all(pool);
    }
    function viewFor(s, zooms) {
      var ds = [];
      zooms.forEach(function (z) { tilesAround(s.p, z, 1000).forEach(function (k) { if (cache.has(k)) ds.push(cache.get(k)); }); });
      return viewOf(ds);
    }
    function dedupe(order) { return order.filter(function (k, i) { return order.indexOf(k) === i; }); }
    function allKeys(list, z, m) { var set = {}; list.forEach(function (s) { tilesAround(s.p, z, m).forEach(function (k) { set[k] = 1; }); }); return Object.keys(set); }
    function waterCheck(s) { var ds = []; tilesAround(s.p, 12, 0).forEach(function (k) { if (cache.has(k)) ds.push(cache.get(k).water); }); return ds.some(function (w) { return inWater(s.p, w); }); }

    function tier1(active) {
      var claims = {};
      active.forEach(function (s) {
        var v = s.view, seen = {};
        v.rail.forEach(function (f) {
          var d = Geo.dist(s.p, f.p); if (d > MATCH_M) return;
          if (!seen[f.name] || d < seen[f.name].d) seen[f.name] = { f: f, d: d };
        });
        Object.keys(seen).forEach(function (k) { (claims[k] = claims[k] || []).push({ s: s, f: seen[k].f, d: seen[k].d }); });
      });
      var pairs = []; Object.keys(claims).forEach(function (k) { claims[k].forEach(function (c) { pairs.push(c); }); });
      pairs.sort(function (a, b) { return a.d - b.d || (a.s.id < b.s.id ? -1 : 1); });
      var usedName = {}, usedStation = {};
      pairs.forEach(function (c) {
        if (usedName[c.f.name] || usedStation[c.s.id]) return;
        usedName[c.f.name] = usedStation[c.s.id] = 1;
        results[c.s.id] = { id: c.s.id, local: c.f.name, en: c.f.en, enHow: c.f.how, tier: 1, kind: 'station', src: c.f.name, d: Math.round(c.d) };
      });
    }
    function budgetOf(s) { return (opts.getBudget && s.host && opts.getBudget(s.host)) || DEFAULT_LIMIT; }
    function generate(s) {
      var inW = waterCheck(s), v = s.view;
      if (inW) return null;
      var prof = s.host ? opts.getProfile(s.host) : null, use = prof || opts.general, tier = prof ? 2 : 3;
      for (var i = 0; i < use.order.length; i++) {
        var c = candidate(use.order[i], v, s.p, use, budgetOf(s));
        if (c && c.local) return { id: s.id, local: c.local, en: c.en, enHow: c.en ? c.how : 'none', tier: tier, kind: c.kind, src: c.src, d: Math.round(c.d) };
      }
      // A whole city or town name is the weakest choice, so it only runs when nothing else fits.
      var w = candidate('neighbourhood', v, s.p, use, budgetOf(s), true);
      if (w && w.local) return { id: s.id, local: w.local, en: w.en, enHow: w.en ? w.how : 'none', tier: tier, kind: 'neighbourhood', weak: true, src: w.src, d: Math.round(w.d) };
      return null;
    }
    function fallback(s) {
      var v = s.view, wide = viewFor(s, [9, 6, 3]), all = [], inW = waterCheck(s);
      [v, wide].forEach(function (x) { x.places.forEach(function (f) { all.push(f); }); x.lands.forEach(function (f) { all.push(f); }); x.waterNames.forEach(function (f) { all.push(f); }); });
      var short = all.filter(function (f) { return fits(f.name, f.en, budgetOf(s)); });
      var hit = nearest(short.length ? short : all, s.p, Infinity);
      if (!hit) return { id: s.id, local: opts.fallbackName || 'Station', en: 'Station', enHow: 'source', tier: 3, kind: 'none', src: 'none found', d: 0, flag: inW ? 'water' : 'empty' };
      var dir = dirIndex(Geo.bearing(hit.f.p, s.p)), d = DIRS[lang] || DIRS.en, near = hit.d < 5000 && !inW;
      return {
        id: s.id, local: near ? hit.f.name + ((lang === 'zh' || lang === 'ja') ? '' : ' ') + d[dir] : hit.f.name, en: hit.f.en ? (near ? hit.f.en + ' ' + DIRS.en[dir] : hit.f.en) : null,
        enHow: hit.f.en ? hit.f.how : 'none', tier: s.host && !inW ? 2 : 3, kind: near ? 'direction' : 'nearest', src: hit.f.name, srcP: hit.f.p, d: Math.round(hit.d), flag: near ? null : (inW ? 'water' : 'empty')
      };
    }
    // Names must be unique inside the overlay. Closest to its source keeps the plain name.
    function unique() {
      var by = {};
      stations.forEach(function (s) { var r = results[s.id]; if (r) (by[r.local] = by[r.local] || []).push(s); });
      var taken = {}; Object.keys(by).forEach(function (k) { taken[k] = 1; });
      var enTaken = {}; stations.forEach(function (s) { var r = results[s.id]; if (r && r.en) enTaken[r.en] = (enTaken[r.en] || 0) + 1; });
      Object.keys(by).sort().forEach(function (name) {
        var g = by[name]; if (g.length < 2) return;
        g.sort(function (a, b) { return results[a.id].d - results[b.id].d || (a.id < b.id ? -1 : 1); });
        g.slice(1).forEach(function (s, gi) {
          var r = results[s.id], rs = roadsNear(s.view, s.p, 300), done = false;
          var prof = (s.host && opts.getProfile(s.host)) || opts.general, bud = budgetOf(s), sep = (lang === 'zh' || lang === 'ja') ? '' : ' ';
          // First try a different real name nearby, because it reads better than a qualifier.
          var alts = [];
          s.view.places.forEach(function (f) { var c = PLACE[f.cls]; if (!c || f.cls === 'city' || f.cls === 'town') return; var dm = Geo.dist(s.p, f.p); if (dm < c[1] * 1.6) alts.push({ local: clean(f.name, prof.placeStrip), en: f.en, how: f.how, kind: 'neighbourhood', src: f.name, d: dm, rank: dm }); });
          s.view.lands.forEach(function (f) { var dm = Geo.dist(s.p, f.p); if (dm < 500) alts.push({ local: clean(f.name, prof.landStrip), en: f.en, how: f.how, kind: 'landmark', src: f.name, d: dm, rank: dm * 1.2 }); });
          rs.forEach(function (x) { alts.push({ local: abbr(clean(x.f.name, prof.roadTrim), prof.abbr), en: x.f.en && abbr(clean(x.f.en, prof.roadTrimEn), prof.abbrEn), how: x.f.how, kind: 'road', src: x.f.name, d: x.d, rank: x.d * 2 }); });
          alts.sort(function (x, y) { return x.rank - y.rank || (x.local < y.local ? -1 : 1); });
          for (var ai = 0; ai < alts.length && !done; ai++) {
            var al = alts[ai];
            if (r.flag || !al.local || taken[al.local] || !fits(al.local, al.en, bud)) continue;
            r.local = al.local; r.en = al.en; r.enHow = al.en ? al.how : 'none'; r.kind = al.kind; r.src = al.src; r.d = Math.round(al.d); r.weak = false;
            taken[al.local] = 1; done = true;
          }
          if (!done) {
            var f0 = g[0], srcP = results[f0.id].srcP || f0.p, dir = dirIndex(Geo.bearing(srcP, s.p)), D0 = DIRS[lang] || DIRS.en, already = r.kind === 'direction';
            var base = already ? name : name + sep + D0[dir], enBase = r.en ? (already ? r.en : r.en + ' ' + DIRS.en[dir]) : null, n2 = base, tail = '';
            if (already || taken[n2]) { var c = 2; while (taken[base + ' ' + c]) c++; tail = String(c); n2 = base + ' ' + c; }
            taken[n2] = 1; r.local = n2;
            if (enBase) r.en = enBase + (tail ? ' ' + tail : '');
          }
        });
      });
      // English can still collide when two local names share one romanization.
      var seenEn = {};
      stations.forEach(function (s) {
        var r = results[s.id]; if (!r || !r.en) return;
        if (!seenEn[r.en]) { seenEn[r.en] = 1; return; }
        var c = 2; while (seenEn[r.en + ' ' + c]) c++;
        r.en = r.en + ' ' + c; seenEn[r.en] = 1;
      });
    }
    function nameAll() {
      results = {};
      stations.forEach(function (s) { s.view = viewFor(s, [14, 12]); });
      tier1(stations);
      stations.forEach(function (s) {
        if (results[s.id]) return;
        var r = generate(s);
        if (r) results[s.id] = r;
      });
      stations.forEach(function (s) { if (!results[s.id]) results[s.id] = fallback(s); });
      unique();
      return stations.map(function (s) { return results[s.id]; });
    }
    function cancelled() { return opts.isCancelled && opts.isCancelled(); }
    function partial() { if (opts.onPartial && !cancelled()) opts.onPartial(nameAll()); }

    return load(allKeys(stations, 12, 1000), 'Reading place names').then(function () {
      if (cancelled()) return null;
      partial();
      // Street-level tiles only where the broad pass cannot satisfy the style's first choice.
      var firstSeen = {};
      var need = stations.filter(function (s) {
        var r = results[s.id]; if (!r || r.tier === 1) return false;
        if (r.flag) return false;
        if (r.weak || r.kind === 'direction') return true;
        var use = (s.host && opts.getProfile(s.host)) || opts.general;
        return r.kind !== use.order[0];
      });
      var keys = allKeys(need, 14, 200);
      if (keys.length > (opts.maxStreetTiles || 180)) keys = keys.slice(0, opts.maxStreetTiles || 180);
      return load(keys, 'Reading street names');
    }).then(function () {
      if (cancelled()) return null;
      partial();
      var wide = stations.filter(function (s) { var r = results[s.id]; return r && r.flag; });
      var set = {};
      wide.forEach(function (s) { [9, 6, 3].forEach(function (z) { tilesAround(s.p, z, 0).forEach(function (k) { set[k] = 1; }); }); });
      return load(Object.keys(set), 'Finding the nearest named place');
    }).then(function () {
      if (cancelled()) return null;
      var out = nameAll();
      return { results: out, failedTiles: failed };
    });
  }
  var api = { width: width, tidy: tidy, tidyRoad: tidyRoad, fits: fits, DEFAULT_LIMIT: DEFAULT_LIMIT, run: run, digest: digest, candidate: candidate, viewOf: viewOf, tilesAround: tilesAround, inWater: inWater, englishOf: englishOf, DIRS: DIRS, CC_LANG: CC_LANG, LAYERS: LAYERS, MATCH_M: MATCH_M };
  root.Naming = api;
  if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
