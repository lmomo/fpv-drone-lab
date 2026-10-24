// 组装入口：建立 DroneRoot → 各子总成 → 部件 Group 的层级，并登记部件、锚点和自定义动画钩子
import * as THREE from 'three';
import { PARTS, PART_MAP } from '../data.js';
import { LAYOUT } from '../config.js';
import { createMaterials } from './materials.js';
import { buildFrame } from './frame.js';
import { buildPropulsion } from './propulsion.js';
import { buildElectronics } from './electronics.js';
import { buildPower } from './battery.js';
import { buildAntennas } from './antenna.js';
import { buildFasteners } from './fasteners.js';
import { buildCables } from './wiring.js';
import { D2R } from './util.js';

const ASSEMBLY = {
  frame: 'FrameAssembly', propulsion: 'PropulsionAssembly', fcesc: 'AvionicsAssembly', power: 'PowerAssembly',
  camvtx: 'CameraVTXAssembly', antrx: 'RFAssembly', wiring: 'WiringAssembly',
};

export function buildDrone() {
  const mats = createMaterials();
  const root = new THREE.Group(); root.name = 'DroneRoot'; root.position.y = LAYOUT.rootY;
  const assemblies = {};
  for (const [cat, name] of Object.entries(ASSEMBLY)) { const g = new THREE.Group(); g.name = name; root.add(g); assemblies[cat] = g; }
  const parts = {};
  const ctx = {
    mats, root, parts, custom: {}, spinners: [], statusLeds: [],
    part(id) {
      const d = PART_MAP[id]; if (!d) throw new Error('未知部件 ' + id);
      if (parts[id]) return parts[id];
      const g = new THREE.Group(); g.name = id; g.userData.partId = id;
      g.position.set(...d.position); g.rotation.set(...d.rotation.map((v) => v * D2R));
      assemblies[d.category].add(g); parts[id] = g; return g;
    },
  };
  buildFrame(ctx); buildPropulsion(ctx); buildElectronics(ctx); buildPower(ctx); buildAntennas(ctx); buildFasteners(ctx);
  for (const p of PARTS) if (!parts[p.id]) ctx.part(p.id); // 防御：数据中有但未建模的部件
  const cables = buildCables(ctx);

  // 标记 Mesh 所属部件、保存原始材质与初始变换
  for (const [id, g] of Object.entries(parts)) {
    g.userData.initPos = g.position.clone(); g.userData.initQuat = g.quaternion.clone();
    g.traverse((o) => { if (o.isMesh) { if (!o.userData.noPick) o.userData.partId = id; o.userData.origMat = o.material; } });
  }
  cables.init();
  return { root, parts, assemblies, mats, ctx, cables };
}
