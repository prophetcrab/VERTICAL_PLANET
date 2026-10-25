  /* ------------------------------------------------------------------ */
  /* Tower vocabulary                                                   */
  /* ------------------------------------------------------------------ */
  const TOWER_SPECS = [
    { key: 'throat', name: '深喉', en: 'THROAT', x: -352, z: 752, w: 92, d: 88, h: 720, type: 'spine', accent: 0xff8a3d, label: true },
    { key: 'wellhead', name: '零号井架', en: 'WELLHEAD ZERO', x: -392, z: 438, w: 88, d: 88, h: 840, type: 'exo', accent: 0xffb55f, label: true },
    { key: 'nine', name: '九层塔', en: 'NINE TIERS', x: -650, z: 80, w: 112, d: 106, h: 1260, type: 'ziggurat', accent: 0xffc071, label: true },
    { key: 'iron', name: '铁肺', en: 'IRON LUNG', x: -518, z: -466, w: 120, d: 96, h: 900, type: 'twin', accent: 0xff7a46, label: true },
    { key: 'bell', name: '沉钟', en: 'SUNKEN BELL', x: 36, z: -916, w: 100, d: 100, h: 720, type: 'brutal', accent: 0x79d8e2, label: true },
    { key: 'o2x', name: '氧末', en: 'OXYGEN TERMINAL', x: 430, z: 26, w: 88, d: 88, h: 1040, type: 'algae', accent: 0x9affa0, label: true },
    { key: 'perch', name: '栖木', en: 'THE PERCH', x: 506, z: -540, w: 100, d: 100, h: 1180, type: 'eco', accent: 0xc2ff79, label: true },
    { key: 'white', name: '白噪塔', en: 'WHITE NOISE', x: 862, z: 428, w: 82, d: 82, h: 1560, type: 'broadcast', accent: 0xff527e, label: true },
    { key: 'mercy', name: '冷却圣母', en: 'COOLANT MERCY', x: 758, z: -186, w: 96, d: 90, h: 1240, type: 'water', accent: 0x62d5e6, label: true },
    { key: 'gutter', name: '沟雨', en: 'RAIN GUTTER', x: -956, z: 258, w: 82, d: 82, h: 840, type: 'water', accent: 0x8fe5ec, label: true },
    { key: 'descent', name: '下行九号', en: 'DESCENT NINE', x: -980, z: -756, w: 92, d: 92, h: 1140, type: 'brutal', accent: 0xff9c4b, label: true },
    { key: 'plumb', name: '垂心', en: 'PLUMBLINE', x: 1052, z: -802, w: 104, d: 104, h: 1900, type: 'elevator', accent: 0xa8e9ff, label: true },
    { key: 'stair', name: '天梯井', en: 'STAIRWELL', x: -196, z: -1004, w: 88, d: 88, h: 980, type: 'exo', accent: 0xff8962, label: true },
    { key: 'lantern', name: '灯芯', en: 'LANTERN WICK', x: 522, z: 864, w: 86, d: 86, h: 640, type: 'ziggurat', accent: 0xffcc75, label: true },
    { key: 'oracle', name: '无神谕所', en: 'ORACLE NULL', x: -1054, z: 902, w: 76, d: 76, h: 580, type: 'twin', accent: 0xff6c51, label: true },
    { key: 'anchor', name: '轨道锚', en: 'ORBITAL ANCHOR', x: -1510, z: -1320, w: 150, d: 150, h: 1982, type: 'anchor', accent: 0xffe1b3, label: true },
    { key: 'spiral', name: '螺旋塔', en: 'HELIX SPIRE', x: 286, z: -1122, w: 96, d: 96, h: 1870, type: 'twist', accent: 0xff9668, label: true },
    { key: 'tripod', name: '三足天柱', en: 'TRIPOD COLUMN', x: -1176, z: -470, w: 118, d: 118, h: 1974, type: 'tripod', accent: 0xffcf8f, label: true },
    { key: 'lattice', name: '钢格塔', en: 'LATTICE MAST', x: 1182, z: 906, w: 128, d: 128, h: 1912, type: 'lattice', accent: 0xff6a52, label: true },
  ];
  TOWER_SPECS.forEach((t, i) => { t.id = 'T' + String(i + 1).padStart(2, '0'); t.seed = 9000 + i * 977; });
  const towerByKey = {};
  TOWER_SPECS.forEach((t) => { towerByKey[t.key] = t; });
  const occupancy = [];

  function occupies(x, z, w, d, pad) {
    const p = pad || 0;
    for (const o of occupancy) {
      if (x + w / 2 + p > o.x - o.w / 2 && x - w / 2 - p < o.x + o.w / 2 &&
          z + d / 2 + p > o.z - o.d / 2 && z - d / 2 - p < o.z + o.d / 2) return true;
    }
    return false;
  }

  function blockTouchesPit(x, z, w, d, pad) {
    const p = pad || 0;
    return (x + w / 2 + p > PIT.x1 && x - w / 2 - p < PIT.x2 &&
            z + d / 2 + p > PIT.z1 && z - d / 2 - p < PIT.z2);
  }

  const TOWER_PALETTES = {
    exo: { body: [0x333c3f, 0x293236, 0x40484a, 0x272d2f], rib: 0x4d5555, trim: 0xff9848, win: WINDOW_COLORS.mixed },
    ziggurat: { body: [0x3b3a34, 0x2f302d, 0x484640, 0x252826], rib: 0x5d574b, trim: 0xffb15f, win: WINDOW_COLORS.amber },
    twin: { body: [0x353b3c, 0x292f31, 0x414849, 0x2c3133], rib: 0x596062, trim: 0xff7845, win: WINDOW_COLORS.mixed },
    eco: { body: [0x293936, 0x1f2e2b, 0x344640, 0x26302c], rib: 0x516c5a, trim: 0xb9ff72, win: WINDOW_COLORS.green },
    broadcast: { body: [0x2c3036, 0x20252a, 0x3a4149, 0x262b30], rib: 0x4f585e, trim: 0xff527e, win: WINDOW_COLORS.mixed },
    brutal: { body: [0x383a37, 0x2b2e2c, 0x444541, 0x232625], rib: 0x5a5b55, trim: 0x79d8e2, win: WINDOW_COLORS.cyan },
    water: { body: [0x2e3b3d, 0x242f32, 0x3a494b, 0x20292c], rib: 0x53686b, trim: 0x76e7ef, win: WINDOW_COLORS.cyan },
    elevator: { body: [0x31383e, 0x242b31, 0x424b53, 0x1e2429], rib: 0x5e6c76, trim: 0xa8e9ff, win: WINDOW_COLORS.cyan },
    spine: { body: [0x343a39, 0x282e2e, 0x414846, 0x252a29], rib: 0x59605b, trim: 0xff9a4d, win: WINDOW_COLORS.amber },
    algae: { body: [0x2b3b35, 0x20302a, 0x354b41, 0x24312b], rib: 0x6c9778, trim: 0x9dff8f, win: WINDOW_COLORS.green },
    anchor: { body: [0x2c3134, 0x202528, 0x3c4245, 0x252a2c], rib: 0x596266, trim: 0xffd18a, win: WINDOW_COLORS.mixed },
  };

  function voxelErode(x, z, cx, baseY, cz, w, h, d, color) {
    // Chunked 2-4 m notches along tower corners give the silhouette a built-up
    // voxel edge instead of a perfectly smooth extrusion.
    const stepY = 5.5;
    const n = Math.floor(h / stepY);
    const sides = ['pz', 'nz', 'px', 'nx'];
    for (let i = 0; i < n; i++) {
      if (!chance(0.30)) continue;
      const yy = baseY + i * stepY;
      const side = pick(sides);
      const bw = rand(1.6, 4.4);
      const bd = rand(1.6, 4.4);
      let px = cx, pz2 = cz, ww = bw, dd = bd;
      if (side === 'pz') { pz2 = cz + d / 2 - bd / 2; px = cx + rand(-w / 2 + bw, w / 2 - bw); ww = rand(2.4, 8); }
      else if (side === 'nz') { pz2 = cz - d / 2 + bd / 2; px = cx + rand(-w / 2 + bw, w / 2 - bw); ww = rand(2.4, 8); }
      else if (side === 'px') { px = cx + w / 2 - bw / 2; pz2 = cz + rand(-d / 2 + bd, d / 2 - bd); dd = rand(2.4, 8); }
      else { px = cx - w / 2 + bw / 2; pz2 = cz + rand(-d / 2 + bd, d / 2 - bd); dd = rand(2.4, 8); }
      boxB(x, z, px, yy, pz2, ww, stepY, dd, color);
      if (chance(0.2)) addGlow(px, yy + stepY, pz2, 0xff9a4e, 0.5);
    }
  }

  function chooseWinStyle(type, h) {
    if (type === 'ziggurat') return 'bands';
    if (type === 'broadcast' || type === 'elevator') return 'sparse';
    if (type === 'exo' || type === 'spine') return 'vertical';
    return h > 400 ? 'grid' : 'bands';
  }

  function addTowerCrown(spec, tx, ty, tz, topW, topD, palette) {
    const x = spec.x, z = spec.z;
    const crownH = clamp(spec.h * 0.028, 8, 38);
    boxB(x, z, tx, ty, tz, topW * 0.72, crownH * 0.6, topD * 0.72, palette.body[2]);
    boxN(x, z, tx, ty + crownH * 0.58, tz, topW * 0.73, 1.0, topD * 0.73, palette.trim);
    // Mechanical roof kit.
    for (let i = 0; i < 4; i++) {
      const vx = tx + rand(-topW * 0.25, topW * 0.25);
      const vz = tz + rand(-topD * 0.25, topD * 0.25);
      boxB(x, z, vx, ty + crownH * 0.6, vz, rand(2.5, 6), rand(2, 7), rand(2.5, 7), palette.rib);
      if (chance(0.4)) addGlow(vx, ty + crownH * 0.6 + 7, vz, palette.trim, 1.2);
    }
    // Lattice mast.
    const mastH = clamp(spec.h * 0.06, 24, 96);
    const mastY = ty + crownH * 0.6;
    boxB(x, z, tx, mastY, tz, 2.2, mastH, 2.2, 0x1b2021);
    for (let i = 1; i <= 4; i++) {
      const yy = mastY + mastH * (i / 5);
      boxN(x, z, tx, yy, tz, 7 * (1 - i * 0.13), 0.6, 7 * (1 - i * 0.13), palette.trim);
      addGlow(tx, yy + 0.4, tz, palette.trim, 1.4);
    }
    addGlow(tx, mastY + mastH + 2, tz, 0xff5b42, 3.4);
    addBeacon(tx, mastY + mastH + 2, tz, 0xff5038, 8);
    // Antenna aim lines.
    if (spec.h > 600) {
      beamB(x, z, new THREE.Vector3(tx, mastY + 4, tz), new THREE.Vector3(tx + 22, mastY + mastH * 0.62, tz - 13), 0.45, 0.45, 0x282e2e);
      beamB(x, z, new THREE.Vector3(tx, mastY + 4, tz), new THREE.Vector3(tx - 24, mastY + mastH * 0.48, tz + 8), 0.45, 0.45, 0x282e2e);
    }
  }

  const BEACON_CAP = 320;
  let beaconSystem = null;
  const beaconDefs = [];

  function addBeacon(x, y, z, color, size) {
    beaconDefs.push({ x, y, z, color, size, phase: rand(0, TAU), base: size / 8 });
  }

  function buildBeaconSystem() {
    if (!beaconDefs.length) return;
    const geo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: 0xffffff });
    const mesh = new THREE.InstancedMesh(geo, mat, Math.min(BEACON_CAP, beaconDefs.length));
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const dummy = new THREE.Object3D();
    beaconDefs.forEach((b, i) => {
      if (i >= BEACON_CAP) return;
      mesh.setColorAt(i, new THREE.Color(b.color).convertSRGBToLinear());
      dummy.position.set(b.x, b.y, b.z);
      dummy.scale.setScalar(b.base);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.count = Math.min(BEACON_CAP, beaconDefs.length);
    mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
    beaconSystem = { mesh, dummy };
  }

  function updateBeacons(time) {
    if (!beaconSystem) return;
    const { mesh, dummy } = beaconSystem;
    const n = Math.min(BEACON_CAP, beaconDefs.length);
    for (let i = 0; i < n; i++) {
      const b = beaconDefs[i];
      const pulse = 0.55 + 0.45 * Math.pow(Math.sin(time * 2.1 + b.phase) * 0.5 + 0.5, 3);
      dummy.position.set(b.x, b.y, b.z);
      dummy.scale.setScalar(b.base * (0.75 + pulse * 0.5));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function addTowerPodium(spec, x, z, palette) {
    const podH = clamp(spec.h * 0.055, 18, 72);
    const w = spec.w * 1.32, d = spec.d * 1.32;
    boxB(x, z, x, 0, z, w, podH, d, palette.body[0]);
    boxB(x, z, x, podH, z, w * 0.9, 3, d * 0.9, palette.rib);
    // sawtooth industrial skirt
    for (let i = 0; i < 4; i++) {
      const ox = (i % 2 ? -1 : 1) * w * 0.36;
      const oz = (i < 2 ? -1 : 1) * d * 0.36;
      boxB(x, z, x + ox, 3 + i * 4, z + oz, w * 0.26, 4.5, d * 0.26, palette.body[(i + 1) % 4]);
      boxB(x, z, x + ox, podH - 1.5, z + oz, w * 0.3, 1.5, d * 0.3, palette.rib);
    }
    facadeWindows(x, z, x, 0, z, w, podH, d, {
      floorH: 8, style: 'bands', lit: 0.31, floor0: 7, colSpace: 8,
      colors: palette.win
    });
    neonStrip(x, z, x, 0, z, w, podH, d, palette.trim, false, { t: 0.55 });
    // Pipe manifolds at the feet.
    for (let side = 0; side < 4; side++) {
      const horiz = side < 2;
      const sign = side % 2 ? -1 : 1;
      for (let p = 0; p < 3; p++) {
        const off = -w * 0.28 + p * w * 0.28;
        if (horiz) {
          boxB(x, z, x + off, 4 + p * 4.2, z + sign * (d / 2 + 3.1), 1.0, 1.0, d * 0.08 + 5, 0x4f4033);
          boxB(x, z, x + off, podH + 2, z + sign * d / 2, 1.0, 8, 1.0, 0x4f4033);
          if (chance(0.5)) addGlow(x + off, 7 + p * 4.2, z + sign * (d / 2 + 6.5), 0xff964e, 1.1);
        } else {
          boxB(x, z, x + sign * (w / 2 + 3.1), 4 + p * 4.2, z + off, w * 0.08 + 5, 1.0, 1.0, 0x4f4033);
        }
      }
    }
    // Base signage.
    if (spec.label && spec.h < 1500) {
      addBillboard({
        x: x, y: 34, z: z + d / 2 + 1.2, w: Math.min(46, w * 0.5), h: 16,
        rotY: 0, text: spec.name, sub: spec.en, color: '#' + palette.trim.toString(16).padStart(6, '0'),
        vertical: false, bg: true, border: true, flicker: false
      });
    }
    return podH;
  }

  function addElevatorRail(spec, x, z, palette) {
    const side = rand(0, 4) | 0;
    const w = spec.w, d = spec.d;
    let ex = x, ez = z, faceAng = 0;
    if (side === 0) { ez = z + d / 2 + 1.4; faceAng = 0; }
    else if (side === 1) { ez = z - d / 2 - 1.4; faceAng = Math.PI; }
    else if (side === 2) { ex = x + w / 2 + 1.4; faceAng = Math.PI / 2; }
    else { ex = x - w / 2 - 1.4; faceAng = -Math.PI / 2; }
    const topY = spec.h * rand(0.62, 0.88);
    const xOff = side >= 2 ? 0 : 9;
    const zOff = side < 2 ? 9 : 0;
    for (let k = -1; k <= 1; k += 2) {
      boxB(x, z, ex + (side < 2 ? k * 4.2 : 0), 5, ez + (side >= 2 ? k * 4.2 : 0), 0.95, topY, 0.95, 0x222829);
      boxN(x, z, ex + (side < 2 ? k * 4.2 : 0), 5, ez + (side >= 2 ? k * 4.2 : 0), 0.35, topY, 0.35, palette.trim);
    }
    const mat = new THREE.MeshBasicMaterial({ color: palette.trim, toneMapped: false });
    const cab = new THREE.Mesh(new THREE.BoxGeometry(5.4, 7.8, 5.4), mat);
    cab.position.set(ex, 20, ez);
    scene.add(cab);
    const frameMat = new THREE.MeshBasicMaterial({ color: 0xffd19c, toneMapped: false });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.25, 5.8), frameMat);
    frame.position.y = 3.7;
    cab.add(frame);
    dynamic.elevators.push({ mesh: cab, baseY: 15, topY, speed: rand(7, 16), phase: rand(0, 1) });
    addGlow(ex, 22, ez, palette.trim, 2.4);
  }

  function addFacadePipes(spec, x, z, y0, y1, palette) {
    const side = randi(0, 3);
    const dir = side < 2 ? 1 : -1;
    const px = side < 2 ? x + rand(-spec.w * 0.3, spec.w * 0.3) : x + dir * (spec.w / 2 + 1.8);
    const pz = side < 2 ? z + dir * (spec.d / 2 + 1.8) : z + rand(-spec.d * 0.3, spec.d * 0.3);
    const color = chance(0.5) ? 0x5d4b3a : 0x3e4646;
    boxB(x, z, px, y0, pz, 1.5, y1 - y0, 1.5, color);
    boxB(x, z, px + 1.8, y0, pz, 0.75, y1 - y0, 0.75, chance(0.4) ? 0x694d32 : 0x333a39);
    for (let yy = y0 + 20; yy < y1; yy += rand(35, 62)) {
      boxB(x, z, px, yy, pz, 4.2, 1.0, 1.0, 0x2a3030);
      if (chance(0.55)) addGlow(px + 1.5, yy + 0.4, pz + 0.4, palette.trim, 0.9);
    }
    // Valve cluster.
    if (chance(0.7)) {
      const vy = y0 + (y1 - y0) * rand(0.2, 0.7);
      boxB(x, z, px, vy, pz, 5, 4, 4.5, 0x44382f);
      boxB(x, z, px, vy + 2, pz, 2.0, 2.2, 2.0, 0x1e2424);
      addGlow(px, vy + 4.6, pz, 0xff9a49, 1.2);
    }
  }

  function facadeRibs(spec, x, z, y0, y1, w, d, palette, count) {
    const n = count || 4;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU + Math.PI / 4;
      const px = x + Math.cos(ang) * w * 0.5;
      const pz = z + Math.sin(ang) * d * 0.5;
      boxB(x, z, px, y0, pz, 2.1, y1 - y0, 2.1, palette.rib);
      if (chance(0.5)) {
        for (let yy = y0 + 20; yy < y1; yy += 90) addGlow(px, yy, pz, palette.trim, 0.8);
      }
    }
  }

  function makeTree(x, z, tx, ty, tz, size, glow) {
    const trunkH = size * rand(1.4, 2.2);
    boxB(x, z, tx, ty, tz, size * 0.22, trunkH, size * 0.22, 0x34291e);
    const leafCols = [0x2a4526, 0x33552b, 0x243f22, 0x3b6330, 0x466f36, 0x2f4d2a];
    const n = 3 + Math.floor(rand(0, 4));
    for (let i = 0; i < n; i++) {
      const ox = rand(-size * 0.65, size * 0.65);
      const oz = rand(-size * 0.65, size * 0.65);
      const yy = ty + trunkH + rand(-size * 0.15, size * 0.9);
      const s = size * rand(0.6, 1.2);
      boxB(x, z, tx + ox, yy, tz + oz, s, s * rand(0.4, 0.8), s, pick(leafCols));
    }
    if (glow) {
      addGlow(tx, ty + trunkH + size * 0.6, tz, 0x9bff74, size * 0.09);
      boxN(x, z, tx, ty + 0.3, tz, size * 1.8, 0.15, size * 1.8, 0x6fae4e);
    }
  }

  function addWaterPlane(x, yTop, z, yBottom, width, rotY, color) {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 512;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 64, 512);
    const rng = mulberry32(970 + Math.round(x + z));
    for (let i = 0; i < 40; i++) {
      const xx = rng() * 64;
      const grd = ctx.createLinearGradient(0, 0, 0, 512);
      grd.addColorStop(0, 'rgba(255,255,255,0)');
      grd.addColorStop(0.14, 'rgba(160,240,245,.26)');
      grd.addColorStop(0.75, 'rgba(90,190,210,.10)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(xx, rng() * 120, 0.8 + rng() * 2, 512);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const mat = new THREE.MeshBasicMaterial({
      map: tex, color, transparent: true, opacity: 0.45, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false
    });
    const geo = new THREE.PlaneGeometry(width, yTop - yBottom);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, (yTop + yBottom) / 2, z);
    mesh.rotation.y = rotY;
    scene.add(mesh);
    dynamic.water.push({ mesh, mat, tex, speed: rand(0.13, 0.33) });
    for (let i = 0; i < 5; i++) addGlow(x + rand(-width / 2, width / 2), lerp(yTop, yBottom, rand(0, 1)), z + rand(-1, 1), 0x8feeff, 0.8);
  }

  function addEcoTerrace(spec, x, z, palette, cy, levelW, sideSign, index) {
    const tw = spec.w * 1.25;
    const td = spec.d * 1.25;
    boxB(x, z, x + sideSign * spec.w * 0.28, cy, z, tw, 2.4, td, 0x2c3430);
    boxN(x, z, x + sideSign * spec.w * 0.28, cy + 2.4, z, tw - 5, 0.6, td - 5, 0x31502f);
    // Planters and cubic trees.
    const treeCount = index === 1 ? 12 : 7;
    for (let i = 0; i < treeCount; i++) {
      const tx = x + sideSign * spec.w * 0.28 + rand(-tw * 0.36, tw * 0.36);
      const tz = z + rand(-td * 0.36, td * 0.36);
      if (Math.abs(tx - x) < spec.w * 0.25 && Math.abs(tz - z) < spec.d * 0.25) continue;
      boxB(x, z, tx, cy + 2.4, tz, 4, 1.0, 4, 0x3a2d20);
      makeTree(x, z, tx, cy + 3.3, tz, rand(5, 10), true);
    }
    // Grow-light grid.
    for (let i = 0; i < 8; i++) {
      const px = x + sideSign * spec.w * 0.28 + rand(-tw * 0.4, tw * 0.4);
      const pz = z + rand(-td * 0.4, td * 0.4);
      addGlow(px, cy + 3.2, pz, i % 2 ? 0xb6ff7c : 0x74e3da, 0.7);
    }
    // Agricultural pipework and maintenance rail.
    for (let i = 0; i < 3; i++) {
      boxB(x, z, x + sideSign * spec.w * 0.28 + rand(-tw * 0.35, tw * 0.35), cy + 5.5, z + rand(-td * 0.35, td * 0.35), tw * 0.1, 0.4, 0.4, 0x5e5450);
    }
    neonStrip(x, z, x + sideSign * spec.w * 0.28, cy, z, tw, 2.4, td, 0x9bff6f, false, { t: 0.32 });
  }

  function addVerticalGarden(spec, x, z, palette) {
    for (let i = 0; i < 7; i++) {
      const side = i % 4;
      const sign = i % 2 ? -1 : 1;
      const px = side < 2 ? x + rand(-spec.w * 0.42, spec.w * 0.42) : x + sign * (spec.w * 0.5 + 1);
      const pz = side < 2 ? z + sign * (spec.d * 0.5 + 1) : z + rand(-spec.d * 0.42, spec.d * 0.42);
      const y0 = spec.h * rand(0.16, 0.48);
      const y1 = y0 + rand(35, 150);
      boxB(x, z, px, y0, pz, 0.7, y1 - y0, 0.7, 0x3e5b3b);
      for (let yy = y0; yy < y1; yy += rand(8, 16)) {
        boxB(x, z, px, yy, pz, rand(1.5, 3.4), rand(1, 2.4), rand(1.5, 3), pick([0x3d6135, 0x4e7b3d, 0x2f5031]));
      }
      if (chance(0.5)) addGlow(px, y1, pz, 0x9bff74, 0.8);
    }
  }

  function buildTower(spec) {
    const x = spec.x, z = spec.z, w = spec.w, d = spec.d, h = spec.h;
    const local = mulberry32(spec.seed);
    const pal = TOWER_PALETTES[spec.type] || TOWER_PALETTES.exo;
    // All towers are detailed as one independent, continuously generated model.
    const podH = addTowerPodium(spec, x, z, pal);
    const style = chooseWinStyle(spec.type, h);
    const winMain = { floorH: h > 900 ? 11 : 8.5, style, lit: 0.37, colors: pal.win, floor0: 8, colSpace: 5.2 };
    const topRatio = 0.93;

    if (spec.type === 'twist') {
      const segs = 11;
      let yy = podH;
      const segH = (h * 0.9 - podH) / segs;
      let ww = w * 0.86, dd = d * 0.86;
      for (let i = 0; i < segs; i++) {
        const rot = i * 0.13;
        boxB(x, z, x, yy, z, ww, segH, dd, pal.body[i % 4], { rotY: rot });
        facadeWindows(x, z, x, yy, z, ww * 0.98, segH, dd * 0.98, Object.assign({}, winMain, { floorH: Math.max(7, segH / 8), style: i % 3 === 0 ? 'bands' : 'grid' }));
        for (let c = 0; c < 4; c++) {
          const sx = c < 2 ? -1 : 1, sz = c % 2 ? -1 : 1;
          const cx = x + sx * ww * 0.5 * Math.cos(rot) - sz * dd * 0.5 * Math.sin(rot);
          const cz = z + sx * ww * 0.5 * Math.sin(rot) + sz * dd * 0.5 * Math.cos(rot);
          boxB(x, z, cx, yy, cz, 2.6, segH, 2.6, pal.rib);
          boxN(x, z, cx, yy + segH * 0.5, cz, 0.5, segH * 0.9, 0.5, pal.trim);
        }
        boxB(x, z, x, yy + segH - 1.4, z, ww * 1.08, 2.2, dd * 1.08, pal.rib, { rotY: rot });
        neonStrip(x, z, x, yy + segH - 1.8, z, ww * 1.08, 2.2, dd * 1.08, pal.trim, false, { t: 0.5 });
        if (i % 2 === 0) {
          boxB(x, z, x + ww * 0.62, yy + segH * 0.22, z, ww * 0.3, segH * 0.5, dd * 0.6, pal.body[3], { rotY: rot });
          facadeWindows(x, z, x + ww * 0.62, yy + segH * 0.22, z, ww * 0.3, segH * 0.5, dd * 0.6, { floorH: 8, style: 'vertical', lit: 0.4, floor0: 2, colors: pal.win });
        }
        yy += segH;
        ww *= 0.985; dd *= 0.985;
      }
      addTowerCrown(spec, x, h * 0.9, z, ww, dd, pal);
      for (let i = 0; i < 4; i++) {
        const ry = podH + (h * 0.8 - podH) * (0.18 + i * 0.21);
        const R = w * 0.78;
        for (let k = 0; k < 16; k++) {
          const a0 = k / 16 * TAU, a1 = (k + 1) / 16 * TAU;
          beamB(x, z, new THREE.Vector3(x + Math.cos(a0) * R, ry + Math.sin(a0 + i) * 4, z + Math.sin(a0) * R),
            new THREE.Vector3(x + Math.cos(a1) * R, ry + Math.sin(a1 + i) * 4, z + Math.sin(a1) * R), 2.2, 1.0, pal.rib);
          if (k % 4 === 0) addGlow(x + Math.cos(a0) * R, ry, z + Math.sin(a0) * R, pal.trim, 1.4);
        }
      }
      addBillboard({ x: x, y: h * 0.42, z: z + w * 0.5 + 2, w: 30, h: 52, rotY: 0, text: '螺旋', sub: 'HELIX / 1870', color: '#ff9668', vertical: true, bg: true, border: true, flicker: false });
    } else if (spec.type === 'tripod') {
      const coreW = w * 0.4, coreD = d * 0.4;
      const topY = h * 0.9;
      boxB(x, z, x, podH, z, coreW, topY - podH, coreD, pal.body[1]);
      facadeWindows(x, z, x, podH, z, coreW, topY - podH, coreD, { floorH: 12, style: 'vertical', lit: 0.34, colors: pal.win, floor0: 12, colSpace: 6 });
      for (let c = 0; c < 3; c++) {
        const a = c / 3 * TAU + 0.5;
        const bx = x + Math.cos(a) * w * 0.7;
        const bz = z + Math.sin(a) * d * 0.7;
        const steps = 16;
        for (let i = 0; i < steps; i++) {
          const t0 = i / steps, t1 = (i + 1) / steps;
          const p0 = new THREE.Vector3(lerp(bx, x + Math.cos(a) * coreW * 0.55, t0), lerp(0, topY, t0), lerp(bz, z + Math.sin(a) * coreD * 0.55, t0));
          const p1 = new THREE.Vector3(lerp(bx, x + Math.cos(a) * coreW * 0.55, t1), lerp(0, topY, t1), lerp(bz, z + Math.sin(a) * coreD * 0.55, t1));
          beamB(x, z, p0, p1, 8 - i * 0.22, 8 - i * 0.22, pal.rib);
          beamB(x, z, p0, p1, 2.5, 2.5, pal.body[3]);
          if (i % 2 === 0) addGlow(p0.x, p0.y, p0.z, pal.trim, 1.2);
        }
        boxB(x, z, bx, 0, bz, 22, 22, 22, pal.body[2]);
        addGlow(bx, 22, bz, 0xff7d36, 2.4);
      }
      for (let r = 0; r < 9; r++) {
        const t = r / 9;
        const ry = lerp(70, topY - 120, t);
        const R = w * lerp(0.62, 0.3, t);
        for (let k = 0; k < 3; k++) {
          const a0 = k / 3 * TAU + 0.5, a1 = (k + 1) / 3 * TAU + 0.5;
          beamB(x, z, new THREE.Vector3(x + Math.cos(a0) * R, ry, z + Math.sin(a0) * R),
            new THREE.Vector3(x + Math.cos(a1) * R, ry, z + Math.sin(a1) * R), 2.4, 1.4, pal.rib);
          beamB(x, z, new THREE.Vector3(x + Math.cos(a0) * R, ry, z + Math.sin(a0) * R),
            new THREE.Vector3(x + Math.cos(a1) * R * 0.6, ry + 90, z + Math.sin(a1) * R * 0.6), 1.0, 1.0, 0x454f4e);
        }
      }
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * TAU + 1.1;
        const py = h * (0.32 + i * 0.17);
        const R = w * 0.48;
        const px = x + Math.cos(a) * R, pz = z + Math.sin(a) * R;
        boxB(x, z, px, py, pz, 24, 12, 24, pal.body[0], { rotY: a });
        facadeWindows(x, z, px, py, pz, 24, 12, 24, { floorH: 6, style: 'bands', lit: 0.5, floor0: 2, colors: pal.win });
        neonStrip(x, z, px, py, pz, 24, 12, 24, pal.trim, false, { t: 0.35 });
      }
      addTowerCrown(spec, x, topY, z, coreW, coreD, pal);
    } else if (spec.type === 'lattice') {
      const levelsN = 16;
      const step = h * 0.88 / levelsN;
      let ww = w * 0.9, dd = d * 0.9;
      boxB(x, z, x, podH, z, ww * 0.42, h * 0.88 - podH, dd * 0.42, pal.body[1]);
      facadeWindows(x, z, x, podH, z, ww * 0.42, h * 0.88 - podH, dd * 0.42, { floorH: 9, style: 'vertical', lit: 0.36, colors: pal.win, floor0: 10, colSpace: 3.4 });
      for (let i = 0; i < levelsN; i++) {
        const yy = podH + i * step;
        const cw = ww * (1 - i * 0.026);
        for (let c = 0; c < 4; c++) {
          const sx = c < 2 ? -1 : 1, sz = c % 2 ? -1 : 1;
          boxB(x, z, x + sx * cw * 0.5, yy, z + sz * dd * 0.5, 3.0, step, 3.0, pal.rib);
        }
        for (const yEdge of [0, 0.5]) {
          const ey = yy + step * yEdge;
          boxB(x, z, x, ey, z + dd * 0.5, cw, 1.6, 2.2, pal.rib);
          boxB(x, z, x, ey, z - dd * 0.5, cw, 1.6, 2.2, pal.rib);
          boxB(x, z, x + cw * 0.5, ey, z, 2.2, 1.6, dd, pal.rib);
          boxB(x, z, x - cw * 0.5, ey, z, 2.2, 1.6, dd, pal.rib);
        }
        const yy2 = yy + step;
        const nw = ww * (1 - (i + 1) * 0.026);
        for (const [ax, az] of [[-cw / 2, dd / 2], [-cw / 2, -dd / 2], [cw / 2, -dd / 2], [-cw / 2, -dd / 2]]) {
          const nx = ax * (nw / cw), nz = az * (nw / cw);
          beamB(x, z, new THREE.Vector3(x + ax, yy, z + az), new THREE.Vector3(x + nx, yy2, z + nz), 0.8, 0.8, 0x5d6966);
          beamB(x, z, new THREE.Vector3(x + ax, yy2, z + az), new THREE.Vector3(x + nx, yy, z + nz), 0.8, 0.8, 0x5d6966);
        }
        if (i % 3 === 1) {
          boxB(x, z, x, yy, z, cw * 0.9, 1.2, dd * 0.9, pal.body[3]);
          boxB(x, z, x + rand(-cw * 0.2, cw * 0.2), yy + 2, z, 8, 6, 8, 0x353c3a);
          addGlow(x, yy + 4, z + dd * 0.3, 0xff9a4e, 1.6);
        }
        if (i % 4 === 0) addGlow(x + cw * 0.5, yy + 2, z, pal.trim, 1.5);
      }
      addTowerCrown(spec, x, h * 0.88, z, ww * 0.5, dd * 0.5, pal);
      for (let i = 0; i < 2; i++) {
        const cy = h * (0.45 + i * 0.22);
        boxB(x, z, x + w * 0.6, cy, z, 4, 8, 4, 0x5c513f);
        boxB(x, z, x + w * 0.6, cy + 8, z, 74, 2, 2, 0x6d5c42, { rotY: Math.PI / 4 });
        addGlow(x + w * 0.9, cy + 9, z, 0xff5a35, 1.6);
      }
    } else if (spec.type === 'ziggurat') {
      const tiers = 6 + Math.floor(rand(0, 3));
      let yy = podH;
      let ww = w, dd = d;
      for (let i = 0; i < tiers; i++) {
        const remaining = h - podH;
        const th = remaining / tiers * rand(0.72, 1.35);
        const cx = x + rand(-w * 0.055, w * 0.055);
        const cz = z + rand(-d * 0.055, d * 0.055);
        boxB(x, z, cx, yy, cz, ww, th, dd, pal.body[i % 4]);
        facadeWindows(x, z, cx, yy, cz, ww, th, dd, Object.assign({}, winMain, { floorH: Math.max(6, th / 8) }));
        boxB(x, z, cx, yy + th - 1.6, cz, ww * 1.06, 2.4, dd * 1.06, pal.rib);
        neonStrip(x, z, cx, yy + th - 2.2, cz, ww * 1.06, 2.4, dd * 1.06, pal.trim, false, { t: 0.4 });
        // Vertical service columns on two corners.
        boxB(x, z, cx - ww * 0.46, yy, cz + dd * 0.45, 2.4, th, 2.4, pal.rib);
        if (chance(0.65)) boxN(x, z, cx - ww * 0.46, yy, cz + dd * 0.45, 0.35, th, 0.35, pal.trim);
        yy += th;
        ww *= rand(0.78, 0.9);
        dd *= rand(0.78, 0.9);
      }
      addTowerCrown(spec, x, yy, z, ww, dd, pal);
    } else if (spec.type === 'exo') {
      const coreW = w * 0.62, coreD = d * 0.62;
      const shaftH = h * 0.93;
      boxB(x, z, x, podH, z, coreW, shaftH - podH, coreD, pal.body[1]);
      facadeWindows(x, z, x, podH, z, coreW, shaftH - podH, coreD, winMain);
      facadeRibs(spec, x, z, podH, shaftH, coreW, coreD, pal, 4);
      // exterior corner frame
      for (let c = 0; c < 4; c++) {
        const sx = (c === 0 || c === 3) ? -1 : 1;
        const sz = (c < 2) ? -1 : 1;
        const cx = x + sx * (w / 2 - 2), cz = z + sz * (d / 2 - 2);
        boxB(x, z, cx, podH, cz, 3.2, shaftH - podH, 3.2, pal.rib);
        for (let yy = podH + 18; yy < shaftH - 6; yy += 36) {
          boxB(x, z, cx, yy, cz, 5, 1.1, 5, pal.body[0]);
          if (chance(0.45)) addGlow(cx, yy + 0.6, cz, pal.trim, 0.7);
        }
      }
      // rings and diagonal outriggers
      for (let yy = podH + 54; yy < shaftH - 40; yy += 92) {
        for (let side = 0; side < 4; side++) {
          const sign = side % 2 ? -1 : 1;
          if (side < 2) boxB(x, z, x, yy, z + sign * (d / 2 - 2), w, 1.4, 2.2, pal.rib);
          else boxB(x, z, x + sign * (w / 2 - 2), yy, z, 2.2, 1.4, d, pal.rib);
        }
        if (chance(0.45)) {
          const y2 = yy + 92;
          beamB(x, z, new THREE.Vector3(x - w / 2 + 2, yy, z + d / 2 - 2), new THREE.Vector3(x + w / 2 - 2, y2, z + d / 2 - 2), 1.0, 1.0, pal.rib);
          beamB(x, z, new THREE.Vector3(x + w / 2 - 2, yy, z - d / 2 + 2), new THREE.Vector3(x - w / 2 + 2, y2, z - d / 2 + 2), 1.0, 1.0, pal.rib);
        }
      }
      // side pods
      for (let i = 0; i < 3; i++) {
        const py = podH + (shaftH - podH) * (0.23 + i * 0.25);
        const pw = w * rand(0.35, 0.58);
        const px = x + (i % 2 ? 1 : -1) * (w * 0.3);
        boxB(x, z, px, py, z, pw, 16, d * 0.54, pal.body[2]);
        facadeWindows(x, z, px, py, z, pw, 16, d * 0.54, { floorH: 7, style: 'bands', lit: 0.4, floor0: 2, colors: pal.win });
        neonStrip(x, z, px, py, z, pw, 16, d * 0.54, pal.trim, false, { t: 0.3 });
        boxB(x, z, px, py - 4, z + d * 0.28, 2.4, 4, 2.4, pal.rib);
      }
      addTowerCrown(spec, x, shaftH, z, w * 0.7, d * 0.7, pal);
      addFacadePipes(spec, x, z, podH + 20, shaftH - 40, pal);
    } else if (spec.type === 'twin') {
      const gap = w * 0.08;
      const sw = w * 0.41, sd = d * 0.68;
      const leftH = h * 0.955, rightH = h * 0.88;
      const lx = x - sw / 2 - gap / 2, rx = x + sw / 2 + gap / 2;
      boxB(x, z, lx, podH, z, sw, leftH - podH, sd, pal.body[0]);
      boxB(x, z, rx, podH, z, sw, rightH - podH, sd, pal.body[2]);
      facadeWindows(x, z, lx, podH, z, sw, leftH - podH, sd, winMain);
      facadeWindows(x, z, rx, podH, z, sw, rightH - podH, sd, Object.assign({}, winMain, { style: style === 'grid' ? 'vertical' : style }));
      facadeRibs(spec, x, z, podH, leftH - 20, sw, sd, pal, 2);
      for (let i = 1; i < 5; i++) {
        const yy = podH + (h - podH) * (i / 6);
        boxB(x, z, x, yy, z, gap + 5, 4.2, sd * 0.5, pal.body[3]);
        boxN(x, z, x, yy + 4.2, z, gap + 5.4, 0.6, sd * 0.5 + 0.6, pal.trim);
        if (i < 4) {
          beamB(x, z, new THREE.Vector3(lx, yy - 30, z + sd * 0.42), new THREE.Vector3(rx, yy + 25, z + sd * 0.42), 0.8, 0.8, pal.rib);
        }
      }
      boxB(x, z, lx, leftH, z, sw, 7, sd, pal.body[1]);
      boxB(x, z, rx, rightH, z, sw, 7, sd, pal.body[3]);
      facadeWindows(x, z, lx, leftH, z, sw, 7, sd, { floorH: 6, style: 'bands', lit: 0.2, floor0: 1, colors: pal.win });
      addTowerCrown(spec, lx, leftH + 7, z, sw, sd, pal);
      boxB(x, z, rx, rightH + 7, z, sw, 5, sd, pal.rib);
      // cross-linked pipe bridge near upper third
      boxB(x, z, x, h * 0.63, z + sd / 2 + 3, gap + 4, 3, 4, 0x4c3c32);
    } else if (spec.type === 'eco') {
      const shaftW = w * 0.64, shaftD = d * 0.64;
      const shaftH = h * 0.88;
      boxB(x, z, x, podH, z, shaftW, shaftH - podH, shaftD, pal.body[0]);
      facadeWindows(x, z, x, podH, z, shaftW, shaftH - podH, shaftD, {
        floorH: 9, style: 'sparse', lit: 0.22, colors: pal.win, floor0: 10, colSpace: 4.3
      });
      facadeRibs(spec, x, z, podH, shaftH, shaftW, shaftD, pal, 4);
      const levels = [0.27, 0.46, 0.64, 0.8];
      for (let i = 0; i < levels.length; i++) {
        const cy = podH + (shaftH - podH) * levels[i];
        addEcoTerrace(spec, x, z, pal, cy, w, i % 2 ? 1 : -1, i);
      }
      addVerticalGarden(spec, x, z, pal);
      // Grow-light halo ring.
      const ringY = podH + (shaftH - podH) * 0.59;
      const ringR = w * 1.28;
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * TAU;
        const bx = x + Math.cos(a) * ringR;
        const bz = z + Math.sin(a) * ringR * 0.72;
        const nx = x + Math.cos(a + TAU / 32) * ringR;
        const nz = z + Math.sin(a + TAU / 32) * ringR * 0.72;
        beamB(x, z, new THREE.Vector3(bx, ringY, bz), new THREE.Vector3(nx, ringY, nz), 3.4, 1.1, pal.rib);
        beamB(x, z, new THREE.Vector3(bx, ringY, bz), new THREE.Vector3(x, ringY + 24, z), 0.3, 0.3, 0x556d58);
        if (i % 2 === 0) {
          boxB(x, z, bx, ringY + 1, bz, 2.5, 5, 2.5, 0x3a2c1e);
          makeTree(x, z, bx, ringY + 5.2, bz, rand(3, 6), true);
        }
      }
      neonStrip(x, z, x, ringY - 0.5, z, w * 0.7, 0.4, d * 0.7, 0x9cff70, false, { t: 0.3, faces: ['pz', 'nz', 'px', 'nx'] });
      addWaterPlane(x + shaftW * 0.18, ringY - 1, z + shaftD / 2 + 1.4, podH + 8, 7, 0, 0x94f4e8);
      addWaterPlane(x - shaftW * 0.2, podH + (shaftH - podH) * 0.8 - 1, z + shaftD / 2 + 1.4, podH + (shaftH - podH) * 0.34, 5, 0, 0x8ce1dd);
      addTowerCrown(spec, x, shaftH, z, shaftW, shaftD, pal);
    } else if (spec.type === 'broadcast') {
      let yy = podH;
      const steps = 4;
      let ww = w * 0.8, dd = d * 0.8;
      for (let i = 0; i < steps; i++) {
        const th = (h * 0.72 - podH) / steps;
        boxB(x, z, x, yy, z, ww, th, dd, pal.body[i % 4]);
        facadeWindows(x, z, x, yy, z, ww, th, dd, Object.assign({}, winMain, { floorH: 10, lit: 0.28 + i * 0.06, style: i > 1 ? 'grid' : 'vertical' }));
        boxB(x, z, x, yy + th - 1, z, ww * 1.06, 1.8, dd * 1.06, pal.rib);
        if (i < steps - 1) {
          boxB(x, z, x, yy + th * 0.4, z + dd / 2 + 3, ww * 0.8, 12, 4, 0x1f2529);
          addGlow(x, yy + th * 0.4 + 6, z + dd / 2 + 5.2, 0xff557e, 1.8);
        }
        yy += th;
        ww *= 0.82; dd *= 0.82;
      }
      // Lattice mast and broadcast arrays.
      const mastBase = yy;
      const mastH = h * 0.2;
      boxB(x, z, x, mastBase, z, ww * 0.5, mastH, dd * 0.5, 0x23292c);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU;
        boxB(x, z, x + Math.cos(a) * ww * 0.27, mastBase, z + Math.sin(a) * dd * 0.27, 1.1, mastH, 1.1, pal.rib);
      }
      for (let i = 1; i <= 6; i++) {
        const a = mastBase + mastH * i / 7;
        for (let k = 0; k < 3; k++) {
          const aa = k / 3 * TAU + i * 0.4;
          beamB(x, z, new THREE.Vector3(x + Math.cos(aa) * ww * 0.3, a, z + Math.sin(aa) * ww * 0.3),
            new THREE.Vector3(x + Math.cos(aa + 1.7) * ww * 0.3, a, z + Math.sin(aa + 1.7) * ww * 0.3), 0.35, 0.35, 0x3f484c);
        }
      }
      addGlow(x, mastBase + mastH, z, 0xff4e72, 5);
      addBeacon(x, mastBase + mastH, z, 0xff4e72, 11);
      // Huge circular broadcast dishes.
      for (let i = 0; i < 3; i++) {
        const dy = podH + (h * 0.72 - podH) * (0.25 + i * 0.23);
        const side = i % 2 ? 1 : -1;
        const pw = ww * (0.6 - i * 0.1);
        boxB(x, z, x + side * ww * 0.55, dy, z, pw, 3.5, pw, pal.body[3], { rotY: Math.PI / 4 });
        boxB(x, z, x + side * ww * 0.55, dy + 3.5, z, 2, 2, 2, 0x2a3033);
        addGlow(x + side * ww * 0.55, dy + 2, z, pal.trim, 1.4);
      }
      addTowerCrown(spec, x, h * 0.74, z, ww, dd, pal);
      addBillboard({ x: x, y: h * 0.6, z: z + ww * 0.55 + 1.4, w: Math.min(42, w * 0.55), h: 24, rotY: 0, text: '白噪', sub: 'ON AIR / 24.7', color: '#ff527e', vertical: false, bg: true, border: true, flicker: true });
    } else if (spec.type === 'brutal') {
      const levels = 4;
      let yy = podH;
      let ww = w * 0.92, dd = d * 0.92;
      for (let i = 0; i < levels; i++) {
        const th = (h * 0.87 - podH) / levels;
        boxB(x, z, x, yy, z, ww, th, dd, pal.body[i % 4]);
        facadeWindows(x, z, x, yy, z, ww, th, dd, { floorH: 8, style: 'grid', lit: 0.22, colors: pal.win, floor0: 8, colSpace: 6.4 });
        for (let f = 0; f < 4; f++) {
          const sign = f % 2 ? -1 : 1;
          if (f < 2) boxB(x, z, x, yy, z + sign * (dd / 2 + 1.5), ww * 0.08, th * 0.82, 3, pal.rib);
          else boxB(x, z, x + sign * (ww / 2 + 1.5), yy, z, 3, th * 0.82, dd * 0.08, pal.rib);
        }
        if (i === 2) {
          // heavy overhanging mechanical cap
          boxB(x, z, x, yy + th * 0.42, z, ww * 1.26, 13, dd * 1.26, pal.body[3]);
          neonStrip(x, z, x, yy + th * 0.42, z, ww * 1.26, 13, dd * 1.26, pal.trim, false, { t: 0.4 });
        }
        yy += th;
        ww *= 0.9; dd *= 0.9;
      }
      addTowerCrown(spec, x, h * 0.87, z, ww, dd, pal);
      addFacadePipes(spec, x, z, podH + 10, h * 0.7, pal);
      voxelErode(x, z, x, podH + 10, z, w * 0.86, h * 0.72, d * 0.86, pal.rib);
    } else if (spec.type === 'water') {
      let yy = podH;
      let ww = w * 0.82, dd = d * 0.82;
      for (let i = 0; i < 4; i++) {
        const th = (h * 0.8 - podH) / 4;
        boxB(x, z, x, yy, z, ww, th, dd, pal.body[i % 4]);
        facadeWindows(x, z, x, yy, z, ww, th, dd, Object.assign({}, winMain, { floorH: 8.5, style: 'bands', lit: 0.35 }));
        boxB(x, z, x, yy + th - 1.2, z, ww * 1.04, 1.8, dd * 1.04, pal.rib);
        // broad gutter ledges
        boxB(x, z, x, yy + th * 0.55, z + dd / 2 + 1.5, ww * 0.94, 1.2, 3.4, pal.rib);
        boxN(x, z, x, yy + th * 0.56, z + dd / 2 + 3.2, ww * 0.9, 0.35, 0.4, 0x79e8ee);
        yy += th;
        ww *= 0.92; dd *= 0.92;
      }
      // suspended spherical-ish tanks (voxel octagon)
      for (let i = 0; i < 3; i++) {
        const ty = podH + (h * 0.8 - podH) * (0.33 + i * 0.21);
        const tr = 14 - i * 2;
        const tx = x + (i % 2 ? 1 : -1) * (w * 0.58);
        boxB(x, z, tx, ty, z, tr * 2, 4, tr * 2, pal.body[1], { rotY: Math.PI / 4 });
        for (let k = 1; k < 4; k++) {
          boxB(x, z, tx, ty + k * 3.2, z, tr * 2 * (1 - k * 0.08), 3.2, tr * 2 * (1 - k * 0.08), k % 2 ? pal.body[2] : pal.body[0], { rotY: Math.PI / 4 });
        }
        boxB(x, z, tx, ty - 3, z, 2, 3, 2, 0x3b3530);
        neonStrip(x, z, tx, ty + 9, z, tr * 1.6, 1.2, tr * 1.6, pal.trim, false, { t: 0.3 });
        addWaterPlane(tx, ty, z + 9, ty - h * 0.12, 3.2, 0, 0x79e8ee);
      }
      addWaterPlane(x, yy - 1, z + dd / 2 + 2.0, podH + 6, 12, 0, 0x6fe1e8);
      addTowerCrown(spec, x, h * 0.8, z, ww, dd, pal);
    } else if (spec.type === 'elevator') {
      const coreW = w * 0.48, coreD = d * 0.48;
      boxB(x, z, x, podH, z, coreW, h * 0.94 - podH, coreD, pal.body[0]);
      facadeWindows(x, z, x, podH, z, coreW, h * 0.94 - podH, coreD, { floorH: 12, style: 'vertical', lit: 0.32, colors: pal.win, floor0: 10, colSpace: 4 });
      // four guide rails, all the way up
      for (let c = 0; c < 4; c++) {
        const sx = c < 2 ? -1 : 1, sz = c % 2 ? -1 : 1;
        boxB(x, z, x + sx * (w * 0.35), podH, z + sz * (d * 0.35), 1.6, h * 0.95 - podH, 1.6, pal.rib);
        for (let yy = podH + 30; yy < h * 0.9; yy += 110) addGlow(x + sx * w * 0.35, yy, z + sz * d * 0.35, pal.trim, 0.8);
      }
      // service rings
      for (let r = 0; r < 3; r++) {
        const ry = podH + (h * 0.84 - podH) * (0.28 + r * 0.28);
        const R = w * (1.1 - r * 0.13);
        const segs = 18;
        for (let i = 0; i < segs; i++) {
          const a0 = i / segs * TAU, a1 = (i + 1) / segs * TAU;
          beamB(x, z, new THREE.Vector3(x + Math.cos(a0) * R, ry, z + Math.sin(a0) * R), new THREE.Vector3(x + Math.cos(a1) * R, ry, z + Math.sin(a1) * R), 3.0, 1.5, pal.rib);
          beamB(x, z, new THREE.Vector3(x + Math.cos(a0) * R, ry, z + Math.sin(a0) * R), new THREE.Vector3(x, ry + 18, z), 0.4, 0.4, 0x63727d);
          if (i % 3 === 0) addGlow(x + Math.cos(a0) * R, ry + 1, z + Math.sin(a0) * R, pal.trim, 1.4);
        }
        for (let i = 0; i < 4; i++) {
          const a = i / 4 * TAU + r * 0.2;
          boxB(x, z, x + Math.cos(a) * R * 0.6, ry + 2, z + Math.sin(a) * R * 0.6, 6, 7, 6, pal.body[2]);
        }
      }
      // cable beyond the atmosphere
      boxB(x, z, x, h * 0.94, z, 1.2, 2300, 1.2, 0x343d42);
      for (let yy = h * 0.95; yy < 2900; yy += 85) addGlow(x, yy, z, 0xb5eaff, 1.0);
      addBeacon(x, h * 0.94 + 180, z, 0xa8e9ff, 12);
      addTowerCrown(spec, x, h * 0.94, z, coreW, coreD, pal);
      addBillboard({ x: x, y: 270, z: z + coreD / 2 + 3, w: 28, h: 58, rotY: 0, text: '垂心', sub: 'ORBITAL TETHER / 09', color: '#a8e9ff', vertical: true, bg: true, border: true, flicker: false });
    } else if (spec.type === 'spine') {
      const levels = 5;
      let yy = podH;
      let ww = w * 0.78, dd = d * 0.78;
      for (let i = 0; i < levels; i++) {
        const th = (h * 0.87 - podH) / levels;
        boxB(x, z, x, yy, z, ww, th, dd, pal.body[i % 4]);
        facadeWindows(x, z, x, yy, z, ww, th, dd, Object.assign({}, winMain, { floorH: 7.5 - i * 0.3, style: i % 2 ? 'bands' : 'vertical', lit: 0.4 }));
        boxB(x, z, x, yy + th - 1.1, z, ww * 1.09, 1.7, dd * 1.09, pal.rib);
        // side gangways and exposed mechanical shelves
        const sx = i % 2 ? 1 : -1;
        boxB(x, z, x + sx * ww * 0.62, yy + 8, z, ww * 0.32, th * 0.55, dd * 0.66, pal.body[(i + 1) % 4]);
        facadeWindows(x, z, x + sx * ww * 0.62, yy + 8, z, ww * 0.32, th * 0.55, dd * 0.66, { floorH: 6, style: 'bands', lit: 0.34, floor0: 1, colors: pal.win });
        neonStrip(x, z, x + sx * ww * 0.62, yy + 8, z, ww * 0.32, th * 0.55, dd * 0.66, pal.trim, true, { t: 0.35 });
        for (let b = 0; b < 3; b++) {
          beamB(x, z, new THREE.Vector3(x + sx * ww * 0.4, yy + 10 + b * th * 0.14, z + dd * 0.46),
            new THREE.Vector3(x + sx * ww * 0.52, yy + th * 0.44, z + dd * 0.46), 0.7, 0.7, pal.rib);
        }
        yy += th;
        ww *= 0.9; dd *= 0.9;
      }
      addTowerCrown(spec, x, h * 0.87, z, ww, dd, pal);
      addFacadePipes(spec, x, z, podH + 15, h * 0.8, pal);
      voxelErode(x, z, x, podH + 10, z, w * 0.7, h * 0.7, d * 0.7, pal.rib);
    } else if (spec.type === 'algae') {
      let yy = podH;
      let ww = w * 0.78, dd = d * 0.78;
      for (let i = 0; i < 5; i++) {
        const th = (h * 0.84 - podH) / 5;
        // two crossed boxes give an octagonal voxel footprint
        boxB(x, z, x, yy, z, ww, th, dd, pal.body[i % 4]);
        boxB(x, z, x, yy, z, ww * 0.88, th, dd * 0.88, pal.body[(i + 2) % 4], { rotY: Math.PI / 4 });
        facadeWindows(x, z, x, yy, z, ww, th, dd, Object.assign({}, winMain, { floorH: 9, style: 'bands', lit: 0.55, colors: WINDOW_COLORS.green }));
        for (let side = 0; side < 4; side++) {
          const sign = side % 2 ? -1 : 1;
          if (side < 2) {
            boxB(x, z, x, yy + 4, z + sign * (dd / 2 + 2.1), ww * 0.7, th - 8, 3, 0x1e3734);
            boxN(x, z, x, yy + 6, z + sign * (dd / 2 + 3.7), ww * 0.64, th - 12, 0.5, 0x68e6b7);
          } else {
            boxB(x, z, x + sign * (ww / 2 + 2.1), yy + 4, z, 3, th - 8, dd * 0.7, 0x1e3734);
            boxN(x, z, x + sign * (ww / 2 + 3.7), yy + 6, z, 0.5, th - 12, dd * 0.64, 0x68e6b7);
          }
        }
        // external algal tank pods
        for (let p = 0; p < 3; p++) {
          const ang = p / 3 * TAU + i * 0.55;
          const px = x + Math.cos(ang) * ww * 0.67;
          const pz = z + Math.sin(ang) * dd * 0.67;
          boxB(x, z, px, yy + th * 0.18, pz, 8, th * 0.44, 8, 0x31594c, { rotY: Math.PI / 4 });
          boxN(x, z, px, yy + th * 0.2, pz, 8.4, th * 0.4, 8.4, 0x8affb5, { rotY: Math.PI / 4 });
          addGlow(px, yy + th * 0.4, pz, 0x8affb5, 1.5);
        }
        neonStrip(x, z, x, yy + th - 1.2, z, ww, 1.2, dd, 0x8affb5, false, { t: 0.4 });
        yy += th;
        ww *= 0.92; dd *= 0.92;
      }
      addTowerCrown(spec, x, h * 0.84, z, ww, dd, pal);
    } else if (spec.type === 'anchor') {
      // Four giant buttresses around a kilometer-scale shaft.
      const coreW = w * 0.5, coreD = d * 0.5;
      boxB(x, z, x, podH, z, coreW, h * 0.9 - podH, coreD, pal.body[0]);
      facadeWindows(x, z, x, podH, z, coreW, h * 0.9 - podH, coreD, { floorH: 16, style: 'vertical', lit: 0.28, colors: pal.win, floor0: 20, colSpace: 7 });
      for (let c = 0; c < 4; c++) {
        const sx = c < 2 ? -1 : 1, sz = c % 2 ? -1 : 1;
        const bx = x + sx * w * 0.4, bz = z + sz * d * 0.4;
        boxB(x, z, bx, podH, bz, 18, h * 0.82 - podH, 18, pal.rib);
        for (let yy = podH + 80; yy < h * 0.8; yy += 150) {
          beamB(x, z, new THREE.Vector3(bx, yy, bz), new THREE.Vector3(x + sx * coreW * 0.5, Math.min(h * 0.86, yy + 120), z + sz * coreD * 0.5), 5, 5, pal.rib);
          addGlow(bx, yy, bz, pal.trim, 1.3);
        }
      }
      for (let i = 0; i < 5; i++) {
        const ry = h * (0.18 + i * 0.17);
        const R = w * (0.78 - i * 0.08);
        for (let k = 0; k < 4; k++) {
          boxB(x, z, x, ry, z, R * 2, 2.4, R * 2, pal.body[2], { rotY: k * Math.PI / 4 });
        }
        neonStrip(x, z, x, ry, z, R * 1.4, 2, R * 1.4, pal.trim, false, { t: 0.6 });
      }
      addTowerCrown(spec, x, h * 0.9, z, coreW, coreD, pal);
      boxB(x, z, x, h * 0.93, z, 1.5, 1500, 1.5, 0x2a3033);
      for (let yy = h * 0.94; yy < 3100; yy += 120) addGlow(x, yy, z, 0xffe1b3, 1.4);
    } else {
      // Fallback: a unique stepped industrial tower.
      let yy = podH;
      for (let i = 0; i < 5; i++) {
        const th = (h - podH) / 5;
        const ww = w * (1 - i * 0.11), dd = d * (1 - i * 0.11);
        boxB(x, z, x, yy, z, ww, th, dd, pal.body[i % 4]);
        facadeWindows(x, z, x, yy, z, ww, th, dd, winMain);
        yy += th;
      }
      addTowerCrown(spec, x, h, z, w * 0.5, d * 0.5, pal);
    }

    // Signage, facade services and accessibility lights.
    if (spec.type !== 'broadcast' && spec.type !== 'elevator') {
      const sy = Math.min(h * 0.32, 330);
      const s = nextSign();
      addBillboard({
        x: x, y: sy, z: z + d * 0.36, w: Math.min(40, w * 0.55), h: 17,
        rotY: 0, text: s[0], sub: s[1], color: '#' + pal.trim.toString(16).padStart(6, '0'),
        vertical: false, bg: true, border: true, flicker: true
      });
    }
    if (spec.type !== 'elevator' && spec.type !== 'anchor') addElevatorRail(spec, x, z, pal);
    if (spec.h > 1000) {
      // aircraft warning lights along the tallest shafts
      for (let yy = 260; yy < spec.h; yy += 240) {
        addBeacon(x, yy, z + d * 0.51, 0xff4a32, 5.5);
      }
    }
    if (spec.type === 'exo' || spec.type === 'spine' || spec.type === 'brutal') {
      addFacadePipes(spec, x, z, podH + 24, h * 0.62, pal);
    }
    occupancy.push({ x, z, w: spec.w * 1.45, d: spec.d * 1.45 });
    spec.built = true;
  }

  function buildTowers() {
    for (const spec of TOWER_SPECS) {
      buildTower(spec);
      if (spec.label) {
        dynamic.landmarkPositions.push({
          id: spec.id,
          name: spec.name,
          en: spec.en,
          x: spec.x,
          y: spec.h * 0.96,
          z: spec.z,
          alt: spec.h,
          color: spec.accent
        });
      }
    }
  }
