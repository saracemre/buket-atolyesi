/*
 * Çiçekçilerde sık kullanılan ek çiçek türleri.
 * flowers.js'deki yardımcılarla aynı koordinat sisteminde (yarıçap ~100) çizilir.
 */
(function () {
  const { n, pt } = U;
  const { FLOWERS, radial, linear, stops } = Flowers;
  const { gid, roundPetal, ruffledPetal, slenderPetal, crescent, draw } = Flowers.helpers;
  const P = pt;

  // objectBoundingBox radyal gradyan (şekle göre ölçeklenir)
  function bradial(ctx, id, list, cx = 0.45, cy = 0.4, r = 0.62) {
    ctx.def(id, `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops(list)}</radialGradient>`);
    return `url(#${id})`;
  }
  const petalGroup = (a, d, fill, p, extra = '', shadowOp = 0.28) =>
    `<g transform="rotate(${n(a)})">` +
    `<path d="${d}" fill="${p.shadow}" opacity="${shadowOp}" transform="translate(0 3) scale(1.03)"/>` +
    `<path d="${d}" fill="${fill}" stroke="${p.deep}" stroke-opacity=".32" stroke-width=".7"/>` +
    extra +
    `</g>`;

  // ---------- ORTANCA ----------
  function hydrangea(ctx, hex, rnd) {
    const p = U.palette(hex);
    const ball = radial(ctx, gid(ctx, 'hyd', hex, 'b'), [[0, p.dark], [0.8, p.deep], [1, p.deep]], 80, -15, -20);
    const pet = linear(ctx, gid(ctx, 'hyd', hex, 'p'), [[0, p.dark], [0.45, p.base], [1, p.light]]);
    const petL = linear(ctx, gid(ctx, 'hyd', hex, 'q'), [[0, p.base], [0.5, p.light], [1, p.lighter]]);
    let s = `<circle r="80" fill="${ball}"/>`;
    const N = 62;
    const florets = [];
    for (let i = 0; i < N; i++) {
      const r = 84 * Math.sqrt((i + 0.5) / N);
      const a = i * 2.39996 + rnd() * 0.3;
      florets.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, r });
    }
    florets.sort((a, b) => b.r - a.r);
    florets.forEach((f) => {
      const edge = f.r / 92;
      const sz = 19 * (0.88 + rnd() * 0.26);
      const rot = rnd() * 90;
      const phi = (Math.atan2(f.y, f.x) * 180) / Math.PI;
      const sq = 0.5 + 0.5 * Math.sqrt(Math.max(0, 1 - edge * edge));
      const fill = f.r < 50 ? petL : pet;
      let fl = '';
      for (let j = 0; j < 4; j++) {
        fl += `<path d="${roundPetal(sz, sz * 0.66)}" transform="rotate(${n(rot + j * 90 + (rnd() - 0.5) * 16)})" fill="${fill}" stroke="${p.deep}" stroke-opacity=".35" stroke-width=".6"/>`;
      }
      s +=
        `<g transform="translate(${P(f.x, f.y)}) rotate(${n(phi)}) scale(${n(sq)} 1) rotate(${n(-phi)})">` +
        `<circle r="${n(sz * 0.9)}" fill="${p.shadow}" opacity=".28" transform="translate(1.5 2.5)"/>` +
        fl +
        `<circle r="${n(sz * 0.13)}" fill="${p.deep}"/><circle r="${n(sz * 0.06)}" cx="-.5" cy="-.5" fill="${p.lighter}"/></g>`;
    });
    return s;
  }

  // ---------- LİSYANTUS ----------
  function lisianthus(ctx, hex, rnd) {
    const p = U.palette(hex);
    const out = radial(ctx, gid(ctx, 'lis', hex, 'o'), [[0, p.deep], [0.3, p.dark], [0.62, p.base], [0.9, p.light], [1, p.lighter]]);
    const rim = linear(ctx, gid(ctx, 'lis', hex, 'r'), [[0, p.base, 0], [0.6, p.base, 0], [1, p.lighter, 0.6]]);
    const spin = rnd() * 360;
    let s = '';
    [{ k: 5, L: 100, w: 62, rot: 0 }, { k: 5, L: 78, w: 56, rot: 36 }, { k: 4, L: 52, w: 42, rot: 15 }].forEach((ly) => {
      for (let i = 0; i < ly.k; i++) {
        const a = spin + ly.rot + (i * 360) / ly.k + (rnd() - 0.5) * 12;
        const L = ly.L * (0.92 + rnd() * 0.1), w = ly.w * (0.9 + rnd() * 0.15);
        const d = ruffledPetal(L, w, rnd, 7);
        s += petalGroup(a, d, out, p,
          `<path d="${d}" fill="${rim}"/>` +
          `<path d="M0 -8Q${P(w * 0.3, -L * 0.5)} ${P(w * 0.2, -L * 0.9)}M0 -8Q${P(-w * 0.25, -L * 0.5)} ${P(-w * 0.35, -L * 0.88)}M0 -8L0 ${n(-L * 0.9)}" fill="none" stroke="${p.deep}" stroke-opacity=".16" stroke-width=".8"/>`);
      }
    });
    s += `<circle r="15" fill="${p.deep}" opacity=".45"/>`;
    s += `<path transform="rotate(${n(spin)})" d="M-3 0C-8-6-10-14-6-18C-2-14-1-6 0 0ZM3 0C8-6 10-14 6-18C2-14 1-6 0 0Z" fill="#cfe08a" stroke="#8aa14a" stroke-width=".6"/>`;
    let st = '';
    for (let i = 0; i < 5; i++) {
      const a = spin + i * 72, r = (a * Math.PI) / 180;
      st += `<ellipse cx="${n(Math.cos(r) * 9)}" cy="${n(Math.sin(r) * 9)}" rx="3" ry="1.8" transform="rotate(${n(a)} ${P(Math.cos(r) * 9, Math.sin(r) * 9)})"/>`;
    }
    s += `<g fill="#f2d24b" stroke="#b8952a" stroke-width=".4">${st}</g>`;
    return s;
  }

  // ---------- ORKİDE ----------
  function orchid(ctx, hex, rnd) {
    const p = U.palette(hex);
    const pale = U.luminance(hex) > 0.8;
    const pg = linear(ctx, gid(ctx, 'orc', hex, 'p'), [[0, pale ? U.mix(hex, '#f1d3e2', 0.6) : p.dark], [0.35, p.base], [1, p.light]]);
    const sg = linear(ctx, gid(ctx, 'orc', hex, 's'), [[0, p.dark], [0.5, p.base], [1, p.light]]);
    const lipC = pale ? '#c2266f' : p.deep;
    const lipDeep = U.mix(lipC, '#000000', 0.35);
    const veins = (L, w, cnt) => {
      let v = '';
      for (let i = 0; i < cnt; i++) {
        const t = (i / (cnt - 1) - 0.5) * 2;
        v += `M0 -6Q${P(t * w * 0.8, -L * 0.5)} ${P(t * w * 0.5, -L * 0.9)}`;
      }
      return v;
    };
    const sepal = (L, w) => `M0 0C${P(w * 1.1, -L * 0.25)} ${P(w * 0.9, -L * 0.8)} ${P(0, -L)}C${P(-w * 0.9, -L * 0.8)} ${P(-w * 1.1, -L * 0.25)} 0 0Z`;
    const petal = (L, w) => `M0 0C${P(w * 0.9, -L * 0.05)} ${P(w * 1.25, -L * 0.7)} ${P(0, -L)}C${P(-w * 1.25, -L * 0.7)} ${P(-w * 0.9, -L * 0.05)} 0 0Z`;
    let s = `<g transform="rotate(${n((rnd() - 0.5) * 18)})">`;
    [[0, 96, 30], [142, 90, 28], [218, 90, 28]].forEach(([a, L, w]) => {
      const d = sepal(L, w);
      s += petalGroup(a, d, sg, p, `<path d="${veins(L, w, 5)}" fill="none" stroke="${p.deep}" stroke-opacity=".18" stroke-width=".7"/>`, 0.22);
    });
    [[-72, 92, 50], [72, 92, 50]].forEach(([a, L, w]) => {
      const d = petal(L, w);
      s += petalGroup(a, d, pg, p, `<path d="${veins(L, w, 7)}" fill="none" stroke="${p.deep}" stroke-opacity=".2" stroke-width=".7"/>`);
    });
    s += `<path d="M-14 4C-26 0-30 18-22 26C-16 30-8 22-6 14Z" fill="#f2c94c" stroke="#b8862a" stroke-width=".6"/>`;
    s += `<path d="M14 4C26 0 30 18 22 26C16 30 8 22 6 14Z" fill="#f2c94c" stroke="#b8862a" stroke-width=".6"/>`;
    let dots = '';
    for (let i = 0; i < 12; i++) dots += `<circle cx="${n((i % 2 ? 1 : -1) * (11 + rnd() * 10))}" cy="${n(7 + rnd() * 17)}" r="${n(0.8 + rnd() * 0.9)}"/>`;
    s += `<g fill="#c0392b" opacity=".85">${dots}</g>`;
    s += `<path d="M0 10C-12 14-18 30-12 42C-8 48-3 46 0 40C3 46 8 48 12 42C18 30 12 14 0 10Z" fill="${lipC}" stroke="${lipDeep}" stroke-width=".7"/>`;
    s += `<path d="M-4 44Q-10 54-16 52M4 44Q10 54 16 52" fill="none" stroke="${lipC}" stroke-width="1.6" stroke-linecap="round"/>`;
    s += `<path d="M-7 4C-8-8-4-14 0-14C4-14 8-8 7 4C4 8-4 8-7 4Z" fill="#fbf7f2" stroke="#d8cfc4" stroke-width=".6"/>`;
    s += `<circle cx="0" cy="-8" r="3" fill="#f5e7b8"/>`;
    s += `</g>`;
    return s;
  }

  // ---------- GERBERA ----------
  function gerbera(ctx, hex, rnd) {
    const p = U.palette(hex);
    const pf = linear(ctx, gid(ctx, 'ger', hex, 'f'), [[0, p.dark], [0.25, p.base], [0.85, p.light], [1, p.base]]);
    const pb = linear(ctx, gid(ctx, 'ger', hex, 'b'), [[0, p.deep], [0.5, p.dark], [1, p.base]]);
    const spin = rnd() * 360;
    const tipPetal = (L, w, st) =>
      `M${P(-w * 0.4, -st)}C${P(-w * 1.05, -st - 10)} ${P(-w * 1.05, -L * 0.9)} ${P(-w * 0.55, -L * 0.99)}L${P(-w * 0.12, -L * 0.965)}L0 ${n(-L)}L${P(w * 0.12, -L * 0.965)}L${P(w * 0.55, -L * 0.99)}C${P(w * 1.05, -L * 0.9)} ${P(w * 1.05, -st - 10)} ${P(w * 0.4, -st)}Z`;
    const K = 24;
    let s = '';
    for (let i = 0; i < K; i++) {
      const a = spin + ((i + 0.5) * 360) / K + (rnd() - 0.5) * 4;
      s += `<path transform="rotate(${n(a)})" d="${tipPetal(96 * (0.95 + rnd() * 0.07), 12, 24)}" fill="${pb}" stroke="${p.deep}" stroke-opacity=".3" stroke-width=".5"/>`;
    }
    for (let i = 0; i < K; i++) {
      const a = spin + (i * 360) / K + (rnd() - 0.5) * 4;
      const L = 100 * (0.94 + rnd() * 0.07), w = 11.5;
      const d = tipPetal(L, w, 24);
      s +=
        `<g transform="rotate(${n(a)})"><path d="${d}" fill="${p.shadow}" opacity=".22" transform="translate(1 2)"/>` +
        `<path d="${d}" fill="${pf}" stroke="${p.deep}" stroke-opacity=".35" stroke-width=".5"/>` +
        `<path d="M0 -30L0 ${n(-L * 0.93)}" stroke="${p.dark}" stroke-opacity=".3" stroke-width=".8"/>` +
        `<path d="M-4 -32L${P(-w * 0.4, -L * 0.9)}M4 -32L${P(w * 0.4, -L * 0.9)}" stroke="${p.lighter}" stroke-opacity=".3" stroke-width=".6"/></g>`;
    }
    for (let i = 0; i < 30; i++) {
      const a = spin + i * 12 + (rnd() - 0.5) * 6;
      s += `<path transform="rotate(${n(a)})" d="${slenderPetal(50 * (0.9 + rnd() * 0.15), 6, 22)}" fill="${pf}" stroke="${p.deep}" stroke-opacity=".3" stroke-width=".4"/>`;
    }
    const light = U.luminance(hex) > 0.75;
    const cg = radial(ctx, gid(ctx, 'ger', light ? 'l' : 'd', 'c'), [[0, '#46652a'], [0.45, '#22340f'], [0.72, light ? '#6b5a1e' : '#2a1a0c'], [1, '#1a1006']], 27);
    s += `<circle r="28" fill="${p.shadow}" opacity=".3" transform="translate(1 2)"/><circle r="27" fill="${cg}"/>`;
    let ring = '';
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * 6.283;
      ring += `<circle cx="${n(Math.cos(a) * 23)}" cy="${n(Math.sin(a) * 23)}" r="1.6"/>`;
    }
    s += `<g fill="${light ? '#e2c24a' : '#f2c14a'}" opacity=".9">${ring}</g>`;
    let dots = '';
    for (let i = 0; i < 50; i++) {
      const r = 18 * Math.sqrt((i + 0.5) / 50), a = i * 2.39996;
      dots += `<circle cx="${n(Math.cos(a) * r)}" cy="${n(Math.sin(a) * r)}" r="1"/>`;
    }
    s += `<g fill="#7b9a3c" opacity=".6">${dots}</g>`;
    return s;
  }

  // ---------- FREZYA (yandan) ----------
  function freesia(ctx, hex, rnd) {
    const p = U.palette(hex);
    const fg = linear(ctx, gid(ctx, 'fre', hex, 'f'), [[0, p.dark], [0.4, p.base], [0.75, p.light], [1, p.base]], 0, 0.5, 1, 0.5);
    const throat = U.mix(hex, '#f4d35e', 0.55);
    const bez = (t) => {
      const X = [-40, -36, -12, 44], Y = [62, 10, -40, -58], u = 1 - t;
      const f = (A) => u * u * u * A[0] + 3 * u * u * t * A[1] + 3 * u * t * t * A[2] + t * t * t * A[3];
      return [f(X), f(Y)];
    };
    let s = `<g transform="rotate(${n((rnd() - 0.5) * 10)})">`;
    s += `<path d="M-40 62C-36 10-12-40 44-58C54-61 62-58 70-52" fill="none" stroke="#6f9a3e" stroke-width="3.4" stroke-linecap="round"/>`;
    const items = [[0.4, 1.0], [0.56, 0.92], [0.7, 0.78], [0.82, 0.6], [0.92, 0.45], [1.0, 0.34], [1.08, 0.26]];
    items.slice().reverse().forEach(([t, sc]) => {
      let x, y;
      if (t > 1) { x = 44 + (t - 1) * 300; y = -58 + (t - 1) * 60; } else [x, y] = bez(t);
      const open = sc > 0.6;
      const L = 62 * sc, w = (open ? 32 : 11) * sc;
      const ang = -18 - (1 - Math.min(t, 1)) * 16;
      let f;
      if (open) {
        f =
          `<path d="M0 0C${P(-w * 0.25, -L * 0.3)} ${P(-w * 0.5, -L * 0.6)} ${P(-w, -L * 0.85)}C${P(-w * 0.9, -L * 1.06)} ${P(-w * 0.3, -L * 1.04)} 0 ${n(-L * 0.9)}C${P(w * 0.3, -L * 1.04)} ${P(w * 0.9, -L * 1.06)} ${P(w, -L * 0.85)}C${P(w * 0.5, -L * 0.6)} ${P(w * 0.25, -L * 0.3)} 0 0Z" fill="${fg}" stroke="${p.deep}" stroke-opacity=".35" stroke-width=".7"/>` +
          `<path d="M${P(-w * 0.8, -L * 0.86)}C${P(-w * 0.5, -L * 0.76)} ${P(w * 0.5, -L * 0.76)} ${P(w * 0.8, -L * 0.86)}C${P(w * 0.4, -L * 0.68)} ${P(-w * 0.4, -L * 0.68)} ${P(-w * 0.8, -L * 0.86)}Z" fill="${throat}" opacity=".85"/>` +
          `<path d="M0 ${n(-L * 0.88)}C${P(-w * 0.15, -L * 0.7)} ${P(-w * 0.1, -L * 0.4)} 0 ${n(-L * 0.15)}" fill="none" stroke="${p.lighter}" stroke-opacity=".5" stroke-width="1.6"/>` +
          `<path d="M0 0C${P(-w * 0.3, -L * 0.1)} ${P(-w * 0.3, -L * 0.22)} 0 ${n(-L * 0.26)}C${P(w * 0.3, -L * 0.22)} ${P(w * 0.3, -L * 0.1)} 0 0Z" fill="#7ea34a" opacity=".85"/>`;
      } else {
        f =
          `<path d="M0 0C${P(-w, -L * 0.3)} ${P(-w * 0.8, -L * 0.9)} 0 ${n(-L)}C${P(w * 0.8, -L * 0.9)} ${P(w, -L * 0.3)} 0 0Z" fill="${fg}" stroke="${p.deep}" stroke-opacity=".35" stroke-width=".7"/>` +
          `<path d="M0 0C${P(-w * 0.7, -L * 0.15)} ${P(-w * 0.7, -L * 0.4)} 0 ${n(-L * 0.5)}C${P(w * 0.7, -L * 0.4)} ${P(w * 0.7, -L * 0.15)} 0 0Z" fill="#7ea34a" opacity=".85"/>`;
      }
      s += `<g transform="translate(${P(x, y)}) rotate(${n(ang)})">${f}</g>`;
    });
    s += `</g>`;
    return s;
  }

  // ---------- GALA (yandan) ----------
  function calla(ctx, hex, rnd) {
    const p = U.palette(hex);
    const outG = linear(ctx, gid(ctx, 'cal', hex, 'o'), [[0, p.deep], [0.25, p.dark], [0.55, p.base], [0.8, p.light], [1, p.base]], 0, 0.5, 1, 0.5);
    const inG = linear(ctx, gid(ctx, 'cal', hex, 'i'), [[0, p.shadow], [0.55, p.dark], [1, p.base]], 0.5, 1, 0.5, 0);
    const green = linear(ctx, gid(ctx, 'cal', hex, 'g'), [[0, '#5f8a36', 0.95], [0.35, '#5f8a36', 0.4], [1, '#5f8a36', 0]], 0.5, 1, 0.5, 0.3);
    const spathe = 'M-4 62C-10 36-26-4-38-56C-42-70-28-72-20-60C-8-40 6-46 22-62C34-76 54-84 68-78C58-70 44-56 32-30C22-6 10 30 6 62Z';
    let s = `<g transform="translate(-10 12) rotate(${n(-6 + (rnd() - 0.5) * 10)})">`;
    s += `<path d="M-6 44C-20 10-32-28-38-58C-18-72 24-84 50-72C34-44 16-4 6 44Z" fill="${inG}"/>`;
    s += `<path d="M-1 28C-6-4-4-36 3-54C8-36 8-6 4 28Z" fill="#f2c73a" stroke="#c7962a" stroke-width=".6"/>`;
    s += `<path d="${spathe}" fill="${p.shadow}" opacity=".3" transform="translate(2 3)"/>`;
    s += `<path d="${spathe}" fill="${outG}" stroke="${p.deep}" stroke-opacity=".35" stroke-width=".8"/>`;
    s += `<path d="${spathe}" fill="${green}"/>`;
    s += `<path d="M-26-54C-12-34 6-40 20-56" fill="none" stroke="${p.lighter}" stroke-opacity=".55" stroke-width="1.8"/>`;
    s += `<path d="M2 54C-2 24-8-8-16-38" fill="none" stroke="${p.lighter}" stroke-opacity=".3" stroke-width="3" stroke-linecap="round"/>`;
    s += `</g>`;
    return s;
  }

  // ---------- ANASTASIA (örümcek kasımpatı) ----------
  function anastasia(ctx, hex, rnd) {
    const p = U.palette(hex);
    const pg = linear(ctx, gid(ctx, 'ana', hex, 'p'), [[0, p.dark], [0.4, p.base], [1, p.light]]);
    const spin = rnd() * 360;
    const tube = (L, w, c) =>
      `M${P(-w * 0.5, -10)}C${P(-w, -L * 0.4)} ${P(-w * 0.9, -L * 0.8)} ${P(-w * 0.5, -L)}C${P(-w * 0.2, -L - Math.abs(c) * 0.8)} ${P(c * 0.9, -L - Math.abs(c))} ${P(c * 1.1, -L + Math.abs(c) * 0.1)}C${P(c * 0.6, -L + Math.abs(c) * 0.2)} ${P(w * 0.6, -L * 0.97)} ${P(w * 0.5, -L * 0.9)}C${P(w * 0.9, -L * 0.7)} ${P(w, -L * 0.4)} ${P(w * 0.5, -10)}Z`;
    let s = '';
    [{ k: 34, L: 100, w: 5.6 }, { k: 30, L: 84, w: 5.2 }, { k: 26, L: 64, w: 4.8 }, { k: 20, L: 44, w: 4.4 }].forEach((ly, li) => {
      for (let i = 0; i < ly.k; i++) {
        const a = spin + li * 7 + (i * 360) / ly.k + (rnd() - 0.5) * 8;
        const L = ly.L * (0.85 + rnd() * 0.2);
        const c = (4 + rnd() * 6) * (rnd() < 0.5 ? -1 : 1);
        s += `<path transform="rotate(${n(a)})" d="${tube(L, ly.w, c)}" fill="${pg}" stroke="${p.deep}" stroke-opacity=".35" stroke-width=".5"/>`;
      }
    });
    s += `<circle r="16" fill="${p.dark}"/>`;
    for (let i = 0; i < 22; i++) {
      const a = i * 2.39996, r = 14 * Math.sqrt((i + 0.5) / 22);
      s += `<circle cx="${n(Math.cos(a) * r)}" cy="${n(Math.sin(a) * r)}" r="3.2" fill="${pg}" stroke="${p.deep}" stroke-opacity=".3" stroke-width=".4"/>`;
    }
    return s;
  }

  // ---------- NERGİS ----------
  function daffodil(ctx, hex, rnd) {
    const p = U.palette(hex);
    const pale = U.luminance(hex) > 0.8;
    const corona = pale ? '#f2b52a' : U.fromHsl(U.toHsl(hex)[0] - 12, 0.95, 0.5);
    const cp = U.palette(corona);
    const tg = linear(ctx, gid(ctx, 'daf', hex, 't'), [[0, p.dark], [0.3, p.base], [1, p.light]]);
    const spin = rnd() * 360;
    const tep = (L, w) => `M0 0C${P(w * 1.15, -L * 0.25)} ${P(w * 0.95, -L * 0.75)} ${P(0, -L)}C${P(-w * 0.95, -L * 0.75)} ${P(-w * 1.15, -L * 0.25)} 0 0Z`;
    let s = '';
    const vein = (L) => `<path d="M0 -10L0 ${n(-L * 0.9)}" stroke="${p.dark}" stroke-opacity=".25" stroke-width=".8"/>`;
    for (let i = 0; i < 3; i++) s += petalGroup(spin + i * 120, tep(98, 34), tg, p, vein(98), 0.25);
    for (let i = 0; i < 3; i++) s += petalGroup(spin + 60 + i * 120, tep(92, 31), tg, p, vein(92), 0.25);
    const cr = radial(ctx, gid(ctx, 'daf', corona, 'c'), [[0, cp.shadow], [0.35, cp.deep], [0.7, cp.dark], [0.9, cp.base], [1, cp.light]], 36);
    let d = '';
    const N = 56;
    for (let t = 0; t < N; t++) {
      const a = (t / N) * 6.283;
      const r = 34 * (1 + 0.06 * Math.sin(t * 1.3 + rnd()) + (t % 2 ? 0.03 : -0.03));
      d += (t ? 'L' : 'M') + P(Math.cos(a) * r, Math.sin(a) * r);
    }
    d += 'Z';
    s += `<path d="${d}" fill="${cp.shadow}" opacity=".35" transform="translate(1 3)"/><path d="${d}" fill="${cr}" stroke="${cp.deep}" stroke-opacity=".5" stroke-width=".8"/>`;
    s += `<circle r="25" fill="none" stroke="${cp.light}" stroke-opacity=".35" stroke-width="2"/>`;
    s += `<circle r="13" fill="${cp.shadow}" opacity=".55"/>`;
    let st = '';
    for (let i = 0; i < 6; i++) {
      const a = ((spin + i * 60) * Math.PI) / 180;
      st += `<circle cx="${n(Math.cos(a) * 5)}" cy="${n(Math.sin(a) * 5)}" r="2.4"/>`;
    }
    s += `<g fill="#f7dc6a">${st}</g><circle r="2.5" fill="#bcd47a"/>`;
    return s;
  }

  // ---------- ŞEBBOY (yandan başak) ----------
  function stock(ctx, hex, rnd) {
    const p = U.palette(hex);
    const fg = bradial(ctx, gid(ctx, 'sto', hex, 'f'), [[0, p.light], [0.55, p.base], [1, p.dark]]);
    let s = `<g transform="rotate(${n((rnd() - 0.5) * 8)})">`;
    s += `<path d="M0 70L0 -92" stroke="#5f8a36" stroke-width="4" stroke-linecap="round"/>`;
    const rows = 11;
    const items = [];
    for (let j = 0; j < rows; j++) {
      const y = 52 - j * 13.5;
      const sz = 25 * (1 - (j / rows) * 0.62);
      const cnt = j < rows - 3 ? 3 : 2;
      for (let k = 0; k < cnt; k++) {
        const x = (k - (cnt - 1) / 2) * sz * 1.05 + (j % 2 ? sz * 0.3 : -sz * 0.3) * 0.5 + (rnd() - 0.5) * 4;
        items.push({ x, y: y + (rnd() - 0.5) * 4, sz, bud: j >= rows - 3, front: k === 1 });
      }
    }
    items.sort((a, b) => a.y - b.y || (a.front ? 1 : -1));
    items.forEach((it) => {
      if (it.bud) {
        s += `<ellipse cx="${n(it.x)}" cy="${n(it.y)}" rx="${n(it.sz * 0.42)}" ry="${n(it.sz * 0.6)}" fill="${U.mix(p.base, '#8fb05a', 0.35)}" stroke="${p.deep}" stroke-opacity=".3" stroke-width=".6"/>`;
        return;
      }
      let d = '';
      const N = 28, ph = rnd() * 6;
      for (let t = 0; t < N; t++) {
        const a = (t / N) * 6.283;
        const r = it.sz * (0.78 + 0.18 * Math.abs(Math.sin(2 * a + ph)) + (t % 2 ? 0.04 : -0.03));
        d += (t ? 'L' : 'M') + P(it.x + Math.cos(a) * r, it.y + Math.sin(a) * r * 0.85);
      }
      d += 'Z';
      s += `<path d="${d}" fill="${p.shadow}" opacity=".3" transform="translate(1 2.5)"/>`;
      s += `<path d="${d}" fill="${fg}" stroke="${p.deep}" stroke-opacity=".35" stroke-width=".6" stroke-linejoin="round"/>`;
      s += `<path d="M${P(it.x - it.sz * 0.5, it.y)}Q${P(it.x, it.y - it.sz * 0.25)} ${P(it.x + it.sz * 0.5, it.y)}M${P(it.x, it.y - it.sz * 0.55)}Q${P(it.x + it.sz * 0.2, it.y)} ${P(it.x, it.y + it.sz * 0.5)}" fill="none" stroke="${p.deep}" stroke-opacity=".22" stroke-width=".8"/>`;
      s += `<circle cx="${n(it.x)}" cy="${n(it.y)}" r="${n(it.sz * 0.12)}" fill="${p.deep}" opacity=".6"/>`;
    });
    s += `</g>`;
    return s;
  }

  // ---------- ÇARDAK GÜL (dal gül) ----------
  function sprayrose(ctx, hex, rnd) {
    const p = U.palette(hex);
    let s = '';
    [[64, -46, 24], [-70, 34, -34], [30, 66, 160]].forEach(([x, y, r]) => {
      s +=
        `<g transform="translate(${x} ${y}) rotate(${r})">` +
        `<path d="M0 10L0 34" stroke="#4d7a33" stroke-width="2.6"/>` +
        `<path d="M0 -22C13 -19 15 0 0 11C-15 0-13-19 0-22Z" fill="${p.dark}" stroke="${p.deep}" stroke-width=".7"/>` +
        `<path d="M0 -22C6 -15 6 -4 0 5" fill="none" stroke="${p.light}" stroke-opacity=".5" stroke-width="1.3"/>` +
        `<path d="M-10 2C-7 14 7 14 10 2C4 7-4 7-10 2ZM-10 2L-15-6M10 2L15-6" fill="#5d8a3a" stroke="#4d7a33" stroke-width="1"/></g>`;
    });
    [[-32, -30, 0.54], [38, 8, 0.5], [-16, 44, 0.46]].forEach(([x, y, sc]) => {
      s += `<g transform="translate(${x} ${y}) scale(${sc})"><circle r="100" fill="${p.shadow}" opacity=".28" transform="translate(4 9)"/>${draw.rose(ctx, hex, rnd)}</g>`;
    });
    return s;
  }

  // ---------- DÜĞÜN ÇİÇEĞİ (Ranunculus) ----------
  function ranunculus(ctx, hex, rnd) {
    const p = U.palette(hex);
    const g = radial(ctx, gid(ctx, 'ran', hex, 'o'), [[0, p.shadow], [0.25, p.deep], [0.55, p.dark], [0.85, p.base], [1, p.light]]);
    const rim = linear(ctx, gid(ctx, 'ran', hex, 'r'), [[0, p.base, 0], [0.72, p.base, 0], [1, p.lighter, 0.75]]);
    const spin = rnd() * 360;
    let s = '';
    for (let j = 0; j < 9; j++) {
      const R = 100 - j * 10.3;
      const k = Math.max(5, Math.round(5 + R / 14));
      const w = R * 0.5;
      for (let i = 0; i < k; i++) {
        const a = spin + j * 17 + (i * 360) / k + (rnd() - 0.5) * 8;
        const d = roundPetal(R * (0.96 + rnd() * 0.06), w);
        s += petalGroup(a, d, g, p, `<path d="${d}" fill="${rim}"/>`, 0.3);
      }
    }
    const [h, sat, l] = U.toHsl(hex);
    s += `<circle r="10" fill="${p.deep}"/><circle r="6" fill="${l > 0.55 && sat > 0.25 ? '#6b8a3a' : p.shadow}"/>`;
    return s;
  }

  // ---------- DALYA ----------
  function dahlia(ctx, hex, rnd) {
    const p = U.palette(hex);
    const g = linear(ctx, gid(ctx, 'dah', hex, 'p'), [[0, p.deep], [0.35, p.dark], [0.75, p.base], [1, p.light]]);
    const spin = rnd() * 360;
    const pet = (L, w) => `M${P(-w * 0.6, -L * 0.35)}C${P(-w * 1.05, -L * 0.55)} ${P(-w * 0.9, -L * 0.85)} ${P(0, -L)}C${P(w * 0.9, -L * 0.85)} ${P(w * 1.05, -L * 0.55)} ${P(w * 0.6, -L * 0.35)}Z`;
    let s = '';
    [[100, 16, 15], [88, 16, 14], [76, 15, 12.5], [64, 14, 11], [52, 12, 9.5], [40, 11, 8], [29, 9, 6.5], [19, 7, 5]].forEach(([L, k, w], j) => {
      for (let i = 0; i < k; i++) {
        const a = spin + (j % 2 ? 180 / k : 0) + (i * 360) / k + (rnd() - 0.5) * 4;
        const d = pet(L, w);
        s += petalGroup(a, d, g, p, `<path d="M0 ${n(-L * 0.45)}L0 ${n(-L * 0.92)}" stroke="${p.lighter}" stroke-opacity=".35" stroke-width="1.2"/>`, 0.3);
      }
    });
    s += `<circle r="8" fill="${p.deep}"/>`;
    return s;
  }

  // ---------- ANEMON ----------
  function anemone(ctx, hex, rnd) {
    const p = U.palette(hex);
    const pg = linear(ctx, gid(ctx, 'ane', hex, 'p'), [[0, p.dark], [0.35, p.base], [1, p.light]]);
    const spin = rnd() * 360;
    let s = '';
    [{ k: 3, L: 100, w: 64, rot: 0 }, { k: 3, L: 96, w: 60, rot: 60 }].forEach((ly) => {
      for (let i = 0; i < ly.k; i++) {
        const a = spin + ly.rot + (i * 360) / ly.k + (rnd() - 0.5) * 14;
        const L = ly.L * (0.93 + rnd() * 0.08);
        const d = roundPetal(L, ly.w);
        let v = '';
        for (let q = -2; q <= 2; q++) v += `M0 -18Q${P(q * ly.w * 0.2, -L * 0.55)} ${P(q * ly.w * 0.3, -L * 0.9)}`;
        s += petalGroup(a, d, pg, p, `<path d="${v}" fill="none" stroke="${p.deep}" stroke-opacity=".14" stroke-width=".8"/>`);
      }
    });
    s += `<circle r="31" fill="${p.shadow}" opacity=".2" transform="translate(1 3)"/>`;
    let st = '', an = '';
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * 6.283 + rnd() * 0.05;
      const r2 = 24 + rnd() * 6;
      st += `M${P(Math.cos(a) * 15, Math.sin(a) * 15)}L${P(Math.cos(a) * r2, Math.sin(a) * r2)}`;
      an += `<circle cx="${n(Math.cos(a) * r2)}" cy="${n(Math.sin(a) * r2)}" r="1.8"/>`;
    }
    s += `<path d="${st}" stroke="#2a1d2e" stroke-width="1.1"/><g fill="#1c1420">${an}</g>`;
    const cg = radial(ctx, gid(ctx, 'ane', 'x', 'c'), [[0, '#4a4262'], [0.6, '#1d1826'], [1, '#0e0b12']], 16, -4, -4);
    s += `<circle r="16" fill="${cg}"/>`;
    let dots = '';
    for (let i = 0; i < 26; i++) {
      const r = 13 * Math.sqrt((i + 0.5) / 26), a = i * 2.39996;
      dots += `<circle cx="${n(Math.cos(a) * r)}" cy="${n(Math.sin(a) * r)}" r=".9"/>`;
    }
    s += `<g fill="#6b6385" opacity=".6">${dots}</g>`;
    return s;
  }

  // ---------- Kayıt ----------
  Object.assign(FLOWERS, {
    hydrangea: {
      name: 'Ortanca', size: 50, view: 'face', shape: 'ball', draw: hydrangea,
      colors: [['Mavi', '#86a9e3'], ['Pembe', '#eea7c6'], ['Beyaz', '#f1f3e8'], ['Lila', '#b9a3de'], ['Mor', '#7d5fbb'], ['Yeşil', '#c7d9a0']],
    },
    lisianthus: {
      name: 'Lisyantus', size: 35, view: 'face', shape: 'ball', draw: lisianthus,
      colors: [['Lila', '#b89ad9'], ['Mor', '#6d40a3'], ['Beyaz', '#f6f3ea'], ['Pembe', '#f1a6c0'], ['Krem', '#f3e7c7'], ['Yeşil', '#d8e6b5']],
    },
    orchid: {
      name: 'Orkide', size: 40, view: 'face', shape: 'flat', draw: orchid,
      colors: [['Beyaz', '#faf6f4'], ['Pembe', '#e679b6'], ['Mor', '#9a3f9f'], ['Sarı', '#f1e07e']],
    },
    gerbera: {
      name: 'Gerbera', size: 36, view: 'face', shape: 'flat', draw: gerbera,
      colors: [['Kırmızı', '#d9232d'], ['Pembe', '#f06e9e'], ['Turuncu', '#f2792a'], ['Sarı', '#f7c52b'], ['Beyaz', '#f7f4ec'], ['Somon', '#f5866f'], ['Fuşya', '#d12f7d']],
    },
    freesia: {
      name: 'Frezya', size: 36, view: 'side', shape: 'side', draw: freesia,
      colors: [['Sarı', '#f6d24a'], ['Beyaz', '#f6f3e8'], ['Pembe', '#ee8fb4'], ['Mor', '#8d5bb8'], ['Kırmızı', '#d9373f'], ['Turuncu', '#f39a3b']],
    },
    calla: {
      name: 'Gala', size: 33, view: 'side', shape: 'side', draw: calla,
      colors: [['Beyaz', '#f7f5ec'], ['Sarı', '#f2c93a'], ['Pembe', '#eb86a8'], ['Mor', '#5a2449'], ['Turuncu', '#f08a3a']],
    },
    anastasia: {
      name: 'Anastasia', size: 38, view: 'face', shape: 'flat', draw: anastasia,
      colors: [['Yeşil', '#c9dd8c'], ['Beyaz', '#f5f3e6'], ['Sarı', '#f4d44f'], ['Pembe', '#eea6c7'], ['Lila', '#c1a1dc']],
    },
    daffodil: {
      name: 'Nergis', size: 32, view: 'face', shape: 'flat', draw: daffodil,
      colors: [['Sarı', '#f7d84a'], ['Beyaz', '#f8f6ec'], ['Krem', '#f5ecc8']],
    },
    stock: {
      name: 'Şebboy', size: 35, view: 'side', shape: 'side', draw: stock,
      colors: [['Beyaz', '#f6f2ea'], ['Pembe', '#f2a7c3'], ['Lila', '#b999d9'], ['Mor', '#7d4a9e'], ['Krem', '#f4e7c9'], ['Fuşya', '#d54a8f']],
    },
    sprayrose: {
      name: 'Çardak Gül', size: 40, view: 'face', shape: 'flat', draw: sprayrose,
      colors: [['Pembe', '#ef9fb7'], ['Beyaz', '#f7f2e8'], ['Şeftali', '#f5b08a'], ['Kırmızı', '#c0182f'], ['Sarı', '#f3d15a'], ['Lila', '#bfa0d8']],
    },
    ranunculus: {
      name: 'Düğün Çiçeği', size: 32, view: 'face', shape: 'ball', draw: ranunculus,
      colors: [['Kırmızı', '#c8162c'], ['Turuncu', '#f27a22'], ['Pembe', '#f4a0b5'], ['Beyaz', '#f7f3ea'], ['Sarı', '#f5cf3a'], ['Şeftali', '#f7b48e'], ['Bordo', '#7d1128']],
    },
    dahlia: {
      name: 'Dalya', size: 38, view: 'face', shape: 'ball', draw: dahlia,
      colors: [['Turuncu', '#f26b2c'], ['Fuşya', '#d4237a'], ['Pembe', '#f19ac1'], ['Kırmızı', '#c41f2c'], ['Beyaz', '#f6f2ea'], ['Bordo', '#6c0f24'], ['Sarı', '#f5c540']],
    },
    anemone: {
      name: 'Anemon', size: 32, view: 'face', shape: 'flat', draw: anemone,
      colors: [['Beyaz', '#f7f5f0'], ['Kırmızı', '#d4202c'], ['Pembe', '#f19bbd'], ['Mor', '#6b3f9c'], ['Mavi', '#5b6fc4']],
    },
  });

  // Katalog sırası (çiçekçilerde en sık kullanılanlar önce)
  Flowers.ORDER = [
    'rose', 'peony', 'tulip', 'hydrangea', 'lily', 'lisianthus', 'daisy', 'gerbera', 'sunflower', 'carnation',
    'orchid', 'ranunculus', 'dahlia', 'anemone', 'freesia', 'calla', 'anastasia', 'sprayrose', 'daffodil', 'stock',
  ];
})();
