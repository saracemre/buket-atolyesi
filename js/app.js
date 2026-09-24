/* Arayüz ve durum yönetimi */
(function () {
  const { FLOWERS, miniSVG } = Flowers;
  const $ = (id) => document.getElementById(id);
  const STORE_KEY = 'buket-atolyesi-v2';
  const OLD_KEY = 'buket-atolyesi-v1';

  const PAPERS = [
    ['Kraft', '#c49a6c'], ['Krem', '#f1e6d2'], ['Beyaz', '#fbfaf7'], ['Pudra', '#ecc5c8'],
    ['Gül kurusu', '#c98f8f'], ['Lila', '#c9b6de'], ['Adaçayı', '#aebfa6'], ['Gök mavisi', '#b7cde0'],
    ['Gece mavisi', '#2d3a55'], ['Bordo', '#6d1f2c'], ['Siyah', '#2a2a2a'],
  ];
  const TIES = [
    ['Pudra', '#e7b9c0'], ['Beyaz', '#f7f5f0'], ['Krem', '#efe2c8'], ['Kırmızı', '#b3122c'],
    ['Bordo', '#6d1f2c'], ['Altın', '#caa24a'], ['Gümüş', '#b9bcc2'], ['Siyah', '#222222'],
    ['Lacivert', '#223055'], ['Adaçayı', '#8fa888'], ['Lila', '#b49ad0'], ['Jüt', '#b89466'],
  ];
  const GYPS = [['Beyaz', '#ffffff'], ['Pembe', '#f4b8cc'], ['Lila', '#cdb6ea'], ['Mavi', '#aecbef']];

  // ---------- Katalog (çizim / gerçek) ----------
  const CATALOG = {
    draw: {
      order: Flowers.ORDER,
      has: (t) => !!FLOWERS[t],
      name: (t) => FLOWERS[t].name,
      colors: (t) => FLOWERS[t].colors.map(([name, hex]) => ({ name, value: hex, swatch: hex })),
      custom: true,
      icon: (t, c, seed) => miniSVG(t, c, seed || 'card'),
      swatch: (t, c) => c,
    },
    real: window.Real && Real.available
      ? {
          order: Real.ORDER,
          has: (t) => !!Real.TYPES[t],
          name: (t) => Real.TYPES[t].name,
          colors: (t) => Real.TYPES[t].colors.map(([name, key, sw]) => ({ name, value: key, swatch: sw })),
          custom: false,
          icon: (t, c, seed) => `<img src="${Real.photoFor(t, c, seed || 0).href}" alt="" draggable="false" />`,
          swatch: (t, c) => (Real.TYPES[t].colors.find((x) => x[1] === c) || [])[2] || '#cccccc',
        }
      : null,
  };
  const cat = () => CATALOG[ui.mode];

  // ---------- Durum ----------
  function baseState(size = 12) {
    return {
      size,
      slots: new Array(size).fill(null),
      seq: 1,
      seed: 0,
      wrap: { outer: '#c49a6c', outerName: 'Kraft', inner: '#f1e6d2', innerName: 'Krem' },
      tie: { style: 'ribbon', color: '#e7b9c0', name: 'Pudra' },
      filler: { gyps: true, gypsColor: '#ffffff', gypsName: 'Beyaz', green: true, amount: 'dogal' },
    };
  }
  function defaultState(mode) {
    const st = baseState(12);
    const add = (type, color, colorName, n) => Model.placeAuto(st, { type, color, colorName }, n);
    if (mode === 'draw') {
      add('rose', '#b3122c', 'Kırmızı', 4);
      add('peony', '#ef93ae', 'Pembe', 3);
      add('lisianthus', '#f6f3ea', 'Beyaz', 3);
    } else {
      add('rose', 'kirmizi', 'Kırmızı', 4);
      add('peony', 'pembe', 'Pembe', 3);
      add('hydrangea', 'mavi', 'Mavi', 2);
      add('daisy', 'beyaz', 'Beyaz', 1);
    }
    return st;
  }
  function validState(st, mode) {
    if (!st || !Array.isArray(st.slots) || !st.wrap || !st.tie || !st.filler) return null;
    const c = CATALOG[mode];
    if (!c) return null;
    st.size = U.clamp(st.size | 0, Model.MIN_SIZE, Model.MAX_SIZE);
    st.slots = st.slots.slice(0, st.size).map((s) => (s && c.has(s.type) ? s : null));
    while (st.slots.length < st.size) st.slots.push(null);
    st.seq = st.seq || 1;
    if (!['az', 'dogal', 'bol'].includes(st.filler.amount)) st.filler.amount = 'dogal';
    return st;
  }
  function load() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { /* yok say */ }
    const out = { mode: 'draw', view: '2d', draw: null, real: null };
    if (data) {
      out.mode = data.mode === 'real' && CATALOG.real ? 'real' : 'draw';
      out.view = data.view === '3d' ? '3d' : '2d';
      out.draw = validState(data.draw, 'draw');
      out.real = CATALOG.real ? validState(data.real, 'real') : null;
    } else {
      try {
        const old = JSON.parse(localStorage.getItem(OLD_KEY));
        if (old && Array.isArray(old.items) && old.items.length) out.draw = validState(Model.migrateV1(old), 'draw');
      } catch (e) { /* yok say */ }
    }
    out.draw = out.draw || defaultState('draw');
    if (CATALOG.real) out.real = out.real || defaultState('real');
    return out;
  }
  const store = load();
  const S = () => store[ui.mode];
  function save() {
    // paylaşılan bir buket görüntüleniyorsa, o mod için kişinin kendi buketi saklanır
    const pick = (m) => (ui.shared && ui.shared.mode === m ? ui.shared.own : store[m]);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ mode: ui.mode, view: ui.view, draw: pick('draw'), real: pick('real') }));
    } catch (e) { /* yok say */ }
  }

  const ui = {
    mode: store.mode,
    view: store.view,
    tab: 'flowers',
    qty: 3,
    brush: {
      draw: { type: 'rose', color: '#b3122c', name: 'Kırmızı' },
      real: CATALOG.real ? { type: 'rose', color: 'kirmizi', name: 'Kırmızı' } : null,
    },
    selected: null,
    showSlots: true,
    drag: null,
    shared: null, // {mode, own, sig, code}: bağlantıyla açılmış buket
  };
  const brush = () => ui.brush[ui.mode];
  const brushFlower = () => ({ type: brush().type, color: brush().color, colorName: brush().name });
  const flowerLabel = (f) => `${f.colorName === 'Özel renk' ? 'Özel renkli' : f.colorName} ${cat().name(f.type)}`;

  // ---------- Bildirim ----------
  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // ---------- Renk örnekleri ----------
  function renderSwatches(el, list, activeValue, onPick, opts = {}) {
    el.innerHTML = '';
    let matched = false;
    list.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.style.background = c.swatch;
      b.title = c.name;
      b.setAttribute('aria-label', c.name);
      const on = String(c.value).toLowerCase() === String(activeValue || '').toLowerCase();
      if (on) { b.classList.add('is-active'); matched = true; }
      b.setAttribute('aria-pressed', on);
      b.addEventListener('click', () => onPick(c.value, c.name));
      el.appendChild(b);
    });
    if (opts.custom !== false) {
      const lab = document.createElement('label');
      lab.className = 'swatch custom' + (!matched ? ' is-active' : '');
      lab.title = 'Özel renk seç';
      const inp = document.createElement('input');
      inp.type = 'color';
      inp.value = /^#[0-9a-f]{6}$/i.test(activeValue) ? activeValue : '#ffffff';
      inp.setAttribute('aria-label', 'Özel renk seç');
      inp.addEventListener('input', () => onPick(inp.value, 'Özel renk', true));
      inp.addEventListener('change', () => onPick(inp.value, 'Özel renk'));
      const dot = document.createElement('span');
      dot.className = 'dot';
      if (!matched && activeValue) dot.style.background = activeValue;
      lab.append(dot, inp);
      el.appendChild(lab);
    }
  }
  const plain = (list) => list.map(([name, hex]) => ({ name, value: hex, swatch: hex }));

  // ---------- Mod geçişi ----------
  function renderModeSwitch() {
    document.querySelectorAll('.mode-btn').forEach((b) => {
      const on = b.dataset.mode === ui.mode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on);
      if (b.dataset.mode === 'real' && !CATALOG.real) b.hidden = true;
    });
  }

  // ---------- Buket boyutu ----------
  function renderSizes() {
    const st = S();
    const el = $('sizeChips');
    el.innerHTML = '';
    Model.SIZES.forEach((sz) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'size-chip' + (st.size === sz.n ? ' is-active' : '');
      b.innerHTML = `<b>${sz.n}</b><small>${sz.label}</small>`;
      b.title = `${sz.label} buket: ${sz.n} çiçeklik yer`;
      b.addEventListener('click', () => setSize(sz.n));
      el.appendChild(b);
    });
    $('sizeInput').value = st.size;
    const preset = Model.SIZES.find((s) => s.n === st.size);
    $('sizeName').textContent = `· ${preset ? preset.label : 'Özel'} (${st.size} yer)`;
  }
  function setSize(n) {
    const st = S();
    n = U.clamp(Math.round(n) || st.size, Model.MIN_SIZE, Model.MAX_SIZE);
    if (n === st.size) { renderSizes(); return; }
    const dropped = Model.resize(st, n);
    ui.selected = null;
    commit({ refit: true });
    renderSizes();
    if (dropped) toast(`Küçülen bukete sığmayan ${dropped} çiçek çıkarıldı`);
  }

  // ---------- Çiçekler sekmesi ----------
  function renderFlowerGrid() {
    const g = $('flowerGrid');
    g.innerHTML = '';
    const c = cat();
    c.order.forEach((type) => {
      const b = document.createElement('button');
      b.type = 'button';
      const active = brush().type === type;
      b.className = 'flower-card' + (active ? ' is-active' : '');
      b.setAttribute('aria-pressed', active);
      const color = active ? brush().color : c.colors(type)[0].value;
      b.innerHTML = `<div class="thumb">${c.icon(type, color, 'card')}</div><span>${c.name(type)}</span>`;
      b.addEventListener('click', () => {
        const first = c.colors(type)[0];
        const keep = brush().type === type;
        ui.brush[ui.mode] = keep ? brush() : { type, color: first.value, name: first.name };
        renderFlowerTab();
      });
      g.appendChild(b);
    });
    $('typeCount').textContent = `· ${c.order.length} çeşit`;
  }

  function renderFlowerTab() {
    renderFlowerGrid();
    const c = cat();
    const br = brush();
    renderSwatches($('flowerColors'), c.colors(br.type), br.color, (value, name, live) => {
      ui.brush[ui.mode] = { type: br.type, color: value, name };
      if (live) {
        updateAddBox();
        const card = document.querySelector('.flower-card.is-active .thumb');
        if (card) card.innerHTML = c.icon(br.type, value, 'card');
        return;
      }
      renderFlowerTab();
    }, { custom: c.custom });
    $('colorName').textContent = '· ' + br.name;
    updateAddBox();
  }

  function updateAddBox() {
    const st = S();
    const c = cat();
    const br = brush();
    const empty = Model.emptySlots(st).length;
    $('addPreview').innerHTML = c.icon(br.type, br.color, 'card');
    $('addSummary').textContent = flowerLabel(brushFlower());
    $('addHint').innerHTML = empty
      ? `Buketteki <b class="plus">+</b> yerlerine tıkla ya da adet seçip otomatik yerleştir`
      : `Buket dolu — boyutu büyüt ya da bukette bir çiçeğe tıklayıp değiştir`;
    const q = qtyNow();
    $('qtyInput').value = q;
    $('qtyInput').max = Math.max(1, empty);
    $('addBtn').disabled = !empty;
    $('addBtn').textContent = empty ? `${q} tane yerleştir` : 'Buket dolu';
    $('fillBtn').disabled = !empty;
    $('fillBtn').textContent = empty ? `Kalan ${empty} boş yeri bu çiçekle doldur` : 'Boş yer kalmadı';
  }
  // İstenen adet saklanır; gösterilen adet boş yer sayısıyla sınırlanır
  const qtyNow = () => U.clamp(ui.qty, 1, Math.max(1, Model.emptySlots(S()).length));
  function setQty(v) {
    ui.qty = U.clamp(Math.round(v) || 1, 1, Math.max(1, Model.emptySlots(S()).length));
    updateAddBox();
  }
  function autoAdd(count) {
    const st = S();
    const empty = Model.emptySlots(st).length;
    if (!empty) return toast('Buket dolu — daha fazla çiçek için buket boyutunu büyüt');
    const placed = Model.placeAuto(st, brushFlower(), Math.min(count, empty));
    ui.selected = null;
    commit({ newSlots: placed });
    toast(`${placed.length} ${cat().name(brush().type).toLocaleLowerCase('tr')} buketine yerleştirildi`);
  }

  // ---------- Süsleme sekmesi ----------
  function renderDecor() {
    const st = S();
    const pick = (fn) => (hex, name, live) => { fn(hex, name); commit({ live }); if (!live) renderDecor(); };
    renderSwatches($('outerColors'), plain(PAPERS), st.wrap.outer, pick((h, n) => { st.wrap.outer = h; st.wrap.outerName = n; }));
    renderSwatches($('innerColors'), plain(PAPERS), st.wrap.inner, pick((h, n) => { st.wrap.inner = h; st.wrap.innerName = n; }));
    renderSwatches($('tieColors'), plain(TIES), st.tie.color, pick((h, n) => { st.tie.color = h; st.tie.name = n; }));
    renderSwatches($('gypsColors'), plain(GYPS), st.filler.gypsColor, pick((h, n) => { st.filler.gypsColor = h; st.filler.gypsName = n; }));
    $('outerName').textContent = '· ' + st.wrap.outerName;
    $('innerName').textContent = '· ' + st.wrap.innerName;
    $('tieName').textContent = '· ' + st.tie.name;
    document.querySelectorAll('#tieStyle button').forEach((b) => b.classList.toggle('is-active', b.dataset.style === st.tie.style));
    $('gypsToggle').checked = st.filler.gyps;
    $('greenToggle').checked = st.filler.green;
    $('gypsColors').classList.toggle('disabled', !st.filler.gyps);
    document.querySelectorAll('#greenAmount button').forEach((b) => b.classList.toggle('is-active', b.dataset.amount === st.filler.amount));
    $('greenAmount').classList.toggle('disabled', !st.filler.green && !st.filler.gyps);
  }

  // ---------- Sağ panel ----------
  function renderList() {
    const st = S();
    const c = cat();
    const ul = $('bqList');
    ul.innerHTML = '';
    const groups = Model.groups(st);
    const prevKeys = renderList.keys || new Set();
    renderList.keys = new Set(groups.map((g) => ui.mode + g.key));
    groups.forEach((g) => {
      const li = document.createElement('li');
      li.className = 'bq-item' + (prevKeys.has(ui.mode + g.key) ? '' : ' is-new');
      li.innerHTML =
        `<div class="ico">${c.icon(g.type, g.color, 'list')}</div>` +
        `<div class="meta"><strong>${c.name(g.type)}</strong><span><i style="background:${c.swatch(g.type, g.color)}"></i>${U.escape(g.colorName)}</span></div>` +
        `<div class="ctrl"><div class="stepper"><button type="button" data-a="dec" aria-label="Azalt">−</button><output>${g.slots.length}</output><button type="button" data-a="inc" aria-label="Artır">+</button></div>` +
        `<button type="button" class="remove" data-a="del" aria-label="Kaldır" title="Hepsini kaldır">✕</button></div>`;
      li.addEventListener('click', (e) => {
        const a = e.target.closest('button')?.dataset.a;
        if (!a) return;
        if (a === 'inc') {
          if (!Model.emptySlots(st).length) return toast('Buket dolu — daha fazla çiçek için buket boyutunu büyüt');
          const placed = Model.placeAuto(st, { type: g.type, color: g.color, colorName: g.colorName }, 1);
          commit({ newSlots: placed });
        } else if (a === 'dec') {
          Model.removeOneOf(st, g.key);
          commit();
        } else if (a === 'del') {
          Model.removeGroup(st, g.key);
          commit();
        }
      });
      ul.appendChild(li);
    });
    const tot = Model.filledCount(st);
    $('totalBadge').textContent = `${tot} / ${st.size}`;
    $('fillBar').style.width = `${(tot / st.size) * 100}%`;
    const empty = st.size - tot;
    $('fillText').textContent = empty ? `${tot} çiçek yerleştirildi · ${empty} boş yer kaldı` : `Buket tamamen doldu (${tot} çiçek)`;
    $('listEmpty').hidden = groups.length > 0;
    $('clearBtn').disabled = tot === 0;
    $('spreadBtn').disabled = tot < 2;

    const tieLabel = st.tie.style === 'twine' ? 'Jüt ip' : 'Kurdele';
    const row = (label, hex, name) => `<span>${label}</span><b><i style="background:${hex}"></i>${U.escape(name)}</b>`;
    $('decorSummary').innerHTML =
      row('Ambalaj', st.wrap.outer, st.wrap.outerName) +
      row('İç kağıt', st.wrap.inner, st.wrap.innerName) +
      row(tieLabel, st.tie.color, st.tie.name) +
      `<span>Dolgu</span><b>${[st.filler.gyps && 'Cipsofil', st.filler.green && 'Yeşillik'].filter(Boolean).join(' + ') || 'Yok'}${st.filler.green || st.filler.gyps ? ` (${{ az: 'az', dogal: 'doğal', bol: 'bol' }[st.filler.amount]})` : ''}</b>`;
  }

  // ---------- Sahne ----------
  const svgEl = $('bouquet');
  const glWrap = $('glWrap');
  let currentVB = null, vbAnim = null, lastRender = null;
  let view3d = null;
  let realProvider = null;
  const provider = () => (ui.mode === 'real' ? (realProvider = realProvider || Real.provider()) : null);
  const paperTex = () => (ui.mode === 'real' && window.Real ? Real.paperTex : null);

  function setVB(v) { svgEl.setAttribute('viewBox', v.map((x) => x.toFixed(1)).join(' ')); }
  function animateVB(target) {
    if (!currentVB) { currentVB = target.slice(); setVB(currentVB); return; }
    const from = currentVB.slice();
    const t0 = performance.now();
    cancelAnimationFrame(vbAnim);
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 450);
      const e = 1 - Math.pow(1 - k, 3);
      currentVB = from.map((a, i) => a + (target[i] - a) * e);
      setVB(currentVB);
      if (k < 1) vbAnim = requestAnimationFrame(step);
    };
    vbAnim = requestAnimationFrame(step);
  }

  function draw2D(newSlots) {
    const st = S();
    const newIds = new Set();
    (newSlots || []).forEach((i) => { const s = st.slots[i]; if (s) newIds.add('s' + i + ':' + s.t); });
    const r = Bouquet.render(st, {
      newIds,
      editing: true,
      selected: ui.selected,
      photo: provider(),
      paperTex: paperTex(),
    });
    lastRender = r;
    svgEl.innerHTML = `<defs>${r.defs}</defs>${r.body}<circle id="dropRing" class="drop-ring" r="0" cx="0" cy="0" style="display:none"/>`;
    svgEl.classList.toggle('hide-slots', !ui.showSlots);
    animateVB(r.viewBox);
  }

  function ensure3D() {
    if (view3d || !window.Bouquet3D || !Bouquet3D.supported()) return view3d;
    view3d = Bouquet3D.create(glWrap, {
      canEdit: () => true,
      onSlotClick: (slot, filled) => {
        if (slot == null) { deselect(); return; }
        handleSlotClick(slot, filled);
      },
      onDragStart: (from) => { ui.drag = { from, target: null }; hidePopover(); draw3D(); },
      onDragOver: (from, to) => { if (ui.drag) { ui.drag.target = to; draw3D(); } },
      onOrbit: () => hidePopover(),
      onDrop: (from, to) => {
        ui.drag = null;
        if (to != null && to !== from) {
          Model.move(S(), from, to);
          ui.selected = null;
          commit();
        } else draw3D();
      },
    });
    return view3d;
  }
  function draw3D(newSlots, refit) {
    if (!ensure3D()) return;
    view3d.update(S(), {
      photo: provider(),
      paperNormal: window.Real ? Real.paperNormal : null,
      editing: ui.showSlots,
      selected: ui.selected,
      dropTarget: ui.drag ? ui.drag.target : null,
      dragFrom: ui.drag ? ui.drag.from : null,
      newSlots: new Set(newSlots || []),
      refit,
    });
    // sayfa doğrudan 3B görünümde açıldıysa sahne burada ilk kez oluşur: çizim döngüsünü başlat
    view3d.setActive(ui.view === '3d');
  }
  function renderStage(newSlots, o = {}) {
    if (ui.view === '3d') draw3D(newSlots, o.refit);
    else draw2D(newSlots);
  }

  function renderView() {
    const is3d = ui.view === '3d';
    document.querySelectorAll('#viewSwitch button').forEach((b) => b.classList.toggle('is-active', b.dataset.view === ui.view));
    svgEl.hidden = is3d;
    glWrap.hidden = !is3d;
    $('rotateBtn').hidden = !is3d;
    $('resetViewBtn').hidden = !is3d;
    $('viewPresets').hidden = !is3d;
    if (view3d) view3d.setActive(is3d);
    renderHint();
  }
  function setView(v) {
    if (v === '3d' && !ensure3D()) return toast('Tarayıcın 3D görünümü (WebGL) desteklemiyor');
    ui.view = v;
    hidePopover();
    save();
    renderView();
    renderStage(null, { refit: false });
  }
  function renderHint() {
    const st = S();
    const empty = Model.emptySlots(st).length;
    let h;
    if (ui.view === '3d') h = 'Sürükle: döndür · Tekerlek/iki parmak: yakınlaştır · Çift tık: ortala' + (ui.showSlots && empty ? ' · +: çiçek ekle' : '');
    else h = (ui.showSlots && empty ? '+ yerlerine tıkla: seçili çiçek yerleşir · ' : '') + 'Çiçeği sürükle: yer değiştir · Çiçeğe tıkla: değiştir/kaldır';
    $('stageHint').textContent = h;
  }

  // ---------- Commit ----------
  function commit(o = {}) {
    if (ui.shared && ui.shared.mode === ui.mode && !o.live && sharedSig(S(), ui.mode) !== ui.shared.sig) adoptShared(true);
    save();
    if (o.live) {
      // renk tekerleği sürüklenirken sadece çizimi güncelle
      if (!commit.raf) commit.raf = requestAnimationFrame(() => { commit.raf = null; renderStage(); });
      return;
    }
    if (ui.selected != null && !S().slots[ui.selected]) ui.selected = null;
    renderStage(o.newSlots, o);
    renderList();
    updateAddBox();
    renderHint();
    if (ui.selected == null) hidePopover();
    else requestAnimationFrame(() => showPopover(ui.selected));
  }

  // ---------- Yer tıklama / seçim ----------
  function handleSlotClick(i, filled) {
    const st = S();
    if (!filled || !st.slots[i]) {
      Model.placeAt(st, i, brushFlower());
      ui.selected = null;
      commit({ newSlots: [i] });
      return;
    }
    ui.selected = ui.selected === i ? null : i;
    commit();
  }
  function deselect() {
    if (ui.selected == null) return;
    ui.selected = null;
    hidePopover();
    renderStage();
  }

  function slotScreenPos(i) {
    const stageRect = $('stage').getBoundingClientRect();
    if (ui.view === '3d') {
      if (!view3d) return null;
      const p = view3d.projectSlot(i);
      if (!p) return null;
      const r = glWrap.getBoundingClientRect();
      return { x: p.x + r.left - stageRect.left, y: p.y + r.top - stageRect.top, r: 0 };
    }
    if (!lastRender) return null;
    const m = svgEl.getScreenCTM();
    const p = lastRender.slotPos[i];
    const s = (lastRender.headSize[i] || 30) * 0.8;
    return { x: m.a * p.x + m.e - stageRect.left, y: m.d * p.y + m.f - stageRect.top, r: s * m.d };
  }
  function showPopover(i) {
    const st = S();
    const f = st.slots[i];
    const pop = $('popover');
    if (!f) return hidePopover();
    const pos = slotScreenPos(i);
    if (!pos) return hidePopover();
    $('popIco').innerHTML = cat().icon(f.type, f.color, f.t);
    $('popName').textContent = flowerLabel(f);
    const b = brush();
    const same = b.type === f.type && String(b.color).toLowerCase() === String(f.color).toLowerCase();
    $('popReplace').hidden = same;
    $('popReplace').textContent = `${flowerLabel(brushFlower())} ile değiştir`;
    pop.hidden = false;
    const top = pos.y - pos.r;
    const below = top < 150;
    pop.classList.toggle('below', below);
    const stageW = $('stage').clientWidth;
    pop.style.left = U.clamp(pos.x, 120, stageW - 120) + 'px';
    pop.style.top = (below ? pos.y + pos.r : top) + 'px';
  }
  function hidePopover() { $('popover').hidden = true; }

  // ---------- 2B sürükle-bırak ----------
  function toSVG(e) {
    const pt = svgEl.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svgEl.getScreenCTM().inverse());
  }
  function nearestSlot(p, except) {
    if (!lastRender) return null;
    let best = null, bd = Infinity;
    lastRender.slotPos.forEach((q, i) => {
      if (i === except) return;
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      const lim = Math.max(28, (lastRender.headSize[i] || 0) * 0.85);
      if (d < lim && d < bd) { bd = d; best = i; }
    });
    return best;
  }
  let press = null;
  svgEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const node = e.target.closest('.slot-node');
    press = {
      x: e.clientX, y: e.clientY, node,
      slot: node ? +node.dataset.slot : null,
      filled: !!(node && node.classList.contains('filled')),
      moved: false,
    };
    if (press.filled) { try { svgEl.setPointerCapture(e.pointerId); } catch (err) { /* yok say */ } }
  });
  svgEl.addEventListener('pointermove', (e) => {
    const p = press;
    if (!p || !p.filled) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (!p.moved && Math.hypot(dx, dy) < 6) return;
    if (!p.moved) {
      p.moved = true;
      hidePopover();
      ui.drag = { from: p.slot, target: null };
      p.node.classList.add('is-dragging');
      svgEl.classList.add('dragging-active');
      svgEl.appendChild(p.node); // sürüklenen çiçek en üstte görünsün
    }
    const m = svgEl.getScreenCTM();
    p.node.setAttribute('transform', `translate(${(dx / m.a).toFixed(1)} ${(dy / m.d).toFixed(1)})`);
    const t = nearestSlot(toSVG(e), p.slot);
    if (t !== ui.drag.target) {
      ui.drag.target = t;
      const ring = $('dropRing');
      if (t == null) ring.style.display = 'none';
      else {
        const q = lastRender.slotPos[t];
        ring.setAttribute('cx', q.x);
        ring.setAttribute('cy', q.y);
        ring.setAttribute('r', Math.max(20, (lastRender.headSize[t] || 22) * 0.9));
        ring.style.display = '';
        svgEl.appendChild(ring);
      }
    }
  });
  const endPress = (e) => {
    const p = press;
    press = null;
    if (!p) return;
    svgEl.classList.remove('dragging-active');
    if (p.moved) {
      const target = ui.drag ? ui.drag.target : null;
      ui.drag = null;
      if (target != null && target !== p.slot && e.type === 'pointerup') {
        Model.move(S(), p.slot, target);
        ui.selected = null;
        commit();
      } else {
        draw2D();
      }
      return;
    }
    if (e.type !== 'pointerup') return;
    if (p.slot != null) handleSlotClick(p.slot, p.filled);
    else deselect();
  };
  svgEl.addEventListener('pointerup', endPress);
  svgEl.addEventListener('pointercancel', endPress);

  // ---------- PNG indirme ----------
  function saveCanvas(canvas, name) {
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast('Buket resmi indirildi');
    }, 'image/png');
  }
  function paintBackground(g, W, H) {
    const grd = g.createRadialGradient(W / 2, H * 0.42, 10, W / 2, H * 0.5, Math.max(W, H) * 0.75);
    grd.addColorStop(0, '#fffaf4');
    grd.addColorStop(1, '#eee3d6');
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);
  }
  function download() {
    if (ui.view === '3d' && view3d) {
      const url = view3d.snapshot(1400);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext('2d');
        paintBackground(g, c.width, c.height);
        g.drawImage(img, 0, 0);
        saveCanvas(c, 'buketim-3d.png');
      };
      img.src = url;
      return;
    }
    const st = S();
    const r = Bouquet.render(st, { prefix: 'x-', editing: false, photo: provider(), paperTex: paperTex() });
    const [x, y, w, h] = r.viewBox;
    const W = 1400, H = Math.round((W * h) / w);
    let src =
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="${x} ${y} ${w} ${h}">` +
      `<defs>${r.defs}</defs>` + r.body.replace(/<g class="edit-layer">[\s\S]*$/, '') + `</svg>`;
    if (ui.mode === 'real') src = Real.inlineForExport(src);
    const img = new Image();
    const url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml;charset=utf-8' }));
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const g = c.getContext('2d');
      paintBackground(g, W, H);
      g.drawImage(img, 0, 0, W, H);
      URL.revokeObjectURL(url);
      saveCanvas(c, 'buketim.png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast('Resim oluşturulamadı'); };
    img.src = url;
  }

  // ---------- Kaynaklar ----------
  function openCredits() {
    const list = $('creditsList');
    const items = Object.entries(Real.credits);
    list.innerHTML =
      items.map(([id, c]) =>
        `<div class="credit"><img src="${Real.url(id)}" alt="" /><div><b>${U.escape(c.title.replace(/^File:/, ''))}</b><br>` +
        `${U.escape(c.artist || 'Bilinmiyor')} · ${U.escape(c.license || '')}<br><a href="${U.escape(c.page)}" target="_blank" rel="noopener">${U.escape(c.page)}</a></div></div>`
      ).join('') +
      `<div class="credit"><div></div><div><b>Kağıt dokusu</b><br>${U.escape(Real.textureCredit)}</div></div>`;
    $('creditsModal').hidden = false;
  }

  // ---------- Olaylar ----------
  document.querySelectorAll('.mode-btn').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.mode === ui.mode) return;
      ui.mode = b.dataset.mode;
      ui.selected = null;
      ui.drag = null;
      hidePopover();
      save();
      renderAll({ refit: true });
    })
  );
  document.querySelectorAll('.tab').forEach((t) =>
    t.addEventListener('click', () => {
      ui.tab = t.dataset.tab;
      document.querySelectorAll('.tab').forEach((x) => {
        const on = x === t;
        x.classList.toggle('is-active', on);
        x.setAttribute('aria-selected', on);
      });
      document.querySelectorAll('.tab-panel').forEach((p) => (p.hidden = p.dataset.panel !== ui.tab));
    })
  );
  $('sizeMinus').addEventListener('click', () => setSize(S().size - 1));
  $('sizePlus').addEventListener('click', () => setSize(S().size + 1));
  $('sizeInput').addEventListener('change', (e) => setSize(+e.target.value));
  $('qtyMinus').addEventListener('click', () => setQty(ui.qty - 1));
  $('qtyPlus').addEventListener('click', () => setQty(ui.qty + 1));
  $('qtyInput').addEventListener('change', (e) => setQty(+e.target.value));
  $('addBtn').addEventListener('click', () => autoAdd(qtyNow()));
  $('fillBtn').addEventListener('click', () => autoAdd(Model.emptySlots(S()).length));

  document.querySelectorAll('#tieStyle button').forEach((b) =>
    b.addEventListener('click', () => {
      const st = S();
      st.tie.style = b.dataset.style;
      if (b.dataset.style === 'twine' && st.tie.color === '#e7b9c0') { st.tie.color = '#b89466'; st.tie.name = 'Jüt'; }
      commit();
      renderDecor();
    })
  );
  $('gypsToggle').addEventListener('change', (e) => { S().filler.gyps = e.target.checked; commit(); renderDecor(); });
  $('greenToggle').addEventListener('change', (e) => { S().filler.green = e.target.checked; commit(); renderDecor(); });
  document.querySelectorAll('#greenAmount button').forEach((b) =>
    b.addEventListener('click', () => { S().filler.amount = b.dataset.amount; commit(); renderDecor(); })
  );

  document.querySelectorAll('#viewSwitch button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $('rotateBtn').addEventListener('click', () => {
    if (!view3d) return;
    view3d.setAutoRotate(!view3d.autoRotate);
    $('rotateBtn').classList.toggle('is-on', view3d.autoRotate);
    hidePopover();
  });
  $('resetViewBtn').addEventListener('click', () => { if (view3d) view3d.reset(); hidePopover(); });
  document.querySelectorAll('#viewPresets button').forEach((b) =>
    b.addEventListener('click', () => { if (view3d) view3d.view(b.dataset.preset); hidePopover(); })
  );
  $('previewBtn').addEventListener('click', () => {
    ui.showSlots = !ui.showSlots;
    $('previewBtn').classList.toggle('is-on', !ui.showSlots);
    ui.selected = null;
    hidePopover();
    renderStage();
    renderHint();
  });
  $('shuffleBtn').addEventListener('click', () => {
    if (Model.filledCount(S()) < 2) return toast('Karıştırmak için en az 2 çiçek gerekli');
    Model.shuffle(S());
    ui.selected = null;
    commit();
  });
  $('spreadBtn').addEventListener('click', () => {
    Model.spreadEvenly(S());
    ui.selected = null;
    commit();
    toast('Aynı çiçekler bukete eşit dağıtıldı');
  });
  $('downloadBtn').addEventListener('click', download);

  let clearArmed = false, clearTimer;
  $('clearBtn').addEventListener('click', (e) => {
    const b = e.currentTarget;
    if (!clearArmed) {
      clearArmed = true;
      b.textContent = 'Emin misin?';
      clearTimer = setTimeout(() => { clearArmed = false; b.textContent = 'Temizle'; }, 2500);
      return;
    }
    clearTimeout(clearTimer);
    clearArmed = false;
    b.textContent = 'Temizle';
    const st = S();
    st.slots = new Array(st.size).fill(null);
    ui.selected = null;
    commit();
    toast('Buket temizlendi');
  });

  $('popClose').addEventListener('click', deselect);
  $('popRemove').addEventListener('click', () => {
    if (ui.selected == null) return;
    S().slots[ui.selected] = null;
    ui.selected = null;
    commit();
  });
  $('popReplace').addEventListener('click', () => {
    const i = ui.selected;
    if (i == null) return;
    Model.placeAt(S(), i, brushFlower());
    ui.selected = null;
    commit({ newSlots: [i] });
  });
  $('creditsBtn').addEventListener('click', openCredits);
  $('creditsClose').addEventListener('click', () => ($('creditsModal').hidden = true));
  $('creditsModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.hidden = true; });

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'Escape') {
      $('creditsModal').hidden = true;
      $('shareModal').hidden = true;
      deselect();
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && ui.selected != null) {
      e.preventDefault();
      $('popRemove').click();
    }
  });
  window.addEventListener('resize', () => { if (ui.selected != null) showPopover(ui.selected); });

  // ---------- Paylaşım ----------
  const nameOf = (list, hex) => (list.find(([, h]) => h.toLowerCase() === String(hex).toLowerCase()) || ['Özel renk'])[0];
  const sharedSig = (st, mode) => Share.encode(st, mode, '2d');
  function clearHash() {
    if (location.hash) history.replaceState(null, '', location.href.split('#')[0]);
  }
  function applyShared(code) {
    let data;
    try { data = Share.decode(code); } catch (e) { toast('Paylaşım bağlantısı açılamadı'); return false; }
    if (data.mode === 'real' && !CATALOG.real) return false;
    const st = data.state;
    st.wrap.outerName = nameOf(PAPERS, st.wrap.outer);
    st.wrap.innerName = nameOf(PAPERS, st.wrap.inner);
    st.tie.name = nameOf(TIES, st.tie.color);
    st.filler.gypsName = nameOf(GYPS, st.filler.gypsColor);
    const valid = validState(st, data.mode);
    if (!valid) return false;
    // daha önce başka bir paylaşım açıksa, kişinin kendi buketini geri koy
    if (ui.shared) store[ui.shared.mode] = ui.shared.own;
    ui.shared = { mode: data.mode, own: store[data.mode], sig: sharedSig(valid, data.mode), code };
    store[data.mode] = valid;
    ui.mode = data.mode;
    ui.view = data.view === '3d' && window.Bouquet3D && Bouquet3D.supported() ? '3d' : '2d';
    ui.selected = null;
    ui.drag = null;
    ui.showSlots = false; // alıcı temiz bir buket görsün
    return true;
  }
  function adoptShared(auto) {
    if (!ui.shared) return;
    ui.shared = null;
    clearHash();
    save();
    renderShared();
    toast(auto ? 'Paylaşılan buket artık senin buketin olarak kaydedildi' : 'Buket senin buketin oldu — dilediğin gibi düzenleyebilirsin');
  }
  function leaveShared() {
    if (!ui.shared) return;
    store[ui.shared.mode] = ui.shared.own;
    ui.shared = null;
    ui.showSlots = true;
    ui.selected = null;
    clearHash();
    hidePopover();
    save();
    renderAll({ refit: true });
  }
  function renderShared() {
    const on = !!(ui.shared && ui.shared.mode === ui.mode);
    $('sharedBanner').hidden = !on;
    $('stage').classList.toggle('is-shared', on);
    document.title = on ? '💐 Sana bir buket — Buket Atölyesi' : 'Buket Atölyesi';
    $('previewBtn').classList.toggle('is-on', !ui.showSlots);
  }

  const SHARE_TEXT = 'Sana bir buket hazırladım 💐';
  function openShare() {
    const st = S();
    if (!Model.filledCount(st)) return toast('Paylaşmak için önce bukete çiçek ekle');
    hidePopover();
    const link = Share.url(Share.encode(st, ui.mode, ui.view));
    $('shareLink').value = link;
    $('shareCopy').textContent = 'Kopyala';
    const pv = $('sharePreview');
    if (ui.view === '3d' && view3d) {
      pv.innerHTML = `<img alt="Buket önizlemesi" src="${view3d.snapshot(700)}" />`;
    } else {
      const r = Bouquet.render(st, { prefix: 'sh-', editing: false, photo: provider(), paperTex: paperTex() });
      pv.innerHTML = `<svg viewBox="${r.viewBox.join(' ')}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"><defs>${r.defs}</defs>${r.body}</svg>`;
    }
    $('shareNative').hidden = !navigator.share;
    $('shareModal').hidden = false;
    setTimeout(() => $('shareLink').select(), 50);
  }
  function copyLink() {
    const inp = $('shareLink');
    const done = () => { $('shareCopy').textContent = 'Kopyalandı ✓'; toast('Bağlantı kopyalandı'); };
    const fallback = () => {
      inp.focus();
      inp.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Kopyalanamadı — bağlantıyı elle seçip kopyala'); }
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(inp.value).then(done, fallback);
    else fallback();
  }
  function shareTo(target) {
    const link = $('shareLink').value;
    const enc = encodeURIComponent;
    const urls = {
      whatsapp: `https://wa.me/?text=${enc(SHARE_TEXT + ' ' + link)}`,
      telegram: `https://t.me/share/url?url=${enc(link)}&text=${enc(SHARE_TEXT)}`,
      x: `https://twitter.com/intent/tweet?text=${enc(SHARE_TEXT)}&url=${enc(link)}`,
    };
    if (target === 'email') {
      location.href = `mailto:?subject=${enc('Sana bir buket 💐')}&body=${enc(SHARE_TEXT + '\n\n' + link)}`;
    } else if (target === 'native') {
      navigator.share({ title: 'Buket Atölyesi', text: SHARE_TEXT, url: link }).catch(() => {});
    } else if (urls[target]) {
      window.open(urls[target], '_blank', 'noopener');
    }
  }
  $('shareBtn').addEventListener('click', openShare);
  $('shareBtn2').addEventListener('click', openShare);
  $('shareCopy').addEventListener('click', copyLink);
  $('shareClose').addEventListener('click', () => ($('shareModal').hidden = true));
  $('shareModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.hidden = true; });
  document.querySelectorAll('.share-targets .target').forEach((b) => b.addEventListener('click', () => shareTo(b.dataset.target)));
  $('sharedAdopt').addEventListener('click', () => {
    ui.showSlots = true;
    adoptShared(false);
    renderStage();
    renderHint();
  });
  $('sharedLeave').addEventListener('click', leaveShared);
  window.addEventListener('hashchange', () => {
    const code = Share.fromLocation();
    if (!code || (ui.shared && ui.shared.code === code)) return;
    if (applyShared(code)) { hidePopover(); save(); renderAll({ refit: true }); }
  });

  // ---------- Başlat ----------
  function renderAll(o = {}) {
    renderModeSwitch();
    renderSizes();
    renderFlowerTab();
    renderDecor();
    renderView();
    const st = S();
    renderStage(st.slots.map((s, i) => (s ? i : -1)).filter((i) => i >= 0), o);
    renderList();
    updateAddBox();
    renderHint();
    renderShared();
  }
  const initialCode = window.Share && Share.fromLocation();
  if (initialCode) applyShared(initialCode);
  if (ui.view === '3d' && !(window.Bouquet3D && Bouquet3D.supported())) ui.view = '2d';
  if (!(window.Bouquet3D && Bouquet3D.supported())) document.querySelector('#viewSwitch [data-view="3d"]').disabled = true;
  renderAll({ refit: true });
})();
