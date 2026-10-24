// 应用入口：组装场景、模型、交互、标签、连接线与界面，并驱动渲染循环
import * as THREE from 'three';
import { createScene } from './scene.js';
import { buildDrone } from './model/builder.js';
import { ExplodeController, Animator } from './animation.js';
import { Interaction, VIEWS, MODE_NAMES } from './interaction.js';
import { Labels } from './labels.js';
import { Connections } from './connections.js';
import { UI } from './ui.js';
import { PARTS, PART_MAP } from './data.js';

function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(window.WebGL2RenderingContext && c.getContext('webgl2')) || !!c.getContext('webgl'); } catch { return false; }
}

class App {
  constructor() {
    const canvas = document.getElementById('scene');
    this.view = createScene(canvas);
    this.drone = buildDrone();
    this.view.scene.add(this.drone.root);
    this.spin = true; this.spinSpeed = 1; this.selKey = null; this.viewName = 'default';
    this.explode = new ExplodeController(this.drone, () => { this.dirtyGeo = true; });
    this.anim = new Animator(this.explode, () => { this.ui && (this.ui.syncControls(), this.ui.syncList()); this.detailDirty = true; });
    this.inter = new Interaction(this);
    this.labels = new Labels(this);
    this.conns = new Connections(this);
    this.ui = new UI(this);
    this.onVisibilityChanged = () => { this.dirtyGeo = true; this.ui?.syncList(); };
    this.view.resize();
    window.addEventListener('resize', () => this.view.resize());
    new ResizeObserver(() => this.view.resize()).observe(canvas.parentElement);
    this.explode.setProgress(0); this.conns.update(true);
    this.ui.syncControls(); this.ui.syncList();
    this.clock = new THREE.Clock();
    this.loop = this.loop.bind(this); this.view.renderer.setAnimationLoop(this.loop);
    window.addEventListener('beforeunload', () => this.dispose());
  }
  select(target, opts = {}) {
    this.lastSelFrom = opts.from;
    let ids = [], key = null;
    if (target && target.startsWith('group:')) { key = target; ids = PARTS.filter((p) => p.group === target.slice(6)).map((p) => p.id); }
    else if (target) {
      if (opts.additive && this.inter.selected.length && !this.selKey?.startsWith('group:')) {
        const s = new Set(this.inter.selected); s.has(target) ? s.delete(target) : s.add(target); ids = [...s];
      } else ids = [target];
      key = ids.length === 1 ? ids[0] : null;
    }
    this.selKey = key; this.anim.selected = ids.length ? ids : null;
    this.inter.setSelected(ids);
    this.anim.settle();
    this.ui.renderDetail(); this.ui.syncList(); this.ui.syncControls(); this.conns.update(false);
  }
  toggleSingleExplode() {
    let ids = this.inter.selected.filter((i) => this.explode.hasExplode(i)); if (!ids.length) return;
    // 电机拆出时带上对应螺旋桨，避免穿模
    const extra = []; for (const i of ids) if (i.startsWith('motor-')) extra.push(i.replace('motor', 'prop'));
    const on = !ids.every((i) => (this.explode.single[i] || 0) > 0.5);
    for (const i of new Set([...ids, ...extra])) this.anim.singleExplode(i, on);
    this.ui.toast(on ? '单部件拆解' : '部件复位');
    setTimeout(() => this.ui.renderDetail(), 800);
  }
  hideSelected() {
    const ids = this.inter.selected; if (!ids.length) return;
    ids.forEach((i) => (this.inter.userVisible[i] = false));
    this.ui.toast(`已隐藏 ${ids.length} 个部件（“显示全部”可恢复）`);
    this.select(null);
  }
  setView(name) {
    const v = VIEWS[name]; if (!v) return; this.viewName = name;
    this.inter.flyTo(new THREE.Vector3(...v.pos), new THREE.Vector3(...v.target));
    document.querySelectorAll('#view-presets .vp-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
    document.getElementById('st-view').textContent = v.name;
  }
  setMode(m) {
    this.inter.setMode(m);
    document.querySelectorAll('#eng-modes .em-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
    if (m === 'interior') this.setView('interior');
    this.ui.toast('视图模式：' + MODE_NAMES[m]); this.detailDirty = true;
  }
  loop() {
    const dt = Math.min(0.05, this.clock.getDelta()), now = performance.now();
    this.anim.update(now);
    // 螺旋桨演示：拆解开始后平滑停转
    const want = this.spin && this.explode.g < 0.02 && !Object.values(this.explode.single).some((v) => v > 0.01) ? 1 : 0;
    this.spinSpeed += (want - this.spinSpeed) * Math.min(1, dt * 2.5);
    for (const s of this.drone.ctx.spinners) {
      s.obj.rotation.y += s.dir * this.spinSpeed * dt * (s.blur ? 38 : 38);
      if (s.blur) s.blur.material.opacity = Math.max(0, (this.spinSpeed - 0.35) / 0.65) * 0.55;
    }
    const t = now / 1000; for (const l of this.drone.ctx.statusLeds) l.material.emissiveIntensity = 1.2 + Math.sin(t * 3) * 0.8;
    // 网格随相机仰角/距离渐隐
    const cam = this.view.camera; const below = cam.position.y < 0.5;
    this.view.grid.material.uniforms.uOpacity.value += ((below ? 0 : 1) - this.view.grid.material.uniforms.uOpacity.value) * 0.1;
    this.view.controls.update();
    if (this.dirtyGeo) { this.drone.cables.update(); this.conns.update(true); this.dirtyGeo = false; }
    if (this.detailDirty && !this.anim.isPlaying()) { this.detailDirty = false; if (!this.inter.selected.length) this.ui.renderDetail(); }
    this.view.renderer.render(this.view.scene, cam);
    this.labels.update();
    if (this.explode.dirty) { this.explode.dirty = false; this.ui.syncControls(); this._listTick = (this._listTick || 0) + 1; if (this._listTick % 10 === 0) this.ui.syncList(); }
  }
  dispose() {
    this.view.renderer.setAnimationLoop(null);
    this.drone.cables.dispose();
    this.view.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => { for (const k in x) if (x[k]?.isTexture) x[k].dispose(); x.dispose(); }); });
    this.view.envRT.dispose(); this.view.renderer.dispose();
  }
}

try {
  if (!webglAvailable()) {
    window.__fpvFail('WebGL 不可用', '当前浏览器或显卡环境未启用 WebGL。请使用最新版 Chrome / Edge，并在 设置 → 系统 中开启“使用图形加速”。');
  } else {
    const app = new App();
    window.__fpvApp = app; window.__fpvBoot.ok = true;
    requestAnimationFrame(() => document.getElementById('loader').classList.add('done'));
  }
} catch (err) {
  console.error(err);
  window.__fpvBoot.ok = true;
  window.__fpvFail('初始化失败', String(err && err.stack || err));
}
