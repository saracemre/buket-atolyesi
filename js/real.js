/*
 * Gerçek çiçek kataloğu: arka planı temizlenmiş gerçek fotoğraflardan
 * (Wikimedia Commons) tür / renk listesi ve buket çizicisi için fotoğraf sağlayıcı.
 */
(function () {
  const MAN = window.REAL_MANIFEST || [];
  const ASSETS = window.REAL_ASSETS || {};

  // r2d: 2B buketteki çiçek yarıçapı (yer aralığı 50 birim; hafif üst üste binme için ~28–36)
  const INFO = {
    rose: { name: 'Gül', size: 36, shape: 'ball', depth: 0.42 },
    peony: { name: 'Şakayık', size: 46, shape: 'ball', depth: 0.5 },
    tulip: { name: 'Lale', size: 34, shape: 'side', side: true },
    hydrangea: { name: 'Ortanca', size: 50, shape: 'ball', depth: 0.62 },
    lily: { name: 'Lilyum', size: 48, shape: 'flat', depth: 0.14 },
    lisianthus: { name: 'Lisyantus', size: 36, shape: 'ball', depth: 0.4 },
    daisy: { name: 'Papatya', size: 31, shape: 'flat', depth: 0.1 },
    gerbera: { name: 'Gerbera', size: 38, shape: 'flat', depth: 0.1 },
    sunflower: { name: 'Ayçiçeği', size: 45, shape: 'flat', depth: 0.1 },
    carnation: { name: 'Karanfil', size: 33, shape: 'ball', depth: 0.4 },
    orchid: { name: 'Orkide', size: 40, shape: 'flat', depth: 0.08 },
    ranunculus: { name: 'Düğün Çiçeği', size: 34, shape: 'ball', depth: 0.45 },
    dahlia: { name: 'Dalya', size: 40, shape: 'ball', depth: 0.35 },
    anemone: { name: 'Anemon', size: 34, shape: 'flat', depth: 0.1 },
  };
  const R2D = {
    rose: 30, peony: 34, tulip: 29, hydrangea: 36, lily: 34, lisianthus: 30, daisy: 27, gerbera: 30,
    sunflower: 33, carnation: 28, orchid: 30, ranunculus: 29, dahlia: 31, anemone: 28,
  };
  const ORDER = ['rose', 'peony', 'tulip', 'hydrangea', 'lily', 'lisianthus', 'daisy', 'gerbera', 'sunflower', 'carnation', 'orchid', 'ranunculus', 'dahlia', 'anemone'];
  const COLOR_NAMES = {
    kirmizi: 'Kırmızı', pembe: 'Pembe', beyaz: 'Beyaz', sari: 'Sarı', seftali: 'Şeftali', fusya: 'Fuşya', mercan: 'Mercan',
    koyu: 'Koyu Pembe', mavi: 'Mavi', lila: 'Lila', turuncu: 'Turuncu', somon: 'Somon', krem: 'Krem', mor: 'Mor',
  };
  // Yeşillik fotoğrafları: (ax, ay) dalın tutturma noktası, rot dalı yukarı çeviren açı (derece)
  const GREENS = [
    { key: 'green-euc-1', ax: 0.5, ay: 1, rot: 0 },
    { key: 'green-euc-2', ax: 0.02, ay: 0.3, rot: -90 },
    { key: 'green-euc-3', ax: 0.45, ay: 1, rot: 0 },
  ];
  const GYPS = { key: 'gyps-1', ax: 0.02, ay: 0.98, rot: -53 };

  // data: adreslerini bir kez Blob adresine çevir (DOM'u hafif tutar)
  const blobUrls = {};
  function url(id) {
    if (blobUrls[id]) return blobUrls[id];
    const d = ASSETS[id];
    if (!d) return '';
    try {
      const [head, b64] = d.split(',');
      const mime = head.slice(5, head.indexOf(';'));
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      blobUrls[id] = URL.createObjectURL(new Blob([arr], { type: mime }));
    } catch (e) {
      blobUrls[id] = d;
    }
    return blobUrls[id];
  }
  const dataUrl = (id) => ASSETS[id] || '';

  // Katalog
  const byId = {};
  const TYPES = {};
  MAN.forEach((m) => {
    byId[m.id] = m;
    if (!INFO[m.type]) return;
    const t = (TYPES[m.type] = TYPES[m.type] || { ...INFO[m.type], photos: {}, colors: [] });
    if (!t.photos[m.color]) {
      t.photos[m.color] = [];
      t.colors.push([COLOR_NAMES[m.color] || m.color, m.color, m.swatch]);
    }
    t.photos[m.color].push(m.id);
  });
  // Renkleri tanıdık bir sıraya koy (kırmızı, pembe, beyaz ...)
  const PREF = ['kirmizi', 'pembe', 'beyaz', 'mavi', 'lila', 'mor', 'sari', 'turuncu', 'seftali', 'mercan', 'somon', 'fusya', 'koyu', 'krem'];
  Object.values(TYPES).forEach((t) => t.colors.sort((a, b) => PREF.indexOf(a[1]) - PREF.indexOf(b[1])));
  const order = ORDER.filter((t) => TYPES[t]);

  function photoFor(type, color, t) {
    const T = TYPES[type];
    if (!T) return null;
    const list = T.photos[color] || Object.values(T.photos)[0];
    const n = typeof t === 'number' ? Math.abs(t) : t ? U.hash(t) : 0;
    const id = list[n % list.length];
    const m = byId[id];
    return { id: 'ph-' + id, key: id, href: url(id), w: m.w, h: m.h, cx: m.cx ?? 0.5, cy: m.cy ?? 0.5, r: m.r || Math.max(m.w, m.h) / 2, side: !!T.side, swatch: m.swatch };
  }
  const assetDef = (g) => {
    const m = byId[g.key];
    return m ? { id: 'ph-' + g.key, key: g.key, href: url(g.key), w: m.w, h: m.h, ax: g.ax, ay: g.ay, rot: g.rot } : null;
  };

  // Buket çiziciler için sağlayıcı
  function provider() {
    return {
      // 2B: çiçeğin etkin yarıçapı = boyut × 0.8
      size: (type) => (R2D[type] || 30) / 0.8,
      info3d: (type) => {
        const T = TYPES[type] || INFO.rose;
        return { size: T.size, shape: T.shape, depth: T.depth };
      },
      head: (slot) => photoFor(slot.type, slot.color, slot.t),
      greens: GREENS.map(assetDef).filter(Boolean),
      gyps: assetDef(GYPS),
    };
  }

  // Dışa aktarma için: SVG içindeki blob adreslerini data: adresleriyle değiştir
  function inlineForExport(svg) {
    Object.entries(blobUrls).forEach(([id, u]) => {
      if (u.startsWith('blob:')) svg = svg.split(u).join(ASSETS[id]);
    });
    return svg;
  }

  window.Real = {
    available: MAN.length > 0,
    TYPES,
    ORDER: order,
    url,
    dataUrl,
    photoFor,
    provider,
    inlineForExport,
    paperTex: ASSETS.paper || null,
    paperNormal: ASSETS.paperNormal || null,
    credits: window.REAL_CREDITS || {},
    textureCredit: window.REAL_TEXTURE_CREDIT || '',
  };
})();
