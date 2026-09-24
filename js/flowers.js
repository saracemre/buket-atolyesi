/*
 * Çiçek çizimleri.
 * Her çiçek, merkezi (0,0) olan ve yarıçapı ~100 birim olan bir koordinat
 * sisteminde SVG olarak üretilir; buket bu çizimi ölçekleyip yerleştirir.
 * Gerçekçi görünüm için katmanlı taç yapraklar, gradyanlar ve gölgeler kullanılır.
 */
(function () {
  const { n, pt } = U;

  // ---------- SVG yardımcıları ----------
  function stops(list) {
    return list
      .map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op !== undefined ? ` stop-opacity="${op}"` : ''}/>`)
      .join('');
  }
  function radial(ctx, id, list, r = 100, cx = 0, cy = 0, fx, fy) {
    ctx.def(
      id,
      `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"${
        fx !== undefined ? ` fx="${n(fx)}" fy="${n(fy)}"` : ''
      }>${stops(list)}</radialGradient>`
    );
    return `url(#${id})`;
  }
  // objectBoundingBox doğrusal gradyan (şekille birlikte döner)
  function linear(ctx, id, list, x1 = 0.5, y1 = 1, x2 = 0.5, y2 = 0) {
    ctx.def(id, `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(list)}</linearGradient>`);
    return `url(#${id})`;
  }
  const gid = (ctx, type, hex, name) => `${ctx.prefix}${type}-${hex.replace('#', '')}-${name}`;

  // ---------- Taç yaprak şekilleri (yukarı, -y yönüne bakar) ----------
  function roundPetal(L, w) {
    return (
      `M0 0C${pt(w * 0.95, -L * 0.18)} ${pt(w * 1.08, -L * 0.72)} ${pt(w * 0.5, -L * 0.95)}` +
      `Q${pt(w * 0.18, -L * 1.03)} ${pt(0, -L * 0.96)}Q${pt(-w * 0.18, -L * 1.03)} ${pt(-w * 0.5, -L * 0.95)}` +
      `C${pt(-w * 1.08, -L * 0.72)} ${pt(-w * 0.95, -L * 0.18)} 0 0Z`
    );
  }
  function ruffledPetal(L, w, rnd, bumps = 5) {
    let d = `M0 0C${pt(w * 0.7, -L * 0.14)} ${pt(w * 1.12, -L * 0.48)} ${pt(w * 0.96, -L * 0.76)}`;
    const cy = -L * 0.76, ry = L * 0.24, rx = w * 0.96;
    let prevA = 0;
    for (let j = 1; j <= bumps; j++) {
      const a = (Math.PI * j) / bumps;
      const jr = 0.9 + rnd() * 0.18;
      const px = rx * Math.cos(a), py = cy - ry * Math.sin(a) * jr;
      const ma = (a + prevA) / 2;
      const cx = rx * 1.1 * Math.cos(ma), cyy = cy - ry * 1.18 * Math.sin(ma) * (0.95 + rnd() * 0.2);
      d += `Q${pt(cx, cyy)} ${pt(px, py)}`;
      prevA = a;
    }
    d += `C${pt(-w * 1.12, -L * 0.48)} ${pt(-w * 0.7, -L * 0.14)} 0 0Z`;
    return d;
  }
  function slenderPetal(L, w, start) {
    return (
      `M${pt(-w * 0.35, -start)}C${pt(-w, -start - 18)} ${pt(-w * 1.05, -L * 0.82)} ${pt(-w * 0.42, -L * 0.985)}` +
      `Q${pt(0, -L * 1.035)} ${pt(w * 0.42, -L * 0.985)}C${pt(w * 1.05, -L * 0.82)} ${pt(w, -start - 18)} ${pt(w * 0.35, -start)}Z`
    );
  }
  function pointedPetal(L, w, start) {
    return (
      `M${pt(-w * 0.5, -start)}C${pt(-w * 1.05, -start - 16)} ${pt(-w * 0.9, -L * 0.78)} ${pt(0, -L)}` +
      `C${pt(w * 0.9, -L * 0.78)} ${pt(w * 1.05, -start - 16)} ${pt(w * 0.5, -start)}Z`
    );
  }
  function crescent(rr, theta = 75, flat = 1.35) {
    const t = (theta * Math.PI) / 180;
    const x = rr * Math.sin(t), y = -rr * Math.cos(t);
    return `M${pt(-x, y)}A${n(rr)} ${n(rr)} 0 0 1 ${pt(x, y)}A${n(rr * flat)} ${n(rr * flat)} 0 0 0 ${pt(-x, y)}Z`;
  }

  // ---------- GÜL ----------
  function rose(ctx, hex, rnd) {
    const p = U.palette(hex);
    const out = radial(ctx, gid(ctx, 'rose', hex, 'o'), [[0, p.shadow], [0.28, p.deep], [0.55, p.dark], [0.82, p.base], [1, p.light]]);
    const rim = linear(ctx, gid(ctx, 'rose', hex, 'r'), [[0, p.base, 0], [0.62, p.base, 0], [1, p.lighter, 0.7]]);
    const cup = linear(ctx, gid(ctx, 'rose', hex, 'c'), [[0, p.deep], [0.55, p.dark], [0.85, p.base], [1, p.light]]);
    const core = radial(ctx, gid(ctx, 'rose', hex, 'k'), [[0, p.shadow], [0.7, p.deep], [1, p.dark]], 40);
    const spin = rnd() * 360;
    let s = '';
    const layers = [
      { k: 5, L: 100, w: 60, rot: 0 },
      { k: 5, L: 82, w: 54, rot: 36 },
      { k: 5, L: 64, w: 46, rot: 14 },
      { k: 4, L: 50, w: 44, rot: 50 },
    ];
    layers.forEach((ly) => {
      for (let i = 0; i < ly.k; i++) {
        const a = spin + ly.rot + (i * 360) / ly.k + (rnd() - 0.5) * 16;
        const L = ly.L * (0.92 + rnd() * 0.1), w = ly.w * (0.92 + rnd() * 0.14);
        const d = roundPetal(L, w);
        s +=
          `<g transform="rotate(${n(a)})">` +
          `<path d="${d}" fill="${p.shadow}" opacity=".35" transform="translate(0 4) scale(1.05)"/>` +
          `<path d="${d}" fill="${out}" stroke="${p.deep}" stroke-opacity=".35" stroke-width=".8"/>` +
          `<path d="${d}" fill="${rim}"/>` +
          `<path d="M${pt(w * 0.62, -L * 0.9)}Q${pt(0, -L * 1.06)} ${pt(-w * 0.62, -L * 0.9)}" fill="none" stroke="${p.lighter}" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/>` +
          `</g>`;
      }
    });
    // Merkez: iç içe sarılı taç yapraklar
    s += `<circle r="36" fill="${core}"/>`;
    for (let k = 0; k < 11; k++) {
      const rr = 36 - k * 3.05;
      const a = spin + k * 137.5;
      s +=
        `<g transform="rotate(${n(a)}) translate(0 ${n(k * 0.35)})">` +
        `<path d="${crescent(rr, 72 + rnd() * 12)}" fill="${p.shadow}" opacity=".35" transform="translate(0 2)"/>` +
        `<path d="${crescent(rr, 72 + rnd() * 12)}" fill="${cup}" stroke="${p.deep}" stroke-opacity=".5" stroke-width=".7"/></g>`;
    }
    s += `<circle r="3.5" fill="${p.shadow}"/>`;
    return s;
  }

  // ---------- ŞAKAYIK ----------
  function peony(ctx, hex, rnd) {
    const p = U.palette(hex);
    const out = radial(ctx, gid(ctx, 'peony', hex, 'o'), [[0, p.deep], [0.3, p.dark], [0.6, p.base], [0.88, p.light], [1, p.lighter]]);
    const rim = linear(ctx, gid(ctx, 'peony', hex, 'r'), [[0, p.base, 0], [0.6, p.base, 0], [1, p.lighter, 0.65]]);
    const cup = linear(ctx, gid(ctx, 'peony', hex, 'c'), [[0, p.dark], [0.5, p.base], [1, p.lighter]]);
    const spin = rnd() * 360;
    let s = '';
    const layers = [
      { k: 8, L: 100, w: 42, rot: 0 },
      { k: 8, L: 88, w: 42, rot: 22 },
      { k: 7, L: 72, w: 38, rot: 8 },
      { k: 7, L: 58, w: 34, rot: 30 },
    ];
    layers.forEach((ly) => {
      for (let i = 0; i < ly.k; i++) {
        const a = spin + ly.rot + (i * 360) / ly.k + (rnd() - 0.5) * 18;
        const L = ly.L * (0.9 + rnd() * 0.14), w = ly.w * (0.9 + rnd() * 0.2);
        const d = ruffledPetal(L, w, rnd, 4 + Math.floor(rnd() * 3));
        s +=
          `<g transform="rotate(${n(a)})">` +
          `<path d="${d}" fill="${p.shadow}" opacity=".28" transform="translate(0 4) scale(1.04)"/>` +
          `<path d="${d}" fill="${out}" stroke="${p.dark}" stroke-opacity=".35" stroke-width=".7"/>` +
          `<path d="${d}" fill="${rim}"/>` +
          `<path d="M0 -6Q${pt(w * 0.2, -L * 0.5)} ${pt(w * 0.1, -L * 0.85)}M0 -6Q${pt(-w * 0.3, -L * 0.45)} ${pt(-w * 0.45, -L * 0.8)}" fill="none" stroke="${p.lighter}" stroke-opacity=".3" stroke-width=".9"/>` +
          `</g>`;
      }
    });
    // Merkez: buruşuk küçük yapraklar
    const inner = [];
    for (let i = 0; i < 18; i++) inner.push({ a: rnd() * 360, r: rnd() * 12, L: 20 + rnd() * 22, w: 14 + rnd() * 12 });
    inner.sort((a, b) => b.L - a.L);
    inner.forEach((q) => {
      const d = ruffledPetal(q.L, q.w, rnd, 4);
      const ox = Math.cos((q.a * Math.PI) / 180) * q.r, oy = Math.sin((q.a * Math.PI) / 180) * q.r;
      s +=
        `<g transform="translate(${pt(ox, oy)}) rotate(${n(q.a + 90)})">` +
        `<path d="${d}" fill="${p.shadow}" opacity=".3" transform="translate(0 3)"/>` +
        `<path d="${d}" fill="${cup}" stroke="${p.dark}" stroke-opacity=".4" stroke-width=".6"/></g>`;
    });
    for (let k = 0; k < 5; k++) {
      const rr = 14 - k * 2.4;
      s += `<path transform="rotate(${n(spin + k * 140)})" d="${crescent(rr, 78)}" fill="${cup}" stroke="${p.dark}" stroke-opacity=".5" stroke-width=".6"/>`;
    }
    return s;
  }

  // ---------- KARANFİL ----------
  function carnation(ctx, hex, rnd) {
    const p = U.palette(hex);
    let s = '';
    const rings = [100, 85, 70, 55, 40, 26, 13];
    rings.forEach((R, j) => {
      const g = radial(ctx, gid(ctx, 'carn', hex, 'r' + j), [[0, p.deep], [0.55, p.dark], [0.82, p.base], [1, p.light]], R);
      const lobes = 6 + Math.floor(rnd() * 4);
      const ph = rnd() * 6.28, ph2 = rnd() * 6.28;
      const ox = (rnd() - 0.5) * 5 * (j > 0 ? 1 : 0), oy = (rnd() - 0.5) * 5 * (j > 0 ? 1 : 0);
      const N = Math.round(60 + R * 1.3);
      let d = '';
      for (let t = 0; t < N; t++) {
        const a = (t / N) * Math.PI * 2;
        const lobe = 0.86 + 0.14 * Math.pow(Math.abs(Math.sin((lobes * a) / 2 + ph)), 0.55);
        const serr = (t % 2 ? -1 : 1) * 0.028 * (0.5 + rnd());
        const rr = R * (lobe + serr) * (1 + 0.04 * Math.sin(2 * a + ph2));
        d += (t === 0 ? 'M' : 'L') + pt(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      d += 'Z';
      s += `<g transform="translate(${pt(ox, oy)}) rotate(${n(rnd() * 360)})">`;
      s += `<path d="${d}" fill="${p.shadow}" opacity=".35" transform="translate(0 3.5)"/>`;
      s += `<path d="${d}" fill="${g}" stroke="${p.deep}" stroke-opacity=".3" stroke-width=".6" stroke-linejoin="round"/>`;
      // kıvrım çizgileri
      let f = '';
      const folds = 7 + Math.floor(R / 12);
      for (let i = 0; i < folds; i++) {
        const a = rnd() * 6.28, r1 = R * (0.45 + rnd() * 0.2), r2 = R * (0.86 + rnd() * 0.08);
        const b = a + (rnd() - 0.5) * 0.35;
        f += `M${pt(Math.cos(a) * r1, Math.sin(a) * r1)}Q${pt(Math.cos(b) * (r1 + r2) * 0.5 + 3, Math.sin(b) * (r1 + r2) * 0.5)} ${pt(Math.cos(b) * r2, Math.sin(b) * r2)}`;
      }
      s += `<path d="${f}" fill="none" stroke="${p.deep}" stroke-opacity=".3" stroke-width="1.1" stroke-linecap="round"/>`;
      s += `<path d="${f}" fill="none" stroke="${p.lighter}" stroke-opacity=".25" stroke-width=".8" transform="translate(1.2 -1)"/>`;
      s += `</g>`;
    });
    return s;
  }

  // ---------- PAPATYA ----------
  function daisy(ctx, hex, rnd) {
    const p = U.palette(hex);
    const yellowish = (() => { const [h, sat, l] = U.toHsl(hex); return h > 35 && h < 70 && sat > 0.5 && l < 0.85; })();
    const pf = linear(ctx, gid(ctx, 'daisy', hex, 'f'), [[0, p.dark], [0.3, p.base], [0.8, p.light], [1, p.base]]);
    const pb = linear(ctx, gid(ctx, 'daisy', hex, 'b'), [[0, p.deep], [0.4, p.dark], [1, p.base]]);
    const c = yellowish
      ? ['#8a5a1e', '#6b3f12', '#4a2a0a', '#2e1905', '#a2742a']
      : ['#fbe05a', '#f2b51f', '#dc8f0b', '#b56a05', '#c77a08'];
    const cg = radial(ctx, gid(ctx, 'daisy', hex, 'c' + (yellowish ? 'b' : 'y')), [[0, c[0]], [0.55, c[1]], [0.85, c[2]], [1, c[3]]], 28, 0, 0, -6, -8);
    const spin = rnd() * 360;
    let s = '';
    const back = 14, front = 21;
    for (let i = 0; i < back; i++) {
      const a = spin + (i + 0.5) * (360 / back) + (rnd() - 0.5) * 8;
      s += `<path transform="rotate(${n(a)})" d="${slenderPetal(92 * (0.92 + rnd() * 0.1), 12.5, 20)}" fill="${pb}" stroke="${p.deep}" stroke-opacity=".3" stroke-width=".6"/>`;
    }
    for (let i = 0; i < front; i++) {
      const a = spin + i * (360 / front) + (rnd() - 0.5) * 7;
      const L = 100 * (0.9 + rnd() * 0.12), w = 11 + rnd() * 2;
      const d = slenderPetal(L, w, 20);
      s +=
        `<g transform="rotate(${n(a)})">` +
        `<path d="${d}" fill="${p.shadow}" opacity=".2" transform="translate(1.5 2)"/>` +
        `<path d="${d}" fill="${pf}" stroke="${p.dark}" stroke-opacity=".45" stroke-width=".6"/>` +
        `<path d="M0 -28L0 ${n(-L * 0.9)}" stroke="${p.dark}" stroke-opacity=".35" stroke-width=".9"/>` +
        `<path d="M${pt(-w * 0.45, -34)}L${pt(-w * 0.4, -L * 0.8)}M${pt(w * 0.45, -34)}L${pt(w * 0.4, -L * 0.8)}" stroke="${p.lighter}" stroke-opacity=".35" stroke-width=".7"/>` +
        `</g>`;
    }
    s += `<circle r="29" fill="${p.shadow}" opacity=".25" transform="translate(1 3)"/>`;
    s += `<circle r="27" fill="${cg}"/>`;
    let dots = '';
    for (let i = 0; i < 90; i++) {
      const r = 25 * Math.sqrt((i + 0.5) / 90), a = i * 2.39996;
      dots += `<circle cx="${n(Math.cos(a) * r)}" cy="${n(Math.sin(a) * r)}" r="${n(1.1 + (r / 25) * 0.7)}"/>`;
    }
    s += `<g fill="${c[4]}" opacity=".75">${dots}</g>`;
    s += `<ellipse cx="-7" cy="-8" rx="11" ry="7" fill="#fff" opacity=".22"/>`;
    return s;
  }

  // ---------- AYÇİÇEĞİ ----------
  function sunflower(ctx, hex, rnd) {
    const p = U.palette(hex);
    const pf = linear(ctx, gid(ctx, 'sun', hex, 'f'), [[0, p.dark], [0.25, p.base], [0.75, p.light], [1, p.base]]);
    const pb = linear(ctx, gid(ctx, 'sun', hex, 'b'), [[0, p.shadow], [0.3, p.deep], [1, p.dark]]);
    const disk = radial(ctx, gid(ctx, 'sun', 'x', 'd'), [[0, '#2b1707'], [0.45, '#3f250c'], [0.78, '#5a3715'], [0.9, '#6b4619'], [1, '#2e1a08']], 50, 0, 0, -8, -10);
    const spin = rnd() * 360;
    const k = 24;
    let s = '';
    for (let i = 0; i < k; i++) {
      const a = spin + (i + 0.5) * (360 / k) + (rnd() - 0.5) * 6;
      s += `<path transform="rotate(${n(a)})" d="${pointedPetal(100 * (0.92 + rnd() * 0.1), 15, 40)}" fill="${pb}" stroke="${p.shadow}" stroke-opacity=".3" stroke-width=".6"/>`;
    }
    for (let i = 0; i < k; i++) {
      const a = spin + i * (360 / k) + (rnd() - 0.5) * 6;
      const L = 92 * (0.88 + rnd() * 0.14), w = 14 + rnd() * 3;
      const d = pointedPetal(L, w, 42);
      s +=
        `<g transform="rotate(${n(a)}) scale(${n(0.85 + rnd() * 0.25)} 1)">` +
        `<path d="${d}" fill="${p.shadow}" opacity=".25" transform="translate(1.5 2.5)"/>` +
        `<path d="${d}" fill="${pf}" stroke="${p.deep}" stroke-opacity=".35" stroke-width=".6"/>` +
        `<path d="M0 -46Q1.5 ${n(-L * 0.6)} 0 ${n(-L * 0.93)}M-4 -50Q${pt(-w * 0.35, -L * 0.6)} ${pt(-w * 0.2, -L * 0.85)}M4 -50Q${pt(w * 0.35, -L * 0.6)} ${pt(w * 0.2, -L * 0.85)}" fill="none" stroke="${p.dark}" stroke-opacity=".35" stroke-width=".8"/>` +
        `</g>`;
    }
    s += `<circle r="52" fill="#1a0e04" opacity=".35" transform="translate(1 3)"/>`;
    s += `<circle r="50" fill="${disk}"/>`;
    let seeds1 = '', seeds2 = '';
    const N = 170;
    for (let i = 0; i < N; i++) {
      const r = 44 * Math.sqrt((i + 0.5) / N), a = i * 2.39996;
      const c = `<circle cx="${n(Math.cos(a) * r)}" cy="${n(Math.sin(a) * r)}" r="${n(1.1 + (r / 44) * 1.2)}"/>`;
      if (i % 2) seeds1 += c; else seeds2 += c;
    }
    s += `<g fill="#7a5222" opacity=".75">${seeds1}</g><g fill="#1f1105" opacity=".8">${seeds2}</g>`;
    let fl = '';
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * 6.283 + rnd() * 0.05;
      fl += `<circle cx="${n(Math.cos(a) * 47)}" cy="${n(Math.sin(a) * 47)}" r="2.2"/>`;
    }
    s += `<g fill="#9a7a26" opacity=".85">${fl}</g>`;
    s += `<ellipse cx="-12" cy="-14" rx="18" ry="12" fill="#fff" opacity=".07"/>`;
    return s;
  }

  // ---------- LALE (yandan görünüm) ----------
  const TULIP = 'M0 50C-44 48-54 0-45-46C-38-76-18-92 0-100C18-92 38-76 45-46C54 0 44 48 0 50Z';
  function tulip(ctx, hex, rnd) {
    const p = U.palette(hex);
    const side = linear(ctx, gid(ctx, 'tulip', hex, 's'), [[0, p.deep], [0.16, p.dark], [0.42, p.base], [0.6, p.light], [0.78, p.base], [1, p.deep]], 0, 0.5, 1, 0.5);
    const back = linear(ctx, gid(ctx, 'tulip', hex, 'b'), [[0, p.deep], [0.5, p.dark], [1, p.deep]], 0, 0.5, 1, 0.5);
    const foot = linear(ctx, gid(ctx, 'tulip', hex, 'g'), [[0, '#9dae4b', 0], [0.7, '#9dae4b', 0], [1, '#7f9a3a', 0.55]], 0.5, 0, 0.5, 1);
    const tip = linear(ctx, gid(ctx, 'tulip', hex, 't'), [[0, p.lighter, 0.35], [0.3, p.lighter, 0], [1, p.lighter, 0]], 0.5, 0, 0.5, 1);
    const tilt = (rnd() - 0.5) * 8;
    let s = `<g transform="translate(0 22) rotate(${n(tilt)})">`;
    s += `<path d="${TULIP}" fill="${back}" transform="translate(0 -6) scale(.92 1.02)"/>`;
    s += `<path d="${TULIP}" fill="${p.shadow}" opacity=".35" transform="translate(-14 6) rotate(-9) scale(.72 .95)"/>`;
    s += `<path d="${TULIP}" fill="${side}" stroke="${p.deep}" stroke-opacity=".35" stroke-width=".8" transform="translate(-18 4) rotate(-10) scale(.7 .95)"/>`;
    s += `<path d="${TULIP}" fill="${foot}" transform="translate(-18 4) rotate(-10) scale(.7 .95)"/>`;
    s += `<path d="${TULIP}" fill="${p.shadow}" opacity=".35" transform="translate(20 6) rotate(9) scale(.72 .95)"/>`;
    s += `<path d="${TULIP}" fill="${side}" stroke="${p.deep}" stroke-opacity=".35" stroke-width=".8" transform="translate(18 4) rotate(10) scale(.7 .95)"/>`;
    s += `<path d="${TULIP}" fill="${foot}" transform="translate(18 4) rotate(10) scale(.7 .95)"/>`;
    const front = `translate(${n((rnd() - 0.5) * 4)} 10) scale(.78 .9)`;
    s += `<path d="${TULIP}" fill="${p.shadow}" opacity=".35" transform="translate(2 13) scale(.8 .9)"/>`;
    s += `<path d="${TULIP}" fill="${side}" stroke="${p.deep}" stroke-opacity=".4" stroke-width=".8" transform="${front}"/>`;
    s += `<path d="${TULIP}" fill="${foot}" transform="${front}"/>`;
    s += `<path d="${TULIP}" fill="${tip}" transform="${front}"/>`;
    s += `<path d="M-9 44C-15 5-12-40-4-84" transform="${front}" fill="none" stroke="${p.lighter}" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/>`;
    s += `<path d="M4 46C8 10 8-40 2-86" transform="${front}" fill="none" stroke="${p.deep}" stroke-opacity=".2" stroke-width="1.5"/>`;
    s += `</g>`;
    return s;
  }

  // ---------- LİLYUM ----------
  function lily(ctx, hex, rnd) {
    const p = U.palette(hex);
    const pale = U.luminance(hex) > 0.82;
    const throat = U.mix(hex, '#c7d672', pale ? 0.55 : 0.45);
    const pg = linear(ctx, gid(ctx, 'lily', hex, 'p'), [[0, throat], [0.2, pale ? U.mix(hex, '#e8eec0', 0.4) : p.dark], [0.5, p.base], [0.85, p.light], [1, p.lighter]]);
    const curve = linear(ctx, gid(ctx, 'lily', hex, 'v'), [[0, p.shadow, 0.3], [0.35, p.shadow, 0], [0.65, p.shadow, 0], [1, p.shadow, 0.3]], 0, 0.5, 1, 0.5);
    const spin = rnd() * 360;
    const petal = (L, w) => `M0 0C${pt(w * 1.25, -L * 0.2)} ${pt(w * 0.95, -L * 0.68)} ${pt(0, -L)}C${pt(-w * 0.95, -L * 0.68)} ${pt(-w * 1.25, -L * 0.2)} 0 0Z`;
    let s = '';
    const draw = (a, L, w, dim) => {
      const d = petal(L, w);
      let spots = '';
      const nSpots = pale ? 0 : 12;
      for (let i = 0; i < nSpots; i++) {
        const t = 0.14 + rnd() * 0.4;
        spots += `<circle cx="${n((rnd() - 0.5) * w * 0.9 * (1 - t))}" cy="${n(-L * t)}" r="${n(0.9 + rnd() * 1.3)}"/>`;
      }
      return (
        `<g transform="rotate(${n(a)})">` +
        `<path d="${d}" fill="${p.shadow}" opacity=".3" transform="translate(0 4) scale(1.03)"/>` +
        `<path d="${d}" fill="${pg}" stroke="${p.dark}" stroke-opacity=".35" stroke-width=".7"/>` +
        `<path d="${d}" fill="${curve}"/>` +
        (dim ? `<path d="${d}" fill="${p.shadow}" opacity=".12"/>` : '') +
        `<path d="M0 -8Q2 ${n(-L * 0.5)} 0 ${n(-L * 0.92)}" fill="none" stroke="${p.lighter}" stroke-opacity=".7" stroke-width="2.4"/>` +
        `<path d="M1.6 -8Q3.6 ${n(-L * 0.5)} 1.4 ${n(-L * 0.9)}" fill="none" stroke="${p.deep}" stroke-opacity=".3" stroke-width=".8"/>` +
        `<g fill="${p.shadow}" opacity=".75">${spots}</g>` +
        `</g>`
      );
    };
    for (let i = 0; i < 3; i++) s += draw(spin + i * 120 + (rnd() - 0.5) * 10, 100 * (0.95 + rnd() * 0.07), 33, true);
    for (let i = 0; i < 3; i++) s += draw(spin + 60 + i * 120 + (rnd() - 0.5) * 10, 94 * (0.95 + rnd() * 0.07), 27, false);
    s += `<circle r="12" fill="${throat}" opacity=".9"/>`;
    // Erkek organlar
    let fil = '', anth = '';
    for (let i = 0; i < 6; i++) {
      const a = ((spin + 30 + i * 60 + (rnd() - 0.5) * 18) * Math.PI) / 180;
      const r = 48 + rnd() * 10;
      const ex = Math.cos(a) * r, ey = Math.sin(a) * r;
      const b = a + 0.25;
      fil += `M0 0Q${pt(Math.cos(b) * r * 0.5, Math.sin(b) * r * 0.5)} ${pt(ex, ey)}`;
      anth += `<ellipse cx="${n(ex)}" cy="${n(ey)}" rx="6" ry="2.4" transform="rotate(${n((a * 180) / Math.PI + 90)} ${pt(ex, ey)})"/>`;
    }
    s += `<path d="${fil}" fill="none" stroke="#d9e6b0" stroke-width="1.7" stroke-linecap="round"/>`;
    s += `<g fill="#7a3210" stroke="#4d1f08" stroke-width=".5">${anth}</g>`;
    const pa = ((spin + 5) * Math.PI) / 180;
    const px = Math.cos(pa) * 58, py = Math.sin(pa) * 58;
    s += `<path d="M0 0Q${pt(px * 0.5 + 4, py * 0.5 - 4)} ${pt(px, py)}" fill="none" stroke="#c3d98f" stroke-width="2.6" stroke-linecap="round"/>`;
    s += `<circle cx="${n(px)}" cy="${n(py)}" r="4.2" fill="#9eb865"/>`;
    return s;
  }

  // ---------- Tanımlar ----------
  const FLOWERS = {
    rose: {
      name: 'Gül', size: 34, view: 'face', shape: 'ball', draw: rose,
      colors: [
        ['Kırmızı', '#b3122c'], ['Bordo', '#6f0d1f'], ['Pembe', '#e7708f'], ['Açık Pembe', '#f4b9c7'],
        ['Beyaz', '#f7f2e8'], ['Krem', '#f3e2c3'], ['Sarı', '#f2c93f'], ['Şeftali', '#f5a57f'],
        ['Turuncu', '#ec7630'], ['Lila', '#b58fce'],
      ],
    },
    tulip: {
      name: 'Lale', size: 31, view: 'side', shape: 'side', draw: tulip,
      colors: [
        ['Kırmızı', '#d0202f'], ['Pembe', '#ec7aa3'], ['Sarı', '#f2c323'], ['Beyaz', '#f7f4ea'],
        ['Mor', '#6c3a92'], ['Turuncu', '#ef7b22'], ['Lila', '#b99ad6'],
      ],
    },
    peony: {
      name: 'Şakayık', size: 44, view: 'face', shape: 'ball', draw: peony,
      colors: [
        ['Pembe', '#ef93ae'], ['Pudra', '#f7cdd6'], ['Beyaz', '#f8f4ee'], ['Mercan', '#f27a6b'],
        ['Fuşya', '#c9336c'], ['Bordo', '#7c1530'],
      ],
    },
    sunflower: {
      name: 'Ayçiçeği', size: 44, view: 'face', shape: 'flat', draw: sunflower,
      colors: [['Sarı', '#f6b90e'], ['Altın', '#f1a20b'], ['Turuncu', '#e97c12'], ['Kızıl', '#b4431d']],
    },
    daisy: {
      name: 'Papatya', size: 29, view: 'face', shape: 'flat', draw: daisy,
      colors: [['Beyaz', '#f8f6f0'], ['Pembe', '#f3a6c1'], ['Sarı', '#f7d557'], ['Lila', '#c6a9e6']],
    },
    carnation: {
      name: 'Karanfil', size: 30, view: 'face', shape: 'ball', draw: carnation,
      colors: [
        ['Kırmızı', '#c3172e'], ['Pembe', '#ee86a5'], ['Beyaz', '#f7f3ea'], ['Sarı', '#f4cd4a'],
        ['Mor', '#8a4aa3'], ['Turuncu', '#f0843a'], ['Bordo', '#741329'],
      ],
    },
    lily: {
      name: 'Lilyum', size: 46, view: 'face', shape: 'flat', draw: lily,
      colors: [['Beyaz', '#faf8f2'], ['Pembe', '#e8739f'], ['Turuncu', '#f2872c'], ['Sarı', '#f6cd3d']],
    },
  };

  // Bağımsız (tek çiçek) SVG üretir — kartlar ve liste simgeleri için
  let miniCounter = 0;
  function viewBoxOf(type) {
    const f = FLOWERS[type];
    return f.viewBox || (f.view === 'side' ? '-90 -92 180 180' : '-108 -108 216 216');
  }
  function miniSVG(type, hex, seed = 'mini') {
    const f = FLOWERS[type];
    const ctx = makeCtx('m' + miniCounter++ + '-');
    const body = f.draw(ctx, hex, U.rng(seed + type));
    return `<svg viewBox="${viewBoxOf(type)}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>${ctx.defsString()}</defs>${body}</svg>`;
  }
  // 3D doku için sabit boyutlu, tek başına geçerli SVG
  function textureSVG(type, hex, size = 512, seed = 'tex') {
    const f = FLOWERS[type];
    const ctx = makeCtx('t' + miniCounter++ + '-');
    const body = f.draw(ctx, hex, U.rng(seed + type));
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBoxOf(type)}"><defs>${ctx.defsString()}</defs>${body}</svg>`;
  }

  function makeCtx(prefix) {
    const defs = new Map();
    return {
      prefix,
      def(id, content) { if (!defs.has(id)) defs.set(id, content); },
      defsString() { return Array.from(defs.values()).join(''); },
    };
  }

  window.Flowers = {
    FLOWERS, miniSVG, textureSVG, viewBoxOf, makeCtx, radial, linear, stops,
    helpers: { gid, roundPetal, ruffledPetal, slenderPetal, pointedPetal, crescent, draw: { rose } },
  };
})();
