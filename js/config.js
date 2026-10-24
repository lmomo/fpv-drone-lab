// 集中定义的演示机型基准参数（演示配置，不对应任何真实品牌产品）
// 场景单位：1 unit = 10 mm
export const MM = 0.1;
export const SPEC = {
  wheelbaseMM: 220,           // 对角电机轴距
  propInch: 5,
  propPitchInch: 4.3,
  propBlades: 3,
  motorSize: '2207',
  statorDiaMM: 22, statorHeightMM: 7,
  motorKV: 1950,              // 用户可编辑
  cells: 6, cellVoltage: 3.7,
  capacityMAh: 1300,          // 用户可编辑
  fcHoleMM: 30.5, escHoleMM: 30.5,
  camTiltDeg: 20,
  avgCurrentA: 16,            // 估算续航用平均电流（演示估算）
};
export const LAYOUT = (() => {
  const r = SPEC.wheelbaseMM * MM / 2;          // 电机到中心半径
  const d = r / Math.SQRT2;
  return {
    motorR: r,
    motors: { fl: [-d, -d], fr: [d, -d], rl: [-d, d], rr: [d, d] }, // [x, z]，前方 = -Z
    armYaw: { fl: 135, fr: 45, rl: -135, rr: -45 },
    // 按 Betaflight 默认 props-in 方案：FL CW / FR CCW / RL CCW / RR CW（俯视）
    propDir: { fl: 'CW', fr: 'CCW', rl: 'CCW', rr: 'CW' },
    yBottom: 0, yArm: 0.25, yArmTop: 0.75, yESC: 1.15, yFC: 1.95, yTop: 3.25, yBattery: 3.55,
    stackHalf: SPEC.fcHoleMM * MM / 2,
    rootY: 4.2,
  };
})();
export const COLORS = {
  accent: 0x3fd3e6, accentHi: 0x7cf0ff, amber: 0xf0a540,
  power: 0xf0a540, signal: 0x3fd3e6, rf: 0xa98bff, motor: 0x7f93b0,
};
