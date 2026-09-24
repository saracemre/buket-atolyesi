/*
 * 3B buket görünümü (Three.js r186).
 * Gerçek 3B çiçek modelleri (flowers3d.js), stüdyo ortam ışığı (RoomEnvironment),
 * yumuşak gölgeler, ortam kapanması (GTAO) ve ataletli döndürme (OrbitControls).
 */
(function () {
  if (!window.THREE) return;
  const T = THREE;
  const TAU = Math.PI * 2;

  // ---------- Yardımcılar ----------
  function blankCanvas(w = 4, h = 4) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function markerCanvas(hot) {
    const c = blankCanvas(128, 128);
    const g = c.getContext('2d');
    g.fillStyle = hot ? 'rgba(184,56,94,0.85)' : 'rgba(255,255,255,0.55)';
    g.beginPath(); g.arc(64, 64, 58, 0, TAU); g.fill();
    g.lineWidth = 7;
    g.strokeStyle = hot ? '#ffffff' : 'rgba(184,56,94,0.95)';
    g.setLineDash([14, 10]);
    g.beginPath(); g.arc(64, 64, 52, 0, TAU); g.stroke();
    g.setLineDash([]);
    g.lineWidth = 9;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(40, 64); g.lineTo(88, 64); g.moveTo(64, 40); g.lineTo(64, 88); g.stroke();
    return c;
  }

  // Bir eğri boyunca yassı şerit (kurdele)
  function stripGeometry(curve, samples, widthAt, dirAt, cut) {
    const pos = [], uv = [], idx = [];
    const P = new T.Vector3(), Tg = new T.Vector3(), D = new T.Vector3();
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      curve.getPointAt(t, P);
      curve.getTangentAt(t, Tg);
      D.copy(dirAt(t));
      D.sub(Tg.clone().multiplyScalar(D.dot(Tg))).normalize();
      const w = widthAt(t) / 2;
      let a = P.clone().addScaledVector(D, -w), b = P.clone().addScaledVector(D, w);
      if (cut && i === samples) {
        // V kesik uç
        a = a.addScaledVector(Tg, cut);
        b = b.addScaledVector(Tg, cut);
      }
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      uv.push(0, t, 1, t);
    }
    if (cut) {
      curve.getPointAt(1, P);
      pos.push(P.x, P.y, P.z);
      uv.push(0.5, 1);
    }
    for (let i = 0; i < samples; i++) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    if (cut) {
      const c = (samples + 1) * 2, a = samples * 2;
      idx.push(a, c, a + 1);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  // Pileli, kenarı dalgalı konik kağıt yüzeyi
  function paperGeometry(o) {
    const { r0, r1, height, tSeg = 26, aSeg = 120, seed = 1, down = false } = o;
    const rnd = U.rng('pg' + seed);
    const ph = [rnd() * TAU, rnd() * TAU, rnd() * TAU, rnd() * TAU];
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= tSeg; i++) {
      const t = i / tSeg;
      const tt = down ? t : Math.pow(t, 1.15);
      for (let j = 0; j <= aSeg; j++) {
        const a = (j / aSeg) * TAU;
        const pleat = 1 + t * (0.075 * Math.sin(11 * a + ph[0]) + 0.035 * Math.sin(23 * a + ph[1]));
        const R1 = typeof r1 === 'function' ? r1(a) : r1;
        const r = (r0 + (R1 - r0) * tt) * pleat;
        const hh = height(a) * (down ? -1 : 1);
        const edge = t * (6 * Math.sin(7 * a + ph[2]) + 3.5 * Math.sin(17 * a + ph[3])) * (down ? 0.5 : 1);
        const y = t * hh + edge * t;
        pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
        uv.push((a / TAU) * 4, t * 2.4);
      }
    }
    for (let i = 0; i < tSeg; i++) {
      for (let j = 0; j < aSeg; j++) {
        const a = i * (aSeg + 1) + j, b = a + aSeg + 1;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  // Arka plan: sahneyle uyumlu yumuşak degrade
  function backgroundTexture() {
    const c = blankCanvas(8, 512);
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 512);
    grd.addColorStop(0, '#f7f1e9');
    grd.addColorStop(0.55, '#f1e8dd');
    grd.addColorStop(1, '#e7dbcd');
    g.fillStyle = grd;
    g.fillRect(0, 0, 8, 512);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    return t;
  }

  // Fotoğraf rengini 3B için biraz canlandır
  function vivid(hex) {
    const [h, s, l] = U.toHsl(hex);
    // soluk fotoğraf renklerini (ör. mavi ortanca) belirginleştir
    const s2 = s < 0.35 ? Math.min(1, s * 1.6 + 0.1) : Math.min(1, s * 1.18);
    return U.fromHsl(h, s2, l);
  }

  // ---------- Görünüm ----------
  function create(container, handlers = {}) {
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    const basePR = Math.min(1.75, window.devicePixelRatio || 1);
    renderer.setPixelRatio(basePR);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    // ışıklar sabit: gölge haritası yalnızca sahne değişince yeniden hesaplanır (döndürme hızlanır)
    renderer.shadowMap.autoUpdate = false;
    renderer.domElement.className = 'gl-canvas';
    container.appendChild(renderer.domElement);

    const scene = new T.Scene();
    scene.background = backgroundTexture();
    const pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new T.RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.42;

    const camera = new T.PerspectiveCamera(30, 1, 5, 8000);
    const key = new T.DirectionalLight(0xfff1e2, 2.4);
    key.position.set(-260, 560, 420);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0008;
    key.shadow.normalBias = 1.4;
    key.shadow.radius = 4;
    scene.add(key, key.target);
    const fill = new T.DirectionalLight(0xdfe8ff, 0.45);
    fill.position.set(380, 200, -260);
    scene.add(fill);
    const rim = new T.DirectionalLight(0xffffff, 0.55);
    rim.position.set(-80, 420, -560);
    scene.add(rim);

    const root = new T.Group();
    scene.add(root);

    // ----- Kontroller: ataletli döndürme, yakınlaştırma -----
    const controls = new T.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.75;
    controls.zoomSpeed = 0.8;
    controls.enablePan = false;
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = 1.9;
    controls.autoRotateSpeed = 1.4;

    // ----- Son işlem: ortam kapanması (GTAO) -----
    let composer = null, gtao = null;
    let quality = 'high';
    try {
      const rt = new T.WebGLRenderTarget(4, 4, { type: T.HalfFloatType, samples: 4 });
      composer = new T.EffectComposer(renderer, rt);
      composer.addPass(new T.RenderPass(scene, camera));
      gtao = new T.GTAOPass(scene, camera, 4, 4);
      gtao.output = T.GTAOPass.OUTPUT.Default;
      gtao.blendIntensity = 0.85;
      gtao.updateGtaoMaterial({ radius: 10, distanceExponent: 1.2, thickness: 4, scale: 1, samples: 16, distanceFallOff: 1 });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
      // ince, çift yüzlü taç yaprakları için derinlik/normal geçişi iki yüzü de çizmeli (yoksa siyah benekler)
      if (gtao.normalMaterial) gtao.normalMaterial.side = T.DoubleSide;
      composer.addPass(gtao);
      composer.addPass(new T.OutputPass());
    } catch (e) {
      composer = null;
      quality = 'fast';
    }

    // ----- Durum -----
    let active = false;
    let dirty = true;
    let built = null;
    let fitDist = 1000;
    let userZoomed = false;
    let ext = null;
    const pops = [];
    let warmUntil = 0;
    const matCache = new Map();
    const texCache = new Map();
    const invalidate = () => { dirty = true; };
    controls.addEventListener('change', invalidate);

    function mat(keyStr, make) {
      if (!matCache.has(keyStr)) matCache.set(keyStr, make());
      return matCache.get(keyStr);
    }
    function texFromURL(url, repeat, srgb) {
      const k = 'url|' + url.slice(0, 64) + url.length;
      if (texCache.has(k)) return texCache.get(k);
      const tex = new T.Texture();
      const img = new Image();
      img.onload = () => { tex.dispose(); tex.image = img; tex.needsUpdate = true; invalidate(); };
      img.src = url;
      tex.wrapS = tex.wrapT = T.RepeatWrapping;
      tex.repeat.set(repeat[0], repeat[1]);
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      if (srgb) tex.colorSpace = T.SRGBColorSpace;
      texCache.set(k, tex);
      return tex;
    }
    const stemMat = mat('stem', () => new T.MeshStandardMaterial({ color: 0x3f6a2c, roughness: 0.55 }));
    const markerTex = [new T.CanvasTexture(markerCanvas(false)), new T.CanvasTexture(markerCanvas(true))];
    markerTex.forEach((t) => (t.colorSpace = T.SRGBColorSpace));
    const markerMats = markerTex.map((t) => new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
    const selMat = new T.MeshBasicMaterial({ color: 0xb8385e, toneMapped: false });
    const targetMat = new T.MeshBasicMaterial({ color: 0x2f9e6e, toneMapped: false });

    function clearRoot() {
      root.traverse((o) => {
        if (o.userData.sharedGeo) return;
        if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
        if (o.material && o.material.userData && o.material.userData.own) o.material.dispose();
      });
      root.clear();
    }

    // ----- Sahne kurulumu -----
    function build(state, o) {
      clearRoot();
      const photo = o.photo;
      const L = Model.layout3D(state.size);
      const { Rs, pts } = L;
      const PHI = 1.12;
      const N = state.slots.filter(Boolean).length;
      const hw = 13 + Math.sqrt(Math.max(N, 1)) * 2.4;
      const edgeY = 150 + L.R * 0.5;
      const Cy = edgeY - Rs * Math.cos(PHI);
      const C = new T.Vector3(0, Cy, 0);
      const rTop = Rs * Math.sin(PHI) + 36;
      // en alt sıradaki çiçeklerin gerçek yüksekliği: kağıt kenarı buna göre ayarlanır
      const phiMax = pts.reduce((m, p) => Math.max(m, p.phi), 0.3);
      const ringY = Cy + Rs * Math.cos(phiMax);
      const rimH = (base, back, front) => (a) => ringY + base + back * Math.max(0, -Math.sin(a)) - front * Math.max(0, Math.sin(a));
      const OUTER_RIM = [-12, 52, 12], INNER_RIM = [4, 64, 10];
      const slotObjs = new Map();
      const markers = [];
      const pickables = [];
      const seed = state.seed || 0;
      const upY = new T.Vector3(0, 1, 0), upZ = new T.Vector3(0, 0, 1);

      // --- Kağıt ---
      const paperMaterial = (hex) => {
        const m = new T.MeshPhysicalMaterial({ color: new T.Color(hex), roughness: 0.88, metalness: 0, sheen: 0.25, sheenRoughness: 0.8, sheenColor: new T.Color(0xffffff), side: T.DoubleSide });
        if (o.paperNormal) {
          m.normalMap = texFromURL(o.paperNormal, [2, 1.4], false);
          m.normalScale = new T.Vector2(1.1, 1.1);
        }
        m.userData.own = true;
        return m;
      };
      const outerMat = paperMaterial(state.wrap.outer);
      const innerMat = paperMaterial(state.wrap.inner);
      // arkada kağıt yüksek olduğundan orada daha geniş açılır (dış sıradaki çiçeklere çarpmasın)
      const backW = (k) => (a) => k * (1 + 0.16 * Math.max(0, -Math.sin(a)));
      const outer = new T.Mesh(paperGeometry({ r0: hw + 1.5, r1: backW(rTop), height: rimH(...OUTER_RIM), seed: 3 + seed }), outerMat);
      const inner = new T.Mesh(paperGeometry({ r0: hw, r1: backW(rTop * 0.94), height: rimH(...INNER_RIM), seed: 7 + seed }), innerMat);
      const tail = new T.Mesh(paperGeometry({ r0: hw + 1.5, r1: hw + 17, height: () => 78, tSeg: 10, aSeg: 72, seed: 11 + seed, down: true }), outerMat);
      [outer, inner, tail].forEach((m) => { m.castShadow = true; m.receiveShadow = true; root.add(m); });

      // --- İç dolgu (koyu yeşil yaprak kütlesi, sapları gizler) ---
      if (N > 0) {
        // Profil: üstte küre başlığı (çiçeklerin altı), aşağıda kağıdın içinde kalan daralan gövde
        const rr = Rs * 0.86;
        // kağıt arkada daha yüksek olduğundan aynı yükseklikte orada daha dardır: en dar hâle göre hesapla
        const Hp = ringY + INNER_RIM[0] + INNER_RIM[1];
        const paperR = (y) => hw + (rTop * 0.94 * 0.93 - hw) * Math.pow(U.clamp(y / Hp, 0, 1), 1.15);
        const top = [];
        const phEnd = Math.min(Math.PI / 2, PHI * 1.08);
        for (let q = 0; q <= 14; q++) {
          const ph = (q / 14) * phEnd;
          const y = Cy + rr * Math.cos(ph);
          top.push([Math.min(rr * Math.sin(ph), paperR(y) * 0.86), y]);
        }
        let lastR = top[top.length - 1][0];
        const lastY = top[top.length - 1][1];
        const lower = [];
        for (let q = 1; q <= 10; q++) {
          const y = lastY - (lastY - 6) * (q / 10);
          lastR = Math.min(lastR, paperR(y) * 0.86);
          lower.push([Math.max(hw * 0.6, lastR), y]);
        }
        const prof = top.concat(lower).reverse().map(([r, y]) => new T.Vector2(Math.max(0.01, r), y - Cy));
        // yalnızca yapraklar arasından görünen derin gölge: neredeyse siyah yeşil, ortam ışığı zayıf
        const filler = new T.Mesh(new T.LatheGeometry(prof, 56), mat('fillmass', () => new T.MeshStandardMaterial({ color: 0x0b1409, roughness: 1, envMapIntensity: 0.3, side: T.DoubleSide })));
        filler.position.copy(C);
        filler.receiveShadow = true;
        root.add(filler);
      }

      // --- Saplar ---
      const srnd = U.rng('stem3d');
      const bottomY = -132;
      const addStem = (p) => {
        const ox = (srnd() - 0.5) * hw * 0.9, oz = (srnd() - 0.5) * hw * 0.9;
        const tie = new T.Vector3(ox, 0, oz);
        const c1 = new T.QuadraticBezierCurve3(p.clone(), new T.Vector3(p.x * 0.3, p.y * 0.42, p.z * 0.3), tie);
        const bot = new T.Vector3(-p.x * 0.14 + ox, bottomY - srnd() * 12, -p.z * 0.14 + oz);
        const m1 = new T.Mesh(new T.TubeGeometry(c1, 14, 1.8, 6), stemMat);
        const m2 = new T.Mesh(new T.TubeGeometry(new T.LineCurve3(tie, bot), 2, 1.9, 6), stemMat);
        m1.castShadow = true;
        m2.castShadow = true;
        root.add(m1, m2);
        const capM = new T.Mesh(new T.CircleGeometry(1.9, 10), mat('cut', () => new T.MeshStandardMaterial({ color: 0xb7d39a, roughness: 0.8 })));
        capM.position.copy(bot);
        capM.lookAt(bot.clone().add(bot.clone().sub(tie)));
        root.add(capM);
      };

      // --- Çiçekler ---
      pts.forEach((pp, i) => {
        const nrm = new T.Vector3(pp.nx, pp.ny, pp.nz).normalize();
        const base = C.clone().addScaledVector(nrm, Rs);
        const sl = state.slots[i];
        if (!sl) {
          if (o.editing) {
            const mk = new T.Mesh(new T.CircleGeometry(17, 28), markerMats[o.dropTarget === i ? 1 : 0]);
            mk.position.copy(base).addScaledVector(nrm, 6);
            mk.quaternion.setFromUnitVectors(upZ, nrm);
            mk.userData.slot = i;
            mk.userData.marker = true;
            mk.renderOrder = 10;
            root.add(mk);
            markers.push(mk);
            pickables.push(mk);
          }
          slotObjs.set(i, { pos: base, normal: nrm, s: 30, empty: true });
          return;
        }
        const r0 = U.rng('h' + sl.t + ':' + seed);
        let size, hex;
        if (photo) {
          const ph = photo.head(sl, i);
          size = photo.info3d(sl.type).size;
          hex = vivid(ph.swatch || '#cc6677');
        } else {
          size = Flowers.FLOWERS[sl.type].size;
          hex = sl.color;
        }
        const s = size * 1.04 * (0.93 + r0() * 0.14);
        const type = window.Flowers3D && Flowers3D.recipes.includes(sl.type) ? sl.type : 'rose';
        const head = Flowers3D.create(type, hex, sl.t % 3);
        head.scale.setScalar(s);
        const group = new T.Group();
        const side = head.userData.side;
        group.position.copy(base).addScaledVector(nrm, side ? -s * 0.1 : -s * 0.04 + r0() * 4);
        const dir = side ? nrm.clone().lerp(upY, 0.35).normalize() : nrm;
        group.quaternion.setFromUnitVectors(upY, dir);
        group.rotateY(r0() * Math.PI * 2);
        group.add(head);
        head.traverse((m) => {
          if (m.isMesh) {
            m.userData.slot = i;
            m.userData.sharedGeo = true;
            pickables.push(m);
          }
        });
        group.userData.slot = i;
        root.add(group);
        addStem(group.position);
        if (o.newSlots && o.newSlots.has(i)) {
          group.scale.setScalar(0.01);
          pops.push({ obj: group, t0: performance.now() });
        }
        slotObjs.set(i, { pos: group.position.clone(), normal: dir, s, top: s * (side ? 1.2 : 0.55), group });
      });

      // --- Yeşillik: gerçek buketlerdeki gibi ölçülü ---
      // (1) kenarda koyu salal yaprağı yakası, (2) arkada/yanlarda birkaç sarkık okaliptüs dalı,
      // (3) çiçek aralarından yalnızca uçları görünen ruskus yaprakları
      const mul = { az: 0.55, dogal: 1, bol: 1.5 }[state.filler.amount || 'dogal'];
      const orient = (obj, pos, dir, faceHint, roll = 0) => {
        const y = dir.clone().normalize();
        const z = faceHint.clone().sub(y.clone().multiplyScalar(faceHint.dot(y))).normalize();
        if (roll) z.applyAxisAngle(y, roll);
        const x = new T.Vector3().crossVectors(y, z);
        obj.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z));
        obj.position.copy(pos);
        obj.userData.sharedGeo = true;
        root.add(obj);
      };
      const sph = (phi, a) => new T.Vector3(Math.sin(phi) * Math.cos(a), Math.cos(phi), Math.sin(phi) * Math.sin(a));
      const sizeK = 0.85 + L.R / 700;
      const innerH = rimH(...INNER_RIM);
      const insidePaper = (p, a) => {
        const H = innerH(a);
        const t = U.clamp(p.y / H, 0, 1);
        const rp = hw + (backW(rTop * 0.94)(a) - hw) * Math.pow(t, 1.15);
        return Math.hypot(p.x, p.z) < rp * 0.9;
      };

      // --- Çiçek aralarındaki yapraklar: farklı derinlik, açı ve tonlarda yüzlerce küçük yaprak ---
      if (N > 0) {
        const frnd = U.rng('fol' + seed);
        const capPhi = Math.min(Math.PI / 2, phiMax * 1.22);
        const area = TAU * Rs * Rs * (1 - Math.cos(capPhi));
        const dens = state.filler.green ? { az: 0.75, dogal: 1, bol: 1.25 }[state.filler.amount || 'dogal'] : 0.6;
        const count = Math.min(1400, Math.round((area / 120) * dens));
        const tones = ['#20351a', '#28421f', '#2f4d24', '#38592b', '#436633', '#2a4a30', '#3a5a47', '#4c6e3a', '#1c2e17'];
        const perVar = [[], []];
        const tmpC = new T.Color();
        for (let i = 0; i < count; i++) {
          const cp = 1 - frnd() * (1 - Math.cos(capPhi));
          const phi = Math.acos(cp), a = frnd() * TAU;
          const n0 = sph(phi, a);
          const pos = C.clone().addScaledVector(n0, Rs * (0.85 + frnd() * 0.11));
          const rv = new T.Vector3(frnd() - 0.5, frnd() - 0.5, frnd() - 0.5);
          const tg = new T.Vector3().crossVectors(n0, rv).normalize();
          const e = 0.12 + frnd() * 0.65; // dışa doğru kalkış açısı
          let d = tg.multiplyScalar(Math.cos(e)).addScaledVector(n0, Math.sin(e)).normalize();
          let len = (14 + frnd() * 12) * sizeK;
          // kağıda çarpıyorsa: önce kısalt, sonra yukarı (kağıda paralel) yönelt
          for (let it = 0; it < 6 && !insidePaper(pos.clone().addScaledVector(d, len), a); it++) {
            if (it % 2 === 0) len *= 0.8;
            else d.lerp(upY, 0.45).normalize();
          }
          if (!insidePaper(pos.clone().addScaledVector(d, len), a) || !insidePaper(pos, a)) continue;
          const z = n0.clone().sub(d.clone().multiplyScalar(n0.dot(d))).normalize().applyAxisAngle(d, (frnd() - 0.5) * 1.0);
          const x = new T.Vector3().crossVectors(d, z);
          const m = new T.Matrix4().makeBasis(x, d, z).scale(new T.Vector3(len, len, len)).setPosition(pos);
          tmpC.set(tones[Math.floor(frnd() * tones.length)]).multiplyScalar(1.05 + (frnd() - 0.5) * 0.2);
          perVar[frnd() < 0.72 ? 0 : 1].push([m, tmpC.clone()]);
        }
        perVar.forEach((list, v) => {
          if (!list.length) return;
          const im = new T.InstancedMesh(Flowers3D.fillerLeafGeo(v), Flowers3D.fillerLeafMat, list.length);
          list.forEach(([m, c], j) => { im.setMatrixAt(j, m); im.setColorAt(j, c); });
          im.castShadow = true;
          im.receiveShadow = true;
          im.userData.sharedGeo = true;
          root.add(im);
        });
      }

      if (state.filler.green) {
        // (1) Yaka — yaprak ucu iç kağıdın içinde kalana dek yukarı eğilir (kağıda yaslanır)
        const crnd = U.rng('collar' + seed);
        const rimR = Rs * Math.sin(PHI);
        const cc = Math.max(5, Math.round(((TAU * rimR) / 40) * mul));
        for (let k = 0; k < cc; k++) {
          if (crnd() < 0.1) continue; // doğal boşluklar
          const a = (k / cc) * TAU + (crnd() - 0.5) * 0.35;
          const out = new T.Vector3(Math.cos(a), 0, Math.sin(a));
          const base = C.clone().addScaledVector(sph(PHI * (0.94 + crnd() * 0.08), a), Rs * 0.8);
          let len = (46 + crnd() * 16) * sizeK;
          let beta = -0.1 + crnd() * 0.3;
          let dir, ok = false;
          for (let it = 0; it < 24 && !ok; it++) {
            dir = out.clone().multiplyScalar(Math.cos(beta)).addScaledVector(upY, Math.sin(beta));
            ok = insidePaper(base.clone().addScaledVector(dir, len * 0.95), a) && insidePaper(base.clone().addScaledVector(dir, len * 0.5), a);
            if (!ok) { if (beta < 1.25) beta += 0.08; else len *= 0.9; }
          }
          if (!ok) continue;
          const face = upY.clone().multiplyScalar(Math.cos(beta)).addScaledVector(out, -Math.sin(beta));
          const lf = Flowers3D.leafMesh('salal', k);
          lf.scale.setScalar(len);
          orient(lf, base, dir, face, (crnd() - 0.5) * 0.6);
        }
        // (2) Okaliptüs dalları: çoğunlukla arkada ve yanlarda
        const ernd = U.rng('euc3' + seed);
        const ec = Math.max(1, Math.round((3 + state.size / 8) * mul));
        for (let k = 0; k < ec; k++) {
          const spread = mul > 1.2 ? 4.2 : 3.3;
          const a = -Math.PI / 2 + ((k + 0.5) / ec - 0.5) * spread + (ernd() - 0.5) * 0.35;
          // arkadakiler daha dik ve uzun: kağıdın üstünden görünsünler
          const backness = Math.max(0, -Math.sin(a));
          const phi = PHI * (0.5 + ernd() * 0.28);
          const base = C.clone().addScaledVector(sph(phi, a), Rs * 0.8);
          const dir = sph(Math.min(PHI, phi + 0.3), a);
          dir.y += 0.25 + 0.35 * backness;
          const down = new T.Vector3(0, -1, 0);
          const sp = Flowers3D.eucSprig(k + seed);
          sp.scale.setScalar((Rs * 0.36 + 44 + 26 * backness + ernd() * 24) * sizeK);
          orient(sp, base, dir, down);
        }
        // (3) Çiçek aralarında ruskus uçları
        const rrnd = U.rng('rus3' + seed);
        const rc = Math.round(state.size * 0.22 * mul);
        for (let k = 0; k < rc; k++) {
          const a = rrnd() * TAU;
          const phi = Math.sqrt(rrnd()) * PHI * 0.92;
          const n0 = sph(phi, a);
          const base = C.clone().addScaledVector(n0, Rs * 0.8);
          const sp = Flowers3D.ruscusSprig(k);
          sp.scale.setScalar((34 + rrnd() * 14) * sizeK);
          orient(sp, base, n0, new T.Vector3(0, -1, 0), (rrnd() - 0.5) * 2);
        }
      }

      // --- Cipsofil: yoğun, bulut gibi salkımlar ve ince saplar (gerçek dal yapısı) ---
      if (state.filler.gyps) {
        const grnd = U.rng('gy3' + seed);
        const gmul = 1 + ({ az: 0.55, dogal: 1, bol: 1.5 }[state.filler.amount || 'dogal'] - 1) * 0.6;
        const clusters = Math.round((8 + state.size * 0.75) * gmul);
        const florets = [];
        const stems = [];
        const stem = (p0, p1, r) => stems.push([p0, p1, r]);
        for (let k = 0; k < clusters; k++) {
          const a = grnd() * TAU;
          const phi = Math.sqrt(grnd()) * phiMax * 1.04;
          const n0 = sph(phi, a);
          const ctr = C.clone().addScaledVector(n0, Rs + 2 + grnd() * 8);
          const base = C.clone().addScaledVector(n0, Rs * 0.88);
          const t1 = new T.Vector3().crossVectors(n0, Math.abs(n0.y) < 0.9 ? upY : new T.Vector3(1, 0, 0)).normalize();
          const t2 = new T.Vector3().crossVectors(n0, t1);
          const cr = 9 + grnd() * 8; // salkım yarıçapı
          const joint = base.clone().lerp(ctr, 0.55);
          stem(base, joint, 0.5);
          // 4–6 yan dal, her biri kendi küçük kümesini taşır
          const branches = 4 + Math.floor(grnd() * 3);
          for (let b = 0; b < branches; b++) {
            const ang = (b / branches) * TAU + grnd() * 0.6;
            const rr = cr * (0.35 + grnd() * 0.55);
            const sub = ctr.clone().addScaledVector(t1, Math.cos(ang) * rr).addScaledVector(t2, Math.sin(ang) * rr)
              .addScaledVector(n0, 3.5 * (1 - (rr / cr) ** 2) - 1);
            stem(joint, sub, 0.32);
            const nf = 9 + Math.floor(grnd() * 9);
            for (let j = 0; j < nf; j++) {
              const u = Math.sqrt(grnd()) * 4.2, v = grnd() * TAU;
              const fp = sub.clone().addScaledVector(t1, Math.cos(v) * u).addScaledVector(t2, Math.sin(v) * u)
                .addScaledVector(n0, (grnd() - 0.3) * 2.2);
              if (j % 4 === 0) stem(sub, fp, 0.18);
              florets.push([fp, 0.9 + grnd() * 0.55]);
            }
          }
        }
        const gm = Flowers3D.gypsMat.clone();
        gm.emissive = new T.Color(state.filler.gypsColor);
        gm.userData.own = true;
        const im = new T.InstancedMesh(Flowers3D.gypsGeo, gm, florets.length);
        im.userData.sharedGeo = true;
        const mm = new T.Matrix4(), qq = new T.Quaternion(), ee = new T.Euler(), cc = new T.Color();
        const baseCol = new T.Color(state.filler.gypsColor);
        florets.forEach(([p, sc], j) => {
          ee.set(grnd() * 6, grnd() * 6, grnd() * 6);
          qq.setFromEuler(ee);
          mm.compose(p, qq, new T.Vector3(sc, sc, sc));
          im.setMatrixAt(j, mm);
          im.setColorAt(j, cc.copy(baseCol).multiplyScalar(0.86 + grnd() * 0.14));
        });
        im.castShadow = true;
        im.receiveShadow = true;
        root.add(im);
        const sm = new T.InstancedMesh(Flowers3D.gypsStemGeo, Flowers3D.gypsStemMat, stems.length);
        sm.userData.sharedGeo = true;
        stems.forEach(([p0, p1, r], j) => {
          const dvec = p1.clone().sub(p0);
          const len = dvec.length() || 0.01;
          qq.setFromUnitVectors(upY, dvec.normalize());
          mm.compose(p0, qq, new T.Vector3(r, len, r));
          sm.setMatrixAt(j, mm);
        });
        root.add(sm);
      }

      // --- Kurdele / ip ---
      buildTie(state, hw);

      // --- Seçim / hedef halkaları ---
      const ring = (slot, material) => {
        const so = slotObjs.get(slot);
        if (!so || so.empty) return;
        const tor = new T.Mesh(new T.TorusGeometry(so.s * 1.02, 1.8, 8, 56), material);
        tor.position.copy(so.pos).addScaledVector(so.normal, so.top * 0.6);
        tor.quaternion.setFromUnitVectors(upZ, so.normal);
        tor.renderOrder = 11;
        root.add(tor);
      };
      if (o.selected != null) ring(o.selected, selMat);
      if (o.dropTarget != null && o.dropTarget !== o.dragFrom) ring(o.dropTarget, targetMat);

      // --- Gölge kutusu ve kamera sığdırma ---
      const top = Cy + Rs + 50;
      const e = Math.max(rTop + 70, (top - bottomY) / 2 + 20);
      const sc = key.shadow.camera;
      sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e;
      sc.near = 10; sc.far = 3000;
      sc.updateProjectionMatrix();
      key.target.position.set(0, (top + bottomY) / 2, 0);
      ext = { halfH: (top - bottomY) / 2 + 30, halfW: rTop + 70, midY: (top + bottomY) / 2 + 10 };
      controls.target.set(0, ext.midY, 0);
      refit(!built || o.refit);
      built = { slotObjs, markers, pickables };
      renderer.shadowMap.needsUpdate = true;
      warmUntil = performance.now() + 600;
      invalidate();
    }

    function buildTie(state, hw) {
      const hex = state.tie.color;
      const g = new T.Group();
      root.add(g);
      if (state.tie.style === 'twine') {
        const m = new T.MeshStandardMaterial({ color: new T.Color(hex), roughness: 1 });
        m.userData.own = true;
        for (let k = 0; k < 4; k++) {
          const tor = new T.Mesh(new T.TorusGeometry(hw + 1.8, 1.5, 8, 60), m);
          tor.rotation.x = Math.PI / 2;
          tor.position.y = -7 + k * 4.6;
          g.add(tor);
        }
        const front = new T.Group();
        front.position.set(0, 0, hw + 2.5);
        g.add(front);
        const tube = (pts, r) => {
          const c = new T.CatmullRomCurve3(pts.map((p) => new T.Vector3(p[0], p[1], p[2])));
          const mesh = new T.Mesh(new T.TubeGeometry(c, 40, r, 6), m);
          mesh.castShadow = true;
          front.add(mesh);
        };
        tube([[0, 0, 0], [-10, 7, 4], [-26, 10, 3], [-30, 2, 0], [-20, -3, 1], [0, 0, 0]], 1.5);
        tube([[0, 0, 0], [10, 7, 4], [26, 10, 3], [30, 2, 0], [20, -3, 1], [0, 0, 0]], 1.5);
        tube([[-1, -1, 1], [-5, -25, 3], [-9, -50, 2], [-8, -72, 4]], 1.4);
        tube([[1, -1, 1], [6, -28, 3], [12, -55, 2], [16, -80, 4]], 1.4);
        const knot = new T.Mesh(new T.SphereGeometry(4.2, 12, 10), m);
        front.add(knot);
        return;
      }
      const base = new T.Color(hex);
      const m = new T.MeshPhysicalMaterial({
        color: base, roughness: 0.34, metalness: 0, sheen: 1, sheenRoughness: 0.35,
        sheenColor: base.clone().lerp(new T.Color(0xffffff), 0.5), clearcoat: 0.35, clearcoatRoughness: 0.3, side: T.DoubleSide,
      });
      m.userData.own = true;
      const band = new T.Mesh(new T.CylinderGeometry(hw + 4.5, hw + 4.5, 14, 56, 1, true), m);
      band.castShadow = true;
      g.add(band);
      const front = new T.Group();
      front.position.set(0, 0, hw + 5);
      front.scale.setScalar(U.clamp(hw / 20, 1, 1.5));
      g.add(front);
      const V = (a) => new T.Vector3(a[0], a[1], a[2]);
      const loop = (sx) => {
        // yatay düzlemde damla biçimli kapalı yol, şerit genişliği dikey (y)
        const pts = [[0, 0, 0], [-9, 0, 8], [-24, 0, 13], [-36, 0, 10], [-41, 0, 0], [-36, 0, -9], [-22, 0, -11], [-8, 0, -6], [0, 0, 0]]
          .map((p) => new T.Vector3(p[0] * sx, p[1], p[2]));
        const c = new T.CatmullRomCurve3(pts, false, 'centripetal');
        const geo = stripGeometry(c, 80, (t) => 9 + 12 * Math.sin(Math.PI * t), () => new T.Vector3(0, 1, 0));
        const mesh = new T.Mesh(geo, m);
        const holder = new T.Group();
        // halkayı izleyiciye doğru devir ve hafifçe yukarı kaldır
        holder.rotation.x = 1.2;
        holder.rotation.z = sx * 0.22;
        mesh.castShadow = true;
        holder.add(mesh);
        front.add(holder);
      };
      loop(-1);
      loop(1);
      const tail = (pts, dir, cut) => {
        const c = new T.CatmullRomCurve3(pts.map(V));
        const mesh = new T.Mesh(stripGeometry(c, 40, () => 11, () => dir, cut), m);
        mesh.castShadow = true;
        front.add(mesh);
      };
      tail([[-2, -3, 2], [-8, -30, 5], [-15, -58, 3], [-22, -90, 6]], new T.Vector3(1, 0, 0.25), -7);
      tail([[2, -3, 2], [9, -32, 5], [16, -64, 3], [22, -100, 5]], new T.Vector3(1, 0, -0.25), -7);
      const knot = new T.Mesh(new T.SphereGeometry(1, 20, 14), m);
      knot.scale.set(7.5, 7, 4.2);
      knot.castShadow = true;
      front.add(knot);
    }


    // ----- Kamera -----
    function fitDistance() {
      const fovR = (camera.fov * Math.PI) / 180;
      const aspect = camera.aspect || 1;
      return Math.max(ext.halfH / Math.tan(fovR / 2), ext.halfW / (Math.tan(fovR / 2) * aspect)) * 1.08;
    }
    function placeCamera(yaw, pitch, dist) {
      const cp = Math.cos(pitch);
      camera.position.set(dist * cp * Math.sin(yaw), controls.target.y + dist * Math.sin(pitch), dist * cp * Math.cos(yaw));
      camera.lookAt(controls.target);
    }
    function refit(force) {
      if (!ext) return;
      fitDist = fitDistance();
      controls.minDistance = fitDist * 0.3;
      controls.maxDistance = fitDist * 2.2;
      if (force) {
        userZoomed = false;
        placeCamera(0, 0.5, fitDist);
      } else if (!userZoomed) {
        // mevcut açıyı koru, uzaklığı güncelle
        const dir = camera.position.clone().sub(controls.target).normalize();
        camera.position.copy(controls.target).addScaledVector(dir, fitDist);
      }
      controls.update();
    }
    controls.addEventListener('start', () => { userZoomed = true; });

    // Yumuşak kamera geçişi (Ortala)
    let tween = null;
    function animateTo(yaw, pitch, dist, ms = 700) {
      const from = camera.position.clone();
      const cp = Math.cos(pitch);
      const to = new T.Vector3(dist * cp * Math.sin(yaw), controls.target.y + dist * Math.sin(pitch), dist * cp * Math.cos(yaw));
      tween = { from, to, t0: performance.now(), ms };
    }

    function resize() {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      if (composer) composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      refit(false);
      invalidate();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // ----- Döngü -----
    let last = performance.now();
    const frameTimes = [];
    function draw() {
      if (composer && quality === 'high') composer.render();
      else renderer.render(scene, camera);
    }
    function frame(now) {
      if (!active) return;
      requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000);
      // uyarlanır kalite: sürekli çizimde kare süresi uzunsa GTAO'yu kapat
      if (dirty && now - last < 500) {
        frameTimes.push(now - last);
        if (frameTimes.length > 24) frameTimes.shift();
        if (quality === 'high' && frameTimes.length === 24 && frameTimes.reduce((a, b) => a + b, 0) / 24 > 45) {
          quality = 'fast';
          handlers.onQuality && handlers.onQuality(quality);
        }
      }
      last = now;
      if (tween) {
        const k = Math.min(1, (now - tween.t0) / tween.ms);
        const e = 1 - Math.pow(1 - k, 3);
        camera.position.lerpVectors(tween.from, tween.to, e);
        camera.lookAt(controls.target);
        if (k >= 1) tween = null;
        dirty = true;
      }
      if (controls.update(dt)) dirty = true;
      if (controls.autoRotate || now < warmUntil) dirty = true;
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i];
        const k = Math.min(1, (now - p.t0) / 550);
        const e = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
        p.obj.scale.setScalar(Math.max(0.01, e));
        if (k >= 1) { p.obj.scale.setScalar(1); pops.splice(i, 1); }
        renderer.shadowMap.needsUpdate = true;
        dirty = true;
      }
      if (!dirty) return;
      dirty = false;
      draw();
    }

    // ----- Etkileşim: seçme, yerleştirme, sürükleme -----
    const ray = new T.Raycaster();
    const ndc = new T.Vector2();
    const el = renderer.domElement;
    let hoverSlot = null;
    function pick(ev) {
      if (!built) return null;
      const r = el.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(built.pickables, false);
      for (const h of hits) {
        let ob = h.object;
        while (ob && ob.userData.slot === undefined) ob = ob.parent;
        if (ob) return { slot: ob.userData.slot, marker: !!ob.userData.marker };
      }
      return null;
    }
    const press = { on: false, x: 0, y: 0, moved: 0, mode: null, hit: null, target: null };
    // OrbitControls'tan önce yakalamak için yakalama (capture) aşamasında dinle
    container.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0 && ev.pointerType === 'mouse') return;
      press.on = true;
      press.x = ev.clientX;
      press.y = ev.clientY;
      press.moved = 0;
      press.hit = pick(ev);
      press.target = null;
      tween = null;
      if (press.hit && !press.hit.marker && handlers.canEdit && handlers.canEdit()) {
        press.mode = 'maybeDrag';
        controls.enabled = false;
      } else press.mode = 'orbit';
    }, true);
    window.addEventListener('pointermove', (ev) => {
      if (!press.on) {
        if (ev.target !== el) return;
        const hit = pick(ev);
        const s = hit ? hit.slot : null;
        el.style.cursor = hit ? 'pointer' : 'grab';
        if (s !== hoverSlot && built) {
          hoverSlot = s;
          built.markers.forEach((m) => (m.material = markerMats[m.userData.slot === s ? 1 : 0]));
          invalidate();
        }
        return;
      }
      press.moved = Math.max(press.moved, Math.hypot(ev.clientX - press.x, ev.clientY - press.y));
      if (press.mode === 'maybeDrag' && press.moved > 6) {
        press.mode = 'drag';
        handlers.onDragStart && handlers.onDragStart(press.hit.slot);
      }
      if (press.mode === 'drag') {
        const hit = pick(ev);
        const t = hit ? hit.slot : null;
        el.style.cursor = 'grabbing';
        if (t !== press.target) {
          press.target = t;
          handlers.onDragOver && handlers.onDragOver(press.hit.slot, t);
        }
      }
    });
    const finish = (ev) => {
      if (!press.on) return;
      press.on = false;
      controls.enabled = true;
      el.style.cursor = 'grab';
      if (press.mode === 'drag') {
        handlers.onDrop && handlers.onDrop(press.hit.slot, press.target);
      } else if (press.moved < 6 && ev.type === 'pointerup') {
        const hit = press.hit;
        if (hit) handlers.onSlotClick && handlers.onSlotClick(hit.slot, !hit.marker);
        else handlers.onSlotClick && handlers.onSlotClick(null, false);
      } else if (press.mode === 'orbit' && press.moved >= 6) {
        handlers.onOrbit && handlers.onOrbit();
      }
      press.mode = null;
    };
    window.addEventListener('pointerup', finish, true);
    window.addEventListener('pointercancel', finish, true);
    el.addEventListener('dblclick', () => api.reset());
    el.style.cursor = 'grab';
    el.style.touchAction = 'none';

    const api = {
      update(state, o = {}) {
        build(state, o);
        if (o.camera) {
          const yaw = o.camera.yaw ?? 0, pitch = o.camera.pitch ?? 0.5;
          if (o.camera.targetY != null) controls.target.y = o.camera.targetY;
          placeCamera(yaw, pitch, o.camera.dist || fitDist);
          userZoomed = true;
          controls.update();
        }
      },
      setActive(on) {
        if (on === active) return;
        active = on;
        if (on) {
          resize();
          invalidate();
          last = performance.now();
          // açılışta ilk kareler dokular/gölgeler hazır olmadan çizilebilir: kısa süre sürekli çiz
          warmUntil = last + 1500;
          requestAnimationFrame(frame);
        }
      },
      setAutoRotate(on) { controls.autoRotate = on; invalidate(); },
      get autoRotate() { return controls.autoRotate; },
      setQuality(q) { quality = q === 'high' && composer ? 'high' : 'fast'; frameTimes.length = 0; invalidate(); },
      get quality() { return quality; },
      reset() {
        userZoomed = false;
        animateTo(0, 0.5, fitDist);
        invalidate();
      },
      view(name) {
        const v = { front: [0, 0.35], side: [Math.PI / 2, 0.3], top: [0, 1.35], back: [Math.PI, 0.35] }[name];
        if (!v) return;
        const cur = camera.position.clone().sub(controls.target);
        const yaw0 = Math.atan2(cur.x, cur.z);
        // en kısa yoldan dön
        let yaw = v[0];
        while (yaw - yaw0 > Math.PI) yaw -= Math.PI * 2;
        while (yaw - yaw0 < -Math.PI) yaw += Math.PI * 2;
        animateTo(yaw, v[1], cur.length());
        invalidate();
      },
      projectSlot(i) {
        if (!built || !built.slotObjs.has(i)) return null;
        const so = built.slotObjs.get(i);
        const v = so.pos.clone().addScaledVector(so.normal, so.top || 0).project(camera);
        const r = el.getBoundingClientRect();
        return { x: ((v.x + 1) / 2) * r.width, y: ((1 - v.y) / 2) * r.height };
      },
      snapshot(width = 1400) {
        const w = container.clientWidth, h = container.clientHeight;
        const pr = Math.max(1, width / w);
        renderer.setPixelRatio(pr);
        renderer.setSize(w, h, false);
        if (composer) { composer.setPixelRatio(pr); composer.setSize(w, h); }
        draw();
        const url = el.toDataURL('image/png');
        renderer.setPixelRatio(basePR);
        renderer.setSize(w, h, false);
        if (composer) { composer.setPixelRatio(basePR); composer.setSize(w, h); }
        invalidate();
        return url;
      },
      isBusy() { return press.on; },
    };
    return api;
  }

  window.Bouquet3D = {
    create,
    supported() {
      try {
        const c = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')) && window.Flowers3D);
      } catch (e) {
        return false;
      }
    },
  };
})();
