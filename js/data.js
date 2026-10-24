// 统一数据源：部件清单、详情面板、标签、连接关系、拆解序列均由此驱动
import { SPEC, LAYOUT } from './config.js';

export const CATEGORIES = [
  { id: 'frame', name: '机架结构', en: 'Frame', color: '#7f93b0', ico: 'FR' },
  { id: 'propulsion', name: '动力系统', en: 'Propulsion', color: '#3fd3e6', ico: 'PW' },
  { id: 'fcesc', name: '飞控与电调', en: 'FC & ESC', color: '#5fe0a0', ico: 'FC' },
  { id: 'power', name: '电源系统', en: 'Power', color: '#f0a540', ico: 'PS' },
  { id: 'camvtx', name: '摄像与图传', en: 'Camera & VTX', color: '#a98bff', ico: 'CV' },
  { id: 'antrx', name: '天线与接收机', en: 'Antenna & RX', color: '#c79bff', ico: 'RF' },
  { id: 'wiring', name: '线缆与紧固件', en: 'Wiring & Fasteners', color: '#8ea0b8', ico: 'WF' },
];

// 拆解阶段（可配置演示序列）
export const STAGES = [
  { n: 1, name: '电池与固定带' },
  { n: 2, name: '摄像头与后置天线组件' },
  { n: 3, name: '飞控 / 电调 / 电源模块 / 图传' },
  { n: 4, name: '电机与螺旋桨' },
  { n: 5, name: '机架板、机臂与紧固件' },
  { n: 6, name: '线缆、连接器与辅助组件' },
];
export const STAGE_START = 0.14, STAGE_LEN = 0.30;
export const stageEnd = (n) => (n <= 0 ? 0 : (n - 1) * STAGE_START + STAGE_LEN);

const P = (k, v, tag = 'demo') => ({ k, v, tag }); // tag: demo 演示配置 / ref 参考参数 / edit 可编辑 / unk 未配置 / est 估算
export const TAGS = { demo: '演示配置', ref: '参考参数', edit: '可编辑', unk: '未配置', est: '演示估算' };

const M = LAYOUT.motors;
const motorNames = { fl: '左前', fr: '右前', rl: '左后', rr: '右后' };
const motorIndex = { rr: 1, fr: 2, rl: 3, fl: 4 };
const armDir = (k) => { const [x, z] = M[k]; const l = Math.hypot(x, z); return [x / l, z / l]; };

const parts = [];
const add = (p) => parts.push({ visible: true, selectable: true, quantity: 1, rotation: [0, 0, 0], label: 0, ...p });

/* ---------------- 机架结构 ---------------- */
add({ id: 'frame-bottom', code: 'FR-01', name: '底板', nameEn: 'Bottom Plate', category: 'frame', label: 2,
  description: '机架中央主承力底板，夹持四根机臂并承载飞塔与接收机，是机臂、立柱和飞塔螺丝的公共基准面。',
  mount: '机架最下层，四根机臂通过 8 颗 M3 螺丝与底板夹紧。',
  material: '3K 斜纹碳纤维层压板，CNC 外形与减重槽，边缘倒角。', weight: 18,
  parameters: [P('板厚', '2.5 mm'), P('外形', '50 × 90 mm 圆角'), P('减重槽', '3 处'), P('材料', '3K 碳纤维', 'ref'), P('参考重量', '18 g', 'est')],
  position: [0, LAYOUT.yBottom, 0], explode: { stage: 5, pos: [0, -2.8, 0], delay: 0.03 } });
for (const k of ['fl', 'fr', 'rl', 'rr']) {
  const [dx, dz] = armDir(k);
  add({ id: `arm-${k}`, code: `FR-1${'flfrrlrr'.indexOf(k) / 2 + 1}`, group: 'arm', groupName: '碳纤维机臂', name: `${motorNames[k]}机臂`, nameEn: `Arm ${k.toUpperCase()}`, category: 'frame', label: 0,
    description: '独立可更换式碳纤维机臂，内端被上下板夹持，外端为电机安装座，承受电机推力与扭矩并传递至机身。',
    mount: `X 型布局 ${motorNames[k]} 方向（偏航 ${LAYOUT.armYaw[k]}°），底板与飞塔层之间。`,
    material: '5 mm 3K 碳纤维，中段减重槽，外端 16 × 16 / 19 × 19 mm 电机孔位。', weight: 9,
    parameters: [P('厚度', '5.0 mm'), P('有效长度', '≈ 98 mm'), P('电机孔位', '16 × 16 mm', 'ref'), P('状态灯', '机臂下方 1 颗'), P('参考重量', '9 g', 'est')],
    position: [0, LAYOUT.yArm, 0], rotation: [0, LAYOUT.armYaw[k], 0],
    explode: { stage: 5, pos: [dx * 3.0, -1.1, dz * 3.0], delay: 0.1 } });
}
add({ id: 'frame-top', code: 'FR-02', name: '顶板', nameEn: 'Top Plate', category: 'frame', label: 2,
  description: '上层碳纤维板，与底板通过四根铝立柱形成箱式结构，顶面承载电池并开有绑带槽。',
  mount: '立柱顶部，距底板 30 mm。', material: '2 mm 3K 碳纤维，绑带槽 ×2。', weight: 11,
  parameters: [P('板厚', '2.0 mm'), P('外形', '50 × 92 mm'), P('绑带槽', '2 × 20 mm'), P('参考重量', '11 g', 'est')],
  position: [0, LAYOUT.yTop, 0], explode: { stage: 5, pos: [0, 3.4, 0] } });
add({ id: 'standoffs', code: 'FR-03', name: '铝立柱', nameEn: 'Aluminium Standoffs', category: 'frame', quantity: 4,
  description: '连接上下板的承力立柱，决定机身内部净高，并保护飞塔与图传。', mount: '机身四角，底板与顶板之间。',
  material: '7075 阳极氧化铝，M3 内螺纹。', weight: 4,
  parameters: [P('规格', 'M3 × 30 mm'), P('数量', '4'), P('材料', '7075-T6 铝', 'ref'), P('表面', '黑色阳极氧化')],
  position: [0, LAYOUT.yArm, 0], explode: { stage: 5, pos: [0, 1.6, 0] } });
add({ id: 'cam-bracket', code: 'FR-04', name: '摄像头侧板支架', nameEn: 'Camera Side Plates', category: 'frame', label: 2,
  description: '前端左右侧板，通过两颗调角螺丝夹持摄像头，弧形槽允许 0–45° 倾角调节。',
  mount: '机身前端，夹在上下板之间。', material: '1.5 mm 碳纤维 / 弧形调角槽。', weight: 3,
  parameters: [P('适配摄像头', '19 × 19 mm'), P('调角范围', '0° – 45°'), P('当前倾角', `${SPEC.camTiltDeg}°`, 'edit'), P('参考重量', '3 g', 'est')],
  position: [0, 0, -4.55], explode: { stage: 5, pos: [0, -1.8, -2.4] } });
add({ id: 'ant-mount', code: 'FR-05', name: '后置天线座', nameEn: 'Rear Antenna Mount', category: 'frame', label: 2,
  description: 'TPU 打印后置支架，固定图传天线与 LED 灯条，兼作坠机时的后部缓冲保护。',
  mount: '机身后端，后两根立柱之间。', material: '95A TPU，半透明琥珀色。', weight: 4,
  parameters: [P('材料', 'TPU 95A', 'ref'), P('天线孔', '2 × Ø 5 mm, 外倾 25°'), P('参考重量', '4 g', 'est')],
  position: [0, LAYOUT.yArm, 4.22], explode: { stage: 2, pos: [0, 0.4, 3.6], delay: 0.0 } });

/* ---------------- 动力系统 ---------------- */
for (const k of ['fl', 'fr', 'rl', 'rr']) {
  const [x, z] = M[k]; const [dx, dz] = armDir(k);
  add({ id: `motor-${k}`, code: `PW-M${motorIndex[k]}`, group: 'motor', groupName: '无刷电机 2207', name: `${motorNames[k]}电机 M${motorIndex[k]}`, nameEn: `Brushless Motor ${k.toUpperCase()}`,
    category: 'propulsion', label: 1, kind: 'motor', weight: 32,
    description: '外转子无刷电机：定子绕组在电调驱动的三相电流下产生旋转磁场，带动外部钟罩内的永磁体与输出轴同步旋转。',
    mount: `${motorNames[k]}机臂末端，四颗 M3 螺丝自机臂底部固定，Betaflight 编号 M${motorIndex[k]}。`,
    material: '6061 CNC 阳极氧化钟罩，N52 弧形磁钢，0.2 mm 硅钢片定子，钛合金空心轴。',
    parameters: [P('规格', SPEC.motorSize), P('数量', '4'), P('定子尺寸', `${SPEC.statorDiaMM} × ${SPEC.statorHeightMM} mm`), P('典型 KV', `${SPEC.motorKV}`, 'edit'),
      P('适配电池', `${SPEC.cells}S LiPo`), P('安装方式', '四螺丝 16 × 16 mm'), P('输出轴', 'M5 × 1.0 ', 'ref'), P('转向', LAYOUT.propDir[k]), P('参考重量', '32 g', 'est'), P('最大拉力', '未标定', 'unk')],
    position: [x, LAYOUT.yArmTop, z], explode: { stage: 4, pos: [dx * 2.4, 2.4, dz * 2.4], delay: 0.07 } });
}
for (const k of ['fl', 'fr', 'rl', 'rr']) {
  const [x, z] = M[k];
  add({ id: `prop-${k}`, code: `PW-P${motorIndex[k]}`, group: 'prop', groupName: '5 寸三叶桨', name: `${motorNames[k]}螺旋桨 (${LAYOUT.propDir[k]})`, nameEn: `Propeller ${k.toUpperCase()} ${LAYOUT.propDir[k]}`,
    category: 'propulsion', label: 1, kind: 'prop', weight: 4.5, dir: LAYOUT.propDir[k],
    description: '三叶 5 英寸螺旋桨，桨叶由根部到桨尖扭转角逐渐减小以保持均匀攻角。对角两桨同向旋转，相邻两桨反向，以抵消反扭矩。',
    mount: `通过 M5 防松螺母锁紧在${motorNames[k]}电机轴上。`, material: '玻纤增强 PC，半透明烟灰色。',
    parameters: [P('规格', `${SPEC.propInch} × ${SPEC.propPitchInch} × ${SPEC.propBlades}`), P('直径', '127 mm'), P('螺距', `${SPEC.propPitchInch} in`, 'ref'), P('旋转方向', LAYOUT.propDir[k] === 'CW' ? '顺时针 CW（俯视）' : '逆时针 CCW（俯视）'),
      P('桨毂', 'M5 / Ø 12 mm'), P('参考重量', '4.5 g', 'est')],
    position: [x, LAYOUT.yArmTop + 1.75, z], explode: { stage: 4, pos: [0, 5.2, 0], delay: 0 } });
}

/* ---------------- 飞控与电调 ---------------- */
add({ id: 'fc', code: 'FC-01', name: '飞控', nameEn: 'Flight Controller', category: 'fcesc', label: 1, kind: 'fc', weight: 8,
  description: '整机控制核心：主处理器以高频读取 IMU 角速度，运行 PID 姿态环，将遥控指令与姿态误差解算为四路电机油门，通过数字协议发送给四合一电调。',
  mount: '飞塔上层，30.5 mm 孔位，四颗硅胶减震圈隔离高频振动。',
  material: '6 层 2 oz 铜 PCB，沉金焊盘；IMU 金属屏蔽罩。',
  parameters: [P('安装孔距', `${SPEC.fcHoleMM} × ${SPEC.fcHoleMM} mm`), P('主处理器', 'F7 级 MCU', 'ref'), P('IMU', '6 轴陀螺仪 + 加速度计', 'ref'), P('陀螺采样', '8 kHz', 'ref'),
    P('输入电压', '3–6S（经电调供电）'), P('UART', '5 组', 'ref'), P('BEC', '5 V / 9 V'), P('接口', 'USB-C'), P('固件', '未配置', 'unk')],
  position: [0, LAYOUT.yFC, 0], explode: { stage: 3, pos: [-7.6, 2.6, 0], rot: [0, 0, 12], waypoints: [[0, 0.55, 0], [-7.6, 0.65, 0], [-7.6, 2.6, 0]], window: [0.29, 0.52] } });
add({ id: 'esc', code: 'FC-02', name: '四合一电调', nameEn: '4-in-1 ESC', category: 'fcesc', label: 1, kind: 'esc', weight: 14,
  description: '接收飞控的数字油门信号（DShot），通过 12 组功率 MOSFET 组成的三相桥对四台电机进行换相驱动，同时为飞控提供电源。',
  mount: '飞塔下层，30.5 mm 孔位，位于飞控下方 8 mm。',
  material: '8 层 3 oz 厚铜 PCB，功率 MOSFET + 低 ESR 电容。',
  parameters: [P('安装孔距', `${SPEC.escHoleMM} × ${SPEC.escHoleMM} mm`), P('持续电流', '45 A × 4', 'ref'), P('输入', `3–${SPEC.cells}S`), P('协议', 'DShot600', 'ref'),
    P('MOSFET', '24 颗（每路 6 颗）', 'ref'), P('电流计', '有'), P('参考重量', '14 g', 'est')],
  position: [0, LAYOUT.yESC, 0], explode: { stage: 3, pos: [7.4, 1.0, 0], rot: [0, 0, -10], waypoints: [[0, 1.3, 0], [7.4, 1.3, 0], [7.4, 1.0, 0]], window: [0.46, 0.66] } });
add({ id: 'power-cap', code: 'FC-03', name: '电源滤波电容', nameEn: 'Low-ESR Capacitor', category: 'fcesc', label: 2, weight: 4, follow: 'esc',
  description: '并联在电调电源输入端，吸收电机换相与油门突变产生的电压尖峰，保护 MOSFET 与图传，是电源模块的一部分。',
  mount: '焊接于电调前端电源焊盘，平卧于机身前部。', material: '铝电解电容，热缩套管。',
  parameters: [P('容量', '1000 µF'), P('耐压', '35 V', 'ref'), P('类型', '低 ESR 铝电解'), P('作用', '吸收电压尖峰')],
  position: [0, 1.0, -2.55], explode: { stage: 3, pos: [0, 0.2, -1.4], delay: 0.1 } });

/* ---------------- 电源系统 ---------------- */
add({ id: 'battery', code: 'PS-01', name: '6S 锂聚合物电池', nameEn: '6S LiPo Battery Pack', category: 'power', label: 1, kind: 'battery', weight: 205,
  description: '整机唯一能量来源。6 片电芯串联（6S1P），由 XT60 输出至电调。上置安装使重心靠近推力中心。',
  mount: '顶板上方，防滑垫 + 绑带固定。', material: '软包电芯 × 6，PVC 热缩膜外包。',
  parameters: [P('节数', `${SPEC.cells}S1P`), P('标称电压', `${(SPEC.cells * SPEC.cellVoltage).toFixed(1)} V`), P('满电电压', `${(SPEC.cells * 4.2).toFixed(1)} V`, 'ref'), P('容量', `${SPEC.capacityMAh} mAh`, 'edit'),
    P('放电倍率', '120C（标称）', 'ref'), P('尺寸', '75 × 35 × 34 mm'), P('连接器', 'XT60'), P('参考重量', '205 g', 'est')],
  position: [0, LAYOUT.yBattery, 0], explode: { stage: 1, pos: [4.6, 6.2, 0], waypoints: [[0, 6.2, 0], [4.6, 6.2, 0]], window: [0.07, 0.30] } });
add({ id: 'battery-strap', code: 'PS-02', name: '电池绑带', nameEn: 'Battery Strap', category: 'power', label: 2, weight: 3, follow: 'frame-top',
  description: '穿过顶板槽口环绕电池的防滑绑带。拆解时先解开魔术贴搭扣，绑带翻开后电池才能抬起。',
  mount: '顶板绑带槽，环绕电池中部。', material: '尼龙织带 + 硅胶防滑纹 + 金属搭扣。',
  parameters: [P('规格', '20 × 250 mm'), P('材料', '尼龙 / 硅胶', 'ref'), P('数量', '1')],
  position: [0, LAYOUT.yTop, 0], explode: { stage: 1, pos: [0, 0, 0], window: [0, 0.12], custom: 'flap' } });
add({ id: 'battery-pad', code: 'PS-03', name: '电池防滑垫', nameEn: 'Anti-slip Pad', category: 'power', weight: 2, follow: 'frame-top',
  description: '贴于顶板的软橡胶垫，增大摩擦并吸收电池振动，防止撞击时电池滑移。', mount: '顶板上表面。', material: '发泡硅胶橡胶。',
  parameters: [P('厚度', '1.0 mm'), P('尺寸', '33 × 70 mm')],
  position: [0, LAYOUT.yTop + 0.2, 0], explode: { stage: 5, pos: [0, 1.0, 0], delay: 0.08 } });
add({ id: 'xt60', code: 'PS-04', name: 'XT60 电源接口', nameEn: 'XT60 Connector', category: 'power', label: 2, weight: 6,
  description: '电调电源输入引线末端的公头接口，与电池母头对插，额定持续电流 60 A。', mount: '机尾顶板后方，引线自电调后部焊盘引出。',
  material: 'PA 尼龙外壳，镀金铜插针。',
  parameters: [P('额定电流', '60 A 持续', 'ref'), P('线规', '12 AWG'), P('极性', '红 + / 黑 −'), P('类型', '公头（机身侧）')],
  position: [0, 3.82, 5.05], explode: { stage: 6, pos: [0, 1.2, 3.0] } });

/* ---------------- 摄像与图传 ---------------- */
add({ id: 'camera', code: 'CV-01', name: 'FPV 摄像头', nameEn: 'FPV Camera Body', category: 'camvtx', label: 1, kind: 'camera', weight: 7,
  description: '低延迟数字 FPV 摄像头，CMOS 采集画面后通过同轴线送入数字图传。机身两侧螺纹孔用于在侧板上调节倾角。',
  mount: `机头侧板之间，上仰 ${SPEC.camTiltDeg}°。`, material: 'CNC 铝合金外壳，阳极氧化。',
  parameters: [P('尺寸', '19 × 19 mm'), P('传感器', '1/1.8" CMOS', 'ref'), P('视场角', '155° FOV', 'ref'), P('倾角', `${SPEC.camTiltDeg}°`, 'edit'), P('输出', 'MIPI → 图传'), P('参考重量', '7 g', 'est')],
  position: [0, 2.0, -4.55], rotation: [SPEC.camTiltDeg, 0, 0], explode: { stage: 2, pos: [0, 0.8, -4.6], rot: [-SPEC.camTiltDeg, 25, 0], delay: 0.03 } });
add({ id: 'cam-lens', code: 'CV-02', name: '镜头组', nameEn: 'Lens Assembly', category: 'camvtx', label: 2, weight: 2,
  description: '多层镜筒内含多片玻璃镜片与红外截止滤光片，螺纹旋入镜座用于对焦。', mount: '旋入摄像头镜座 M12 螺纹。',
  material: '铝合金镜筒 + 光学玻璃，镀膜呈蓝紫色反射。',
  parameters: [P('接口', 'M12 × 0.5', 'ref'), P('焦距', '2.1 mm', 'ref'), P('光圈', 'F2.0', 'ref'), P('镜片', '6G 玻璃（简化表达）')],
  position: [0, 2.0, -4.55], rotation: [SPEC.camTiltDeg, 0, 0], explode: { stage: 2, pos: [0, 1.4, -8.2], rot: [-SPEC.camTiltDeg, 25, 0], delay: 0.1 } });
add({ id: 'vtx', code: 'CV-03', name: '数字图传', nameEn: 'Digital HD VTX', category: 'camvtx', label: 1, kind: 'vtx', weight: 22,
  description: '将摄像头画面编码压缩后以 5.8 GHz 数字链路发射至眼镜，同时通过 UART 接收飞控 OSD 数据。顶部散热片在高功率下需要气流散热。',
  mount: '机身后部飞塔之后，20 × 20 mm 硅胶减震安装。', material: 'PCB + CNC 铝散热片 + 金属屏蔽罩。',
  parameters: [P('频段', '5.8 GHz'), P('发射功率', '25–700 mW（依法规设置）', 'ref'), P('延迟', '低延迟模式', 'ref'), P('天线接口', 'U.FL / IPEX × 2'), P('供电', '9 V（飞控 BEC）'), P('参考重量', '22 g', 'est')],
  position: [0, 1.55, 2.95], explode: { stage: 3, pos: [0, 1.4, 7.0], waypoints: [[0, 0.2, 0], [0, 0.2, 6.0], [0, 1.4, 7.0]], delay: 0.1 } });

/* ---------------- 天线与接收机 ---------------- */
add({ id: 'vtx-antenna', code: 'RF-01', name: '图传天线', nameEn: 'VTX Antennas', category: 'antrx', label: 1, quantity: 2, weight: 6, follow: 'ant-mount',
  description: '双路圆极化天线用于图传分集发射，外倾安装以降低机身遮挡；馈线为 1.13 mm 同轴线。',
  mount: '后置天线座，左右各一，外倾 25°。', material: 'PC 保护罩 + 镀银铜振子 + 同轴馈线。',
  parameters: [P('频段', '5.8 GHz'), P('极化', 'RHCP'), P('增益', '2.0 dBi', 'ref'), P('长度', '45 mm'), P('接口', 'U.FL')],
  position: [0, 0, 0], explode: { stage: 2, pos: [0, 2.2, 1.6], delay: 0.08 } });
add({ id: 'receiver', code: 'RF-02', name: '接收机', nameEn: 'Radio Receiver', category: 'antrx', label: 2, kind: 'rx', weight: 1.5, follow: 'frame-bottom',
  description: '接收遥控器 2.4 GHz 链路的控制指令，以串行协议送入飞控 UART，并回传遥测信息。',
  mount: '底板后部、图传下方，热缩管包裹后以双面胶固定。', material: 'PCB + 热缩管。',
  parameters: [P('频段', '2.4 GHz'), P('协议', '串行 RX（UART）', 'ref'), P('遥测', '支持'), P('尺寸', '11 × 16 mm'), P('绑定状态', '未配置', 'unk')],
  position: [0, 0.45, 2.8], explode: { stage: 6, pos: [0, 0.9, 4.0] } });
add({ id: 'rx-antenna', code: 'RF-03', name: '接收机天线', nameEn: 'RX Antennas', category: 'antrx', label: 2, quantity: 2, weight: 1,
  description: '两根 T 型偶极子天线沿后机臂走线并用扎带固定，正交布置以减少极化损失。', mount: '左后与右后机臂上方，各 2 条扎带。',
  material: 'PTFE 同轴线 + 热缩保护管 + 尼龙扎带。',
  parameters: [P('类型', 'T 型偶极子'), P('数量', '2'), P('扎带', '4 条'), P('长度', '≈ 70 mm')],
  position: [0, 0, 0], explode: { stage: 5, pos: [0, 1.0, 2.8], delay: 0 } });

/* ---------------- 线缆与紧固件 ---------------- */
add({ id: 'harness-motor', code: 'WF-01', name: '电机相线', nameEn: 'Motor Phase Wires', category: 'wiring', quantity: 12, weight: 6,
  description: '每台电机 3 根相线，由电调四角输出焊盘沿机臂引出。线缆为曲线生成，并随端点位置实时重建。',
  mount: '电调四角 → 沿机臂上表面 → 电机底座。', material: '20 AWG 硅胶线 + 热缩套管。',
  parameters: [P('线规', '20 AWG'), P('数量', '4 × 3'), P('走线', '随动端点（实时重建）')], position: [0, 0, 0] });
add({ id: 'harness-signal', code: 'WF-02', name: '信号线束', nameEn: 'Signal Harness', category: 'wiring', quantity: 4, weight: 2,
  description: '包含飞控—电调 8P 排线、摄像头—图传同轴线、图传—飞控 UART 线、接收机—飞控串口线。',
  mount: '机身内部，飞塔与前后模块之间。', material: '28–30 AWG 硅胶排线，JST-SH 1.0 mm 端子。',
  parameters: [P('飞控-电调', '8P JST-SH'), P('摄像头-图传', '同轴 MIPI 线'), P('图传-飞控', '6P UART'), P('接收机-飞控', '4P UART')], position: [0, 0, 0] });
add({ id: 'harness-power', code: 'WF-03', name: '电源引线', nameEn: 'Power Leads', category: 'wiring', quantity: 2, weight: 8,
  description: '电调后部电源焊盘引至 XT60 公头的 12 AWG 主电源线（红 +，黑 −）。', mount: '电调后部焊盘 → 机身侧面 → 机尾 XT60。',
  material: '12 AWG 高股数硅胶线。', parameters: [P('线规', '12 AWG'), P('长度', '≈ 90 mm'), P('极性', '红 + / 黑 −')], position: [0, 0, 0] });
add({ id: 'harness-rf', code: 'WF-04', name: '射频馈线', nameEn: 'RF Coax Feeders', category: 'wiring', quantity: 4, weight: 1,
  description: '图传与接收机的 U.FL 同轴馈线，最小弯曲半径约 5 mm。', mount: '图传 / 接收机 → 天线根部。', material: '1.13 mm 同轴线。',
  parameters: [P('线径', '1.13 mm'), P('接口', 'U.FL / IPEX'), P('数量', '4')], position: [0, 0, 0] });
add({ id: 'fasteners-top', code: 'WF-05', name: '顶板紧固件', nameEn: 'Top Fasteners', category: 'wiring', quantity: 4, weight: 2, follow: 'frame-top',
  description: '顶板与立柱连接的 M3 杯头螺丝和垫片（InstancedMesh 实例化渲染）。', mount: '顶板四角。', material: '12.9 级合金钢，黑色氧化。',
  parameters: [P('规格', 'M3 × 6 mm 杯头'), P('数量', '4 + 4 垫片'), P('扭矩', '0.6 N·m', 'ref')],
  position: [0, LAYOUT.yTop, 0], explode: { stage: 5, pos: [0, 1.4, 0], delay: 0.1 } });
add({ id: 'fasteners-bottom', code: 'WF-06', name: '底板与飞塔紧固件', nameEn: 'Bottom & Stack Fasteners', category: 'wiring', quantity: 12, weight: 6, follow: 'frame-bottom',
  description: '底板—立柱螺丝、机臂夹紧螺丝及贯穿飞塔的 M3 长螺丝（InstancedMesh 实例化渲染）。', mount: '底板下表面。', material: '12.9 级合金钢 / 钛合金。',
  parameters: [P('立柱螺丝', 'M3 × 6 × 4'), P('机臂螺丝', 'M3 × 10 × 8'), P('飞塔螺丝', 'M3 × 25 × 4'), P('数量', '16')],
  position: [0, 0, 0], explode: { stage: 5, pos: [0, -1.8, 0], delay: 0 } });
add({ id: 'motor-screws', code: 'WF-09', name: '电机固定螺丝', nameEn: 'Motor Mount Screws', category: 'wiring', quantity: 16, weight: 3,
  description: '自机臂底部穿入电机底座的 M3 螺丝，每台电机 4 颗（InstancedMesh 实例化渲染）。拆解时先向下退出，电机才能抬离机臂。',
  mount: '四根机臂末端下表面。', material: '12.9 级合金钢，黑色氧化。',
  parameters: [P('规格', 'M3 × 8 mm 杯头'), P('数量', '4 × 4'), P('注意', '螺丝过长会顶伤定子绕组', 'ref')],
  position: [0, 0, 0], explode: { stage: 4, pos: [0, -1.6, 0], delay: 0 } });
add({ id: 'buzzer', code: 'WF-07', name: '蜂鸣器', nameEn: 'Buzzer', category: 'wiring', label: 2, weight: 1.5, follow: 'frame-bottom',
  description: '有源 5 V 蜂鸣器，用于解锁提示、低电压报警与坠机寻机。', mount: '底板前部，引线接入飞控 BZ 焊盘。', material: '塑料壳体 + 压电片。',
  parameters: [P('电压', '5 V'), P('声压', '≈ 85 dB', 'ref'), P('尺寸', 'Ø 9 × 5.5 mm')], position: [0, 0.25, -3.45], explode: { stage: 6, pos: [0, -1.0, -1.6] } });
add({ id: 'led', code: 'WF-08', name: 'LED 状态灯条', nameEn: 'LED Status Strip', category: 'wiring', label: 2, weight: 1, follow: 'ant-mount',
  description: '机尾可编程 RGB 灯条，显示解锁、飞行模式与低电量状态，方便定位机身朝向。', mount: '后置天线座背面。', material: 'FPC + WS2812 风格 LED + 透明硅胶。',
  parameters: [P('数量', '4 颗'), P('类型', '可寻址 RGB', 'ref'), P('电压', '5 V')], position: [0, 0.95, 4.86], explode: { stage: 6, pos: [0, -1.0, 1.2] } });

export const PARTS = parts;
export const PART_MAP = Object.fromEntries(parts.map((p) => [p.id, p]));
export const GROUPS = { motor: '无刷电机 2207 ×4', prop: '5 寸三叶桨 ×4', arm: '碳纤维机臂 ×4' };

// 连接关系（根据演示结构定义）
export const LINKS = [
  { from: 'battery', to: 'xt60', type: 'power', name: '电池 → XT60' },
  { from: 'xt60', to: 'power-cap', type: 'power', name: 'XT60 → 电源模块' },
  { from: 'power-cap', to: 'esc', type: 'power', name: '电源模块 → 电调' },
  ...['fl', 'fr', 'rl', 'rr'].map((k) => ({ from: 'esc', to: `motor-${k}`, type: 'motor', name: `电调 → ${motorNames[k]}电机` })),
  { from: 'fc', to: 'esc', type: 'signal', name: '飞控 → 电调信号' },
  { from: 'esc', to: 'fc', type: 'power', name: '电调 BEC → 飞控', hidden: true },
  { from: 'camera', to: 'vtx', type: 'signal', name: '摄像头 → 图传' },
  { from: 'vtx', to: 'vtx-antenna', type: 'rf', name: '图传 → 天线' },
  { from: 'receiver', to: 'fc', type: 'signal', name: '接收机 → 飞控' },
  { from: 'receiver', to: 'rx-antenna', type: 'rf', name: '接收机 → 天线' },
  { from: 'fc', to: 'vtx', type: 'signal', name: '飞控 OSD → 图传' },
  { from: 'fc', to: 'buzzer', type: 'signal', name: '飞控 → 蜂鸣器' },
  { from: 'fc', to: 'led', type: 'signal', name: '飞控 → LED' },
];
// 由 LINKS 派生 connections 字段，保证一致
for (const p of parts) p.connections = [];
for (const l of LINKS) {
  if (!PART_MAP[l.from].connections.includes(l.to)) PART_MAP[l.from].connections.push(l.to);
  if (!PART_MAP[l.to].connections.includes(l.from)) PART_MAP[l.to].connections.push(l.from);
}
// 统一结构字段：initialTransform / explodedTransform
for (const p of parts) {
  p.initialTransform = { position: [...p.position], rotation: [...p.rotation] };
  const e = p.explode || { stage: 0, pos: [0, 0, 0] };
  if (e.waypoints) e.pos = e.waypoints[e.waypoints.length - 1];
  p.explodedTransform = {
    position: p.position.map((v, i) => +(v + e.pos[i]).toFixed(3)),
    rotation: p.rotation.map((v, i) => v + ((e.rot && e.rot[i]) || 0)),
    stage: e.stage, path: e.path || 'linear',
  };
}
