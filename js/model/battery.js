// 电源系统：6S 电池（含刚性引线与母头 XT60）、绑带（可翻开）、防滑垫、XT60 公头
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mesh, mtx, instanced, anchor, D2R } from './util.js';
import { LAYOUT } from '../config.js';

function xt60Body(mats, female) {
  const g = new THREE.Group();
  const s = new THREE.Shape(); // 梯形截面（XT60 防反插）
  s.moveTo(-0.8, -0.4); s.lineTo(0.8, -0.4); s.lineTo(0.8, 0.15); s.lineTo(0.55, 0.4); s.lineTo(-0.55, 0.4); s.lineTo(-0.8, 0.15); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.7, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 });
  geo.translate(0, 0, -0.35);
  g.add(mesh(geo, mats.xt60));
  const pin = female ? new THREE.CylinderGeometry(0.2, 0.2, 0.3, 16, 1, true) : new THREE.CylinderGeometry(0.14, 0.14, 0.35, 16);
  pin.rotateX(Math.PI / 2);
  for (const sx of [-1, 1]) g.add(mesh(pin, mats.gold, [sx * 0.36, 0, female ? -0.25 : -0.5], null, { cast: false }));
  g.add(mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), mats.chip, [-0.36, 0.42, 0], null, { cast: false })); // "+" 极性标记
  return g;
}

export function buildPower(ctx) {
  const { mats, part, custom } = ctx;
  const W = 3.5, Hh = 3.4, L = 7.5;
  // ---- 电池 ----
  {
    const g = part('battery');
    g.add(mesh(new RoundedBoxGeometry(W, Hh, L, 4, 0.28), mats.batterySide, [0, Hh / 2, 0]));
    // 主标签（顶面 + 两侧），只写规格不写品牌
    const top = new THREE.PlaneGeometry(W - 0.5, L - 0.6); top.rotateX(-Math.PI / 2); top.rotateY(Math.PI / 2 * 0);
    g.add(mesh(top, mats.batteryWrap, [0, Hh + 0.003, 0], null, { cast: false }));
    const side = new THREE.PlaneGeometry(L - 0.6, Hh - 0.6);
    for (const sx of [-1, 1]) { const m = mesh(side, mats.batteryWrap, [sx * (W / 2 + 0.003), Hh / 2, 0], [0, sx * 90, 0], { cast: false }); g.add(m); }
    // 电芯分隔槽（3 串 × 2 并排示意）
    const grooveZ = new THREE.BoxGeometry(W + 0.01, 0.04, 0.03), grooveY = new THREE.BoxGeometry(0.03, Hh + 0.01, 0.04);
    const gm = [];
    for (const z of [-L / 6, L / 6]) { gm.push(mtx([0, Hh / 2, z], [0, 0, 90], [Hh / W, 1, 1])); }
    g.add(instanced(new THREE.BoxGeometry(0.035, W * 0.98, 0.035), mats.cellLine, [-L / 6, L / 6].flatMap((z) => [mtx([W / 2 + 0.006, Hh / 2, z], [90, 0, 0], [1, Hh / W, 1]), mtx([-W / 2 - 0.006, Hh / 2, z], [90, 0, 0], [1, Hh / W, 1])]), { cast: false }));
    g.add(instanced(grooveY, mats.cellLine, [mtx([0, Hh / 2, -L / 2 - 0.006], [0, 0, 0]), mtx([0, Hh / 2, L / 2 + 0.006])], { cast: false }));
    // 底部防滑面
    g.add(mesh(new THREE.BoxGeometry(W - 0.4, 0.02, L - 0.6), mats.rubber, [0, 0.0, 0], null, { cast: false }));
    // 刚性引线 + 母头 XT60（随电池一起移动）
    const zF = 4.3, yF = 3.82 - LAYOUT.yBattery;
    for (const [sx, mat] of [[0.36, mats.wireRed], [-0.36, mats.wireBlack]]) {
      const c = new THREE.CatmullRomCurve3([new THREE.Vector3(sx * 0.9, 0.7, L / 2 - 0.2), new THREE.Vector3(sx * 0.8, 0.55, L / 2 + 0.12), new THREE.Vector3(sx, yF, zF - 0.75), new THREE.Vector3(sx, yF, zF - 0.35)]);
      g.add(mesh(new THREE.TubeGeometry(c, 20, 0.13, 10), mat));
    }
    g.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.5, 20).rotateX(Math.PI / 2), mats.shrinkBlack, [0, 0.7, L / 2 - 0.1]));
    const f = xt60Body(mats, true); f.position.set(0, yF, zF); g.add(f);
    // 平衡头（6S → 7P）
    const bal = new THREE.CatmullRomCurve3([new THREE.Vector3(1.2, 1.2, L / 2 - 0.05), new THREE.Vector3(1.35, 1.6, L / 2 + 0.3), new THREE.Vector3(1.4, 2.4, L / 2 + 0.25), new THREE.Vector3(1.3, 3.0, L / 2 - 0.2)]);
    g.add(mesh(new THREE.TubeGeometry(bal, 20, 0.12, 8), mats.wireGrey));
    g.add(mesh(new THREE.BoxGeometry(0.45, 1.1, 0.25), mats.plastic, [1.3, 3.0, L / 2 - 0.45], [0, 0, 0]));
  }
  // ---- 绑带：固定段 + 可翻开段 ----
  {
    const g = part('battery-strap');
    const t = 0.09, w = 1.6, top = 3.7 + t; // 局部坐标（相对顶板上表面 yTop）
    const strapM = mats.strap;
    g.add(mesh(new THREE.BoxGeometry(3.9, t, w), strapM, [0, -0.05, 0]));                 // 顶板下方横段
    g.add(mesh(new THREE.BoxGeometry(t, 3.95, w), strapM, [-1.85, 1.9, 0]));              // 左侧竖段
    const pivot = new THREE.Group(); pivot.name = 'flap'; pivot.position.set(-1.81, top, 0); g.add(pivot);
    pivot.add(mesh(new THREE.BoxGeometry(3.7, t, w), strapM, [1.81, 0, 0]));            // 顶部横段
    pivot.add(mesh(new THREE.BoxGeometry(t, 1.6, w), strapM, [3.66, -0.8, 0]));          // 右侧下垂段（魔术贴）
    pivot.add(mesh(new THREE.BoxGeometry(0.12, 0.22, w + 0.15), mats.buckle, [3.7, -1.55, 0]));
    pivot.add(mesh(new THREE.BoxGeometry(0.6, 0.03, w * 0.9), mats.rubber, [1.8, -t / 2 - 0.01, 0], null, { cast: false }));
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.25, w + 0.15), mats.buckle, [1.95, 0.2, 0]));
    g.add(mesh(new THREE.BoxGeometry(t, 1.6, w), strapM, [1.85, 0.75, 0]));               // 右侧穿槽固定段
    custom['battery-strap'] = (f) => { pivot.rotation.z = 150 * D2R * f; };
  }
  // ---- 防滑垫 ----
  {
    const g = part('battery-pad');
    g.add(mesh(new RoundedBoxGeometry(3.2, 0.1, 6.6, 2, 0.04), mats.rubber, [0, 0.05, 0]));
  }
  // ---- XT60 公头 + 尾部焊杯 ----
  {
    const g = part('xt60');
    const m = xt60Body(mats, false); m.rotation.y = Math.PI; g.add(m); // 插针朝 -Z（前方）对接电池母头
    g.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.4, 16).rotateX(Math.PI / 2), mats.wireRed, [0.36, 0, 0.55]));
    g.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.4, 16).rotateX(Math.PI / 2), mats.shrinkBlack, [-0.36, 0, 0.55]));
    anchor(g, 'pwr+', [0.36, 0, 0.75], [0, 0, 1]);
    anchor(g, 'pwr-', [-0.36, 0, 0.75], [0, 0, 1]);
  }
}
