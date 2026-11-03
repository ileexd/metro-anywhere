// Data checks for one system. Runs at build time and again from the QA panel's Run all button.
(function (root) {
  var isNode = typeof module !== 'undefined';
  var Geo = isNode ? require('./geo.js') : root.Geo;
  function norm(s) { return (s || '').toLowerCase().replace(/\s+/g, ''); }
  function check(sys, meta) {
    var issues = [], status = 'pass';
    function warn(m) { issues.push(m); if (status === 'pass') status = 'warn'; }
    function fail(m) { issues.push(m); status = 'fail'; }
    var core = sys.networks.filter(function (n) { return n.core; });
    var lines = []; core.forEach(function (n) { n.lines.forEach(function (l) { lines.push(l); }); });
    var coreLines = {}; lines.forEach(function (l) { coreLines[l.id] = 1; });
    var st = sys.stations.filter(function (s) { return s.l.some(function (i) { return coreLines[i]; }); });
    if (!lines.length) fail('No lines in the default layer');
    if (meta.expectedLines && lines.length !== meta.expectedLines) warn('Lines ' + lines.length + ', expected ' + meta.expectedLines);
    // Station count against the published figure.
    if (meta.expected) {
      var r = st.length / meta.expected;
      if (r < .6 || r > 1.5) fail('Stations ' + st.length + ', expected about ' + meta.expected);
      else if (r < .85 || r > 1.2) warn('Stations ' + st.length + ', expected about ' + meta.expected);
    }
    // Route continuity: each line should form few connected pieces.
    var broken = 0;
    lines.forEach(function (l) {
      if (!l.paths.length) { fail('Line ' + l.name + ' has no track geometry'); return; }
      var ends = l.paths.map(function (f) { return [[f[0], f[1]], [f[f.length - 2], f[f.length - 1]]]; }), parent = l.paths.map(function (_, i) { return i; });
      function find(i) { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; }
      for (var a = 0; a < ends.length; a++) for (var b = a + 1; b < ends.length; b++) {
        if (find(a) === find(b)) continue;
        var near = false;
        ends[a].forEach(function (p) { ends[b].forEach(function (q) { if (Geo.dist(p, q) < 400) near = true; }); });
        if (!near) {
          // A path may also meet another path partway along its length.
          for (var k = 0; k < 2 && !near; k++) if (Geo.ptLine(ends[a][k], l.paths[b]) < 400 || Geo.ptLine(ends[b][k], l.paths[a]) < 400) near = true;
        }
        if (near) parent[find(a)] = find(b);
      }
      var c = {}; l.paths.forEach(function (_, i) { c[find(i)] = 1; });
      if (Object.keys(c).length > 2) broken++;
    });
    var sch = lines.filter(function (l) { return l.sch; }).length;
    if (sch) warn(sch + ' line(s) have no mapped track and are drawn straight between stops');
    if (broken) { if (broken > Math.max(1, lines.length * .34)) fail(broken + ' lines have gaps in their track'); else warn(broken + ' line(s) have gaps in their track'); }
    // Missing names.
    var missing = st.filter(function (s) { return !s.n; }).length;
    if (missing) { if (missing / Math.max(1, st.length) > .15) fail(missing + ' stations have no name'); else warn(missing + ' stations have no name'); }
    // Duplicate stations: the same name very close together.
    var seen = {}, dup = 0;
    st.forEach(function (s) { if (!s.n) return; var k = norm(s.n); (seen[k] = seen[k] || []).forEach(function (o) { if (Geo.dist(o.p, s.p) < 600) dup++; }); seen[k].push(s); });
    if (dup) warn(dup + ' possible duplicate stations');
    return { status: status, stations: st.length, expected: meta.expected || null, lines: lines.length, expectedLines: meta.expectedLines || null, issues: issues };
  }
  var api = { check: check };
  root.QA = api;
  if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
