/*
 * Gerçek 3B çiçek modelleri (kodla üretilir).
 * Her taç yaprak; uzunluk, genişlik profili, çanaklaşma, kıvrılma, uçta geriye
 * bükülme, kenar kıvrılması, dalgalanma gibi parametrelerle tanımlanan kavisli
 * bir yüzeydir. Çiçekler bu yaprakların sarmal / halka dizilimiyle oluşur.
 * Model koordinatları: çiçek ekseni +Y, taban orijinde, yarıçap ≈ 1.
 */
(function () {
  if (!window.THREE) return;
  const T = THREE;
  const { mergeGeometries } = T.BufferGeometryUtils;
  const TAU = Math.PI * 2;
  const GA = 2.399963229728653;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------- Renkler ----------
  const C = (hex) => new T.Color(hex);
  function pal(hex) {
    const p = U.palette(hex);
    return { deep: C(p.deep), dark: C(p.dark), base: C(p.base), light: C(p.light), lighter: C(p.lighter), shadow: C(p.shadow) };
  }
  const mixC = (a, b, t) => a.clone().lerp(b, clamp(t, 0, 1));
  const GREEN = { base: C('#4f7a32'), dark: C('#2f5220'), light: C('#86ad5a') };

  // ---------- Dokular (tuvalde üretilir) ----------
  function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    if (srgb) t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }
  // İnce damarlar: tabandan uca yelpaze
  const veinTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    const rnd = U.rng('veins');
    for (let i = 0; i < 46; i++) {
      const x = (i / 45) * w;
      g.strokeStyle = `rgba(90,60,60,${0.025 + rnd() * 0.035})`;
      g.lineWidth = 0.8 + rnd() * 1.4;
      g.beginPath();
      g.moveTo(w / 2, h);
      g.quadraticCurveTo(w / 2 + (x - w / 2) * 0.35, h * 0.55, x + (rnd() - 0.5) * 10, -4);
      g.stroke();
    }
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(80,50,50,${rnd() * 0.035})`;
      g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5);
    }
  });
  const bumpTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#808080';
    g.fillRect(0, 0, w, h);
    const rnd = U.rng('bump');
    for (let i = 0; i < 60; i++) {
      const x = (i / 59) * w;
      g.strokeStyle = `rgba(40,40,40,${0.18 + rnd() * 0.15})`;
      g.lineWidth = 1 + rnd() * 1.5;
      g.beginPath();
      g.moveTo(w / 2, h);
      g.quadraticCurveTo(w / 2 + (x - w / 2) * 0.35, h * 0.55, x, -4);
      g.stroke();
    }
  }, false);
  // Çiçek göbekleri
  function discTex(kind) {
    return canvasTex(512, 512, (g, w, h) => {
      const cx = w / 2, cy = h / 2, R = w / 2;
      const rnd = U.rng('disc' + kind);
      const conf = {
        sun: { bg: ['#2a1606', '#4a2a0f', '#6b4418'], dots: ['#7a5222', '#24130a'], ring: '#9a7a26', n: 900 },
        daisy: { bg: ['#f7c52c', '#e8a412', '#c47e08'], dots: ['#f9d858', '#c77a08'], ring: '#d99612', n: 700 },
        gerbera: { bg: ['#3f5d22', '#1f2e0e', '#2a1a0c'], dots: ['#6d8a35', '#141a08'], ring: '#f0c14a', n: 500 },
        anemone: { bg: ['#4a4262', '#1d1826', '#0e0b12'], dots: ['#6b6385', '#0b0a10'], ring: '#1c1420', n: 400 },
        yellow: { bg: ['#f2d24b', '#d9a92a', '#b8872a'], dots: ['#ffe27a', '#a8781c'], ring: '#caa232', n: 400 },
      }[kind];
      const grd = g.createRadialGradient(cx * 0.9, cy * 0.85, 4, cx, cy, R);
      grd.addColorStop(0, conf.bg[0]);
      grd.addColorStop(0.6, conf.bg[1]);
      grd.addColorStop(1, conf.bg[2]);
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < conf.n; i++) {
        const r = R * 0.96 * Math.sqrt((i + 0.5) / conf.n), a = i * GA;
        const s = 2 + (r / R) * 5;
        g.fillStyle = conf.dots[i % 2];
        g.beginPath();
        g.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, s, s * 0.8, a, 0, TAU);
        g.fill();
      }
      g.strokeStyle = conf.ring;
      g.lineWidth = 10;
      g.globalAlpha = 0.8;
      g.beginPath();
      g.arc(cx, cy, R * 0.93, 0, TAU);
      g.stroke();
    });
  }
  const discTexCache = {};
  const discTexture = (k) => (discTexCache[k] = discTexCache[k] || discTex(k));

  // ---------- Malzemeler ----------
  // Işık geçirgenliği taklidi: köşe rengine göre hafif "içten parlama"
  function withGlow(m, amount) {
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>\n#ifdef USE_COLOR\n totalEmissiveRadiance += vColor.rgb * ${amount.toFixed(3)};\n#endif`
      );
    };
    m.customProgramCacheKey = () => 'glow' + amount;
    return m;
  }
  const MAT = {
    petal: withGlow(new T.MeshPhysicalMaterial({
      vertexColors: true, map: veinTex, bumpMap: bumpTex, bumpScale: 0.6, roughness: 0.55, metalness: 0,
      sheen: 0.3, sheenRoughness: 0.7, sheenColor: new T.Color(0xffffff), side: T.DoubleSide,
    }), 0.035),
    leaf: withGlow(new T.MeshPhysicalMaterial({
      vertexColors: true, map: veinTex, roughness: 0.5, metalness: 0, sheen: 0.25, sheenColor: new T.Color(0xdfe9e2), side: T.DoubleSide,
    }), 0.05),
    plain: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: T.DoubleSide }),
  };
  const discMat = {};
  const discMaterial = (k) => (discMat[k] = discMat[k] || new T.MeshStandardMaterial({ map: discTexture(k), roughness: 0.85, bumpMap: discTexture(k), bumpScale: 1.2 }));

  // ---------- Taç yaprak yüzeyi ----------
  /*
   * p: L, W, shape [p1,p2] (genişlik profili), cup, curl, recurve, recStart, edgeRoll,
   *    ruffle, rufFreq, fold, twist, jag, nu, nv
   * col: {base, mid, tip} THREE.Color
   */
  function petal(p, col, rnd) {
    const nu = p.nu || 12, nv = p.nv || 18;
    const [p1, p2] = p.shape || [0.6, 0.4];
    const vs = p1 / (p1 + p2);
    const fmax = Math.pow(vs, p1) * Math.pow(1 - vs, p2);
    const widthAt = (v) => (p.W * Math.pow(Math.max(v, 1e-4), p1) * Math.pow(Math.max(1 - v, 0), p2)) / fmax;
    const ph = rnd() * TAU;
    const pos = [], nor = [], uv = [], clr = [], idx = [];
    // orta hat (uzunlamasına bükülme)
    const P = [new T.Vector3(0, 0, 0)];
    const TH = [];
    const ds = p.L / nv;
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      TH.push((p.curl || 0) * v + (p.recurve || 0) * smooth(p.recStart ?? 0.55, 1, v));
    }
    for (let j = 1; j <= nv; j++) {
      const th = (TH[j - 1] + TH[j]) / 2;
      P.push(P[j - 1].clone().add(new T.Vector3(0, Math.cos(th) * ds, Math.sin(th) * ds)));
    }
    const tint = 1 + (rnd() - 0.5) * 0.08;
    const tmp = new T.Color();
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      const th = TH[j];
      const N0 = new T.Vector3(0, -Math.sin(th), Math.cos(th));
      const B0 = new T.Vector3(1, 0, 0);
      const tw = (p.twist || 0) * v;
      const B = B0.clone().multiplyScalar(Math.cos(tw)).addScaledVector(N0, Math.sin(tw));
      const N = N0.clone().multiplyScalar(Math.cos(tw)).addScaledVector(B0, -Math.sin(tw));
      let w = widthAt(v);
      for (let i = 0; i <= nu; i++) {
        const u = -1 + (2 * i) / nu;
        const au = Math.abs(u);
        let ww = w;
        if (p.jag) ww *= 1 - p.jag * 0.5 * (1 + Math.sin(u * (p.jagFreq || 9) * Math.PI + ph)) * smooth(0.72, 1, v);
        let x = u * ww;
        let z;
        if (p.wrap) {
          // kesit, eksen etrafındaki halkaya (yarıçap rho) tam oturan yay
          const rho = Math.max(0.02, p.wrap(v));
          const ang = x / rho;
          x = rho * Math.sin(ang);
          z = rho * (1 - Math.cos(ang));
        } else {
          z = (p.cup || 0) * p.W * u * u * (0.3 + 0.7 * smooth(0, 0.45, v));
        }
        z -= (p.fold || 0) * p.W * au * 0.45;
        z += (p.ruffle || 0) * p.W * 0.16 * Math.sin((p.rufFreq || 5) * u * Math.PI + ph + v * 4) * Math.pow(au, 1.4) * smooth(0.25, 1, v);
        z -= (p.edgeRoll || 0) * p.W * 0.4 * smooth(0.5, 1, au) * smooth(0.3, 1, v);
        const q = P[j].clone().addScaledVector(B, x).addScaledVector(N, z);
        pos.push(q.x, q.y, q.z);
        uv.push(0.5 + 0.5 * u * (ww / p.W), v);
        // renk: taban koyu → orta → uç açık, kenarlar biraz açık
        if (v < 0.45) tmp.copy(col.base).lerp(col.mid, smooth(0, 0.45, v));
        else tmp.copy(col.mid).lerp(col.tip, smooth(0.45, 1, v));
        if (col.edge) tmp.lerp(col.edge, au * au * 0.35 * smooth(0.3, 1, v));
        tmp.multiplyScalar(tint * (0.72 + 0.28 * smooth(0, 0.25, v)));
        clr.push(tmp.r, tmp.g, tmp.b);
      }
    }
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i, b = a + nu + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new T.Float32BufferAttribute(clr, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  // Yaprağı çiçeğe yerleştir: phi eksen etrafındaki açı, alpha eksenden açılma açısı
  const _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _s = new T.Vector3(1, 1, 1);
  function place(geo, phi, alpha, r0 = 0, y0 = 0, scale = 1) {
    _e.set(-alpha, -phi - Math.PI / 2, 0, 'YXZ');
    _q.setFromEuler(_e);
    _s.set(scale, scale, scale);
    _m.compose(new T.Vector3(Math.cos(phi) * r0, y0, Math.sin(phi) * r0), _q, _s);
    geo.applyMatrix4(_m);
    return geo;
  }

  // Standart geometrilere renk ekle (birleştirme için ortak öznitelikler)
  function tint(geo, color) {
    const n = geo.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = color.r; arr[i * 3 + 1] = color.g; arr[i * 3 + 2] = color.b; }
    geo.setAttribute('color', new T.BufferAttribute(arr, 3));
    if (!geo.index) geo = T.BufferGeometryUtils.mergeVertices(geo);
    return geo;
  }
  const sphere = (r, color, sx = 1, sy = 1, sz = 1, seg = 12) => {
    const g = new T.SphereGeometry(r, seg, Math.max(6, seg * 0.6));
    g.scale(sx, sy, sz);
    return tint(g, color);
  };
  const tube = (points, r, color, seg = 12, radial = 5) => {
    const c = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(p[0], p[1], p[2])));
    return tint(new T.TubeGeometry(c, seg, r, radial, false), color);
  };
  const cap = (r, h, color, seg = 24) => {
    // tepesi hafif kubbeli disk (göbek) — doku yukarıdan izdüşümle
    const g = new T.SphereGeometry(r, seg, 10, 0, TAU, 0, Math.PI / 2);
    g.scale(1, h / r, 1);
    const pos = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + (pos.getX(i) / r) * 0.5, 0.5 - (pos.getZ(i) / r) * 0.5);
    return g;
  };

  // Çanak yapraklar + çiçek tablası
  function calyx(parts, rnd, n = 5, L = 0.4, alpha = 2.2, y = -0.02) {
    const col = { base: GREEN.dark, mid: GREEN.base, tip: GREEN.light };
    for (let i = 0; i < n; i++) {
      parts.push(place(petal({ L, W: 0.1, shape: [0.45, 1.1], cup: 0.4, recurve: -0.4, nu: 4, nv: 6 }, col, rnd), (i / n) * TAU + rnd() * 0.3, alpha, 0.05, y));
    }
    parts.push(sphere(0.1, GREEN.base, 1, 1.1, 1, 10).translate(0, -0.06, 0));
  }

  // ---------- Çiçek tarifleri ----------
  function spiralFlower(parts, rnd, pl, N, f) {
    for (let i = 0; i < N; i++) {
      const t = N === 1 ? 1 : i / (N - 1);
      const o = f(t, i);
      const col = {
        base: mixC(pl.deep, pl.dark, o.cb ?? t),
        mid: mixC(pl.dark, pl.base, 0.35 + 0.65 * (o.cm ?? t)),
        tip: mixC(pl.base, pl.light, 0.4 * (o.ct ?? t)),
        edge: pl.lighter,
      };
      const g = petal(o, col, rnd);
      parts.push(place(g, o.phi ?? i * GA + rnd() * 0.25, o.alpha, o.r0 || 0, o.y0 || 0));
    }
  }

  /*
   * Halkalı çiçek: her halkadaki yapraklar ortak bir koni/silindir yüzeyine sarılır,
   * kenarları birbirinin üzerine biner (gerçek gülde olduğu gibi).
   * rings: [{n, t}], f(t) → {L, alpha, r0, curl, recurve, edgeRoll, ruffle, overlap, shape, y0}
   */
  function ringFlower(parts, rnd, pl, rings, f) {
    rings.forEach((ring, k) => {
      const t = ring.t;
      const o = f(t, k);
      const sinA = Math.sin(o.alpha);
      const rhoAt = (v) => o.r0 + v * o.L * sinA * 0.92 + (o.rhoAdd ?? 0.03);
      const span = (TAU / ring.n) * (o.overlap ?? 1.35);
      const [p1, p2] = o.shape || [0.6, 0.35];
      const vw = p1 / (p1 + p2);
      const W = (span * rhoAt(vw)) / 2;
      const rot = (ring.rot ?? k * 0.62) + rnd() * 0.2;
      for (let j = 0; j < ring.n; j++) {
        const col = {
          base: mixC(pl.deep, pl.dark, o.cb ?? t),
          mid: mixC(pl.dark, pl.base, 0.35 + 0.65 * (o.cm ?? t)),
          tip: mixC(pl.base, pl.light, 0.4 * (o.ct ?? t)),
          edge: pl.lighter,
        };
        const dr = j * 0.012; // üst üste binen kenarlar çakışmasın
        const g = petal({ ...o, W, wrap: (v) => rhoAt(v) + dr, shape: o.shape || [0.6, 0.35] }, col, rnd);
        parts.push(place(g, rot + (j / ring.n) * TAU + (rnd() - 0.5) * 0.12, o.alpha + (rnd() - 0.5) * 0.05, o.r0 + dr, o.y0 || 0));
      }
    });
  }

  const R = {};
  R.rose = (pl, rnd, o = {}) => {
    const parts = [];
    let rings = [{ n: 3, t: 0 }, { n: 4, t: 0.14 }, { n: 5, t: 0.3 }, { n: 5, t: 0.47 }, { n: 5, t: 0.64 }, { n: 5, t: 0.8 }, { n: 6, t: 0.93 }, { n: 6, t: 1 }];
    if (o.n) rings = rings.slice(0, Math.max(2, Math.round((o.n / 30) * rings.length)));
    ringFlower(parts, rnd, pl, rings, (t) => ({
      L: 0.4 + 0.58 * t, alpha: 0.04 + 1.22 * Math.pow(t, 1.7), r0: 0.015 + 0.09 * t, y0: 0.05 * (1 - t),
      curl: 0.35 * (1 - t), recurve: -1.2 * Math.pow(t, 2.2), recStart: 0.58, edgeRoll: 1.25 * t * t,
      ruffle: 0.08, overlap: 1.45 - 0.2 * t, rhoAdd: 0.02,
    }));
    calyx(parts, rnd);
    return { parts };
  };
  R.sprayrose = (pl, rnd) => {
    const parts = [];
    const add = (geoParts, m) => geoParts.forEach((g) => parts.push(g.applyMatrix4(m)));
    const heads = [[-0.3, 0.06, -0.16, 0.64], [0.33, 0.0, 0.06, 0.6], [-0.03, -0.04, 0.36, 0.56]];
    heads.forEach(([x, y, z, s]) => {
      const r = R.rose(pl, rnd, { n: 16 }).parts;
      const m = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(z * 0.6, 0, -x * 0.6)), new T.Vector3(s, s, s));
      add(r, m);
      parts.push(tube([[x * 0.2, -0.3, z * 0.2], [x * 0.7, -0.15, z * 0.7], [x, y - 0.05, z]], 0.025, GREEN.base));
    });
    [[0.5, 0.08, -0.3], [-0.48, 0.04, 0.3]].forEach(([x, y, z]) => {
      const bud = R.rose(pl, rnd, { n: 7 }).parts;
      add(bud, new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(z * 0.8, 0, -x * 0.8)), new T.Vector3(0.32, 0.4, 0.32)));
      parts.push(tube([[x * 0.2, -0.3, z * 0.2], [x * 0.7, -0.12, z * 0.7], [x, y, z]], 0.02, GREEN.base));
    });
    return { parts };
  };
  R.peony = (pl, rnd) => {
    const parts = [];
    const rings = [];
    for (let k = 0; k < 9; k++) rings.push({ n: 5 + Math.round(k * 0.6), t: k / 8 });
    ringFlower(parts, rnd, pl, rings, (t) => ({
      L: 0.36 + 0.6 * t, alpha: 0.3 + 1.1 * Math.pow(t, 1.1), r0: 0.04 + 0.12 * t,
      curl: 0.4 * (1 - t), recurve: -0.35 * t, ruffle: 1.0 + rnd() * 0.4, rufFreq: 5 + rnd() * 3,
      edgeRoll: 0.15, overlap: 1.5, shape: [0.55, 0.3], rhoAdd: 0.05, twist: (rnd() - 0.5) * 0.4, nu: 10, nv: 13,
    }));
    calyx(parts, rnd, 5, 0.35);
    return { parts };
  };
  R.carnation = (pl, rnd) => {
    const parts = [];
    spiralFlower(parts, rnd, pl, 60, (t) => ({
      L: 0.34 + 0.5 * t, W: (0.34 + 0.5 * t) * 0.75, shape: [0.45, 0.2],
      alpha: 0.35 + 1.2 * t + (rnd() - 0.5) * 0.25, cup: 0.25, recurve: -0.2 * t,
      ruffle: 2.2, rufFreq: 15, jag: 0.55, jagFreq: 15, r0: 0.03 + 0.08 * t, twist: (rnd() - 0.5) * 0.9, nu: 14, nv: 10,
    }));
    parts.push(tint(new T.CylinderGeometry(0.12, 0.08, 0.34, 10, 1, true), GREEN.base).translate(0, -0.14, 0));
    calyx(parts, rnd, 5, 0.22, 0.5, -0.02);
    return { parts };
  };
  R.ranunculus = (pl, rnd) => {
    const parts = [];
    const rings = [];
    for (let k = 0; k < 11; k++) rings.push({ n: 5 + Math.round(k * 0.5), t: k / 10 });
    ringFlower(parts, rnd, pl, rings, (t) => ({
      L: 0.24 + 0.5 * t, alpha: 0.22 + 0.9 * Math.pow(t, 0.9), r0: 0.02 + 0.07 * t,
      curl: 0.5 * (1 - t) + 0.15, recurve: -0.15 * t * t, overlap: 1.5, shape: [0.55, 0.35], rhoAdd: 0.02, nu: 8, nv: 11,
    }));
    parts.push(sphere(0.05, C('#5f7d35')).translate(0, 0.12, 0));
    calyx(parts, rnd, 5, 0.3);
    return { parts };
  };
  R.dahlia = (pl, rnd) => {
    const parts = [];
    spiralFlower(parts, rnd, pl, 92, (t) => ({
      L: 0.18 + 0.64 * t, W: 0.1 + 0.16 * t, shape: [0.5, 1.0],
      alpha: 0.2 + 1.35 * Math.pow(t, 0.85), cup: 1.35, curl: -0.15 * t, r0: 0.02 + 0.12 * t, nu: 6, nv: 9,
    }));
    calyx(parts, rnd, 6, 0.3);
    return { parts };
  };
  R.lisianthus = (pl, rnd) => {
    const parts = [];
    ringFlower(parts, rnd, pl, [{ n: 5, t: 0.55, rot: 0.6 }, { n: 5, t: 1, rot: 0 }], (t) => ({
      L: 0.6 + 0.38 * t, alpha: 0.5 + 0.5 * t, r0: 0.04, curl: 0.1, recurve: -0.3 * t, ruffle: 0.7, rufFreq: 6,
      overlap: 1.5, shape: [0.55, 0.32], rhoAdd: 0.06, twist: 0.25, cm: 0.8, ct: 0.9,
    }));
    parts.push(tube([[0, 0, 0], [0, 0.18, 0], [0.02, 0.3, 0]], 0.02, C('#c7d98a')));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      parts.push(tube([[0, 0.02, 0], [Math.cos(a) * 0.06, 0.16, Math.sin(a) * 0.06], [Math.cos(a) * 0.08, 0.22, Math.sin(a) * 0.08]], 0.012, C('#e9e2a0'), 6, 4));
      parts.push(sphere(0.03, C('#f2cf3c'), 1, 0.6, 1, 6).translate(Math.cos(a) * 0.08, 0.23, Math.sin(a) * 0.08));
    }
    calyx(parts, rnd, 5, 0.35);
    return { parts };
  };
  R.tulip = (pl, rnd) => {
    const parts = [];
    const colOf = (inner) => ({ base: mixC(pl.dark, C('#7b8f3a'), 0.35), mid: inner ? pl.dark : pl.base, tip: mixC(pl.base, pl.light, 0.55), edge: pl.lighter });
    [0, 1].forEach((inner) => {
      const cupR = (v) => (inner ? 0.2 : 0.23) + 0.12 * Math.sin(Math.PI * Math.min(1, v * 1.1));
      for (let i = 0; i < 3; i++) {
        const W = (TAU / 3) * 0.62 * 0.3;
        parts.push(place(petal({ L: 1.2, W: W * (inner ? 0.95 : 1.05), shape: [0.9, 0.5], wrap: (v) => cupR(v) + (inner ? 0 : 0.03), curl: -0.02, recurve: -0.25, recStart: 0.7, nu: 12, nv: 16 },
          colOf(inner), rnd), (i / 3) * TAU + (inner ? Math.PI / 3 : 0) + (rnd() - 0.5) * 0.1, inner ? 0.02 : 0.06, inner ? 0.02 : 0.05, 0));
      }
    });
    parts.push(tube([[0, 0, 0], [0, 0.35, 0]], 0.05, C('#7f9c3e')));
    parts.push(sphere(0.12, GREEN.base, 1, 0.8, 1, 10).translate(0, -0.03, 0));
    return { parts, side: true };
  };
  R.lily = (pl, rnd) => {
    const parts = [];
    const pale = U.luminance('#' + pl.base.getHexString()) > 0.8;
    const throat = mixC(pl.base, C('#c9d67a'), pale ? 0.55 : 0.4);
    for (let i = 0; i < 6; i++) {
      const inner = i % 2 === 1;
      parts.push(place(petal({ L: 1.05, W: inner ? 0.3 : 0.34, shape: [0.45, 1.0], cup: 0.2, fold: 0.5, curl: 0.2, recurve: -1.35, recStart: 0.42, ruffle: inner ? 0.35 : 0.15, rufFreq: 7 }, {
        base: throat, mid: pale ? pl.base : pl.dark, tip: mixC(pl.base, pl.light, 0.7), edge: pl.lighter,
      }, rnd), (i / 6) * TAU + (rnd() - 0.5) * 0.1, 0.95, 0.03));
    }
    const anther = C('#7a3210'), fil = C('#d9e6b0');
    for (let i = 0; i < 6; i++) {
      const a = ((i + 0.5) / 6) * TAU + (rnd() - 0.5) * 0.3;
      const ex = Math.cos(a) * 0.55, ez = Math.sin(a) * 0.55;
      parts.push(tube([[0, 0.02, 0], [ex * 0.4, 0.4, ez * 0.4], [ex, 0.62, ez]], 0.012, fil, 10, 4));
      parts.push(sphere(0.05, anther, 1.4, 0.45, 0.5, 8).translate(ex, 0.64, ez));
    }
    parts.push(tube([[0, 0.02, 0], [0.05, 0.4, 0.02], [0.08, 0.72, 0.03]], 0.018, C('#bfd48a'), 10, 5));
    parts.push(sphere(0.045, C('#9eb865')).translate(0.08, 0.74, 0.03));
    calyx(parts, rnd, 3, 0.2);
    return { parts };
  };
  R.daisy = (pl, rnd) => {
    const parts = [];
    const col = { base: mixC(pl.dark, pl.base, 0.4), mid: pl.base, tip: pl.light, edge: pl.lighter };
    [[22, 0], [13, 0.5]].forEach(([n, off], row) => {
      for (let i = 0; i < n; i++) {
        parts.push(place(petal({ L: 0.8 - row * 0.06, W: 0.085, shape: [0.3, 0.28], cup: 0.25, recurve: -0.3, curl: 0.05, twist: (rnd() - 0.5) * 0.4, nu: 6, nv: 10 }, col, rnd),
          ((i + off) / n) * TAU + (rnd() - 0.5) * 0.06, 1.42 + (rnd() - 0.5) * 0.08 - row * 0.12, 0.17, row * 0.01));
      }
    });
    calyx(parts, rnd, 8, 0.2, 2.0);
    const yellowish = (() => { const [h, s, l] = U.toHsl('#' + pl.base.getHexString()); return h > 35 && h < 70 && s > 0.5 && l < 0.85; })();
    return { parts, disc: { kind: yellowish ? 'sun' : 'daisy', r: 0.2, h: 0.1, y: 0.0 } };
  };
  R.sunflower = (pl, rnd) => {
    const parts = [];
    [[24, 0, 0.62], [24, 0.5, 0.56]].forEach(([n, off, L], row) => {
      const col = row === 0 ? { base: pl.deep, mid: pl.dark, tip: pl.base } : { base: pl.dark, mid: pl.base, tip: pl.light, edge: pl.lighter };
      for (let i = 0; i < n; i++) {
        parts.push(place(petal({ L: L * (0.9 + rnd() * 0.15), W: 0.14, shape: [0.5, 0.9], cup: 0.3, fold: 0.2, recurve: -0.35, twist: (rnd() - 0.5) * 0.7, nu: 6, nv: 10 }, col, rnd),
          ((i + off) / n) * TAU, 1.38 - row * 0.1, 0.42, 0));
      }
    });
    calyx(parts, rnd, 12, 0.3, 1.9);
    return { parts, disc: { kind: 'sun', r: 0.45, h: 0.12, y: 0.0 } };
  };
  R.gerbera = (pl, rnd) => {
    const parts = [];
    const col = { base: pl.dark, mid: pl.base, tip: pl.light, edge: pl.lighter };
    for (let i = 0; i < 26; i++) parts.push(place(petal({ L: 0.66, W: 0.08, shape: [0.35, 0.3], cup: 0.3, recurve: -0.2, nu: 6, nv: 10 }, col, rnd), (i / 26) * TAU, 1.45 + (rnd() - 0.5) * 0.06, 0.25, 0));
    for (let i = 0; i < 26; i++) parts.push(place(petal({ L: 0.58, W: 0.075, shape: [0.35, 0.3], cup: 0.3, recurve: -0.15, nu: 6, nv: 10 }, col, rnd), ((i + 0.5) / 26) * TAU, 1.32, 0.25, 0.01));
    for (let i = 0; i < 30; i++) parts.push(place(petal({ L: 0.3, W: 0.04, shape: [0.35, 0.3], cup: 0.4, nu: 4, nv: 6 }, col, rnd), (i / 30) * TAU, 1.1, 0.22, 0.02));
    calyx(parts, rnd, 12, 0.25, 1.9);
    const light = U.luminance('#' + pl.base.getHexString()) > 0.75;
    return { parts, disc: { kind: light ? 'yellow' : 'gerbera', r: 0.26, h: 0.08, y: 0.01 } };
  };
  R.anemone = (pl, rnd) => {
    const parts = [];
    const col = { base: mixC(pl.dark, pl.base, 0.3), mid: pl.base, tip: pl.light, edge: pl.lighter };
    for (let i = 0; i < 6; i++) {
      parts.push(place(petal({ L: 0.92, W: 0.72, shape: [0.45, 0.38], cup: 0.4, recurve: -0.15, ruffle: 0.25 }, col, rnd), (i / 6) * TAU + (i % 2 ? 0.2 : 0), 1.25 - (i % 2) * 0.12, 0.05, (i % 2) * 0.01));
    }
    const dark = C('#1c1420');
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * TAU + rnd() * 0.05, r1 = 0.12, r2 = 0.24 + rnd() * 0.05;
      parts.push(tube([[Math.cos(a) * r1, 0.06, Math.sin(a) * r1], [Math.cos(a) * r2, 0.13, Math.sin(a) * r2]], 0.008, dark, 2, 3));
      parts.push(sphere(0.018, dark, 1, 1, 1, 5).translate(Math.cos(a) * r2, 0.135, Math.sin(a) * r2));
    }
    calyx(parts, rnd, 3, 0.2);
    return { parts, disc: { kind: 'anemone', r: 0.14, h: 0.12, y: 0.02 } };
  };
  R.orchid = (pl, rnd) => {
    const parts = [];
    const pale = U.luminance('#' + pl.base.getHexString()) > 0.8;
    const col = { base: pale ? mixC(pl.base, C('#f1d3e2'), 0.5) : pl.dark, mid: pl.base, tip: pl.light, edge: pl.lighter };
    // çanak yapraklar
    [[-Math.PI / 2, 0.92, 0.3], [Math.PI / 2 - 0.55, 0.85, 0.28], [Math.PI / 2 + 0.55, 0.85, 0.28]].forEach(([a, L, W]) =>
      parts.push(place(petal({ L, W, shape: [0.5, 0.8], cup: 0.25, recurve: -0.15 }, col, rnd), a, 1.5, 0.02)));
    // geniş taç yapraklar
    [-0.18, Math.PI + 0.18].forEach((a) => parts.push(place(petal({ L: 0.82, W: 0.8, shape: [0.35, 0.42], cup: 0.2, recurve: -0.2 }, col, rnd), a, 1.48, 0.03, 0.01)));
    // dudak
    const lip = pale ? C('#c2266f') : pl.deep;
    parts.push(place(petal({ L: 0.42, W: 0.26, shape: [0.5, 0.5], cup: 1.3, curl: 0.5 }, { base: C('#f2c94c'), mid: lip, tip: lip }, rnd), Math.PI / 2, 1.15, 0.02, 0.04));
    [-0.9, 0.9].forEach((d) => parts.push(place(petal({ L: 0.26, W: 0.16, shape: [0.5, 0.5], cup: 1.0, curl: 0.8 }, { base: C('#f2c94c'), mid: C('#f2c94c'), tip: C('#e8b73a') }, rnd), Math.PI / 2 + d, 1.0, 0.03, 0.05)));
    parts.push(sphere(0.07, C('#fbf7f2'), 0.8, 1.3, 0.7, 10).translate(0, 0.1, -0.03));
    return { parts };
  };
  R.hydrangea = (pl, rnd) => {
    const parts = [];
    parts.push(sphere(0.74, mixC(pl.dark, GREEN.dark, 0.4), 1, 0.85, 1, 18));
    const n = 44;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const polar = Math.acos(1 - t * 1.35); // üst yarım küreden biraz fazlası
      const az = i * GA;
      const nrm = new T.Vector3(Math.sin(polar) * Math.cos(az), Math.cos(polar), Math.sin(polar) * Math.sin(az));
      const mix = rnd();
      const col = { base: mixC(pl.dark, pl.base, 0.4), mid: mixC(pl.base, pl.light, mix * 0.5), tip: mixC(pl.light, pl.lighter, mix), edge: pl.lighter };
      const fl = [];
      const sz = 0.2 + rnd() * 0.05;
      for (let k = 0; k < 4; k++) fl.push(place(petal({ L: sz, W: sz * 0.95, shape: [0.45, 0.38], cup: 0.35, recurve: -0.2, nu: 5, nv: 5 }, col, rnd), (k / 4) * TAU + rnd() * 0.3, 1.35, 0.01));
      fl.push(sphere(0.02, pl.deep, 1, 1, 1, 5));
      const m = new T.Matrix4().compose(nrm.clone().multiplyScalar(0.76).multiply(new T.Vector3(1, 0.85, 1)), new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), nrm), new T.Vector3(1, 1, 1));
      fl.forEach((g) => parts.push(g.applyMatrix4(m)));
    }
    return { parts, offsetY: -0.1 };
  };
  R.anastasia = (pl, rnd) => {
    const parts = [];
    spiralFlower(parts, rnd, pl, 100, (t) => ({
      L: 0.4 + 0.55 * t, W: 0.05, shape: [0.2, 0.2], cup: 1.8, alpha: 0.3 + 1.3 * Math.pow(t, 0.8),
      recurve: 2.4, recStart: 0.78, curl: -0.1 * t, r0: 0.03 + 0.06 * t, nu: 4, nv: 12,
    }));
    calyx(parts, rnd, 6, 0.25);
    return { parts };
  };
  R.daffodil = (pl, rnd) => {
    const parts = [];
    const pale = U.luminance('#' + pl.base.getHexString()) > 0.8;
    const col = { base: mixC(pl.dark, pl.base, 0.3), mid: pl.base, tip: pl.light, edge: pl.lighter };
    for (let i = 0; i < 6; i++) parts.push(place(petal({ L: 0.82, W: 0.42, shape: [0.5, 0.7], cup: 0.2, recurve: -0.15, twist: 0.2 }, col, rnd), (i / 6) * TAU, 1.42 - (i % 2) * 0.08, 0.06, (i % 2) * 0.01));
    // taç tüp (korona)
    const cc = pal(pale ? '#f2b52a' : U.fromHsl(U.toHsl('#' + pl.base.getHexString())[0] - 12, 0.95, 0.5));
    const nu = 40, nv = 8, pos = [], clr = [], uv = [], idx = [];
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      for (let i = 0; i <= nu; i++) {
        const a = (i / nu) * TAU;
        let r = 0.08 + 0.13 * v + 0.07 * smooth(0.7, 1, v);
        r *= 1 + 0.09 * Math.sin(a * 12) * smooth(0.75, 1, v);
        pos.push(Math.cos(a) * r, 0.36 * v, Math.sin(a) * r);
        const c = mixC(cc.deep, cc.base, v).lerp(cc.light, smooth(0.85, 1, v));
        clr.push(c.r, c.g, c.b);
        uv.push(i / nu, v);
      }
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(clr, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    parts.push(g);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; parts.push(sphere(0.022, C('#f7dc6a'), 1, 1.6, 1, 6).translate(Math.cos(a) * 0.04, 0.22, Math.sin(a) * 0.04)); }
    calyx(parts, rnd, 3, 0.2);
    return { parts };
  };
  R.calla = (pl, rnd) => {
    const parts = [];
    const nu = 28, nv = 16, pos = [], clr = [], uv = [], idx = [];
    const green = C('#5f8a36');
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      for (let i = 0; i <= nu; i++) {
        const s = -1 + (2 * i) / nu; // -1..1 kenardan kenara
        const a = s * Math.PI * 0.92; // arka 0, ön ±π
        const back = Math.cos(a / 2); // 1 arkada, 0 önde
        let r = 0.05 + 0.3 * Math.pow(v, 1.3);
        r *= 1 + 0.35 * smooth(0.75, 1, Math.abs(s)) * smooth(0.5, 1, v); // kenarlar dışa kıvrık
        const y = 1.35 * v * (0.72 + 0.28 * back) + 0.3 * smooth(0.7, 1, v) * Math.pow(back, 6);
        const z = -Math.cos(a) * r - 0.12 * smooth(0.6, 1, v) * Math.pow(back, 4);
        pos.push(Math.sin(a) * r, y, z);
        const c = mixC(green, pl.dark, smooth(0, 0.35, v)).lerp(pl.base, smooth(0.3, 0.7, v)).lerp(pl.light, smooth(0.8, 1, v) * 0.5);
        clr.push(c.r, c.g, c.b);
        uv.push(i / nu, v);
      }
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(clr, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    parts.push(g);
    parts.push(tint(new T.CylinderGeometry(0.035, 0.045, 0.62, 10), C('#f2c73a')).translate(0, 0.42, -0.02));
    return { parts, side: true, height: 1.5 };
  };
  R.freesia = (pl, rnd) => {
    const parts = [];
    const rach = [[-0.1, -0.2, 0], [-0.05, 0.3, 0], [0.25, 0.62, 0], [0.7, 0.72, 0]];
    parts.push(tube(rach, 0.03, GREEN.base, 20, 5));
    const curve = new T.CatmullRomCurve3(rach.map((p) => new T.Vector3(...p)));
    const col = { base: mixC(pl.dark, C('#f4d35e'), 0.4), mid: pl.base, tip: pl.light, edge: pl.lighter };
    [[0.35, 1], [0.5, 0.92], [0.64, 0.8], [0.77, 0.62], [0.88, 0.45], [0.97, 0.35]].forEach(([t, s], k) => {
      const p = curve.getPointAt(t);
      const fl = [];
      if (s > 0.6) {
        for (let i = 0; i < 6; i++) fl.push(place(petal({ L: 0.36, W: 0.2, shape: [0.6, 0.45], cup: 0.6, recurve: -0.9, recStart: 0.45, nu: 6, nv: 8 }, col, rnd), (i / 6) * TAU, 0.42, 0.04));
        fl.push(tint(new T.CylinderGeometry(0.05, 0.02, 0.16, 8, 1, true), mixC(pl.base, GREEN.light, 0.4)).translate(0, -0.06, 0));
      } else {
        fl.push(sphere(0.09, mixC(pl.base, GREEN.base, 0.5), 0.7, 1.6, 0.7, 8).translate(0, 0.08, 0));
      }
      const m = new T.Matrix4().compose(p, new T.Quaternion().setFromEuler(new T.Euler(0, 0, -0.25 - k * 0.05)), new T.Vector3(s, s, s));
      fl.forEach((g) => parts.push(g.applyMatrix4(m)));
    });
    return { parts, side: true, offsetY: 0.1, height: 1.5 };
  };
  R.stock = (pl, rnd) => {
    const parts = [];
    parts.push(tube([[0, -0.2, 0], [0, 0.7, 0], [0, 1.45, 0]], 0.04, GREEN.base, 10, 5));
    const n = 30;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const y = 0.05 + t * 1.35;
      const a = i * GA;
      const s = 1 - t * 0.6;
      const nrm = new T.Vector3(Math.cos(a), 0.55, Math.sin(a)).normalize();
      const fl = [];
      if (t < 0.82) {
        const col = { base: pl.dark, mid: pl.base, tip: pl.light, edge: pl.lighter };
        for (let k = 0; k < 4; k++) fl.push(place(petal({ L: 0.2, W: 0.2, shape: [0.45, 0.35], cup: 0.3, ruffle: 0.9, rufFreq: 7, recurve: -0.2, nu: 6, nv: 6 }, col, rnd), (k / 4) * TAU + rnd(), 1.3, 0.01));
      } else {
        fl.push(sphere(0.07, mixC(pl.base, GREEN.light, 0.4), 1, 1.3, 1, 7));
      }
      const m = new T.Matrix4().compose(new T.Vector3(Math.cos(a) * 0.08, y, Math.sin(a) * 0.08), new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), nrm), new T.Vector3(s, s, s));
      fl.forEach((g) => parts.push(g.applyMatrix4(m)));
    }
    return { parts, side: true };
  };

  // ---------- Model oluşturma (önbellekli) ----------
  const cache = new Map();
  function build(type, hex, variant = 0) {
    const key = type + '|' + hex + '|' + variant;
    if (cache.has(key)) return cache.get(key);
    const recipe = R[type] || R.rose;
    const rnd = U.rng('f3d' + key);
    const res = recipe(pal(hex), rnd);
    const petals = mergeGeometries(res.parts.map((g) => (g.index ? g : T.BufferGeometryUtils.mergeVertices(g))), false);
    res.parts.forEach((g) => g.dispose());
    if (res.offsetY) petals.translate(0, res.offsetY, 0);
    let disc = null;
    if (res.disc) {
      disc = cap(res.disc.r, res.disc.h, null, 32);
      disc.translate(0, res.disc.y, 0);
    }
    // Boyutu standartlaştır: yandan görünenlerde yükseklik 1.6, diğerlerinde yatay yarıçap 1
    petals.computeBoundingBox();
    const bb = petals.boundingBox;
    const k = res.side ? (res.height || 1.35) / Math.max(0.1, bb.max.y) : 1 / Math.max(0.1, bb.max.x, -bb.min.x, bb.max.z, -bb.min.z);
    petals.scale(k, k, k);
    if (disc) disc.scale(k, k, k);
    petals.computeBoundingSphere();
    const out = { petals, disc, discKind: res.disc && res.disc.kind, side: !!res.side };
    cache.set(key, out);
    return out;
  }

  // Sahne nesnesi (paylaşılan geometri ve malzemeyle)
  function create(type, hex, variant = 0) {
    const m = build(type, hex, variant);
    const g = new T.Group();
    const mesh = new T.Mesh(m.petals, MAT.petal);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    if (m.disc) {
      const d = new T.Mesh(m.disc, discMaterial(m.discKind));
      d.castShadow = true;
      d.receiveShadow = true;
      g.add(d);
    }
    g.userData.side = m.side;
    return g;
  }

  // ---------- Yeşillik ----------
  // Yaprak dokusu: orta damar + yan damarlar + hafif benekler (renk köşe renginden gelir)
  const leafTex = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#e4e4e4';
    g.fillRect(0, 0, w, h);
    const rnd = U.rng('leaftex');
    for (let i = 0; i < 2600; i++) {
      const v = 200 + Math.floor(rnd() * 55);
      g.fillStyle = `rgba(${v},${v},${v},0.35)`;
      g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 3, 2 + rnd() * 3);
    }
    // yan damarlar
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineWidth = 2;
    for (let i = 0; i < 11; i++) {
      const y = h * (0.95 - i * 0.085);
      for (const sgn of [-1, 1]) {
        g.beginPath();
        g.moveTo(w / 2, y);
        g.quadraticCurveTo(w / 2 + sgn * w * 0.22, y - h * 0.05, w / 2 + sgn * w * 0.46, y - h * 0.13);
        g.stroke();
      }
    }
    // orta damar
    const grd = g.createLinearGradient(0, h, 0, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0.95)');
    grd.addColorStop(1, 'rgba(255,255,255,0.35)');
    g.strokeStyle = grd;
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(w / 2, h);
    g.lineTo(w / 2, 6);
    g.stroke();
  });
  leafTex.wrapS = leafTex.wrapT = T.ClampToEdgeWrapping;

  const LEAF_MAT = {
    // salal / ruskus: koyu, parlak
    gloss: new T.MeshPhysicalMaterial({ vertexColors: true, map: leafTex, roughness: 0.52, metalness: 0, clearcoat: 0.18, clearcoatRoughness: 0.45, side: T.DoubleSide }),
    // okaliptüs: mavimsi gri, mumsu (mat, hafif kadifemsi parlama)
    euc: new T.MeshPhysicalMaterial({ vertexColors: true, map: leafTex, roughness: 0.72, metalness: 0, sheen: 0.8, sheenRoughness: 0.6, sheenColor: new T.Color(0xdde8e3), side: T.DoubleSide }),
    stem: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }),
  };

  // Yeşil tonları (her yaprakta hafif farklı)
  const LEAF_COLS = {
    salal: [['#2c4a22', '#35592a', '#3f6a31', '#26401d'], ['#2f4d26', '#3a5e2e', '#476f36', '#29431f'], ['#34502a', '#3f6431', '#4e7a3c', '#2b4521']],
    ruscus: [['#2a4a1f', '#32592a', '#3d6a31', '#23401a']],
    euc: [['#6f8b80', '#86a196', '#9ab3a8', '#b3c6bd'], ['#748d86', '#8aa39e', '#a0b6b0', '#bac9c4'], ['#7a8e7e', '#91a594', '#a6b7a6', '#bfcabd'], ['#7e8a8a', '#94a2a0', '#a9b5b2', '#c0c4c9']],
  };
  function leafCol(kind, rnd) {
    const set = LEAF_COLS[kind][Math.floor(rnd() * LEAF_COLS[kind].length)];
    const j = 1 + (rnd() - 0.5) * 0.1;
    const c = set.map((h) => C(h).multiplyScalar(j));
    return { base: c[0], mid: c[1], tip: c[2], edge: c[3] };
  }

  // Tek yaprak (uzunluk 1, +Y boyunca, yüzü +Z), sapçıklı
  function leaf(kind, rnd) {
    let g;
    if (kind === 'euc') {
      // yuvarlak "gümüş dolar" yaprağı
      g = petal({ L: 1, W: 0.46 + rnd() * 0.06, shape: [0.42, 0.42], cup: 0.18, curl: 0.05, recurve: -0.12, twist: (rnd() - 0.5) * 0.3, ruffle: 0.06, nu: 8, nv: 8 }, leafCol('euc', rnd), rnd);
    } else if (kind === 'ruscus') {
      g = petal({ L: 1, W: 0.17, shape: [0.6, 0.9], fold: 0.35, recurve: -0.25, twist: (rnd() - 0.5) * 0.5, nu: 4, nv: 8 }, leafCol('ruscus', rnd), rnd);
    } else {
      // salal: geniş yumurta biçimli, uçu sivri, ortası katlanmış, ucu hafif geriye kıvrık
      g = petal({ L: 1, W: 0.31 + rnd() * 0.05, shape: [0.55, 0.75], fold: 0.28, curl: -0.08, recurve: -0.4 - rnd() * 0.3, recStart: 0.45, edgeRoll: 0.15, ruffle: 0.12, rufFreq: 3, twist: (rnd() - 0.5) * 0.35, nu: 8, nv: 12 }, leafCol('salal', rnd), rnd);
    }
    return g;
  }
  const leafCache = new Map();
  function leafGeometry(kind, variant = 0) {
    const key = kind + variant;
    if (!leafCache.has(key)) {
      const rnd = U.rng('leaf' + key);
      const parts = [leaf(kind, rnd).translate(0, 0.06, 0)];
      parts.push(tube([[0, -0.08, 0], [0, 0.07, 0.005]], 0.012, C(kind === 'euc' ? '#7a6b5a' : '#3a5a28'), 3, 4));
      leafCache.set(key, mergeGeometries(parts, false));
    }
    return leafCache.get(key);
  }
  function leafMesh(kind, variant = 0) {
    const m = new T.Mesh(leafGeometry(kind, variant % 5), kind === 'euc' ? LEAF_MAT.euc : LEAF_MAT.gloss);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  // Okaliptüs dalı (uzunluk 1, +Y boyunca büyür, +Z yönüne sarkar)
  const eucCache = new Map();
  function eucGeometry(variant = 0) {
    if (eucCache.has(variant)) return eucCache.get(variant);
    const rnd = U.rng('euc' + variant);
    const droop = 0.18 + rnd() * 0.22;
    const side = (rnd() - 0.5) * 0.12;
    const pts = [[0, 0, 0], [side * 0.3, 0.34, droop * 0.08], [side * 0.7, 0.66, droop * 0.35], [side, 0.94, droop]];
    const curve = new T.CatmullRomCurve3(pts.map((p) => new T.Vector3(...p)));
    const parts = [tube(pts, 0.009, C('#7d6656'), 24, 5)];
    const pairs = 9 + Math.floor(rnd() * 3);
    const up = new T.Vector3(), tg = new T.Vector3();
    for (let i = 0; i < pairs; i++) {
      const t = 0.1 + (i / (pairs - 1)) * 0.88;
      const p = curve.getPointAt(Math.min(t, 1));
      curve.getTangentAt(Math.min(t, 1), tg);
      // karşılıklı yapraklar, her çift bir öncekine göre 90° döner
      const phase = (i % 2) * (Math.PI / 2) + (rnd() - 0.5) * 0.35;
      const ref = Math.abs(tg.y) < 0.9 ? new T.Vector3(0, 1, 0) : new T.Vector3(1, 0, 0);
      const s0 = new T.Vector3().crossVectors(tg, ref).normalize();
      const s1 = new T.Vector3().crossVectors(tg, s0).normalize();
      const size = (0.17 - t * 0.08) * (0.9 + rnd() * 0.2);
      for (const sgn of [-1, 1]) {
        const sd = s0.clone().multiplyScalar(Math.cos(phase)).addScaledVector(s1, Math.sin(phase)).multiplyScalar(sgn);
        const lift = 0.35 + rnd() * 0.35; // uca doğru eğim
        const d = sd.clone().multiplyScalar(Math.cos(lift)).addScaledVector(tg, Math.sin(lift)).normalize();
        let nrm = new T.Vector3().crossVectors(tg, d).normalize();
        nrm.applyAxisAngle(d, (rnd() - 0.5) * 0.6);
        const x = new T.Vector3().crossVectors(d, nrm);
        const m = new T.Matrix4().makeBasis(x, d, nrm).scale(new T.Vector3(size, size, size)).setPosition(p);
        const lf = leaf('euc', rnd).translate(0, 0.08, 0);
        parts.push(lf.applyMatrix4(m));
      }
    }
    // uçta küçük tomurcuk yaprak
    const tip = curve.getPointAt(1);
    parts.push(sphere(0.012, C('#8aa39a'), 1, 1.6, 1, 6).translate(tip.x, tip.y, tip.z));
    const g = mergeGeometries(parts.map((q) => (q.index ? q : T.BufferGeometryUtils.mergeVertices(q))), false);
    eucCache.set(variant, g);
    return g;
  }
  function eucSprig(variant = 0) {
    const m = new T.Mesh(eucGeometry(variant % 6), LEAF_MAT.euc);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  // Ruskus dalı (çiçek aralarından uç veren ince yapraklar)
  const rusCache = new Map();
  function ruscusGeometry(variant = 0) {
    if (rusCache.has(variant)) return rusCache.get(variant);
    const rnd = U.rng('rus' + variant);
    const pts = [[0, 0, 0], [0.02, 0.4, 0.03], [0.05, 0.75, 0.1], [0.08, 1, 0.2]];
    const curve = new T.CatmullRomCurve3(pts.map((p) => new T.Vector3(...p)));
    const parts = [tube(pts, 0.008, C('#3a5a28'), 16, 4)];
    const tg = new T.Vector3();
    for (let i = 0; i < 9; i++) {
      const t = 0.15 + (i / 8) * 0.85;
      const p = curve.getPointAt(Math.min(t, 1));
      curve.getTangentAt(Math.min(t, 1), tg);
      const a = i * 2.4 + rnd() * 0.4;
      const ref = new T.Vector3(1, 0, 0);
      const s0 = new T.Vector3().crossVectors(tg, ref).normalize();
      const s1 = new T.Vector3().crossVectors(tg, s0).normalize();
      const sd = s0.multiplyScalar(Math.cos(a)).addScaledVector(s1, Math.sin(a));
      const d = sd.multiplyScalar(0.55).addScaledVector(tg, 0.83).normalize();
      const nrm = new T.Vector3().crossVectors(tg, d).normalize();
      const x = new T.Vector3().crossVectors(d, nrm);
      const size = 0.32 - t * 0.12;
      parts.push(leaf('ruscus', rnd).applyMatrix4(new T.Matrix4().makeBasis(x, d, nrm).scale(new T.Vector3(size, size, size)).setPosition(p)));
    }
    const g = mergeGeometries(parts.map((q) => (q.index ? q : T.BufferGeometryUtils.mergeVertices(q))), false);
    rusCache.set(variant, g);
    return g;
  }
  function ruscusSprig(variant = 0) {
    const m = new T.Mesh(ruscusGeometry(variant % 4), LEAF_MAT.gloss);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  // ---------- Buketin iç yaprak dokusu (örneklenmiş yapraklar) ----------
  // Nötr (gri) köşe renkli yapraklar; asıl yeşil tonu her örneğe ayrı verilir.
  const NEUTRAL = { base: C('#9a9a9a'), mid: C('#d0d0d0'), tip: C('#ececec'), edge: C('#f4f4f4') };
  const fillerLeafCache = [];
  function fillerLeafGeo(variant = 0) {
    if (!fillerLeafCache[variant]) {
      const rnd = U.rng('fleaf' + variant);
      const g = variant === 1
        ? petal({ L: 1, W: 0.15, shape: [0.6, 0.9], fold: 0.35, recurve: -0.35, twist: 0.3, nu: 4, nv: 7 }, NEUTRAL, rnd)
        : petal({ L: 1, W: 0.33, shape: [0.5, 0.6], fold: 0.22, recurve: -0.3, ruffle: 0.22, rufFreq: 4, twist: 0.15, nu: 6, nv: 7 }, NEUTRAL, rnd);
      fillerLeafCache[variant] = g;
    }
    return fillerLeafCache[variant];
  }
  const fillerLeafMat = new T.MeshPhysicalMaterial({ vertexColors: true, map: leafTex, roughness: 0.55, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.5, side: T.DoubleSide });

  // Cipsofil sapı (örneklenmiş ince silindir; taban orijinde, +Y boyunca 1 birim)
  const gypsStemGeo = new T.CylinderGeometry(1, 1, 1, 5, 1, true).translate(0, 0.5, 0);
  const gypsStemMat = new T.MeshStandardMaterial({ color: 0x8a9d78, roughness: 0.8 });

  // Cipsofil çiçekçiği (örneklenmiş kullanım için)
  const gypsGeo = (() => {
    const g = new T.IcosahedronGeometry(1, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      pos.setY(i, y * 0.6);
    }
    g.computeVertexNormals();
    return g;
  })();
  const gypsMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, emissive: 0xffffff, emissiveIntensity: 0.1 });

  window.Flowers3D = { create, leafMesh, eucSprig, ruscusSprig, fillerLeafGeo, fillerLeafMat, gypsGeo, gypsMat, gypsStemGeo, gypsStemMat, MAT, LEAF_MAT, recipes: Object.keys(R) };
})();
