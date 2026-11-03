// Script transliteration where a reliable table exists: Cyrillic, Greek, Hangul, Kana.
(function (root) {
  var cyr = {а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',є:'ye',і:'i',ї:'yi',ґ:'g',ў:'w',қ:'q',ғ:'gh',ҳ:'h'};
  var grk = {α:'a',β:'v',γ:'g',δ:'d',ε:'e',ζ:'z',η:'i',θ:'th',ι:'i',κ:'k',λ:'l',μ:'m',ν:'n',ξ:'x',ο:'o',π:'p',ρ:'r',σ:'s',ς:'s',τ:'t',υ:'y',φ:'f',χ:'ch',ψ:'ps',ω:'o',ά:'a',έ:'e',ή:'i',ί:'i',ό:'o',ύ:'y',ώ:'o',ϊ:'i',ϋ:'y',ΐ:'i',ΰ:'y'};
  var L = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
  var V = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
  var T = ['','k','k','k','n','n','n','t','l','k','m','l','l','l','p','l','m','p','p','t','t','ng','t','t','k','t','p','t'];
  var kana = {'あ':'a','い':'i','う':'u','え':'e','お':'o','か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko','さ':'sa','し':'shi','す':'su','せ':'se','そ':'so','た':'ta','ち':'chi','つ':'tsu','て':'te','と':'to','な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no','は':'ha','ひ':'hi','ふ':'fu','へ':'he','ほ':'ho','ま':'ma','み':'mi','む':'mu','め':'me','も':'mo','や':'ya','ゆ':'yu','よ':'yo','ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro','わ':'wa','を':'o','ん':'n','が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go','ざ':'za','じ':'ji','ず':'zu','ぜ':'ze','ぞ':'zo','だ':'da','ぢ':'ji','づ':'zu','で':'de','ど':'do','ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo','ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po'};
  var kanaSmall = {'ゃ':'ya','ゅ':'yu','ょ':'yo'};
  function kanaToHira(ch) { var c = ch.charCodeAt(0); return c >= 0x30A1 && c <= 0x30F6 ? String.fromCharCode(c - 0x60) : ch; }
  function hanPinyin(s) { var py = root.pinyinPro; if (!py) return null; var o = py.pinyin(s, { toneType: 'none', type: 'array', nonZh: 'consecutive' }); return title(o.join('').replace(/\s+/g, ' ')); }
  function title(s) { return s.replace(/(^|[\s\-(])(\p{L})/gu, function (m, a, b) { return a + b.toUpperCase(); }); }
  function isLatin(s) { return !!s && !/[^\u0000-ɏḀ-ỿ -⁯\s0-9]/.test(s); }
  // Returns a Latin string, or null when any letter has no reliable table (Han, Arabic, Thai, Indic).
  function translit(s) {
    if (!s) return null;
    if (isLatin(s)) return s;
    var out = '', chars = Array.from(s);
    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i], lo = ch.toLowerCase(), code = ch.codePointAt(0);
      if (cyr[lo] !== undefined) out += cyr[lo];
      else if (grk[lo] !== undefined) out += grk[lo];
      else if (code >= 0xAC00 && code <= 0xD7A3) {
        var n = code - 0xAC00; out += L[Math.floor(n / 588)] + V[Math.floor((n % 588) / 28)] + T[n % 28];
      } else if (code >= 0x3041 && code <= 0x30F6) {
        var h = kanaToHira(ch), nx = chars[i + 1] ? kanaToHira(chars[i + 1]) : '';
        if (h === 'っ' && nx && kana[nx]) { out += kana[nx][0]; continue; }
        if (kanaSmall[nx] && kana[h]) { out += kana[h].slice(0, -1).replace(/(sh|ch|j)$/, '$1') + (/(sh|ch|j)$/.test(kana[h].slice(0, -1)) ? kanaSmall[nx].slice(1) : kanaSmall[nx]); i++; continue; }
        if (!kana[h]) return null;
        out += kana[h];
      } else if (ch === 'ー') { /* long mark */ }
      else if (/[\s\-·・.,'()0-9]/.test(ch) || isLatin(ch)) out += ch === '・' ? ' ' : ch;
      else if (api.han && /\p{Script=Han}/u.test(ch)) return api.han(s);
      else return null;
    }
    return title(out);
  }
  var api = { translit: translit, isLatin: isLatin, han: null, useChinese: function (on) { api.han = on ? hanPinyin : null; } };
  root.Translit = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
