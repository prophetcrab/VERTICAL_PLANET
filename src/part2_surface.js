  /* ------------------------------------------------------------------ */
  /* Billboards and signage (individual canvas textures)                */
  /* ------------------------------------------------------------------ */
  function makeSignMaterial(text, sub, colorHex, vertical, bg, border) {
    const c = document.createElement('canvas');
    const verticalMode = !!vertical;
    c.width = verticalMode ? 192 : 512;
    c.height = verticalMode ? 512 : 256;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    if (bg) {
      ctx.fillStyle = 'rgba(4,8,9,0.82)';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = 'rgba(255,255,255,0.018)';
      for (let y = 0; y < c.height; y += 4) ctx.fillRect(0, y, c.width, 1);
    }
    if (border) {
      ctx.strokeStyle = colorHex;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 3;
      ctx.strokeRect(7, 7, c.width - 14, c.height - 14);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 20;
    ctx.fillStyle = colorHex;
    if (verticalMode) {
      const chars = text.split('');
      const gap = Math.min(88, (c.height - 100) / Math.max(1, chars.length));
      const font = Math.min(72, gap * 0.88);
      ctx.font = '700 ' + font + 'px "Microsoft YaHei UI","Microsoft YaHei",sans-serif';
      const start = c.height / 2 - (chars.length - 1) * gap / 2;
      chars.forEach((ch, i) => ctx.fillText(ch, c.width / 2, start + i * gap));
      if (sub) {
        ctx.shadowBlur = 6;
        ctx.font = '400 13px Consolas,monospace';
        ctx.fillStyle = 'rgba(235,228,212,.72)';
        ctx.fillText(sub, c.width / 2, c.height - 25);
      }
    } else {
      let fs = 66;
      if (text.length > 8) fs = 52;
      if (text.length > 12) fs = 40;
      ctx.font = '700 ' + fs + 'px "Microsoft YaHei UI","Microsoft YaHei",sans-serif';
      ctx.fillText(text, c.width / 2, sub ? c.height * 0.43 : c.height * 0.5);
      if (sub) {
        ctx.shadowBlur = 0;
        ctx.font = '400 17px Consolas,monospace';
        ctx.fillStyle = 'rgba(232,228,216,.68)';
        ctx.letterSpacing = '3px';
        ctx.fillText(sub, c.width / 2, c.height * 0.69);
      }
      ctx.strokeStyle = colorHex;
      ctx.globalAlpha = 0.48;
      ctx.beginPath();
      ctx.moveTo(c.width * 0.26, c.height * 0.56);
      ctx.lineTo(c.width * 0.74, c.height * 0.56);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      alphaTest: 0.015,
      color: 0xffffff,
    });
    return mat;
  }

  const BILLBOARD_CAP = 118;
  function addBillboard(opts) {
    if (dynamic.signs.length >= BILLBOARD_CAP) return null;
    const mat = makeSignMaterial(opts.text, opts.sub, opts.color || '#ff9a4d', opts.vertical, opts.bg !== false, opts.border !== false);
    const geo = new THREE.PlaneGeometry(opts.w, opts.h);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(opts.x, opts.y, opts.z);
    mesh.rotation.y = opts.rotY || 0;
    if (opts.rotZ) mesh.rotation.z = opts.rotZ;
    mesh.renderOrder = 4;
    scene.add(mesh);
    if (opts.glow !== false) {
      addGlow(opts.x, opts.y + opts.h * 0.38, opts.z, opts.glowColor || opts.color || 0xff8b3d, Math.min(8, opts.w * 0.14));
    }
    dynamic.signs.push({ mat, base: 1, phase: rand(0, TAU), speed: rand(0.3, 2.1), flicker: opts.flicker !== false });
    return mesh;
  }

  const SIGN_LINES = [
    ['九层集市', '9TH MARKET'],
    ['冷却液', 'COOLANT / LOOP 04'],
    ['回收一切', 'RECLAIM EVERYTHING'],
    ['别抬头', 'THERE IS NO SKY'],
    ['下行', 'DESCEND'],
    ['氧气', 'OXYGEN 02'],
    ['拆解', 'DISMANTLE'],
    ['夜班', 'NIGHT SHIFT'],
    ['无主之地', 'NO MAN\'S STRATA'],
    ['旧神', 'OLD GODS / LOW VOLTAGE'],
    ['净水', 'CLEAN WATER'],
    ['禁止上升', 'ASCENT FORBIDDEN'],
    ['第十三层', 'LEVEL THIRTEEN'],
    ['管道工', 'PIPE WORKERS UNION'],
    ['义体维修', 'BODY SHOP'],
    ['光在这里很贵', 'LIGHT IS EXPENSIVE'],
    ['请勿停留', 'KEEP MOVING'],
    ['梦的余料', 'DREAM OFFCASTS'],
  ];
  let signIndex = 0;

  function nextSign() {
    const s = SIGN_LINES[signIndex % SIGN_LINES.length];
    signIndex++;
    return s;
  }

  function addStreetSign(x, y, z, rotY, scale, vertical) {
    const s = nextSign();
    const color = pick(['#ff9d50', '#ff5c85', '#62e2e9', '#c4ff79', '#ffd17a']);
    return addBillboard({
      x, y, z, rotY,
      w: vertical ? scale * 1.4 : scale * 3.6,
      h: vertical ? scale * 4.2 : scale * 1.8,
      text: s[0], sub: s[1], color,
      vertical: !!vertical, bg: true, border: true,
      flicker: chance(0.45)
    });
  }

  /* ------------------------------------------------------------------ */
  /* Ground / surface deck / pit mouth                                  */
  /* ------------------------------------------------------------------ */
  let groundTexture, wallTexture;

  function addTexturedPlane(w, h, x, y, z, rotX, rotY, tex, repeatX, repeatY, color) {
    const t = tex.clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const mat = new THREE.MeshLambertMaterial({ map: t, color: color === undefined ? 0xffffff : color });
    const geo = new THREE.PlaneGeometry(w, h);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.set(rotX, rotY, 0);
    mesh.position.set(x, y, z);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    scene.add(mesh);
    return mesh;
  }

  function buildGroundDeck() {
    groundTexture = makeGroundTexture();
    wallTexture = makeWallTexture();

    const ext = 9000;
    // Surface detail: luminous service grid, hazard chevrons and cargo lanes
    // read strongly from the air and tie the deck to the shaft rim.
    for (let i = -1300; i <= 1300; i += 52) {
      if (i > PIT.x1 - 20 && i < PIT.x2 + 20) continue;
      if (i % 104 === 0) boxN(0, 0, i, 0.3, (PIT.z1 + PIT.z2) / 2, 1.1, 0.16, PIT.z2 - PIT.z1 + 380, 0x1d3033);
    }
    for (let j = -1240; j <= 1240; j += 62) {
      if (j % 124 === 0) boxN(0, 0, 0, 0.3, j, PIT.x2 - PIT.x1 + 620, 0.16, 1.0, 0x1a2b2e);
    }
    for (let i = 0; i < 46; i++) {
      const z = PIT.z1 - 60 - i * 22;
      if (Math.abs(i) > 24) break;
      boxN(0, 0, -PIT.x2 - 70 - i * 8, 0.4, z, 26, 0.18, 4, 0xd07a32);
      boxN(0, 0, PIT.x2 + 70 + i * 8, 0.4, z, 26, 0.18, 4, 0xd07a32);
    }
    const y = 0.02;
    const midZ = (PIT.z1 + PIT.z2) / 2;
    const pitW = PIT.x2 - PIT.x1;
    const pitD = PIT.z2 - PIT.z1;
    // four huge city-crust plates around the great shaft
    addTexturedPlane(PIT.x1 + ext, ext * 2, (-ext + PIT.x1) / 2, y, 0, -Math.PI / 2, 0, groundTexture, (PIT.x1 + ext) / 42, ext * 2 / 42, 0x56544f);
    addTexturedPlane(ext - PIT.x2, ext * 2, (ext + PIT.x2) / 2, y, 0, -Math.PI / 2, 0, groundTexture, (ext - PIT.x2) / 42, ext * 2 / 42, 0x56544f);
    addTexturedPlane(pitW, PIT.z1 + ext, 0, y, (-ext + PIT.z1) / 2, -Math.PI / 2, 0, groundTexture, pitW / 42, (PIT.z1 + ext) / 42, 0x56544f);
    addTexturedPlane(pitW, ext - PIT.z2, 0, y, (ext + PIT.z2) / 2, -Math.PI / 2, 0, groundTexture, pitW / 42, (ext - PIT.z2) / 42, 0x56544f);

    // The crust outside the modelled core shows an endless carpet of city
    // lights. It is deliberately kept out of the central 2.6 km so it never
    // covers real geometry or flattens into a grey sheet at eye level.
    const carpet = makeCityCarpetTexture();
    const carpetY = 0.1;
    const R = 1300;
    const FAR = 9000;
    const carpetRegions = [
      [FAR - R, FAR * 2, (FAR + R) / 2, 0],
      [-FAR + R, FAR * 2, (-FAR - R) / 2, 0],
      [R * 2, FAR - R, 0, (FAR + R) / 2],
      [R * 2, FAR - R, 0, (-FAR - R) / 2],
      [FAR - R, FAR - R, (FAR + R) / 2, (FAR + R) / 2],
      [FAR - R, FAR - R, (FAR + R) / 2, (-FAR - R) / 2],
      [FAR - R, FAR - R, (-FAR - R) / 2, (FAR + R) / 2],
      [FAR - R, FAR - R, (-FAR - R) / 2, (-FAR - R) / 2],
    ];
    for (const [rw, rh, rx, rz] of carpetRegions) {
      if (rw <= 0 || rh <= 0) continue;
      const t = carpet.clone();
      t.needsUpdate = true;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rw / 380, rh / 380);
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const mat = new THREE.MeshBasicMaterial({
        map: t, transparent: true, opacity: 0.9, depthWrite: false,
        color: 0x8a8a86, fog: true, toneMapped: false
      });
      const geo = new THREE.PlaneGeometry(rw, rh);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(rx, carpetY, rz);
      mesh.renderOrder = 1;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      scene.add(mesh);
    }

    // Massive edge frames.
    const frameCol = 0x252c2e;
    boxB(0, 0, 0, -1, PIT.z1 - 2, pitW + 52, 5, 22, frameCol);
    boxB(0, 0, 0, -1, PIT.z2 + 2, pitW + 52, 5, 22, frameCol);
    boxB(0, 0, PIT.x1 - 2, -1, midZ, 22, 5, pitD + 8, frameCol);
    boxB(0, 0, PIT.x2 + 2, -1, midZ, 22, 5, pitD + 8, frameCol);
    // hazard strips on the rim
    for (let i = 0; i < 26; i++) {
      const t = i / 26;
      const z = PIT.z1 + t * pitD;
      boxN(0, 0, PIT.x1 - 12, 1.6, z, 1.2, 0.7, 8, 0xd08234);
      boxN(0, 0, PIT.x2 + 12, 1.6, z, 1.2, 0.7, 8, 0xd08234);
    }
    for (let i = 0; i < 16; i++) {
      const t = i / 16;
      const x = PIT.x1 + t * pitW;
      boxN(0, 0, x, 1.6, PIT.z1 - 12, 8, 0.7, 1.2, 0xd08234);
      boxN(0, 0, x, 1.6, PIT.z2 + 12, 8, 0.7, 1.2, 0xd08234);
    }
    // rim guard structure: repeated posts and overhead cables
    for (let i = 0; i < 22; i++) {
      const z = PIT.z1 + 20 + i * (pitD - 40) / 21;
      boxB(0, 0, PIT.x1 - 7, 0.5, z, 2.2, 9, 2.2, 0x363d3d);
      boxB(0, 0, PIT.x2 + 7, 0.5, z, 2.2, 9, 2.2, 0x363d3d);
      boxN(0, 0, PIT.x1 - 7, 9.2, z, 0.9, 0.8, 2.0, 0xff6e35);
      boxN(0, 0, PIT.x2 + 7, 9.2, z, 0.9, 0.8, 2.0, 0xff6e35);
    }
    for (let i = 0; i < 12; i++) {
      const x = PIT.x1 + 26 + i * (pitW - 52) / 11;
      boxB(0, 0, x, 0.5, PIT.z1 - 7, 2.2, 9, 2.2, 0x363d3d);
      boxB(0, 0, x, 0.5, PIT.z2 + 7, 2.2, 9, 2.2, 0x363d3d);
      boxN(0, 0, x, 9.2, PIT.z1 - 7, 2.0, 0.8, 0.9, 0xff6e35);
      boxN(0, 0, x, 9.2, PIT.z2 + 7, 2.0, 0.8, 0.9, 0xff6e35);
    }

    // Pit walls, seen from inside.
    const wallH = 1000;
    const rev = 62;
    addTexturedPlane(pitD, wallH, PIT.x1, -wallH / 2, midZ, 0, Math.PI / 2, wallTexture, pitD / rev, wallH / rev, 0x383a38);
    addTexturedPlane(pitD, wallH, PIT.x2, -wallH / 2, midZ, 0, -Math.PI / 2, wallTexture, pitD / rev, wallH / rev, 0x343634);
    addTexturedPlane(pitW, wallH, 0, -wallH / 2, PIT.z1, 0, 0, wallTexture, pitW / rev, wallH / rev, 0x343634);
    addTexturedPlane(pitW, wallH, 0, -wallH / 2, PIT.z2, 0, Math.PI, wallTexture, pitW / rev, wallH / rev, 0x383a38);

    // Concrete rim cap under the deck edge.
    boxB(0, 0, 0, -8, PIT.z1 + 5, pitW + 18, 9, 13, 0x252b2b);
    boxB(0, 0, 0, -8, PIT.z2 - 5, pitW + 18, 9, 13, 0x252b2b);
    boxB(0, 0, PIT.x1 + 5, -8, midZ, 13, 9, pitD - 18, 0x252b2b);
    boxB(0, 0, PIT.x2 - 5, -8, midZ, 13, 9, pitD - 18, 0x252b2b);

    // Structural verticals on the pit faces.
    for (let i = 0; i < 13; i++) {
      const z = PIT.z1 + 25 + i * (pitD - 50) / 12;
      for (const x of [PIT.x1 + 3, PIT.x2 - 3]) {
        boxB(0, 0, x, -1000, z, 6, 1000, 5, 0x1b2021);
        for (let y = -940; y < -10; y += 70) {
          boxN(0, 0, x + (x < 0 ? 4 : -4), y, z, 1.0, 2.0, 4.2, 0xdf7b39);
          addGlow(x + (x < 0 ? 7 : -7), y + 3, z, 0xff7a30, 1.4);
        }
      }
    }
    for (let i = 0; i < 8; i++) {
      const x = PIT.x1 + 30 + i * (pitW - 60) / 7;
      for (const z of [PIT.z1 + 3, PIT.z2 - 3]) {
        boxB(0, 0, x, -1000, z, 5, 1000, 6, 0x1b2021);
      }
    }

    // Cross-pit transfer gantries.
    buildOverlook();
    buildGantry(PIT.z1 + 180, 58, 0x343b3b);
    buildGantry(PIT.z2 - 260, 88, 0x2d3334);
    buildGantry(230, -52, 0x343b3b, true);
  }

  function buildOverlook() {
    // A real cantilevered observation deck on the south rim, facing the shaft.
    const px = 0, pz = 792;
    const deckY = 318;
    // Two heavy pylons rooted on the crust.
    for (const sx of [-62, 62]) {
      boxB(0, 0, px + sx, 0, pz, 18, deckY, 18, 0x2b3232);
      for (let yy = 22; yy < deckY; yy += 34) {
        boxB(0, 0, px + sx, yy, pz, 24, 2.2, 24, 0x39403c);
        if ((yy / 34) % 2 === 0) addGlow(px + sx, yy + 1, pz + 9, 0xff9346, 1.0);
      }
      // Diagonal bracing.
      for (let i = 0; i < 5; i++) {
        const y0 = 20 + i * 58, y1 = y0 + 58;
        beamB(0, 0, new THREE.Vector3(px + sx - 8, y0, pz), new THREE.Vector3(px + sx + 8, y1, pz), 1.4, 1.4, 0x39403c);
      }
      boxB(0, 0, px + sx, deckY, pz, 26, 4, 26, 0x3b4340);
      addBeacon(px + sx, deckY + 6, pz, 0xff4a30, 5);
    }
    // Cross truss and deck.
    boxB(0, 0, px, deckY + 4, pz, 150, 3.4, 44, 0x333b39);
    boxB(0, 0, px, deckY + 7.4, pz, 156, 1.2, 50, 0x454c46);
    for (let i = -70; i <= 70; i += 10) {
      beamB(0, 0, new THREE.Vector3(px + i, deckY + 4, pz - 21), new THREE.Vector3(px + i, deckY + 18, pz - 21), 1.1, 1.1, 0x3d4441);
    }
    // Catwalk extending toward the shaft.
    for (let i = 0; i < 9; i++) {
      boxB(0, 0, px, deckY + 7, pz - 24 - i * 15, 16, 1.0, 15, 0x3a423f);
      boxN(0, 0, px, deckY + 8.2, pz - 30 - i * 15, 0.6, 0.4, 12, 0xff9848);
      for (const sx of [-8, 8]) {
        boxB(0, 0, px + sx, deckY + 7, pz - 30 - i * 15, 0.5, 5, 0.5, 0x454b45);
      }
      if (i % 2 === 0) addGlow(px, deckY + 6.5, pz - 30 - i * 15, 0xff8b3d, 1.1);
    }
    boxB(0, 0, px, deckY + 11, pz - 160, 18, 2, 10, 0x363e3b);
    // Observation pod / instrument mast at the tip.
    boxB(0, 0, px, deckY + 12, pz - 166, 13, 8, 11, 0x2c3434);
    boxN(0, 0, px, deckY + 20, pz - 166, 13.4, 1.2, 11.4, 0xffb26a);
    addGlow(px, deckY + 24, pz - 166, 0xffc27a, 3.2);
    // Stair tower up to the deck from the market side.
    for (let i = 0; i < 16; i++) {
      boxB(0, 0, px + 96, i * 20, pz + 10, 12, 1.2, 12, 0x343b38);
      boxB(0, 0, px + 96, i * 20, pz + 16, 12, 20, 0.6, 0x3d443f);
      if (i % 3 === 0) addGlow(px + 102, i * 20 + 18, pz + 14, 0xff9848, 0.9);
    }
    boxB(0, 0, px + 96, 320, pz, 16, 20, 16, 0x39403d);
    // Guard rail around the viewing deck.
    for (let i = -74; i <= 74; i += 8) {
      for (const zz of [pz - 24, pz + 24]) {
        boxB(0, 0, px + i, deckY + 8, zz, 0.7, 4, 0.7, 0x4a514b);
      }
    }
    for (const i of [-74, 74]) {
      boxB(0, 0, px + i, deckY + 8, pz, 0.8, 4, 50, 0x4a514b);
    }
    boxN(0, 0, px, deckY + 12.2, pz - 24, 150, 0.5, 0.5, 0xff8b3d);
    boxN(0, 0, px, deckY + 12.2, pz + 24, 150, 0.5, 0.5, 0xff8b3d);
    // A small welcome board facing the camera.
    addBillboard({
      x: px, y: deckY + 20, z: pz + 26, w: 34, h: 13, rotY: 0,
      text: '观测栈桥', sub: 'OVERLOOK SPAN / ALT +318M', color: '#ff9848',
      vertical: false, bg: true, border: true, flicker: false
    });
    // Floodlights aimed at the shaft.
    for (const sx of [-40, 40]) {
      boxB(0, 0, px + sx, deckY + 5, pz - 22, 4, 3, 4, 0x2c3232);
      addGlow(px + sx, deckY + 6, pz - 26, 0xfff0c8, 3.4);
    }
    occupancy.push({ x: px, z: pz, w: 190, d: 90 });
  }

  function buildGantry(z, y, color, reverse) {
    const x1 = PIT.x1 - 18, x2 = PIT.x2 + 18;
    const span = x2 - x1;
    const yBase = y;
    // deck truss across the opening
    boxB(0, 0, 0, yBase, z, span, 2.8, 5.5, color);
    boxB(0, 0, 0, yBase - 2.6, z, span, 2.8, 3.0, 0x1d2324);
    for (let i = 0; i <= 10; i++) {
      const x = x1 + i * span / 10;
      boxB(0, 0, x, yBase + 2.8, z, 1.5, 9, 1.5, 0x1d2324);
      if (i < 10) {
        const nx = x1 + (i + 1) * span / 10;
        beamB(0, 0, new THREE.Vector3(x, yBase + 11, z), new THREE.Vector3(nx, yBase + 3, z), 0.5, 0.5, 0x3b4342);
      }
    }
    // running trolley
    const trolleyX = reverse ? x1 + span * 0.66 : x1 + span * 0.36;
    boxB(0, 0, trolleyX, yBase - 4.2, z, 12, 4.0, 8.5, 0x6a4a2b);
    boxN(0, 0, trolleyX, yBase - 4.0, z + 4.3, 8, 1.1, 0.3, 0xffa344);
    boxB(0, 0, trolleyX, yBase - 38, z, 1.1, 34, 1.1, 0x242a2a);
    boxB(0, 0, trolleyX, yBase - 42, z, 9, 2.0, 6, 0x3b403d);
    for (let i = 0; i < 6; i++) addGlow(trolleyX - 4 + (i % 3) * 4, yBase - 42, z + (i < 3 ? 3.2 : -3.2), 0xff8b3d, 1.3);
    addGlow(trolleyX, yBase + 5, z, 0xff6b31, 2.2);
  }

  /* ------------------------------------------------------------------ */
  /* Roads, rail, street furniture                                      */
  /* ------------------------------------------------------------------ */
  function addStreetStrip(x, z, a, b, w, color) {
    // a/b are [x,z] world endpoints; make one long dark slab with luminous curbs.
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, dz);
    const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
    boxB(x, z, cx, 0.16, cz, w, 0.28, len, color || 0x151b1c, { rotY: ang });
    // Damp road sheen is expressed as a subtle brighter centre strip instead of
    // a separate reflective plane; stacked metal planes washed out the district.
    boxB(x, z, cx, 0.30, cz, w * 0.52, 0.1, len, 0x1c2226, { rotY: ang });
    // edge glow (thin, broken)
    for (let t = 0; t < len; t += 24) {
      const xx = a[0] + dx * (t / len), zz = a[1] + dz * (t / len);
      if (chance(0.72)) {
        addGlow(xx + Math.cos(ang) * (w / 2 - 1), 0.8, zz - Math.sin(ang) * (w / 2 - 1), 0xff8c3e, 1.1);
      }
    }
    // center hazard dashes
    const dashSpan = 8;
    for (let t = 6; t < len - 6; t += 18) {
      const xx = a[0] + dx * (t / len), zz = a[1] + dz * (t / len);
      boxN(x, z, xx, 0.42, zz, 0.5, 0.12, 4.8, 0xa46c2f, { rotY: ang });
    }
  }

  function clipRoadToPit(a, b, horizontal) {
    // Returns 0-2 segments avoiding the open shaft rectangle.
    const inside = (x, z) => x >= PIT.x1 - 28 && x <= PIT.x2 + 28 && z >= PIT.z1 - 28 && z <= PIT.z2 + 28;
    if (horizontal) {
      const z = a[1];
      if (z < PIT.z1 - 28 || z > PIT.z2 + 28) return [[a, b]];
      const xmin = Math.min(a[0], b[0]), xmax = Math.max(a[0], b[0]);
      if (xmax < PIT.x1 - 28 || xmin > PIT.x2 + 28) return [[a, b]];
      const out = [];
      if (xmin < PIT.x1 - 28) out.push([[xmin, z], [PIT.x1 - 28, z]]);
      if (xmax > PIT.x2 + 28) out.push([[PIT.x2 + 28, z], [xmax, z]]);
      return out;
    } else {
      const x = a[0];
      if (x < PIT.x1 - 28 || x > PIT.x2 + 28) return [[a, b]];
      const zmin = Math.min(a[1], b[1]), zmax = Math.max(a[1], b[1]);
      if (zmax < PIT.z1 - 28 || zmin > PIT.z2 + 28) return [[a, b]];
      const out = [];
      if (zmin < PIT.z1 - 28) out.push([[x, zmin], [x, PIT.z1 - 28]]);
      if (zmax > PIT.z2 + 28) out.push([[x, PIT.z2 + 28], [x, zmax]]);
      return out;
    }
  }

  function buildRoadGrid() {
    const extent = 1160;
    for (let z = -1160; z <= 1160; z += BLOCK) {
      const segs = clipRoadToPit([-extent, z], [extent, z], true);
      for (const [a, b] of segs) {
        if (Math.hypot((a[0] + b[0]) / 2, z) < 1320) addStreetStrip(0, 0, a, b, 18, 0x151b1c);
      }
    }
    for (let x = -1160; x <= 1160; x += BLOCK) {
      const segs = clipRoadToPit([x, -extent], [x, extent], false);
      for (const [a, b] of segs) {
        if (Math.hypot(x, (a[1] + b[1]) / 2) < 1320) addStreetStrip(0, 0, a, b, 18, 0x151b1c);
      }
    }
    // Major transit boulevard south, wider and twice-lit.
    const south = clipRoadToPit([-1400, 808], [1400, 808], true);
    for (const [a, b] of south) addStreetStrip(0, 0, a, b, 38, 0x111718);
    const west = clipRoadToPit([-780, -1400], [-780, 1400], false);
    for (const [a, b] of west) addStreetStrip(0, 0, a, b, 30, 0x111718);

    // Street lamps and junction furniture.
    for (let gx = -1100; gx <= 1100; gx += BLOCK * 2) {
      for (let gz = -1100; gz <= 1100; gz += BLOCK * 2) {
        if (gx > PIT.x1 - 40 && gx < PIT.x2 + 40 && gz > PIT.z1 - 40 && gz < PIT.z2 + 40) continue;
        if (Math.hypot(gx, gz) > 1280) continue;
        const h = 12;
        boxB(gx, gz, gx + 8, 0.4, gz + 8, 0.75, h, 0.75, 0x3a4140);
        boxB(gx, gz, gx + 8, h, gz + 8, 3.5, 0.5, 1.2, 0x2b3131);
        addGlow(gx + 8, h + 1, gz + 8, 0xffa452, 2.2);
        if (chance(0.14)) {
          boxB(gx, gz, gx - 10, 0.3, gz - 12, 7, 1.0, 5, 0x252c2c);
          addStreetSign(gx - 8, 7, gz - 12, rand(0, TAU), rand(0.75, 1.1), chance(0.5));
        }
      }
    }
  }
