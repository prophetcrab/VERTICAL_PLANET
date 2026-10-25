  /* ------------------------------------------------------------------ */
  /* Upper air — skyways, gardens and the orbital layer                  */
  /* ------------------------------------------------------------------ */
  function ringPoint(cx, cz, r, a, y) {
    return new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r);
  }

  function addSkyRing(cx, cz, r, y, width, accent, segs, tilt) {
    segs = segs || 64;
    const incline = tilt || 0;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * TAU;
      const a1 = ((i + 1) / segs) * TAU;
      const y0 = y + Math.sin(a0 * 2) * incline;
      const y1 = y + Math.sin(a1 * 2) * incline;
      const p0 = ringPoint(cx, cz, r, a0, y0);
      const p1 = ringPoint(cx, cz, r, a1, y1);
      // deck
      beamB(0, 0, p0.clone().setY(y0), p1.clone().setY(y1), width, 1.8, 0x252c2d, { skipBottom: false });
      // underside truss
      beamB(0, 0, p0.clone().setY(y0 - 2.2), p1.clone().setY(y1 - 2.2), width * 0.72, 1.2, 0x1b2223, { skipBottom: false });
      const mid = p0.clone().add(p1).multiplyScalar(0.5);
      if (i % 4 === 0) {
        beamB(0, 0, mid.clone().setY(y0 - 1), mid.clone().setY(y0 - 7), width * 0.3, 1.0, 0x323a3a);
      }
      // lane stripes
      const tangent = p1.clone().sub(p0);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      for (let lane = -1; lane <= 1; lane += 2) {
        const lp0 = p0.clone().add(normal.clone().multiplyScalar(lane * width * 0.25)).setY(y0 + 1.1);
        const lp1 = p1.clone().add(normal.clone().multiplyScalar(lane * width * 0.25)).setY(y1 + 1.1);
        beamN(0, 0, lp0, lp1, 1.25, 0.28, accent, { skipBottom: true });
        // continuous edge neon on both flanks
        const ep0 = p0.clone().add(normal.clone().multiplyScalar(lane * width * 0.5)).setY(y0 + 0.7);
        const ep1 = p1.clone().add(normal.clone().multiplyScalar(lane * width * 0.5)).setY(y1 + 0.7);
        beamN(0, 0, ep0, ep1, 0.5, 0.5, accent, { skipBottom: true });
      }
      if (i % 3 === 0) {
        addGlow(p0.x, y0 + 2, p0.z, accent, 1.4);
        addGlow(p0.x, y0 - 6, p0.z, 0xff8b3d, 0.9);
      }
      // guard rail posts
      if (i % 2 === 0) {
        for (const s of [-1, 1]) {
          const gp = p0.clone().add(normal.clone().multiplyScalar(s * width / 2));
          boxB(0, 0, gp.x, y0, gp.z, 0.4, 3, 0.4, 0x343d3c);
        }
      }
    }
    // Pillars down into the low city.
    const pillarCount = Math.max(6, Math.floor(r / 90));
    for (let i = 0; i < pillarCount; i++) {
      const a = (i / pillarCount) * TAU + 0.2;
      const px = cx + Math.cos(a) * r;
      const pz = cz + Math.sin(a) * r;
      if (px > PIT.x1 && px < PIT.x2 && pz > PIT.z1 && pz < PIT.z2) {
        // hang from the rim instead of standing in the void
        continue;
      }
      const groundY = 0;
      const pw = 5.5;
      boxB(0, 0, px, groundY, pz, pw, y, pw, 0x2f3636);
      for (let yy = 18; yy < y; yy += 40) {
        boxB(0, 0, px, yy, pz, pw + 4, 1.4, pw + 4, 0x3b4341);
        if (chance(0.3)) addGlow(px, yy, pz, accent, 0.8);
      }
    }
    return { cx, cz, r, y, width };
  }

  function addHelixRamp(cx, cz, r0, r1, y0, y1, turns, width, accent) {
    const segs = Math.max(48, Math.floor(turns * 46));
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs, t1 = (i + 1) / segs;
      const a0 = t0 * TAU * turns, a1 = t1 * TAU * turns;
      const rr0 = lerp(r0, r1, t0), rr1 = lerp(r0, r1, t1);
      const p0 = ringPoint(cx, cz, rr0, a0, lerp(y0, y1, t0));
      const p1 = ringPoint(cx, cz, rr1, a1, lerp(y0, y1, t1));
      beamB(0, 0, p0, p1, width, 1.6, 0x262d2e, { skipBottom: false });
      if (i % 5 === 0) {
        boxB(0, 0, p0.x, p0.y - 3, p0.z, width * 0.6, 1.0, width * 0.2, 0x333c3b, { rotY: a0 });
        addGlow(p0.x, p0.y + 1, p0.z, accent, 1.2);
      }
      if (i % 3 === 0) {
        // support mast down to the city
        if (!(p0.x > PIT.x1 && p0.x < PIT.x2 && p0.z > PIT.z1 && p0.z < PIT.z2)) {
          boxB(0, 0, p0.x, 0, p0.z, 1.8, p0.y, 1.8, 0x2b3231);
        }
      }
    }
  }

  function addSkyBridge(a, b, y, sag, width, accent, withCables) {
    const A = new THREE.Vector3(a[0], y, a[1]);
    const B = new THREE.Vector3(b[0], y, b[1]);
    const len = A.distanceTo(B);
    const segs = Math.max(12, Math.floor(len / 12));
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs, t1 = (i + 1) / segs;
      const p0 = A.clone().lerp(B, t0);
      const p1 = A.clone().lerp(B, t1);
      p0.y -= Math.sin(t0 * Math.PI) * sag;
      p1.y -= Math.sin(t1 * Math.PI) * sag;
      beamB(0, 0, p0, p1, width, 1.6, 0x2b3333, { skipBottom: false });
      if (i % 2 === 0) {
        addGlow(p0.x, p0.y + 1.2, p0.z, accent, 0.8);
        addGlow(p0.x, p0.y - 4, p0.z, 0xff7d38, 0.7);
      }
    }
    // suspension cables
    if (withCables !== false) {
      for (let k = 0; k < 2; k++) {
        const off = (k === 0 ? -1 : 1) * width * 0.55;
        let prev = null;
        for (let i = 0; i <= 16; i++) {
          const t = i / 16;
          const p = A.clone().lerp(B, t);
          p.y -= Math.sin(t * Math.PI) * sag;
          const perp = new THREE.Vector3(B.z - A.z, 0, A.x - B.x).normalize().multiplyScalar(off);
          p.add(perp);
          p.y += 20 - Math.sin(t * Math.PI) * (sag + 16);
          if (prev) addLine(prev, p, accent, 0.16);
          prev = p;
        }
      }
    }
  }

  function addEcoPlatform(cx, cz, y, radius, levels, palette) {
    for (let l = 0; l < levels; l++) {
      const ly = y + l * 18;
      const rr = radius * (1 - l * 0.14);
      // octagonal deck: wet soil and moss, bordered by a thin agricultural neon line
      for (let k = 0; k < 4; k++) {
        boxB(0, 0, cx, ly - 2.6, cz, rr * 2, 2.6, rr * 1.2, 0x242a20, { rotY: k * Math.PI / 4 });
        boxB(0, 0, cx, ly - 0.25, cz, rr * 1.96, 0.45, rr * 1.16, 0x1b2119, { rotY: k * Math.PI / 4 });
        boxN(0, 0, cx, ly - 0.22, cz, rr * 2.0, 0.14, rr * 1.19, 0x4d7d3d, { rotY: k * Math.PI / 4 });
      }
      // Radial stone walkways lit warmly.
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU + 0.4;
        for (let t = 6; t < rr; t += 9) {
          const px = cx + Math.cos(a) * t;
          const pz = cz + Math.sin(a) * t;
          boxB(0, 0, px, ly - 0.15, pz, 7, 0.35, 7, i % 2 ? 0x3a3a31 : 0x34352d, { rotY: a });
          if (t % 18 < 9) addGlow(px, ly + 0.4, pz, 0xffa95e, 0.5);
        }
      }
      // Edge planter ring with dense shrubs.
      for (let i = 0; i < 54; i++) {
        const a = i / 54 * TAU;
        const rr2 = rr * rand(0.8, 0.93);
        const px = cx + Math.cos(a) * rr2;
        const pz = cz + Math.sin(a) * rr2;
        boxB(0, 0, px, ly, pz, rand(3.4, 6.0), rand(1.6, 3.0), rand(3.0, 5.0), pick([0x2c3a26, 0x33452a, 0x263120]));
        for (let k = 0; k < 4; k++) {
          boxB(0, 0, px + rand(-2.2, 2.2), ly + rand(1.2, 2.8), pz + rand(-2.2, 2.2), rand(1.8, 4.2), rand(1.0, 2.6), rand(1.8, 4.0), pick([0x40602f, 0x50763a, 0x35502c, 0x5d8341]));
        }
      }
      // Orchard and understory in the interior.
      const treeCount = 34 - l * 7;
      for (let i = 0; i < treeCount; i++) {
        const a = rand(0, TAU);
        const rad = rr * Math.sqrt(rand(0.03, 0.72));
        const px = cx + Math.cos(a) * rad;
        const pz = cz + Math.sin(a) * rad;
        if (Math.abs(Math.cos(a) * rad) < 9 || Math.abs(Math.sin(a) * rad) < 9) continue; // leave walkways
        boxB(0, 0, px, ly, pz, rand(3, 6), rand(0.8, 1.6), rand(3, 6), 0x2c2419);
        makeTree(0, 0, px, ly + 1, pz, rand(6, 13), chance(0.35));
      }
      // Agricultural crop rows: long low green strips with magenta grow lights.
      for (let i = 0; i < 7; i++) {
        const ang = i / 7 * TAU + l * 0.4;
        const len = rr * rand(0.5, 1.3);
        for (let t = -len / 2; t < len / 2; t += 4.2) {
          const px = cx + Math.cos(ang) * (rr * 0.55 + t);
          const pz = cz + Math.sin(ang) * (rr * 0.55 + t);
          if (Math.hypot(px - cx, pz - cz) > rr * 0.78) continue;
          boxB(0, 0, px, ly, pz, 2.6, rand(0.6, 1.4), 3.0, pick([0x3c5c2c, 0x4a6d33, 0x2f4b26]), { rotY: ang });
          if (chance(0.18)) addGlow(px, ly + 1.6, pz, chance(0.65) ? 0xff6f9a : 0x9cc8ff, 0.32);
        }
      }
      // Small maintenance pavilion.
      if (l === 0) {
        const a = 2.3;
        const px = cx + Math.cos(a) * rr * 0.42;
        const pz = cz + Math.sin(a) * rr * 0.42;
        boxB(0, 0, px, ly, pz, 16, 5, 12, 0x333b31);
        boxB(0, 0, px, ly + 5, pz, 17, 0.6, 13, 0x4a5a44);
        for (let k = 0; k < 4; k++) boxB(0, 0, px - 6 + k * 4, ly + 5.6, pz + 6, 0.4, 2.4, 0.4, 0x5f6d57);
        boxN(0, 0, px, ly + 3.4, pz + 6.2, 13, 1.4, 0.4, 0xffb066);
        addGlow(px, ly + 3, pz + 7, 0xffab63, 1.4);
      }
      // Vines spilling over the edges.
      for (let i = 0; i < 20; i++) {
        const a = i / 20 * TAU;
        const px = cx + Math.cos(a) * rr * 0.97;
        const pz = cz + Math.sin(a) * rr * 0.97;
        const vh = rand(10, 40);
        boxB(0, 0, px, ly - vh, pz, 1.2, vh, 1.2, 0x2c4227);
        for (let v = 0; v < 5; v++) boxB(0, 0, px + rand(-1.2, 1.2), ly - vh + v * vh / 5, pz + rand(-1.2, 1.2), rand(2.4, 5.2), 1.4, rand(2.4, 5.0), pick([0x365129, 0x44652f, 0x2b4024]));
        if (i % 4 === 0) addWaterPlane(px, ly - 2, pz, ly - rand(40, 90), 2.2, 0, 0x9af4de);
      }
      // Under-deck growth lighting.
      for (let i = 0; i < 14; i++) {
        const a = rand(0, TAU);
        addGlow(cx + Math.cos(a) * rr * 0.7, ly - 5, cz + Math.sin(a) * rr * 0.7, 0x6fbf5a, 0.6);
      }
      // Buzzing pollinator drones.
      for (let i = 0; i < 5; i++) {
        const a = rand(0, TAU), rad2 = rr * rand(0.2, 0.8);
        addGlow(cx + Math.cos(a) * rad2, ly + rand(3, 10), cz + Math.sin(a) * rad2, 0xffc178, 0.5);
      }
    }
    occupancy.push({ x: cx, z: cz, w: radius * 2.2, d: radius * 2.2 });
  }

  function addGreenhouse(x, z, cx, cz, y, w, d, h) {
    boxB(x, z, cx, y, cz, w, 1.0, d, 0x333f37);
    // glass panels with green frame
    for (const face of ['pz', 'nz', 'px', 'nx']) {
      const c = faceCenter(cx, y + h / 2, cz, w, d, face);
      const fw = faceWidth(w, d, face);
      addGlowRect(x, z, c, face, fw * 0.96, h * 0.9, 0x1b3d35, 1);
      const horiz = face === 'pz' || face === 'nz';
      for (let i = -fw / 2; i <= fw / 2; i += 5) {
        if (horiz) boxB(x, z, c[0] + i, y, c[2], 0.5, h, 0.5, 0x7a9a7a);
        else boxB(x, z, c[0], y, c[2] + i, 0.5, h, 0.5, 0x7a9a7a);
      }
      boxN(x, z, c[0], y + h * 0.55, c[2], horiz ? fw * 0.9 : 0.3, 0.4, horiz ? 0.3 : fw * 0.9, 0xa9ff83);
    }
    boxB(x, z, cx, y + h, cz, w * 1.02, 1.4, d * 1.02, 0x415445);
    for (let i = 0; i < 9; i++) {
      const px = cx + rand(-w * 0.35, w * 0.35);
      const pz = cz + rand(-d * 0.35, d * 0.35);
      makeTree(x, z, px, y + 1, pz, rand(3, 7), false);
    }
    for (let i = 0; i < 4; i++) addGlow(cx + rand(-w / 3, w / 3), y + h * 0.5, cz + rand(-d / 3, d / 3), 0xa7ff8b, 0.9);
    addWaterPlane(cx + w * 0.3, y + h * 0.9, cz + d / 2, y, 3, 0, 0x9cf3d9);
    occupancy.push({ x: cx, z: cz, w: w * 1.2, d: d * 1.2 });
  }

  const CAR_CAP = 190;
  let carSystem = null;

  function ensureCarSystem() {
    if (carSystem) return carSystem;
    const bodyGeo = new THREE.BoxGeometry(2.0, 0.9, 4.6);
    const cabGeo = new THREE.BoxGeometry(1.65, 0.8, 2.1);
    const accentGeo = new THREE.BoxGeometry(2.06, 0.16, 4.66);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true, shininess: 55, specular: 0x88999c });
    const cabMat = new THREE.MeshPhongMaterial({ color: 0x182124, flatShading: true, shininess: 90 });
    const accentMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, CAR_CAP);
    const cabs = new THREE.InstancedMesh(cabGeo, cabMat, CAR_CAP);
    const accents = new THREE.InstancedMesh(accentGeo, accentMat, CAR_CAP);
    bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cabs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    accents.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    bodies.frustumCulled = false; cabs.frustumCulled = false; accents.frustumCulled = false;
    scene.add(bodies, cabs, accents);
    const glowGeo = new THREE.BufferGeometry();
    glowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CAR_CAP * 3), 3));
    glowGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(CAR_CAP * 3), 3));
    const glowMat = new THREE.PointsMaterial({
      size: 5.2, map: makeGlowTexture(), transparent: true, vertexColors: true,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, opacity: 0.9
    });
    const glows = new THREE.Points(glowGeo, glowMat);
    glows.frustumCulled = false;
    scene.add(glows);
    carSystem = { bodies, cabs, accents, glows, cars: [], dummy: new THREE.Object3D(), count: 0 };
    return carSystem;
  }

  function addFlyingCar(path, opts) {
    const sys = ensureCarSystem();
    if (sys.cars.length >= CAR_CAP) return;
    const idx = sys.cars.length;
    const color = new THREE.Color(opts.color || 0x2b3335);
    const accent = new THREE.Color(opts.accent || 0xff8b3d);
    sys.bodies.setColorAt(idx, color);
    sys.accents.setColorAt(idx, accent);
    const colAttr = sys.glows.geometry.attributes.color;
    colAttr.setXYZ(idx, accent.r, accent.g, accent.b);
    const rec = {
      path, t: opts.phase || 0, speed: opts.speed || 24, scale: opts.scale || 1,
      bob: rand(0, TAU), idx, accent, dir: new THREE.Vector3(), pos: new THREE.Vector3(),
      q: new THREE.Quaternion(), length: 1,
    };
    for (let i = 1; i < path.length; i++) rec.length += path[i].distanceTo(path[i - 1]);
    rec.length = Math.max(1, rec.length);
    sys.cars.push(rec);
    sys.count = sys.cars.length;
    sys.bodies.count = sys.count; sys.cabs.count = sys.count; sys.accents.count = sys.count;
    sys.bodies.instanceColor.needsUpdate = true;
    sys.accents.instanceColor.needsUpdate = true;
    colAttr.needsUpdate = true;
    sys.glows.geometry.setDrawRange(0, sys.count);
    if (path.length) {
      posFromPath(rec, 0);
      updateCarInstance(rec, 0);
    }
    return rec;
  }

  const _carTmp = new THREE.Vector3();
  const _carLook = new THREE.Vector3();

  function posFromPath(rec, dt) {
    const path = rec.path;
    if (!path || path.length < 2) return;
    const n = path.length - 1;
    rec.t += (dt * rec.speed) / rec.length;
    rec.t = rec.t % 1;
    const fi = rec.t * n;
    const i0 = Math.min(n - 1, Math.floor(fi));
    const i1 = i0 + 1;
    const f = fi - i0;
    rec.pos.copy(path[i0]).lerp(path[i1], f);
    _carLook.copy(path[Math.min(n, i0 + 2)]).sub(path[i0]);
    if (_carLook.lengthSq() < 0.0001) _carLook.set(0, 0, 1);
    rec.dir.copy(_carLook).normalize();
  }

  function updateCarInstance(rec, time) {
    if (!carSystem) return;
    const sys = carSystem;
    const d = sys.dummy;
    const bob = Math.sin(time * 2.2 + rec.bob) * 0.45;
    d.position.copy(rec.pos);
    d.position.y += bob;
    d.scale.setScalar(rec.scale);
    _carTmp.copy(d.position).add(rec.dir);
    d.lookAt(_carTmp);
    d.updateMatrix();
    sys.bodies.setMatrixAt(rec.idx, d.matrix);
    d.position.y += 0.86 * rec.scale;
    d.updateMatrix();
    sys.cabs.setMatrixAt(rec.idx, d.matrix);
    d.position.y -= 0.44 * rec.scale;
    d.updateMatrix();
    sys.accents.setMatrixAt(rec.idx, d.matrix);
    const g = sys.glows.geometry.attributes.position;
    g.setXYZ(rec.idx, rec.pos.x, rec.pos.y + 0.9, rec.pos.z);
  }

  function updateTraffic(dt, time) {
    if (!carSystem) return;
    const sys = carSystem;
    for (const rec of sys.cars) {
      posFromPath(rec, dt);
      updateCarInstance(rec, time);
    }
    sys.bodies.instanceMatrix.needsUpdate = true;
    sys.cabs.instanceMatrix.needsUpdate = true;
    sys.accents.instanceMatrix.needsUpdate = true;
    sys.glows.geometry.attributes.position.needsUpdate = true;
  }


  let glowTexture = null;
  function makeGlowTexture() {
    if (glowTexture) return glowTexture;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,210,160,.75)');
    g.addColorStop(0.6, 'rgba(255,140,60,.22)');
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    glowTexture = new THREE.CanvasTexture(c);
    return glowTexture;
  }

  function makeSkypath(points) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])), false, 'catmullrom', 0.25);
    return curve.getPoints(160);
  }

  function addSkywayDistrict() {
    const accent = 0xff8f42;
    // Three interlocking rings, each with traffic.
    addSkyRing(0, -90, 450, 480, 20, 0xff8b3d, 72, 0);
    addSkyRing(0, -90, 610, 570, 18, 0x63e2e5, 80, 12);
    addSkyRing(0, -90, 790, 430, 16, 0xffb45e, 88, 0);
    // Helical connectors between the rings.
    addHelixRamp(0, -90, 450, 610, 480, 570, 0.55, 13, 0x9fe8e8);
    addHelixRamp(0, -90, 610, 790, 570, 430, -0.45, 12, 0xff9b4e);
    addHelixRamp(0, -90, 790, 450, 430, 480, 0.25, 10, 0xffc177);

    // Mid-level links: the industrial lowline physically plugs into the
    // skyline, so the 0-200 m and 200-600 m bands are one continuous system.
    const midLinks = [
      [[-352, 752], [-392, 438], 246, 12, 0xff8b3d],
      [[-392, 438], [-650, 80], 262, 10, 0xffb45e],
      [[-352, 752], [36, -916], 292, 14, 0xff9a4e],
      [[430, 26], [506, -540], 234, 11, 0xbaff74],
      [[758, -186], [862, 428], 318, 12, 0x62d5e6],
      [[-196, -1004], [-518, -466], 276, 10, 0xff8962],
      [[522, 864], [430, 26], 214, 10, 0xffcc75],
    ];
    for (const [a, b, y, w, col] of midLinks) {
      const span = Math.hypot(a[0] - b[0], a[1] - b[1]);
      addSkyBridge(a, b, y, Math.min(26, span * 0.04), w, col, true);
      // A service lift pod at each end anchors the link to the lowline.
      for (const p of [a, b]) {
        boxB(0, 0, p[0] + rand(-8, 8), 0, p[1] + rand(-8, 8), 14, y, 14, 0x2c3433);
        for (let yy = 20; yy < y; yy += 30) {
          boxN(0, 0, p[0], yy, p[1] + 7.2, 8, 0.5, 0.5, col);
          if (yy % 60 < 30) addGlow(p[0], yy, p[1] + 7.6, col, 1.0);
        }
      }
    }

    // High viaducts crossing above the shaft, tied to the mega-towers.
    const bridgePairs = [
      [[-352, 752], [430, 26], 826, 18, 0xff8b3d],
      [[-650, 80], [506, -540], 640, 26, 0xbaff74],
      [[862, 428], [758, -186], 980, 20, 0xff527e],
      [[-518, -466], [1052, -802], 1120, 30, 0xa8e9ff],
      [[-956, 258], [522, 864], 522, 16, 0x63e2e5],
      [[-196, -1004], [506, -540], 860, 22, 0xffb45e],
    ];
    for (const [a, b, y, w, col] of bridgePairs) {
      const span = Math.hypot(a[0] - b[0], a[1] - b[1]);
      addSkyBridge(a, b, y, Math.min(40, span * 0.05), w, col, span < 760);
      addGlow((a[0] + b[0]) / 2, y - 20, (a[1] + b[1]) / 2, col, 3.2);
    }

    // Traffic paths.
    const carColors = [0x2b3335, 0x39413e, 0x4a3b2e, 0x2e3a42, 0x513a35, 0x3d4538];
    for (let ring = 0; ring < 3; ring++) {
      const rr = [450, 610, 790][ring];
      const yy = [480, 570, 430][ring];
      const n = 9 + ring * 2;
      for (let i = 0; i < n; i++) {
        const dir = i % 2 ? 1 : -1;
        const pts = [];
        for (let k = 0; k <= 12; k++) {
          const a = dir * (k / 12) * TAU + i * 0.37;
          pts.push([Math.cos(a) * rr, yy + 3.2 + Math.sin(a * 3 + i) * 1.2, -90 + Math.sin(a) * rr]);
        }
        // close loop
        for (let k = 0; k <= 12; k++) {
          const a = dir * (k / 12) * TAU + i * 0.37;
          pts.push([Math.cos(a) * rr, yy + 3.2 + Math.sin(a * 3 + i) * 1.2, -90 + Math.sin(a) * rr]);
        }
        addFlyingCar(makeSkypath(pts), {
          color: pick(carColors), accent: pick([0xff9a4e, 0x6fe6e0, 0xff5c7e, 0xffd18a]),
          speed: rand(26, 44), phase: rand(0, 1), scale: rand(0.8, 1.3)
        });
      }
    }
    // Long-haul cars crossing the city between tower pairs.
    for (let i = 0; i < 22; i++) {
      const a = pick(TOWER_SPECS);
      let b = pick(TOWER_SPECS);
      while (b === a) b = pick(TOWER_SPECS);
      const p0 = [a.x, rand(260, Math.min(1000, a.h + 80)), a.z];
      const p1 = [b.x, rand(260, Math.min(1000, b.h + 80)), b.z];
      const mid = [(a.x + b.x) / 2 + rand(-80, 80), Math.max(p0[1], p1[1]) + rand(20, 130), (a.z + b.z) / 2 + rand(-80, 80)];
      const path = makeSkypath([p0, mid, p1]);
      path.push(...path.slice().reverse());
      addFlyingCar(path, {
        color: pick(carColors), accent: pick([0xff9a4e, 0x6fe6e0, 0xff5c7e]),
        speed: rand(30, 55), phase: rand(0, 1), scale: rand(0.9, 1.5)
      });
      addLine(new THREE.Vector3(...p0), new THREE.Vector3(...mid), 0x8a7a68, 0.18);
      addLine(new THREE.Vector3(...mid), new THREE.Vector3(...p1), 0x8a7a68, 0.18);
    }
    // Helix traffic.
    const helixPts = [];
    for (let k = 0; k <= 90; k++) {
      const t = k / 90;
      const a = t * TAU * 0.55;
      const r = lerp(450, 610, t);
      helixPts.push([Math.cos(a) * r, lerp(480, 570, t) + 4, -90 + Math.sin(a) * r]);
    }
    for (let i = 0; i < 4; i++) {
      addFlyingCar(makeSkypath(helixPts), { color: pick(carColors), accent: 0x8fe6e6, speed: 20 + i * 3, phase: i / 4, scale: 1.1 });
    }

    // Interchange signage and platforms.
    addBillboard({ x: 424, y: 500, z: -90, w: 54, h: 20, rotY: -Math.PI / 2, text: '云际立交', sub: 'AERIAL INTERCHANGE / 04', color: '#ff9a4e', vertical: false, bg: true, border: true, flicker: false });
    addBillboard({ x: 0, y: 538, z: -500, w: 62, h: 22, rotY: 0, text: '上方无路', sub: 'HEAVEN IS A TURNPIKE', color: '#62e2e9', vertical: false, bg: true, border: true, flicker: true });
    dynamic.landmarkPositions.push({ id: 'S1', name: '云际立交', en: 'AERIAL INTERCHANGE', x: 450, y: 560, z: -90, alt: 560, color: 0xff8b3d });
  }

  function addEcoDistrict() {
    // Hanging forest terraces around the Perch / O2X towers.
    addEcoPlatform(506, -540, 610, 150, 3, null);
    addEcoPlatform(430, 26, 420, 96, 2, null);
    addEcoPlatform(-60, -260, 760, 120, 2, null);
    addEcoPlatform(760, 500, 560, 88, 2, null);
    // Floating planter barges.
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU + 0.4;
      const rr = rand(240, 720);
      const cx = Math.cos(a) * rr;
      const cz = -80 + Math.sin(a) * rr;
      const cy = rand(260, 840);
      const size = rand(18, 46);
      boxB(0, 0, cx, cy, cz, size * 1.4, 4, size, 0x303d34);
      boxN(0, 0, cx, cy + 4, cz, size * 1.42, 0.6, size * 1.02, 0x86e86f);
      for (let k = 0; k < 5; k++) {
        makeTree(0, 0, cx + rand(-size * 0.4, size * 0.4), cy + 4, cz + rand(-size * 0.35, size * 0.35), rand(4, 9), true);
      }
      // thrusters
      for (const s of [-1, 1]) {
        boxB(0, 0, cx + s * size * 0.45, cy - 4, cz, 5, 4, 5, 0x2a3130);
        addGlow(cx + s * size * 0.45, cy - 6, cz, 0x83f4e0, 1.2);
      }
      // mooring line down to the lowline
      addHangingCables(0, 0, cx, cz, cy - 4, cx + rand(-20, 20), cz + rand(-20, 20), 12, 2, 0x4a5048);
      addWaterPlane(cx + size * 0.3, cy + 2, cz + size * 0.5, cy - rand(80, 240), 3, 0, 0x92eedb);
    }
    // Greenhouses on tower shoulders.
    addGreenhouse(0, 0, 560, -300, 380, 44, 30, 20);
    addGreenhouse(0, 0, 700, 40, 300, 40, 28, 18);
    addGreenhouse(0, 0, -300, -300, 250, 50, 34, 22);
    addGreenhouse(0, 0, 900, -500, 340, 46, 32, 20);
    // Seed vault: a bright geodesic-ish dome made of stepped boxes.
    const sx = 236, sz = -330;
    for (let r = 0; r < 6; r++) {
      const rr = 58 - r * 8;
      boxB(0, 0, sx, 420 + r * 5, sz, rr * 2, 6, rr * 2, r % 2 ? 0x31463a : 0x253a31, { rotY: r * 0.12 });
      for (let k = 0; k < 10; k++) {
        const a = k / 10 * TAU + r * 0.3;
        addGlow(sx + Math.cos(a) * rr * 0.9, 423 + r * 5, sz + Math.sin(a) * rr * 0.9, 0xa8ff82, 0.7);
      }
    }
    addBillboard({ x: sx, y: 400, z: sz + 60, w: 38, h: 14, rotY: 0, text: '种子银行', sub: 'SEED BANK / VIABLE', color: '#baff74', vertical: false, bg: true, border: true, flicker: false });
    occupancy.push({ x: sx, z: sz, w: 120, d: 120 });
    dynamic.landmarkPositions.push({ id: 'S2', name: '栖木悬园', en: 'PERCH TERRACES', x: 506, y: 740, z: -540, alt: 740, color: 0xbaff74 });
  }

  function addOrbitalLayer() {
    // Orbital anchor cables from the two tallest towers.
    const anchors = [towerByKey.anchor, towerByKey.plumb];
    anchors.forEach((a, i) => {
      const top = a.h * 0.94 + (i === 0 ? 220 : 200);
      for (let k = 0; k < 14; k++) {
        const yy = top + k * k * 7;
        addGlow(a.x + Math.sin(k) * 2, yy, a.z + Math.cos(k) * 2, 0xffe1b3, 1.2);
      }
      // orbital ring arc
      const arcPts = [];
      for (let k = 0; k <= 40; k++) {
        const t = k / 40;
        const a0 = -0.8 + t * 3.0;
        arcPts.push(new THREE.Vector3(Math.cos(a0) * 3000, 2650 + Math.sin(t * Math.PI) * 380, -1000 + Math.sin(a0) * 2100));
      }
      const g = new THREE.BufferGeometry().setFromPoints(arcPts);
      const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: i === 0 ? 0xffd8a0 : 0x9fdfe8, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      scene.add(line);
    });
    // A distant orbital station silhouette.
    const ox = 1800, oy = 2360, oz = -3900;
    for (let i = 0; i < 3; i++) {
      boxB(0, 0, ox, oy + i * 26, oz, 300 - i * 40, 16, 90, 0x22292c);
      boxN(0, 0, ox, oy + i * 26 + 16, oz, 300 - i * 40, 2.2, 90, i === 1 ? 0x8fd7e0 : 0xffe0b0);
    }
    addGlow(ox, oy + 40, oz, 0xfff0d0, 12);
    dynamic.landmarkPositions.push({ id: 'S3', name: '轨道锚', en: 'ORBITAL ANCHOR', x: -1510, y: 2200, z: -1320, alt: 2200, color: 0xffe1b3 });
    // Top-of-atmosphere haze planes.
    const hazeGeo = new THREE.PlaneGeometry(6200, 6200);
    const hazeMat = new THREE.MeshBasicMaterial({ color: 0x6b7f83, transparent: true, opacity: 0.035, depthWrite: false, side: THREE.DoubleSide });
    const haze = new THREE.Mesh(hazeGeo, hazeMat);
    haze.rotation.x = -Math.PI / 2;
    haze.position.y = 2050;
    scene.add(haze);
  }


  /* ------------------------------------------------------------------ */
  /* Distant crust — the rest of the planet-wide city                   */
  /* ------------------------------------------------------------------ */
  function buildDistantCrust() {
    // A cheap procedural skyline band that proves the planet is fully urbanized.
    // These are separate simplified megablocks, still per-seed unique.
    const ringBands = [
      { r0: 1280, r1: 1650, count: 300, hMin: 40, hMax: 260, width: 62 },
      { r0: 1680, r1: 2150, count: 280, hMin: 60, hMax: 380, width: 78 },
      { r0: 2180, r1: 2850, count: 230, hMin: 80, hMax: 560, width: 92 },
      { r0: 2900, r1: 3700, count: 170, hMin: 100, hMax: 760, width: 110 },
      { r0: 3760, r1: 4700, count: 120, hMin: 140, hMax: 900, width: 130 },
    ];
    const palette = [0x2a3130, 0x333b39, 0x232a2b, 0x3b3d36, 0x2d3436];
    for (const band of ringBands) {
      for (let i = 0; i < band.count; i++) {
        const a = (i / band.count) * TAU + rand(-0.02, 0.02);
        const r = lerp(band.r0, band.r1, worldRng());
        const cx = Math.cos(a) * r;
        const cz = Math.sin(a) * r;
        if (cx > PIT.x1 - 200 && cx < PIT.x2 + 200 && cz > PIT.z1 - 200 && cz < PIT.z2 + 200) continue;
        const w = band.width * rand(0.5, 1.5);
        const d = band.width * rand(0.5, 1.5);
        const h = lerp(band.hMin, band.hMax, Math.pow(worldRng(), 1.7));
        const body = pick(palette);
        // Each distant building gets one window colour so the skyline reads as
        // city blocks, not confetti.
        const winCol = chance(0.86) ? 0xffc48c : (chance(0.6) ? 0xdceaf0 : 0x9fd4d8);
        // Main block plus one or two smaller annexes.
        boxB(0, 0, cx, 0, cz, w, h, d, body);
        boxB(0, 0, cx, h, cz, w * 0.82, rand(2, 8), d * 0.82, 0x3b4340);
        if (chance(0.45)) {
          const h2 = h * rand(1.05, 1.5);
          boxB(0, 0, cx + rand(-w * 0.4, w * 0.4), 0, cz + rand(-d * 0.4, d * 0.4), w * 0.45, h2, d * 0.45, 0x2c3434);
          for (let yy = h * 0.4; yy < h2; yy += rand(28, 46)) {
            addGlow(cx, yy, cz, winCol, 0.7);
          }
        }
        // Emissive window bands on the two camera-facing sides.
        const bands = Math.max(2, Math.floor(h / 26));
        for (let b = 0; b < bands; b++) {
          const yy = 10 + b * (h / bands);
          if (!chance(0.55)) continue;
          addGlowRect(0, 0, [cx, yy, cz + d / 2 + 0.6], 'pz', w * rand(0.4, 0.9), 3.4, chance(0.55) ? 0xffa45c : 0x6fe4ea, 1.0);
          if (chance(0.5)) addGlowRect(0, 0, [cx + w / 2 + 0.6, yy, cz], 'px', d * rand(0.3, 0.8), 3.0, 0xffbb76, 0.9);
        }
        if (h > 160) {
          boxB(0, 0, cx, h, cz, 2.4, rand(12, 60), 2.4, 0x242a2a);
          addGlow(cx, h + 30, cz, 0xff4a32, 1.6);
        }
        addGlow(cx, rand(4, Math.min(h, 80)), cz + d / 2 + 2, 0xffa258, 1.6);
      }
    }
    // A far ring of megatowers marks the terminator.
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * TAU + rand(-0.05, 0.05);
      const r = rand(4100, 5200);
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
      const h = rand(500, 1200);
      boxB(0, 0, cx, 0, cz, rand(90, 180), h, rand(90, 180), 0x222a2c);
      boxB(0, 0, cx, h, cz, 42, rand(60, 200), 42, 0x2b3335);
      for (let yy = 80; yy < h; yy += 90) {
        addGlow(cx, yy, cz, chance(0.78) ? 0xff8a4e : 0xd8b98a, 2.2);
      }
      addGlow(cx, h + 120, cz, 0xffc37a, 6);
    }
    // Industrial stain on the horizon.
    for (let i = 0; i < 40; i++) {
      const a = rand(0, TAU), r = rand(2700, 4800);
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
      const s = rand(120, 420);
      const mat = new THREE.SpriteMaterial({
        map: makeGlowTexture(), color: 0x3d4a4a, transparent: true, opacity: rand(0.03, 0.09),
        blending: THREE.NormalBlending, depthWrite: false
      });
      const spr = new THREE.Sprite(mat);
      spr.position.set(cx, rand(60, 260), cz);
      spr.scale.set(s, s * 0.5, 1);
      scene.add(spr);
    }
  }
