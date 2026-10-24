// 动态线缆：端点挂在部件锚点上，拆解时实时重建 TubeGeometry；拉伸过大时显示“已断开”线头
import * as THREE from 'three';
import { LAYOUT } from '../config.js';

const V = (a) => new THREE.Vector3(...a);

export class CableSystem {
  constructor(ctx) {
    this.ctx = ctx; this.root = ctx.root; this.cables = [];
    this._tmpA = new THREE.Vector3(); this._tmpB = new THREE.Vector3();
  }
  add(def) {
    // def: { part, from:[partId, anchor], to:[partId, anchor], vias:[[x,y,z]], r, mat, lead, offset:[x,y,z] }
    const c = { ...def, lead: def.lead ?? 0.35, r: def.r ?? 0.06, offset: def.offset ? V(def.offset) : new THREE.Vector3() };
    c.a = this.ctx.parts[c.from[0]].userData.anchors[c.from[1]];
    c.b = this.ctx.parts[c.to[0]].userData.anchors[c.to[1]];
    if (!c.a || !c.b) throw new Error('线缆锚点缺失: ' + c.from + ' → ' + c.to);
    c.vias = (c.vias || []).map(V);
    c.mesh = new THREE.Mesh(new THREE.BufferGeometry(), c.mat);
    c.mesh.castShadow = true; c.mesh.receiveShadow = true;
    this.ctx.parts[c.part].add(c.mesh);
    this.cables.push(c);
    return c;
  }
  _end(anchor, out, dirOut) {
    anchor.updateWorldMatrix(true, false);
    out.setFromMatrixPosition(anchor.matrixWorld); this.root.worldToLocal(out);
    const q = new THREE.Quaternion(); anchor.getWorldQuaternion(q);
    const rq = new THREE.Quaternion(); this.root.getWorldQuaternion(rq);
    dirOut.copy(anchor.userData.dir).applyQuaternion(q).applyQuaternion(rq.invert());
  }
  init() {
    this.root.updateMatrixWorld(true);
    for (const c of this.cables) {
      c.p0 = new THREE.Vector3(); c.d0 = new THREE.Vector3(); c.p1 = new THREE.Vector3(); c.d1 = new THREE.Vector3();
      this._end(c.a, c.p0, c.d0); this._end(c.b, c.p1, c.d1);
      const poly = [c.p0, ...c.vias, c.p1]; let L = 0; c.t = [0];
      for (let i = 1; i < poly.length; i++) { L += poly[i].distanceTo(poly[i - 1]); c.t.push(L); }
      c.t = c.t.map((v) => v / L); c.len0 = c.p0.distanceTo(c.p1) + 1e-3; c.span0 = L;
      c.lastKey = '';
    }
    this.update(true);
  }
  update(force = false) {
    const pa = new THREE.Vector3(), da = new THREE.Vector3(), pb = new THREE.Vector3(), db = new THREE.Vector3();
    for (const c of this.cables) {
      this._end(c.a, pa, da); this._end(c.b, pb, db);
      const key = pa.toArray().concat(pb.toArray(), da.toArray()).map((v) => v.toFixed(3)).join(',');
      if (!force && key === c.lastKey) continue;
      c.lastKey = key;
      const dispA = pa.clone().sub(c.p0), dispB = pb.clone().sub(c.p1);
      const stretch = pa.distanceTo(pb) / c.len0;
      const broken = stretch > 1.35 && pa.distanceTo(pb) - c.len0 > 1.2;
      let geo;
      const off = c.offset;
      if (!broken) {
        const pts = [pa.clone().add(off), pa.clone().addScaledVector(da, c.lead).add(off)];
        c.vias.forEach((v, i) => { const t = c.t[i + 1]; pts.push(v.clone().add(dispA.clone().lerp(dispB, t)).add(off)); });
        pts.push(pb.clone().addScaledVector(db, c.lead).add(off), pb.clone().add(off));
        const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
        geo = new THREE.TubeGeometry(curve, Math.max(24, pts.length * 14), c.r, 8, false);
      } else {
        // 断开：两端各保留一段带弯曲的线头
        const stub = (p, d) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p.clone().add(off), p.clone().addScaledVector(d, c.lead + 0.3).add(off), p.clone().addScaledVector(d, c.lead + 0.6).add(new THREE.Vector3(0, -0.35, 0)).add(off)]), 10, c.r, 8, false);
        const g1 = stub(pa, da), g2 = stub(pb, db);
        geo = mergeTwo(g1, g2); g1.dispose(); g2.dispose();
      }
      c.mesh.geometry.dispose(); c.mesh.geometry = geo; c.broken = broken;
    }
  }
  dispose() { for (const c of this.cables) c.mesh.geometry.dispose(); }
}

function mergeTwo(a, b) {
  const g = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const A = a.attributes[name], B = b.attributes[name];
    const arr = new Float32Array(A.array.length + B.array.length); arr.set(A.array); arr.set(B.array, A.array.length);
    g.setAttribute(name, new THREE.BufferAttribute(arr, A.itemSize));
  }
  const ia = a.index.array, ib = b.index.array, off = a.attributes.position.count;
  const idx = new Uint32Array(ia.length + ib.length); idx.set(ia); for (let i = 0; i < ib.length; i++) idx[ia.length + i] = ib[i] + off;
  g.setIndex(new THREE.BufferAttribute(idx, 1)); return g;
}

export function buildCables(ctx) {
  const { mats } = ctx;
  const cs = new CableSystem(ctx);
  const wm = [mats.wireBlack, mats.wireGrey, mats.wireRed];
  // 电机相线 4 × 3
  for (const k of ['fl', 'fr', 'rl', 'rr']) {
    const [mx, mz] = LAYOUT.motors[k], L = Math.hypot(mx, mz), dx = mx / L, dz = mz / L;
    const px = -dz, pz = dx;
    for (let i = 0; i < 3; i++) {
      const o = (i - 1) * 0.15;
      cs.add({ part: 'harness-motor', from: [`motor-${k}`, 'wire'], to: ['esc', `m-${k}`], r: 0.065, mat: wm[i], lead: 0.4,
        offset: [px * o, 0, pz * o],
        vias: [[dx * 8.6, 0.86, dz * 8.6], [dx * 5.5, 0.86, dz * 5.5], [dx * 3.3, 1.05, dz * 3.3]] });
    }
  }
  // 信号线
  for (let i = 0; i < 3; i++) cs.add({ part: 'harness-signal', from: ['fc', 'esc'], to: ['esc', 'fc'], r: 0.035, mat: i === 1 ? mats.wireRed : mats.wireGrey, lead: 0.1, offset: [(i - 1) * 0.09, 0, 0], vias: [[-1.55, 1.63, 1.2]] });
  cs.add({ part: 'harness-signal', from: ['camera', 'cable'], to: ['vtx', 'cam'], r: 0.07, mat: mats.coax, lead: 0.3, vias: [[0.2, 2.7, -2.0], [0.3, 2.75, 1.0]] });
  for (let i = 0; i < 2; i++) cs.add({ part: 'harness-signal', from: ['vtx', 'fc'], to: ['fc', 'vtx'], r: 0.035, mat: i ? mats.wireRed : mats.wireGrey, lead: 0.25, offset: [i * 0.09, 0, 0], vias: [] });
  for (let i = 0; i < 2; i++) cs.add({ part: 'harness-signal', from: ['receiver', 'fc'], to: ['fc', 'rx'], r: 0.03, mat: i ? mats.wireRed : mats.wireGrey, lead: 0.2, offset: [i * 0.08, 0, 0], vias: [[-0.3, 0.95, 2.3], [-0.45, 1.6, 2.05]] });
  // 电源引线
  for (const [s, m] of [['+', mats.wireRed], ['-', mats.wireBlack]]) {
    const sx = s === '+' ? 1 : -1;
    cs.add({ part: 'harness-power', from: ['esc', 'pwr' + s], to: ['xt60', 'pwr' + s], r: 0.13, mat: m, lead: 0.3,
      vias: [[sx * 1.55, 1.4, 2.6], [sx * 1.75, 2.5, 3.9], [sx * 1.6, 3.62, 4.75]] });
  }
  // 射频馈线
  cs.add({ part: 'harness-rf', from: ['vtx', 'rf-r'], to: ['vtx-antenna', 'r'], r: 0.045, mat: mats.coax, lead: 0.25, vias: [] });
  cs.add({ part: 'harness-rf', from: ['vtx', 'rf-l'], to: ['vtx-antenna', 'l'], r: 0.045, mat: mats.coax, lead: 0.25, vias: [] });
  cs.add({ part: 'harness-rf', from: ['receiver', 'ant-l'], to: ['rx-antenna', 'l'], r: 0.045, mat: mats.coax, lead: 0.25, vias: [] });
  cs.add({ part: 'harness-rf', from: ['receiver', 'ant-r'], to: ['rx-antenna', 'r'], r: 0.045, mat: mats.coax, lead: 0.25, vias: [] });
  return cs;
}
