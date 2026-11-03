// Naming style profiles, one per listed system. Written by hand from how each network names stations.
// order: which source to try first. join: separator for intersection or two-part names.
// Real example names are added at build time from each system's own data.
(function (root) {
  var EN_ROAD = '\\s+(East|West|North|South|E\\.?|W\\.?|N\\.?|S\\.?)?\\s*(Road|Rd\\.?|Street|St\\.?|Avenue|Ave?\\.?|Boulevard|Blvd\\.?|Drive|Dr\\.?|Lane|Ln\\.?)(\\s+Sec(tion|\\.)\\s*\\d+)?$';
  var ES_ROAD = '^(Avenida|Av\\.?|Calle|Paseo|Pasaje|Boulevard|Bulevar|Camino|Carrer|Passeig|Avinguda|Rúa|Rua|Estrada|Alameda|Largo|Praça|Plaza|Plaça)\\s+((de la|del|de los|de las|de|da|do|dos|das)\\s+)?';
  var FR_ROAD = "^(Rue|Avenue|Boulevard|Place|Quai|Cours|Square|Allée|Chaussée|Chemin)\\s+((de la|de l'|du|des|de|d')\\s*)?";
  var IT_ROAD = "^(Via|Viale|Piazza|Piazzale|Corso|Largo)\\s+((della|dell'|del|dei|di|delle)\\s*)?";
  var RU_ROAD = '(^|\\s)(улица|проспект|шоссе|бульвар|переулок|набережная|вулиця|проспект)(\\s|$)';
  var ZH_ROAD_JOIN = '(東|西|南|北|东)?(路|街|大道)(.*段)?$';
  var JP_PLACE = '[一二三四五六七八九十0-9０-９]+丁目$';
  var KO_PLACE = '[0-9]*(동|가)$';
  var ABBR_US = [['\\bStreet\\b', 'St'], ['\\bAvenue\\b', 'Av'], ['\\bRoad\\b', 'Rd'], ['\\bBoulevard\\b', 'Blvd'], ['(\\d+)(st|nd|rd|th)\\b', '$1']];
  function P(order, o) { o = o || {}; o.order = order; if (o.join === undefined) o.join = ' / '; if (o.joinEn === undefined) o.joinEn = o.join === '' ? ' ' : o.join; return o; }
  var NB = ['neighbourhood', 'landmark', 'road', 'intersection'];
  var LM = ['landmark', 'neighbourhood', 'road', 'intersection'];
  var RD = ['road', 'neighbourhood', 'landmark', 'intersection'];
  var IX = ['intersection', 'road', 'landmark', 'neighbourhood'];
  function cn(note, order) { return P(order || RD, { join: '', joinStrip: ZH_ROAD_JOIN, joinStripEn: EN_ROAD, note: note }); }
  function jp(note, order, x) { var o = { join: '', joinEn: ' ', placeStrip: JP_PLACE, landmarkFmt: '{x}前', landmarkFmtEn: '{x}-mae', note: note }; for (var k in x || {}) o[k] = x[k]; return P(order || NB, o); }
  function ko(note, order) { return P(order || ['neighbourhood', 'landmark', 'road'], { join: '', joinEn: ' ', placeStrip: KO_PLACE, placeStripEn: '-?(dong|ga)$', collegeFmt: '{x}입구', collegeFmtEn: '{x} Entrance', note: note }); }
  function de(note, order, x) { var o = { join: '/', note: note }; for (var k in x || {}) o[k] = x[k]; return P(order || NB, o); }
  function fr(note, order) { return P(order || IX, { join: ' - ', roadTrim: FR_ROAD, joinStrip: FR_ROAD, note: note }); }
  function ib(note, order, j) { return P(order || RD, { join: j || ' - ', roadTrim: ES_ROAD, joinStrip: ES_ROAD, note: note }); }
  function it(note, order) { return P(order || RD, { join: ' - ', roadTrim: IT_ROAD, joinStrip: IT_ROAD, note: note }); }
  function ru(note, order) { return P(order || LM, { join: ' - ', roadTrim: RU_ROAD, joinStrip: RU_ROAD, note: note }); }
  function en(note, order, x) { var o = { join: ' & ', joinStrip: EN_ROAD, joinStripEn: EN_ROAD, note: note }; for (var k in x || {}) o[k] = x[k]; return P(order || NB, o); }
  var us = function (note, order, x) { var o = { join: '/', abbr: ABBR_US, abbrEn: ABBR_US, note: note }; for (var k in x || {}) o[k] = x[k]; return P(order, o); };

  var P_ = {
    shanghai: cn('Road and square names, kept in full'),
    beijing: cn('Roads, old city gates, and districts', ['neighbourhood', 'road', 'landmark']),
    guangzhou: cn('Roads and districts'),
    shenzhen: cn('Districts and landmarks first', ['neighbourhood', 'landmark', 'road']),
    chengdu: cn('Roads and local areas'),
    hongkong: P(['neighbourhood', 'landmark', 'road'], { join: '', note: 'Short district names' }),
    hangzhou: cn('Roads and local areas'),
    wuhan: cn('Roads and local areas'),
    chongqing: cn('Local area names on steep terrain', ['neighbourhood', 'road', 'landmark']),
    xian: cn('Landmarks and city gates', ['landmark', 'road', 'neighbourhood']),
    nanjing: cn('Roads, gates, and districts', ['neighbourhood', 'road', 'landmark']),
    changsha: cn('Roads and local areas'),
    suzhou: cn('Roads and local areas'),
    zhengzhou: cn('Roads, with many road-pair names', ['road', 'intersection', 'neighbourhood']),
    tianjin: cn('Roads and local areas'),
    shenyang: cn('Roads and squares'),
    qingdao: cn('Roads and local areas'),
    hefei: cn('Roads and local areas'),
    dalian: cn('Squares and local areas', ['neighbourhood', 'landmark', 'road']),
    xiamen: cn('Local areas and landmarks', ['neighbourhood', 'landmark', 'road']),
    tokyo: jp('District names, with 前 for a landmark in front of the station'),
    osaka: jp('District names, with 前 for landmarks'),
    nagoya: jp('Districts, with 前 for landmarks and institutions'),
    yokohama: jp('District names, with 前 for landmarks'),
    sapporo: jp('Numbered grid names and districts'),
    fukuoka: jp('District names, with 前 for landmarks'),
    kobe: jp('District names, with 前 for landmarks'),
    kyoto: jp('Street pairs from the old grid', ['intersection', 'road', 'neighbourhood', 'landmark'], { joinStrip: '(通|大路|小路)$' }),
    seoul: ko('Neighbourhoods, with 입구 for a university entrance'),
    busan: ko('Neighbourhoods, with 입구 for a university entrance'),
    incheon: ko('Neighbourhoods and institutions'),
    pyongyang: ko('Abstract revolutionary names in the real network. New names use local places', ['landmark', 'neighbourhood', 'road']),
    taipei: P(['landmark', 'neighbourhood', 'intersection', 'road'], { join: '', joinEn: ' ', placeStrip: '里$', joinStrip: ZH_ROAD_JOIN, joinStripEn: EN_ROAD, note: 'Landmarks, areas, and fused road pairs like 忠孝復興' }),
    kaohsiung: P(['landmark', 'neighbourhood', 'road'], { join: '', joinEn: ' ', placeStrip: '里$', joinStrip: ZH_ROAD_JOIN, joinStripEn: EN_ROAD, note: 'Landmarks and districts' }),
    singapore: en('Estate names and major roads', ['neighbourhood', 'road', 'landmark']),
    bangkok: P(['road', 'neighbourhood', 'landmark'], { join: ' - ', note: 'Soi, road, and area names' }),
    manila: en('Avenue names without the road word', ['road', 'neighbourhood', 'landmark'], { roadTrim: EN_ROAD, roadTrimEn: EN_ROAD }),
    kualalumpur: en('Districts and landmarks'),
    jakarta: en('Districts and landmarks', LM),
    delhi: en('Colony names and landmarks'),
    mumbai: en('Suburb names'),
    bengaluru: en('Areas and road names, sometimes paired', ['neighbourhood', 'road', 'landmark']),
    kolkata: en('Areas and named landmarks', LM),
    tehran: P(['landmark', 'road', 'neighbourhood'], { join: ' - ', note: 'Squares, streets, and landmarks' }),
    dubai: P(LM, { join: ' - ', note: 'Landmark and developer names' }),
    riyadh: P(['road', 'landmark', 'neighbourhood'], { join: ' - ', note: 'Roads and institutions' }),
    tashkent: ru('Squares and named people, as in the Soviet model'),
    istanbul: P(NB, { join: ' - ', note: 'Districts, sometimes paired with a landmark' }),
    cairo: P(LM, { join: ' - ', note: 'Named figures, squares, and districts' }),
    moscow: ru('Squares, streets, and districts without the road word'),
    saintpetersburg: ru('Squares, avenues, and landmarks without the road word'),
    kyiv: ru('Squares and districts'),
    paris: fr('Street pairs joined with a hyphen, like Réaumur - Sébastopol'),
    london: en('Districts, then Road or Street names kept whole', ['neighbourhood', 'road', 'landmark']),
    madrid: ib('Streets and squares without the road word', RD),
    berlin: de('Squares and streets with their full ending', ['road', 'neighbourhood', 'landmark', 'intersection']),
    barcelona: ib('Streets and areas', RD),
    stockholm: P(NB, { join: ' ', note: 'Short neighbourhood and square names' }),
    munich: de('Squares, streets, and districts', ['road', 'neighbourhood', 'landmark']),
    vienna: de('Squares, streets, and districts', ['road', 'neighbourhood', 'landmark']),
    budapest: P(['road', 'landmark', 'neighbourhood'], { join: ' - ', note: 'Squares and streets with tér or utca' }),
    prague: P(LM, { join: ' - ', note: 'Squares and landmarks' }),
    milan: it('Squares and streets without the road word'),
    hamburg: de('Districts, with direction and transfer suffixes'),
    athens: P(NB, { join: ' - ', note: 'Districts and classical landmarks' }),
    lyon: fr('Squares and districts', ['road', 'landmark', 'neighbourhood', 'intersection']),
    warsaw: P(['neighbourhood', 'road', 'landmark'], { join: ' - ', note: 'Districts and landmarks' }),
    lisbon: ib('Squares, avenues, and districts', ['neighbourhood', 'road', 'landmark']),
    rome: it('Squares, districts, and ancient landmarks', LM),
    bucharest: P(LM, { join: ' - ', note: 'Squares and institutions' }),
    brussels: fr('Squares and districts', ['neighbourhood', 'road', 'landmark', 'intersection']),
    rotterdam: P(NB, { join: ' ', note: 'Districts and squares' }),
    amsterdam: P(NB, { join: ' ', note: 'Districts and squares' }),
    frankfurt: de('Squares, streets, and districts', ['road', 'neighbourhood', 'landmark']),
    stuttgart: de('Squares and districts'),
    cologne: de('Squares and districts', ['road', 'neighbourhood', 'landmark']),
    rhineruhr: de('Town and district names'),
    zurich: de('Town and district names'),
    copenhagen: P(NB, { join: ' ', note: 'Districts and squares' }),
    oslo: P(NB, { join: ' ', note: 'Districts, squares, and landmarks' }),
    helsinki: P(NB, { join: ' ', note: 'Districts' }),
    newyork: us('Numbered streets, written 34 St or Lexington Av/59 St', ['intersection', 'road', 'neighbourhood', 'landmark']),
    mexicocity: ib('Districts and historic figures', ['neighbourhood', 'landmark', 'road']),
    toronto: en('Cross streets without the road word', ['road', 'intersection', 'neighbourhood'], { join: '-', roadTrim: EN_ROAD, roadTrimEn: EN_ROAD }),
    montreal: fr('Figures, streets, and institutions, paired with a hyphen', ['landmark', 'road', 'neighbourhood', 'intersection']),
    washington: us('Neighbourhoods paired with institutions', ['neighbourhood', 'landmark', 'road'], { join: '-' }),
    chicago: us('Street names without the direction or road word', ['road', 'neighbourhood', 'landmark'], { roadTrim: '^(North|South|East|West|N|S|E|W)\\s+|\\s+(Street|St|Avenue|Ave|Road|Rd)\\.?$', roadTrimEn: '^(North|South|East|West|N|S|E|W)\\s+|\\s+(Street|St|Avenue|Ave|Road|Rd)\\.?$' }),
    vancouver: en('Areas and streets', ['neighbourhood', 'road', 'landmark']),
    boston: en('Squares, neighbourhoods, and institutions', NB),
    sanfrancisco: us('Streets paired with districts', ['neighbourhood', 'road', 'landmark']),
    losangeles: us('Cross streets written Wilshire/Vermont', ['intersection', 'road', 'neighbourhood'], { joinStrip: '^(North|South|East|West|N|S|E|W)\\s+|\\s+(Street|St|Avenue|Ave|Boulevard|Blvd)\\.?$', joinStripEn: '^(North|South|East|West|N|S|E|W)\\s+|\\s+(Street|St|Avenue|Ave|Boulevard|Blvd)\\.?$' }),
    philadelphia: us('Numbered and named streets', ['road', 'neighbourhood', 'landmark']),
    saopaulo: ib('Districts and institutions, paired with a hyphen', ['neighbourhood', 'landmark', 'road'], '-'),
    santiago: ib('Districts, avenues, and squares', ['neighbourhood', 'road', 'landmark']),
    caracas: ib('Districts and squares', ['neighbourhood', 'landmark', 'road']),
    buenosaires: ib('Streets and historic figures without the road word', RD),
    riodejaneiro: ib('Districts and squares', ['neighbourhood', 'landmark', 'road']),
    sydney: en('Suburb names', NB),
    melbourne: en('Suburb names', NB),
    perth: en('Suburb names', NB)
  };
  var general = P(NB, { join: ' / ', joinStrip: EN_ROAD, joinStripEn: EN_ROAD, note: 'General scheme: neighbourhood, landmark, road, intersection, then a direction from the nearest place' });
  var api = { byId: P_, general: general };
  root.Profiles = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
