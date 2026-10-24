// 动力系统：4 × 2207 外转子无刷电机 + 4 × 5 寸三叶桨（CW / CCW 两种旋向）
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mesh, mtx, instanced, anchor, D2R } from './util.js';
import { LAYOUT, SPEC, MM } from '../config.js';
import { radialTexture } from './textures.js';

function motorGeos() {
  const lathe = (pts, seg = 48) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  const base = lathe([[0, 0], [1.25, 0], [1.3, 0.04], [1.3, 0.12], [1.0, 0.16], [0.95, 0.3], [0.5, 0.32], [0, 0.32]]);
  const stator = new THREE.CylinderGeometry(1.08, 1.08, 0.7, 12); stator.translate(0, 0.68, 0);
  const magnet = new THREE.CylinderGeometry(1.24, 1.24, 0.8, 36, 1, true); magnet.translate(0, 0.75, 0);
  const lowBand = lathe([[1.28, 0.34], [1.38, 0.36], [1.38, 0.62], [1.28, 0.62], [1.28, 0.34]]);
  const accent = lathe([[1.385, 0.4], [1.395, 0.4], [1.395, 0.5], [1.385, 0.5]]);
  const upBand = lathe([[1.28, 1.12], [1.38, 1.12], [1.38, 1.42], [1.3, 1.52], [1.28, 1.52]]);
  // 镂空散热柱（实例化）
  const pillar = new THREE.CylinderGeometry(1.38, 1.38, 0.52, 3, 1, true, 0, 0.26); pillar.translate(0, 0.87, 0);
  // 顶盖：五辐条 + 散热孔
  const capShape = new THREE.Shape(); capShape.absarc(0, 0, 1.36, 0, Math.PI * 2, false);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5, p = new THREE.Path();
    p.absarc(0, 0, 1.08, a + 0.22, a + 1.03, false); p.absarc(0, 0, 0.6, a + 1.03, a + 0.22, true); p.closePath();
    capShape.holes.push(p);
  }
  capShape.holes.push((() => { const p = new THREE.Path(); p.absarc(0, 0, 0.26, 0, Math.PI * 2, true); return p; })());
  const cap = new THREE.ExtrudeGeometry(capShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 36 });
  cap.rotateX(-Math.PI / 2); cap.translate(0, 1.5, 0);
  const shaft = new THREE.CylinderGeometry(0.25, 0.25, 1.95, 24); shaft.translate(0, 1.2, 0);
  const thread = new THREE.CylinderGeometry(0.255, 0.255, 0.02, 24);
  const hub = new THREE.CylinderGeometry(0.42, 0.45, 0.12, 32); hub.translate(0, 1.64, 0);
  const screw = new THREE.CylinderGeometry(0.16, 0.16, 0.12, 20); // 螺丝头
  const wireStub = new THREE.CylinderGeometry(0.07, 0.07, 0.4, 10); wireStub.rotateZ(Math.PI / 2);
  return { base, stator, magnet, lowBand, accent, upBand, pillar, cap, shaft, thread, hub, screw, wireStub };
}

function bladeGeo(sign) {
  // sign = +1: CCW（俯视逆时针）；-1: CW
  const R = SPEC.propInch * 25.4 * MM / 2, r0 = 0.5, N = 18;
  const chord = (r) => { const t = (r - r0) / (R - r0); return 0.95 + 0.55 * Math.sin(Math.min(1, t * 1.6) * Math.PI / 2) - 0.95 * Math.pow(t, 2.6); };
  const le = [], te = [];
  for (let i = 0; i <= N; i++) { const r = r0 + (R - 0.25 - r0) * i / N, c = chord(r); le.push([r, sign * c * 0.38]); te.push([r, -sign * c * 0.62]); }
  const s = new THREE.Shape(); s.moveTo(...te[0]);
  for (const p of te) s.lineTo(...p);
  const tipA = te[N], tipB = le[N];
  s.quadraticCurveTo(R + 0.05, (tipA[1] + tipB[1]) / 2, ...tipB);
  for (let i = N; i >= 0; i--) s.lineTo(...le[i]);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 8 });
  g.translate(0, 0, -0.015);
  g.rotateX(-Math.PI / 2); // 弦向 → -Z，厚度 → Y
  const P = SPEC.propPitchInch * 25.4 * MM;
  const pos = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = Math.max(r0, v.x), a = Math.min(36 * D2R, Math.atan(P / (2 * Math.PI * r))) * sign;
    const y = v.y * Math.cos(a) - v.z * Math.sin(a), z = v.y * Math.sin(a) + v.z * Math.cos(a);
    // 轻微上反角
    pos.setXYZ(i, v.x, y + (r - r0) * 0.025, z);
  }
  g.computeVertexNormals();
  const blades = [0, 1, 2].map((k) => g.clone().rotateY(k * Math.PI * 2 / 3));
  return mergeGeometries(blades);
}

export function buildPropulsion(ctx) {
  const { mats, part } = ctx;
  const G = motorGeos();
  const bellDouble = mats.bell.clone(); bellDouble.side = THREE.DoubleSide; bellDouble.name = 'bellDouble';
  const pillarM = []; for (let i = 0; i < 12; i++) pillarM.push(mtx([0, 0, 0], [0, i * 30 + 8, 0]));
  const blades = { CCW: bladeGeo(1), CW: bladeGeo(-1) };
  const hubGeo = new THREE.CylinderGeometry(0.58, 0.62, 0.58, 40); 
  const hubRim = new THREE.TorusGeometry(0.6, 0.03, 8, 40); hubRim.rotateX(Math.PI / 2);
  const nutGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.26, 6); nutGeo.translate(0, 0.42, 0);
  const domeGeo = new THREE.SphereGeometry(0.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); domeGeo.translate(0, 0.55, 0);
  const arcGeo = new THREE.TorusGeometry(0.42, 0.035, 6, 30, Math.PI * 1.3); arcGeo.rotateX(-Math.PI / 2); arcGeo.translate(0, 0.3, 0);
  const headGeo = new THREE.ConeGeometry(0.08, 0.2, 10); headGeo.rotateZ(-Math.PI / 2);
  const blurTex = radialTexture('rgba(170,190,210,.55)', 'rgba(170,190,210,0)');
  const blurGeo = new THREE.CircleGeometry(SPEC.propInch * 25.4 * MM / 2, 64); blurGeo.rotateX(-Math.PI / 2);
  const allScrews = [];

  for (const k of ['fl', 'fr', 'rl', 'rr']) {
    // ---- 电机 ----
    const g = part(`motor-${k}`);
    g.add(mesh(G.base, mats.alu));
    g.add(mesh(G.stator, mats.copper));
    const rotor = new THREE.Group(); rotor.name = 'rotor'; g.add(rotor);
    rotor.add(mesh(G.magnet, mats.magnet, null, null, { cast: false }));
    rotor.add(mesh(G.lowBand, mats.bell)); rotor.add(mesh(G.accent, mats.aluAccent, null, null, { cast: false }));
    rotor.add(mesh(G.upBand, mats.bell)); rotor.add(mesh(G.cap, mats.bell));
    rotor.add(instanced(G.pillar, bellDouble, pillarM));
    rotor.add(mesh(G.shaft, mats.titanium)); rotor.add(mesh(G.hub, mats.aluBright));
    rotor.add(instanced(G.thread, mats.steel, [0, 1, 2, 3, 4, 5].map((i) => mtx([0, 1.85 + i * 0.05, 0])), { cast: false }));
    ctx.spinners.push({ obj: rotor, dir: LAYOUT.propDir[k] === 'CW' ? -1 : 1 });
    // 电机线出线位置：指向机身中心
    const [mx, mz] = LAYOUT.motors[k]; const l = Math.hypot(mx, mz), ix = -mx / l, iz = -mz / l;
    const yaw = Math.atan2(-iz, ix);
    const stub = mesh(G.wireStub, mats.shrinkBlack, [ix * 1.28, 0.2, iz * 1.28]); stub.rotation.y = yaw; g.add(stub);
    anchor(g, 'wire', [ix * 1.45, 0.2, iz * 1.45], [ix, 0, iz]);
    for (const [ox, oz] of [[1.131, 0], [-1.131, 0], [0, 1.131], [0, -1.131]]) allScrews.push(mtx([mx + ox, LAYOUT.yArm - 0.06, mz + oz]));

    // ---- 螺旋桨 ----
    const dir = LAYOUT.propDir[k];
    const p = part(`prop-${k}`);
    const spin = new THREE.Group(); spin.name = 'spinner'; p.add(spin);
    spin.add(mesh(blades[dir], mats.prop));
    spin.add(mesh(hubGeo, mats.prop)); spin.add(mesh(hubRim, mats.plastic, null, null, { cast: false }));
    p.add(mesh(nutGeo, mats.aluAccent)); p.add(mesh(domeGeo, mats.aluAccent));
    // 旋向标记：弧形箭头（几何结构一致，仅视觉标记区分）
    const markMat = dir === 'CW' ? mats.propMarkCW : mats.propMarkCCW;
    const mark = new THREE.Group(); mark.add(mesh(arcGeo, markMat, null, null, { cast: false }));
    const endA = Math.PI * 1.3, hx = Math.cos(endA) * 0.42, hz = -Math.sin(endA) * 0.42;
    const head = mesh(headGeo, markMat, [hx, 0.3, hz], null, { cast: false });
    head.rotation.y = endA + Math.PI / 2; mark.add(head);
    if (dir === 'CW') mark.scale.z = -1; // 镜像箭头 → 顺时针
    spin.add(mark);
    const blurMat = new THREE.MeshBasicMaterial({ map: blurTex, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, name: 'propBlur' });
    const blur = new THREE.Mesh(blurGeo, blurMat); blur.position.y = 0.08; blur.userData.noPick = true; blur.renderOrder = 2;
    p.add(blur);
    ctx.spinners.push({ obj: spin, dir: dir === 'CW' ? -1 : 1, blur });
  }
  const ms = part('motor-screws');
  ms.add(instanced(G.screw, mats.steel, allScrews));
}
