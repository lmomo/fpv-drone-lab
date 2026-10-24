// 图传天线（双支，插在 TPU 座上）与接收机 T 形天线（沿后机臂扎带固定）
import * as THREE from 'three';
import { mesh, anchor } from './util.js';
import { LAYOUT } from '../config.js';

export function buildAntennas(ctx) {
  const { mats, part } = ctx;
  {
    const g = part('vtx-antenna');
    const base = new THREE.Vector3(0, LAYOUT.yArm, 4.22);
    for (const sx of [-1, 1]) {
      const dir = new THREE.Vector3(sx * 0.42, 0.62, 0.66).normalize();
      const sock = base.clone().add(new THREE.Vector3(sx * 0.85, 2.0, 0.55));
      const holder = new THREE.Group(); holder.position.copy(sock);
      holder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); g.add(holder);
      const add = (geo, mat, y) => { const m = mesh(geo, mat, [0, y, 0]); holder.add(m); };
      add(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 20), mats.aluBright, 0);                      // SMA 接头
      add(new THREE.CylinderGeometry(0.26, 0.26, 0.18, 6), mats.aluBright, 0.5);
      add(new THREE.CylinderGeometry(0.17, 0.2, 2.4, 20), mats.antennaCap, 1.8);                   // 护套
      add(new THREE.CylinderGeometry(0.42, 0.42, 0.55, 28), mats.antennaCap, 3.2);                // 辐射单元帽
      add(new THREE.SphereGeometry(0.42, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), mats.antennaCap, 3.47);
      add(new THREE.TorusGeometry(0.42, 0.03, 6, 28).rotateX(Math.PI / 2), mats.aluAccent, 2.95);
      const inner = sock.clone().addScaledVector(dir, -0.45);
      anchor(g, sx > 0 ? 'r' : 'l', inner.toArray(), dir.clone().negate().toArray());
    }
  }
  {
    const g = part('rx-antenna');
    for (const k of ['rl', 'rr']) {
      const [mx, mz] = LAYOUT.motors[k]; const L = Math.hypot(mx, mz); const d = new THREE.Vector3(mx / L, 0, mz / L);
      const perp = new THREE.Vector3(-d.z, 0, d.x).multiplyScalar(Math.sign(mx) * 0.45);
      const p0 = d.clone().multiplyScalar(3.0).add(perp).setY(0.88), p1 = d.clone().multiplyScalar(7.0).add(perp).setY(0.88);
      const len = p0.distanceTo(p1), mid = p0.clone().lerp(p1, 0.5);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      const sleeve = mesh(new THREE.CylinderGeometry(0.075, 0.075, len, 10), mats.coax, mid.toArray()); sleeve.quaternion.copy(q); g.add(sleeve);
      const tip = mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8), mats.aluBright, p1.clone().addScaledVector(d, 0.8).toArray()); tip.quaternion.copy(q); g.add(tip);
      for (const t of [0.25, 0.75]) {
        const z = mesh(new THREE.TorusGeometry(0.5, 0.05, 6, 20), mats.zip, p0.clone().lerp(p1, t).setY(0.55).toArray());
        z.quaternion.copy(q); z.scale.set(1.1, 1, 0.55); z.rotateX(Math.PI / 2); g.add(z);
      }
      anchor(g, k === 'rl' ? 'l' : 'r', p0.toArray(), d.clone().negate().toArray());
    }
  }
}
