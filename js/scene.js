// 渲染器、相机、灯光、环境贴图、渐隐网格地面、展示台与阴影
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const MAX_DPR = 2;

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x070d18, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x070d18, 60, 140);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(renderer), 0.04);
  scene.environment = envRT.texture; scene.environmentIntensity = 0.75;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
  camera.position.set(22, 16, 26);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 4.2, 0);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 4; controls.maxDistance = 90;
  controls.maxPolarAngle = Math.PI - 0.05;
  controls.screenSpacePanning = true;
  controls.autoRotateSpeed = 0.8;

  // 灯光：半球环境光 + 主光（投影）+ 轮廓补光
  scene.add(new THREE.HemisphereLight(0xbcd7ff, 0x0b1220, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(14, 26, 12); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera; sc.left = -18; sc.right = 18; sc.top = 18; sc.bottom = -18; sc.near = 1; sc.far = 70;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key); scene.add(key.target);
  const rim = new THREE.DirectionalLight(0x39d0ff, 1.1); rim.position.set(-18, 10, -16); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffe2c4, 0.45); fill.position.set(-10, 6, 18); scene.add(fill);

  // 网格地面（着色器，按距离渐隐）
  const gridMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uColor: { value: new THREE.Color(0x2aa7c9) }, uFade: { value: 46.0 }, uOpacity: { value: 1.0 } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uFade; uniform float uOpacity; varying vec3 vW;
      float line(float s){ vec2 c = vW.xz / s; vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c); return 1.0 - min(min(g.x, g.y), 1.0); }
      void main(){ float d = length(vW.xz); float f = 1.0 - smoothstep(uFade * 0.25, uFade, d);
        float a = line(1.0) * 0.16 + line(5.0) * 0.38; if (a * f < 0.003) discard;
        gl_FragColor = vec4(uColor, a * f * uOpacity); }`,
    extensions: { derivatives: true },
  });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), gridMat);
  grid.rotation.x = -Math.PI / 2; grid.position.y = -0.01; grid.renderOrder = -1; scene.add(grid);

  // 展示台
  const platform = new THREE.Group(); platform.name = 'DisplayPlatform';
  const pm = new THREE.MeshStandardMaterial({ color: 0x0f1a2c, roughness: 0.55, metalness: 0.6 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(15, 15.6, 0.6, 96), pm); top.position.y = 0.3; top.receiveShadow = true; platform.add(top);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(15.05, 0.07, 8, 128), new THREE.MeshBasicMaterial({ color: 0x30d5f2 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.61; platform.add(ring);
  const inner = new THREE.Mesh(new THREE.RingGeometry(9.6, 9.7, 96), new THREE.MeshBasicMaterial({ color: 0x1f6f88, transparent: true, opacity: 0.6 }));
  inner.rotation.x = -Math.PI / 2; inner.position.y = 0.605; platform.add(inner);
  scene.add(platform);

  function resize() {
    const p = canvas.parentElement; const w = Math.max(1, p.clientWidth), h = Math.max(1, p.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  return { renderer, scene, camera, controls, grid, platform, key, envRT, resize };
}
