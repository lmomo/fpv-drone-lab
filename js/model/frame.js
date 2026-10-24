// 机架总成：底板、顶板、四机臂、立柱、摄像头侧板、后置天线座
import * as THREE from 'three';
import { mesh, mtx, instanced, roundedRectShape, holePath, slotPath, rectHole, plateGeo, D2R } from './util.js';
import { LAYOUT } from '../config.js';

export function buildFrame(ctx) {
  const { mats, part } = ctx;
  const H = LAYOUT.stackHalf;
  const stand = [[2.2, 3.6], [-2.2, 3.6], [2.2, -3.6], [-2.2, -3.6]];

  // ---- 底板 ----
  {
    const s = roundedRectShape(5.0, 9.0, 0.7);
    for (const [x, z] of stand) s.holes.push(holePath(x, -z, 0.17));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.holes.push(holePath(sx * H, -sz * H, 0.17));
    s.holes.push(slotPath(0, 3.3, 1.6, 0.55, 0));     // 前部减重槽（shape y = -z）
    s.holes.push(slotPath(0, -3.55, 1.5, 0.5, 0));
    s.holes.push(slotPath(-1.55, 0, 1.2, 0.36, Math.PI / 2)); s.holes.push(slotPath(1.55, 0, 1.2, 0.36, Math.PI / 2));
    const g = part('frame-bottom');
    g.add(mesh(plateGeo(s, 0.25, 0.035), mats.carbon));
  }
  // ---- 机臂 ----
  const armGeo = (() => {
    const s = new THREE.Shape();
    const x0 = 1.45, a = 2.687;
    s.moveTo(x0, -0.9); s.lineTo(4.5, -0.82); s.lineTo(9.7, -0.68);
    s.absarc(11, 0, 1.55, -a, a, false);
    s.lineTo(4.5, 0.82); s.lineTo(x0, 0.9);
    s.absarc(x0, 0, 0.9, Math.PI / 2, Math.PI * 1.5, false);
    // 电机孔位（16×16，相对机臂旋转 45° 后与电机局部坐标轴对齐）
    for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2 + Math.PI / 4; s.holes.push(holePath(11 + Math.cos(t) * 1.131, Math.sin(t) * 1.131, 0.16)); }
    s.holes.push(holePath(11, 0, 0.42));
    s.holes.push(slotPath(6.6, 0, 3.6, 0.5, 0));
    s.holes.push(holePath(Math.hypot(H, H), 0, 0.17)); // 飞塔螺丝孔
    s.holes.push(holePath(3.4, 0, 0.17));
    return plateGeo(s, 0.5, 0.06, 3);
  })();
  const ledGeo = new THREE.BoxGeometry(0.35, 0.08, 0.22);
  const ledHousing = new THREE.BoxGeometry(0.55, 0.06, 0.4);
  for (const k of ['fl', 'fr', 'rl', 'rr']) {
    const g = part(`arm-${k}`);
    g.add(mesh(armGeo, mats.carbon));
    g.add(mesh(ledHousing, mats.plastic, [8.6, -0.03, 0]));
    const led = mesh(ledGeo, mats.ledOn.clone(), [8.6, -0.07, 0], null, { cast: false });
    led.userData.statusLed = true; led.material.name = 'ledStatus'; g.add(led);
    ctx.statusLeds.push(led);
  }
  // ---- 顶板 ----
  {
    const s = roundedRectShape(5.0, 9.2, 0.7);
    for (const [x, z] of stand) s.holes.push(holePath(x, -z, 0.17));
    s.holes.push(rectHole(-1.85, 0, 0.25, 2.0, 0.1)); s.holes.push(rectHole(1.85, 0, 0.25, 2.0, 0.1));
    s.holes.push(slotPath(0, 4.05, 1.4, 0.42, 0)); s.holes.push(slotPath(0, -4.05, 1.4, 0.42, 0));
    const g = part('frame-top');
    g.add(mesh(plateGeo(s, 0.2, 0.03), mats.carbon));
  }
  // ---- 立柱（六角铝柱，实例化）----
  {
    const g = part('standoffs');
    const geo = new THREE.CylinderGeometry(0.26, 0.26, 3.0, 6); geo.translate(0, 1.5, 0);
    g.add(instanced(geo, mats.alu, stand.map(([x, z]) => mtx([x, 0, z], [0, 30, 0]))));
    const ring = new THREE.CylinderGeometry(0.29, 0.29, 0.12, 24);
    g.add(instanced(ring, mats.aluAccent, stand.flatMap(([x, z]) => [mtx([x, 0.15, z]), mtx([x, 2.85, z])])));
  }
  // ---- 摄像头侧板 ----
  {
    const g = part('cam-bracket');
    const s = new THREE.Shape();
    s.moveTo(-1.05, 0.3); s.lineTo(0.85, 0.3); s.lineTo(0.85, 3.2); s.lineTo(-0.35, 3.2);
    s.quadraticCurveTo(-1.05, 3.2, -1.05, 2.5); s.lineTo(-1.05, 0.3);
    s.holes.push(holePath(0, 2.0, 0.13));
    // 弧形调角槽：以枢轴为圆心
    const arc = new THREE.Path(), R = 0.72, w = 0.11, a1 = -2.3, a2 = -1.1;
    arc.absarc(0, 2.0, R + w, a1, a2, false);
    arc.absarc(Math.cos(a2) * R, 2.0 + Math.sin(a2) * R, w, a2, a2 + Math.PI, false);
    arc.absarc(0, 2.0, R - w, a2, a1, true);
    arc.absarc(Math.cos(a1) * R, 2.0 + Math.sin(a1) * R, w, a1 + Math.PI, a1 + Math.PI * 2, false);
    s.holes.push(arc);
    s.holes.push(holePath(0.35, 0.9, 0.22));
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.11, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 18 });
    geo.rotateY(-Math.PI / 2);
    const gl = geo.clone(); geo.translate(1.2, 0, 0); gl.translate(-1.05, 0, 0);
    g.add(mesh(geo, mats.carbon)); g.add(mesh(gl, mats.carbon));
    // 调角螺丝（枢轴 + 弧槽内锁紧螺丝）
    const head = new THREE.CylinderGeometry(0.17, 0.17, 0.1, 24); head.rotateZ(Math.PI / 2);
    const am = -1.7 + 20 * D2R * 0; // 锁紧位置
    const lockZ = Math.cos(am) * 0.72, lockY = 2.0 + Math.sin(am) * 0.72;
    const m = [];
    for (const sx of [-1, 1]) { m.push(mtx([sx * 1.27, 2.0, 0])); m.push(mtx([sx * 1.27, lockY, lockZ])); }
    g.add(instanced(head, mats.aluAccent, m));
    const hex = new THREE.CylinderGeometry(0.07, 0.07, 0.02, 6); hex.rotateZ(Math.PI / 2);
    g.add(instanced(hex, mats.chip, m.map((mm) => { const p = new THREE.Vector3().setFromMatrixPosition(mm); p.x += Math.sign(p.x) * 0.05; return mtx(p.toArray()); }), { cast: false }));
  }
  // ---- 后置天线座（TPU）----
  {
    const g = part('ant-mount');
    const s = new THREE.Shape();
    s.moveTo(-1.35, 0); s.lineTo(1.35, 0); s.lineTo(1.35, 2.45); s.lineTo(1.0, 2.95); s.lineTo(-1.0, 2.95); s.lineTo(-1.35, 2.45); s.lineTo(-1.35, 0);
    s.holes.push(rectHole(0, 1.15, 1.2, 1.0, 0.25));
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
    geo.translate(0, 0, 0.05);
    g.add(mesh(geo, mats.tpu));
    const sock = new THREE.CylinderGeometry(0.3, 0.32, 0.9, 24, 1);
    const ring = new THREE.CylinderGeometry(0.23, 0.23, 0.92, 24, 1, true);
    for (const sx of [-1, 1]) {
      const dir = new THREE.Vector3(sx * 0.42, 0.62, 0.66).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      const s1 = mesh(sock, mats.tpu, [sx * 0.85, 2.0, 0.55]); s1.quaternion.copy(q); g.add(s1);
      const s2 = mesh(ring, mats.plastic, [sx * 0.85, 2.0, 0.55]); s2.quaternion.copy(q); g.add(s2);
    }
  }
}
