/* =========================================================================
   垂城 / VERTICAL PLANET — OEKUMENE-09
   A fully self-contained, procedurally modelled voxel megacity.
   Every visible building is generated from its own seed and lot program.
   Static geometry is merged into spatial chunks for real-time performance.
   ========================================================================= */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Utilities                                                          */
  /* ------------------------------------------------------------------ */
  const $ = (id) => document.getElementById(id);
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const worldRng = mulberry32(0x9e3779b9);
  const rand = (a = 0, b = 1) => a + (b - a) * worldRng();
  const randi = (a, b) => Math.floor(rand(a, b + 0.999999));
  const chance = (p) => worldRng() < p;
  const pick = (arr) => arr[Math.floor(worldRng() * arr.length)];
  const fmtAlt = (v) => (v < 0 ? '-' : '+') + Math.abs(Math.round(v)).toString().padStart(4, '0');
  const fmtInt = (v) => (v < 0 ? '-' : '+') + Math.abs(Math.round(v)).toString().padStart(4, '0');

  function safeGet(obj, key, fallback) {
    return obj[key] === undefined ? fallback : obj[key];
  }

  function hexColor(hex) {
    return new THREE.Color(hex);
  }
  const colorCache = new Map();
  function cachedColor(hex) {
    let c = colorCache.get(hex);
    // THREE.Color in this build keeps sRGB components verbatim; vertex and
    // instance colors are consumed as linear values, so convert explicitly.
    if (!c) { c = new THREE.Color(hex).convertSRGBToLinear(); colorCache.set(hex, c); }
    return c;
  }

  function colorScale(hex, factor, jitter = 0) {
    const c = cachedColor(hex);
    const j = jitter ? (0.94 + worldRng() * 0.12) : 1;
    return [clamp(c.r * factor * j, 0, 1), clamp(c.g * factor * j, 0, 1), clamp(c.b * factor * j, 0, 1)];
  }

  function pushLog(text) {
    const el = $('boot-log');
    if (!el) return;
    const d = document.createElement('div');
    d.textContent = text;
    el.appendChild(d);
    while (el.children.length > 3) el.removeChild(el.firstChild);
  }

  let bootProgress = 0;
  function progress(p, status, log) {
    bootProgress = Math.max(bootProgress, p);
    const pct = String(Math.round(bootProgress * 100)).padStart(3, '0') + '%';
    $('boot-pct').textContent = pct;
    $('boot-progress').style.width = (bootProgress * 100) + '%';
    if (status) $('boot-status').textContent = status;
    if (log) pushLog(log);
  }

  const yieldFrame = () => new Promise((resolve) => setTimeout(resolve, 0));

  /* ------------------------------------------------------------------ */
  /* City constants                                                     */
  /* ------------------------------------------------------------------ */
  const PIT = {
    x1: -255, x2: 255,
    z1: -690, z2: 570,
    top: 0, bottom: -1000,
  };
  const CITY_RADIUS = 1220;
  const BLOCK = 128;
  const ROAD_W = 24;
  const START_POS = new THREE.Vector3(790, 780, 1080);
  const START_TARGET = new THREE.Vector3(-40, 120, -230);

  const DOM = {
    webgl: $('webgl'),
    intro: $('intro'),
    help: $('help-modal'),
    transport: $('transport-modal'),
    labels: $('landmark-labels'),
    error: $('error'),
  };

  /* ------------------------------------------------------------------ */
  /* Renderer / scene                                                   */
  /* ------------------------------------------------------------------ */
  let renderer, scene, camera;
  let cameraYaw = 0, cameraPitch = 0;
  let skyMaterial, cloudGroups = [], glowsMesh = null, rainMesh = null;
  let smokeSystem, emberSystem;
  let clock;
  const dynamic = {
    animations: [],
    signs: [],
    traffic: [],
    elevators: [],
    beacons: [],
    clouds: [],
    landmarkPositions: [],
    zones: [],
    water: [],
    smokeEmitters: [],
    flowPaths: [],
    cargoCars: [],
    streetLights: [],
  };

  function initRenderer() {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      // Frames are read back with toDataURL for the promo-film renderer; without
      // this the buffer may be cleared or half-composited when read.
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    // Tone mapping is performed in the post pipeline so HDR values survive
    // into bloom. Direct-render fallback re-enables ACES at runtime.
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.15;
    // A single 2k cascade cannot cover a 1.6 km voxel city without producing
    // speckled shadows, so contact occlusion comes from the SSAO pass instead.
    renderer.shadowMap.enabled = false;
    renderer.autoClear = true;
    renderer.domElement.setAttribute('tabindex', '0');
    renderer.domElement.style.touchAction = 'none';
    DOM.webgl.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070c0e);
    // Fog colour is consumed as a linear value by the shader, so it is authored in
    // sRGB and converted here; skipping this washes the whole skyline grey.
    scene.fog = new THREE.FogExp2(new THREE.Color(0x392c21).convertSRGBToLinear().getHex(), 0.00105);

    camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.35, 12000);
    camera.rotation.order = 'YXZ';
    camera.position.copy(START_POS);
    orientCamera(START_POS, START_TARGET);
    scene.add(camera);
    clock = new THREE.Clock();
  }

  function orientCamera(pos, target) {
    camera.position.copy(pos);
    const dir = target.clone().sub(pos).normalize();
    cameraYaw = Math.atan2(-dir.x, -dir.z);
    cameraPitch = Math.asin(clamp(dir.y, -1, 1));
    camera.rotation.set(cameraPitch, cameraYaw, 0);
  }

  function buildLights() {
    scene.add(new THREE.HemisphereLight(0x5c5d58, 0x2b1c11, 0.38));
    const amb = new THREE.AmbientLight(0x2b2824, 0.32);
    scene.add(amb);

    const key = new THREE.DirectionalLight(0xffb478, 1.05);
    key.name = 'vcKeyLight';
    key.position.set(-720, 1480, -860);
    key.target.position.set(0, 0, 0);
    key.castShadow = false;
    scene.add(key);
    scene.add(key.target);

    const cool = new THREE.DirectionalLight(0x6a9fb4, 0.26);
    cool.position.set(980, 680, 720);
    scene.add(cool);

    const rim = new THREE.DirectionalLight(0x9bb9c6, 0.16);
    rim.position.set(420, 210, -1500);
    scene.add(rim);

    // Viewer-side fill: just enough to read the facades the player faces.
    const fill = new THREE.DirectionalLight(0xd9c8ae, 0.30);
    fill.position.set(380, 620, 1750);
    scene.add(fill);

    const pitLamp = new THREE.PointLight(0xff6b2c, 2.6, 820, 2);
    pitLamp.position.set(0, -820, -60);
    scene.add(pitLamp);
    const pitLamp2 = new THREE.PointLight(0xff9b4d, 2.0, 620, 2);
    pitLamp2.position.set(0, -330, -60);
    scene.add(pitLamp2);
    const pitLamp3 = new THREE.PointLight(0x9fd4d8, 1.5, 660, 2);
    pitLamp3.position.set(0, -620, -60);
    scene.add(pitLamp3);
    const engineLampA = new THREE.PointLight(0xa8d8dc, 2.2, 520, 2);
    engineLampA.position.set(120, -790, 80);
    scene.add(engineLampA);
    const engineLampB = new THREE.PointLight(0xffb070, 1.6, 420, 2);
    engineLampB.position.set(-150, -800, 150);
    scene.add(engineLampB);
    const pitLamp4 = new THREE.PointLight(0xff8f4a, 1.7, 560, 2);
    pitLamp4.position.set(0, -120, -60);
    scene.add(pitLamp4);
    const pitLamp5 = new THREE.PointLight(0x7fffe0, 1.4, 520, 2);
    pitLamp5.position.set(0, -940, -60);
    scene.add(pitLamp5);

    const marketLamp = new THREE.PointLight(0xffb06d, 0.30, 240, 2);
    marketLamp.position.set(356, 30, 738);
    scene.add(marketLamp);
    const marketLamp2 = new THREE.PointLight(0xff8a4a, 0.20, 180, 2);
    marketLamp2.position.set(250, 22, 830);
    scene.add(marketLamp2);
    // Additional strata lighting, so the underground reads as a lit machine world.
    const pitLightSpecs = [
      [0xff8a3d, 2.2, 660, 0, -150, (PIT.z1 + PIT.z2) / 2],
      [0xffa35a, 1.9, 560, -120, -340, (PIT.z1 + PIT.z2) / 2],
      [0x5fdde8, 1.8, 580, 120, -540, (PIT.z1 + PIT.z2) / 2],
      [0xff7a3a, 2.1, 640, -60, -760, (PIT.z1 + PIT.z2) / 2],
      [0x6effd9, 1.7, 540, 80, -920, (PIT.z1 + PIT.z2) / 2],
    ];
    for (const [c, i, d, x, y, z] of pitLightSpecs) {
      const l = new THREE.PointLight(c, i, d, 2);
      l.position.set(x, y, z);
      scene.add(l);
    }

    const soilLamp = new THREE.PointLight(0xcfe8c0, 0.22, 420, 2);
    soilLamp.position.set(520, 980, -430);
    scene.add(soilLamp);
  }

  function buildSky() {
    const skyGeo = new THREE.SphereGeometry(4700, 40, 24);
    skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec3 vWorld;
        void main(){
          vec4 wp = modelMatrix * vec4(position,1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        varying vec3 vWorld;
        float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
        float noise(vec2 p){
          vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
        }
        float fbm(vec2 p){
          float v=0.0, a=0.5;
          for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.03+vec2(13.7,7.1); a*=0.5; }
          return v;
        }
        void main(){
          vec3 dir = normalize(vWorld - cameraPosition);
          float y = dir.y;

          vec3 zenith = vec3(0.0042, 0.0062, 0.0092);
          vec3 mid    = vec3(0.0072, 0.0105, 0.0142);
          vec3 haze   = vec3(0.0230, 0.0215, 0.0200);
          vec3 glow   = vec3(0.0620, 0.0400, 0.0245);

          float up = smoothstep(-0.02, 0.62, y);
          vec3 col = mix(mid, zenith, up);
          float hz = exp(-max(y, 0.0) * 10.0);
          float hz2 = exp(-max(y, 0.0) * 3.0);
          col = mix(col, haze, hz2 * 0.78);
          col = mix(col, glow, hz * 0.72);

          // City light dome: strongest just above the skyline.
          float dome = exp(-max(y, 0.0) * 22.0);
          vec2 dp = vec2(atan(dir.z, dir.x), 0.0);
          float domeNoise = 0.72 + 0.28 * noise(vec2(dp.x * 3.4, uTime * 0.01));
          col += vec3(0.048, 0.028, 0.014) * dome * domeNoise;

          // Smog strata catching the glow.
          vec2 p = dir.xz / (abs(y) + 0.46);
          float n1 = fbm(p * 1.05 + vec2(uTime * 0.0030, -uTime * 0.0016));
          float n2 = fbm(p * 2.7 - vec2(uTime * 0.0048, uTime * 0.0024));
          float strata = smoothstep(0.44, 0.85, n1 * 0.75 + n2 * 0.42);
          float strataMask = smoothstep(-0.01, 0.09, y) * (1.0 - smoothstep(0.16, 0.52, y));
          col += vec3(0.024, 0.0155, 0.0092) * strata * strataMask * 0.85;
          col -= vec3(0.006, 0.007, 0.008) * smoothstep(0.50, 0.90, n2) * strataMask * 0.7;

          // Cloud shelf above the smog, softly lit from below.
          float cloud = smoothstep(0.56, 0.93, n1);
          float cloudMask = smoothstep(0.34, 0.60, y);
          col += vec3(0.0125, 0.0112, 0.0100) * cloud * cloudMask * 0.55;

          // Very sparse stars, heavily attenuated by the haze.
          vec2 sp = dir.xz / (abs(y) + 0.5);
          float starField = hash(floor(sp * 210.0));
          float star = smoothstep(0.9975, 1.0, starField) * smoothstep(0.12, 0.55, y);
          col += vec3(0.30, 0.33, 0.38) * star;

          // Faint moon-side scattering.
          float glowDir = pow(max(dot(dir, normalize(vec3(-0.42, 0.18, -0.88))), 0.0), 12.0);
          col += vec3(0.032, 0.029, 0.025) * glowDir * 0.40;

          col += (hash(dir.xz * 900.0 + uTime * 0.01) - 0.5) * 0.0010;
          float flicker = 0.997 + 0.003 * sin(uTime * 1.7);
          gl_FragColor = vec4(col * flicker, 1.0);
        }
      `,
    });
    const sky = new THREE.Mesh(skyGeo, skyMaterial);
    sky.frustumCulled = false;
    sky.renderOrder = -20;
    scene.add(sky);

    // Faint orbital ring, a dead artificial moon, and its haze.
    const ringPts = [];
    for (let i = 0; i <= 220; i++) {
      const a = (i / 220) * TAU;
      const r = 3450;
      ringPts.push(new THREE.Vector3(Math.cos(a) * r, 1180 + Math.sin(a) * 520, Math.sin(a) * r * 0.72 - 900));
    }
    const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
    const ringLine = new THREE.Line(ringGeo, new THREE.LineBasicMaterial({
      color: 0x66767a, transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    }));
    scene.add(ringLine);

    const moonCanvas = document.createElement('canvas');
    moonCanvas.width = 256; moonCanvas.height = 256;
    const mc = moonCanvas.getContext('2d');
    const grad = mc.createRadialGradient(128, 128, 24, 128, 128, 125);
    grad.addColorStop(0, 'rgba(34,31,27,1)');
    grad.addColorStop(0.66, 'rgba(26,25,23,1)');
    grad.addColorStop(0.88, 'rgba(96,65,42,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    mc.fillStyle = grad; mc.fillRect(0, 0, 256, 256);
    const moonTex = new THREE.CanvasTexture(moonCanvas);
    const moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, color: 0x8d9aa6, transparent: true, opacity: 0.26, depthWrite: false, fog: false }));
    moonSprite.position.set(2340, 1650, -3700);
    moonSprite.scale.set(430, 430, 1);
    scene.add(moonSprite);

    // Low cloud layers visible from the upper city.
    const cloudTex = makeCloudTexture();
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.PlaneGeometry(5600, 5600);
      const mat = new THREE.MeshBasicMaterial({
        map: cloudTex, transparent: true, opacity: 0.10 - i * 0.022,
        depthWrite: false, side: THREE.FrontSide, color: i === 0 ? 0x8a7d6c : 0x8f9aa0,
        blending: THREE.NormalBlending, fog: true
      });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.y = 920 + i * 470;
      m.rotation.z = i * 0.7;
      m.renderOrder = 2;
      scene.add(m);
      cloudGroups.push(m);
      dynamic.clouds.push({ mesh: m, speed: 3 + i * 1.4, phase: i * 1.8 });
    }
  }

  function makeCloudTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 512, 512);
    const rng = mulberry32(5512);
    for (let i = 0; i < 130; i++) {
      const x = rng() * 512, y = rng() * 512, r = 18 + rng() * 92;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const a = 0.018 + rng() * 0.04;
      g.addColorStop(0, 'rgba(178,179,170,' + a + ')');
      g.addColorStop(0.55, 'rgba(112,119,117,' + a * 0.55 + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    // Multiply in a radial falloff so the plane's square border never shows.
    ctx.globalCompositeOperation = 'destination-in';
    const mask = ctx.createRadialGradient(256, 256, 60, 256, 256, 254);
    mask.addColorStop(0, 'rgba(0,0,0,1)');
    mask.addColorStop(0.62, 'rgba(0,0,0,0.72)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mask;
    ctx.fillRect(0, 0, 512, 512);
    ctx.globalCompositeOperation = 'source-over';
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1, 1);
    return tex;
  }

  /* ------------------------------------------------------------------ */
  /* Procedural textures                                                */
  /* ------------------------------------------------------------------ */
  function makeGroundTexture() {
    const size = 1024;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const rng = mulberry32(8221);
    ctx.fillStyle = '#151a1b'; ctx.fillRect(0, 0, size, size);
    // large concrete panels
    for (let y = 0; y < size; y += 128) {
      for (let x = 0; x < size; x += 128) {
        const v = 18 + Math.floor(rng() * 14);
        ctx.fillStyle = 'rgb(' + v + ',' + (v + 3) + ',' + (v + 4) + ')';
        ctx.fillRect(x + 1, y + 1, 126, 126);
        ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2;
        ctx.strokeRect(x + 1.5, y + 1.5, 125, 125);
      }
    }
    // grime and tire streaks
    for (let i = 0; i < 900; i++) {
      const x = rng() * size, y = rng() * size;
      const a = 0.02 + rng() * 0.06;
      ctx.fillStyle = 'rgba(0,0,0,' + a + ')';
      ctx.fillRect(x, y, 2 + rng() * 45, 1 + rng() * 3);
    }
    for (let i = 0; i < 32; i++) {
      ctx.strokeStyle = 'rgba(5,8,8,' + (0.12 + rng() * 0.2) + ')';
      ctx.lineWidth = 4 + rng() * 13;
      ctx.beginPath();
      let x = rng() * size, y = rng() * size;
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + rng() * 120, y + rng() * 70, x + rng() * 180, y - rng() * 60, x + rng() * 260, y + rng() * 120);
      ctx.stroke();
    }
    // oxidized puddles
    for (let i = 0; i < 36; i++) {
      const x = rng() * size, y = rng() * size, r = 8 + rng() * 35;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(25,53,60,.24)');
      g.addColorStop(0.7, 'rgba(16,30,33,.12)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, y, r * 1.4, r * 0.6, rng() * TAU, 0, TAU); ctx.fill();
    }
    // faint hazard paint
    ctx.globalAlpha = 0.17;
    for (let i = 0; i < 7; i++) {
      const x = rng() * size, y = rng() * size;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rng() * TAU);
      for (let s = 0; s < 8; s++) {
        ctx.fillStyle = s % 2 ? '#b77724' : '#1a1b18';
        ctx.fillRect(s * 12, 0, 12, 6);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function makeWallTexture() {
    const size = 1024;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const rng = mulberry32(17401);
    ctx.fillStyle = '#121718'; ctx.fillRect(0, 0, size, size);
    // massive vertical plates
    for (let x = 0; x < size; x += 128) {
      for (let y = 0; y < size; y += 64) {
        const v = 14 + Math.floor(rng() * 18);
        ctx.fillStyle = 'rgb(' + v + ',' + (v + 3) + ',' + (v + 4) + ')';
        ctx.fillRect(x + 1, y + 1, 126, 62);
        ctx.strokeStyle = 'rgba(0,0,0,.48)'; ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, 126, 62);
        if (rng() < 0.18) {
          ctx.fillStyle = 'rgba(115,58,31,.16)';
          ctx.fillRect(x + 20 + rng() * 50, y + 8, 4 + rng() * 40, 46);
        }
      }
    }
    for (let i = 0; i < 550; i++) {
      const x = rng() * size, y = rng() * size;
      const grd = ctx.createLinearGradient(x, y, x, y + 20 + rng() * 140);
      grd.addColorStop(0, 'rgba(20,34,35,.18)');
      grd.addColorStop(1, 'rgba(20,34,35,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(x, y, 1 + rng() * 3, 15 + rng() * 140);
    }
    // pipe shadow lines
    for (let i = 0; i < 12; i++) {
      const x = rng() * size;
      ctx.strokeStyle = 'rgba(0,0,0,.27)'; ctx.lineWidth = 7 + rng() * 10;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + rng() * 20, size); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function makeCityCarpetTexture() {
    const size = 1024;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const rng = mulberry32(44219);
    ctx.clearRect(0, 0, size, size);
    // faint street grid
    ctx.strokeStyle = 'rgba(150,138,120,0.10)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= size; i += 64) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,150,80,0.07)';
    ctx.lineWidth = 6;
    for (let i = 0; i <= size; i += 256) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
    }
    // dense roof and window specks
    for (let i = 0; i < 5200; i++) {
      const x = rng() * size, y = rng() * size;
      const w = 3 + rng() * 13, h = 3 + rng() * 13;
      const v = 18 + rng() * 40;
      ctx.fillStyle = 'rgba(' + Math.round(v * 0.9) + ',' + Math.round(v) + ',' + Math.round(v * 0.95) + ',' + (0.25 + rng() * 0.5) + ')';
      ctx.fillRect(x, y, w, h);
      if (rng() < 0.32) {
        ctx.fillStyle = rng() < 0.6 ? 'rgba(255,168,96,' + (0.35 + rng() * 0.55) + ')' : 'rgba(110,224,230,' + (0.3 + rng() * 0.5) + ')';
        ctx.fillRect(x + 1, y + 1, Math.max(1, w * 0.3), Math.max(1, h * 0.25));
      }
    }
    // industrial glow blooms
    for (let i = 0; i < 90; i++) {
      const x = rng() * size, y = rng() * size, r = 8 + rng() * 40;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,150,80,' + (0.08 + rng() * 0.12) + ')');
      g.addColorStop(1, 'rgba(255,120,50,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    // dark service gaps
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = 'rgba(2,5,6,' + (0.25 + rng() * 0.35) + ')';
      ctx.fillRect(rng() * size, rng() * size, 2 + rng() * 8, 30 + rng() * 170);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  /* ------------------------------------------------------------------ */
  /* Geometry batches                                                   */
  /* ------------------------------------------------------------------ */
  const FACE_DEFS = [
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], shade: 0.92 },
    { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0], shade: 0.70 },
    { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], shade: 0.84 },
    { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], shade: 0.76 },
    { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], shade: 1.16 },
    { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], shade: 0.50 },
  ];

  const _q = new THREE.Quaternion();
  const _v = new THREE.Vector3();
  const _vn = new THREE.Vector3();

  class Batch {
    constructor(isNeon) {
      this.isNeon = isNeon;
      this.pos = [];
      this.nor = [];
      this.col = [];
      this.idx = [];
      this.count = 0;
    }

    addBox(cx, cy, cz, w, h, d, color, options) {
      options = options || {};
      const rotY = safeGet(options, 'rotY', 0);
      const quat = options.quat || null;
      if (rotY) _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      else _q.identity();
      if (quat) _q.copy(quat);
      const hw = w * 0.5, hh = h * 0.5, hd = d * 0.5;
      const skipBottom = safeGet(options, 'skipBottom', true);
      const noFaces = options.noFaces || null;
      const shadeEnabled = safeGet(options, 'shade', true);
      const base = colorScale(color, this.isNeon ? 2.0 : 0.92, 1);
      const dim = safeGet(options, 'dim', 1);

      for (let f = 0; f < 6; f++) {
        if (f === 5 && skipBottom) continue;
        if (noFaces && noFaces.indexOf(f) >= 0) continue;
        const def = FACE_DEFS[f];
        const fac = (shadeEnabled ? def.shade : 1) * dim;
        const cc = [base[0] * fac, base[1] * fac, base[2] * fac];
        const nx = def.n[0], ny = def.n[1], nz = def.n[2];
        const ux = def.u[0], uy = def.u[1], uz = def.u[2];
        const vx = def.v[0], vy = def.v[1], vz = def.v[2];
        const hwN = nx !== 0 ? hw : 0, hhN = ny !== 0 ? hh : 0, hdN = nz !== 0 ? hd : 0;
        const halfU = Math.abs(ux) * hw + Math.abs(uy) * hh + Math.abs(uz) * hd;
        const halfV = Math.abs(vx) * hw + Math.abs(vy) * hh + Math.abs(vz) * hd;
        const start = this.count;
        for (let corner = 0; corner < 4; corner++) {
          const su = (corner === 0 || corner === 3) ? -1 : 1;
          const sv = (corner === 0 || corner === 1) ? -1 : 1;
          const px = nx * hwN + ux * su * halfU + vx * sv * halfV;
          const py = ny * hhN + uy * su * halfU + vy * sv * halfV;
          const pz = nz * hdN + uz * su * halfU + vz * sv * halfV;
          _v.set(px, py, pz).applyQuaternion(_q);
          this.pos.push(cx + _v.x, cy + _v.y, cz + _v.z);
          _vn.set(nx, ny, nz).applyQuaternion(_q);
          if (!this.isNeon) this.nor.push(_vn.x, _vn.y, _vn.z);
          this.col.push(cc[0], cc[1], cc[2]);
        }
        this.idx.push(start, start + 1, start + 2, start, start + 2, start + 3);
        this.count += 4;
      }
    }

    addQuad(cx, cy, cz, u, v, w, h, color, mul) {
      const m = mul === undefined ? 1 : mul;
      const c = colorScale(color, this.isNeon ? m * 2.0 : m * 0.92, 0);
      const ux = u[0], uy = u[1], uz = u[2];
      const vx = v[0], vy = v[1], vz = v[2];
      const hw = w * 0.5, hh = h * 0.5;
      const start = this.count;
      const pts = [
        [-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]
      ];
      for (let i = 0; i < 4; i++) {
        const [su, sv] = pts[i];
        this.pos.push(cx + ux * su + vx * sv, cy + uy * su + vy * sv, cz + uz * su + vz * sv);
        if (!this.isNeon) {
          const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          this.nor.push(nx, ny, nz);
        }
        this.col.push(c[0], c[1], c[2]);
      }
      this.idx.push(start, start + 1, start + 2, start, start + 2, start + 3);
      this.count += 4;
    }

    addBeam(a, b, w, h, color, options) {
      options = options || {};
      const dir = new THREE.Vector3().subVectors(b, a);
      const len = dir.length();
      if (len < 0.001) return;
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
      const mid = a.clone().add(b).multiplyScalar(0.5);
      this.addBox(mid.x, mid.y, mid.z, w, h, len, color, Object.assign({ quat: q, skipBottom: false }, options));
    }

    build() {
      if (!this.count) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
      if (!this.isNeon) g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
      g.setIndex(this.idx);
      g.computeBoundingSphere();
      return g;
    }
  }

  const CHUNK = 420;
  const chunkMap = new Map();
  const glowItems = [];
  const lineVerts = [];
  const staticGroup = new THREE.Group();
  let solidMaterial, neonMaterial;

  function getChunk(x, z) {
    const ix = Math.floor(x / CHUNK), iz = Math.floor(z / CHUNK);
    const key = ix + '|' + iz;
    let c = chunkMap.get(key);
    if (!c) {
      c = { solid: new Batch(false), neon: new Batch(true), key };
      chunkMap.set(key, c);
    }
    return c;
  }
  const SB = (x, z) => getChunk(x, z).solid;
  const NB = (x, z) => getChunk(x, z).neon;

  function addGlow(x, y, z, color, size) {
    glowItems.push({ x, y, z, color, size: (size || 2.2) * 0.72 });
  }

  function addLine(a, b, color, opacity) {
    // Stored as segments and released as one cheap LineSegments object.
    lineVerts.push(a.x, a.y, a.z, b.x, b.y, b.z, color, opacity === undefined ? 1 : opacity);
  }

  function finalizeStaticGeometry() {
    let meshCount = 0;
    for (const [, chunk] of chunkMap) {
      const sg = chunk.solid.build();
      if (sg) {
        const m = new THREE.Mesh(sg, solidMaterial);
        m.frustumCulled = true;
        m.matrixAutoUpdate = false;
        m.updateMatrix();
        staticGroup.add(m);
        meshCount++;
      }
      const ng = chunk.neon.build();
      if (ng) {
        const m = new THREE.Mesh(ng, neonMaterial);
        m.frustumCulled = true;
        m.matrixAutoUpdate = false;
        m.updateMatrix();
        staticGroup.add(m);
        meshCount++;
      }
    }
    scene.add(staticGroup);
    buildGlowCloud();
    buildLineSegments();
    return meshCount;
  }

  function buildGlowCloud() {
    if (!glowItems.length) return;
    const pos = new Float32Array(glowItems.length * 3);
    const col = new Float32Array(glowItems.length * 3);
    const siz = new Float32Array(glowItems.length);
    glowItems.forEach((g, i) => {
      pos[i * 3] = g.x; pos[i * 3 + 1] = g.y; pos[i * 3 + 2] = g.z;
      const c = cachedColor(g.color);
      col[i * 3] = c.r * 2.15; col[i * 3 + 1] = c.g * 2.15; col[i * 3 + 2] = c.b * 2.15;
      siz[i] = g.size;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      uniforms: { uScale: { value: window.innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360)) } },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        varying vec3 vColor;
        uniform float uScale;
        void main(){
          vColor = aColor;
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_PointSize = min(80.0, aSize * uScale / max(1.0,-mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main(){
          vec2 p = gl_PointCoord - 0.5;
          float d = length(p);
          float core = smoothstep(0.5,0.0,d);
          float a = core*core*0.8;
          if(a < 0.01) discard;
          gl_FragColor = vec4(vColor, a);
        }
      `,
    });
    glowsMesh = new THREE.Points(geo, mat);
    glowsMesh.frustumCulled = false;
    glowsMesh.renderOrder = 6;
    scene.add(glowsMesh);
  }

  function buildLineSegments() {
    if (!lineVerts.length) return;
    const pos = [], col = [];
    for (let i = 0; i < lineVerts.length; i += 8) {
      const op = lineVerts[i + 7];
      const c = cachedColor(lineVerts[i + 6]);
      pos.push(lineVerts[i], lineVerts[i + 1], lineVerts[i + 2], lineVerts[i + 3], lineVerts[i + 4], lineVerts[i + 5]);
      for (let k = 0; k < 2; k++) col.push(c.r * op * 0.26, c.g * op * 0.26, c.b * op * 0.26);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.30, blending: THREE.AdditiveBlending, depthWrite: false });
    const lines = new THREE.LineSegments(g, m);
    lines.frustumCulled = false;
    scene.add(lines);
  }

  function buildMaterials() {
    solidMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.0,
      flatShading: true,
      // Industrial surfaces are mostly dielectric (concrete, painted steel).
      // A high environment term only adds a flat grey sheen and destroys the
      // contrast that the practical lights are supposed to create.
      envMapIntensity: 0.05,
    });
    // Procedural industrial surfacing: soot, vertical water staining and
    // panel-scale albedo variation keyed to world position. This gives the
    // merged voxel batches actual material detail without UVs or textures.
    solidMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          vWNrm = normalize(mat3(modelMatrix) * objectNormal);`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vWPos;
          varying vec3 vWNrm;
          float vHash(vec2 p){ p=fract(p*vec2(233.34,851.73)); p+=dot(p,p+23.45); return fract(p.x*p.y); }
          float vNoise(vec2 p){
            vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(vHash(i),vHash(i+vec2(1.0,0.0)),f.x),mix(vHash(i+vec2(0.0,1.0)),vHash(i+vec2(1.0,1.0)),f.x),f.y);
          }
          float vFbm(vec2 p){
            float v=0.0, a=0.5;
            for(int i=0;i<4;i++){ v+=a*vNoise(p); p=p*2.07+vec2(11.3,7.7); a*=0.5; }
            return v;
          }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          float grain = vFbm(vWPos.xz * 0.045 + vWPos.y * 0.03);
          float panel = vFbm(vWPos.xz * 0.16 + vWPos.y * 0.11);
          float stain = vNoise(vec2(vWPos.x * 0.33 + vWPos.z * 0.33, vWPos.y * 0.022));
          stain = smoothstep(0.40, 0.95, stain);
          float heightBias = smoothstep(-120.0, 60.0, vWPos.y);
          float soot = mix(1.0, 0.90, stain * (0.25 + 0.75 * (1.0 - heightBias)));
          float variation = mix(0.975, 1.025, grain) * mix(0.988, 1.012, panel);
          // Fade fine detail when the surface is right in front of the camera so
          // close-ups read as clean painted metal rather than gravel.
          float dcam = length(vViewPosition);
          float closeFade = smoothstep(14.0, 90.0, dcam);
          variation = mix(1.0, variation, closeFade);
          soot = mix(1.0, soot, closeFade);
          diffuseColor.rgb *= variation * soot;
          // cool damp patches pooling near the ground
          float damp = smoothstep(0.55, 1.0, vFbm(vWPos.xz * 0.12)) * (1.0 - smoothstep(0.0, 30.0, vWPos.y));
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.86, 0.90, 0.92), damp * 0.28);`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor = clamp(roughnessFactor + (vNoise(vWPos.xz * 0.07 + vWPos.y * 0.05) - 0.5) * 0.18, 0.22, 1.0);`);
    };
    solidMaterial.customProgramCacheKey = () => 'vc-solid-v2';
    neonMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      toneMapped: false,
      fog: true,
    });
  }

  /* ------------------------------------------------------------------ */
  /* Transform helpers                                                  */
  /* ------------------------------------------------------------------ */
  const Y = new THREE.Vector3(0, 1, 0);

  function depthDim(yCenter) {
    if (yCenter >= 0) return 1;
    const t = clamp(-yCenter / 1000, 0, 1);
    // The shaft receives almost no skylight, but stays readable under work lamps.
    return lerp(0.86, 0.26, Math.pow(t, 0.55));
  }

  function boxB(x, z, cx, baseY, cz, w, h, d, color, opts) {
    const o = opts || {};
    if (o.dim === undefined) o.dim = depthDim(baseY + h / 2);
    SB(cx, cz).addBox(cx, baseY + h / 2, cz, w, h, d, color, o);
  }
  function boxN(x, z, cx, baseY, cz, w, h, d, color, opts) {
    NB(cx, cz).addBox(cx, baseY + h / 2, cz, w, h, d, color, opts || {});
  }

  function beamB(x, z, a, b, w, h, color, opts) {
    const o = opts || {};
    if (o.dim === undefined) o.dim = depthDim((a.y + b.y) * 0.5);
    SB((a.x + b.x) * 0.5, (a.z + b.z) * 0.5).addBeam(a, b, w, h, color, o);
  }
  function beamN(x, z, a, b, w, h, color, opts) {
    NB((a.x + b.x) * 0.5, (a.z + b.z) * 0.5).addBeam(a, b, w, h, color, opts);
  }

  const faces = {
    pz: { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
    nz: { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
    px: { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
    nx: { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  };

  function faceCenter(cx, y, cz, w, d, face) {
    if (face === 'pz') return [cx, y, cz + d / 2 + 0.06];
    if (face === 'nz') return [cx, y, cz - d / 2 - 0.06];
    if (face === 'px') return [cx + w / 2 + 0.06, y, cz];
    return [cx - w / 2 - 0.06, y, cz];
  }
  function faceWidth(w, d, face) {
    return (face === 'pz' || face === 'nz') ? w : d;
  }

  function addGlowRect(x, z, c, face, ww, hh, color, mul) {
    const f = faces[face];
    NB(c[0], c[2]).addQuad(c[0], c[1], c[2], f.u, f.v, ww, hh, color, mul === undefined ? 1 : mul);
  }

  function addWindowQuad(x, z, cx, y, cz, ww, hh, face, color, factor) {
    const c = faceCenter(cx, y, cz, w, hh, 0, face);
    return c;
  }

  // Fine window grids are batched to the neon buffer. Unlit panes remain dark.
  const WINDOW_COLORS = {
    amber: [0xffe0b8, 0xffcf95, 0xffc07a, 0xe8ad74],
    cyan: [0xd6eef2, 0xb9dde4, 0x9ac7d1, 0x86b3bf],
    mixed: [0xffdcb4, 0xffd0a0, 0xf6c189, 0xdce9ec, 0xffe6c8],
    green: [0xd2e4c4, 0xbcd6ab, 0xa9c9a4, 0x97b994],
    red: [0xffd5b6, 0xe8b596, 0xd2a086, 0xc09478],
  };

  function pickWindowColor(colors) {
    // Real facades are overwhelmingly warm interior light; coloured glass and
    // LED strips are the rare exception, which is what separates a city from
    // a christmas tree.
    if (colors.length <= 1) return colors[0];
    if (chance(0.93)) return colors[0];
    if (chance(0.7)) return colors[1];
    return pick(colors);
  }

  function facadeWindows(x, z, cx, baseY, cz, w, h, d, opts) {
    opts = opts || {};
    const floorH = opts.floorH || 6.5;
    const style = opts.style || 'grid';
    const lit = opts.lit === undefined ? 0.44 : opts.lit;
    const colors = opts.colors || WINDOW_COLORS.mixed;
    const facesToDo = opts.faces || ['pz', 'nz', 'px', 'nx'];
    const floor0 = opts.floor0 || 4;
    const base = baseY + floor0;
    const top = baseY + h - 3;
    const floors = Math.max(0, Math.floor((top - base) / floorH));
    if (floors <= 0) return;
    const startFloor = Math.floor(rand(0, 2));
    for (const face of facesToDo) {
      const fw = faceWidth(w, d, face);
      const fuv = faces[face];
      const cols = clamp(Math.floor(fw / (opts.colSpace || 7.4)), 1, style === 'bands' ? 7 : 9);
      const cellW = fw / cols;
      for (let fl = startFloor; fl < floors; fl++) {
        const fy = base + fl * floorH;
        if (style === 'bands') {
          if (fl % 2 === 0 && chance(lit * 0.55)) {
            const c = faceCenter(cx, fy + floorH * 0.38, cz, w, d, face);
            const segs = chance(0.25) ? 2 : 1;
            for (let s = 0; s < segs; s++) {
              const sw = fw * (segs === 1 ? 0.82 : 0.38);
              const off = segs === 1 ? 0 : (s === 0 ? -fw * 0.23 : fw * 0.23);
              const cc = [c[0] + (face === 'pz' || face === 'nz' ? off : 0), c[1], c[2] + (face === 'px' || face === 'nx' ? off : 0)];
              addGlowRect(x, z, cc, face, sw, floorH * 0.16, pickWindowColor(colors), 0.26);
            }
          } else if (fl % 2 === 0) {
            const c = faceCenter(cx, fy + floorH * 0.38, cz, w, d, face);
            addGlowRect(x, z, c, face, fw * 0.80, floorH * 0.20, 0x070b0c, 1.1);
          }
        } else if (style === 'vertical') {
          for (let col = 0; col < cols; col++) {
            if (!chance(lit + 0.12)) continue;
            const off = -fw / 2 + cellW * (col + 0.5);
            const c = faceCenter(cx, fy + floorH * 0.5, cz, w, d, face);
            const cc = [
              c[0] + (face === 'pz' || face === 'nz' ? off : 0),
              c[1],
              c[2] + (face === 'px' || face === 'nx' ? off : 0)
            ];
            addGlowRect(x, z, cc, face, cellW * 0.15, floorH * 0.80, pickWindowColor(colors), 0.30);
          }
        } else if (style === 'sparse') {
          if (chance(lit)) {
            const col = randi(0, cols - 1);
            const off = -fw / 2 + cellW * (col + 0.5);
            const c = faceCenter(cx, fy + floorH * 0.5, cz, w, d, face);
            const cc = [
              c[0] + (face === 'pz' || face === 'nz' ? off : 0),
              c[1],
              c[2] + (face === 'px' || face === 'nx' ? off : 0)
            ];
            addGlowRect(x, z, cc, face, cellW * 0.46, floorH * 0.26, pickWindowColor(colors), 0.30);
          }
        } else {
          for (let col = 0; col < cols; col++) {
            const isLit = chance(lit);
            const off = -fw / 2 + cellW * (col + 0.5);
            const c = faceCenter(cx, fy + floorH * 0.5, cz, w, d, face);
            const cc = [
              c[0] + (face === 'pz' || face === 'nz' ? off : 0),
              c[1],
              c[2] + (face === 'px' || face === 'nx' ? off : 0)
            ];
            const colr = isLit ? pickWindowColor(colors) : (chance(0.35) ? 0x0c1112 : 0x080b0c);
            addGlowRect(x, z, cc, face, cellW * 0.56, floorH * 0.26, colr, isLit ? 0.34 : 0.06);
          }
        }
      }
    }
  }

  function neonStrip(x, z, cx, baseY, cz, w, h, d, color, vertical, opts) {
    opts = opts || {};
    const t = opts.t || 0.34;
    // Trim strips read as thin emissive seams; only signage blazes.
    const trimGain = opts.gain === undefined ? 0.42 : opts.gain;
    if (vertical) {
      for (const f of (opts.faces || ['pz', 'nz'])) {
        const c = faceCenter(cx, baseY + h / 2, cz, w, d, f);
        const fw = faceWidth(w, d, f);
        addGlowRect(x, z, [c[0] - fw / 2 + t, c[1], c[2]], f, t * 0.5, h - 2, color, trimGain);
        addGlowRect(x, z, [c[0] + fw / 2 - t, c[1], c[2]], f, t * 0.5, h - 2, color, trimGain);
      }
    } else {
      for (const f of (opts.faces || ['pz', 'nz', 'px', 'nx'])) {
        const fw = faceWidth(w, d, f);
        const c = faceCenter(cx, baseY + h - t, cz, w, d, f);
        addGlowRect(x, z, c, f, fw - t * 0.8, t * 0.55, color, trimGain);
      }
    }
  }
