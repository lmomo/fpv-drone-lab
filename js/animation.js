// 补间系统 + 拆解控制器 + 动画状态机
import * as THREE from 'three';
import { PARTS, PART_MAP, STAGE_START, STAGE_LEN, stageEnd } from './data.js';
import { D2R } from './model/util.js';

export const ease = {
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  linear: (t) => t,
};

// 通道化补间：同一通道的新补间会替换旧补间（处理动画中断）
export class Tweens {
  constructor() { this.map = new Map(); }
  to(channel, { from, to, duration, easing = ease.inOutCubic, onUpdate, onDone }) {
    this.cancel(channel);
    const tw = { from, to, duration: Math.max(1, duration), t0: performance.now(), easing, onUpdate, onDone, paused: false, elapsed: 0 };
    this.map.set(channel, tw); if (duration <= 0) { onUpdate(to); this.map.delete(channel); onDone && onDone(); }
    return tw;
  }
  cancel(channel) { this.map.delete(channel); }
  has(channel) { return this.map.has(channel); }
  get(channel) { return this.map.get(channel); }
  update(now) {
    for (const [ch, tw] of [...this.map]) {
      if (tw.paused) { tw.t0 = now - tw.elapsed; continue; }
      tw.elapsed = now - tw.t0; const k = Math.min(1, tw.elapsed / tw.duration);
      tw.onUpdate(tw.from + (tw.to - tw.from) * tw.easing(k));
      if (k >= 1 && this.map.get(ch) === tw) { this.map.delete(ch); tw.onDone && tw.onDone(); }
    }
  }
}

const smooth = (t) => t * t * (3 - 2 * t);

export class ExplodeController {
  constructor(drone, onChange) {
    this.drone = drone; this.onChange = onChange;
    this.g = 0;                       // 全局拆解进度 0..1
    this.single = {};                 // 单部件拆解系数
    this.dirty = true;
    this.items = PARTS.map((p) => {
      const obj = drone.parts[p.id]; const e = p.explode;
      const it = { id: p.id, obj, data: p, follow: p.follow, init: obj.userData.initPos.clone(), initQ: obj.userData.initQuat.clone(), offset: new THREE.Vector3() };
      if (e) {
        const w = e.window || [(e.stage - 1) * STAGE_START + (e.delay || 0), (e.stage - 1) * STAGE_START + (e.delay || 0) + STAGE_LEN];
        it.window = [Math.max(0, w[0]), Math.min(1, w[1])];
        it.delta = new THREE.Vector3(...e.pos);
        it.waypoints = e.waypoints ? [new THREE.Vector3(), ...e.waypoints.map((a) => new THREE.Vector3(...a))] : null;
        if (it.waypoints) { let L = 0; it.cum = [0]; for (let i = 1; i < it.waypoints.length; i++) { L += it.waypoints[i].distanceTo(it.waypoints[i - 1]); it.cum.push(L); } it.len = L; }
        it.deltaQ = e.rot ? new THREE.Quaternion().setFromEuler(new THREE.Euler(e.rot[0] * D2R, e.rot[1] * D2R, e.rot[2] * D2R)) : null;
        it.custom = e.custom ? drone.ctx.custom[p.id] : null;
        it.stage = e.stage;
      }
      return it;
    });
    this.byId = Object.fromEntries(this.items.map((i) => [i.id, i]));
    // 跟随顺序：被跟随者优先
    this.order = [...this.items].sort((a, b) => this.depth(a) - this.depth(b));
  }
  depth(it) { let d = 0, c = it; while (c && c.follow) { d++; c = this.byId[c.follow]; } return d; }
  localFactor(it) {
    if (!it.window) return 0;
    const [a, b] = it.window; const t = Math.min(1, Math.max(0, (this.g - a) / (b - a)));
    return smooth(t);
  }
  factor(id) { const it = this.byId[id]; return Math.max(this.localFactor(it), this.single[id] || 0); }
  setProgress(g) { this.g = Math.min(1, Math.max(0, g)); this.apply(); }
  setSingle(id, v) { this.single[id] = v; this.apply(); }
  apply() {
    const tmp = new THREE.Vector3(), q = new THREE.Quaternion();
    for (const it of this.order) {
      const f = it.window ? this.factor(it.id) : 0;
      it.offset.set(0, 0, 0);
      if (it.window && f > 0) {
        if (it.waypoints) {
          const d = f * it.len; let i = 1; while (i < it.cum.length - 1 && it.cum[i] < d) i++;
          const seg = it.cum[i] - it.cum[i - 1] || 1, t = Math.min(1, Math.max(0, (d - it.cum[i - 1]) / seg));
          it.offset.lerpVectors(it.waypoints[i - 1], it.waypoints[i], t);
        } else it.offset.copy(it.delta).multiplyScalar(f);
      }
      if (it.follow) it.offset.add(this.byId[it.follow].offset);
      it.obj.position.copy(tmp.copy(it.init).add(it.offset));
      if (it.deltaQ) { q.copy(it.initQ).multiply(it.deltaQ); it.obj.quaternion.slerpQuaternions(it.initQ, q, f); }
      if (it.custom) it.custom(f);
      it.exploded = f > 0.02;
    }
    this.dirty = true; this.onChange && this.onChange();
  }
  isExploded(id) { const it = this.byId[id]; return !!(it && it.exploded); }
  hasExplode(id) { return !!this.byId[id]?.window; }
}

// 状态机：assembled / exploded / animating / paused / partSelected / partExploded / customExplode
export const STATE_NAMES = {
  assembled: '已组装', exploded: '已爆炸', animating: '动画中', paused: '已暂停',
  partSelected: '已选中部件', partExploded: '单部件拆解', customExplode: '自定义拆解',
};

export class Animator {
  constructor(explode, onState) {
    this.ex = explode; this.tw = new Tweens(); this.onState = onState;
    this.state = 'assembled'; this.base = 'assembled'; this.selected = null; this.target = 0;
  }
  setState(s) { if (this.state !== s) { this.state = s; this.onState && this.onState(s); } }
  settle() {
    const g = this.ex.g, anySingle = Object.values(this.ex.single).some((v) => v > 0.001);
    let s;
    if (g <= 0.0005 && !anySingle) s = 'assembled';
    else if (g >= 0.9995) s = 'exploded';
    else if (g > 0.0005) s = 'customExplode';
    else s = 'partExploded';
    if (anySingle && g < 0.9995) s = 'partExploded';
    this.base = s;
    if (this.selected && (s === 'assembled')) s = 'partSelected';
    this.setState(s);
  }
  // 平滑插值到某个全局进度（中断安全：总是从当前进度出发）
  animateTo(target, speed = 1) {
    const from = this.ex.g; this.target = target;
    const dist = Math.abs(target - from); if (dist < 1e-4) { this.ex.setProgress(target); this.settle(); return; }
    this.setState('animating');
    this.tw.to('global', { from, to: target, duration: (600 + 4200 * dist) / speed, easing: dist > 0.5 ? ease.inOutCubic : ease.outCubic,
      onUpdate: (v) => this.ex.setProgress(v), onDone: () => this.settle() });
  }
  jumpTo(g) { this.tw.cancel('global'); this.ex.setProgress(g); this.settle(); }
  isPlaying() { const t = this.tw.get('global'); return !!t && !t.paused; }
  pause() { const t = this.tw.get('global'); if (t && !t.paused) { t.paused = true; this.setState('paused'); } }
  resume() { const t = this.tw.get('global'); if (t && t.paused) { t.paused = false; this.setState('animating'); return true; } return false; }
  togglePlay() {
    if (this.resume()) return;
    if (this.isPlaying()) return this.pause();
    this.animateTo(this.ex.g >= 0.999 ? 0 : 1, 0.75);
  }
  currentStage() { const g = this.ex.g; let n = 0; for (let i = 1; i <= 6; i++) if (g >= stageEnd(i) - 1e-3) n = i; return n; }
  stepForward() { const n = this.currentStage(); if (n < 6) this.animateTo(stageEnd(n + 1), 1.4); }
  stepBack() { const g = this.ex.g; let n = this.currentStage(); if (g > stageEnd(n) + 1e-3) this.animateTo(stageEnd(n), 1.4); else this.animateTo(n <= 1 ? 0 : stageEnd(n - 1), 1.4); }
  toStage(n) { this.animateTo(n <= 0 ? 0 : stageEnd(n), 1.2); }
  singleExplode(id, on) {
    const from = this.ex.single[id] || 0;
    this.tw.to('single:' + id, { from, to: on ? 1 : 0, duration: 750, onUpdate: (v) => this.ex.setSingle(id, v), onDone: () => this.settle() });
    this.setState('animating');
  }
  restoreAll() {
    for (const id of Object.keys(this.ex.single)) if (this.ex.single[id] > 0) this.singleExplode(id, false);
    this.animateTo(0, 1.2);
  }
  update(now) { this.tw.update(now); }
}
