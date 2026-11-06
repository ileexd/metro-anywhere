// Interface language: English and Traditional Chinese (Taiwan usage). Station names have their own Local/English switch.
(function (root) {
  var EN = {
    title: 'Metro Anywhere', description: 'Drop a real metro system anywhere on Earth at true scale, and see what its stations would be called there.',
    switchLang: '繁中', switchLangAria: 'Switch interface to Traditional Chinese', hide: 'Hide', show: 'Show',
    system: 'System', systemPh: 'Search a city or country', dropOn: 'Drop it on', placePh: 'Search a place', dragHint: 'Or drag the lines or the yellow handle on the map.',
    stationNames: 'Station names', local: 'Local', english: 'English', rotation: 'Rotation', rotationAria: 'Rotation in degrees', opacity: 'Opacity',
    rotCenter: 'Rotation center', setCenter: 'Set center', cancel: 'Cancel', reset: 'Reset',
    pivDefault: 'Turns around the yellow handle.', pivArmed: 'Click the map where the system should turn.', pivSet: 'Turns around the crosshair. Drag it to move it.',
    pivHandle: 'Drag to move the rotation center', moveHandle: 'Drag to move the system', rotHandle: 'Drag to rotate the system', moveAria: 'Move handle', rotAria: 'Rotate handle', pivAria: 'Rotation center handle',
    namingStyle: 'Naming style', layers: 'Layers', copy: 'Copy link', png: 'Save PNG', qa: 'Data QA', mapTheme: 'Switch map theme', darkMap: 'Dark map', lightMap: 'Light map',
    fine: 'Data <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>. Map tiles by <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> and <a href="https://openmaptiles.org" target="_blank" rel="noopener">OpenMapTiles</a>. Names are generated for fun and are not real stations.',
    close: 'Close', renameLocal: 'Rename (local)', renameEn: 'Rename (English)', save: 'Save', runAll: 'Run all', result: 'Result', stations: 'Stations', lines: 'Lines', notes: 'Notes',
    namingN: 'Naming {n} stations…', tilesProgress: '{label}: {done} of {total} map tiles', tilesFailed: '{n} map tiles failed to load. Some names may be less specific.',
    namingStopped: 'Naming stopped: {x}. Check your connection and move the system to try again.', named: '{n} stations named', namingWait: 'Naming starts 3 seconds after you stop.',
    'tip.existing': 'Matched a real station within 400 m', 'tip.style': "Generated in the local system's style", 'tip.general': 'Generated with the general scheme', 'tip.flag': 'In water or empty land', 'tip.noEn': 'No reliable English source. The local name is shown',
    existing: 'Existing {n}', localStyle: 'Local style {n}', general: 'General {n}', flagged: 'Flagged {n}', noEnglish: 'No English {n}',
    'kind.station': 'Existing station', 'kind.neighbourhood': 'Neighbourhood', 'kind.landmark': 'Landmark', 'kind.road': 'Road', 'kind.intersection': 'Intersection', 'kind.direction': 'Direction from a place', 'kind.nearest': 'Nearest named feature', 'kind.none': 'Nothing nearby',
    'tier.1': 'Existing station match', 'tier.2': 'Local system style', 'tier.3': 'General scheme',
    cardNaming: 'Naming…', noEnSource: 'No English source', matched: 'Matched {src} at {d} m', atM: '{x} at {d} m', kindSrc: '{kind}: {x}', noNameInSource: 'No name in source',
    rule: 'Rule', source: 'Source', transliterated: 'Transliterated', flag: 'Flag', inWater: 'Station is in water', emptyLand: 'Empty land, nothing close by', edited: 'Edited', youRenamed: 'You renamed this station', realName: 'Real name', realIn: '{x} in {sys}',
    line1: '{n} line', lineN: '{n} lines', subLine: '{where}. {n} stations.', comma: ', ', dataFail: 'Data check failed: {x}', dataWarn: 'Data warning: {x}',
    loadFail: 'Could not load data for {id}', tryAnother: '{x}. Try another system.', placeDown: 'Place search is not reachable right now. Drag the system on the map instead.',
    styleAuto: 'Auto, from the location', styleGeneral: 'General scheme', styleOf: '{name} style', styleAutoNote: 'Uses the local system within 5 km of its network, and the general scheme elsewhere.', realEx: '. Real examples: {x}', listSep: ', ', issueSep: '. ',
    pngTitle: 'Metro Anywhere: {name} at true scale', savedPng: 'Saved PNG', copyFallback: 'Copy this link from the address bar.', linkCopied: 'Link copied', nameSaved: 'Name saved',
    'qa.pass': 'Pass', 'qa.warn': 'Warn', 'qa.fail': 'Fail', 'qa.none': 'Not run', qaSum: '{pass} pass, {warn} warn, {fail} fail, {none} not run. ', qaRan: 'Checked in this browser just now.', qaBuilt: 'Build checks from {d}. Station counts compare against published figures.', qaChecking: 'Checking {i} of {n}'
  };
  var ZH = {
    title: 'Metro Anywhere', description: '把真實的捷運系統以實際比例放到地球上任何地方，看看那裡的車站會叫什麼名字。',
    switchLang: 'EN', switchLangAria: '將介面切換為英文', hide: '隱藏', show: '顯示',
    system: '捷運系統', systemPh: '搜尋城市或國家', dropOn: '放到哪裡', placePh: '搜尋地點', dragHint: '也可以直接拖曳地圖上的路線或黃色控點。',
    stationNames: '站名', local: '當地語言', english: '英文', rotation: '旋轉', rotationAria: '旋轉角度', opacity: '不透明度',
    rotCenter: '旋轉中心', setCenter: '設定中心', cancel: '取消', reset: '重設',
    pivDefault: '目前以黃色控點為中心旋轉。', pivArmed: '在地圖上點選要作為旋轉中心的位置。', pivSet: '目前以十字控點為中心旋轉，可拖曳調整位置。',
    pivHandle: '拖曳以移動旋轉中心', moveHandle: '拖曳以移動整個系統', rotHandle: '拖曳以旋轉整個系統', moveAria: '移動控點', rotAria: '旋轉控點', pivAria: '旋轉中心控點',
    namingStyle: '命名風格', layers: '圖層', copy: '複製連結', png: '儲存 PNG', qa: '資料檢查', mapTheme: '切換地圖主題', darkMap: '深色地圖', lightMap: '淺色地圖',
    fine: '資料來源：<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap 貢獻者</a>。地圖圖磚由 <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> 與 <a href="https://openmaptiles.org" target="_blank" rel="noopener">OpenMapTiles</a> 提供。站名為趣味自動產生，並非真實車站。',
    close: '關閉', renameLocal: '重新命名（當地語言）', renameEn: '重新命名（英文）', save: '儲存', runAll: '全部執行', result: '結果', stations: '車站', lines: '路線', notes: '備註',
    namingN: '正在為 {n} 座車站命名…', tilesProgress: '{label}：地圖圖磚 {done} / {total}', tilesFailed: '有 {n} 個地圖圖磚載入失敗，部分站名可能不夠精確。',
    namingStopped: '命名已中止：{x}。請檢查網路連線，然後移動系統再試一次。', named: '已為 {n} 座車站命名', namingWait: '停止操作 3 秒後開始命名。',
    'tip.existing': '與 400 公尺內的真實車站相符', 'tip.style': '依當地系統的風格產生', 'tip.general': '依通用規則產生', 'tip.flag': '位於水域或空曠地區', 'tip.noEn': '沒有可靠的英文來源，改為顯示當地名稱',
    existing: '既有 {n}', localStyle: '當地風格 {n}', general: '通用 {n}', flagged: '已標記 {n}', noEnglish: '無英文 {n}',
    'kind.station': '既有車站', 'kind.neighbourhood': '地區', 'kind.landmark': '地標', 'kind.road': '道路', 'kind.intersection': '路口', 'kind.direction': '相對某地的方位', 'kind.nearest': '最近的具名地物', 'kind.none': '附近沒有地物',
    'tier.1': '符合既有車站', 'tier.2': '當地系統風格', 'tier.3': '通用規則',
    cardNaming: '命名中…', noEnSource: '沒有英文來源', matched: '符合 {src}，距離 {d} 公尺', atM: '{x}，距離 {d} 公尺', kindSrc: '{kind}：{x}', noNameInSource: '來源資料沒有名稱',
    rule: '規則', source: '來源', transliterated: '音譯', flag: '標記', inWater: '車站位於水域', emptyLand: '空曠地區，附近沒有地物', edited: '已編輯', youRenamed: '你已重新命名這座車站', realName: '真實站名', realIn: '{sys}的{x}',
    line1: '{n} 條路線', lineN: '{n} 條路線', subLine: '{where}。{n} 座車站。', comma: '，', dataFail: '資料檢查未通過：{x}', dataWarn: '資料警告：{x}',
    loadFail: '無法載入 {id} 的資料', tryAnother: '{x}。請改選其他系統。', placeDown: '目前無法使用地點搜尋，請直接在地圖上拖曳系統。',
    styleAuto: '自動，依所在位置', styleGeneral: '通用規則', styleOf: '{name}風格', styleAutoNote: '距離當地系統路網 5 公里內時採用當地風格，其他地方採用通用規則。', realEx: '。實際例子：{x}', listSep: '、', issueSep: '。',
    pngTitle: 'Metro Anywhere：實際比例的{name}', savedPng: '已儲存 PNG', copyFallback: '請從網址列複製這個連結。', linkCopied: '已複製連結', nameSaved: '已儲存站名',
    'qa.pass': '通過', 'qa.warn': '警告', 'qa.fail': '未通過', 'qa.none': '未執行', qaSum: '通過 {pass}、警告 {warn}、未通過 {fail}、未執行 {none}。', qaRan: '剛剛在這個瀏覽器中檢查完成。', qaBuilt: '建置時間 {d} 的檢查結果。車站數量與公開數據比對。', qaChecking: '檢查中 {i} / {n}'
  };
  var REGION = { 'East Asia': '東亞', 'Southeast Asia': '東南亞', 'South Asia': '南亞', 'Middle East and Central Asia': '中東與中亞', 'Eastern Europe': '東歐', 'Europe': '歐洲', 'North America': '北美洲', 'South America': '南美洲', 'Oceania': '大洋洲' };
  var COUNTRY = { 'China': '中國', 'Japan': '日本', 'South Korea': '韓國', 'Taiwan': '臺灣', 'North Korea': '北韓', 'Singapore': '新加坡', 'Thailand': '泰國', 'Philippines': '菲律賓', 'Malaysia': '馬來西亞', 'Indonesia': '印尼', 'India': '印度', 'Iran': '伊朗', 'United Arab Emirates': '阿拉伯聯合大公國', 'Saudi Arabia': '沙烏地阿拉伯', 'Uzbekistan': '烏茲別克', 'Turkey': '土耳其', 'Egypt': '埃及', 'Russia': '俄羅斯', 'Ukraine': '烏克蘭', 'France': '法國', 'United Kingdom': '英國', 'Spain': '西班牙', 'Germany': '德國', 'Sweden': '瑞典', 'Austria': '奧地利', 'Hungary': '匈牙利', 'Czech Republic': '捷克', 'Italy': '義大利', 'Greece': '希臘', 'Poland': '波蘭', 'Portugal': '葡萄牙', 'Romania': '羅馬尼亞', 'Belgium': '比利時', 'Netherlands': '荷蘭', 'Switzerland': '瑞士', 'Denmark': '丹麥', 'Norway': '挪威', 'Finland': '芬蘭', 'United States': '美國', 'Mexico': '墨西哥', 'Canada': '加拿大', 'Brazil': '巴西', 'Chile': '智利', 'Venezuela': '委內瑞拉', 'Argentina': '阿根廷', 'Australia': '澳洲' };
  var CITY = { shanghai: '上海', beijing: '北京', guangzhou: '廣州', shenzhen: '深圳', chengdu: '成都', hongkong: '香港', hangzhou: '杭州', wuhan: '武漢', chongqing: '重慶', xian: '西安', nanjing: '南京', changsha: '長沙', suzhou: '蘇州', zhengzhou: '鄭州', tianjin: '天津', shenyang: '瀋陽', qingdao: '青島', hefei: '合肥', dalian: '大連', xiamen: '廈門', tokyo: '東京', osaka: '大阪', nagoya: '名古屋', yokohama: '橫濱', sapporo: '札幌', fukuoka: '福岡', kobe: '神戶', kyoto: '京都', seoul: '首爾', busan: '釜山', incheon: '仁川', taipei: '臺北', kaohsiung: '高雄', pyongyang: '平壤', singapore: '新加坡', bangkok: '曼谷', manila: '馬尼拉', kualalumpur: '吉隆坡', jakarta: '雅加達', delhi: '德里', mumbai: '孟買', bengaluru: '班加羅爾', kolkata: '加爾各答', tehran: '德黑蘭', dubai: '杜拜', riyadh: '利雅德', tashkent: '塔什干', istanbul: '伊斯坦堡', cairo: '開羅', moscow: '莫斯科', saintpetersburg: '聖彼得堡', kyiv: '基輔', paris: '巴黎', london: '倫敦', madrid: '馬德里', berlin: '柏林', barcelona: '巴塞隆納', stockholm: '斯德哥爾摩', munich: '慕尼黑', vienna: '維也納', budapest: '布達佩斯', prague: '布拉格', milan: '米蘭', hamburg: '漢堡', athens: '雅典', lyon: '里昂', warsaw: '華沙', lisbon: '里斯本', rome: '羅馬', bucharest: '布加勒斯特', brussels: '布魯塞爾', rotterdam: '鹿特丹', amsterdam: '阿姆斯特丹', frankfurt: '法蘭克福', stuttgart: '斯圖加特', cologne: '科隆', rhineruhr: '萊茵魯爾', zurich: '蘇黎世', copenhagen: '哥本哈根', oslo: '奧斯陸', helsinki: '赫爾辛基', newyork: '紐約', mexicocity: '墨西哥城', toronto: '多倫多', montreal: '蒙特婁', washington: '華盛頓特區', chicago: '芝加哥', vancouver: '溫哥華', boston: '波士頓', sanfrancisco: '舊金山', losangeles: '洛杉磯', philadelphia: '費城', saopaulo: '聖保羅', santiago: '聖地牙哥', caracas: '卡拉卡斯', buenosaires: '布宜諾斯艾利斯', riodejaneiro: '里約熱內盧', sydney: '雪梨', melbourne: '墨爾本', perth: '伯斯' };
  var LABEL = { 'Reading place names': '讀取地名', 'Reading street names': '讀取街道名稱', 'Finding the nearest named place': '尋找最近的具名地點' };
  var NOTE = {
    'Road and square names, kept in full': '道路與廣場名稱，保留全名', 'Roads, old city gates, and districts': '道路、舊城門與行政區', 'Roads and districts': '道路與行政區', 'Districts and landmarks first': '優先使用行政區與地標', 'Roads and local areas': '道路與當地地區', 'Short district names': '簡短的地區名稱', 'Local area names on steep terrain': '陡峭地形上的當地地名', 'Landmarks and city gates': '地標與城門', 'Roads, gates, and districts': '道路、城門與行政區', 'Roads, with many road-pair names': '道路，常以兩條路名組合', 'Roads and squares': '道路與廣場', 'Squares and local areas': '廣場與當地地區', 'Local areas and landmarks': '當地地區與地標',
    'District names, with 前 for a landmark in front of the station': '地區名稱，車站前有地標時加「前」', 'District names, with 前 for landmarks': '地區名稱，地標加「前」', 'Districts, with 前 for landmarks and institutions': '地區名稱，地標與機構加「前」', 'Numbered grid names and districts': '棋盤式編號地名與行政區', 'Street pairs from the old grid': '舊棋盤街區的街道組合', 'Neighbourhoods, with 입구 for a university entrance': '地區名稱，大學入口加「입구」', 'Neighbourhoods and institutions': '地區與機構',
    'Abstract revolutionary names in the real network. New names use local places': '實際路網使用抽象的革命名稱，新站名則採用當地地名', 'Landmarks, areas, and fused road pairs like 忠孝復興': '地標、地區，以及像「忠孝復興」這樣的路名組合', 'Landmarks and districts': '地標與行政區', 'Estate names and major roads': '住宅區名稱與主要道路', 'Soi, road, and area names': '巷弄（Soi）、道路與地區名稱', 'Avenue names without the road word': '大道名稱，省略道路用字', 'Districts and landmarks': '行政區與地標', 'Colony names and landmarks': '社區（Colony）名稱與地標', 'Suburb names': '郊區名稱', 'Areas and road names, sometimes paired': '地區與道路名稱，有時兩者並列', 'Areas and named landmarks': '地區與具名地標', 'Squares, streets, and landmarks': '廣場、街道與地標', 'Landmark and developer names': '地標與開發商名稱', 'Roads and institutions': '道路與機構',
    'Squares and named people, as in the Soviet model': '廣場與人名，沿襲蘇聯模式', 'Districts, sometimes paired with a landmark': '行政區，有時與地標並列', 'Named figures, squares, and districts': '人物、廣場與行政區', 'Squares, streets, and districts without the road word': '廣場、街道與行政區，省略道路用字', 'Squares, avenues, and landmarks without the road word': '廣場、大道與地標，省略道路用字', 'Squares and districts': '廣場與行政區', 'Street pairs joined with a hyphen, like Réaumur - Sébastopol': '以連字號連接的街道組合，例如 Réaumur - Sébastopol', 'Districts, then Road or Street names kept whole': '先用行政區，其次為保留全名的道路或街道', 'Streets and squares without the road word': '街道與廣場，省略道路用字', 'Squares and streets with their full ending': '廣場與街道，保留完整字尾', 'Streets and areas': '街道與地區', 'Short neighbourhood and square names': '簡短的地區與廣場名稱', 'Squares, streets, and districts': '廣場、街道與行政區', 'Squares and streets with tér or utca': '帶有 tér 或 utca 的廣場與街道', 'Squares and landmarks': '廣場與地標', 'Squares and streets without the road word': '廣場與街道，省略道路用字', 'Districts, with direction and transfer suffixes': '行政區，加上方位與轉乘字尾', 'Districts and classical landmarks': '行政區與古典地標', 'Squares, avenues, and districts': '廣場、大道與行政區', 'Squares, districts, and ancient landmarks': '廣場、行政區與古蹟', 'Squares and institutions': '廣場與機構', 'Districts and squares': '行政區與廣場', 'Town and district names': '城鎮與行政區名稱', 'Districts, squares, and landmarks': '行政區、廣場與地標', 'Districts': '行政區',
    'Numbered streets, written 34 St or Lexington Av/59 St': '編號街道，寫成 34 St 或 Lexington Av/59 St', 'Districts and historic figures': '行政區與歷史人物', 'Cross streets without the road word': '交叉街道，省略道路用字', 'Figures, streets, and institutions, paired with a hyphen': '人物、街道與機構，以連字號並列', 'Neighbourhoods paired with institutions': '地區與機構並列', 'Street names without the direction or road word': '街道名稱，省略方位與道路用字', 'Areas and streets': '地區與街道', 'Squares, neighbourhoods, and institutions': '廣場、地區與機構', 'Streets paired with districts': '街道與行政區並列', 'Cross streets written Wilshire/Vermont': '交叉街道，寫成 Wilshire/Vermont', 'Numbered and named streets': '編號與具名街道', 'Districts and institutions, paired with a hyphen': '行政區與機構，以連字號並列', 'Districts, avenues, and squares': '行政區、大道與廣場', 'Streets and historic figures without the road word': '街道與歷史人物，省略道路用字',
    'General scheme: neighbourhood, landmark, road, intersection, then a direction from the nearest place': '通用規則：依序使用地區、地標、道路、路口，最後才用相對最近地點的方位'
  };
  var ISSUE = [
    [/^(\d+) stations have no name$/, '$1 座車站沒有名稱'], [/^Stations (\d+), expected about (\d+)$/, '車站 $1 座，預期約 $2 座'], [/^(\d+) possible duplicate stations$/, '$1 座車站可能重複'], [/^Lines (\d+), expected (\d+)$/, '路線 $1 條，預期 $2 條'],
    [/^(\d+) lines?(\(s\))? have gaps in their track$/, '$1 條路線的軌道有缺口'], [/^(\d+) line\(s\) have no mapped track and are drawn straight between stops$/, '$1 條路線沒有軌道圖資，以直線連接各站'],
    [/^No lines in the default layer$/, '預設圖層沒有路線'], [/^Line (.+) has no track geometry$/, '路線 $1 沒有軌道幾何資料'], [/^Data file did not load$/, '資料檔載入失敗']
  ];
  var KEY = 'ma-ui-lang';
  function detect() {
    try { var v = localStorage.getItem(KEY); if (v === 'en' || v === 'zh') return v; } catch (e) { /* storage blocked */ }
    var l = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return /^zh/i.test(l) ? 'zh' : 'en';
  }
  var api = {
    lang: typeof navigator === 'undefined' ? 'en' : detect(),
    t: function (k, v) {
      var s = (api.lang === 'zh' ? ZH : EN)[k]; if (s === undefined) s = EN[k] === undefined ? k : EN[k];
      return v ? s.replace(/\{(\w+)\}/g, function (m, n) { return v[n] === undefined ? m : v[n]; }) : s;
    },
    set: function (l) { api.lang = l; try { localStorage.setItem(KEY, l); } catch (e) { /* storage blocked */ } },
    zh: function () { return api.lang === 'zh'; },
    city: function (c) { return api.lang === 'zh' && CITY[c.id] || c.name; },
    country: function (n) { return api.lang === 'zh' && COUNTRY[n] || n; },
    region: function (n) { return api.lang === 'zh' && REGION[n] || n; },
    note: function (n) { return api.lang === 'zh' && NOTE[n] || n; },
    label: function (n) { return api.lang === 'zh' && LABEL[n] || n; },
    issue: function (s) {
      if (api.lang !== 'zh') return s;
      for (var i = 0; i < ISSUE.length; i++) if (ISSUE[i][0].test(s)) return s.replace(ISSUE[i][0], ISSUE[i][1]);
      return s;
    },
    // Lets a search for a city or country work in either language, and treats 台 and 臺 as the same.
    searchText: function (c) { return (c.name + ' ' + c.local + ' ' + c.country + ' ' + (CITY[c.id] || '') + ' ' + (COUNTRY[c.country] || '')).toLowerCase().replace(/台/g, '臺'); },
    // Fills every element marked with data-i18n, data-i18n-html, data-i18n-ph or data-i18n-aria.
    apply: function (doc) {
      doc.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = api.t(el.dataset.i18n); });
      doc.querySelectorAll('[data-i18n-html]').forEach(function (el) { el.innerHTML = api.t(el.dataset.i18nHtml); });
      doc.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.placeholder = api.t(el.dataset.i18nPh); });
      doc.querySelectorAll('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', api.t(el.dataset.i18nAria)); });
      doc.documentElement.lang = api.lang === 'zh' ? 'zh-Hant-TW' : 'en';
      var m = doc.querySelector('meta[name=description]'); if (m) m.content = api.t('description');
    },
    _tables: { EN: EN, ZH: ZH, CITY: CITY, COUNTRY: COUNTRY, REGION: REGION, NOTE: NOTE, LABEL: LABEL }
  };
  root.I18N = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
