// 拾取（Raycaster）、选中高亮（不破坏原材质）、工程视图模式、双击聚焦与视角预设
import * as THREE from 'three';
import { PARTS, PART_MAP, GROUPS } from './data.js';
import { ease } from './animation.js';

const MODE_RULES = {
  normal: { ghost: [], hide: [] },
  ghostFrame: { ghost: ['frame'], hide: [] },
  interior: { ghost: ['frame', 'power', 'propulsion'], hide: ['battery-strap', 'battery-pad'] },
  electronics: { ghost: ['frame', 'propulsion', 'power', 'wiring'], solid: ['fc', 'esc', 'power-cap', 'vtx', 'receiver', 'camera', 'cam-lens', 'xt60', 'buzzer', 'led', 'harness-signal', 'harness-power'], hide: [] },
  propulsion: { ghost: ['frame', 'fcesc', 'power', 'camvtx', 'antrx', 'wiring'], solid: ['harness-motor', 'motor-screws'], hide: [] },
  wiring: { ghost: ['frame', 'propulsion', 'fcesc', 'power', 'camvtx', 'antrx'], solid: ['harness-motor', 'harness-signal', 'harness-power', 'harness-rf', 'xt60'], hide: ['fasteners-top', 'fasteners-bottom', 'motor-screws'] },
};
export const MODE_NAMES = { normal: '标准', ghostFrame: '透明机架', interior: '内部结构', electronics: '电子系统', propulsion: '动力系统', wiring: '线路连接' };

export class Interaction {
  constructor(app) {
    this.app = app; const { camera, renderer } = app.view;
    this.camera = camera; this.dom = renderer.domElement;
    this.ray = new THREE.Raycaster(); this.ndc = new THREE.Vector2();
    this.selected = []; this.selectedKey = null; this.hover = null;
    this.userVisible = Object.fromEntries(PARTS.map((p) => [p.id, p.visible !== false]));
    this.mode = 'normal';
    this.hiCache = new Map(); this.ghostCache = new Map(); this.hoverCache = new Map();
    this.pickables = [];
    for (const g of Object.values(app.drone.parts)) g.traverse((o) => { if (o.isMesh && o.userData.partId) this.pickables.push(o); });
    this._bind();
  }
  _bind() {
    let down = null;
    this.dom.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    this.dom.addEventListener('pointerup', (e) => {
      if (!down) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
      if (moved > 5 || e.button !== 0) return;
      const id = this.pick(e);
      if (id) this.app.select(id, { from: '3d', additive: e.shiftKey }); else this.app.select(null, { from: '3d' });
    });
    this.dom.addEventListener('dblclick', (e) => { const id = this.pick(e); if (id) { this.app.select(id, { from: '3d' }); this.focus(this.selected); } });
    let raf = 0;
    this.dom.addEventListener('pointermove', (e) => {
      if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const id = this.pick(e); this.setHover(id); });
    });
    this.dom.addEventListener('pointerleave', () => this.setHover(null));
  }
  pick(e) {
    const r = this.dom.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    const vis = this.pickables.filter((m) => this.isVisible(m.userData.partId) && m.visible && !m.userData.ghosted);
    const hits = this.ray.intersectObjects(vis, false);
    return hits.length ? hits[0].object.userData.partId : null;
  }
  isVisible(id) { return this.userVisible[id] && !(MODE_RULES[this.mode].hide || []).includes(id); }
  setVisible(id, v) { this.userVisible[id] = v; this.refresh(); }
  showAll() { for (const k in this.userVisible) this.userVisible[k] = true; this.refresh(); }
  setMode(m) { this.mode = m; this.refresh(); }
  setSelected(ids) { this.selected = ids; this.refresh(); }
  setHover(id) { if (this.hover === id) return; this.hover = id; this.dom.style.cursor = id ? 'pointer' : 'grab'; this.refresh(); }
  ghostOf(id) {
    const r = MODE_RULES[this.mode]; const cat = PART_MAP[id].category;
    if ((r.solid || []).includes(id)) return false;
    return r.ghost.includes(cat);
  }
  _clone(cache, mat, fn) { let c = cache.get(mat); if (!c) { c = mat.clone(); fn(c); cache.set(mat, c); } return c; }
  hiMat(m) { return this._clone(this.hiCache, m, (c) => { if (c.emissive) { c.emissive = new THREE.Color(0x19c6e6); c.emissiveIntensity = 0.55; } else if (c.color) c.color = new THREE.Color(0x7ff0ff); }); }
  hoverMat(m) { return this._clone(this.hoverCache, m, (c) => { if (c.emissive) { c.emissive = new THREE.Color(0x0e6f86); c.emissiveIntensity = 0.35; } }); }
  ghostMat(m) { return this._clone(this.ghostCache, m, (c) => { c.transparent = true; c.opacity = Math.min(c.opacity ?? 1, 0.12); c.depthWrite = false; if ('transmission' in c) c.transmission = 0; }); }
  // 统一刷新所有 mesh 的显示状态与材质（原材质 / 透明 / 高亮）
  refresh() {
    const sel = new Set(this.selected);
    for (const [id, g] of Object.entries(this.app.drone.parts)) {
      const vis = this.isVisible(id); g.visible = vis;
      const ghost = this.ghostOf(id) && !sel.has(id);
      g.traverse((o) => {
        if (!o.isMesh || !o.userData.origMat || o.material?.name === 'propBlur') return;
        const orig = o.userData.origMat; const map = (fn) => (Array.isArray(orig) ? orig.map(fn) : fn(orig));
        o.userData.ghosted = ghost;
        if (sel.has(id)) o.material = map((m) => this.hiMat(m));
        else if (ghost) o.material = map((m) => this.ghostMat(m));
        else if (this.hover === id) o.material = map((m) => this.hoverMat(m));
        else o.material = orig;
        o.castShadow = !ghost;
      });
    }
    this.app.onVisibilityChanged && this.app.onVisibilityChanged();
  }
  boxOf(ids) {
    const box = new THREE.Box3();
    for (const id of ids) { const g = this.app.drone.parts[id]; if (g && g.visible) box.expandByObject(g); }
    return box;
  }
  focus(ids) {
    const box = this.boxOf(ids.length ? ids : Object.keys(this.app.drone.parts)); if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3()), r = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 1.2);
    const dir = this.camera.position.clone().sub(this.app.view.controls.target).normalize();
    const dist = r / Math.sin((this.camera.fov * Math.PI / 180) / 2) * 1.05;
    this.flyTo(c.clone().addScaledVector(dir, Math.max(dist, 5)), c);
  }
  flyTo(pos, target, dur = 1100) {
    const c = this.camera, ctl = this.app.view.controls;
    const p0 = c.position.clone(), t0 = ctl.target.clone();
    this.app.anim.tw.to('camera', { from: 0, to: 1, duration: dur, easing: ease.inOutCubic,
      onUpdate: (k) => { c.position.lerpVectors(p0, pos, k); ctl.target.lerpVectors(t0, target, k); } });
  }
}

export const VIEWS = {
  default: { name: '默认视角', pos: [22, 16, 26], target: [0, 4.2, 0] },
  front: { name: '正视', pos: [0, 8, -34], target: [0, 5, 0] },
  side: { name: '侧视', pos: [34, 8, 0], target: [0, 5, 0] },
  top: { name: '俯视', pos: [0, 40, 0.01], target: [0, 4.2, 0] },
  bottom: { name: '仰视', pos: [0, -26, 0.01], target: [0, 4.2, 0] },
  rear: { name: '后视', pos: [0, 10, 34], target: [0, 5, 0] },
  exploded: { name: '爆炸全景', pos: [30, 26, 38], target: [0, 6.5, 0] },
  interior: { name: '内部视角', pos: [10, 13, -12], target: [0, 5.8, 0] },
};
