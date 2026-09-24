/*
 * Paylaşım bağlantısı: buketin tamamı küçük bir bayt dizisine kodlanıp
 * URL'nin #b=... kısmına (base64url) yazılır. Sunucu gerekmez; bağlantıyı
 * açan kişi buketi birebir aynı görür.
 *
 * Biçim (sürüm 1):
 *   [sürüm][bayraklar][yer sayısı][tohum:varint]
 *   [dış kağıt RGB][iç kağıt RGB][kurdele RGB][cipsofil RGB]
 *   [grup sayısı] her grup: [tür no][renk no]  (çizimde 255 + RGB = özel renk)
 *   her yer için: [grup no + 1] (0 = boş)
 *   dolu her yer için: [eklenme sırası t:varint]  (fotoğraf ve açı seçimi aynı kalsın)
 * Not: tür ve renk listelerine yeni öğeler yalnızca SONA eklenmeli (eski bağlantılar bozulmasın).
 */
(function () {
  const VERSION = 1;
  const AMOUNTS = ['az', 'dogal', 'bol'];

  function catalog(mode) {
    if (mode === 'real') {
      return {
        order: Real.ORDER,
        colors: (t) => Real.TYPES[t].colors.map(([name, key]) => ({ name, value: key })),
      };
    }
    return {
      order: Flowers.ORDER,
      colors: (t) => Flowers.FLOWERS[t].colors.map(([name, hex]) => ({ name, value: hex })),
    };
  }

  // ---------- bayt yazma / okuma ----------
  function writer() {
    const b = [];
    return {
      u8(v) { b.push(v & 255); },
      varint(v) { v = Math.max(0, Math.floor(v)); do { let x = v & 127; v = Math.floor(v / 128); if (v) x |= 128; b.push(x); } while (v); },
      rgb(hex) { const [r, g, bl] = U.hexToRgb(hex); b.push(r, g, bl); },
      bytes: b,
    };
  }
  function reader(bytes) {
    let i = 0;
    const need = (n) => { if (i + n > bytes.length) throw new Error('kısa veri'); };
    return {
      u8() { need(1); return bytes[i++]; },
      varint() { let v = 0, m = 1, x; do { need(1); x = bytes[i++]; v += (x & 127) * m; m *= 128; } while (x & 128 && m < 2 ** 35); return v; },
      rgb() { need(3); const h = U.rgbToHex(bytes[i], bytes[i + 1], bytes[i + 2]); i += 3; return h; },
    };
  }
  const toB64 = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const fromB64 = (s) => {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return Array.from(atob(s), (c) => c.charCodeAt(0));
  };

  // ---------- kodla ----------
  function encode(state, mode, view) {
    const cat = catalog(mode);
    const w = writer();
    w.u8(VERSION);
    const amount = Math.max(0, AMOUNTS.indexOf(state.filler.amount || 'dogal'));
    w.u8((mode === 'real' ? 1 : 0) | (view === '3d' ? 2 : 0) | (state.filler.gyps ? 4 : 0) |
      (state.filler.green ? 8 : 0) | (state.tie.style === 'twine' ? 16 : 0) | (amount << 5));
    w.u8(state.size);
    w.varint(state.seed || 0);
    w.rgb(state.wrap.outer);
    w.rgb(state.wrap.inner);
    w.rgb(state.tie.color);
    w.rgb(state.filler.gypsColor);
    // tür+renk grupları
    const groups = [];
    const keyOf = (s) => s.type + '|' + String(s.color).toLowerCase();
    const gIndex = new Map();
    state.slots.forEach((s) => {
      if (!s || gIndex.has(keyOf(s))) return;
      const ti = cat.order.indexOf(s.type);
      if (ti < 0) return;
      gIndex.set(keyOf(s), groups.length);
      groups.push(s);
    });
    w.u8(groups.length);
    groups.forEach((s) => {
      w.u8(cat.order.indexOf(s.type));
      const ci = cat.colors(s.type).findIndex((c) => String(c.value).toLowerCase() === String(s.color).toLowerCase());
      if (mode === 'real') w.u8(Math.max(0, ci));
      else if (ci >= 0 && ci < 255) w.u8(ci);
      else { w.u8(255); w.rgb(s.color); }
    });
    state.slots.forEach((s) => w.u8(s && gIndex.has(keyOf(s)) ? gIndex.get(keyOf(s)) + 1 : 0));
    state.slots.forEach((s) => { if (s && gIndex.has(keyOf(s))) w.varint(s.t || 0); });
    return toB64(w.bytes);
  }

  // ---------- çöz ----------
  function decode(code) {
    const r = reader(fromB64(code));
    const ver = r.u8();
    if (ver !== VERSION) throw new Error('bilinmeyen sürüm');
    const flags = r.u8();
    const mode = flags & 1 ? 'real' : 'draw';
    const cat = catalog(mode);
    const size = r.u8();
    if (size < Model.MIN_SIZE || size > Model.MAX_SIZE) throw new Error('geçersiz boyut');
    const seed = r.varint();
    const outer = r.rgb(), inner = r.rgb(), tie = r.rgb(), gyps = r.rgb();
    const n = r.u8();
    const groups = [];
    for (let i = 0; i < n; i++) {
      const type = cat.order[r.u8()];
      let ci = r.u8(), color, colorName;
      if (mode === 'draw' && ci === 255) { color = r.rgb(); colorName = 'Özel renk'; }
      if (!type) { groups.push(null); continue; }
      const list = cat.colors(type);
      if (color === undefined) {
        const c = list[ci] || list[0];
        color = c.value;
        colorName = c.name;
      }
      groups.push({ type, color, colorName });
    }
    const idx = [];
    for (let i = 0; i < size; i++) idx.push(r.u8());
    let maxT = 0;
    const slots = idx.map((g) => {
      const grp = g ? groups[g - 1] : null;
      if (g && g > groups.length) throw new Error('geçersiz grup');
      if (!grp) return null;
      const t = r.varint();
      maxT = Math.max(maxT, t);
      return { ...grp, t };
    });
    return {
      mode,
      view: flags & 2 ? '3d' : '2d',
      state: {
        size,
        slots,
        seq: maxT + 1,
        seed,
        wrap: { outer, inner },
        tie: { style: flags & 16 ? 'twine' : 'ribbon', color: tie },
        filler: { gyps: !!(flags & 4), gypsColor: gyps, green: !!(flags & 8), amount: AMOUNTS[(flags >> 5) & 3] || 'dogal' },
      },
    };
  }

  // URL'den kodu al (#b=...)
  function fromLocation(loc = location) {
    const m = /[#&]b=([A-Za-z0-9_-]+)/.exec(loc.hash || '');
    return m ? m[1] : null;
  }
  function url(code) {
    return location.href.split('#')[0] + '#b=' + code;
  }

  window.Share = { encode, decode, fromLocation, url };
})();
