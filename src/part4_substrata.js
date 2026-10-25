  /* ------------------------------------------------------------------ */
  /* Substrata — the machine levels beneath the crust                   */
  /* ------------------------------------------------------------------ */
  const SUB_LEVELS = [
    { y: -108, name: '回收层', en: 'RECLAIM', tag: 'S1' },
    { y: -238, name: '铸造层', en: 'FOUNDRY', tag: 'S2' },
    { y: -372, name: '管廊层', en: 'MANIFOLD', tag: 'S3' },
    { y: -506, name: '棚户层', en: 'SHANTY', tag: 'S4' },
    { y: -646, name: '轨交层', en: 'RAILHEAD', tag: 'S5' },
    { y: -792, name: '机舱层', en: 'ENGINE', tag: 'S6' },
    { y: -942, name: '基岩层', en: 'BEDROCK', tag: 'S7' },
  ];

  function addPipeRun(x, z, x1, z1, y1, x2, z2, y2, radius, color, withClamps) {
    const steps = Math.max(2, Math.ceil(Math.hypot(x2 - x1, z2 - z1, y2 - y1) / 10));
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps, t1 = (i + 1) / steps;
      const a = new THREE.Vector3(lerp(x1, x2, t0), lerp(y1, y2, t0), lerp(z1, z2, t0));
      const b = new THREE.Vector3(lerp(x1, x2, t1), lerp(y1, y2, t1), lerp(z1, z2, t1));
      if (!withClamps || i % 3 === 0) beamB(x, z, a, b, radius, radius, color, { skipBottom: false });
      if (withClamps && i % 3 === 0) {
        const mid = a.clone().add(b).multiplyScalar(0.5);
        boxB(x, z, mid.x, mid.y - radius * 2.2, mid.z, radius * 3.2, radius * 1.5, radius * 3.2, 0x2a3030);
        if (chance(0.3)) addGlow(mid.x, mid.y + radius, mid.z, 0xff833c, 0.9);
      }
    }
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      const px = lerp(x1, x2, t), py = lerp(y1, y2, t), pz = lerp(z1, z2, t);
      boxB(x, z, px, py - radius * 1.4, pz, radius * 2.4, radius * 1.2, radius * 2.4, 0x49392c);
    }
  }

  function addWallPipes(x, z, y0, y1, side, count) {
    // "side" is x = pit wall coordinate.
    const dir = side < 0 ? 1 : -1;
    const baseX = side;
    for (let i = 0; i < count; i++) {
      const pz = PIT.z1 + 40 + i * ((PIT.z2 - PIT.z1 - 80) / Math.max(1, count - 1));
      const px = baseX + dir * (8 + (i % 3) * 5);
      const r = 2.2 + (i % 4) * 1.5;
      const col = [0x594536, 0x394747, 0x6a4a34, 0x3d3e37, 0x4b3b31][i % 5];
      boxB(0, 0, px, y0, pz, r, y1 - y0, r, col);
      for (let yy = y0 + 18; yy < y1; yy += 44) {
        boxB(0, 0, px, yy, pz, r * 2.0, 1.0, r * 2.0, 0x2b3131);
        if (chance(0.16)) {
          boxB(0, 0, px + dir * 4, yy + 12, pz, 4, 3.2, 6, 0x4f3a2a);
          boxN(0, 0, px + dir * 4, yy + 14.5, pz, 2.4, 0.5, 2.4, 0xff8b3d);
        }
      }
    }
    // giant horizontal manifold pipes that cross the wall
    for (let k = 0; k < 4; k++) {
      const yy = lerp(y0, y1, 0.2 + k * 0.19);
      addPipeRun(0, 0, side, PIT.z1 + 60, yy, side, PIT.z2 - 60, yy, 3.4 - k * 0.45, k % 2 ? 0x4e3b2e : 0x3b4645, true);
    }
  }

  function addHangingCables(x, z, x1, z1, y1, x2, z2, y2, count, color) {
    for (let c = 0; c < count; c++) {
      const sag = rand(3, 8);
      let prev = null;
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        const px = lerp(x1, x2, t);
        const pz = lerp(z1, z2, t);
        const py = lerp(y1, y2, t) - Math.sin(t * Math.PI) * sag - c * 0.5;
        const p = new THREE.Vector3(px, py, pz);
        if (prev) addLine(prev, p, color || 0x735c47, 0.55);
        prev = p;
      }
    }
  }

  function addFloorDeck(x, z, y, cx, cz, w, d, opts) {
    opts = opts || {};
    const color = opts.color || 0x211e1b;
    boxB(x, z, cx, y - 2.2, cz, w, 2.2, d, color);
    // structural underside ribs
    for (let gx = -w / 2 + 8; gx < w / 2; gx += 16) {
      boxB(x, z, cx + gx, y - 4.4, cz, 1.1, 2.2, d, 0x1e2323);
    }
    // edge warning strip and rail
    for (const side of ['pz', 'nz', 'px', 'nx']) {
      const horizontal = side === 'pz' || side === 'nz';
      const fw = horizontal ? w : d;
      const sign = (side === 'pz' || side === 'px') ? 1 : -1;
      if (chance(0.8)) {
        const wh = side === 'pz' || side === 'nz' ? [cx, y, cz + sign * d / 2] : [cx + sign * w / 2, y, cz];
        for (let t = -fw / 2 + 6; t < fw / 2 - 4; t += 16) {
          if (horizontal) {
            boxB(x, z, wh[0] + t, y, wh[2], 0.45, 1.2, 0.45, 0x3a4140);
            boxN(x, z, wh[0] + t, y + 1.2, wh[2], 0.3, 0.25, 0.3, 0xd17b35);
          } else {
            boxB(x, z, wh[0], y, wh[2] + t, 0.45, 1.2, 0.45, 0x3a4140);
            boxN(x, z, wh[0], y + 1.2, wh[2] + t, 0.3, 0.25, 0.3, 0xd17b35);
          }
        }
      }
    }
    // Deck lighting.
    for (let gx = -w / 2 + 24; gx < w / 2 - 12; gx += rand(26, 44)) {
      for (let gz = -d / 2 + 20; gz < d / 2 - 12; gz += rand(30, 60)) {
        if (!chance(0.55)) continue;
        const px = cx + gx, pz = cz + gz;
        boxB(x, z, px, y, pz, 0.5, 8, 0.5, 0x303837);
        boxB(x, z, px, y + 8, pz, 2.4, 0.5, 2.4, 0x252b2b);
        addGlow(px, y + 8, pz, opts.light || 0xffa04c, 1.3);
      }
    }
    return { x: cx, z: cz, w, d, y };
  }

  function addFactoryUnit(x, z, y, cx, cz, w, d, palette, tier) {
    const bodyH = rand(10, 26);
    boxB(x, z, cx, y, cz, w, bodyH, d, palette.body);
    boxB(x, z, cx, y + bodyH - 1, cz, w * 1.06, 1.5, d * 1.06, palette.rib);
    // sawtooth roof
    const teeth = Math.max(3, Math.floor(w / 12));
    for (let i = 0; i < teeth; i++) {
      const px = cx - w / 2 + (i + 0.5) * (w / teeth);
      const tw = w / teeth;
      boxB(x, z, px + tw * 0.25, y + bodyH, cz, tw * 0.5, tw * 0.35, d, palette.roof, { rotY: 0 });
      boxN(x, z, px + tw * 0.25, y + bodyH + tw * 0.35, cz, tw * 0.48, 0.6, d * 0.92, 0x2f3a3a);
    }
    // vents and stacks
    const stackN = 1 + Math.floor(rand(0, 3));
    for (let i = 0; i < stackN; i++) {
      const sx = cx + rand(-w * 0.36, w * 0.36);
      const sz = cz + rand(-d * 0.3, d * 0.3);
      const sh = rand(14, 46);
      boxB(x, z, sx, y + bodyH, sz, 3.6, sh, 3.6, 0x3a3630);
      for (let k = 4; k < sh; k += 10) {
        boxB(x, z, sx, y + bodyH + k, sz, 4.4, 1.1, 4.4, 0x55493c);
      }
      boxN(x, z, sx, y + bodyH + sh, sz, 4.0, 1.0, 4.0, 0x6b5a48);
      addGlow(sx, y + bodyH + sh + 1, sz, 0xff8140, 1.4);
      if (i === 0) addSmoke(sx, y + bodyH + sh + 3, sz, 1.2, 0x563b28, 0.5);
    }
    // industrial windows
    const winCol = palette.win;
    for (const face of ['pz', 'nz']) {
      const fl = Math.floor(bodyH / 6);
      for (let f = 0; f < fl; f++) {
        for (let i = 0; i < teeth; i++) {
          if (!chance(0.55)) continue;
          const px = cx - w / 2 + (i + 0.5) * (w / teeth);
          const c = faceCenter(cx, y + 4 + f * 6, cz, w, d, face);
          const off = px - cx;
          addGlowRect(x, z, [c[0] + off, c[1], c[2]], face, w / teeth * 0.5, 2.6, pick(winCol), 0.9);
        }
      }
    }
    // Loading doors.
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 'nz' : 'px';
      const c = faceCenter(cx, y + 5, cz, w, d, side);
      const fw = faceWidth(w, d, side);
      addGlowRect(x, z, [c[0] - fw * 0.24, c[1], c[2]], side, fw * 0.28, 9, 0x0b1010, 1);
      addGlowRect(x, z, [c[0] - fw * 0.24, c[1] + 4.8, c[2]], side, fw * 0.30, 0.5, 0xff913f, 1);
    }
    // Pipe breasts.
    for (let i = 0; i < 3; i++) {
      const px = cx - w / 2 + (i + 1) * w / 4;
      boxB(x, z, px, y, cz + d / 2 + 2.2, 1.2, bodyH * 0.7, 1.2, 0x4a3b2e);
      addPipeRun(x, z, px, cz + d / 2, y + bodyH * 0.3, cx + rand(-8, 8), cz, y + bodyH * 0.85, 0.9, 0x5a4635, false);
    }
    // tiny workers' catwalk
    boxB(x, z, cx, y + bodyH * 0.55, cz + d / 2 + 1.1, w * 0.9, 1.2, 2.2, 0x3e4746);
    for (let i = 0; i < 5; i++) addGlow(cx - w * 0.4 + i * w * 0.2, y + bodyH * 0.55 + 1, cz + d / 2 + 2, 0xffa04c, 0.5);
    // Automated crane gantry above.
    if (chance(0.55)) {
      const gh = rand(12, 20);
      for (const sx of [-w * 0.32, w * 0.32]) {
        boxB(x, z, cx + sx, y, cz + d * 0.2, 1.4, bodyH + gh, 1.4, 0x5c4a36);
      }
      boxB(x, z, cx, y + bodyH + gh, cz + d * 0.2, w * 0.8, 1.8, 2.2, 0x6a553c);
      const tx = cx + rand(-w * 0.25, w * 0.25);
      boxB(x, z, tx, y + bodyH + gh - 10, cz + d * 0.2, 2.4, 10, 2.4, 0x3f3a32);
      boxB(x, z, tx, y + bodyH + gh - 13, cz + d * 0.2, 4.6, 3, 4.6, 0x6d5234);
      addGlow(tx, y + bodyH + gh - 11, cz + d * 0.2, 0xff8a3c, 1.2);
    }
    occupancy.push({ x: cx, z: cz, w: w * 1.2, d: d * 1.2 });
    return bodyH;
  }

  function addSmoke(x, y, z, scale, color, density) {
    dynamic.smokeEmitters.push({ x, y, z, scale, color, density: density || 1 });
    addGlow(x, y, z, 0xff9d5f, scale * 1.8);
  }

  function addRubble(x, z, y, cx, cz, count, radius) {
    for (let i = 0; i < count; i++) {
      const px = cx + rand(-radius, radius);
      const pz = cz + rand(-radius, radius);
      const s = rand(1.5, 6);
      boxB(x, z, px, y, pz, s * rand(0.8, 2.4), s * rand(0.3, 1.1), s * rand(0.8, 2.0), pick([0x2a2c29, 0x363833, 0x242725, 0x403d36]), { rotY: rand(0, TAU) });
    }
    // rebar spikes
    for (let i = 0; i < Math.floor(count / 3); i++) {
      const px = cx + rand(-radius, radius), pz = cz + rand(-radius, radius);
      const h = rand(3, 14);
      boxB(x, z, px, y, pz, 0.45, h, 0.45, 0x5f4b39, { rotY: rand(0, TAU) });
    }
  }

  function addShantyCluster(x, z, y, cx, cz, spanX, spanZ, density, lightColor) {
    const cols = [
      [0x40382f, 0x4f4437, 0x352f29, 0x5a4b3a],
      [0x2f393a, 0x3b4646, 0x2a3233],
      [0x4c3a30, 0x624631, 0x3e332a]
    ];
    const rows = Math.max(2, Math.floor(spanX / 12));
    const colsN = Math.max(2, Math.floor(spanZ / 14));
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < colsN; j++) {
        if (!chance(density)) continue;
        const px = cx - spanX / 2 + (i + 0.5) * (spanX / rows) + rand(-2, 2);
        const pz = cz - spanZ / 2 + (j + 0.5) * (spanZ / colsN) + rand(-2, 2);
        const unitH = rand(5, 14);
        const w = rand(6, 12), d = rand(6, 12);
        const baseY = y + rand(0, 4);
        const c = pick(pick(cols));
        boxB(x, z, px, baseY, pz, w, unitH, d, c);
        if (chance(0.75)) {
          // corrugated roof
          boxB(x, z, px, baseY + unitH, pz, w * 1.14, 0.6, d * 1.1, chance(0.5) ? 0x6b4c31 : 0x3d4546, { rotY: rand(-0.06, 0.06) });
          for (let r = 0; r < 4; r++) boxB(x, z, px, baseY + unitH + r * 0.18, pz + d * 0.3, w * 1.16, 0.16, 0.5, 0x252a29);
        }
        // window
        if (chance(0.85)) {
          const face = pick(['pz', 'nx', 'px', 'nz']);
          const cw = faceCenter(px, baseY + unitH * 0.55, pz, w, d, face);
          addGlowRect(x, z, cw, face, w * 0.28, unitH * 0.3, chance(0.5) ? lightColor : 0xffbb74, 0.9);
          addGlow(cw[0], cw[1], cw[2], 0xff9a58, 0.7);
        }
        // added upper shack
        if (chance(0.45)) {
          const h2 = rand(3, 7);
          boxB(x, z, px + rand(-3, 3), baseY + unitH, pz + rand(-3, 3), w * 0.7, h2, d * 0.7, pick(cols[0]));
          if (chance(0.55)) addGlow(px, baseY + unitH + h2 + 1, pz, lightColor || 0xffa45c, 0.8);
        }
        // laundry lines / antenna
        if (chance(0.35)) {
          boxB(x, z, px, baseY + unitH, pz, 0.3, rand(6, 14), 0.3, 0x312d28);
          addGlow(px, baseY + unitH + 14, pz, 0xff5a42, 0.5);
        }
        if (chance(0.25)) {
          boxB(x, z, px + w * 0.35, baseY + unitH, pz, 2.2, 2.6, 2.2, 0x53463a);
          addLine(new THREE.Vector3(px + w * 0.35, baseY + unitH + 2.6, pz), new THREE.Vector3(px + w * 0.35 + 10, baseY + unitH + 0.2, pz + 6), 0x77604a, 0.5);
        }
        // support stilts
        if (chance(0.5)) {
          for (const sx of [-w * 0.4, w * 0.4]) {
            boxB(x, z, px + sx, y, pz, 0.6, baseY - y, 0.6, 0x3b3128);
          }
        }
      }
    }
    // Cross-cables and hanging lanterns.
    for (let i = 0; i < 9; i++) {
      const ax = cx + rand(-spanX * 0.48, spanX * 0.48);
      const az = cz + rand(-spanZ * 0.48, spanZ * 0.48);
      const bx = cx + rand(-spanX * 0.48, spanX * 0.48);
      const bz = cz + rand(-spanZ * 0.48, spanZ * 0.48);
      const yy = y + rand(7, 20);
      addHangingCables(x, z, ax, az, yy, bx, bz, yy, 1, 0x5c4d3d);
      addGlow(lerp(ax, bx, 0.5), yy - 3, lerp(az, bz, 0.5), chance(0.5) ? 0xff8a3d : 0x6ee6e0, 1.0);
    }
    if (chance(0.8)) {
      const sx = cx + rand(-spanX * 0.3, spanX * 0.3);
      const sz = cz + spanZ / 2 + 2;
      addStreetSign(sx, y + 12, sz, rand(-0.3, 0.3), 0.8, chance(0.6));
    }
  }

  function addRailLine(x, z, y, a, b, color, gauge) {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, dz);
    const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
    const g = gauge || 3.2;
    // sleepers
    for (let t = 0; t < len; t += 5.5) {
      const px = a[0] + dx * (t / len), pz = a[1] + dz * (t / len);
      boxB(x, z, px, y - 0.5, pz, g * 2.6, 0.5, 1.8, 0x3a3128, { rotY: ang });
    }
    // two rails
    let prevA = null, prevB = null;
    for (let t = 0; t <= len; t += 2.5) {
      const px = a[0] + dx * (t / len), pz = a[1] + dz * (t / len);
      const nx = Math.cos(ang) * g / 2, nz = -Math.sin(ang) * g / 2;
      const pa = new THREE.Vector3(px + nx, y, pz + nz);
      const pb = new THREE.Vector3(px - nx, y, pz - nz);
      if (prevA) {
        beamB(x, z, prevA, pa, 0.55, 0.55, 0x6d6257, { skipBottom: false });
        beamB(x, z, prevB, pb, 0.55, 0.55, 0x6d6257, { skipBottom: false });
        addLine(prevA.clone().setY(y + 0.4), pa.clone().setY(y + 0.4), color || 0xff8c3e, 0.35);
      }
      prevA = pa; prevB = pb;
      if (t % 25 === 0) addGlow(px, y + 2.5, pz, color || 0xff8c3e, 0.7);
    }
    boxB(x, z, cx, y - 3.4, cz, g * 3.4, 2.4, len, 0x1d2222, { rotY: ang });
    return { a, b, y, ang, len };
  }

  const CARGO_CAP = 420;
  let cargoSystem = null;

  function ensureCargoSystem() {
    if (cargoSystem) return cargoSystem;
    const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
    const trimGeo = new THREE.BoxGeometry(1, 1, 1);
    const wheelGeo = new THREE.BoxGeometry(1, 1, 1);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true, shininess: 10 });
    const trimMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const wheelMat = new THREE.MeshPhongMaterial({ color: 0x1c2020, flatShading: true });
    const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, CARGO_CAP);
    const trims = new THREE.InstancedMesh(trimGeo, trimMat, CARGO_CAP);
    const wheels = new THREE.InstancedMesh(wheelGeo, wheelMat, CARGO_CAP);
    for (const m of [bodies, trims, wheels]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.count = 0;
      scene.add(m);
    }
    cargoSystem = {
      bodies, trims, wheels, cars: [],
      dummy: new THREE.Object3D(), tmp: new THREE.Vector3(), look: new THREE.Vector3(),
    };
    return cargoSystem;
  }

  function addCargoCar(path, color, size, speed, startT) {
    const sys = ensureCargoSystem();
    if (sys.cars.length >= CARGO_CAP) return;
    const idx = sys.cars.length;
    sys.bodies.setColorAt(idx, new THREE.Color(color).convertSRGBToLinear());
    sys.trims.setColorAt(idx, new THREE.Color(0xffa04c).convertSRGBToLinear());
    sys.cars.push({
      path, size, speed, t: startT || 0, idx,
      pos: new THREE.Vector3(), ang: 0,
    });
    sys.bodies.instanceColor.needsUpdate = true;
    sys.trims.instanceColor.needsUpdate = true;
    sys.bodies.count = sys.trims.count = sys.wheels.count = sys.cars.length;
    return sys.cars[sys.cars.length - 1];
  }

  function updateCargoCars(dt) {
    if (!cargoSystem || !cargoSystem.cars.length) return;
    const sys = cargoSystem;
    const d = sys.dummy;
    for (const car of sys.cars) {
      const path = car.path;
      if (!path || path.length < 2) continue;
      car.t = (car.t + dt * car.speed * 0.0016) % 1;
      const fi = car.t * (path.length - 1);
      const i0 = Math.min(path.length - 2, Math.floor(fi));
      const f = fi - i0;
      car.pos.copy(path[i0]).lerp(path[i0 + 1], f);
      const look = path[Math.min(path.length - 1, i0 + 2)] || path[i0 + 1];
      car.ang = Math.atan2(look.x - path[i0].x, look.z - path[i0].z);
      const [w, h, dpt] = car.size;
      // body
      d.position.copy(car.pos);
      d.position.y += h / 2;
      d.rotation.set(0, car.ang, 0);
      d.scale.set(w, h, dpt);
      d.updateMatrix();
      sys.bodies.setMatrixAt(car.idx, d.matrix);
      // luminous trim band
      d.position.y += h * 0.16;
      d.scale.set(w * 1.03, 0.16, dpt * 1.03);
      d.updateMatrix();
      sys.trims.setMatrixAt(car.idx, d.matrix);
      // undercarriage
      d.position.y = car.pos.y + 0.22;
      d.scale.set(w * 0.7, 0.44, dpt * 0.96);
      d.updateMatrix();
      sys.wheels.setMatrixAt(car.idx, d.matrix);
    }
    sys.bodies.instanceMatrix.needsUpdate = true;
    sys.trims.instanceMatrix.needsUpdate = true;
    sys.wheels.instanceMatrix.needsUpdate = true;
  }

  function addCargoCarLegacyPlaceholder() {}

  function addElevatorShaft(x, z, cx, cz, y0, y1, color) {
    const shaftW = 9;
    for (const [ox, oz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      boxB(x, z, cx + ox * shaftW / 2, y0, cz + oz * shaftW / 2, 1.0, y1 - y0, 1.0, 0x293130);
      for (let yy = y0 + 20; yy < y1; yy += 60) addGlow(cx + ox * shaftW / 2, yy, cz + oz * shaftW / 2, color, 0.7);
    }
    for (let yy = y0 + 30; yy < y1; yy += 80) {
      boxN(x, z, cx, yy, cz, shaftW + 1, 0.8, shaftW + 1, 0xa87436);
    }
    const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    const cab = new THREE.Mesh(new THREE.BoxGeometry(shaftW - 2, 7, shaftW - 2), mat);
    cab.position.set(cx, y0 + 10, cz);
    scene.add(cab);
    dynamic.elevators.push({ mesh: cab, baseY: y0 + 4, topY: y1 - 10, speed: rand(9, 20), phase: rand(0, 1) });
    addGlow(cx, y1 - 2, cz, color, 2.2);
  }

  function addFurnace(x, z, y, cx, cz, w, d, palette) {
    boxB(x, z, cx, y, cz, w, 30, d, 0x3a322b);
    boxB(x, z, cx, y + 8, cz, w * 0.8, 20, d * 0.8, 0x2b2824);
    // glowing melt channels
    for (let i = 0; i < 3; i++) {
      const oz = cz + (i - 1) * d * 0.4;
      boxN(x, z, cx, y + 31, oz, w * 0.6, 0.5, 1.7, 0xff6a22);
      addGlow(cx, y + 32, oz, 0xff6a22, 2.4);
    }
    // chimneys
    for (let i = 0; i < 2; i++) {
      const sx = cx + (i ? 1 : -1) * w * 0.3;
      boxB(x, z, sx, y + 30, cz, 5, 55, 5, 0x4d4238);
      boxB(x, z, sx, y + 80, cz, 6.2, 3, 6.2, 0x66523f);
      addSmoke(sx, y + 84, cz, 2.2, 0x6d4933, 1);
      addGlow(sx, y + 82, cz, 0xff8443, 2);
    }
    // molten pool
    const mat = new THREE.MeshBasicMaterial({ color: 0xff5a1e, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, d * 0.7), mat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(cx, y + 1.2, cz);
    scene.add(pool);
    dynamic.water.push({ mesh: pool, mat, tex: null, speed: 0 });
    // heat haze lights
    for (let i = 0; i < 7; i++) addGlow(cx + rand(-w / 3, w / 3), y + rand(3, 26), cz + rand(-d / 3, d / 3), 0xff6326, rand(1.2, 2.6));
  }

  function addShaftVolumetrics() {
    const midZ = (PIT.z1 + PIT.z2) / 2;
    // Volumetric cones from surface floodlights into the pit.
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      const px = Math.cos(a) * 238;
      const pz = midZ + Math.sin(a) * 300;
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0xffd7a0, transparent: true, opacity: 0.032, depthWrite: false,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false
      });
      const cone = new THREE.Mesh(new THREE.ConeGeometry(36, 260, 6, 1, true), coneMat);
      cone.position.set(px, -110, pz);
      cone.rotation.x = Math.PI;
      scene.add(cone);
    }
    // Dust motes falling through the shaft.
    const N = 340;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = rand(PIT.x1 + 20, PIT.x2 - 20);
      pos[i * 3 + 1] = rand(-1000, 40);
      pos[i * 3 + 2] = midZ + rand(-(PIT.z2 - PIT.z1) / 2 + 20, (PIT.z2 - PIT.z1) / 2 - 20);
      col[i * 3] = 1.0; col[i * 3 + 1] = 0.62 + worldRng() * 0.25; col[i * 3 + 2] = 0.28;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({
      size: 1.1, vertexColors: true, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    scene.add(pts);
    dynamic.animations.push({ mesh: pts, type: 'shaftMotes' });
  }

  function buildSubstrata() {
    const pitMidZ = (PIT.z1 + PIT.z2) / 2;
    const pitMidX = 0;
    const deckW = 210;
    const deckD = 250;

    // A colossal central heat-exchange spine linking all strata.
    const spineX = 0, spineZ = pitMidZ;
    boxB(0, 0, spineX, -1000, spineZ, 26, 1000, 26, 0x232a2a);
    for (let yy = -960; yy < -40; yy += 64) {
      boxB(0, 0, spineX, yy, spineZ, 36, 3.2, 36, 0x39403d);
      boxN(0, 0, spineX, yy + 2.2, spineZ, 36.5, 0.8, 36.5, 0xff7c35);
      for (let a = 0; a < 8; a++) {
        const ang = a / 8 * TAU;
        const px = spineX + Math.cos(ang) * 21;
        const pz = spineZ + Math.sin(ang) * 21;
        boxB(0, 0, px, yy, pz, 1.4, 3.2, 1.4, 0x4c524b);
        if (a % 3 === 0) addGlow(px, yy + 2, pz, 0xff8c3e, 0.9);
      }
    }
    for (let yy = -900; yy < -80; yy += 180) {
      for (let a = 0; a < 4; a++) {
        const ang = a / 4 * TAU + Math.PI / 4;
        beamB(0, 0, new THREE.Vector3(spineX + Math.cos(ang) * 13, yy, spineZ + Math.sin(ang) * 13),
          new THREE.Vector3(spineX + Math.cos(ang) * 34, yy - 26, spineZ + Math.sin(ang) * 34), 1.0, 1.0, 0x3e4642);
      }
    }
    // Spine core glow seen from far away.
    for (let yy = -980; yy < 0; yy += 40) addGlow(spineX, yy, spineZ, 0xff6b2a, 1.7);

    // Wall pipes continue the shaft's circulatory system.
    addWallPipes(0, 0, -985, -250, PIT.x1 + 7, 13);
    addWallPipes(0, 0, -985, -300, PIT.x2 - 7, 13);

    // Seven strata, each with its own industrial logic.
    const levels = SUB_LEVELS;
    levels.forEach((lvl, li) => {
      const y = lvl.y;
      const lights = [0xff9a4e, 0xff6b31, 0xffb36b, 0xff8f5c, 0x71e6df, 0xff7c42, 0x7fffe2][li];
      // Decks. Leave a central cross-shaped void for the spine and for the eye.
      const quadrants = [
        [-140, -250, 200, 240], [140, -250, 200, 240],
        [-140, 250, 200, 240], [140, 250, 200, 240],
      ];
      if (li !== 6) {
        quadrants.forEach(([ox, oz, qw, qd]) => {
          addFloorDeck(0, 0, y, ox, pitMidZ + oz, qw, qd, { light: lights });
        });
        // Perimeter ring walkways.
        addFloorDeck(0, 0, y - 1, 0, PIT.z1 + 16, PIT.x2 - PIT.x1 - 32, 26, { light: lights, color: 0x1d1b18 });
        addFloorDeck(0, 0, y - 1, 0, PIT.z2 - 16, PIT.x2 - PIT.x1 - 32, 26, { light: lights, color: 0x1d1b18 });
      } else {
        // Broken bedrock floor with a huge fissure of light.
        addFloorDeck(0, 0, y, -120, pitMidZ, 220, 700, { light: 0x7fffe2, color: 0x1e2423 });
        addFloorDeck(0, 0, y - 2, 130, pitMidZ, 240, 700, { light: 0x7fffe2, color: 0x1e2423 });
        for (let i = 0; i < 22; i++) {
          const zz = PIT.z1 + 30 + i * 30;
          const mat = new THREE.MeshBasicMaterial({ color: 0x62e6c8, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
          const m = new THREE.Mesh(new THREE.PlaneGeometry(rand(3, 14), rand(5, 24)), mat);
          m.rotation.x = -Math.PI / 2;
          m.position.set(rand(-40, 40), y + 0.3, zz);
          scene.add(m);
          addGlow(m.position.x, y + 1, zz, 0x6effdf, 1.6);
        }
      }

      // Dense mechanical clutter on every deck.
      const machineCols = [0x3b423e, 0x4a443a, 0x2f3736, 0x514637, 0x343c3d];
      for (let i = 0; i < 16; i++) {
        const mx = rand(-210, 210);
        const mz = pitMidZ + rand(-340, 340);
        if (Math.abs(mx) < 48) continue;
        const mw = rand(6, 20), md = rand(6, 18), mh = rand(3, 12);
        boxB(0, 0, mx, y, mz, mw, mh, md, pick(machineCols));
        // conduit bundles
        for (let k = 0; k < 3; k++) {
          const ox = rand(-mw / 2, mw / 2), oz = rand(-md / 2, md / 2);
          boxB(0, 0, mx + ox, y + mh, mz + oz, 0.8, rand(2, 8), 0.8, 0x5a4837);
        }
        if (chance(0.6)) {
          addGlow(mx, y + mh + 0.5, mz, chance(0.6) ? lights : 0x63e6df, rand(0.7, 1.6));
          boxN(0, 0, mx, y + mh + 0.2, mz + md / 2, mw * 0.8, 0.3, 0.3, lights);
        }
        if (chance(0.25)) addSmoke(mx, y + mh, mz, 0.5, 0x5c5148, 0.3);
      }
      // Continuous wall service ledges and cable runs.
      for (let side = 0; side < 2; side++) {
        const wx = side === 0 ? PIT.x1 + 9 : PIT.x2 - 9;
        const dir = side === 0 ? 1 : -1;
        for (let i = 0; i < 6; i++) {
          const cz2 = pitMidZ + (-280 + i * 112);
          boxB(0, 0, wx + dir * 5, y, cz2, 5, rand(4, 9), rand(12, 26), 0x3a403c);
          addGlow(wx + dir * 8, y + 6, cz2, lights, 0.9);
        }
      }
      // Hanging work lamps over the void.
      for (let i = 0; i < 10; i++) {
        const lx = rand(-170, 170);
        const lz = pitMidZ + rand(-300, 300);
        if (Math.abs(lx) < 45) continue;
        const top = y + 24;
        addLine(new THREE.Vector3(lx, top, lz), new THREE.Vector3(lx, y + 10, lz), 0x4a4236, 0.5);
        boxB(0, 0, lx, y + 9, lz, 2.4, 1.2, 2.4, 0x312f29);
        addGlow(lx, y + 8.4, lz, lights, rand(1.0, 2.0));
      }
      // Cross-pit cable bundles tie each stratum together.
      addHangingCables(0, 0, PIT.x1 + 20, pitMidZ - 200, y + 30, PIT.x2 - 20, pitMidZ + 180, y + 8, 4, 0x564636);
      addHangingCables(0, 0, PIT.x1 + 26, pitMidZ + 260, y + 18, PIT.x2 - 26, pitMidZ - 280, y + 34, 3, 0x4c4136);

      // Structural columns from floor to surface (visible from above).
      for (let cx = -200; cx <= 200; cx += 100) {
        for (let cz = PIT.z1 + 90; cz <= PIT.z2 - 60; cz += 180) {
          if (Math.abs(cx) < 60 && li % 2 === 0) continue;
          const colW = rand(6, 11);
          const yTop = li === 0 ? -2 : levels[li - 1].y;
          boxB(cx, cz, cx + rand(-18, 18), y, cz + rand(-14, 14), colW, yTop - y, colW, 0x272e2e);
          for (let yy = y + 30; yy < yTop; yy += 70) {
            boxB(cx, cz, cx, yy, cz, colW + 5, 2.2, colW + 5, 0x353d3b);
            if (chance(0.24)) addGlow(cx, yy, cz, lights, 1.0);
          }
        }
      }

      // Layer-specific industry.
      if (li === 0) {
        // Reclaim: sorting cranes, scrap mountains, shanty mouths.
        for (let i = 0; i < 7; i++) {
          const cx = rand(-185, 185), cz = pitMidZ + rand(-300, 300);
          if (Math.abs(cx) < 35) continue;
          addFactoryUnit(0, 0, y, cx, cz, rand(28, 52), rand(26, 44), { body: 0x363b38, rib: 0x4f5550, roof: 0x2b302d, win: WINDOW_COLORS.amber }, 0);
        }
        for (let i = 0; i < 8; i++) addRubble(0, 0, y, -190 + i * 55, pitMidZ + rand(-340, 340), 12, 22);
        addShantyCluster(0, 0, y, -172, pitMidZ - 390, 120, 180, 0.8, 0xff9a4e);
        addShantyCluster(0, 0, y, 180, pitMidZ + 360, 130, 170, 0.75, 0xff7c42);
        addElevatorShaft(0, 0, -210, pitMidZ - 300, y, -8, 0xff9a4e);
      }

      if (li === 1) {
        // Foundry.
        addFurnace(0, 0, y, -150, pitMidZ - 240, 70, 54, null);
        addFurnace(0, 0, y, 165, pitMidZ + 130, 84, 62, null);
        addFurnace(0, 0, y, -120, pitMidZ + 270, 58, 48, null);
        for (let i = 0; i < 8; i++) {
          const cx = rand(-190, 190), cz = pitMidZ + rand(-320, 320);
          if (Math.abs(cx) < 80) continue;
          addFactoryUnit(0, 0, y, cx, cz, rand(26, 48), rand(24, 46), { body: 0x3b3730, rib: 0x5a5144, roof: 0x302d27, win: WINDOW_COLORS.red }, 1);
        }
        // Ingot stacks.
        for (let i = 0; i < 16; i++) {
          const bx = rand(-220, 220), bz = pitMidZ + rand(-330, 330);
          if (Math.abs(bx) < 55) continue;
          for (let k = 0; k < 3; k++) boxB(0, 0, bx, y + k * 2.6, bz, 9, 2.4, 3, 0x55453a);
          addGlow(bx, y + 8, bz, 0xff7d35, 0.8);
        }
        addPipeRun(0, 0, -200, pitMidZ - 350, y + 6, 200, pitMidZ - 350, y + 6, 4.2, 0x4f3b2c, true);
        addPipeRun(0, 0, -200, pitMidZ + 380, y + 9, 200, pitMidZ + 380, y + 9, 3.4, 0x3b4744, true);
      }

      if (li === 2) {
        // Manifold: pump halls and absurd pipe density.
        for (let i = 0; i < 5; i++) {
          const px = -180 + i * 90;
          addPipeRun(0, 0, px, pitMidZ - 380, y + 12, px, pitMidZ + 380, y + 12, 4.5, i % 2 ? 0x513d2d : 0x3d4a48, true);
          addPipeRun(0, 0, px + rand(-12, 12), pitMidZ - 390, y + 26, px + rand(-12, 12), pitMidZ + 390, y + 26, 2.8, 0x463a30, true);
        }
        for (let i = 0; i < 8; i++) {
          const px = rand(-200, 200), pz = pitMidZ + rand(-330, 330);
          if (Math.abs(px) < 46) continue;
          const w = rand(18, 36), d = rand(18, 34);
          boxB(0, 0, px, y, pz, w, rand(16, 30), d, 0x343b39);
          boxB(0, 0, px, y + 12, pz, w * 0.7, 1.6, d * 0.7, 0x4a524e);
          for (let k = 0; k < 4; k++) {
            boxB(0, 0, px + rand(-w / 2, w / 2), y + 2, pz + rand(-d / 2, d / 2), 4, 10, 4, 0x4d4033);
          }
          addGlow(px, y + 8, pz, 0xff9a50, 1.1);
          addPipeRun(0, 0, px, pz, y + 28, px + rand(-40, 40), pz + rand(-40, 40), y + 16, 1.2, 0x5a4938, false);
        }
        // Giant valves on the wall.
        for (let i = 0; i < 6; i++) {
          const zz = pitMidZ + rand(-300, 300);
          for (const xx of [PIT.x1 + 24, PIT.x2 - 24]) {
            boxB(0, 0, xx, y + 12, zz, 14, 14, 14, 0x4d3a2b);
            boxB(0, 0, xx, y + 18, zz, 18, 2.4, 2.4, 0x6b533c);
            addGlow(xx, y + 20, zz, 0xffa157, 1.2);
          }
        }
        addShantyCluster(0, 0, y, -170, pitMidZ + 400, 110, 100, 0.5, 0x6ee6e0);
      }

      if (li === 3) {
        // Shanty stratum — the densest human layer.
        for (let i = 0; i < 4; i++) {
          const cx = [-160, 160, -150, 155][i];
          const cz = pitMidZ + [-240, -180, 220, 280][i];
          addShantyCluster(0, 0, y, cx, cz, 190, 330, 0.7, 0xffa04e);
        }
        // bridges between the stacks
        for (let i = 0; i < 12; i++) {
          const zz = pitMidZ + rand(-320, 320);
          const yBridge = y + rand(8, 24);
          const side = i % 2 ? 1 : -1;
          boxB(0, 0, side * rand(80, 150), yBridge, zz, rand(40, 110), 1.2, 3.0, 0x4b3b2c);
          addHangingCables(0, 0, -140, zz, yBridge + 10, 140, zz, yBridge + 10, 2, 0x5d4a38);
          for (let k = 0; k < 4; k++) addGlow(rand(-140, 140), yBridge + 1, zz, 0xffa04e, 0.5);
        }
        addElevatorShaft(0, 0, 0, pitMidZ - 300, y, -90, 0xffa04e);
        addStreetSign(-60, y + 14, pitMidZ + 120, 0.2, 1.5, true);
        addStreetSign(80, y + 20, pitMidZ - 160, -0.3, 1.2, true);
        addStreetSign(-30, y + 26, pitMidZ + 300, Math.PI, 1.1, false);
        addShantyCluster(0, 0, y + 30, -205, pitMidZ - 380, 70, 140, 0.65, 0x6ee6e0);
      }

      if (li === 4) {
        // Railhead: cargo rails and distribution.
        const railY = y + 3;
        const railA = [-245, pitMidZ - 360], railB = [245, pitMidZ - 360];
        addRailLine(0, 0, railY, railA, railB, 0xff8b3e, 3.0);
        addRailLine(0, 0, railY, [-245, pitMidZ + 340], [245, pitMidZ + 340], 0xffc061, 3.0);
        addRailLine(0, 0, railY + 26, [-200, pitMidZ + 40], [200, pitMidZ + 40], 0x61e7e0, 2.4);
        // turntable
        boxB(0, 0, 0, y, pitMidZ + 130, 56, 4, 56, 0x343b39);
        boxN(0, 0, 0, y + 4, pitMidZ + 130, 46, 0.6, 46, 0xa46c2f);
        const path1 = [];
        for (let i = 0; i <= 40; i++) {
          const t = i / 40;
          path1.push(new THREE.Vector3(lerp(-245, 245, t), railY, pitMidZ - 360));
        }
        const path2 = [];
        for (let i = 0; i <= 32; i++) {
          const t = i / 32;
          path2.push(new THREE.Vector3(lerp(200, -200, t), railY + 26, pitMidZ + 40));
        }
        for (let i = 0; i < 4; i++) addCargoCar(path1, pick([0x4b3a2b, 0x34403d, 0x55432f]), [8, 5, 14], rand(8, 15), i / 4);
        for (let i = 0; i < 2; i++) addCargoCar(path2, pick([0x3a4644, 0x4f3d2c]), [7, 4, 10], rand(6, 12), i / 2);
        // Gantry cranes and rail-side factories.
        for (let i = 0; i < 5; i++) {
          const px = -190 + i * 95;
          const pz = pitMidZ - 330;
          boxB(0, 0, px - 22, y, pz, 3, 34, 3, 0x544433);
          boxB(0, 0, px + 22, y, pz, 3, 34, 3, 0x544433);
          boxB(0, 0, px, y + 34, pz, 52, 2, 3.6, 0x685239);
          boxB(0, 0, px, y + 22, pz, 3, 13, 3, 0x393a32);
          addGlow(px, y + 36, pz, 0xff9c4c, 1.4);
        }
        addElevatorShaft(0, 0, 212, pitMidZ + 140, y, -370, 0xffc061);
      }

      if (li === 5) {
        // Engine stratum: turbines and coolant lake.
        // Coolant basin: near-black liquid with a specular sheen, ringed by a
        // lit concrete lip. Reads as a basin, not a glowing rectangle.
        const lakeMat = new THREE.MeshStandardMaterial({
          color: 0x03090c, roughness: 0.24, metalness: 0.35,
          envMapIntensity: 0.85, transparent: true, opacity: 0.99,
        });
        const lake = new THREE.Mesh(new THREE.PlaneGeometry(210, 360), lakeMat);
        lake.rotation.x = -Math.PI / 2;
        lake.position.set(0, y + 0.55, pitMidZ);
        scene.add(lake);
        dynamic.water.push({ mesh: lake, mat: lakeMat, tex: null, speed: 0 });
        // Concrete lip around the basin.
        for (let i = 0; i < 4; i++) {
          const horiz = i < 2, sign = i % 2 ? -1 : 1;
          if (horiz) {
            boxB(0, 0, 0, y - 1.2, pitMidZ + sign * 186, 226, 3.0, 12, 0x2b3130);
            boxN(0, 0, 0, y + 1.8, pitMidZ + sign * 186, 226, 0.5, 12.4, 0x54868a);
          } else {
            boxB(0, 0, sign * 111, y - 1.2, pitMidZ, 12, 3.0, 372, 0x2b3130);
            boxN(0, 0, sign * 111, y + 1.8, pitMidZ, 12.4, 0.5, 372, 0x54868a);
          }
        }
        // Contained coolant basin with a luminous service rim, not a glowing slab.
        for (let i = 0; i < 34; i++) {
          const a = i / 34 * TAU;
          const px = Math.cos(a) * 128;
          const pz = pitMidZ + Math.sin(a) * 216;
          boxB(0, 0, px, y - 2, pz, 7, 3.4, 7, 0x2c3433);
          boxN(0, 0, px, y + 1.4, pz, 2.2, 0.5, 2.2, 0x4a8e91);
        }
        for (let i = 0; i < 7; i++) {
          addGlow(rand(-90, 90), y + 1.6, pitMidZ + rand(-165, 165), 0x2a5f66, 0.6);
        }
        // Floating maintenance pontoons and pumps.
        for (let i = 0; i < 7; i++) {
          const px = rand(-95, 95), pz = pitMidZ + rand(-180, 180);
          boxB(0, 0, px, y + 1.2, pz, rand(8, 18), 2.2, rand(6, 14), 0x31403e);
          boxB(0, 0, px, y + 3.2, pz, rand(4, 9), rand(2, 5), rand(4, 8), 0x46524d);
          addGlow(px, y + 4, pz, 0xff9a4e, 1.0);
          if (chance(0.5)) addSmoke(px, y + 5, pz, 0.5, 0x6b7a78, 0.25);
        }
        // turbine halls along the walls
        for (let i = 0; i < 4; i++) {
          const sx = i % 2 ? 175 : -175;
          const sz = pitMidZ + [-280, -100, 90, 270][i];
          boxB(0, 0, sx, y, sz, 96, 44, 96, 0x2f3534);
          boxB(0, 0, sx, y + 44, sz, 106, 3, 106, 0x414a47);
          for (let k = 0; k < 4; k++) {
            boxB(0, 0, sx - 42 + k * 28, y + 8, sz + 50, 18, 26, 3, 0x1e2526);
            addGlow(sx - 42 + k * 28, y + 22, sz + 52, 0x72e5ee, 1.2);
            addWaterPlane(sx - 42 + k * 28, y + 34, sz + 52, y + 8, 3, 0, 0x5fd9e1);
          }
          // huge fan
          const fanMat = new THREE.MeshBasicMaterial({ color: 0x5fd9e1, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
          const fan = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), fanMat);
          fan.position.set(sx, y + 22, sz + 52.5);
          scene.add(fan);
          dynamic.animations.push({ mesh: fan, type: 'spinFan', speed: rand(1.4, 3) });
          addSmoke(sx, y + 46, sz, 1.6, 0x40545a, 0.7);
        }
        // heat exchange pipes rising
        for (let i = 0; i < 4; i++) {
          const px = -120 + i * 80;
          addPipeRun(0, 0, px, pitMidZ - 330, y + 4, px + rand(-20, 20), pitMidZ + 330, -10, 1.6, 0x5a4331, true);
        }
        // Pump halls, transformer banks and coolant manifolds around the basin.
        for (let i = 0; i < 30; i++) {
          const a = i / 30 * TAU + 0.25;
          const r = rand(132, 196);
          const px = Math.cos(a) * r;
          const pz = pitMidZ + Math.sin(a) * r * 0.95;
          if (Math.abs(px) < 118 && Math.abs(pz - pitMidZ) < 200) continue;
          const w = rand(14, 30), dpt = rand(12, 26), hh = rand(8, 22);
          const body = pick([0x2c3432, 0x353a34, 0x262d2d, 0x3a3630]);
          boxB(0, 0, px, y, pz, w, hh, dpt, body);
          boxB(0, 0, px, y + hh, pz, w * 1.05, 1.4, dpt * 1.05, 0x3f4640);
          // pump drums and valve stacks
          for (let k = 0; k < 3; k++) {
            const ox = rand(-w * 0.36, w * 0.36);
            const oz = rand(-dpt * 0.36, dpt * 0.36);
            boxB(0, 0, px + ox, y + hh, pz + oz, rand(2.4, 5), rand(4, 11), rand(2.4, 5), 0x4a4136);
            if (chance(0.5)) addGlow(px + ox, y + hh + 5, pz + oz, 0xff9a4e, 0.9);
          }
          // hazard stripe and inspection lamp
          boxN(0, 0, px, y + hh * 0.62, pz + dpt / 2 + 0.3, w * 0.7, 0.7, 0.3, 0xb07a34);
          addGlow(px, y + hh + 2, pz + dpt * 0.5, 0xffb066, 1.1);
          // conduit to the basin
          addPipeRun(0, 0, px, pz, y + 2, px * 0.55, pitMidZ + (pz - pitMidZ) * 0.4, y + 2, 0.9, 0x50402f, false);
        }
        // Overhead gantry ring above the basin with moving trolleys.
        for (let i = 0; i < 26; i++) {
          const a0 = i / 26 * TAU, a1 = (i + 1) / 26 * TAU;
          const R = 150;
          const p0 = new THREE.Vector3(Math.cos(a0) * R, y + 44, pitMidZ + Math.sin(a0) * R * 0.94);
          const p1 = new THREE.Vector3(Math.cos(a1) * R, y + 44, pitMidZ + Math.sin(a1) * R * 0.94);
          beamB(0, 0, p0, p1, 4.0, 1.6, 0x39413d);
          if (i % 3 === 0) {
            boxB(0, 0, p0.x, y, p0.z, 3.2, 44, 3.2, 0x2c3431);
            addGlow(p0.x, y + 45, p0.z, 0xffa052, 1.0);
          }
        }
        // Cargo staging with containers.
        for (let i = 0; i < 26; i++) {
          const px = rand(-205, 205);
          const pz = pitMidZ + rand(-330, 330);
          if (Math.abs(px) < 122 && Math.abs(pz - pitMidZ) < 196) continue;
          const n = randi(1, 3);
          for (let k = 0; k < n; k++) {
            boxB(0, 0, px, y + k * 3.4, pz, 12, 3.2, 5.4, pick([0x6a4529, 0x3f5a55, 0x5d4a33, 0x474f42]));
            boxN(0, 0, px, y + k * 3.4 + 2.9, pz + 2.8, 11, 0.35, 0.25, 0x9c7a45);
          }
        }
        addElevatorShaft(0, 0, 0, pitMidZ - 330, y, -506, 0x5fd9e1);
      }

      if (li === 6) {
        // Bedrock: oldest ruins, glowing archaeology, the base of the spine.
        const ruins = 18;
        for (let i = 0; i < ruins; i++) {
          const px = rand(-220, 220);
          if (Math.abs(px) < 55) continue;
          const pz = pitMidZ + rand(-330, 330);
          // leaning foundations
          const lean = rand(-0.25, 0.25);
          boxB(0, 0, px, y, pz, rand(12, 30), rand(6, 26), rand(12, 30), pick([0x2b2f2c, 0x353934, 0x232724]), { rotY: lean });
          if (chance(0.5)) {
            boxB(0, 0, px + rand(-10, 10), y + 6, pz + rand(-10, 10), rand(8, 18), rand(8, 22), rand(8, 18), 0x383c36, { rotY: lean + rand(-0.2, 0.2) });
          }
          addRubble(0, 0, y, px, pz, 7, 24);
          addGlow(px, y + rand(2, 20), pz, 0x6effdf, rand(0.8, 1.8));
          // roots of the machine
          boxB(0, 0, px, y, pz, 2, 38 + rand(0, 30), 2, 0x242a27);
        }
        // The oldest ring around the spine.
        for (let r = 0; r < 3; r++) {
          const R = 80 + r * 58;
          const ry = y + 6 + r * 10;
          for (let i = 0; i < 40; i++) {
            const a0 = i / 40 * TAU, a1 = (i + 1) / 40 * TAU;
            const p0 = new THREE.Vector3(Math.cos(a0) * R, ry - Math.sin(a0 * 3) * 4, pitMidZ + Math.sin(a0) * R);
            const p1 = new THREE.Vector3(Math.cos(a1) * R, ry - Math.sin(a1 * 3) * 4, pitMidZ + Math.sin(a1) * R);
            beamB(0, 0, p0, p1, 4.2, 2.4, 0x363d39, { skipBottom: false });
            if (i % 4 === 0) addGlow(p0.x, p0.y + 2, p0.z, 0x6effdf, 1.3);
          }
        }
        addSmoke(0, y + 4, pitMidZ, 3.2, 0x3d5d59, 0.5);
        // Massive drain grates and dead machines.
        for (let i = 0; i < 10; i++) {
          const gx = rand(-220, 220), gz = pitMidZ + rand(-340, 340);
          if (Math.abs(gx) < 50) continue;
          boxB(0, 0, gx, y - 0.5, gz, 14, 1.2, 14, 0x212625);
          for (let k = 0; k < 5; k++) boxN(0, 0, gx - 5 + k * 2.6, y + 0.8, gz, 1.2, 0.4, 12, 0x4c4c3f);
        }
      }

      // Layer interaction: vertical pipe trunks and cable bundles at the walls.
      const prevY = li > 0 ? levels[li - 1].y : -10;
      for (let i = 0; i < 7; i++) {
        const zz = PIT.z1 + 40 + i * (PIT.z2 - PIT.z1 - 80) / 6;
        for (let k = 0; k < 2; k++) {
          addPipeRun(0, 0, PIT.x1 + 12 + k * 7, zz, y, PIT.x1 + 16 + k * 7, zz + rand(-18, 18), prevY, 1.2, 0x544131, false);
        }
      }

      // Vertical ladders between strata by the walls.
      for (let i = 0; i < 4; i++) {
        const zz = pitMidZ + [-260, -70, 120, 300][i];
        for (const xx of [-232, 232]) {
          boxB(0, 0, xx, y, zz, 1.2, 30, 1.2, 0x4a4236);
          for (let yy = y + 4; yy < y + 30; yy += 4.2) {
            boxB(0, 0, xx, yy, zz, 3.2, 0.35, 0.6, 0x5f5442);
          }
          addGlow(xx, y + 30, zz, lights, 0.7);
        }
      }
    });

    function lvIndex(arr) { return arr.length; }

    // Cross-layer transfers: vertical conveyors and hanging chutes.
    for (let i = 0; i < 6; i++) {
      const bx = [-190, 190, -110, 160, -210, 210][i];
      const bz = pitMidZ + [-300, 260, 340, -330, 40, -60][i];
      addElevatorShaft(0, 0, bx, bz, -940, -20, [0xff7f3a, 0x63e6e0][i % 2]);
    }
    for (let i = 0; i < 10; i++) {
      const bx = rand(-220, 220), bz = pitMidZ + rand(-330, 330);
      if (Math.abs(bx) < 55) continue;
      const py = rand(-900, -80);
      const len = rand(40, 160);
      addHangingCables(0, 0, bx, bz, py, bx + rand(-50, 50), bz + rand(-50, 50), py - len, 3, 0x5c4938);
      addGlow(bx, py, bz, 0xff7c3a, 1.2);
    }
    // A pair of giant spiral maintenance stairs around the central spine.
    for (let i = 0; i < 220; i++) {
      const a0 = i / 220 * TAU * 7;
      const a1 = (i + 1) / 220 * TAU * 7;
      const yy = lerp(-960, -40, i / 220);
      const R = 30;
      const p0 = new THREE.Vector3(Math.cos(a0) * R, yy, pitMidZ + Math.sin(a0) * R);
      const p1 = new THREE.Vector3(Math.cos(a1) * R, yy + 4.2, pitMidZ + Math.sin(a1) * R);
      beamB(0, 0, p0, p1, 4.0, 0.7, 0x3c4441, { skipBottom: false });
      if (i % 9 === 0) addGlow(p0.x, p0.y + 1, p0.z, 0xff873f, 0.7);
    }

    // Slum tentacles spilling up the pit wall to the surface.
    for (let side = 0; side < 2; side++) {
      const wx = side === 0 ? PIT.x1 + 18 : PIT.x2 - 18;
      const dir = side === 0 ? 1 : -1;
      for (let i = 0; i < 9; i++) {
        const zz = PIT.z1 + 80 + i * (PIT.z2 - PIT.z1 - 160) / 8;
        const yy = -520 + (i % 4) * 46;
        boxB(0, 0, wx + dir * rand(4, 16), yy, zz, rand(9, 20), rand(8, 18), rand(8, 18), 0x3a332a);
        addGlow(wx + dir * 9, yy + 8, zz, 0xffa04e, 0.9);
        if (chance(0.7)) addHangingCables(0, 0, wx, zz, yy + 20, wx + dir * 18, zz + rand(-18, 18), yy + 10, 2, 0x5d4a38);
      }
    }

    addShaftVolumetrics();
    // Layer rings and stencilled depth markers make the shaft legible from above.
    const levelColors = [0xff9a4e, 0xff6b31, 0xffb36b, 0xff8f5c, 0x71e6df, 0xff7c42, 0x7fffe2];
    levels.forEach((lvl, li) => {
      const c = levelColors[li];
      const y = lvl.y + 2;
      // Luminous band on all four interior walls.
      const inset = 1.6;
      // long north/south bands
      boxN(0, 0, 0, y, PIT.z1 + inset, PIT.x2 - PIT.x1 - 8, 1.2, 0.5, c);
      boxN(0, 0, 0, y, PIT.z2 - inset, PIT.x2 - PIT.x1 - 8, 1.2, 0.5, c);
      boxN(0, 0, PIT.x1 + inset, y, pitMidZ, 0.5, 1.2, PIT.z2 - PIT.z1 - 8, c);
      boxN(0, 0, PIT.x2 - inset, y, pitMidZ, 0.5, 1.2, PIT.z2 - PIT.z1 - 8, c);
      for (let i = 0; i < 28; i++) {
        addGlow(PIT.x1 + 4, y + 1, PIT.z1 + 40 + i * (PIT.z2 - PIT.z1 - 80) / 27, c, 0.8);
        addGlow(PIT.x2 - 4, y + 1, PIT.z1 + 40 + i * (PIT.z2 - PIT.z1 - 80) / 27, c, 0.8);
      }
      // Huge stencilled sector labels on the shaft walls.
      const labelZ = PIT.z1 + 120 + (li % 3) * 170;
      addBillboard({
        x: PIT.x1 + 5, y: y + 26, z: labelZ, w: 54, h: 22, rotY: Math.PI / 2,
        text: lvl.tag + ' / ' + lvl.name, sub: Math.abs(lvl.y) + ' M BELOW DATUM',
        color: '#' + c.toString(16).padStart(6, '0'), vertical: false, bg: true, border: true, flicker: false
      });
      // Suspended hazard ring around the spine.
      for (let i = 0; i < 24; i++) {
        const a0 = i / 24 * TAU, a1 = (i + 1) / 24 * TAU;
        const R = 58 + li * 3;
        const p0 = new THREE.Vector3(Math.cos(a0) * R, y + 12, pitMidZ + Math.sin(a0) * R);
        const p1 = new THREE.Vector3(Math.cos(a1) * R, y + 12, pitMidZ + Math.sin(a1) * R);
        beamN(0, 0, p0, p1, 1.6, 0.5, c);
      }
    });

    // The shaft uses sprite-based mist instead of flat translucent planes,
    // because stacked planes read as solid sheets at grazing angles.

    // Deep fog lights.
    for (let i = 0; i < 34; i++) {
      const yy = rand(-980, -20);
      addGlow(rand(-240, 240), yy, pitMidZ + rand(-330, 330), chance(0.6) ? 0xff7b36 : 0x63e6df, rand(0.8, 2.2));
    }
  }
