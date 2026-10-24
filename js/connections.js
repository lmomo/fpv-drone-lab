// 逻辑连接线：按类型着色，选中部件时高亮相关连接、其余变暗
import * as THREE from 'three';
import { LINKS } from './data.js';
import { COLORS } from './config.js';

export class Connections {
  constructor(app) {
    this.app = app; this.group = new THREE.Group(); this.group.name = 'ConnectionLines';
    app.view.scene.add(this.group); this.enabled = true;
    this.lines = LINKS.map((l) => {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 24), 3));
      const mat = new THREE.LineDashedMaterial({ color: COLORS[l.type] ?? 0xffffff, dashSize: 0.35, gapSize: 0.2, transparent: true, opacity: 0.8, depthTest: false });
      const line = new THREE.Line(geo, mat); line.renderOrder = 10; line.frustumCulled = false; this.group.add(line);
      return { ...l, line };
    });
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._box = new THREE.Box3();
  }
  center(id, out) { const g = this.app.drone.parts[id]; this._box.setFromObject(g, false); return this._box.isEmpty() ? out.setFromMatrixPosition(g.matrixWorld) : this._box.getCenter(out); }
  setEnabled(v) { this.enabled = v; this.group.visible = v; }
  update(force) {
    if (!this.enabled) return;
    const sel = new Set(this.app.inter.selected);
    for (const L of this.lines) {
      const visA = this.app.inter.isVisible(L.from), visB = this.app.inter.isVisible(L.to);
      L.line.visible = visA && visB; if (!L.line.visible) continue;
      if (force) {
        const a = this.center(L.from, this._a), b = this.center(L.to, this._b);
        const pos = L.line.geometry.attributes.position; const mid = a.clone().lerp(b, 0.5); mid.y += 0.6 + a.distanceTo(b) * 0.12;
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        for (let i = 0; i < 24; i++) { const p = curve.getPoint(i / 23); pos.setXYZ(i, p.x, p.y, p.z); }
        pos.needsUpdate = true; L.line.geometry.computeBoundingSphere(); L.line.computeLineDistances();
      }
      const on = sel.size === 0 || sel.has(L.from) || sel.has(L.to);
      L.line.material.opacity = sel.size === 0 ? 0.55 : on ? 1 : 0.08;
      L.line.material.linewidth = 1;
    }
  }
  linksOf(id) { return this.lines.filter((l) => l.from === id || l.to === id); }
}
