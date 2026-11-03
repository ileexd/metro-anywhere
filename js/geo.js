// Projection and overlay placement. Pure functions, used by the app and the tests.
(function (root) {
  var R = 6371008.8, D = Math.PI / 180;
  // Azimuthal equidistant forward: lon/lat to metres around a center.
  function forward(c, p) {
    var la0 = c[1] * D, lo0 = c[0] * D, la = p[1] * D, lo = p[0] * D, dl = lo - lo0;
    var cc = Math.sin(la0) * Math.sin(la) + Math.cos(la0) * Math.cos(la) * Math.cos(dl);
    var a = Math.acos(Math.max(-1, Math.min(1, cc)));
    if (a < 1e-12) return [0, 0];
    var k = a / Math.sin(a);
    return [R * k * Math.cos(la) * Math.sin(dl),
            R * k * (Math.cos(la0) * Math.sin(la) - Math.sin(la0) * Math.cos(la) * Math.cos(dl))];
  }
  // Azimuthal equidistant inverse: metres around a center to lon/lat.
  function inverse(c, xy) {
    var la0 = c[1] * D, lo0 = c[0] * D, x = xy[0], y = xy[1], r = Math.sqrt(x * x + y * y);
    if (r < 1e-9) return [c[0], c[1]];
    var a = r / R, s = Math.sin(a), k = Math.cos(a);
    var la = Math.asin(k * Math.sin(la0) + y * s * Math.cos(la0) / r);
    var lo = lo0 + Math.atan2(x * s, r * Math.cos(la0) * k - y * Math.sin(la0) * s);
    var lon = lo / D;
    lon = ((lon + 540) % 360) - 180;
    return [lon, la / D];
  }
  function rotate(xy, deg) {
    var t = deg * D, c = Math.cos(t), s = Math.sin(t);
    return [xy[0] * c + xy[1] * s, -xy[0] * s + xy[1] * c]; // clockwise on a north-up map
  }
  // Source lon/lat to target lon/lat at true ground scale.
  function place(p, srcCenter, tgtCenter, deg) { return inverse(tgtCenter, rotate(forward(srcCenter, p), deg)); }
  function dist(a, b) {
    var la1 = a[1] * D, la2 = b[1] * D, dla = la2 - la1, dlo = (b[0] - a[0]) * D;
    var h = Math.sin(dla / 2) * Math.sin(dla / 2) + Math.cos(la1) * Math.cos(la2) * Math.sin(dlo / 2) * Math.sin(dlo / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function bearing(a, b) {
    var la1 = a[1] * D, la2 = b[1] * D, dl = (b[0] - a[0]) * D;
    var y = Math.sin(dl) * Math.cos(la2), x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dl);
    return (Math.atan2(y, x) / D + 360) % 360;
  }
  function tileOf(lon, lat, z) {
    var n = Math.pow(2, z), la = Math.max(-85.05, Math.min(85.05, lat)) * D;
    var w = ((lon + 180) % 360 + 360) % 360;
    return [Math.min(n - 1, Math.floor(w / 360 * n)), Math.max(0, Math.min(n - 1, Math.floor((1 - Math.asinh(Math.tan(la)) / Math.PI) / 2 * n)))];
  }
  function tileFrac(lon, lat, z) {
    var n = Math.pow(2, z), la = Math.max(-85.05, Math.min(85.05, lat)) * D;
    var w = ((lon + 180) % 360 + 360) % 360;
    return [w / 360 * n, (1 - Math.asinh(Math.tan(la)) / Math.PI) / 2 * n];
  }
  // Distance in metres from a point to a polyline stored as [lon,lat,...].
  function ptLine(p, flat) {
    var ky = 111195, kx = ky * Math.cos(p[1] * D), best = Infinity;
    for (var i = 0; i + 3 < flat.length; i += 2) {
      var ax = (flat[i] - p[0]) * kx, ay = (flat[i + 1] - p[1]) * ky, bx = (flat[i + 2] - p[0]) * kx, by = (flat[i + 3] - p[1]) * ky;
      var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l)) : 0;
      var qx = ax + t * dx, qy = ay + t * dy, d = qx * qx + qy * qy;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }
  var api = { forward: forward, inverse: inverse, rotate: rotate, place: place, dist: dist, bearing: bearing, tileOf: tileOf, tileFrac: tileFrac, ptLine: ptLine, R: R };
  root.Geo = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
