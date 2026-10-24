// HTML 标签：3D → 屏幕投影、引线、优先级 + 简单避让
import * as THREE from 'three';
import { PARTS } from './data.js';

export class Labels {
  constructor(app) {
    this.app = app; this.layer = document.getElementById('label-layer'); this.svg = document.getElementById('leader-layer');
    this.enabled = true; this.items = [];
    for (const p of PARTS) {
      if (!p.label) continue;
      const el = document.createElement('div'); el.className = 'label';
      const param = p.parameters?.[0];
      el.innerHTML = `<div class="lb-top"><span class="lb-id">${p.code}</span><span class="lb-name">${p.name}</span></div>` + (param && p.label === 1 ? `<div class="lb-param">${param.k} · ${param.v}</div>` : '');
      this.layer.appendChild(el);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); dot.setAttribute('r', '2.2');
      this.svg.appendChild(line); this.svg.appendChild(dot);
      const g = app.drone.parts[p.id];
      const box = new THREE.Box3(); g.updateMatrixWorld(true);
      const inv = g.matrixWorld.clone().invert();
      g.traverse((o) => { if (o.isMesh && o.geometry && o.material?.name !== 'propBlur') { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld).applyMatrix4(inv); box.union(b); } });
      const c = box.getCenter(new THREE.Vector3()); c.y = box.max.y;
      this.items.push({ id: p.id, pr: p.label, el, line, dot, local: c, w: 0, h: 0 });
    }
    this._v = new THREE.Vector3();
  }
  setEnabled(v) { this.enabled = v; this.layer.style.display = this.svg.style.display = v ? '' : 'none'; }
  update() {
    if (!this.enabled) return;
    const { camera, renderer } = this.app.view; const rect = renderer.domElement.getBoundingClientRect();
    const W = rect.width, H = rect.height; const sel = new Set(this.app.inter.selected);
    const anySel = sel.size > 0; const placed = [];
    const list = this.items.map((it) => {
      const g = this.app.drone.parts[it.id];
      const vis = g.visible && !this.app.inter.ghostOf(it.id);
      const p = this._v.copy(it.local).applyMatrix4(g.matrixWorld);
      const dist = p.distanceTo(camera.position); p.project(camera);
      return { it, vis: vis && p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1, x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, dist, sel: sel.has(it.id) };
    });
    // 选中 > 主要 > 次要；同级按距离
    list.sort((a, b) => (b.sel - a.sel) || (a.it.pr - b.it.pr) || (a.dist - b.dist));
    for (const L of list) {
      const { it } = L;
      if (!L.vis || (anySel && !L.sel && it.pr === 2)) { this.hide(it); continue; }
      if (!it.w) { it.el.classList.remove('off'); it.w = it.el.offsetWidth; it.h = it.el.offsetHeight; }
      const w = it.w, h = it.h; let lx = L.x + 18, ly = L.y - 34 - h / 2, ok = false;
      const tries = [[18, -34], [18, -64], [-18 - w, -34], [18, 10], [-18 - w, -70], [-18 - w, 12], [24, -96], [-24 - w, -100]];
      for (const [dx, dy] of tries) {
        lx = L.x + dx; ly = L.y + dy - h / 2;
        const r = { x: lx - 3, y: ly - 3, w: w + 6, h: h + 6 };
        if (!placed.some((q) => r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y)) { ok = true; placed.push(r); break; }
      }
      if (!ok && !L.sel) { this.hide(it); continue; }
      it.el.classList.remove('off');
      it.el.classList.toggle('sel', L.sel); it.el.classList.toggle('dim', anySel && !L.sel);
      it.el.style.transform = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px)`;
      const ex = lx < L.x ? lx + w : lx, ey = ly + h / 2;
      it.line.setAttribute('x1', L.x.toFixed(1)); it.line.setAttribute('y1', L.y.toFixed(1));
      it.line.setAttribute('x2', ex.toFixed(1)); it.line.setAttribute('y2', ey.toFixed(1));
      it.dot.setAttribute('cx', L.x.toFixed(1)); it.dot.setAttribute('cy', L.y.toFixed(1));
      it.line.setAttribute('class', L.sel ? 'sel' : ''); it.dot.setAttribute('class', L.sel ? 'sel' : '');
      it.line.style.display = it.dot.style.display = '';
      it.line.style.opacity = it.dot.style.opacity = anySel && !L.sel ? 0.35 : 1;
    }
  }
  hide(it) { it.el.classList.add('off'); it.line.style.display = 'none'; it.dot.style.display = 'none'; }
}
