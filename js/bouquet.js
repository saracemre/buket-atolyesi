/*
 * Buket oluşturucu: çiçekleri kubbe şeklinde yerleştirir, sapları, dolgu
 * çiçeklerini (cipsofil), yeşillikleri, ambalaj kağıdını ve kurdeleyi çizer.
 * Tüm koordinatlar "dünya" birimindedir; kubbenin merkezi (0,0)'dır.
 */
(function () {
  const { n, pt } = U;
  const { FLOWERS, makeCtx, radial, linear, stops } = Flowers;

  const DEG = 180 / Math.PI;

  // ---------- Kağıt yardımcıları ----------
  // İki nokta arasında dışa doğru dalgalı (fırfırlı) kenar üretir
  function ruffle(ax, ay, bx, by, bumps, amp, rnd, bulge = 0) {
    let d = '';
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    // sol-el normali (kenarın dış tarafı, çizim yönüne göre)
    const nx = dy / len, ny = -dx / len;
    for (let i = 1; i <= bumps; i++) {
      const t0 = (i - 1) / bumps, t1 = i / bumps, tm = (t0 + t1) / 2;
      const b1 = Math.sin(Math.PI * t1) * bulge, bm = Math.sin(Math.PI * tm) * bulge;
      const px = ax + dx * t1 + nx * b1, py = ay + dy * t1 + ny * b1;
      const a = amp * (0.6 + rnd() * 0.8);
      const cx = ax + dx * tm + nx * (bm + a), cy = ay + dy * tm + ny * (bm + a);
      d += `Q${pt(cx, cy)} ${pt(px, py)}`;
    }
    return d;
  }

  function paperTones(hex) {
    const dark = U.luminance(hex) < 0.25;
    return {
      base: hex,
      light: U.mix(hex, '#ffffff', dark ? 0.16 : 0.32),
      lighter: U.mix(hex, '#ffffff', dark ? 0.3 : 0.55),
      dark: U.mix(hex, '#000000', dark ? 0.28 : 0.14),
      deep: U.mix(hex, '#000000', dark ? 0.45 : 0.3),
    };
  }

  function foldGradient(ctx, id, t, x1, x2, pattern) {
    const list = pattern.map(([o, k]) => [o, t[k]]);
    ctx.def(id, `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(x1)}" y1="0" x2="${n(x2)}" y2="0">${stops(list)}</linearGradient>`);
    return `url(#${id})`;
  }

  // ---------- Yeşillik ----------
  function greenery(ctx, W, H, count, rnd) {
    const euc = radial(ctx, ctx.prefix + 'euc', [[0, '#a3c2b1'], [0.6, '#7ea291'], [1, '#5d8373']], 11, 0, 0, -3, -3);
    const leaf = linear(ctx, ctx.prefix + 'leaf', [[0, '#2f5a2a'], [0.5, '#4d7d3a'], [1, '#6f9e52']], 0, 0.5, 1, 0.5);
    let back = '', front = '';
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const phi = (-198 + t * 216 + (rnd() - 0.5) * 12) / DEG;
      const reach = 1.02 + rnd() * 0.24;
      const ex = Math.cos(phi) * (W * reach + 10), ey = Math.sin(phi) * (H * reach + 10);
      const sx = Math.cos(phi) * W * 0.25, sy = Math.sin(phi) * H * 0.25;
      const bend = (rnd() - 0.5) * 30;
      const mx = (sx + ex) / 2 - Math.sin(phi) * bend, my = (sy + ey) / 2 + Math.cos(phi) * bend;
      const type = i % 3 === 1 ? 'leaf' : 'euc';
      let g = `<path d="M${pt(sx, sy)}Q${pt(mx, my)} ${pt(ex, ey)}" fill="none" stroke="${type === 'euc' ? '#6f8f7a' : '#3f6a31'}" stroke-width="1.6"/>`;
      const steps = type === 'euc' ? 8 : 6;
      for (let k = 0; k < steps; k++) {
        const u = 0.38 + (k / (steps - 1)) * 0.62;
        // ikinci derece Bezier noktası ve teğeti
        const px = (1 - u) ** 2 * sx + 2 * (1 - u) * u * mx + u * u * ex;
        const py = (1 - u) ** 2 * sy + 2 * (1 - u) * u * my + u * u * ey;
        const tx = 2 * (1 - u) * (mx - sx) + 2 * u * (ex - mx), ty = 2 * (1 - u) * (my - sy) + 2 * u * (ey - my);
        const ang = Math.atan2(ty, tx) * DEG;
        const side = k % 2 ? 1 : -1;
        const sc = 0.62 + u * 0.3 + rnd() * 0.12;
        if (type === 'euc') {
          g +=
            `<g transform="translate(${pt(px, py)}) rotate(${n(ang + side * 70)}) scale(${n(sc)})">` +
            `<ellipse cx="0" cy="-9" rx="9.5" ry="10.5" fill="url(#${ctx.prefix}euc)" stroke="#50786a" stroke-opacity=".6" stroke-width=".6"/>` +
            `<path d="M0 0L0 -14" stroke="#5c806f" stroke-width=".6" opacity=".6"/></g>`;
        } else {
          g +=
            `<g transform="translate(${pt(px, py)}) rotate(${n(ang + 90 + side * 42)}) scale(${n(sc)})">` +
            `<path d="M0 0C8-9 9-24 0-36C-9-24-8-9 0 0Z" fill="${leaf}" stroke="#2c4f25" stroke-opacity=".5" stroke-width=".6"/>` +
            `<path d="M0 -2Q1 -18 0 -33" fill="none" stroke="#a6c58c" stroke-opacity=".6" stroke-width=".7"/></g>`;
        }
      }
      // uç yaprak
      const endAng = Math.atan2(ey - my, ex - mx) * DEG + 90;
      g += type === 'euc'
        ? `<ellipse transform="translate(${pt(ex, ey)}) rotate(${n(endAng)})" cx="0" cy="-6" rx="7" ry="8" fill="url(#${ctx.prefix}euc)" stroke="#50786a" stroke-opacity=".6" stroke-width=".6"/>`
        : `<path transform="translate(${pt(ex, ey)}) rotate(${n(endAng)})" d="M0 0C8-9 9-24 0-36C-9-24-8-9 0 0Z" fill="${leaf}"/>`;
      if (i % 2) back += g; else front += g;
    }
    return back + front;
  }

  // ---------- Cipsofil (dolgu çiçeği) ----------
  function gypsophila(ctx, W, H, count, hex, rnd) {
    const p = U.palette(hex);
    const gidG = ctx.prefix + 'gyps-' + hex.slice(1);
    ctx.def(gidG, `<radialGradient id="${gidG}" cx=".5" cy=".5" r=".5" fx=".38" fy=".35">${stops([[0, '#ffffff'], [0.5, U.mix(hex, '#ffffff', 0.25)], [1, U.mix(p.base, p.dark, 0.6)]])}</radialGradient>`);
    const fl = `url(#${gidG})`;
    let stems = '', flowers = '';
    for (let i = 0; i < count; i++) {
      const phi = (-205 + rnd() * 230) / DEG;
      const rf = 0.62 + Math.pow(rnd(), 0.6) * 0.62;
      const px = Math.cos(phi) * (W * rf + 6), py = Math.sin(phi) * (H * rf + 6);
      const bx = Math.cos(phi) * W * 0.3, by = Math.sin(phi) * H * 0.3;
      stems += `M${pt(bx, by)}L${pt(px, py)}`;
      const twigs = 3 + Math.floor(rnd() * 3);
      for (let k = 0; k < twigs; k++) {
        const a = phi + (rnd() - 0.5) * 2.2;
        const L = 9 + rnd() * 14;
        const tx = px + Math.cos(a) * L, ty = py + Math.sin(a) * L;
        stems += `M${pt(px, py)}L${pt(tx, ty)}`;
        const florets = 3 + Math.floor(rnd() * 5);
        for (let j = 0; j < florets; j++) {
          const fa = rnd() * 6.283, fr = rnd() * 6;
          const fx = tx + Math.cos(fa) * fr, fy = ty + Math.sin(fa) * fr;
          stems += `M${pt(tx, ty)}L${pt(fx, fy)}`;
          flowers += `<circle cx="${n(fx)}" cy="${n(fy)}" r="${n(2 + rnd() * 1.5)}"/>`;
        }
      }
    }
    return (
      `<path d="${stems}" fill="none" stroke="#7f9c6c" stroke-width=".7" stroke-linecap="round"/>` +
      `<g fill="${fl}" stroke="${p.shadow}" stroke-opacity=".25" stroke-width=".35">${flowers}</g>`
    );
  }

  // ---------- Kurdele ----------
  function satinRibbon(ctx, hex, sc) {
    const t = {
      base: hex,
      light: U.mix(hex, '#ffffff', U.luminance(hex) < 0.2 ? 0.28 : 0.45),
      dark: U.mix(hex, '#000000', 0.25),
      deep: U.mix(hex, '#000000', 0.5),
    };
    const k = hex.slice(1);
    const g1 = linear(ctx, ctx.prefix + 'rb1-' + k, [[0, t.dark], [0.3, t.light], [0.55, t.base], [0.8, t.light], [1, t.dark]], 0, 0, 1, 1);
    const g2 = linear(ctx, ctx.prefix + 'rb2-' + k, [[0, t.light], [0.35, t.base], [0.75, t.dark], [1, t.deep]], 0.5, 0, 0.5, 1);
    const g3 = linear(ctx, ctx.prefix + 'rb3-' + k, [[0, t.dark], [0.4, t.light], [0.6, t.base], [1, t.dark]], 0, 0.5, 1, 0.5);
    const loop = 'M-4 0C-26-42-78-36-70-4C-64 17-30 15-4 2Z';
    const hole = 'M-12-3C-28-26-58-25-56-8C-51 3-30 2-12 0Z';
    const tailL = 'M-3 4C-12 32-22 64-36 100L-26 95L-21 108C-10 72-1 36 6 7Z';
    const tailR = 'M3 4C13 36 22 72 30 116L38 106L46 113C34 76 16 38 6 6Z';
    return (
      `<g transform="scale(${n(sc)})">` +
      `<path d="${tailL}" fill="${g2}" stroke="${t.deep}" stroke-opacity=".35" stroke-width=".6"/>` +
      `<path d="${tailR}" fill="${g2}" stroke="${t.deep}" stroke-opacity=".35" stroke-width=".6"/>` +
      `<path d="${loop}" fill="${t.deep}" opacity=".3" transform="translate(1 4)"/>` +
      `<path d="${loop}" fill="${t.deep}" opacity=".3" transform="translate(-1 4) scale(-1 1)"/>` +
      `<path d="${loop}" fill="${g1}" stroke="${t.deep}" stroke-opacity=".4" stroke-width=".6"/>` +
      `<path d="${hole}" fill="${t.deep}" opacity=".45"/>` +
      `<g transform="scale(-1 1)"><path d="${loop}" fill="${g1}" stroke="${t.deep}" stroke-opacity=".4" stroke-width=".6"/>` +
      `<path d="${hole}" fill="${t.deep}" opacity=".45"/></g>` +
      `<path d="M-22-18C-40-30-58-26-62-12" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M22-18C40-30 58-26 62-12" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2" stroke-linecap="round"/>` +
      `<rect x="-11" y="-10" width="22" height="20" rx="7" fill="${g3}" stroke="${t.deep}" stroke-opacity=".45" stroke-width=".6"/>` +
      `<path d="M-6-6Q0-8 6-6" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.4" stroke-linecap="round"/>` +
      `</g>`
    );
  }

  function ribbonBand(ctx, hex, hw) {
    const t = { light: U.mix(hex, '#ffffff', 0.4), dark: U.mix(hex, '#000000', 0.28) };
    const g = linear(ctx, ctx.prefix + 'band-' + hex.slice(1), [[0, t.light], [0.4, hex], [1, t.dark]], 0.5, 0, 0.5, 1);
    return `<path d="M${pt(-hw - 4, -8)}Q0 -3 ${pt(hw + 4, -8)}L${pt(hw + 4, 8)}Q0 13 ${pt(-hw - 4, 8)}Z" fill="${g}" stroke="${t.dark}" stroke-opacity=".5" stroke-width=".6"/>`;
  }

  function twine(ctx, hex, hw, sc) {
    const light = U.mix(hex, '#ffffff', 0.35), dark = U.mix(hex, '#000000', 0.35);
    const rope = (d, w = 3.2) =>
      `<path d="${d}" fill="none" stroke="${dark}" stroke-width="${n(w + 0.8)}" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="${hex}" stroke-width="${n(w)}" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="${dark}" stroke-width="${n(w)}" stroke-dasharray="1.2 2.4" stroke-opacity=".55"/>` +
      `<path d="${d}" fill="none" stroke="${light}" stroke-width="${n(w * 0.35)}" stroke-dasharray="2 1.6" stroke-opacity=".7" transform="translate(0 -0.6)"/>`;
    let s = '';
    for (let k = 0; k < 4; k++) {
      const y = -10 + k * 6.5;
      s += rope(`M${pt(-hw - 3, y - 1)}Q${pt(0, y + 3.5)} ${pt(hw + 3, y - 1)}`);
    }
    s += `<g transform="scale(${n(sc * 1.3)})">`;
    s += rope('M0 0C-14-24-42-22-37-5C-33 7-12 6 0 0', 2.8);
    s += rope('M0 0C14-24 42-22 37-5C33 7 12 6 0 0', 2.8);
    s += rope('M-2 2C-7 26-15 52-12 80', 2.8);
    s += rope('M2 2C9 30 15 56 22 86', 2.8);
    s += `<path d="M-12 80l-3 6M-12 80l1 7M-12 80l4 5M22 86l-2 7M22 86l2 6M22 86l5 4" stroke="${hex}" stroke-width="1" stroke-linecap="round"/>`;
    s += `<circle r="5.5" fill="${hex}" stroke="${dark}" stroke-width="1"/><path d="M-3-2Q0 1 3-2M-3 1Q0 4 3 1" fill="none" stroke="${dark}" stroke-width=".8"/>`;
    s += `</g>`;
    return s;
  }


  // ---------- Fotoğraf yeşillikleri (gerçek mod) ----------
  // opts.photo.greens: [{id, w, h, ax, ay, rot}] — rot: dalı yukarı çeviren açı
  const defImage = (ctx, a) => ctx.def(a.id, `<image id="${a.id}" href="${a.href}" width="${a.w}" height="${a.h}"/>`);
  function photoGreens(ctx, list, W, H, count, rnd, gyps) {
    let s = '';
    for (let i = 0; i < count; i++) {
      const g = list[i % list.length];
      defImage(ctx, g);
      const t = count === 1 ? 0.5 : i / (count - 1);
      const phi = (-200 + t * 220 + (rnd() - 0.5) * 14) / DEG;
      const ax = Math.cos(phi) * W * 0.4, ay = Math.sin(phi) * H * 0.4;
      const len = Math.max(W, H) * (gyps ? 0.5 : 0.8) * (0.85 + rnd() * 0.3);
      const sc = len / Math.max(g.w, g.h);
      const dir = phi * DEG + 90 + (rnd() - 0.5) * 16;
      const flip = rnd() < 0.5 ? -1 : 1;
      s +=
        `<g transform="translate(${pt(ax, ay)}) rotate(${n(dir)}) scale(${n(sc * flip)} ${n(sc)}) rotate(${n(g.rot)})">` +
        `<use href="#${g.id}" transform="translate(${n(-g.ax * g.w)} ${n(-g.ay * g.h)})"/></g>`;
    }
    return s;
  }

  // Yeşillik miktarı: az / doğal / bol
  const greenMul = (state, weight = 1) => 1 + (({ az: 0.55, dogal: 1, bol: 1.45 })[state.filler.amount || 'dogal'] - 1) * weight;

  // ---------- Ana çizim ----------
  /*
   * opts: prefix, newIds (Set), editing (boş yerleri göster), selected (yer no),
   *       dropTarget (yer no), photo ({head(slot,i), greens, gyps}), paperTex (resim adresi)
   */
  function render(state, opts = {}) {
    const ctx = makeCtx(opts.prefix || 'b-');
    const { pts } = Model.layout(state.size);
    const SQ = Model.SQ;
    const seed = state.seed || 0;
    const photo = opts.photo || null;

    // Yerlerin 2B konumları
    const slotPos = pts.map((p) => ({ x: p.x, y: p.y * SQ }));
    const heads = [];
    state.slots.forEach((sl, i) => {
      if (!sl) return;
      const r0 = U.rng('h' + sl.t + ':' + seed);
      const base = photo ? photo.size(sl.type) : FLOWERS[sl.type].size;
      heads.push({ slot: i, id: 's' + i + ':' + sl.t, type: sl.type, color: sl.color, x: slotPos[i].x, y: slotPos[i].y, s: base * 1.1 * (0.93 + r0() * 0.14), r0 });
    });
    const N = heads.length;

    // Kubbe ölçüleri (tüm yerlere göre — boyut sabit kalır)
    let W = 62, H = 56;
    slotPos.forEach((p) => {
      W = Math.max(W, Math.abs(p.x) + 36);
      H = Math.max(H, Math.abs(p.y) + 34);
    });
    heads.forEach((h) => {
      W = Math.max(W, Math.abs(h.x) + h.s * 0.95);
      H = Math.max(H, Math.abs(h.y) + h.s * 0.95);
    });
    H = Math.max(H, W * 0.72);
    const hw = 16 + Math.sqrt(Math.max(N, 1)) * 3.2; // bağlama noktasının yarı genişliği
    const ty = H + 82 + W * 0.12; // bağlama noktası (kurdele)
    const newIds = opts.newIds || new Set();

    // ----- Kağıt -----
    const out = paperTones(state.wrap.outer);
    const inn = paperTones(state.wrap.inner);
    let tex = '';
    let texOverlay = null;
    if (opts.paperTex) {
      const pid = ctx.prefix + 'ptex';
      ctx.def(pid, `<pattern id="${pid}" patternUnits="userSpaceOnUse" width="240" height="240"><image href="${opts.paperTex}" width="240" height="240" preserveAspectRatio="none"/></pattern>`);
      texOverlay = `url(#${pid})`;
    } else {
      tex = `filter="url(#${ctx.prefix}paper)"`;
      ctx.def(
        ctx.prefix + 'paper',
        `<filter id="${ctx.prefix}paper" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">` +
          `<feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="7" result="n"/>` +
          `<feColorMatrix in="n" type="saturate" values="0" result="g"/>` +
          `<feComponentTransfer in="g" result="g2"><feFuncR type="linear" slope=".22" intercept=".86"/><feFuncG type="linear" slope=".22" intercept=".86"/><feFuncB type="linear" slope=".22" intercept=".86"/><feFuncA type="linear" slope="0" intercept="1"/></feComponentTransfer>` +
          `<feBlend in="SourceGraphic" in2="g2" mode="multiply" result="b"/>` +
          `<feComposite in="b" in2="SourceGraphic" operator="in"/></filter>`
      );
    }
    // Kağıt katmanı: şekiller + (varsa) gerçek buruşuk kağıt dokusu
    const paper = (shapes, lines = '') => {
      let g = `<g class="deco" ${tex}>` + shapes.map((sh) => `<path d="${sh.d}" fill="${sh.fill}"${sh.extra || ''}/>`).join('') + lines;
      if (texOverlay) g += `<g style="mix-blend-mode:multiply" opacity=".9">` + shapes.map((sh) => `<path d="${sh.d}" fill="${texOverlay}"/>`).join('') + `</g>`;
      return g + `</g>`;
    };
    const prnd = U.rng('paper' + seed);

    const backSheet = (tones, scale, id) => {
      const s = scale;
      const gL = foldGradient(ctx, ctx.prefix + id + 'L', tones, -W * 1.5 * s, 0, [[0, 'dark'], [0.2, 'base'], [0.38, 'light'], [0.55, 'base'], [0.72, 'dark'], [0.88, 'base'], [1, 'deep']]);
      const gR = foldGradient(ctx, ctx.prefix + id + 'R', tones, 0, W * 1.5 * s, [[0, 'deep'], [0.15, 'base'], [0.32, 'light'], [0.5, 'dark'], [0.68, 'base'], [0.85, 'light'], [1, 'dark']]);
      const gC = foldGradient(ctx, ctx.prefix + id + 'C', tones, -W * s, W * s, [[0, 'dark'], [0.25, 'base'], [0.5, 'light'], [0.75, 'base'], [1, 'dark']]);
      const st = ` stroke="${tones.deep}" stroke-opacity=".25" stroke-width=".8"`;
      const lx = -W * 1.42 * s, ly = -H * 0.28 * s, tx = -W * 0.12 * s, tyy = -H * 1.22 * s;
      const rx = W * 1.42 * s, ry = -H * 0.24 * s, t2x = W * 0.1 * s, t2y = -H * 1.2 * s;
      return [
        { d: `M${pt(-hw, ty)}L${pt(-W * 0.9 * s, -H * 0.85 * s)}${ruffle(-W * 0.9 * s, -H * 0.85 * s, W * 0.9 * s, -H * 0.85 * s, 6, 9, prnd, H * 0.42 * s)}L${pt(hw, ty)}Z`, fill: gC },
        { d: `M${pt(-hw, ty)}C${pt(-W * 0.55, H * 0.95)} ${pt(-W * 1.3 * s, H * 0.3)} ${pt(lx, ly)}${ruffle(lx, ly, tx, tyy, 6, 10, prnd, 18 * s)}L${pt(0, ty)}Z`, fill: gL, extra: st },
        { d: `M${pt(hw, ty)}C${pt(W * 0.55, H * 0.95)} ${pt(W * 1.3 * s, H * 0.3)} ${pt(rx, ry)}${ruffle(rx, ry, t2x, t2y, 6, 10, prnd, -18 * s)}L${pt(0, ty)}Z`, fill: gR, extra: st },
      ];
    };

    const frontSheet = (tones, lift, id) => {
      const gL = foldGradient(ctx, ctx.prefix + id + 'L', tones, -W * 1.2, W * 0.4, [[0, 'dark'], [0.18, 'light'], [0.35, 'base'], [0.5, 'lighter'], [0.66, 'base'], [0.82, 'dark'], [1, 'deep']]);
      const gR = foldGradient(ctx, ctx.prefix + id + 'R', tones, -W * 0.35, W * 1.2, [[0, 'deep'], [0.16, 'base'], [0.34, 'light'], [0.52, 'dark'], [0.7, 'base'], [0.86, 'light'], [1, 'dark']]);
      const L1 = [-W * 1.2 - lift * 0.5, H * 0.38 - lift], L2 = [W * 0.32, H * 0.88 - lift];
      const R1 = [W * 1.2 + lift * 0.5, H * 0.46 - lift], R2 = [-W * 0.26, H * 0.95 - lift];
      const st = ` stroke="${tones.deep}" stroke-opacity=".3" stroke-width=".8"`;
      const left = { d: `M${pt(-hw, ty)}C${pt(-hw - 10, ty - 60)} ${pt(-W * 1.02, H * 1.05)} ${pt(L1[0], L1[1])}${ruffle(L1[0], L1[1], L2[0], L2[1], 5, 4, prnd)}C${pt(W * 0.22, H * 1.3)} ${pt(hw * 0.4, ty - 70)} ${pt(hw * 0.5, ty)}Z`, fill: gL, extra: st };
      const right = { d: `M${pt(hw, ty)}C${pt(hw + 10, ty - 60)} ${pt(W * 1.02, H * 1.1)} ${pt(R1[0], R1[1])}${ruffle(R1[0], R1[1], R2[0], R2[1], 5, 4, prnd, 0)}C${pt(-W * 0.18, H * 1.35)} ${pt(-hw * 0.4, ty - 70)} ${pt(-hw * 0.5, ty)}Z`, fill: gR, extra: st };
      const linesL =
        `<path d="M${pt(L1[0], L1[1])}${ruffle(L1[0], L1[1], L2[0], L2[1], 5, 4, U.rng('e' + id))}" fill="none" stroke="${tones.lighter}" stroke-opacity=".6" stroke-width="1.6"/>` +
        `<path d="M${pt(-hw * 0.5, ty)}Q${pt(-W * 0.35, H * 1.2)} ${pt(-W * 0.5, H * 0.62 - lift)}M${pt(-hw * 0.1, ty)}Q${pt(-W * 0.05, H * 1.3)} ${pt(-W * 0.05, H * 0.8 - lift)}" fill="none" stroke="${tones.deep}" stroke-opacity=".18" stroke-width="1.2"/>`;
      const linesR =
        `<path d="M${pt(R1[0], R1[1])}${ruffle(R1[0], R1[1], R2[0], R2[1], 5, 4, U.rng('f' + id))}" fill="none" stroke="${tones.lighter}" stroke-opacity=".6" stroke-width="1.6"/>` +
        `<path d="M${pt(hw * 0.5, ty)}Q${pt(W * 0.4, H * 1.25)} ${pt(W * 0.62, H * 0.7 - lift)}" fill="none" stroke="${tones.lighter}" stroke-opacity=".35" stroke-width="1.4"/>`;
      // sol panelin çizgileri sağ panelin altında kalmalı
      return paper([left], linesL) + paper([right], linesR);
    };

    // ----- Katmanlar -----
    let svg = '';

    // Arka kağıtlar
    svg += paper(backSheet(out, 1, 'po'));
    svg += paper(backSheet(inn, 0.86, 'pi'));

    // Yeşillik
    if (state.filler.green) {
      const cnt = Math.max(2, Math.round((6 + W / 24) * greenMul(state)));
      const grnd = U.rng('green' + seed + Math.round(W / 20));
      if (photo && photo.greens && photo.greens.length) {
        svg += `<g class="deco greens">${photoGreens(ctx, photo.greens, W, H, cnt + 2, grnd)}</g>`;
      } else {
        svg += `<g class="deco greens">${greenery(ctx, W, H, cnt, grnd)}</g>`;
      }
    }

    // Saplar
    const srnd = U.rng('stem');
    const stemPaths = heads.map((h) => {
      const sx = (srnd() - 0.5) * hw * 0.9;
      return `M${pt(sx, ty)}Q${pt(h.x * 0.5 + sx * 0.5, (ty + h.y) / 2 + 12)} ${pt(h.x, h.y)}`;
    });
    if (stemPaths.length) {
      svg += `<g class="deco"><path d="${stemPaths.join('')}" fill="none" stroke="#3f6a2c" stroke-width="4.2" stroke-linecap="round"/>`;
      svg += `<path d="${stemPaths.join('')}" fill="none" stroke="#6f9b50" stroke-width="1.4" stroke-linecap="round" transform="translate(-1 0)"/></g>`;
    }

    // Buketin iç derinliği (çiçek araları koyu görünsün)
    if (N > 1) {
      ctx.def(ctx.prefix + 'depth', `<radialGradient id="${ctx.prefix}depth">${stops([[0, '#1f2e17', 0.75], [0.6, '#24361a', 0.5], [1, '#24361a', 0]])}</radialGradient>`);
      svg += `<ellipse class="deco" cx="0" cy="${n(H * 0.05)}" rx="${n(W * 0.98)}" ry="${n(H * 0.95)}" fill="url(#${ctx.prefix}depth)"/>`;
    }

    // Cipsofil
    if (state.filler.gyps) {
      const cnt = Math.round(U.clamp(10 + state.size * 0.85 + N * 0.4, 10, 70) * greenMul(state, 0.6));
      let g = gypsophila(ctx, W, H, cnt, state.filler.gypsColor, U.rng('gy' + seed + Math.round(W / 15)));
      if (photo && photo.gyps && state.filler.gypsColor.toLowerCase() === '#ffffff') {
        g = photoGreens(ctx, [photo.gyps], W, H, Math.round(2 + W / 70), U.rng('gyp' + seed), true) + g;
      }
      svg += `<g class="deco gyps">${g}</g>`;
    }

    // Çiçek başları (dıştan içe)
    ctx.def(ctx.prefix + 'hs', `<radialGradient id="${ctx.prefix}hs">${stops([[0, '#1b0f08', 0.4], [0.55, '#1b0f08', 0.2], [1, '#1b0f08', 0]])}</radialGradient>`);
    const shadow = `url(#${ctx.prefix}hs)`;
    const R = Math.max(W, H);
    const sorted = heads.slice().sort((a, b) => Math.hypot(b.x, b.y) - 0.25 * b.y - (Math.hypot(a.x, a.y) - 0.25 * a.y));
    sorted.forEach((h) => {
      let body, side;
      if (photo) {
        const ph = photo.head(state.slots[h.slot], h.slot);
        defImage(ctx, ph);
        side = ph.side;
        // çiçeğin etkin yarıçapı (r) birim koordinatta 80'e denk gelsin; ağırlık merkezi ortada
        const k = 80 / ph.r;
        // fotoğraflardaki ışık yönü tutarlı kalsın diye yalnızca hafif döndür
        const spin = side ? 0 : (h.r0() - 0.5) * 36;
        body = `<g transform="rotate(${n(spin)}) scale(${n(k)})"><use href="#${ph.id}" transform="translate(${n(-ph.cx * ph.w)} ${n(-ph.cy * ph.h)})"/></g>`;
      } else {
        const f = FLOWERS[h.type];
        side = f.view === 'side';
        body = f.draw(ctx, h.color, U.rng(h.id + 'd' + seed));
      }
      const dist = Math.hypot(h.x, h.y);
      let tf;
      if (side) {
        const ang = Math.atan2(h.x, ty - h.y) * DEG * 1.25;
        tf = `translate(${pt(h.x, h.y)}) rotate(${n(ang)}) scale(${n(h.s / 100)})`;
      } else {
        const dn = Math.min(1, dist / R);
        const k = 1 - 0.3 * Math.pow(dn, 1.5);
        const phi = Math.atan2(h.y, h.x) * DEG;
        tf = `translate(${pt(h.x, h.y)}) rotate(${n(phi)}) scale(${n(k)} 1) rotate(${n(-phi)}) scale(${n(h.s / 100)})`;
      }
      if (photo) {
        const dn = Math.min(1, dist / R);
        if (dn > 0.55) {
          const lvl = Math.round((dn - 0.55) * 10); // 0..4
          const fid = ctx.prefix + 'dim' + lvl;
          const sl = (1 - 0.035 * (lvl + 1)).toFixed(3);
          ctx.def(fid, `<filter id="${fid}" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope="${sl}"/><feFuncG type="linear" slope="${sl}"/><feFuncB type="linear" slope="${sl}"/></feComponentTransfer></filter>`);
          body = `<g filter="url(#${fid})">${body}</g>`;
        }
      }
      const cls = 'slot-node filled' + (opts.selected === h.slot ? ' is-selected' : '') + (opts.dragFrom === h.slot ? ' is-dragging' : '');
      svg +=
        `<g class="${cls}" data-slot="${h.slot}"><g transform="${tf}"><circle r="112" fill="${shadow}" transform="translate(8 16)"/>` +
        `<g class="head${newIds.has(h.id) ? ' pop' : ''}">${body}</g></g></g>`;
    });

    // Sap uçları (kurdelenin altında)
    const brnd = U.rng('bottom');
    const shown = heads.slice(0, 22);
    let bottom = '';
    const bl = ty + 128;
    shown.forEach((h) => {
      const sx = (brnd() - 0.5) * hw * 0.8;
      const ex = -h.x * 0.14 + (brnd() - 0.5) * 12;
      const ey = bl - brnd() * 16;
      bottom += `<path d="M${pt(sx, ty)}L${pt(ex, ey)}" stroke="#3f6a2c" stroke-width="4.4" stroke-linecap="butt"/>`;
      bottom += `<ellipse cx="${n(ex)}" cy="${n(ey)}" rx="2.3" ry="1.2" fill="#b7d39a"/>`;
    });
    if (!shown.length) {
      for (let i = 0; i < 4; i++) {
        const ex = (i - 1.5) * 7;
        bottom += `<path d="M${pt(ex * 0.3, ty)}L${pt(ex, bl - i * 4)}" stroke="#3f6a2c" stroke-width="4.4"/>`;
      }
    }
    svg += `<g class="deco">${bottom}</g>`;

    // Alt kuyruk kağıdı
    const tailG = foldGradient(ctx, ctx.prefix + 'tail', out, -hw - 26, hw + 26, [[0, 'dark'], [0.2, 'light'], [0.38, 'base'], [0.55, 'lighter'], [0.72, 'base'], [0.88, 'dark'], [1, 'deep']]);
    const bw = hw + 22;
    svg += paper(
      [{ d: `M${pt(-hw, ty)}C${pt(-hw - 6, ty + 26)} ${pt(-bw + 6, ty + 54)} ${pt(-bw, ty + 82)}${ruffle(-bw, ty + 82, bw, ty + 80, 5, -5, prnd)}C${pt(bw - 6, ty + 54)} ${pt(hw + 6, ty + 30)} ${pt(hw, ty)}Z`, fill: tailG, extra: ` stroke="${out.deep}" stroke-opacity=".3" stroke-width=".8"` }],
      `<path d="M${pt(-hw * 0.4, ty + 8)}L${pt(-bw * 0.5, ty + 78)}M${pt(hw * 0.3, ty + 8)}L${pt(bw * 0.4, ty + 78)}" stroke="${out.deep}" stroke-opacity=".2" stroke-width="1"/>`
    );

    // Ön kağıtlar
    svg += frontSheet(inn, 16, 'fi');
    svg += frontSheet(out, 0, 'fo');

    // Kurdele / ip
    const sc = U.clamp(hw / 26, 0.9, 1.4);
    svg += `<g class="deco" transform="translate(0 ${n(ty)})">`;
    if (state.tie.style === 'twine') svg += twine(ctx, state.tie.color, hw, sc);
    else svg += ribbonBand(ctx, state.tie.color, hw) + satinRibbon(ctx, state.tie.color, sc);
    svg += `</g>`;

    // Düzenleme katmanı: boş yerler, seçim ve bırakma hedefi
    let ui = '';
    if (opts.editing) {
      slotPos.forEach((p, i) => {
        if (state.slots[i]) return;
        const hot = opts.dropTarget === i ? ' is-target' : '';
        ui += `<g class="slot-node empty${hot}" data-slot="${i}" transform="translate(${pt(p.x, p.y)})"><circle class="slot-hit" r="24"/><circle class="slot-ring" r="17"/><path class="slot-plus" d="M-5.5 0H5.5M0-5.5V5.5"/></g>`;
      });
    }
    heads.forEach((h) => {
      if (opts.selected === h.slot) ui += `<circle class="sel-ring" cx="${n(h.x)}" cy="${n(h.y)}" r="${n(h.s * 0.95)}"/>`;
      if (opts.dropTarget === h.slot && opts.dragFrom !== h.slot) ui += `<circle class="drop-ring" cx="${n(h.x)}" cy="${n(h.y)}" r="${n(h.s * 0.95)}"/>`;
    });
    svg += `<g class="edit-layer">${ui}</g>`;

    // ----- Görüş alanı -----
    let x0 = -Math.max(W * 1.55, W + 70, hw + 80) - 10;
    let x1 = -x0;
    let y0 = -Math.max(H * 1.45, H + 70) - 10;
    let y1 = bl + 20;
    let w = x1 - x0, h = y1 - y0;
    const minW = 400, minH = 580;
    if (w < minW) { x0 -= (minW - w) / 2; w = minW; }
    if (h < minH) { y0 -= (minH - h) / 2; h = minH; }
    if (w / h < 0.72) { const nw = h * 0.72; x0 -= (nw - w) / 2; w = nw; }

    return {
      body: svg,
      defs: ctx.defsString(),
      viewBox: [x0, y0, w, h],
      count: N,
      slotPos,
      headSize: heads.reduce((m, h) => ((m[h.slot] = h.s), m), {}),
    };
  }

  window.Bouquet = { render, paperTones };
})();
