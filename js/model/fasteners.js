// 紧固件：InstancedMesh 批量生成（顶板螺丝、底板 / 飞塔螺丝、机臂螺丝）
import * as THREE from 'three';
import { mtx, instanced } from './util.js';
import { LAYOUT } from '../config.js';

function buttonHead() {
  const pts = [[0, 0], [0.27, 0], [0.27, 0.06], [0.22, 0.13], [0.12, 0.16], [0, 0.16]].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, 24);
}
export function buildFasteners(ctx) {
  const { mats, part } = ctx;
  const head = buttonHead();
  const stand = [[2.2, 3.6], [-2.2, 3.6], [2.2, -3.6], [-2.2, -3.6]];
  { // 顶板：螺丝头朝上
    const g = part('fasteners-top');
    g.add(instanced(head, mats.titanium, stand.map(([x, z]) => mtx([x, 0.2, z]))));
  }
  { // 底部：螺丝头朝下
    const g = part('fasteners-bottom');
    const H = LAYOUT.stackHalf, m = [];
    for (const [x, z] of stand) m.push(mtx([x, 0, z], [180, 0, 0]));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) m.push(mtx([sx * H, 0, sz * H], [180, 0, 0]));
    for (const k of ['fl', 'fr', 'rl', 'rr']) { const [mx, mz] = LAYOUT.motors[k], L = Math.hypot(mx, mz);
      for (const r of [3.4]) m.push(mtx([mx / L * r, 0, mz / L * r], [180, 0, 0])); }
    g.add(instanced(head, mats.titanium, m));
    // 飞塔长螺杆（M3 × 30）
    const rod = new THREE.CylinderGeometry(0.14, 0.14, 2.35, 12); rod.translate(0, 1.175, 0);
    g.add(instanced(rod, mats.steel, [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([a, b]) => mtx([a * H, 0, b * H]))));
  }
}
