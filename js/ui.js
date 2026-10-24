// 界面：部件列表（分组 / 筛选 / 显隐 / 双向同步）、详情面板、控制栏、顶部状态、引导与提示
import { PARTS, PART_MAP, CATEGORIES, GROUPS, STAGES, TAGS, LINKS, stageEnd } from './data.js';
import { SPEC } from './config.js';
import { STATE_NAMES } from './animation.js';
import { VIEWS, MODE_NAMES } from './interaction.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SRC = { demo: 'demo', ref: 'ref', edit: 'edit', unk: 'unk', est: 'est' };
const TYPE_NAMES = { power: '电源', signal: '信号', rf: '射频', motor: '电机相线' };
const LS_KEY = 'fpv-drone-lab:edits';

export class UI {
  constructor(app) {
    this.app = app; this.filter = ''; this.collapsed = new Set();
    this.edits = this.loadEdits();
    this.buildList(); this.bindControls(); this.renderDetail(); this.initGuide();
  }
  // ---------- 可编辑参数（本地保存） ----------
  loadEdits() { try { return { kv: SPEC.motorKV, cap: SPEC.capacityMAh, tilt: SPEC.camTiltDeg, ...(JSON.parse(localStorage.getItem(LS_KEY) || '{}')) }; } catch { return { kv: SPEC.motorKV, cap: SPEC.capacityMAh, tilt: SPEC.camTiltDeg }; } }
  saveEdits() { try { localStorage.setItem(LS_KEY, JSON.stringify(this.edits)); } catch {} }
  totals() {
    const weight = PARTS.reduce((s, p) => s + (p.weight || 0) * (p.group ? 1 : 1), 0);
    const cap = this.edits.cap, flight = (cap / 1000) * 0.8 / SPEC.avgCurrentA * 60;
    const wh = cap / 1000 * SPEC.cells * SPEC.cellVoltage;
    return { weight, flight, wh, cap, count: PARTS.length };
  }
  // ---------- 部件列表 ----------
  buildList() {
    const list = $('part-list'); list.innerHTML = '';
    for (const cat of CATEGORIES) {
      const parts = PARTS.filter((p) => p.category === cat.id); if (!parts.length) continue;
      const sec = document.createElement('div'); sec.className = 'cat'; sec.dataset.cat = cat.id;
      sec.innerHTML = `<div class="cat-head"><span class="chev">▾</span><span class="it-ico" style="--c:${cat.color}">${cat.ico}</span><span>${cat.name}</span><small>${cat.en}</small><span class="it-qty">${parts.length}</span></div><div class="cat-items"></div>`;
      const items = sec.querySelector('.cat-items');
      sec.querySelector('.cat-head').onclick = () => sec.classList.toggle('collapsed');
      const doneGroups = new Set();
      for (const p of parts) {
        if (p.group && !doneGroups.has(p.group)) {
          doneGroups.add(p.group);
          const members = parts.filter((q) => q.group === p.group);
          items.appendChild(this.row({ key: 'group:' + p.group, name: GROUPS[p.group] || p.groupName, meta: `组 · ${members.length} 件`, ico: cat.ico, color: cat.color, qty: '×' + members.length, ids: members.map((m) => m.id) }));
          for (const m of members) items.appendChild(this.row({ key: m.id, name: m.name, meta: `${m.code} · ${m.nameEn}`, ico: '', color: cat.color, ids: [m.id], sub: true }));
        } else if (!p.group) items.appendChild(this.row({ key: p.id, name: p.name, meta: `${p.code} · ${p.nameEn}`, ico: cat.ico, color: cat.color, qty: p.quantity > 1 ? '×' + p.quantity : '', ids: [p.id] }));
      }
      list.appendChild(sec);
    }
    $('part-filter').addEventListener('input', (e) => { this.filter = e.target.value.trim().toLowerCase(); this.applyFilter(); });
    this.applyFilter();
  }
  row({ key, name, meta, ico, color, qty, ids, sub }) {
    const el = document.createElement('div'); el.className = 'item' + (sub ? ' sub' : ''); el.dataset.key = key; el.dataset.ids = ids.join(',');
    el.dataset.search = (name + ' ' + meta + ' ' + ids.map((i) => PART_MAP[i].nameEn + ' ' + PART_MAP[i].code).join(' ')).toLowerCase();
    el.innerHTML = `<span class="it-ico" style="--c:${color}">${sub ? '·' : ico}</span><span class="it-main"><span class="it-name">${esc(name)}</span><span class="it-meta">${esc(meta)}</span></span><span class="it-state"></span>${qty ? `<span class="it-qty">${qty}</span>` : ''}<button class="vis-btn" title="显示 / 隐藏"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zm0 11a4 4 0 110-8 4 4 0 010 8z" fill="currentColor"/></svg></button>`;
    el.onclick = (e) => {
      if (e.target.closest('.vis-btn')) return;
      this.app.select(key.startsWith('group:') ? key : ids[0], { from: 'list', additive: e.shiftKey });
    };
    el.ondblclick = (e) => { if (!e.target.closest('.vis-btn')) this.app.inter.focus(ids); };
    el.querySelector('.vis-btn').onclick = (e) => {
      e.stopPropagation(); const v = !ids.every((i) => this.app.inter.userVisible[i]);
      ids.forEach((i) => (this.app.inter.userVisible[i] = v)); this.app.inter.refresh();
      this.toast(v ? `已显示：${name}` : `已隐藏：${name}`);
    };
    return el;
  }
  applyFilter() {
    let n = 0;
    for (const sec of document.querySelectorAll('#part-list .cat')) {
      let any = false;
      for (const it of sec.querySelectorAll('.item')) { const hit = !this.filter || it.dataset.search.includes(this.filter); it.classList.toggle('filtered-out', !hit); if (hit) { any = true; if (!it.dataset.key.startsWith('group:')) n++; } }
      sec.style.display = any ? '' : 'none';
      if (this.filter && any) sec.classList.remove('collapsed');
    }
    $('part-count').textContent = this.filter ? `${n} / ${PARTS.length} 项` : `${PARTS.length} 项`;
  }
  syncList() {
    const sel = new Set(this.app.inter.selected), key = this.app.selKey, ex = this.app.explode;
    let first = null;
    for (const it of document.querySelectorAll('#part-list .item')) {
      const ids = it.dataset.ids.split(',');
      const isSel = it.dataset.key === key || (!key?.startsWith('group:') && ids.length === 1 && sel.has(ids[0])) || (key?.startsWith('group:') && it.classList.contains('sub') && sel.has(ids[0]));
      it.classList.toggle('selected', !!isSel); if (isSel && !first) first = it;
      const allHidden = ids.every((i) => !this.app.inter.userVisible[i]);
      it.classList.toggle('hidden-part', allHidden); it.querySelector('.vis-btn').classList.toggle('off', allHidden);
      const exd = ids.some((i) => ex.isExploded(i)); const st = it.querySelector('.it-state');
      st.textContent = exd ? '已拆' : ''; st.classList.toggle('ex', exd);
    }
    if (first && this.app.lastSelFrom !== 'list') { first.closest('.cat')?.classList.remove('collapsed'); first.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }
  // ---------- 详情面板 ----------
  renderDetail() {
    const ids = this.app.inter.selected, key = this.app.selKey;
    const title = $('detail-title'), body = $('detail-body');
    if (!ids.length) { title.textContent = '整机概览'; body.innerHTML = this.overviewHTML(); this.bindDetail(); return; }
    if (key && key.startsWith('group:')) { const g = key.slice(6); title.textContent = '部件组'; body.innerHTML = this.groupHTML(g, ids); this.bindDetail(); return; }
    if (ids.length > 1) { title.textContent = `多选 · ${ids.length} 件`; body.innerHTML = this.multiHTML(ids); this.bindDetail(); return; }
    const p = PART_MAP[ids[0]]; title.textContent = '部件详情'; body.innerHTML = this.partHTML(p); this.bindDetail();
  }
  kv(k, v, tag) { return `<div class="kv"><span class="k">${esc(k)}</span><span class="v">${v}</span>${tag ? `<span class="src ${SRC[tag]}">${TAGS[tag]}</span>` : ''}</div>`; }
  overviewHTML() {
    const t = this.totals();
    return `<div class="d-hero"><div class="d-name">5 寸 FPV 穿越机 · 演示机型</div><div class="d-en">Procedural Demo Build · 220 mm X-Frame</div>
      <div class="d-tags"><span class="tag acc">程序化模型</span><span class="tag">${t.count} 个部件</span><span class="tag amb">非真实品牌</span></div></div>
      <div class="ov-grid">
        <div class="ov-card"><div class="k">轴距</div><div class="v">${SPEC.wheelbaseMM} mm</div><div class="s">演示配置</div></div>
        <div class="ov-card"><div class="k">电机</div><div class="v">${SPEC.motorSize} · ${this.edits.kv}KV</div><div class="s">可编辑</div></div>
        <div class="ov-card"><div class="k">螺旋桨</div><div class="v">${SPEC.propInch}×${SPEC.propPitchInch}×${SPEC.propBlades}</div><div class="s">演示配置</div></div>
        <div class="ov-card"><div class="k">电池</div><div class="v">${SPEC.cells}S ${t.cap}mAh</div><div class="s">${t.wh.toFixed(1)} Wh · 可编辑</div></div>
        <div class="ov-card"><div class="k">起飞重量</div><div class="v">≈ ${t.weight.toFixed(0)} g</div><div class="s">各部件参考重量求和 · 演示估算</div></div>
        <div class="ov-card"><div class="k">悬停续航</div><div class="v">≈ ${t.flight.toFixed(1)} min</div><div class="s">80% 可用容量 / ${SPEC.avgCurrentA} A · 演示估算</div></div>
        <div class="ov-card wide"><div class="k">当前状态</div><div class="v">${STATE_NAMES[this.app.anim.state]} · 拆解 ${(this.app.explode.g * 100).toFixed(0)}% · 视图模式 ${MODE_NAMES[this.app.inter.mode]}</div><div class="s">点击模型或左侧列表查看部件详情；双击聚焦</div></div>
      </div>
      <div class="d-sec"><div class="d-sec-title">可编辑参数</div>
        <div class="kv"><span class="k">电机 KV</span><span class="v"><input type="number" data-edit="kv" min="1000" max="4000" step="50" value="${this.edits.kv}"></span><span class="src edit">可编辑</span></div>
        <div class="kv"><span class="k">电池容量 (mAh)</span><span class="v"><input type="number" data-edit="cap" min="450" max="3000" step="50" value="${this.edits.cap}"></span><span class="src edit">可编辑</span></div>
      </div>
      <div class="d-sec"><div class="d-sec-title">拆解阶段</div>${STAGES.map((s) => this.kv(`阶段 ${s.n}`, esc(s.name))).join('')}</div>
      <div class="d-note">数值标签说明：演示配置＝本演示设定；参考参数＝同类产品常见范围；可编辑＝可在页面修改（本地保存）；未配置＝暂无数据；演示估算＝按简化公式估算，仅供参考。</div>`;
  }
  extraFor(p) {
    const e = this.edits, V = SPEC.cells * SPEC.cellVoltage;
    switch (p.kind) {
      case 'motor': return [this.kv('空载转速', `≈ ${Math.round(e.kv * V).toLocaleString()} rpm`, 'est'), this.kv('KV 值', `<input type="number" data-edit="kv" min="1000" max="4000" step="50" value="${e.kv}">`, 'edit'), this.kv('对应桨', p.id.replace('motor', 'prop').toUpperCase(), 'demo')];
      case 'prop': return [this.kv('旋向', p.dir === 'CW' ? '顺时针 CW（俯视）' : '逆时针 CCW（俯视）', 'demo'), this.kv('桨尖速度', `≈ ${Math.round(e.kv * V * Math.PI * 0.127 / 60)} m/s（空载）`, 'est')];
      case 'battery': return [this.kv('容量', `<input type="number" data-edit="cap" min="450" max="3000" step="50" value="${e.cap}"> mAh`, 'edit'), this.kv('能量', `${(e.cap / 1000 * V).toFixed(1)} Wh`, 'est'), this.kv('悬停续航', `≈ ${this.totals().flight.toFixed(1)} min`, 'est')];
      case 'fc': return [this.kv('安装孔距', `${SPEC.fcHoleMM} × ${SPEC.fcHoleMM} mm`, 'demo'), this.kv('减震', '硅胶减震圈 ×4', 'demo')];
      case 'esc': return [this.kv('安装孔距', `${SPEC.escHoleMM} × ${SPEC.escHoleMM} mm`, 'demo'), this.kv('持续电流', '未配置', 'unk')];
      case 'camera': return [this.kv('安装倾角', `${SPEC.camTiltDeg}°（几何模型）`, 'demo')];
      case 'vtx': return [this.kv('散热', '铝散热片 8 鳍', 'demo')];
      case 'rx': return [this.kv('天线', '双 T 形天线沿后臂固定', 'demo')];
      default: return [];
    }
  }
  connHTML(id) {
    const links = LINKS.filter((l) => l.from === id || l.to === id);
    if (!links.length) return '<div class="d-text">无直接逻辑连接（结构件）。</div>';
    return `<div class="conn-list">${links.map((l) => { const o = l.from === id ? l.to : l.from; return `<div class="conn" data-goto="${o}"><span class="ct" style="--c:var(--${l.type === 'motor' ? 'text3' : l.type === 'power' ? 'amber' : l.type === 'rf' ? 'violet' : 'accent'})">${TYPE_NAMES[l.type]}</span><span>${esc(PART_MAP[o].name)}</span><small>${esc(l.name)}</small></div>`; }).join('')}</div>`;
  }
  partHTML(p) {
    const cat = CATEGORIES.find((c) => c.id === p.category); const ex = this.app.explode;
    const canEx = ex.hasExplode(p.id), isEx = (ex.single[p.id] || 0) > 0.5;
    return `<div class="d-hero"><div class="d-name">${esc(p.name)}</div><div class="d-en">${esc(p.nameEn)} · ${p.code}</div>
      <div class="d-tags"><span class="tag acc">${cat.name}</span>${p.quantity > 1 ? `<span class="tag">数量 ×${p.quantity}</span>` : ''}${p.weight ? `<span class="tag amb">≈ ${p.weight} g</span>` : ''}${ex.isExploded(p.id) ? '<span class="tag">已拆出</span>' : ''}</div></div>
      <div class="d-sec"><div class="d-sec-title">功能说明</div><div class="d-text">${esc(p.description)}</div></div>
      ${p.mount ? `<div class="d-sec"><div class="d-sec-title">安装位置</div><div class="d-text">${esc(p.mount)}</div></div>` : ''}
      ${p.material ? `<div class="d-sec"><div class="d-sec-title">材料 / 工艺</div><div class="d-text">${esc(p.material)}</div></div>` : ''}
      <div class="d-sec"><div class="d-sec-title">参数</div>${(p.parameters || []).map((x) => this.kv(x.k, esc(x.v), x.tag)).join('')}${this.extraFor(p).join('')}</div>
      <div class="d-sec"><div class="d-sec-title">连接关系</div>${this.connHTML(p.id)}</div>
      <div class="d-sec"><div class="d-sec-title">拆解</div>${p.explode ? this.kv('所属阶段', `阶段 ${p.explode.stage} · ${esc(STAGES[p.explode.stage - 1].name)}`, 'demo') : this.kv('所属阶段', '随端点动态变化', 'demo')}</div>
      <div class="d-actions"><button class="btn small" data-act="focus">聚焦</button>${canEx ? `<button class="btn small" data-act="ex">${isEx ? '复位此部件' : '单独拆出'}</button>` : ''}<button class="btn small" data-act="hide">隐藏</button><button class="btn small ghost" data-act="clear">取消选择</button></div>`;
  }
  groupHTML(g, ids) {
    const ps = ids.map((i) => PART_MAP[i]), w = ps.reduce((s, p) => s + (p.weight || 0), 0);
    return `<div class="d-hero"><div class="d-name">${esc(GROUPS[g])}</div><div class="d-en">Group · ${ids.length} parts</div><div class="d-tags"><span class="tag acc">部件组</span><span class="tag amb">合计 ≈ ${w} g</span></div></div>
      <div class="d-sec"><div class="d-sec-title">组内部件</div><div class="conn-list">${ps.map((p) => `<div class="conn" data-goto="${p.id}"><span class="ct">${p.code}</span><span>${esc(p.name)}</span><small>${p.dir || ''}</small></div>`).join('')}</div></div>
      <div class="d-sec"><div class="d-sec-title">共同参数</div>${(ps[0].parameters || []).filter((x) => !/转向|旋向/.test(x.k)).map((x) => this.kv(x.k, esc(x.v), x.tag)).join('')}</div>
      <div class="d-actions"><button class="btn small" data-act="focus">聚焦整组</button><button class="btn small" data-act="ex">整组拆出 / 复位</button><button class="btn small" data-act="hide">隐藏整组</button><button class="btn small ghost" data-act="clear">取消选择</button></div>`;
  }
  multiHTML(ids) {
    return `<div class="d-hero"><div class="d-name">已选择 ${ids.length} 个部件</div><div class="d-en">Shift + 点击 可继续加选</div></div>
      <div class="conn-list">${ids.map((i) => `<div class="conn" data-goto="${i}"><span class="ct">${PART_MAP[i].code}</span><span>${esc(PART_MAP[i].name)}</span></div>`).join('')}</div>
      <div class="d-actions"><button class="btn small" data-act="focus">聚焦</button><button class="btn small" data-act="hide">隐藏所选</button><button class="btn small ghost" data-act="clear">取消选择</button></div>`;
  }
  bindDetail() {
    const body = $('detail-body');
    body.querySelectorAll('[data-goto]').forEach((el) => (el.onclick = () => this.app.select(el.dataset.goto, { from: 'detail' })));
    body.querySelectorAll('[data-act]').forEach((el) => (el.onclick = () => {
      const a = el.dataset.act, ids = this.app.inter.selected;
      if (a === 'focus') this.app.inter.focus(ids);
      if (a === 'ex') this.app.toggleSingleExplode();
      if (a === 'hide') this.app.hideSelected();
      if (a === 'clear') this.app.select(null);
    }));
    body.querySelectorAll('input[data-edit]').forEach((el) => (el.onchange = () => {
      const v = Number(el.value); const lim = { kv: [1000, 4000], cap: [450, 3000] }[el.dataset.edit];
      if (!Number.isFinite(v) || v < lim[0] || v > lim[1]) { this.toast(`请输入 ${lim[0]}–${lim[1]} 之间的数值`); el.value = this.edits[el.dataset.edit]; return; }
      this.edits[el.dataset.edit] = v; this.saveEdits(); this.renderDetail(); this.toast('已更新（保存在本地浏览器）');
    }));
  }
  // ---------- 控制栏 ----------
  bindControls() {
    const a = this.app;
    const sel = $('stage-select');
    sel.innerHTML = `<option value="0">阶段 0 · 完整组装</option>` + STAGES.map((s) => `<option value="${s.n}">阶段 ${s.n} · ${s.name}</option>`).join('');
    sel.onchange = () => a.anim.toStage(+sel.value);
    $('btn-assemble').onclick = () => { a.anim.animateTo(0, 1.0); if (a.viewName === 'exploded') a.setView('default'); this.toast('正在组装…'); };
    $('btn-explode').onclick = () => { a.anim.animateTo(1, 1.0); if (a.viewName === 'default') a.setView('exploded'); this.toast('正在按阶段爆炸拆解…'); };
    $('btn-part-explode').onclick = () => a.toggleSingleExplode();
    $('btn-restore').onclick = () => { a.anim.restoreAll(); a.inter.showAll(); a.setMode('normal'); this.toast('已复位所有部件'); };
    $('btn-step-back').onclick = () => a.anim.stepBack();
    $('btn-step-fwd').onclick = () => a.anim.stepForward();
    $('btn-play').onclick = () => a.anim.togglePlay();
    const slider = $('explode-slider');
    slider.addEventListener('input', () => { a.anim.jumpTo(slider.value / 100); });
    $('btn-show-all').onclick = () => { a.inter.showAll(); this.toast('已显示全部部件'); };
    $('btn-hide-sel').onclick = () => a.hideSelected();
    const toggle = (id, fn) => { const b = $(id); b.onclick = () => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); fn(on); }; };
    toggle('btn-labels', (on) => a.labels.setEnabled(on));
    toggle('btn-links', (on) => { a.conns.setEnabled(on); a.conns.update(true); });
    toggle('btn-rotate', (on) => { a.view.controls.autoRotate = on; });
    toggle('btn-spin', (on) => { a.spin = on; });
    $('btn-reset').onclick = () => { a.setView('default'); };
    $('btn-help').onclick = () => this.showGuide();
    document.querySelectorAll('#view-presets .vp-btn').forEach((b) => (b.onclick = () => a.setView(b.dataset.view)));
    document.querySelectorAll('#eng-modes .em-btn').forEach((b) => (b.onclick = () => a.setMode(b.dataset.mode)));
    const ws = $('workspace');
    const collapse = (cls) => { ws.classList.toggle(cls); setTimeout(() => a.view.resize(), 260); };
    $('btn-collapse-left').onclick = () => collapse('left-collapsed'); $('tab-left').onclick = () => collapse('left-collapsed');
    $('btn-collapse-right').onclick = () => collapse('right-collapsed'); $('tab-right').onclick = () => collapse('right-collapsed');
    window.addEventListener('keydown', (e) => {
      if (e.target.matches('input, select, textarea')) return;
      if (e.key === 'Escape') a.select(null);
      else if (e.key === ' ') { e.preventDefault(); a.anim.togglePlay(); }
      else if (e.key === 'ArrowRight') a.anim.stepForward();
      else if (e.key === 'ArrowLeft') a.anim.stepBack();
      else if (e.key.toLowerCase() === 'f') a.inter.focus(a.inter.selected);
      else if (e.key.toLowerCase() === 'h') a.hideSelected();
    });
  }
  syncControls() {
    const a = this.app, g = a.explode.g, st = a.anim.state;
    const slider = $('explode-slider');
    if (document.activeElement !== slider) slider.value = (g * 100).toFixed(1);
    slider.style.setProperty('--p', (g * 100).toFixed(1) + '%');
    $('slider-val').textContent = (g * 100).toFixed(0) + '%';
    $('st-progress').textContent = (g * 100).toFixed(0) + '%'; $('st-progress-bar').style.width = (g * 100).toFixed(1) + '%';
    $('st-state').textContent = STATE_NAMES[st] || st;
    const playing = a.anim.isPlaying();
    $('btn-play').classList.toggle('on', playing); $('btn-play').title = playing ? '暂停' : '播放拆解 / 组装';
    $('ico-play').innerHTML = playing ? '<rect x="6" y="5" width="4" height="14" fill="currentColor"/><rect x="14" y="5" width="4" height="14" fill="currentColor"/>' : '<path d="M7 5l12 7-12 7z" fill="currentColor"/>';
    const stSel = $('stage-select'); if (document.activeElement !== stSel) stSel.value = String(a.anim.currentStage());
    const ids = a.inter.selected;
    $('btn-part-explode').disabled = !ids.some((i) => a.explode.hasExplode(i));
    $('btn-hide-sel').disabled = !ids.length;
    $('st-selected').textContent = ids.length ? (a.selKey?.startsWith('group:') ? GROUPS[a.selKey.slice(6)] : ids.length > 1 ? `${ids.length} 件` : PART_MAP[ids[0]].name) : '—';
  }
  // ---------- 引导 / 提示 ----------
  initGuide() {
    $('guide-close').onclick = $('guide-ok').onclick = () => { $('guide').hidden = true; try { localStorage.setItem('fpv-drone-lab:guided', '1'); } catch {} };
    let seen = false; try { seen = localStorage.getItem('fpv-drone-lab:guided') === '1'; } catch {}
    if (!seen && !/noguide/.test(location.search)) setTimeout(() => this.showGuide(), 700);
  }
  showGuide() { $('guide').hidden = false; }
  toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('show'), 2200); }
}
