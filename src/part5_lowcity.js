  /* ------------------------------------------------------------------ */
  /* Lowline — the 0–200 m layer of factories, market and stacked homes  */
  /* ------------------------------------------------------------------ */
  const LOW = {
    marketCx: 356,
    marketCz: 738,
    marketW: 420,
    marketD: 360,
  };

  const TENEMENT_COLORS = [
    [0x33322e, 0x3d3b34, 0x2a2a26, 0x454039],
    [0x2d3332, 0x373c3b, 0x262b2b, 0x3e423e],
    [0x3a332c, 0x453c31, 0x302b26, 0x4b4136],
    [0x2a2f2d, 0x343936, 0x242827, 0x393e39],
  ];

  function addBalcony(x, z, cx, y, cz, w, d, face, length) {
    const fw = faceWidth(w, d, face);
    const c = faceCenter(cx, y, cz, w, d, face);
    const horiz = face === 'pz' || face === 'nz';
    const bw = Math.min(length || fw * 0.7, fw * 0.9);
    if (horiz) {
      boxB(x, z, c[0], y, c[2], bw, 0.7, 2.4, 0x464b46);
      boxB(x, z, c[0], y + 3.0, c[2], bw, 0.35, 0.35, 0x5b5f58);
      for (let i = -bw / 2 + 1.5; i < bw / 2; i += 3.4) {
        boxB(x, z, c[0] + i, y, c[2], 0.25, 3.2, 0.25, 0x55594f);
      }
    } else {
      boxB(x, z, c[0], y, c[2], 2.4, 0.7, bw, 0x464b46);
      boxB(x, z, c[0], y + 3.0, c[2], 0.35, 0.35, bw, 0x5b5f58);
      for (let i = -bw / 2 + 1.5; i < bw / 2; i += 3.4) {
        boxB(x, z, c[0], y, c[2] + i, 0.25, 3.2, 0.25, 0x55594f);
      }
    }
    // clothesline / AC / potted plants
    if (chance(0.55)) {
      const xx = c[0] + (horiz ? rand(-bw * 0.3, bw * 0.3) : 0);
      const zz = c[2] + (horiz ? 0 : rand(-bw * 0.3, bw * 0.3));
      boxB(x, z, xx, y + 1.0, zz, 1.6, 1.4, 1.0, 0x51554f);
      addGlow(xx, y + 1.8, zz + (face === 'pz' ? 0.6 : -0.6), 0xffa558, 0.4);
    }
    if (chance(0.65)) {
      const ax = c[0] + (horiz ? bw * 0.4 : 0.7);
      const az = c[2] + (horiz ? 0.7 : bw * 0.4);
      boxB(x, z, ax, y + 3.4, az, rand(1.6, 2.8), rand(1.4, 2.4), rand(1.2, 2), 0x60635b);
    }
    if (chance(0.4)) {
      const lx = c[0] + (horiz ? rand(-bw * 0.3, bw * 0.3) : 0);
      const lz = c[2] + (horiz ? 0 : rand(-bw * 0.3, bw * 0.3));
      addHangingCables(x, z, lx, lz, y + 4, lx + rand(-12, 12), lz + rand(-12, 12), y + 3.2, 1, 0x706050);
    }
  }

  function addTenement(x, z, cx, cz, w, d, h, seed, style) {
    const rng = mulberry32(seed);
    const cols = TENEMENT_COLORS[seed % TENEMENT_COLORS.length];
    const body = cols[seed % cols.length];
    const floors = Math.max(2, Math.floor(h / 5.2));
    const floorH = h / floors;
    // Stepped mass instead of one box.
    let yy = 0;
    let ww = w, dd = d;
    boxB(x, z, cx, 0, cz, ww, h, dd, body);
    // The facade is broken into varied volumes on all sides.
    for (let i = 0; i < 3; i++) {
      const side = (seed + i) % 4;
      const sign = (seed >> i) & 1 ? 1 : -1;
      const bw = ww * rand(0.3, 0.6);
      const bd = dd * rand(0.3, 0.6);
      const bh = rand(8, Math.max(10, h * 0.5));
      if (side < 2) {
        boxB(x, z, cx + rand(-ww * 0.28, ww * 0.28), rand(0, h - bh), cz + sign * dd * 0.43, bw, bh, dd * 0.16, cols[(seed + i + 1) % cols.length]);
      } else {
        boxB(x, z, cx + sign * ww * 0.43, rand(0, h - bh), cz + rand(-dd * 0.28, dd * 0.28), ww * 0.16, bh, bd, cols[(seed + i + 1) % cols.length]);
      }
    }
    // Rooftop shacks and water tanks.
    const roofY = h;
    for (let i = 0; i < 3; i++) {
      if (!chance(0.75)) continue;
      const rx = cx + rand(-ww * 0.3, ww * 0.3);
      const rz = cz + rand(-dd * 0.3, dd * 0.3);
      const rw = rand(5, 11), rd = rand(5, 11), rh = rand(3, 7);
      boxB(x, z, rx, roofY, rz, rw, rh, rd, chance(0.5) ? cols[0] : 0x5a4a37);
      boxB(x, z, rx, roofY + rh, rz, rw * 1.15, 0.4, rd * 1.1, 0x4b3a29);
      if (chance(0.6)) addGlow(rx, roofY + rh * 0.7, rz + rd / 2, 0xffb170, 0.6);
    }
    for (let i = 0; i < 2; i++) {
      boxB(x, z, cx + rand(-ww * 0.35, ww * 0.35), roofY, cz + rand(-dd * 0.35, dd * 0.35), 2.4, 3.2, 2.4, 0x4a4038);
      boxN(x, z, cx, roofY + 3.2, cz, 2.6, 0.3, 2.6, 0x6d5741);
    }
    // External stair tower on one corner.
    if (style !== 'stack') {
      const sx = cx + (seed % 2 ? 1 : -1) * ww * 0.56;
      const sz = cz + (seed % 3 ? 1 : -1) * dd * 0.5;
      for (let f = 0; f < floors; f++) {
        boxB(x, z, sx, f * floorH, sz, 4.6, 0.6, 4.6, 0x3c423e);
        boxB(x, z, sx, f * floorH, sz, 0.35, 3.5, 3.6, 0x5c5c52);
        if (f % 2 === 0) addGlow(sx + 2.1, f * floorH + 2.8, sz, 0xffa35c, 0.5);
      }
    }
    // Facade windows on all faces.
    const litColors = seed % 4 === 0 ? WINDOW_COLORS.cyan : (seed % 4 === 1 ? WINDOW_COLORS.amber : WINDOW_COLORS.mixed);
    for (const face of ['pz', 'nz', 'px', 'nx']) {
      const fw = faceWidth(ww, dd, face);
      const colsN = Math.max(2, Math.floor(fw / 8));
      const cell = fw / colsN;
      for (let f = 1; f < floors; f++) {
        const fy = f * floorH + floorH * 0.48;
        for (let c = 0; c < colsN; c++) {
          const ctr = faceCenter(cx, fy, cz, ww, dd, face);
          const off = -fw / 2 + cell * (c + 0.5);
          const px = ctr[0] + (face === 'pz' || face === 'nz' ? off : 0);
          const pz = ctr[2] + (face === 'px' || face === 'nx' ? off : 0);
          const isLit = (rng() < 0.38 || (f === 2 && c === 1));
          if (!isLit && rng() > 0.22) continue;
          addGlowRect(x, z, [px, fy, pz], face, cell * 0.5, floorH * 0.34, isLit ? (rng() < 0.7 ? pick(litColors) : 0xffb070) : 0x070a0a, isLit ? 1 : 1);
          if (rng() < 0.2) addGlow(px, fy, pz, 0xffa45c, 0.35);
        }
      }
      // Balconies on selected floors.
      if (style !== 'stack') {
        for (let f = 2; f < floors; f += 2) {
          if (rng() < 0.6) addBalcony(x, z, cx, f * floorH, cz, ww, dd, face, fw * rand(0.5, 0.8));
        }
      }
    }
    // Ground floor shopfronts / awnings with warm light.
    for (const face of ['pz', 'nz', 'px', 'nx']) {
      if (rng() < 0.45) continue;
      const fw = faceWidth(ww, dd, face);
      const c = faceCenter(cx, 4.4, cz, ww, dd, face);
      const horiz = face === 'pz' || face === 'nz';
      const signCol = pick(['#ff9a4d', '#ff5f7e', '#61e0e3', '#c4ff74']);
      const sw = fw * 0.7;
      addGlowRect(x, z, c, face, sw, 2.6, 0xff9b50, 0.8);
      // canvas awning
      if (horiz) {
        boxB(x, z, c[0], 5.8, c[2] + (face === 'pz' ? 1.4 : -1.4), sw, 0.4, 3.4, 0x5a3d2a, { rotY: 0, skipBottom: true });
        boxB(x, z, c[0], 5.0, c[2] + (face === 'pz' ? 2.8 : -2.8), sw, 1.2, 0.3, 0x49342a);
      } else {
        boxB(x, z, c[0] + (face === 'px' ? 1.4 : -1.4), 5.8, c[2], 3.4, 0.4, sw, 0x5a3d2a, { skipBottom: true });
        boxB(x, z, c[0] + (face === 'px' ? 2.8 : -2.8), 5.0, c[2], 0.3, 1.2, sw, 0x49342a);
      }
      if (rng() < 0.5) addBillboard({
        x: c[0] + (horiz ? 0 : (face === 'px' ? 2.2 : -2.2)),
        y: 8.3,
        z: c[2] + (horiz ? (face === 'pz' ? 2.2 : -2.2) : 0),
        w: Math.min(18, sw), h: 8, rotY: horiz ? (face === 'pz' ? 0 : Math.PI) : (face === 'px' ? Math.PI / 2 : -Math.PI / 2),
        text: nextSign()[0], sub: nextSign()[1], color: signCol, vertical: false, bg: true, border: true, flicker: false
      });
    }
    // Rooftop antenna forest.
    for (let i = 0; i < 4; i++) {
      if (!chance(0.6)) continue;
      const ax = cx + rand(-ww * 0.35, ww * 0.35);
      const az = cz + rand(-dd * 0.35, dd * 0.35);
      const ah = rand(5, 20);
      boxB(x, z, ax, roofY, az, 0.35, ah, 0.35, 0x353c3a);
      if (i === 0) addGlow(ax, roofY + ah, az, 0xff5238, 0.7);
    }
    occupancy.push({ x: cx, z: cz, w: ww * 1.25, d: dd * 1.25 });
    return { cx, cz, w: ww, d: dd, h: roofY };
  }

  function addWarehouse(x, z, cx, cz, w, d, h) {
    const bodyCol = pick([0x343b39, 0x3d403a, 0x2f3431, 0x46463e]);
    boxB(x, z, cx, 0, cz, w, h, d, bodyCol);
    boxB(x, z, cx, h, cz, w * 1.03, 1.2, d * 1.03, 0x4e5148);
    // ribbed facade
    for (let i = 0; i < Math.floor(w / 6); i++) {
      boxB(x, z, cx - w / 2 + 3 + i * 6, 1, cz + d / 2 + 0.4, 1.0, h - 2, 0.8, 0x464a43);
    }
    // rolling doors
    for (let i = 0; i < 2; i++) {
      const dx = cx - w * 0.24 + i * w * 0.48;
      addGlowRect(x, z, [dx, Math.min(6, h / 2), cz + d / 2 + 1.2], 'pz', 10, Math.min(10, h * 0.55), 0x0a0e0d, 1);
      boxN(x, z, dx, Math.min(11, h * 0.6), cz + d / 2 + 1.0, 12, 0.5, 0.4, 0xd07a31);
    }
    // roof vents
    for (let i = 0; i < 3; i++) {
      const vx = cx + rand(-w * 0.35, w * 0.35);
      const vz = cz + rand(-d * 0.35, d * 0.35);
      boxB(x, z, vx, h + 1.2, vz, rand(3, 7), rand(3, 8), rand(3, 7), 0x4a4c44);
      addGlow(vx, h + 4, vz, 0xff9b50, 0.5);
    }
    // exterior pipe rack
    for (let i = 0; i < 3; i++) {
      addPipeRun(x, z, cx - w / 2 - 3, cz - d * 0.3 + i * d * 0.3, 5, cx - w / 2 - 3, cz + d / 2 + 3, 5 + i * 2, 0.7, 0x5c4838, false);
    }
    occupancy.push({ x: cx, z: cz, w: w * 1.2, d: d * 1.2 });
    return h;
  }

  function addTankFarm(x, z, cx, cz, w, d) {
    const n = randi(3, 6);
    for (let i = 0; i < n; i++) {
      const ox = cx + rand(-w * 0.35, w * 0.35);
      const oz = cz + rand(-d * 0.35, d * 0.35);
      const r = rand(5, 10);
      const th = rand(12, 22);
      const body = pick([0x4e4a40, 0x3f4645, 0x5a4a38]);
      for (let k = 0; k < 4; k++) {
        const rr = r * (1 - k * 0.06);
        boxB(x, z, ox, k * th / 4, oz, rr * 2, th / 4, rr * 2, k % 2 ? body : 0x393e3b, { rotY: Math.PI / 4 });
      }
      boxN(x, z, ox, th, oz, r * 1.2, 0.6, r * 1.2, 0x6b5b47);
      addGlow(ox, th + 1, oz, 0xff9a50, 0.8);
      addPipeRun(x, z, ox, oz, 2, ox + rand(-20, 20), oz + rand(-20, 20), 2, 0.8, 0x4d3e31, false);
      addSmoke(ox, th, oz, 0.7, 0x4c4038, 0.3);
    }
    // bund wall
    boxB(x, z, cx, 0, cz, w, 2.2, 2, 0x3d423e);
    boxB(x, z, cx, 0, cz + d, w, 2.2, 2, 0x3d423e);
    boxB(x, z, cx - w / 2, 0, cz + d / 2, 2, 2.2, d, 0x3d423e);
    boxB(x, z, cx + w / 2, 0, cz + d / 2, 2, 2.2, d, 0x3d423e);
    occupancy.push({ x: cx, z: cz, w: w * 1.2, d: d * 1.2 });
  }

  function addCoolingTower(x, z, cx, cz, r, h) {
    // Stacked octagonal voxel rings form a hyperboloid.
    const rings = Math.floor(h / 4);
    for (let i = 0; i < rings; i++) {
      const t = i / rings;
      const rr = r * (0.55 + 0.55 * Math.sin(Math.PI * (0.18 + t * 0.7)));
      boxB(x, z, cx, i * 4, cz, rr * 2, 4, rr * 2, i % 3 ? 0x3b403d : 0x474c48, { rotY: Math.PI / 8 });
      if (i % 3 === 0) boxB(x, z, cx, i * 4, cz, rr * 2.06, 0.35, rr * 2.06, 0x2b302d, { rotY: Math.PI / 8 });
    }
    addSmoke(cx, h, cz, r * 0.22, 0x6e7a78, 0.9);
    addGlow(cx, 4, cz, 0xffa452, 1.0);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      boxB(x, z, cx + Math.cos(a) * r * 0.9, 0, cz + Math.sin(a) * r * 0.9, 2.4, 5, 2.4, 0x4b4438);
    }
    occupancy.push({ x: cx, z: cz, w: r * 2.4, d: r * 2.4 });
  }

  function addSiloCluster(x, z, cx, cz, n) {
    for (let i = 0; i < n; i++) {
      const ox = cx + (i - (n - 1) / 2) * rand(9, 13);
      const h = rand(22, 52);
      const r = rand(4, 7);
      for (let k = 0; k < 5; k++) {
        boxB(x, z, ox, k * h / 5, cz, r * 2 * (1 - k * 0.03), h / 5, r * 2, k % 2 ? 0x4d4a41 : 0x3d4341);
      }
      boxB(x, z, ox, h, cz, r * 1.3, 4, r * 1.3, 0x5b5144);
      addGlow(ox, h + 1.5, cz, 0xff9b50, 0.6);
      for (let k = 0; k < 3; k++) boxB(x, z, ox, k * h / 3, cz, r * 2.1, 0.4, r * 2.1, 0x2b302e);
    }
    occupancy.push({ x: cx, z: cz, w: n * 16, d: 20 });
  }

  function addConveyorBridge(x, z, a, b, y, color) {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, dz);
    const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
    boxB(x, z, cx, y, cz, 5.5, 3.6, len, color || 0x4c443a, { rotY: ang });
    boxB(x, z, cx, y + 3.6, cz, 6.2, 0.6, len + 1, 0x2f3431, { rotY: ang });
    for (let t = 0; t < len; t += 14) {
      const px = a[0] + dx * (t / len);
      const pz = a[1] + dz * (t / len);
      boxB(x, z, px, y - 3, pz, 1.4, 3, 1.4, 0x4b4339);
      addGlow(px + Math.cos(ang) * 3, y + 2.2, pz - Math.sin(ang) * 3, 0xffa04c, 0.6);
    }
    // moving boxes on the belt
    const path = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      path.push(new THREE.Vector3(lerp(a[0], b[0], t), y + 3.1, lerp(a[1], b[1], t)));
    }
    for (let i = 0; i < 3; i++) addCargoCar(path, pick([0x5b4b38, 0x4a4b40, 0x64513a]), [2.4, 2.4, 2.4], rand(3, 6), i / 3);
    // support legs down to the street
    for (const t of [0.15, 0.85]) {
      const px = lerp(a[0], b[0], t), pz = lerp(a[1], b[1], t);
      boxB(x, z, px, 0, pz, 3.4, y, 3.4, 0x3a3f3b);
      boxN(x, z, px, y - 1, pz, 4.2, 0.7, 4.2, 0xd07b34);
    }
  }

  function addPipeRack(x, z, cx, cz, len, ang, height) {
    const dx = Math.cos(ang) * len / 2, dz = Math.sin(ang) * len / 2;
    for (let t = -len / 2; t <= len / 2; t += 12) {
      const px = cx + Math.cos(ang) * t;
      const pz = cz + Math.sin(ang) * t;
      boxB(x, z, px, 0, pz, 1.2, height, 1.2, 0x4e4337);
      boxB(x, z, px, height, pz, 4.4, 0.6, 1.0, 0x594a39, { rotY: -ang });
      boxN(x, z, px, height - 0.5, pz, 1.4, 0.5, 1.4, 0xff9a50);
    }
    for (let k = 0; k < 5; k++) {
      const off = -2.0 + k * 1.1;
      addPipeRun(x, z, cx - dx + Math.cos(ang + Math.PI / 2) * off, cz - dz + Math.sin(ang + Math.PI / 2) * off, height + 1.1,
        cx + dx + Math.cos(ang + Math.PI / 2) * off, cz + dz + Math.sin(ang + Math.PI / 2) * off, height + 1.1,
        0.9, k % 2 ? 0x5a4938 : 0x3e4845, false);
    }
  }

  function addRefinery(x, z, cx, cz, w, d) {
    // Fractionating columns
    for (let i = 0; i < 3; i++) {
      const px = cx - w * 0.28 + i * w * 0.28;
      const ph = rand(58, 118);
      const r = rand(4, 7);
      for (let k = 0; k < 8; k++) {
        boxB(x, z, px, k * ph / 8, cz, r * 2, ph / 8, r * 2, k % 2 ? 0x4c4b44 : 0x3c403d);
      }
      boxB(x, z, px, ph, cz, r * 1.4, 6, r * 1.4, 0x5a5042);
      addPipeRun(x, z, px, cz, ph * 0.4, px + rand(-30, 30), cz + rand(-30, 30), ph * 0.7, 0.9, 0x574534, true);
      addGlow(px, ph + 3, cz, 0xff8a3d, 1.2);
      addSmoke(px, ph + 4, cz, 1.1, 0x54443a, 0.4);
    }
    // Heat exchangers and black pipe spaghetti.
    for (let i = 0; i < 7; i++) {
      addPipeRun(x, z, cx + rand(-w / 2, w / 2), cz + rand(-d / 2, d / 2), rand(3, 30),
        cx + rand(-w / 2, w / 2), cz + rand(-d / 2, d / 2), rand(16, 80), rand(0.6, 1.6), pick([0x5d4938, 0x3d4744, 0x4e3c30]), true);
    }
    // Flare stack.
    const fx = cx + w * 0.4, fz = cz - d * 0.35;
    boxB(x, z, fx, 0, fz, 3.4, 120, 3.4, 0x464440);
    for (let k = 0; k < 6; k++) boxB(x, z, fx, 20 + k * 18, fz, 5, 1.2, 5, 0x5b5346);
    const flareMat = new THREE.MeshBasicMaterial({ color: 0xff7d2e, transparent: true, opacity: 0.75, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false });
    const flare = new THREE.Mesh(new THREE.ConeGeometry(6, 22, 6, 1, true), flareMat);
    flare.position.set(fx, 132, fz);
    scene.add(flare);
    dynamic.animations.push({ mesh: flare, type: 'flare', baseY: 132, phase: rand(0, TAU) });
    addGlow(fx, 132, fz, 0xff6a20, 5.5);
    occupancy.push({ x: cx, z: cz, w: w * 1.3, d: d * 1.3 });
  }

  function addMarketCanopy(x, z, cx, cz, w, d, y) {
    // Truss roof, tarpaulin panels and a second city above it.
    const halfW = w / 2, halfD = d / 2;
    for (let gx = -halfW; gx <= halfW; gx += 24) {
      for (let gz = -halfD; gz <= halfD; gz += 24) {
        boxB(x, z, cx + gx, y, cz + gz, 1.3, rand(8, 15), 1.3, 0x4b4a40);
        if ((gx / 24 + gz / 24) % 3 === 0) addGlow(cx + gx, y + 10, cz + gz, 0xffa04c, 0.7);
      }
    }
    for (let gz = -halfD; gz <= halfD; gz += 24) {
      boxB(x, z, cx, y + 12, cz + gz, w, 1.3, 1.5, 0x5c5748);
    }
    for (let gx = -halfW; gx <= halfW; gx += 32) {
      boxB(x, z, cx + gx, y + 12, cz, 1.5, 1.3, d, 0x5c5748);
    }
    // Colored tarp roof panels, slight openings let thin light through.
    const tarpCols = [0x45352c, 0x333e3a, 0x4d4031, 0x3b3531, 0x2f3835, 0x473a2e];
    for (let gx = -halfW; gx < halfW; gx += 26) {
      for (let gz = -halfD; gz < halfD; gz += 26) {
        if (chance(0.07)) continue;
        const c = pick(tarpCols);
        const hh = rand(0.4, 1.6);
        boxB(x, z, cx + gx + 13, y + 13.2, cz + gz + 13, 24.5, hh, 24.5, c, { rotY: rand(-0.02, 0.02) });
        if (chance(0.1)) {
          // skylight slits
          boxN(x, z, cx + gx + 13, y + 13.9, cz + gz + 13, rand(3, 8), 0.2, rand(3, 8), 0xff9f5c);
        }
      }
    }
    // Hanging signs under the canopy.
    for (let i = 0; i < 9; i++) {
      const px = cx + rand(-halfW * 0.85, halfW * 0.85);
      const pz = cz + rand(-halfD * 0.85, halfD * 0.85);
      boxB(x, z, px, y - 2, pz, 0.3, 2.2, 0.3, 0x2c2c28);
      addBillboard({ x: px, y: y - 5, z: pz, w: rand(7, 13), h: rand(5, 9), rotY: rand(0, TAU), text: nextSign()[0], sub: nextSign()[1], color: pick(['#ff9d50', '#ff5c85', '#62e2e9', '#c4ff79']), vertical: chance(0.5), bg: true, border: true, flicker: chance(0.5) });
    }
    // Stalls, awnings & food steam.
    for (let gx = -halfW + 18; gx < halfW - 8; gx += rand(20, 30)) {
      for (let gz = -halfD + 18; gz < halfD - 8; gz += rand(24, 34)) {
        if (chance(0.08)) continue;
        const sx = cx + gx, sz = cz + gz;
        if (Math.hypot(sx - cx, sz - cz) < 32) continue;
        const stallCol = pick([0x35302a, 0x3b352c, 0x2b3130, 0x40352c]);
        boxB(x, z, sx, 0, sz, rand(4, 8), rand(2.4, 4), rand(4, 7), stallCol);
        boxB(x, z, sx, 3.4, sz, 9.4, 0.35, 7.4, 0x241d18);
        boxN(x, z, sx, 3.75, sz + 3.6, 9.0, 0.12, 0.5, 0xffc078);
        addGlow(sx, 4.0, sz + 3.7, 0xffb066, 0.9);
        // produce trays: bright small voxels that read as goods
        for (let k = 0; k < 5; k++) {
          boxB(x, z, sx + rand(-3.4, 3.4), 3.0, sz + rand(-3.0, 3.0), rand(0.8, 1.8), rand(0.4, 1.0), rand(0.8, 1.6),
            pick([0xd9a13c, 0xb64a35, 0xdad0a2, 0x5f8f45, 0xc76a8a, 0x8a5a2e]));
        }
        // hanging bulb over the counter
        boxB(x, z, sx, 2.2, sz + 4.2, 0.25, 1.4, 0.25, 0x2a2a25);
        addGlow(sx, 2.0, sz + 4.2, chance(0.4) ? 0xff7a92 : 0xffbe7a, 1.1);
        if (chance(0.35)) addSmoke(sx, 5, sz, 0.5, 0x747067, 0.3);
        if (chance(0.35)) {
          boxB(x, z, sx, 4.2, sz + 4.2, 4.6, 1.6, 0.3, 0x222522);
          addGlowRect(x, z, [sx, 4.4, sz + 4.4], 'pz', 3.6, 0.8, chance(0.5) ? 0xffb066 : 0x71e2de, 0.9);
        }
        // stool cluster
        for (let k = 0; k < 3; k++) {
          boxB(x, z, sx + rand(-5, 5), 0, sz + rand(4.5, 7), 1.0, 1.6, 1.0, 0x3a352d);
        }
      }
    }
    // Continuous market floor: paving, drains and a warm in-canopy glow.
    for (let gx = -halfW; gx < halfW; gx += 40) {
      for (let gz = -halfD; gz < halfD; gz += 40) {
        // The deck sits above the crust plane (y=0.02) so its dark steel
        // plating is what the player actually walks on.
        boxB(x, z, cx + gx + 20, 0.02, cz + gz + 20, 39, 0.34, 39,
          ((gx / 40 + gz / 40) | 0) % 2 ? 0x191b1f : 0x141619);
        boxN(x, z, cx + gx + 20, 0.34, cz + gz + 20, 38, 0.06, 0.35, 0x2f363e);
        if (chance(0.22)) {
          boxB(x, z, cx + gx + 20, 0.32, cz + gz + 20, 6, 0.12, 6, 0x24211c);
          addGlow(cx + gx + 20, 0.55, cz + gz + 20, 0xff9a4e, 0.3);
        }
      }
    }
    // Path lights and hot-food glow under the canopy.
    for (let i = 0; i < 90; i++) {
      addGlow(cx + rand(-halfW, halfW), rand(2.5, y - 3), cz + rand(-halfD, halfD), chance(0.76) ? 0xff9a4c : 0x68e2dc, rand(0.5, 1.5));
    }
    // Only three weak practicals: legacy-decay point lights at 0.85 washed the
    // whole steel deck to grey, so these stay very low and close.
    for (let i = 0; i < 3; i++) {
      const lx = cx + rand(-halfW * 0.55, halfW * 0.55);
      const lz = cz + rand(-halfD * 0.55, halfD * 0.55);
      const lamp = new THREE.PointLight(i % 2 ? 0xffa25c : 0xff7d4a, 0.16, 70, 2);
      lamp.position.set(lx, 9, lz);
      scene.add(lamp);
    }
    // Dense hanging lantern field and crowd-scale clutter under the canopy.
    for (let gx = -halfW + 12; gx < halfW; gx += 22) {
      for (let gz = -halfD + 12; gz < halfD; gz += 26) {
        if (!chance(0.6)) continue;
        const px = cx + gx + rand(-4, 4);
        const pz = cz + gz + rand(-4, 4);
        addLine(new THREE.Vector3(px, y, pz), new THREE.Vector3(px, y - rand(3, 7), pz), 0x5a4a38, 0.6);
        addGlow(px, y - rand(4, 8), pz, chance(0.62) ? 0xffa757 : 0x71e2de, rand(0.7, 1.5));
        if (chance(0.22)) {
          boxB(0, 0, px, 0, pz, 0.5, 2.4, 0.5, 0x292522);
        }
      }
    }
    // Hanging cloth strips attached to the market trusses.
    const bannerCols = [0x53342b, 0x2d4441, 0x574430, 0x3c2f37, 0x36402f, 0x4a3331];
    for (let i = 0; i < 44; i++) {
      const gx = cx + rand(-halfW * 0.92, halfW * 0.92);
      const gz = cz + rand(-halfD * 0.92, halfD * 0.92);
      const bw = rand(1.8, 4.2), bh = rand(3.5, 8);
      boxN(0, 0, gx, y - 1.2, gz, bw, 0.15, 0.15, 0x8a6a4a);
      boxB(0, 0, gx, y - 1.2 - bh, gz, bw, bh, 0.28, pick(bannerCols));
      if (chance(0.35)) addGlow(gx, y - 2, gz, 0xffa05a, 0.55);
    }
    // Hanging awnings over the main aisles, giving the market a layered ceiling.
    for (let i = 0; i < 14; i++) {
      const ax = cx + rand(-halfW * 0.82, halfW * 0.82);
      const az = cz + rand(-halfD * 0.82, halfD * 0.82);
      const aw = rand(18, 40), ad = rand(12, 26);
      boxB(0, 0, ax, y - 4.5, az, aw, 0.5, ad, pick([0x4e3a2c, 0x3d4a44, 0x5c4630]), { rotY: rand(-0.1, 0.1) });
      boxN(0, 0, ax, y - 4.2, az, aw * 0.96, 0.2, ad * 0.96, 0x6e5a44);
      for (let k = 0; k < 4; k++) addGlow(ax + rand(-aw / 2, aw / 2), y - 5.1, az + rand(-ad / 2, ad / 2), 0xffb066, 0.7);
    }
    // Stall light pools: low emissive discs on the deck plus hanging bulbs,
    // giving the bazaar its signature pockets of warm light.
    for (let i = 0; i < 70; i++) {
      const px = cx + rand(-halfW * 0.9, halfW * 0.9);
      const pz = cz + rand(-halfD * 0.9, halfD * 0.9);
      const c = chance(0.7) ? 0xffa757 : 0x6fd8d2;
      boxN(0, 0, px, 0.40, pz, rand(3.6, 7), 0.06, rand(3.6, 7), c);
      addGlow(px, 0.9, pz, c, rand(0.7, 1.4));
      boxB(0, 0, px, rand(7, 12), pz, 0.2, 0.2, 0.2, 0x2a251f);
      addGlow(px, rand(6, 11), pz, c, 0.6);
    }
    // Aisle guidance strips, dim enough to keep the deck dark.
    for (let i = 0; i < 12; i++) {
      const vertical = i % 2 === 0;
      const off = (i % 6 - 2.5) * 62;
      for (let t = -halfD + 20; t < halfD - 20; t += 12) {
        const px = vertical ? cx + off : cx + t;
        const pz = vertical ? cz + t : cz + off;
        boxN(0, 0, px, 0.42, pz, vertical ? 0.4 : 5, 0.05, vertical ? 5 : 0.4, 0x8a6b3a);
      }
    }

    // Crowds: small silhouettes with personal lights, not full character models.
    for (let i = 0; i < 260; i++) {
      const px = cx + rand(-halfW * 0.92, halfW * 0.92);
      const pz = cz + rand(-halfD * 0.92, halfD * 0.92);
      if (chance(0.25)) continue;
      const hh = rand(2.4, 3.6);
      boxB(0, 0, px, 0, pz, rand(0.8, 1.5), hh, rand(0.7, 1.2), pick([0x25221f, 0x2c2b27, 0x332a24, 0x23302e]));
      if (chance(0.06)) addGlow(px, hh + 0.4, pz, chance(0.5) ? 0xffb46a : 0x7de4e0, 0.4);
    }
    // Steam vents.
    for (let i = 0; i < 10; i++) {
      const px = cx + rand(-halfW * 0.8, halfW * 0.8);
      const pz = cz + rand(-halfD * 0.8, halfD * 0.8);
      boxB(0, 0, px, 0, pz, 3.2, 1.2, 3.2, 0x2b2f2c);
      addSmoke(px, 1.5, pz, 0.45, 0x8b8478, 0.35);
      addGlow(px, 1.6, pz, 0xffa45c, 0.5);
    }

    // Hanging lantern forest: hundreds of small emissive bodies on cables. This
    // is what makes the hall read as a dense bazaar instead of an empty deck.
    for (let i = 0; i < 300; i++) {
      const lx = cx + rand(-halfW * 0.94, halfW * 0.94);
      const lz = cz + rand(-halfD * 0.94, halfD * 0.94);
      const drop = rand(2.5, 10);
      const ly = rand(6, 15);
      boxB(0, 0, lx, ly, lz, 0.25, drop, 0.25, 0x241f1a);
      const col = chance(0.72) ? [0xffb46a, 0xffc98a, 0xff9a52] : [0x7fd8d2, 0xcfe8e2];
      const c = pick(col);
      const ls = rand(0.5, 0.95);
      boxB(0, 0, lx, ly - drop, lz, ls, ls * 1.2, ls, c);
      addGlow(lx, ly - drop - 0.4, lz, c, rand(0.9, 1.8));
    }
    // Paper light boxes on the trusses (broad soft sources).
    for (let i = 0; i < 26; i++) {
      const px = cx + rand(-halfW * 0.85, halfW * 0.85);
      const pz = cz + rand(-halfD * 0.85, halfD * 0.85);
      const py = rand(11, 14);
      boxB(0, 0, px, py, pz, 2.4, 0.7, 1.2, 0x2a2622);
      boxN(0, 0, px, py - 0.32, pz, 2.1, 0.16, 1.0, 0xffd7a4);
      addGlow(px, py - 0.5, pz, 0xffcf96, 1.5);
    }

    // Upper tenements sit on the canopy perimeter, leaving the market hall open.
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.3;
      const px = cx + Math.cos(a) * halfW * (i % 2 ? 0.82 : 0.62);
      const pz = cz + Math.sin(a) * halfD * (i % 2 ? 0.82 : 0.62);
      const ww = rand(20, 32), dd = rand(20, 30), hh = rand(30, 92);
      addTenement(x, z, px, pz, ww, dd, hh, 5000 + i * 131, 'stack');
    }
    occupancy.push({ x: cx, z: cz, w: w * 1.1, d: d * 1.1 });
  }

  function buildRimSlums() {
    // Housing that has grown over the lip of the great shaft: a key visual link
    // between the subterranean shanty strata and the surface lowline.
    const rimY = 0;
    const spans = [
      { side: 'west', z0: PIT.z1 + 90, z1: PIT.z2 - 80, step: 52 },
      { side: 'east', z0: PIT.z1 + 60, z1: PIT.z2 - 110, step: 58 },
      { side: 'north', x0: PIT.x1 + 120, x1: PIT.x2 - 120, step: 56 },
    ];
    for (const span of spans) {
      if (span.side === 'north') {
        for (let x = span.x0; x <= span.x1; x += span.step) {
          if (Math.abs(x) < 40) continue;
          addRimDwelling(x, PIT.z1 + 4, 0, 0, 1);
          addRimDwelling(x + rand(-10, 10), PIT.z1 - 18, 0, 0, -1);
        }
      } else {
        const sign = span.side === 'west' ? 1 : -1;
        const wx = span.side === 'west' ? PIT.x1 : PIT.x2;
        for (let z = span.z0; z <= span.z1; z += span.step) {
          addRimDwelling(wx, z, sign, 0, 0);
          addRimDwelling(wx - sign * 22, z + rand(-14, 14), sign, 0, 0);
          // crane arms and pipe taps over the void
          if (chance(0.5)) {
            const armLen = rand(40, 90);
            const a = new THREE.Vector3(wx - sign * 6, 26 + rand(0, 30), z);
            const b = new THREE.Vector3(wx - sign * armLen, a.y + rand(18, 40), z + rand(-10, 10));
            boxB(0, 0, wx - sign * 12, 8, z, 4, 26, 4, 0x4d4032);
            beamB(0, 0, a, b, 2.2, 2.2, 0x5c4a36);
            addGlow(b.x, b.y, b.z, 0xff7d38, 1.8);
            addHangingCables(0, 0, b.x, b.z, b.y, b.x, b.z, b.y - rand(40, 100), 2, 0x554334);
          }
          if (chance(0.6)) addPipeRun(0, 0, wx - sign * 12, z, 8, wx + sign * 20, z + rand(-30, 30), -260, 1.6, 0x5b4634, true);
        }
      }
    }
    // Rim shanty bridges across the south lip, high enough to leave the overlook clear.
    for (let i = 0; i < 5; i++) {
      const z = PIT.z2 - 30 - i * 36;
      const a = [PIT.x1 - 40, z];
      const b = [PIT.x1 + 120, z + rand(-20, 20)];
      addConveyorBridge(0, 0, a, b, 44 + i * 6, 0x4e4336);
    }
  }

  function addRimDwelling(x, z, dirX, dirZ, faceSign) {
    const base = rand(-16, 6);
    const w = rand(10, 22);
    const d = rand(10, 22);
    const h = rand(12, 46);
    const bodyCol = pick([0x3e362c, 0x4b4032, 0x343331, 0x544534]);
    boxB(x, z, x, base, z, w, h, d, bodyCol);
    boxB(x, z, x, base + h, z, w * 1.18, 1.2, d * 1.18, 0x5c4a35, { rotY: rand(-0.08, 0.08) });
    // Stacked lean-tos climbing upward.
    let yy = base + h;
    for (let i = 0; i < 3; i++) {
      if (!chance(0.65)) break;
      const hh = rand(4, 10);
      const ww = w * rand(0.55, 0.85);
      const dd = d * rand(0.55, 0.85);
      boxB(x, z, x + rand(-w * 0.2, w * 0.2), yy, z + rand(-d * 0.2, d * 0.2), ww, hh, dd, pick([0x4b3d2e, 0x3a3a34, 0x584731]));
      boxB(x, z, x + rand(-w * 0.2, w * 0.2), yy + hh, z + rand(-d * 0.2, d * 0.2), ww * 1.2, 0.5, dd * 1.2, 0x2f2b22);
      addGlow(x + rand(-w * 0.3, w * 0.3), yy + hh * 0.6, z + dd / 2, pick([0xff9a4e, 0xffc06a, 0x6ee6e0]), 0.8);
      yy += hh;
    }
    // Windows on the visible faces.
    for (const face of ['pz', 'nz', 'px', 'nx']) {
      const fw = faceWidth(w, d, face);
      const floors = Math.max(1, Math.floor(h / 7));
      for (let f = 0; f < floors; f++) {
        for (let c = 0; c < Math.max(1, Math.floor(fw / 8)); c++) {
          if (!chance(0.55)) continue;
          const ctr = faceCenter(x, base + 4 + f * 7, z, w, d, face);
          const off = (c + 0.5) * (fw / Math.max(1, Math.floor(fw / 8))) - fw / 2;
          addGlowRect(x, z, [ctr[0] + (face === 'pz' || face === 'nz' ? off : 0), ctr[1], ctr[2] + (face === 'px' || face === 'nx' ? off : 0)], face, 3.2, 2.4, pick([0xffab5e, 0xffd08a, 0x78dcd8]), 0.9);
        }
      }
    }
    // Laundry lines and roof antennas.
    for (let i = 0; i < 3; i++) {
      const a = new THREE.Vector3(x + rand(-w / 2, w / 2), base + h + rand(2, 12), z + rand(-d / 2, d / 2));
      const b = a.clone().add(new THREE.Vector3(rand(-24, 24), rand(-4, 3), rand(-18, 18)));
      addLine(a, b, 0x6a5846, 0.5);
      for (let k = 1; k < 4; k++) {
        const t = k / 4;
        boxB(x, z, lerp(a.x, b.x, t), a.y - 1.6, lerp(a.z, b.z, t), 1.4, 2.0, 0.4, pick([0x8a5a44, 0x4b5a58, 0x9a7a52]));
      }
    }
    // Support stilts that reach into the shaft.
    if (dirX || dirZ || faceSign) {
      const sx = x + (dirX ? dirX * (w / 2 + 3) : 0);
      const sz = z + (dirZ ? dirZ * (d / 2 + 3) : 0);
      for (let i = 0; i < 2; i++) {
        const px = sx + (dirX ? 0 : rand(-w * 0.4, w * 0.4));
        const pz = sz + (dirZ ? 0 : rand(-d * 0.4, d * 0.4));
        boxB(x, z, px, base - 40, pz, 1.6, 40 + h * 0.4, 1.6, 0x3c3429);
        boxN(x, z, px, base - 20, pz, 0.5, 0.5, 0.5, 0xff8a3d);
      }
    }
    // Warm doorway and satellite dish.
    addGlow(x, base + 3, z + d / 2 + 0.5, 0xffb56c, 1.0);
    if (chance(0.5)) {
      boxB(x, z, x + rand(-w * 0.4, w * 0.4), base + h, z + rand(-d * 0.4, d * 0.4), 3.2, 1.6, 3.2, 0x4a4740);
      addGlow(x, base + h + 2, z, 0xff8a3d, 0.6);
    }
  }

  function buildArtificialCeiling() {
    // At 150-200 m a second, artificial sky closes over the low city: trunk
    // ducts, an elevated freight loop and hanging service gantries. This is the
    // structural reason the market never sees sky, and it anchors the 200 m
    // line where the skyline district begins.
    const loopY = 176;
    const loopPts = [
      [-880, -880], [880, -880], [880, 880], [-880, 880], [-880, -880],
    ];
    for (let i = 0; i < loopPts.length - 1; i++) {
      const a = loopPts[i], b = loopPts[i + 1];
      const span = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ang = Math.atan2(b[0] - a[0], b[1] - a[1]);
      const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
      // main freight viaduct
      boxB(0, 0, cx, loopY, cz, 30, 4.2, span, 0x2b3332, { rotY: ang });
      boxB(0, 0, cx, loopY + 4.2, cz, 34, 1.2, span, 0x3a4442, { rotY: ang });
      boxN(0, 0, cx, loopY + 4.6, cz, 1.0, 0.4, span, 0xffa04c, { rotY: ang });
      // supports
      for (let t = 0; t < span; t += 96) {
        const px = a[0] + (b[0] - a[0]) * (t / span);
        const pz = a[1] + (b[1] - a[1]) * (t / span);
        boxB(0, 0, px, 0, pz, 9, loopY, 9, 0x272f2f);
        for (let yy = 20; yy < loopY; yy += 34) {
          boxB(0, 0, px, yy, pz, 13, 1.6, 13, 0x333c3a);
          if ((yy / 34) % 3 < 1) addGlow(px, yy + 1, pz + 5, 0xff9a4e, 0.9);
        }
      }
      // twin trunk ducts beneath the viaduct
      for (let k = 0; k < 3; k++) {
        const off = (k - 1) * 9;
        const ox = Math.cos(ang) * off, oz = -Math.sin(ang) * off;
        const y = loopY - 9 - k * 5;
        boxB(0, 0, cx + ox, y, cz + oz, 6.5, 6.5, span, k % 2 ? 0x4b3e31 : 0x37423f, { rotY: ang });
        for (let t = 0; t < span; t += 44) {
          const px = a[0] + (b[0] - a[0]) * (t / span) + ox;
          const pz = a[1] + (b[1] - a[1]) * (t / span) + oz;
          boxB(0, 0, px, y - 1.2, pz, 8.5, 1.4, 3.0, 0x2b3130, { rotY: ang });
        }
      }
    }
    // Radial service gantries linking the loop to the shaft rim.
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + 0.2;
      const r0 = 290, r1 = 860;
      const x0 = Math.cos(a) * r0, z0 = Math.sin(a) * r0;
      const x1 = Math.cos(a) * r1, z1 = Math.sin(a) * r1;
      const ang = Math.atan2(x1 - x0, z1 - z0);
      const len = Math.hypot(x1 - x0, z1 - z0);
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const y = 158 + (i % 3) * 14;
      boxB(0, 0, cx, y, cz, 14, 2.6, len, 0x2f3836, { rotY: ang });
      boxN(0, 0, cx, y + 2.7, cz, 0.7, 0.4, len, i % 2 ? 0xffa04c : 0x6fe4e8, { rotY: ang });
      for (let t = 20; t < len; t += 72) {
        const px = x0 + Math.cos(ang) * t;
        const pz = z0 + Math.sin(ang) * t;
        boxB(0, 0, px, 0, pz, 5, y, 5, 0x293130);
        for (let yy = 24; yy < y; yy += 40) {
          if ((yy / 40) % 2 < 1) addGlow(px, yy, pz, 0xff8e44, 0.7);
        }
      }
      // hanging pipe bundles
      addPipeRun(0, 0, x0, z0, y - 4, x1, z1, y - 4, 1.6, 0x5a4736, true);
      addPipeRun(0, 0, x0, z0, y - 8, x1, z1, y - 8, 1.1, 0x3d4945, true);
    }
    // Hanging signage along the artificial ceiling.
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU + 0.5;
      const r = 640 + (i % 3) * 90;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const s = nextSign();
      addBillboard({
        x, y: 150, z, w: rand(26, 44), h: rand(10, 16),
        rotY: Math.atan2(-x, -z), text: s[0], sub: s[1],
        color: pick(['#ff9a4e', '#62e2e9', '#ff5c85', '#baff74']),
        vertical: false, bg: true, border: true, flicker: chance(0.5)
      });
    }
    // Elevated monorail train (visual only) running the loop.
    const loop = [];
    for (let i = 0; i <= 32; i++) {
      const t = i / 32 * 4;
      const seg = Math.min(3, Math.floor(t));
      const f = t - seg;
      const a = loopPts[seg], b = loopPts[seg + 1];
      loop.push(new THREE.Vector3(lerp(a[0], b[0], f), loopY + 6.5, lerp(a[1], b[1], f)));
    }
    const monoPath = [];
    for (let i = 0; i < loop.length - 1; i++) monoPath.push(loop[i]);
    monoPath.push(...monoPath.slice().reverse());
    for (let i = 0; i < 8; i++) {
      addCargoCar(monoPath, pick([0x3e4846, 0x54433a, 0x2f3a40]), [14, 5, 26], rand(10, 16), i / 8);
    }
    // Warning beacons at the 200 m datum.
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * TAU;
      addGlow(Math.cos(a) * 905, loopY + 8, Math.sin(a) * 905, 0xff4a32, 2.0);
    }
  }

  function chooseLowType(cx, cz) {
    const inMarket = Math.abs(cx - LOW.marketCx) < LOW.marketW * 0.55 && Math.abs(cz - LOW.marketCz) < LOW.marketD * 0.55;
    if (inMarket) return 'market';
    const distPit = Math.max(PIT.x1 - cx, cx - PIT.x2, PIT.z1 - cz, cz - PIT.z2, 0);
    if (distPit < 160) return 'industry';
    if (cx < -360 && cz < 420) return 'industry';
    if (cz > 640 && cx < 200) return 'residence';
    if (cz < -620) return 'industry';
    if (cx > 640) return 'residence';
    return chance(0.55) ? 'residence' : 'industry';
  }

  function buildLowCity() {
    // Market first, so its big volume reserves the district.
    addMarketCanopy(0, 0, LOW.marketCx, LOW.marketCz, LOW.marketW, LOW.marketD, 36);
    buildRimSlums();
    buildArtificialCeiling();

    const start = -1088;
    for (let gx = start; gx <= 1088; gx += BLOCK) {
      for (let gz = start; gz <= 1088; gz += BLOCK) {
        const cx = gx + BLOCK / 2, cz = gz + BLOCK / 2;
        if (blockTouchesPit(cx, cz, 96, 96, 42)) continue;
        if (Math.hypot(cx, cz) > 1280) continue;
        if (occupies(cx, cz, 100, 100, 18)) continue;
        const type = chooseLowType(cx, cz);
        if (type === 'market') {
          // area already covered by canopy; add low stalls at the edges
          if (chance(0.55)) {
            for (let i = 0; i < 4; i++) {
              const px = cx + rand(-26, 26), pz = cz + rand(-26, 26);
              boxB(0, 0, px, 0, pz, rand(4, 8), rand(2, 4), rand(4, 7), 0x3b3229);
              addGlow(px, 3, pz, 0xff9a4c, 0.6);
            }
          }
          continue;
        }
        if (type === 'industry') {
          const r = rand(0, 1);
          if (r < 0.32) {
            addWarehouse(0, 0, cx, cz, rand(48, 78), rand(40, 70), rand(14, 34));
          } else if (r < 0.52) {
            addRefinery(0, 0, cx, cz, rand(60, 84), rand(48, 70));
          } else if (r < 0.66) {
            addTankFarm(0, 0, cx, cz, rand(46, 68), rand(36, 60));
          } else if (r < 0.78) {
            addCoolingTower(0, 0, cx + rand(-10, 10), cz + rand(-10, 10), rand(14, 24), rand(50, 96));
          } else if (r < 0.88) {
            addSiloCluster(0, 0, cx, cz, randi(2, 5));
          } else {
            addFactoryUnit(0, 0, 0, cx, cz, rand(50, 82), rand(40, 66), { body: 0x383d39, rib: 0x51574f, roof: 0x2c312d, win: WINDOW_COLORS.amber }, 0);
          }
          // inter-building conveyor or pipe racks
          if (chance(0.7)) {
            const a = [cx + rand(-40, 40), cz + rand(-40, 40)];
            const b = [cx + rand(-80, 80), cz + rand(-80, 80)];
            addConveyorBridge(0, 0, a, b, rand(20, 42), 0x4f4639);
          }
          if (chance(0.45)) addPipeRack(0, 0, cx + rand(-28, 28), cz + rand(-28, 28), rand(40, 70), rand(0, TAU), rand(12, 34));
          // yard clutter
          for (let i = 0; i < 4; i++) {
            boxB(0, 0, cx + rand(-45, 45), 0, cz + rand(-45, 45), rand(3, 9), rand(2, 6), rand(3, 9), pick([0x4b4338, 0x3b423f, 0x5a4a36]));
          }
        } else {
          // residential: 2-4 narrow towers per block + stacked skybridges
          const n = randi(2, 4);
          const built = [];
          for (let i = 0; i < n; i++) {
            const px = cx + rand(-30, 30) + (i - 1) * 4;
            const pz = cz + rand(-30, 30);
            const w = rand(20, 36), d = rand(20, 36);
            if (occupies(px, pz, w, d, 6)) continue;
            const h = rand(28, 188);
            const t = addTenement(0, 0, px, pz, w, d, h, 12000 + gx * 7 + gz * 13 + i * 977, chance(0.5) ? 'stack' : 'walk');
            built.push(t);
          }
          // skybridges between neighbors
          for (let i = 0; i < built.length - 1; i++) {
            if (!chance(0.65)) continue;
            const A = built[i], B = built[i + 1];
            const yy = Math.min(A.h, B.h) * rand(0.45, 0.8);
            const mid = new THREE.Vector3((A.cx + B.cx) / 2, yy, (A.cz + B.cz) / 2);
            const dx = B.cx - A.cx, dz = B.cz - A.cz;
            const ang = Math.atan2(dx, dz);
            const len = Math.hypot(dx, dz);
            boxB(0, 0, mid.x, yy, mid.z, 3.6, 3.0, Math.max(6, len), 0x3e443f, { rotY: ang });
            for (let k = 0; k < 4; k++) addGlow(mid.x + rand(-len / 2, len / 2) * Math.sin(ang), yy + 1.5, mid.z + rand(-len / 2, len / 2) * Math.cos(ang), 0xffa85c, 0.4);
            addPipeRun(0, 0, A.cx, A.cz, yy + 2.0, B.cx, B.cz, yy + 2.0, 0.35, 0x5b4a38, false);
          }
          // Ground clutter / market alleys.
          for (let i = 0; i < 3; i++) {
            const px = cx + rand(-44, 44), pz = cz + rand(-44, 44);
            boxB(0, 0, px, 0, pz, rand(4, 10), rand(2, 5), rand(4, 8), pick([0x3b332a, 0x493f31, 0x303735]));
            if (chance(0.5)) addGlow(px, 3, pz, 0xffa45c, 0.5);
          }
          // Low skybridge / awnings above the street to occlude the sky.
          if (chance(0.55)) {
            const yy = rand(16, 28);
            boxB(0, 0, cx, yy, cz - 48, 96, 0.8, 12, 0x343a36);
            boxB(0, 0, cx, yy + 1, cz - 48, 96, 2.2, 10, 0x3d3f37);
            for (let k = 0; k < 8; k++) addGlow(cx - 42 + k * 12, yy - 0.5, cz - 48, 0xff9d54, 0.6);
          }
        }
      }
    }

    // Lowline transport: elevated conveyor loop around the pit rim feeding the refinery belt.
    const rimY = 64;
    const pts = [
      [-330, 620], [330, 620], [330, -760], [160, -760], [160, -640],
      [-330, -640], [-330, 620]
    ];
    for (let i = 0; i < pts.length - 1; i++) {
      addConveyorBridge(0, 0, pts[i], pts[i + 1], rimY, 0x4b4438);
    }
    // The market-to-pit funicular: a visible link between lowline and substrata.
    addPipeRun(0, 0, -300, 830, 0, -247, 690, -620, 2.6, 0x634a36, true);
    addPipeRun(0, 0, 300, 900, 4, 247, 700, -820, 2.2, 0x4a4335, true);
    addElevatorShaft(0, 0, -322, 812, -640, 188, 0xffa04c);
    addElevatorShaft(0, 0, 318, 870, -506, 132, 0x6ee6e0);

    // Floodlights at the pit rim, aimed down.
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * TAU;
      const x = Math.cos(a) * 330;
      const z = Math.sin(a) * 430;
      boxB(0, 0, x, 0, z, 2.0, 26, 2.0, 0x3d423d);
      boxB(0, 0, x, 26, z, 6, 2, 3, 0x50574f, { rotY: a });
      addGlow(x - Math.cos(a) * 7, 25, z - Math.sin(a) * 7, 0xfff0c2, 3.0);
    }
  }
