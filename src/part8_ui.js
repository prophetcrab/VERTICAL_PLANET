  /* ------------------------------------------------------------------ */
  /* Interface                                                          */
  /* ------------------------------------------------------------------ */
  let toastTimer = null;
  function showToast(text, ms) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms || 1900);
  }

  function revealModal(el) {
    el.classList.add('show');
    el.style.transition = 'none';
    el.style.visibility = 'visible';
    el.style.opacity = '1';
  }
  function hideModal(el) {
    el.classList.remove('show');
    el.style.opacity = '0';
    el.style.visibility = 'hidden';
  }
  function openModal(which) {
    document.body.classList.add('ui-modal');
    if (which === 'help') revealModal(DOM.help);
    if (which === 'transport') revealModal(DOM.transport);
    if (pointerLocked) document.exitPointerLock();
  }
  function closeModal(which) {
    if (which === 'help') hideModal(DOM.help);
    if (which === 'transport') hideModal(DOM.transport);
    if (!DOM.help.classList.contains('show') && !DOM.transport.classList.contains('show')) {
      document.body.classList.remove('ui-modal');
    }
  }
  function toggleHelp() {
    if (DOM.help.classList.contains('show')) closeModal('help');
    else { closeModal('transport'); openModal('help'); }
  }
  function toggleTransport() {
    if (DOM.transport.classList.contains('show')) closeModal('transport');
    else { closeModal('help'); openModal('transport'); }
  }
  function toggleLabels() {
    document.body.classList.toggle('hide-labels');
    const on = !document.body.classList.contains('hide-labels');
    $('btn-labels').classList.toggle('on', on);
    $('btn-labels2').style.color = on ? 'var(--dim)' : 'var(--amber)';
    showToast(on ? '地标标注已开启' : '地标标注已隐藏');
  }
  function toggleHud() {
    document.body.classList.toggle('hide-hud');
    const hidden = document.body.classList.contains('hide-hud');
    const hudEl = $('hud');
    hudEl.style.transition = 'none';
    hudEl.style.opacity = hidden ? '0' : '1';
    hudEl.style.pointerEvents = hidden ? 'none' : '';
    showToast(hidden ? '界面已隐藏 · V 恢复' : '界面已恢复');
  }
  let fullscreen = false;
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen && document.exitFullscreen();
    }
  }

  const DEST = {
    overlook: { pos: [66, 384, 702], target: [-18, -220, -260], name: '观测栈桥', zone: 'SOUTH RIM / OVERLOOK', alt: '+0384 M', district: '南缘', html: '观景<em>栈桥</em>' },
    crown: { pos: [790, 780, 1080], target: [-40, 120, -230], name: '南缘观景台', zone: 'SOUTH RIM / ESTABLISHING VIEW', alt: '+0780 M', district: '南缘', html: '南缘<em>观景台</em>' },
    market: { pos: [356, 17, 906], target: [356, 32, 640], name: '九层集市', zone: 'LOWLINE / CANOPY BAZAAR', alt: '+0017 M', district: '九层', html: '九层<em>集市</em>' },
    pit: { pos: [30, -520, 420], target: [0, -810, -140], name: '机舱底层', zone: 'SUBSTRATA / ENGINE FLOOR', alt: '-0520 M', district: '机舱', html: '机舱<em>底层</em>' },
    interchange: { pos: [500, 590, 210], target: [0, 520, -90], name: '云际立交', zone: 'SKYWAY / AERIAL INTERCHANGE', alt: '+0590 M', district: '云际', html: '云际<em>立交</em>' },
    eco: { pos: [612, 700, -420], target: [506, 640, -540], name: '栖木悬园', zone: 'BIOSPHERE / PERCH TERRACE', alt: '+0700 M', district: '栖木', html: '栖木<em>悬园</em>' },
    spire: { pos: [920, 1510, 760], target: [-160, 460, -320], name: '白噪塔冠', zone: 'UPPER AIR / WHITE NOISE CROWN', alt: '+1510 M', district: '白噪', html: '白噪<em>塔冠</em>' },
    orbit: { pos: [980, 1320, 300], target: [-120, 700, -200], name: '天穹层', zone: 'LAYER 03 / UPPER AIR', alt: '+1320 M', district: '天穹', html: '天穹<em>层</em>' },
  };

  let transition = null;
  function goTo(key) {
    const d = DEST[key];
    if (!d) return;
    closeModal('help');
    closeModal('transport');
    if (pointerLocked) document.exitPointerLock();
    const toPos = new THREE.Vector3(...d.pos);
    const toTarget = new THREE.Vector3(...d.target);
    const dYaw = Math.atan2(-(toTarget.x - toPos.x), -(toTarget.z - toPos.z));
    const dPitch = Math.asin(clamp((toTarget.y - toPos.y) / toTarget.distanceTo(toPos), -1, 1));
    // Deterministic teleport: position changes immediately, independent of
    // frame timing. A short flash communicates the jump.
    player.pos.copy(toPos);
    player.vel.set(0, 0, 0);
    camera.position.copy(toPos);
    cameraYaw = dYaw;
    cameraPitch = dPitch;
    camera.rotation.set(cameraPitch, cameraYaw, 0);
    transition = null;
    // A timer-driven blink, never a CSS transition: transitions can be
    // suspended in throttled tabs and would leave a black overlay stuck.
    const flash = $('flash');
    flash.style.transition = 'none';
    flash.style.opacity = '0.7';
    setTimeout(() => { flash.style.opacity = '0'; }, 110);
    showZone(d);
    if (key !== 'overlook') {
      player.baseSpeed = 58;
      player.speedIndex = 2;
    }
  }

  function updateTransition(dt) {
    // Reserved for future cinematic moves; teleports are instantaneous now.
  }

  let zoneTimer = null;
  function showZone(d) {
    const zf = $('zone-flash');
    $('zone-kicker').textContent = d.zone;
    $('zone-name').textContent = d.name;
    $('zone-alt').textContent = 'ALT ' + d.alt + ' / OEKUMENE-09';
    $('hud-district').innerHTML = d.html;
    $('hud-alt').textContent = d.alt;
    // Invalidate the altitude-based district cache; otherwise the HUD keeps the
    // previous stratum label because it believes nothing changed.
    delete $('hud-district').dataset.cur;
    zf.classList.add('show');
    if (zoneTimer) clearTimeout(zoneTimer);
    zoneTimer = setTimeout(() => zf.classList.remove('show'), 2600);
  }

  function setupUI() {
    $('btn-help').addEventListener('click', toggleHelp);
    $('btn-transport').addEventListener('click', toggleTransport);
    $('btn-labels').addEventListener('click', toggleLabels);
    $('btn-labels2').addEventListener('click', toggleLabels);
    $('btn-full').addEventListener('click', toggleFullscreen);
    $('btn-sound').addEventListener('click', toggleSound);
    $('btn-fx').addEventListener('click', cyclePostQuality);
    $('help-btn-intro').addEventListener('click', () => openModal('help'));
    document.querySelectorAll('[data-close]').forEach(b => {
      b.addEventListener('click', () => closeModal(b.getAttribute('data-close')));
    });
    DOM.help.addEventListener('click', (e) => { if (e.target === DOM.help) closeModal('help'); });
    DOM.transport.addEventListener('click', (e) => { if (e.target === DOM.transport) closeModal('transport'); });
    document.querySelectorAll('[data-dest]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        goTo(el.getAttribute('data-dest'));
      });
    });
    $('enter-btn').addEventListener('click', () => {
      // Immediate dismissal: the overlay must never compete with gameplay,
      // even when the tab is throttled or transitions are suspended.
      DOM.intro.style.transition = 'none';
      DOM.intro.style.opacity = '0';
      DOM.intro.style.visibility = 'hidden';
      DOM.intro.classList.remove('show');
      DOM.intro.classList.add('hide');
      const flashEl = $('flash');
      flashEl.style.transition = 'none';
      flashEl.style.opacity = '0.7';
      setTimeout(() => { flashEl.style.opacity = '0'; }, 120);
      document.body.classList.add('running');
      // Snap back to the authored establishing view after intro drift.
      player.pos.copy(START_POS);
      player.vel.set(0, 0, 0);
      camera.position.copy(START_POS);
      const d = START_TARGET.clone().sub(START_POS).normalize();
      cameraYaw = Math.atan2(-d.x, -d.z);
      cameraPitch = Math.asin(clamp(d.y, -1, 1));
      camera.rotation.set(cameraPitch, cameraYaw, 0);
      player.baseSpeed = 26;
      player.speedIndex = 1;
      showZone(DEST.crown);
      setTimeout(() => {
        renderer.domElement.focus();
        renderer.domElement.requestPointerLock && renderer.domElement.requestPointerLock();
      }, 900);
      initAudio();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Ambient audio (WebAudio, no external assets)                       */
  /* ------------------------------------------------------------------ */
  let audioCtx = null, audioGain = null, audioStarted = false, soundOn = false, audioNodes = [];
  function initAudio() {
    if (audioCtx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = new AC();
      audioGain = audioCtx.createGain();
      audioGain.gain.value = 0.0;
      audioGain.connect(audioCtx.destination);

      // Low industrial rumble.
      const noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 4, audioCtx.sampleRate);
      const nd = noiseBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < nd.length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        nd[i] = last * 3.2;
      }
      const src = audioCtx.createBufferSource();
      src.buffer = noiseBuf; src.loop = true;
      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 190; lp.Q.value = 0.7;
      const rumbleGain = audioCtx.createGain(); rumbleGain.gain.value = 0.5;
      src.connect(lp); lp.connect(rumbleGain); rumbleGain.connect(audioGain);
      src.start();
      audioNodes.push(src);

      // Mid hum from machinery.
      const osc = audioCtx.createOscillator();
      osc.type = 'sawtooth'; osc.frequency.value = 43;
      const oscLp = audioCtx.createBiquadFilter(); oscLp.type = 'lowpass'; oscLp.frequency.value = 120;
      const og = audioCtx.createGain(); og.gain.value = 0.055;
      osc.connect(oscLp); oscLp.connect(og); og.connect(audioGain);
      osc.start();
      audioNodes.push(osc);

      const osc2 = audioCtx.createOscillator();
      osc2.type = 'sine'; osc2.frequency.value = 65.5;
      const og2 = audioCtx.createGain(); og2.gain.value = 0.03;
      osc2.connect(og2); og2.connect(audioGain);
      osc2.start();
      audioNodes.push(osc2);

      // Faint airy hiss.
      const airSrc = audioCtx.createBufferSource();
      const airBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 3, audioCtx.sampleRate);
      const ad = airBuf.getChannelData(0);
      for (let i = 0; i < ad.length; i++) ad[i] = (Math.random() * 2 - 1) * 0.3;
      airSrc.buffer = airBuf; airSrc.loop = true;
      const hp = audioCtx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2400;
      const ag = audioCtx.createGain(); ag.gain.value = 0.017;
      airSrc.connect(hp); hp.connect(ag); ag.connect(audioGain);
      airSrc.start();
      audioNodes.push(airSrc);
      audioStarted = true;
    } catch (err) {
      console.warn('audio unavailable', err);
    }
  }

  function toggleSound() {
    if (!audioStarted) initAudio();
    if (!audioCtx) { showToast('当前环境不支持音频'); return; }
    soundOn = !soundOn;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    audioGain.gain.cancelScheduledValues(audioCtx.currentTime);
    audioGain.gain.linearRampToValueAtTime(soundOn ? 0.5 : 0.0, audioCtx.currentTime + 0.9);
    $('btn-sound').classList.toggle('on', soundOn);
    showToast(soundOn ? '环境音效已开启' : '环境音效已关闭');
  }

  /* ------------------------------------------------------------------ */
  /* Landmark labels                                                    */
  /* ------------------------------------------------------------------ */
  let labelElements = [];
  const projected = new THREE.Vector3();
  function buildLandmarkLabels() {
    DOM.labels.innerHTML = '';
    labelElements = [];
    for (const l of dynamic.landmarkPositions) {
      const el = document.createElement('div');
      el.className = 'landmark-tag';
      el.innerHTML =
        '<div class="tagline"><span class="id">' + l.id + '</span><span class="nm">' + l.name + '</span><span class="alt">' +
        (l.alt >= 0 ? '+' : '') + Math.round(l.alt) + 'M</span></div><div class="stem"></div>';
      DOM.labels.appendChild(el);
      labelElements.push({ el, l, visible: false });
    }
  }

  function updateLabels() {
    if (document.body.classList.contains('hide-labels')) {
      for (const t of labelElements) { t.el.classList.remove('visible'); }
      return;
    }
    const W = window.innerWidth, H = window.innerHeight;
    for (const t of labelElements) {
      const l = t.l;
      const dx = l.x - camera.position.x, dy = l.y - camera.position.y, dz = l.z - camera.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > 2300 || dist < 24) { t.el.classList.remove('visible'); t.visible = false; continue; }
      projected.set(l.x, l.y, l.z);
      const behind = camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1));
      projected.project(camera);
      if (projected.z > 1 || projected.x < -1.2 || projected.x > 1.2 || projected.y < -1.2 || projected.y > 1.2) {
        t.el.classList.remove('visible'); t.visible = false; continue;
      }
      const sx = (projected.x * 0.5 + 0.5) * W;
      const sy = (-projected.y * 0.5 + 0.5) * H;
      const edge = Math.min(sx, W - sx, sy, H - sy);
      const op = clamp(edge / 110, 0, 1) * clamp((2300 - dist) / 600, 0.15, 1);
      t.el.style.left = sx.toFixed(1) + 'px';
      t.el.style.top = sy.toFixed(1) + 'px';
      t.el.style.opacity = op.toFixed(2);
      t.el.classList.add('visible');
      t.visible = true;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Animated world objects                                             */
  /* ------------------------------------------------------------------ */
  const _elevTmp = new THREE.Vector3();
  function updateDynamics(dt, time) {
    // Elevators
    for (const e of dynamic.elevators) {
      const span = Math.max(1, e.topY - e.baseY);
      const cycle = (time * e.speed + e.phase * span) % (span * 2);
      const y = e.baseY + (cycle < span ? cycle : span * 2 - cycle);
      e.mesh.position.y = y;
    }
    // Water fall textures
    for (const w of dynamic.water) {
      if (w.tex) {
        w.tex.offset.y -= dt * w.speed;
        w.tex.offset.x += dt * w.speed * 0.11;
      } else if (w.mat && w.mat.emissive) {
        w.mat.emissiveIntensity = 0.6 + Math.sin(time * 1.4) * 0.16;
      }
    }
    updateBeacons(time);
    // Signs flicker
    for (const s of dynamic.signs) {
      if (!s.flicker) continue;
      const n = Math.sin(time * s.speed + s.phase) * Math.sin(time * s.speed * 2.7 + s.phase * 1.7);
      const on = n > -0.82 ? 1 : 0.15;
      s.mat.opacity = lerp(s.mat.opacity, on, 0.25);
    }
    // Cloud plane drift
    for (const c of dynamic.clouds) {
      c.mesh.position.x = Math.sin(time * 0.002 * c.speed + c.phase) * 240;
      c.mesh.position.z = Math.cos(time * 0.0016 * c.speed + c.phase) * 200;
      c.mesh.rotation.z += dt * 0.0009 * c.speed;
    }
    // Flares, fans, drones
    for (const a of dynamic.animations) {
      if (a.type === 'flare') {
        a.mesh.scale.set(1 + Math.sin(time * 9 + a.phase) * 0.18, 1 + Math.sin(time * 7.3 + a.phase) * 0.22, 1 + Math.cos(time * 8 + a.phase) * 0.18);
        a.mesh.position.y = a.baseY + Math.sin(time * 3.1 + a.phase) * 1.6;
      } else if (a.type === 'shaftVeil') {
        a.mat.uniforms.uTime.value = time;
        a.mat.uniforms.uPower.value = 0.82 + Math.sin(time * 0.32 + a.mesh.position.x * 0.01) * 0.18;
      } else if (a.type === 'pitMist') {
        a.mesh.position.y = a.baseY + Math.sin(time * 0.06 + a.phase) * 8;
        a.mesh.material.opacity = 0.08 + (Math.sin(time * 0.22 + a.phase) * 0.5 + 0.5) * 0.07;
      } else if (a.type === 'pitHaze') {
        a.mesh.position.y = a.baseY + Math.sin(time * 0.09 + a.phase) * 12;
        a.mesh.rotation.z = Math.sin(time * 0.02 + a.phase) * 0.15;
      } else if (a.type === 'spinFan') {
        a.mesh.rotation.z += dt * a.speed;
        a.mesh.material.opacity = 0.32 + Math.sin(time * 2 + a.speed) * 0.07;
      } else if (a.type === 'drones') {
        const g = a.mesh.geometry.attributes.position;
        for (let i = 0; i < g.count; i++) {
          const bx = a.base[i * 3], by = a.base[i * 3 + 1], bz = a.base[i * 3 + 2];
          g.setXYZ(i, bx + Math.sin(time * 0.13 + i) * 30, by + Math.sin(time * 0.21 + i * 1.7) * 14, bz + Math.cos(time * 0.11 + i) * 30);
        }
        g.needsUpdate = true;
      }
    }
    updateCargoCars(dt);
    updateTraffic(dt, time);

    // Haze / smoke shader time
    if (smokeSystem) smokeSystem.material.uniforms.uTime.value = time;
    if (emberSystem) emberSystem.material.uniforms.uTime.value = time;
    if (skyMaterial) skyMaterial.uniforms.uTime.value = time;
    // Rain
    if (rainMesh) {
      rainMesh.material.opacity = 0.13 + Math.sin(time * 0.2) * 0.03;
    }
    // Dynamic fog: aerial perspective tuned per altitude band. FogExp2 uses
    // exp(-(d*density)^2), so these values give ~50% haze at 1.2 km up top and
    // near-total occlusion of the far crust from street level.
    const camY = camera.position.y;
    let fogDensity, fogColor;
    if (camY < -40) {
      const t = clamp((-camY) / 980, 0, 1);
      fogDensity = lerp(0.00130, 0.00098, t);
      fogColor = new THREE.Color(0x40301f).lerp(new THREE.Color(0x2e3230), t * 0.6);
    } else if (camY < 260) {
      const t = clamp(camY / 260, 0, 1);
      fogDensity = lerp(0.00100, 0.00072, t);
      fogColor = new THREE.Color(0x3d2e1f);
    } else if (camY < 1100) {
      const t = clamp((camY - 260) / 840, 0, 1);
      fogDensity = lerp(0.00072, 0.00046, t);
      fogColor = new THREE.Color(0x302c25);
    } else {
      const t = clamp((camY - 1100) / 1600, 0, 1);
      fogDensity = lerp(0.00046, 0.00024, t);
      fogColor = new THREE.Color(0x332f28).lerp(new THREE.Color(0x3a403f), t * 0.6);
    }
    scene.fog.density = fogDensity;
    // Keep the fog linear: the colour is authored in sRGB but the fog shader
    // mixes it directly into linear scene radiance.
    scene.fog.color.lerp(fogColor.clone().convertSRGBToLinear(), 0.045);
    if (smokeSystem) {
      smokeSystem.material.uniforms.uFogDensity.value = fogDensity;
      smokeSystem.material.uniforms.uFogColor.value.copy(scene.fog.color);
    }
  }

  /* ------------------------------------------------------------------ */
  /* HUD readouts                                                       */
  /* ------------------------------------------------------------------ */
  const gaugeTrack = $('gauge-track');
  const gaugeNeedle = $('gauge-needle');
  const gaugeReadout = $('gauge-readout');
  const ALT_MIN = -1000, ALT_MAX = 2000;
  function altToPct(alt) {
    return clamp((1 - (alt - ALT_MIN) / (ALT_MAX - ALT_MIN)) * 100, 0, 100);
  }

  let hudTick = 0;
  function updateHUD(dt) {
    const alt = camera.position.y;
    const pct = altToPct(alt);
    gaugeNeedle.style.top = pct.toFixed(2) + '%';
    const label = (alt >= 0 ? '+' : '') + Math.round(alt) + ' M';
    gaugeReadout.textContent = label;
    $('hud-alt').textContent = fmtAlt(alt) + ' M';
    $('hud-x').textContent = fmtInt(camera.position.x);
    $('hud-z').textContent = fmtInt(camera.position.z);
    const speed = player.vel.length();
    $('hud-spd').textContent = String(Math.round(speed)).padStart(3, '0');

    // Layer highlight
    const layer = alt < 0 ? 'under' : (alt < 200 ? 'surface' : 'sky');
    document.querySelectorAll('.layer').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-layer') === layer);
    });
    // District text follows altitude and location.
    hudTick += dt;
    if (hudTick > 0.25) {
      hudTick = 0;
      let html, name;
      if (alt < -700) { name = '机舱'; html = '机舱<em>底层</em>'; }
      else if (alt < -300) { name = '棚户'; html = '棚户<em>层</em>'; }
      else if (alt < -40) { name = '管廊'; html = '管廊<em>层</em>'; }
      else if (alt < 200) {
        const inMarket = Math.abs(camera.position.x - LOW.marketCx) < LOW.marketW * 0.6 && Math.abs(camera.position.z - LOW.marketCz) < LOW.marketD * 0.6;
        name = inMarket ? '九层集市' : (camera.position.x < -200 ? '工厂带' : '低空住区');
        html = inMarket ? '九层<em>集市</em>' : (camera.position.x < -200 ? '低空<em>工厂带</em>' : '低空<em>住区</em>');
      }
      else if (alt < 620) {
        const rr = Math.hypot(camera.position.x, camera.position.z + 90);
        if (rr > 380 && rr < 850 && alt > 430) { name = '云际立交'; html = '云际<em>立交</em>'; }
        else { name = '低空上缘'; html = '低空<em>上缘</em>'; }
      }
      else if (alt < 1100) { name = '栖木悬园'; html = '栖木<em>悬园</em>'; }
      else { name = '天穹塔群'; html = '天穹<em>塔群</em>'; }
      const d = $('hud-district');
      if (d.dataset.cur !== name) { d.dataset.cur = name; d.innerHTML = html; }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Resize / render loop                                               */
  /* ------------------------------------------------------------------ */
  function onResize() {
    if (!renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    updatePointScale();
    if (typeof resizePost === 'function' && ps) {
      const dbSize = renderer.getDrawingBufferSize(new THREE.Vector2());
      resizePost(dbSize.x, dbSize.y);
    }
  }

  let frame = 0, elapsed = 0, fpsTimer = 0, frames = 0, lastFps = 0;
  let loopStarted = false, hiddenTimer = null, rafHandle = null;
  let lastTickTime = 0;

  function tick() {
    tickCount++;
    const now = performance.now();
    const dt = lastTickTime ? Math.min(0.06, (now - lastTickTime) / 1000) : 0.016;
    lastTickTime = now;
    elapsed += dt;
    updatePlayer(dt);
    updateTransition(dt);
    updateDynamics(dt, elapsed);
    updateLabels();
    updateHUD(dt);
    renderFrame(dt);
    frame++;
    fpsTimer += dt; frames++;
    if (fpsTimer > 2) { lastFps = Math.round(frames / fpsTimer); fpsTimer = 0; frames = 0; }
    // Warm up the intro camera with a very slow position drift; orientation
    // stays on the authored establishing shot.
    if (DOM.intro.classList.contains('show') && !DOM.intro.classList.contains('hide') && !transition) {
      const t = elapsed * 0.04;
      camera.position.x += Math.sin(t) * 0.9;
      camera.position.z += Math.cos(t * 0.8) * 0.6;
      camera.position.y += Math.sin(t * 1.4) * 0.25;
    }
  }

  let paused = false;
  let tickCount = 0;
  function rafLoop() {
    rafHandle = requestAnimationFrame(rafLoop);
    if (!document.hidden && !paused) tick();
  }

  function startLoop() {
    if (loopStarted) return;
    loopStarted = true;
    lastTickTime = performance.now();
    rafLoop();
    // Watchdog: rAF is suspended not only for hidden tabs but also for
    // occluded/backgrounded windows. If no frame has been produced for 120 ms,
    // a timer takes over so simulation, input and the render stay alive.
    if (!hiddenTimer) {
      hiddenTimer = setInterval(() => {
        if (paused) return;
        if (performance.now() - lastTickTime > 120) tick();
      }, 40);
    }
    document.addEventListener('visibilitychange', () => {
      lastTickTime = performance.now();
    });
  }

  function animate() { startLoop(); }

  /* ------------------------------------------------------------------ */
  /* Boot                                                               */
  /* ------------------------------------------------------------------ */
  function reportError(err) {
    console.error(err);
    const el = $('error');
    el.style.display = 'block';
    el.textContent = 'CITY BUILD FAILED\n\n' + (err && err.stack ? err.stack : err);
  }

  async function buildCity() {
    progress(0.02, '初始化渲染核心', 'RENDER CORE ONLINE');
    initRenderer();
    buildMaterials();
    progress(0.06, '解析行星城市坐标', 'PARSING PLANETARY GRID');
    await yieldFrame();

    progress(0.10, '塑造行星地壳', 'CASTING PLANETARY CRUST');
    progress(0.11, '浇筑地壳甲板', 'POURING CRUST DECK');
    await yieldFrame();
    buildGroundDeck();
    progress(0.14, '铺设交通骨架', 'WEAVING TRANSIT GRID');
    await yieldFrame();
    buildRoadGrid();
    progress(0.18, '交通骨架就绪', 'TRANSIT GRID LOCKED');
    await yieldFrame();

    progress(0.22, '生成地下机舱层', 'EXCAVATING SUBSTRATA');
    buildSubstrata();
    progress(0.36, '生成低空聚落', 'RAISING LOWLINE');
    await yieldFrame();
    buildLowCity();
    progress(0.50, '构筑天穹塔群', 'FORGING SKYLINE');
    await yieldFrame();
    buildTowers();
    progress(0.66, '架设立交与生态层', 'LINKING SKYWAYS');
    await yieldFrame();
    addSkywayDistrict();
    addEcoDistrict();
    addOrbitalLayer();
    buildDistantCrust();
    progress(0.78, '点亮城市脉络', 'IGNITING CIRCULATION');
    await yieldFrame();
    buildLights();
    buildSky();
    await yieldFrame();
    buildBeaconSystem();
    buildLandmarkLabels();
    progress(0.86, '合并体素与空间分块', 'MERGING VOXEL CHUNKS');
    await yieldFrame();
    const meshCount = finalizeStaticGeometry();
    progress(0.90, '烘焙环境反射', 'BAKING ENVIRONMENT PROBES');
    await yieldFrame();
    enableStaticShadows();
    buildEnvironmentMap();
    await yieldFrame();
    progress(0.93, '释放大气粒子', 'ATMOSPHERE INJECTION');
    buildParticles();
    progress(0.95, '编译电影级后处理', 'COMPILING CINEMATIC PASSES');
    await yieldFrame();
    initPost();
    await yieldFrame();
    setupControls();
    setupUI();
    progress(0.98, '启动第一人称协议', 'WALKER PROTOCOL READY');
    await yieldFrame();
    animate();
    progress(1, '城市已就绪', 'OEKUMENE-09 ONLINE / ' + meshCount + ' CHUNKS');
    setTimeout(() => {
      const bootEl = $('boot');
      bootEl.classList.add('done');
      // Do not rely on a CSS transition: hidden tabs suspend transitions.
      bootEl.style.transition = 'none';
      bootEl.style.opacity = '0';
      bootEl.style.visibility = 'hidden';
      bootEl.style.pointerEvents = 'none';
      DOM.intro.classList.remove('hide');
      DOM.intro.classList.add('show');
      // Reveal immediately rather than depending on a compositor-driven fade.
      DOM.intro.style.transition = 'none';
      DOM.intro.style.visibility = 'visible';
      DOM.intro.style.opacity = '1';
      document.body.classList.add('running');
    }, 420);
  }

  window.__VC_DEBUG = {
    get scene() { return scene; },
    get camera() { return camera; },
    get renderer() { return renderer; },
    get player() { return player; },
    get stats() { return { fps: lastFps, chunks: chunkMap.size, glows: glowItems.length, cars: carSystem ? carSystem.cars.length : 0, transition: !!transition, loop: loopStarted, hidden: document.hidden, post: psQuality, paused, ticks: tickCount }; },
    setPostQuality(q) { if (PS_QUALITIES.indexOf(q) >= 0) { psQuality = q; applyPostQuality(); } return psQuality; },
    bench(frames) {
      const n = Math.max(1, frames | 0);
      renderer.setRenderTarget(null);
      // warm-up
      renderFrame(0.016);
      const t0 = performance.now();
      for (let i = 0; i < n; i++) renderFrame(0.016);
      const t1 = performance.now();
      return { msPerFrame: (t1 - t0) / n, frames: n, post: psQuality, quality: psQuality };
    },
    get postInfo() { return ps ? { w: ps.w, h: ps.h, levels: ps.levels.length, levelSizes: ps.levels.map(l => [l.w, l.h]) } : null; },
    get ps() { return ps; },
    setExposure(v) { if (ps) ps.compMesh.material.uniforms.uExposure.value = v; return v; },
    setFog(d) { if (scene && scene.fog) scene.fog.density = d; return d; },
    pause() { paused = true; return true; },
    capture(name) {
      paused = true;
      renderFrame(0.016);
      setTimeout(() => { paused = false; lastTickTime = performance.now(); }, 60);
      const url = renderer.domElement.toDataURL('image/png');
      return fetch('/shot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || 'shot', data: url })
      }).then(r => r.json());
    },
    resume() { paused = false; lastTickTime = performance.now(); return true; },
    stepOnce() { tick(); return true; },
    advance(seconds, dt) {
      // Deterministic fixed-step simulation, independent of rAF throttling.
      const step = dt || 1 / 60;
      const n = Math.max(1, Math.round((seconds || 1) / step));
      for (let i = 0; i < n; i++) {
        updatePlayer(step);
        updateDynamics(step, elapsed + i * step);
      }
      elapsed += n * step;
      return { steps: n, pos: camera.position.toArray().map(v => +v.toFixed(2)) };
    },
    renderStep(name) {
      if (!ps) return 'no-post';
      const gl = renderer.getContext();
      while (gl.getError() !== 0) {}
      if (name === 'scene') {
        renderer.setRenderTarget(ps.rtScene);
        renderer.clear(true, true, true);
        renderer.render(scene, camera);
      } else if (name === 'ao') {
        const u = ps.aoMesh.material.uniforms;
        u.uProj.value.copy(camera.projectionMatrix);
        u.uProjInv.value.copy(camera.projectionMatrixInverse);
        psBlit(ps.aoMesh, ps.rtAO);
      } else if (name === 'bright') {
        psBlit(ps.brightMesh, ps.levels[0].a);
      } else if (name === 'blur') {
        const lv = ps.levels[0];
        const um = ps.blurMesh.material.uniforms;
        um.tColor.value = lv.a.texture;
        um.uDir.value.set(1.0 / lv.w, 0.0);
        psBlit(ps.blurMesh, lv.b);
      } else if (name === 'comp') {
        psBlit(ps.compMesh, ps.rtLDR);
      } else if (name === 'fxaa') {
        ps.fxaaMesh.material.uniforms.tColor.value = ps.rtLDR.texture;
        ps.quad.material = ps.fxaaMesh.material;
        renderer.setRenderTarget(null);
        renderer.render(ps.quadScene, ps.quadCamera);
      }
      const err = gl.getError();
      return err;
    },
    goTo, setView(x, y, z, tx, ty, tz) {
      player.pos.set(x, y, z);
      camera.position.set(x, y, z);
      const dir = new THREE.Vector3(tx - x, ty - y, tz - z).normalize();
      cameraYaw = Math.atan2(-dir.x, -dir.z);
      cameraPitch = Math.asin(clamp(dir.y, -1, 1));
      camera.rotation.set(cameraPitch, cameraYaw, 0);
      player.vel.set(0, 0, 0);
    },
    setFog(d) { if (scene && scene.fog) scene.fog.density = d; },
    hideBoot() {
      $('boot').classList.add('done');
      DOM.intro.classList.remove('show'); DOM.intro.classList.remove('hide');
      DOM.intro.style.transition = 'none'; DOM.intro.style.opacity = '0'; DOM.intro.style.visibility = 'hidden';
      document.body.classList.add('running');
    },
  };

  clock = new THREE.Clock();
  clock.start();
  buildCity().catch(reportError);
})();
