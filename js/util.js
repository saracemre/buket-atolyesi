/* Yardımcı fonksiyonlar: renk işlemleri, rastgele sayı üreteci, SVG sayı biçimi */
(function () {
  const U = {};

  // ---- Sayı biçimi ----
  U.n = (v) => (Math.round(v * 10) / 10).toString();
  U.pt = (x, y) => U.n(x) + ' ' + U.n(y);

  // ---- Tohumlu rastgele sayı üreteci ----
  U.hash = function (str) {
    let h = 2166136261 >>> 0;
    str = String(str);
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  U.rng = function (seed) {
    let a = typeof seed === 'number' ? seed >>> 0 : U.hash(seed);
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.range = (r, a, b) => a + (b - a) * r();

  // ---- Renk ----
  U.hexToRgb = function (hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const v = parseInt(hex, 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  };
  U.rgbToHex = function (r, g, b) {
    const c = (x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  };
  U.mix = function (a, b, t) {
    const A = U.hexToRgb(a), B = U.hexToRgb(b);
    return U.rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  };
  U.toHsl = function (hex) {
    let [r, g, b] = U.hexToRgb(hex).map((x) => x / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  };
  U.fromHsl = function (h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return U.rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  };
  U.luminance = function (hex) {
    const [r, g, b] = U.hexToRgb(hex);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };

  /*
   * Bir ana renkten gerçekçi gölgelendirme paleti üretir.
   * Beyaz / çok açık renklerde gölgeler gri yerine sıcak krem tonuna kayar.
   */
  U.palette = function (hex) {
    let [h, s, l] = U.toHsl(hex);
    const pale = l > 0.85 && s < 0.6;
    const grey = s < 0.08;
    if (grey || pale) {
      // beyaz çiçek: gölgeler hafif krem/yeşilimsi
      const hh = grey ? 48 : h;
      const ss = grey ? 0.28 : Math.min(s, 0.35);
      return {
        base: hex,
        light: U.mix(hex, '#ffffff', 0.6),
        lighter: '#ffffff',
        dark: U.fromHsl(hh, ss, Math.min(l, 0.95) - 0.13),
        deep: U.fromHsl(hh, ss * 0.9, Math.min(l, 0.95) - 0.3),
        shadow: U.fromHsl(hh, ss * 0.8, 0.45),
      };
    }
    return {
      base: hex,
      light: U.fromHsl(h, s * 0.95, l + (1 - l) * 0.3),
      lighter: U.fromHsl(h, s * 0.85, l + (1 - l) * 0.55),
      dark: U.fromHsl(h + (l > 0.5 ? -3 : 0), Math.min(1, s * 1.05), l * 0.74),
      deep: U.fromHsl(h - 4, Math.min(1, s * 1.1), l * 0.45),
      shadow: U.fromHsl(h - 6, Math.min(1, s * 0.9), l * 0.3),
    };
  };

  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  window.U = U;
})();
