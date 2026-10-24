// 共享材质库：同类零件复用同一 Material
import * as THREE from 'three';
import { carbonTexture, pcbTexture, batteryTexture, rubberTexture, strapTexture, braidTexture } from './textures.js';
import { SPEC } from '../config.js';

export function createMaterials() {
  const cf = carbonTexture();
  const S = (o) => new THREE.MeshStandardMaterial(o);
  const Ph = (o) => new THREE.MeshPhysicalMaterial(o);
  const m = {
    carbon: Ph({ color: 0xb8bcc4, map: cf.map, roughnessMap: cf.rough, roughness: 0.55, metalness: 0.15, clearcoat: 0.55, clearcoatRoughness: 0.35 }),
    carbonEdge: S({ color: 0x1a1d22, roughness: 0.75, metalness: 0.1 }),
    alu: S({ color: 0x2a3038, roughness: 0.32, metalness: 0.9 }),
    aluAccent: S({ color: 0x1f6f7c, roughness: 0.3, metalness: 0.85 }),
    aluBright: S({ color: 0xa9b0b8, roughness: 0.25, metalness: 1.0 }),
    steel: S({ color: 0x1c1e22, roughness: 0.4, metalness: 0.85 }),
    titanium: S({ color: 0x8c9097, roughness: 0.3, metalness: 0.95 }),
    bell: S({ color: 0x23272e, roughness: 0.34, metalness: 0.85 }),
    copper: S({ color: 0xb06a3a, roughness: 0.38, metalness: 0.9 }),
    magnet: S({ color: 0x4b5058, roughness: 0.45, metalness: 0.7 }),
    plastic: S({ color: 0x15171b, roughness: 0.62, metalness: 0.0 }),
    plasticGrey: S({ color: 0x3a4048, roughness: 0.55, metalness: 0.0 }),
    jst: S({ color: 0xd8d0bc, roughness: 0.6, metalness: 0.0 }),
    xt60: S({ color: 0xd9a933, roughness: 0.5, metalness: 0.0 }),
    pcbFC: S({ color: 0xffffff, map: pcbTexture('#0d1f2a', '#1a3e52', 3), roughness: 0.5, metalness: 0.1 }),
    pcbESC: S({ color: 0xffffff, map: pcbTexture('#121417', '#26303a', 7), roughness: 0.5, metalness: 0.1 }),
    pcbVTX: S({ color: 0xffffff, map: pcbTexture('#132418', '#24452e', 11), roughness: 0.5, metalness: 0.1 }),
    pcbRX: S({ color: 0xffffff, map: pcbTexture('#1d1f3a', '#30346a', 5), roughness: 0.5, metalness: 0.1 }),
    pcbEdge: S({ color: 0x2b3a2f, roughness: 0.7 }),
    chip: S({ color: 0x0d0e10, roughness: 0.45, metalness: 0.2 }),
    shield: S({ color: 0xc2c7cc, roughness: 0.22, metalness: 1.0 }),
    gold: S({ color: 0xd4a94a, roughness: 0.25, metalness: 1.0 }),
    smd: S({ color: 0x9a7e5c, roughness: 0.5, metalness: 0.2 }),
    mosfet: S({ color: 0x18191c, roughness: 0.4, metalness: 0.3 }),
    capAlu: S({ color: 0x2d3640, roughness: 0.35, metalness: 0.7 }),
    shrinkBlack: S({ color: 0x101114, roughness: 0.5, metalness: 0.0 }),
    glass: Ph({ color: 0x05060c, roughness: 0.04, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 0.9, iridescenceIOR: 1.6, iridescenceThicknessRange: [260, 420], envMapIntensity: 1.6 }),
    lensInner: S({ color: 0x0a0c18, roughness: 0.15, metalness: 0.6 }),
    batteryWrap: Ph({ color: 0xffffff, map: batteryTexture(SPEC.capacityMAh, SPEC.cells), roughness: 0.42, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
    batterySide: Ph({ color: 0x161c27, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.35 }),
    cellLine: S({ color: 0x07090d, roughness: 0.8 }),
    rubber: S({ color: 0xffffff, map: rubberTexture(), roughness: 0.95, metalness: 0 }),
    grommet: S({ color: 0x3a2a55, roughness: 0.9, metalness: 0 }),
    strap: S({ color: 0xffffff, map: strapTexture(), roughness: 0.85, metalness: 0 }),
    buckle: S({ color: 0x8a9099, roughness: 0.3, metalness: 0.95 }),
    tpu: Ph({ color: 0xd88a2a, roughness: 0.55, metalness: 0, transmission: 0.25, thickness: 0.5, transparent: true, opacity: 0.94 }),
    prop: Ph({ color: 0x4a5462, roughness: 0.35, metalness: 0, transmission: 0.35, thickness: 0.2, transparent: true, opacity: 0.88, side: THREE.DoubleSide }),
    propMarkCW: S({ color: 0x3fd3e6, roughness: 0.4, emissive: 0x0b3a40, emissiveIntensity: 0.6 }),
    propMarkCCW: S({ color: 0xf0a540, roughness: 0.4, emissive: 0x40280a, emissiveIntensity: 0.6 }),
    wireRed: S({ color: 0xb3261e, roughness: 0.55 }),
    wireBlack: S({ color: 0x141518, roughness: 0.55 }),
    wireGrey: S({ color: 0x3a3f48, roughness: 0.55 }),
    wireBraid: S({ color: 0xffffff, map: braidTexture(), roughness: 0.7 }),
    coax: S({ color: 0x8b9099, roughness: 0.5, metalness: 0.2 }),
    ledOn: S({ color: 0x9ff6ff, emissive: 0x3fd3e6, emissiveIntensity: 2.2, roughness: 0.3 }),
    ledAmber: S({ color: 0xffd08a, emissive: 0xf0a540, emissiveIntensity: 2.0, roughness: 0.3 }),
    ledSilicone: Ph({ color: 0xe8eef5, roughness: 0.2, transmission: 0.6, transparent: true, opacity: 0.6, thickness: 0.1 }),
    antennaCap: S({ color: 0x1b1f26, roughness: 0.4, metalness: 0.1 }),
    zip: S({ color: 0x111316, roughness: 0.6 }),
  };
  for (const [k, v] of Object.entries(m)) v.name = k;
  return m;
}
