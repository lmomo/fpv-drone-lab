import * as THREE from 'three';
export const D2R = Math.PI / 180;

export function mesh(geo, mat, pos, rot, opts = {}) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(rot[0] * D2R, rot[1] * D2R, rot[2] * D2R);
  m.castShadow = opts.cast !== false; m.receiveShadow = opts.receive !== false;
  if (opts.name) m.name = opts.name;
  return m;
}
export function instanced(geo, mat, matrices, opts = {}) {
  const im = new THREE.InstancedMesh(geo, mat, matrices.length);
  matrices.forEach((mx, i) => im.setMatrixAt(i, mx));
  im.instanceMatrix.needsUpdate = true; im.castShadow = opts.cast !== false; im.receiveShadow = true;
  im.computeBoundingSphere(); im.computeBoundingBox && im.computeBoundingBox();
  return im;
}
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(1, 1, 1);
export function mtx(pos, rotDeg = [0, 0, 0], scale) {
  _e.set(rotDeg[0] * D2R, rotDeg[1] * D2R, rotDeg[2] * D2R); _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(new THREE.Vector3(...pos), _q, scale ? new THREE.Vector3(...scale) : _s);
}
export function roundedRectShape(w, h, r, cx = 0, cy = 0) {
  const s = new THREE.Shape(); roundedRectPath(s, w, h, r, cx, cy); return s;
}
export function roundedRectPath(p, w, h, r, cx = 0, cy = 0) {
  const x = cx - w / 2, y = cy - h / 2;
  p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y); return p;
}
export function holePath(cx, cy, r) { const p = new THREE.Path(); p.absarc(cx, cy, r, 0, Math.PI * 2, true); return p; }
export function slotPath(cx, cy, len, w, angle = 0) {
  // 圆头长槽（沿 angle 方向）
  const p = new THREE.Path(), r = w / 2, c = Math.cos(angle), s = Math.sin(angle), hl = len / 2 - r;
  const ax = cx - c * hl, ay = cy - s * hl, bx = cx + c * hl, by = cy + s * hl;
  p.absarc(bx, by, r, angle - Math.PI / 2, angle + Math.PI / 2, false);
  p.absarc(ax, ay, r, angle + Math.PI / 2, angle + Math.PI * 1.5, false);
  p.closePath(); return p;
}
export function rectHole(cx, cy, w, h, r = 0.05) { const p = new THREE.Path(); roundedRectPath(p, w, h, r, cx, cy); return p; }

// 水平板材：Shape 的 (x, y) → 世界 (x, -z)，厚度沿 +Y，范围 [0, t]
export function plateGeo(shape, t, bevel = 0.04, segs = 2) {
  const b = Math.min(bevel, t * 0.3);
  const g = new THREE.ExtrudeGeometry(shape, { depth: t - 2 * b, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: segs, curveSegments: 20 });
  g.rotateX(-Math.PI / 2); g.translate(0, b, 0); g.computeVertexNormals();
  return g;
}
export function normalizeUV(g) {
  const uv = g.attributes.uv; let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;
  for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, v); maxV = Math.max(maxV, v); }
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - minU) / (maxU - minU || 1), (uv.getY(i) - minV) / (maxV - minV || 1));
  uv.needsUpdate = true; return g;
}
// 沿 Z 轴的圆柱（镜头、电容等）
export function cylZ(rt, rb, h, seg = 32, open = false) { const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open); g.rotateX(Math.PI / 2); return g; }
export function cylX(r, h, seg = 24) { const g = new THREE.CylinderGeometry(r, r, h, seg); g.rotateZ(Math.PI / 2); return g; }
export function anchor(group, name, pos, dir) {
  const a = new THREE.Object3D(); a.name = 'anchor:' + name; a.position.set(...pos);
  a.userData.dir = new THREE.Vector3(...dir).normalize(); a.userData.isAnchor = true;
  group.add(a); group.userData.anchors = group.userData.anchors || {}; group.userData.anchors[name] = a; return a;
}
