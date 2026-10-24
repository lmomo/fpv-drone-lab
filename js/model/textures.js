// 程序化 Canvas 纹理（无外部纹理文件）
import * as THREE from 'three';

function canvasTex(w, h, draw, { srgb = true, repeat = [1, 1] } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 3K 2×2 斜纹碳纤维
export function carbonTexture() {
  const cell = 16, n = 32;
  const draw = (g, w, h, rough) => {
    g.fillStyle = rough ? '#8a8a8a' : '#17191d'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const horiz = ((i + j) >> 1) % 2 === 0; // 2x2 twill
      const x = i * cell, y = j * cell;
      const grad = horiz ? g.createLinearGradient(x, y, x, y + cell) : g.createLinearGradient(x, y, x + cell, y);
      if (rough) { grad.addColorStop(0, '#9a9a9a'); grad.addColorStop(.5, '#6a6a6a'); grad.addColorStop(1, '#9a9a9a'); }
      else { grad.addColorStop(0, '#121418'); grad.addColorStop(.5, horiz ? '#3a3f47' : '#2b2f36'); grad.addColorStop(1, '#121418'); }
      g.fillStyle = grad; g.fillRect(x + .5, y + .5, cell - 1, cell - 1);
      g.strokeStyle = rough ? 'rgba(120,120,120,.5)' : 'rgba(255,255,255,.035)'; g.lineWidth = 1;
      for (let k = 2; k < cell; k += 3) { g.beginPath(); if (horiz) { g.moveTo(x, y + k); g.lineTo(x + cell, y + k); } else { g.moveTo(x + k, y); g.lineTo(x + k, y + cell); } g.stroke(); }
    }
  };
  const map = canvasTex(512, 512, (g, w, h) => draw(g, w, h, false), { repeat: [0.14, 0.14] });
  const rough = canvasTex(512, 512, (g, w, h) => draw(g, w, h, true), { srgb: false, repeat: [0.14, 0.14] });
  return { map, rough };
}

// PCB：基板 + 走线 + 过孔
export function pcbTexture(base = '#0f2a1f', trace = '#1d4d38', seed = 1) {
  let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.strokeStyle = trace; g.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      g.lineWidth = rnd() < .2 ? 5 : 2;
      let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 4; k++) { if (rnd() < .5) x += (rnd() - .5) * 180; else y += (rnd() - .5) * 180; g.lineTo(x, y); if (rnd() < .4) { x += 30; y += 30; g.lineTo(x, y); } }
      g.stroke();
    }
    for (let i = 0; i < 120; i++) { const x = rnd() * w, y = rnd() * h; g.fillStyle = '#b89b52'; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); g.fillStyle = base; g.beginPath(); g.arc(x, y, 1.3, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(230,235,240,.55)'; g.lineWidth = 2; g.strokeRect(14, 14, w - 28, h - 28);
  });
}

// 电池热缩膜：规格图形标识（不含品牌）
export function batteryTexture(capacity = 1300, cells = 6) {
  return canvasTex(1024, 512, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#1b2331'); grd.addColorStop(1, '#121822');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f0a540'; g.fillRect(0, h * .72, w, 10);
    g.fillStyle = 'rgba(63,211,230,.85)'; g.fillRect(60, 90, 8, 150);
    g.fillStyle = '#e6eef8'; g.font = '700 120px Inter, Arial, sans-serif'; g.fillText(`${cells}S`, 90, 200);
    g.font = '600 64px Inter, Arial, sans-serif'; g.fillText(`${capacity} mAh`, 310, 160);
    g.fillStyle = '#8ea0b8'; g.font = '500 40px Inter, Arial, sans-serif'; g.fillText(`${(cells * 3.7).toFixed(1)} V · LiPo`, 312, 225);
    g.font = '500 30px monospace'; g.fillStyle = '#5b6b82'; g.fillText('DEMO PACK · 结构展示用', 64, h * .9);
    // 电芯指示格
    for (let i = 0; i < cells; i++) { g.strokeStyle = '#3fd3e6'; g.lineWidth = 3; g.strokeRect(700 + i * 46, 300, 36, 60); g.fillStyle = 'rgba(63,211,230,.6)'; g.fillRect(705 + i * 46, 315, 26, 40); }
  });
}

export function rubberTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#1a1c20'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#25282e';
    for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < w; x += 16) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
  }, { repeat: [3, 6] });
}

export function strapTexture() {
  return canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#1b1e24'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c47f25'; g.fillRect(4, 0, 4, h); g.fillRect(w - 8, 0, 4, h);
    g.strokeStyle = 'rgba(255,255,255,.05)'; for (let y = 0; y < h; y += 3) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  }, { repeat: [1, 4] });
}

export function braidTexture() {
  return canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#15171b'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2c3038'; g.lineWidth = 3;
    for (let i = -64; i < 128; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke(); g.beginPath(); g.moveTo(i + 64, 0); g.lineTo(i, 64); g.stroke(); }
  }, { repeat: [12, 1] });
}

export function radialTexture(inner = 'rgba(255,255,255,.5)', outer = 'rgba(255,255,255,0)') {
  return canvasTex(256, 256, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, w * 0.08, w / 2, w / 2, w / 2);
    r.addColorStop(0, outer); r.addColorStop(.25, inner); r.addColorStop(.9, 'rgba(255,255,255,.12)'); r.addColorStop(1, outer);
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
}
