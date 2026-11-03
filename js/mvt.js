// Minimal Mapbox Vector Tile decoder. Decodes only the layers asked for.
(function (root) {
  function Reader(buf) { this.b = buf; this.p = 0; }
  Reader.prototype.varint = function () {
    var r = 0, m = 1, c;
    do { c = this.b[this.p++]; r += (c & 127) * m; m *= 128; } while (c >= 128);
    return r;
  };
  Reader.prototype.skip = function (wire) {
    if (wire === 0) this.varint();
    else if (wire === 1) this.p += 8;
    else if (wire === 2) { var n = this.varint(); this.p += n; }
    else if (wire === 5) this.p += 4;
    else throw new Error('bad wire type ' + wire);
  };
  var td = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;
  function readValue(r, end) {
    var v = null;
    while (r.p < end) {
      var t = r.varint(), f = t >> 3, w = t & 7;
      if (f === 1) { var n = r.varint(); v = td.decode(r.b.subarray(r.p, r.p + n)); r.p += n; }
      else if (f === 2) { v = new DataView(r.b.buffer, r.b.byteOffset + r.p, 4).getFloat32(0, true); r.p += 4; }
      else if (f === 3) { v = new DataView(r.b.buffer, r.b.byteOffset + r.p, 8).getFloat64(0, true); r.p += 8; }
      else if (f === 4 || f === 5) v = r.varint();
      else if (f === 6) { var z = r.varint(); v = (z >>> 1) ^ -(z & 1); }
      else if (f === 7) v = !!r.varint();
      else r.skip(w);
    }
    return v;
  }
  function readGeom(r, end) {
    var rings = [], cur = null, x = 0, y = 0;
    while (r.p < end) {
      var ci = r.varint(), cmd = ci & 7, cnt = ci >> 3;
      if (cmd === 7) { if (cur && cur.length) cur.push([cur[0][0], cur[0][1]]); continue; }
      for (var i = 0; i < cnt; i++) {
        var dx = r.varint(), dy = r.varint();
        x += (dx >>> 1) ^ -(dx & 1); y += (dy >>> 1) ^ -(dy & 1);
        if (cmd === 1) { cur = []; rings.push(cur); }
        cur.push([x, y]);
      }
    }
    return rings;
  }
  function readLayer(r, end, want) {
    var name = null, keys = [], vals = [], feats = [], ext = 4096;
    while (r.p < end) {
      var t = r.varint(), f = t >> 3, w = t & 7;
      if (f === 1) { var n = r.varint(); name = td.decode(r.b.subarray(r.p, r.p + n)); r.p += n; if (want && !want[name]) { r.p = end; return null; } }
      else if (f === 2) { var l = r.varint(); feats.push([r.p, r.p + l]); r.p += l; }
      else if (f === 3) { var k = r.varint(); keys.push(td.decode(r.b.subarray(r.p, r.p + k))); r.p += k; }
      else if (f === 4) { var vl = r.varint(), ve = r.p + vl; vals.push(readValue(r, ve)); r.p = ve; }
      else if (f === 5) ext = r.varint();
      else r.skip(w);
    }
    var out = [];
    for (var i = 0; i < feats.length; i++) {
      r.p = feats[i][0];
      var fe = feats[i][1], props = {}, type = 0, geom = null;
      while (r.p < fe) {
        var t2 = r.varint(), f2 = t2 >> 3, w2 = t2 & 7;
        if (f2 === 2) {
          var tl = r.varint(), te = r.p + tl;
          while (r.p < te) { var ki = r.varint(), vi = r.varint(); props[keys[ki]] = vals[vi]; }
        } else if (f2 === 3) type = r.varint();
        else if (f2 === 4) { var gl = r.varint(), ge = r.p + gl; geom = readGeom(r, ge); r.p = ge; }
        else r.skip(w2);
      }
      out.push({ type: type, props: props, geom: geom });
    }
    return { name: name, extent: ext, features: out };
  }
  // Returns {layerName: {extent, features:[{type:1|2|3, props, geom:[[ [x,y],... ]]}]}}
  function decode(bytes, layers) {
    var want = null;
    if (layers) { want = {}; layers.forEach(function (l) { want[l] = 1; }); }
    var r = new Reader(bytes), out = {};
    while (r.p < bytes.length) {
      var t = r.varint(), f = t >> 3, w = t & 7;
      if (f === 3) {
        var n = r.varint(), e = r.p + n, l = readLayer(r, e, want);
        r.p = e;
        if (l) out[l.name] = l;
      } else r.skip(w);
    }
    return out;
  }
  // Tile pixel to lon/lat.
  function toLngLat(px, py, z, x, y, extent) {
    var n = Math.pow(2, z), lon = (x + px / extent) / n * 360 - 180;
    var m = Math.PI * (1 - 2 * (y + py / extent) / n);
    return [lon, Math.atan(Math.sinh(m)) * 180 / Math.PI];
  }
  root.MVT = { decode: decode, toLngLat: toLngLat };
  if (typeof module !== 'undefined') module.exports = root.MVT;
})(typeof window !== 'undefined' ? window : globalThis);
