/*
 * Buket modeli: buket boyutuna göre çiçek yerleri (slot) üretir ve
 * çiçek ekleme / taşıma / çıkarma işlemlerini yönetir.
 *
 * Durum yapısı:
 *   { size, slots: [ {type, color, colorName, t} | null ], seq, seed, wrap, tie, filler }
 */
(function () {
  const GA = 2.399963229728653; // altın açı
  const SPACING = 50; // iki çiçek yeri arasındaki hedef mesafe (dünya birimi)
  const SQ = 0.84; // 2B önden görünümde kubbenin dikey basıklığı

  const SIZES = [
    { n: 7, label: 'Mini' },
    { n: 12, label: 'Küçük' },
    { n: 19, label: 'Orta' },
    { n: 27, label: 'Büyük' },
    { n: 37, label: 'Gösterişli' },
  ];
  const MIN_SIZE = 3, MAX_SIZE = 60;

  // ---------- Yer düzeni ----------
  const cache = new Map();
  function layout(size) {
    if (cache.has(size)) return cache.get(size);
    const pts = [];
    const c = SPACING / 1.9;
    for (let i = 0; i < size; i++) {
      const r = c * Math.sqrt(i);
      pts.push({ x: Math.cos(i * GA) * r, y: Math.sin(i * GA) * r });
    }
    // Basit itme ile aralıkları eşitle (petek benzeri, doğal dağılım)
    for (let it = 0; it < 120; it++) {
      for (let a = 0; a < size; a++) {
        for (let b = a + 1; b < size; b++) {
          const dx = pts[b].x - pts[a].x, dy = pts[b].y - pts[a].y;
          const d = Math.hypot(dx, dy) || 0.001;
          if (d < SPACING) {
            const push = ((SPACING - d) / d) * 0.25;
            pts[a].x -= dx * push; pts[a].y -= dy * push;
            pts[b].x += dx * push; pts[b].y += dy * push;
          }
        }
      }
      // kubbeyi toplu tut
      pts.forEach((p) => { p.x *= 0.992; p.y *= 0.992; });
    }
    // Ortadan dışa doğru sırala: 0 numara merkezdedir
    const cx = pts.reduce((a, p) => a + p.x, 0) / size, cy = pts.reduce((a, p) => a + p.y, 0) / size;
    pts.forEach((p) => { p.x -= cx; p.y -= cy; });
    pts.sort((p, q) => Math.hypot(p.x, p.y) - Math.hypot(q.x, q.y) || Math.atan2(p.y, p.x) - Math.atan2(q.y, q.x));
    const R = Math.max(SPACING * 0.5, ...pts.map((p) => Math.hypot(p.x, p.y))) + SPACING * 0.5;
    const res = { pts, R };
    cache.set(size, res);
    return res;
  }

  // 3B: düz yerleşimi küresel bir kubbe başlığına sar
  const PHI_MAX = 1.12; // en dıştaki çiçeklerin eğim açısı (radyan, ~64°)
  function layout3D(size) {
    const { pts, R } = layout(size);
    const Rs = R / PHI_MAX;
    return {
      Rs,
      R,
      pts: pts.map((p) => {
        const rho = Math.hypot(p.x, p.y);
        const a = Math.atan2(p.y, p.x);
        const phi = rho / Rs;
        // 2B'de yukarı (y<0) = bukette arka taraf (z<0)
        const nx = Math.sin(phi) * Math.cos(a), nz = Math.sin(phi) * Math.sin(a), ny = Math.cos(phi);
        return { nx, ny, nz, phi, a };
      }),
    };
  }

  // ---------- Yardımcılar ----------
  const keyOf = (f) => f.type + '|' + String(f.color).toLowerCase();
  const filledCount = (st) => st.slots.filter(Boolean).length;
  const emptySlots = (st) => st.slots.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);

  // Bukettekileri tür+renk olarak grupla (ilk eklenme sırasına göre)
  function groups(st) {
    const map = new Map();
    st.slots.forEach((s, i) => {
      if (!s) return;
      const k = keyOf(s);
      if (!map.has(k)) map.set(k, { key: k, type: s.type, color: s.color, colorName: s.colorName, slots: [], first: s.t });
      const g = map.get(k);
      g.slots.push(i);
      g.first = Math.min(g.first, s.t);
    });
    return Array.from(map.values()).sort((a, b) => a.first - b.first);
  }

  // Otomatik yerleştirme: aynı çiçekler bukete eşit dağılsın, önce ortadaki yerler dolsun
  function placeAuto(st, flower, count) {
    const { pts } = layout(st.size);
    const placed = [];
    const k = keyOf(flower);
    for (let c = 0; c < count; c++) {
      const empty = emptySlots(st);
      if (!empty.length) break;
      const same = st.slots.map((s, i) => (s && keyOf(s) === k ? i : -1)).filter((i) => i >= 0);
      let best = empty[0], bestScore = -Infinity;
      const rnd = U.rng('auto' + st.seq + ':' + c);
      empty.forEach((i) => {
        const p = pts[i];
        let minD = 400;
        same.forEach((j) => { minD = Math.min(minD, Math.hypot(p.x - pts[j].x, p.y - pts[j].y)); });
        const score = minD - Math.hypot(p.x, p.y) * 0.45 + rnd() * 6;
        if (score > bestScore) { bestScore = score; best = i; }
      });
      st.slots[best] = { type: flower.type, color: flower.color, colorName: flower.colorName, t: st.seq++ };
      placed.push(best);
    }
    return placed;
  }

  function placeAt(st, i, flower) {
    st.slots[i] = { type: flower.type, color: flower.color, colorName: flower.colorName, t: st.seq++ };
  }

  function move(st, from, to) {
    if (from === to) return;
    const a = st.slots[from];
    st.slots[from] = st.slots[to];
    st.slots[to] = a;
  }

  // Bir gruptan en son ekleneni çıkar
  function removeOneOf(st, key) {
    let idx = -1, t = -1;
    st.slots.forEach((s, i) => { if (s && keyOf(s) === key && s.t > t) { t = s.t; idx = i; } });
    if (idx >= 0) st.slots[idx] = null;
    return idx;
  }
  function removeGroup(st, key) {
    st.slots = st.slots.map((s) => (s && keyOf(s) === key ? null : s));
  }

  // Boyut değiştir: dışarıda kalan çiçekleri boş iç yerlere taşı; sığmayanları çıkar
  function resize(st, size) {
    size = U.clamp(Math.round(size), MIN_SIZE, MAX_SIZE);
    if (size === st.size) return 0;
    const old = st.slots;
    const flowers = [];
    const next = new Array(size).fill(null);
    old.forEach((s, i) => {
      if (!s) return;
      if (i < size) next[i] = s; else flowers.push(s);
    });
    let dropped = 0;
    flowers.sort((a, b) => a.t - b.t).forEach((f) => {
      const e = next.indexOf(null);
      if (e >= 0) next[e] = f; else dropped++;
    });
    st.size = size;
    st.slots = next;
    return dropped;
  }

  // Çiçeklerin yerlerini karıştır (dolu yerler arasında)
  function shuffle(st) {
    const idx = st.slots.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
    const fl = idx.map((i) => st.slots[i]);
    const rnd = U.rng('shuf' + Date.now());
    for (let i = fl.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [fl[i], fl[j]] = [fl[j], fl[i]];
    }
    idx.forEach((i, k) => (st.slots[i] = fl[k]));
    st.seed = (st.seed || 0) + 1;
  }

  // Aynı türleri kümeleyerek değil, bukete yayarak yeniden düzenle
  function spreadEvenly(st) {
    const fl = st.slots.filter(Boolean).sort((a, b) => a.t - b.t);
    st.slots = new Array(st.size).fill(null);
    const byKey = new Map();
    fl.forEach((f) => {
      const k = keyOf(f);
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(f);
    });
    // büyük gruplar önce
    Array.from(byKey.values()).sort((a, b) => b.length - a.length).forEach((list) => {
      const idx = placeAuto(st, list[0], list.length);
      idx.forEach((i, k) => (st.slots[i] = list[k]));
    });
  }

  function migrateV1(old) {
    // Eski sürüm (items + seqs) → yeni slot modeli
    const flowers = [];
    (old.items || []).forEach((it) => it.seqs.forEach((seq) => flowers.push({ type: it.type, color: it.color, colorName: it.colorName, t: seq })));
    flowers.sort((a, b) => a.t - b.t);
    const size = SIZES.find((s) => s.n >= flowers.length)?.n || U.clamp(flowers.length, MIN_SIZE, MAX_SIZE);
    const st = { size, slots: new Array(size).fill(null), seq: (old.seq || flowers.length) + 1, seed: 0, wrap: old.wrap, tie: old.tie, filler: old.filler };
    flowers.slice(0, size).forEach((f) => placeAuto(st, f, 1));
    return st;
  }

  window.Model = {
    SIZES, MIN_SIZE, MAX_SIZE, SPACING, SQ, layout, layout3D, keyOf, filledCount, emptySlots, groups,
    placeAuto, placeAt, move, removeOneOf, removeGroup, resize, shuffle, spreadEvenly, migrateV1,
  };
})();
