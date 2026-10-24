// 飞控、四合一电调、电源电容、图传、接收机、蜂鸣器、LED、摄像头与镜头组
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mesh, mtx, instanced, roundedRectShape, holePath, plateGeo, normalizeUV, cylZ, cylX, anchor, D2R } from './util.js';
import { LAYOUT } from '../config.js';

const H = LAYOUT.stackHalf;
function pcb(size, t, mat, edgeMat, holes = H, r = 0.3) {
  const s = roundedRectShape(size, size, r);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.holes.push(holePath(sx * holes, sz * holes, 0.17));
  const g = normalizeUV(plateGeo(s, t, 0.015, 1));
  return mesh(g, [mat, edgeMat]);
}
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const box = (w, h, d, mat, pos, rot) => mesh(B(w, h, d), mat, pos, rot);
// 确定性伪随机，保证每次生成一致
function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

export function buildElectronics(ctx) {
  const { mats, part } = ctx;
  const smdGeo = B(0.12, 0.05, 0.07), padGeo = B(0.22, 0.02, 0.16), pinGeo = B(0.04, 0.02, 0.1);
  const grommetGeo = new THREE.TorusGeometry(0.2, 0.08, 10, 20); grommetGeo.rotateX(Math.PI / 2);
  const nutGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.22, 6);
  const spacerGeo = (h) => { const g = new THREE.CylinderGeometry(0.22, 0.22, h, 20); g.translate(0, -h / 2, 0); return g; };
  const holes4 = [[H, H], [-H, H], [H, -H], [-H, -H]];
  const scatter = (seed, n, half, avoid) => { const r = rng(seed), out = []; let guard = 0;
    while (out.length < n && guard++ < 2000) { const x = (r() * 2 - 1) * half, z = (r() * 2 - 1) * half;
      if (avoid.some(([ax, az, aw, ad]) => Math.abs(x - ax) < aw && Math.abs(z - az) < ad)) continue;
      out.push(mtx([x, 0.185, z], [0, r() < 0.5 ? 0 : 90, 0])); } return out; };

  // ================= 飞控 =================
  {
    const g = part('fc');
    g.add(pcb(3.6, 0.16, mats.pcbFC, mats.pcbEdge));
    const T = 0.16;
    g.add(box(1.0, 0.12, 1.0, mats.chip, [0.1, T + 0.06, -0.1], [0, 45, 0]));                 // 主处理器 MCU
    const pins = []; for (let s = 0; s < 4; s++) for (let i = 0; i < 9; i++) { const o = -0.4 + i * 0.1; const a = s * 90 + 45;
      const v = new THREE.Vector3(o, 0, 0.56).applyAxisAngle(new THREE.Vector3(0, 1, 0), a * D2R); pins.push(mtx([0.1 + v.x, T + 0.01, -0.1 + v.z], [0, a, 0])); }
    g.add(instanced(pinGeo, mats.gold, pins, { cast: false }));
    g.add(box(0.62, 0.16, 0.62, mats.shield, [-0.95, T + 0.08, 0.85]));                        // IMU 屏蔽罩
    g.add(box(0.4, 0.09, 0.4, mats.chip, [0.95, T + 0.045, 0.95]));                           // 气压计
    g.add(box(0.55, 0.22, 0.55, mats.plasticGrey, [-1.0, T + 0.11, -0.95]));                  // 电源管理：电感
    g.add(box(0.36, 0.08, 0.3, mats.chip, [-0.4, T + 0.04, -1.05]));                          // 电源管理 IC
    g.add(box(0.36, 0.08, 0.3, mats.chip, [-1.0, T + 0.04, -0.35]));
    g.add(instanced(smdGeo, mats.smd, scatter(17, 34, 1.45, [[0.1, -0.1, 0.8, 0.8], [-0.95, 0.85, 0.45, 0.45], [-1.0, -0.95, 0.45, 0.45], [0.95, 0.95, 0.35, 0.35], [-1.2, 1.2, 0.5, 0.5]])));
    // USB-C
    const usb = mesh(new RoundedBoxGeometry(0.4, 0.3, 0.9, 2, 0.1), mats.aluBright, [1.65, T + 0.15, 0.0]); g.add(usb);
    g.add(box(0.05, 0.12, 0.6, mats.chip, [1.86, T + 0.15, 0]));
    // JST-SH 接口
    g.add(box(0.75, 0.3, 0.32, mats.jst, [0.9, T + 0.15, 1.45]));      // → 图传 (顶面)
    g.add(box(0.6, 0.25, 0.3, mats.jst, [-1.2, -0.125, 1.2]));       // → 电调 (底面)
    g.add(box(0.5, 0.25, 0.28, mats.jst, [-0.4, -0.125, 1.45]));     // → 接收机 (底面)
    // 排针
    const hdr = []; for (let i = 0; i < 6; i++) hdr.push(mtx([-0.5 + i * 0.2, T + 0.2, -1.6]));
    g.add(box(1.25, 0.1, 0.2, mats.plastic, [0, T + 0.05, -1.6]));
    g.add(instanced(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), mats.gold, hdr, { cast: false }));
    // 焊盘
    const pads = []; for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) pads.push(mtx([sx * 1.62, T + 0.01, -0.8 + i * 0.4], [0, 90, 0]));
    for (let i = 0; i < 4; i++) pads.push(mtx([-0.6 + i * 0.4, T + 0.01, 1.66]));
    g.add(instanced(padGeo, mats.gold, pads, { cast: false }));
    g.add(box(0.12, 0.05, 0.12, mats.ledOn, [0.6, T + 0.03, 0.55]));
    // 减震圈 + 防松螺母 + 下方减震柱（至电调）
    g.add(instanced(grommetGeo, mats.grommet, holes4.map(([x, z]) => mtx([x, 0.08, z]))));
    g.add(instanced(nutGeo, mats.aluAccent, holes4.map(([x, z]) => mtx([x, T + 0.15, z]))));
    g.add(instanced(spacerGeo(0.64), mats.grommet, holes4.map(([x, z]) => mtx([x, 0, z]))));
    anchor(g, 'esc', [-1.2, -0.25, 1.2], [0, -1, 0]);
    anchor(g, 'vtx', [0.9, T + 0.15, 1.62], [0, 0, 1]);
    anchor(g, 'rx', [-0.4, -0.25, 1.45], [0, -1, 0]);
  }
  // ================= 四合一电调 =================
  {
    const g = part('esc');
    g.add(pcb(4.0, 0.16, mats.pcbESC, mats.pcbEdge, H, 0.4));
    const T = 0.16;
    const mos = [], tabs = [];
    // 4 路 × 6 颗 MOSFET（每象限 2 × 3 排列）
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const x = sx * (0.55 + j * 0.48), z = sz * (0.45 + i * 0.38);
      mos.push(mtx([x, T + 0.06, z])); tabs.push(mtx([x, T + 0.125, z]));
    }
    g.add(instanced(B(0.4, 0.12, 0.3), mats.mosfet, mos));
    g.add(instanced(B(0.3, 0.01, 0.2), mats.shield, tabs, { cast: false }));
    g.add(box(0.6, 0.08, 0.6, mats.chip, [0, T + 0.04, 0], [0, 45, 0])); // ESC MCU
    g.add(instanced(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 16), mats.capAlu, [[-0.15, 1.3], [0.25, 1.3], [-0.15, -1.35], [0.25, -1.35]].map(([x, z]) => mtx([x, T + 0.15, z]))));
    // 电机输出焊盘（四角各 3 个）+ 电源输入焊盘
    const pads = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let i = 0; i < 3; i++) {
      const t = -0.32 + i * 0.32; const v = new THREE.Vector3(t, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), (sx * sz > 0 ? -45 : 45) * D2R);
      pads.push(mtx([sx * 1.62 + v.x, T + 0.012, sz * 1.62 + v.z], [0, sx * sz > 0 ? -45 : 45, 0]));
    }
    g.add(instanced(B(0.24, 0.025, 0.3), mats.gold, pads, { cast: false }));
    g.add(box(0.6, 0.04, 0.42, mats.gold, [0.55, T + 0.02, 1.7])); g.add(box(0.6, 0.04, 0.42, mats.gold, [-0.55, T + 0.02, 1.7]));
    g.add(box(0.55, 0.15, 0.5, mats.wireRed, [0.55, T + 0.08, 1.72]).translateY(0.02)); // 焊点包锡
    g.add(box(0.55, 0.15, 0.5, mats.wireBlack, [-0.55, T + 0.1, 1.72]));
    g.add(box(0.9, 0.05, 0.35, mats.gold, [0, T + 0.02, -1.72]));           // 电容焊盘
    g.add(box(0.8, 0.25, 0.3, mats.jst, [-1.2, T + 0.125, 1.2]));         // 8P → 飞控
    g.add(box(0.18, 0.04, 0.5, mats.chip, [1.25, T + 0.02, 0], [0, 0, 0])); // 采样电阻
    g.add(instanced(grommetGeo, mats.grommet, holes4.map(([x, z]) => mtx([x, 0.08, z]))));
    g.add(instanced(spacerGeo(0.4), mats.plastic, holes4.map(([x, z]) => mtx([x, 0, z]))));
    anchor(g, 'fc', [-1.2, T + 0.25, 1.2], [0, 1, 0]);
    for (const k of ['fl', 'fr', 'rl', 'rr']) { const [mx, mz] = LAYOUT.motors[k]; const sx = Math.sign(mx), sz = Math.sign(mz);
      anchor(g, `m-${k}`, [sx * 1.78, T + 0.05, sz * 1.78], [sx, -0.1, sz]); }
    anchor(g, 'pwr+', [0.55, T + 0.12, 1.85], [0.3, 0, 1]);
    anchor(g, 'pwr-', [-0.55, T + 0.12, 1.85], [-0.3, 0, 1]);
  }
  // ================= 电源滤波电容 =================
  {
    const g = part('power-cap');
    g.add(mesh(cylX(0.45, 1.5, 32), mats.capAlu));
    g.add(mesh(cylX(0.462, 1.1, 32), mats.shrinkBlack));
    const vent = new THREE.TorusGeometry(0.2, 0.02, 6, 20); vent.rotateY(Math.PI / 2);
    g.add(mesh(vent, mats.chip, [-0.76, 0, 0], null, { cast: false }));
    for (const sx of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(sx * 0.75, 0, 0), new THREE.Vector3(sx * 0.9, 0.12, 0.25), new THREE.Vector3(sx * 0.4, 0.33, 0.6)]);
      g.add(mesh(new THREE.TubeGeometry(curve, 12, 0.04, 6), mats.aluBright));
    }
  }
  // ================= 数字图传 =================
  {
    const g = part('vtx');
    const s = roundedRectShape(2.2, 2.2, 0.25); for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.holes.push(holePath(sx * 0.95, sz * 0.95, 0.12));
    g.add(mesh(normalizeUV(plateGeo(s, 0.12, 0.012, 1)), [mats.pcbVTX, mats.pcbEdge]));
    g.add(box(1.7, 0.1, 1.7, mats.alu, [0, 0.17, 0]));
    const fins = []; for (let i = 0; i < 8; i++) fins.push(mtx([-0.735 + i * 0.21, 0.42, 0]));
    g.add(instanced(B(0.07, 0.42, 1.6), mats.alu, fins));
    g.add(box(1.72, 0.03, 0.08, mats.aluAccent, [0, 0.22, -0.8]));
    g.add(box(1.4, 0.06, 1.4, mats.shield, [0, -0.03, 0]));              // 底面屏蔽罩
    g.add(box(0.6, 0.1, 0.25, mats.plastic, [0.3, 0.17, -0.97]));        // MIPI 摄像头接口
    g.add(box(0.5, 0.2, 0.25, mats.jst, [-0.65, 0.22, -0.97]));          // UART / 电源
    const ufl = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 16);
    g.add(instanced(ufl, mats.gold, [mtx([0.7, 0.16, 0.97]), mtx([-0.7, 0.16, 0.97])]));
    g.add(box(0.12, 0.04, 0.12, mats.ledAmber, [0.95, 0.14, -0.3]));
    g.add(instanced(grommetGeo, mats.grommet, [[0.95, 0.95], [-0.95, 0.95], [0.95, -0.95], [-0.95, -0.95]].map(([x, z]) => mtx([x, 0.06, z], [0, 0, 0], [0.6, 0.6, 0.6]))));
    anchor(g, 'cam', [0.3, 0.17, -1.12], [0, 0, -1]);
    anchor(g, 'fc', [-0.65, 0.22, -1.12], [0, 0, -1]);
    anchor(g, 'rf-r', [0.7, 0.2, 1.02], [0, 0, 1]);
    anchor(g, 'rf-l', [-0.7, 0.2, 1.02], [0, 0, 1]);
  }
  // ================= 接收机 =================
  {
    const g = part('receiver');
    g.add(box(0.95, 0.08, 1.45, mats.pcbRX, [0, 0.08, 0]));
    g.add(box(0.4, 0.08, 0.4, mats.chip, [0, 0.16, -0.2]));
    const shrink = new THREE.MeshPhysicalMaterial({ color: 0x2a3548, roughness: 0.3, transmission: 0.5, transparent: true, opacity: 0.7, thickness: 0.2, name: 'rxShrink' });
    g.add(mesh(new RoundedBoxGeometry(1.1, 0.32, 1.6, 3, 0.12), shrink, [0, 0.16, 0]));
    g.add(box(0.08, 0.04, 0.08, mats.ledOn, [0.3, 0.33, 0.4]));
    anchor(g, 'fc', [0, 0.25, -0.8], [0, 0.3, -1]);
    anchor(g, 'ant-l', [-0.3, 0.15, 0.8], [-0.3, 0, 1]);
    anchor(g, 'ant-r', [0.3, 0.15, 0.8], [0.3, 0, 1]);
  }
  // ================= 蜂鸣器 =================
  {
    const g = part('buzzer');
    g.add(mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.55, 32).translate(0, 0.275, 0), mats.plastic));
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16).translate(0, 0.56, 0), mats.chip, null, null, { cast: false }));
    g.add(mesh(new THREE.TorusGeometry(0.38, 0.02, 6, 32).rotateX(Math.PI / 2).translate(0, 0.55, 0), mats.plasticGrey, null, null, { cast: false }));
  }
  // ================= LED 灯条 =================
  {
    const g = part('led');
    g.add(box(2.2, 0.35, 0.04, mats.pcbRX));
    g.add(instanced(B(0.22, 0.22, 0.08), mats.ledOn, [-0.75, -0.25, 0.25, 0.75].map((x) => mtx([x, 0, 0.05]))));
    g.add(mesh(new RoundedBoxGeometry(2.3, 0.45, 0.16, 2, 0.06), mats.ledSilicone, [0, 0, 0.04], null, { cast: false }));
  }
  // ================= 摄像头机身 =================
  {
    const g = part('camera');
    g.add(mesh(new RoundedBoxGeometry(1.9, 1.9, 1.6, 4, 0.18), mats.alu));
    g.add(mesh(new RoundedBoxGeometry(1.75, 1.75, 0.08, 2, 0.12), mats.aluAccent, [0, 0, -0.82]));
    g.add(mesh(cylZ(0.78, 0.82, 0.28, 40), mats.alu, [0, 0, -0.98]));           // 镜座
    g.add(mesh(cylZ(0.6, 0.6, 0.02, 32), mats.chip, [0, 0, -1.125], null, { cast: false }));
    g.add(mesh(B(0.5, 0.4, 0.02), mats.lensInner, [0, 0, -1.11], null, { cast: false })); // 传感器窗口
    for (const sx of [-1, 1]) {
      g.add(mesh(cylX(0.13, 0.04, 20), mats.chip, [sx * 0.95, 0, 0], null, { cast: false }));
      g.add(mesh(cylX(0.13, 0.04, 20), mats.chip, [sx * 0.95, -0.71, 0.09], null, { cast: false }));
    }
    g.add(box(0.7, 0.3, 0.12, mats.plastic, [0, -0.3, 0.83]));
    anchor(g, 'cable', [0, -0.3, 0.92], [0, -0.2, 1]);
  }
  // ================= 镜头组 =================
  {
    const g = part('cam-lens');
    const knurl = new THREE.CylinderGeometry(0.64, 0.64, 0.36, 48); knurl.rotateX(Math.PI / 2);
    const pos = knurl.attributes.position; // 滚花：径向小幅起伏
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), r = Math.hypot(x, y); if (r > 0.6) { const a = Math.atan2(y, x), k = 1 + 0.03 * Math.sign(Math.sin(a * 24)); pos.setXY(i, x / r * 0.64 * k, y / r * 0.64 * k); } }
    knurl.computeVertexNormals();
    g.add(mesh(cylZ(0.55, 0.55, 0.3, 40), mats.steel, [0, 0, -1.27]));       // 螺纹段
    g.add(mesh(knurl, mats.alu, [0, 0, -1.55]));                                // 对焦环
    g.add(mesh(cylZ(0.56, 0.6, 0.22, 48), mats.aluAccent, [0, 0, -1.84]));     // 前压圈
    g.add(mesh(cylZ(0.48, 0.48, 0.04, 48, true), mats.aluBright, [0, 0, -1.95], null, { cast: false }));
    const lensGeo = new THREE.SphereGeometry(0.62, 40, 16, 0, Math.PI * 2, 0, 0.72); lensGeo.rotateX(-Math.PI / 2);
    g.add(mesh(lensGeo, mats.glass, [0, 0, -1.37], null, { cast: false }));      // 前组镜片（凸面）
    g.add(mesh(cylZ(0.36, 0.36, 0.02, 32), mats.lensInner, [0, 0, -1.78], null, { cast: false })); // 内部镜组简化
    g.add(mesh(cylZ(0.28, 0.28, 0.02, 32), mats.glass, [0, 0, -1.6], null, { cast: false }));
  }
}
