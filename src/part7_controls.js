  /* ------------------------------------------------------------------ */
  /* Atmosphere particles                                               */
  /* ------------------------------------------------------------------ */
  function buildParticles() {
    // Steam / smoke sprite pool.
    const N = 900;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
    grd.addColorStop(0, 'rgba(255,255,255,.34)');
    grd.addColorStop(0.38, 'rgba(220,220,214,.18)');
    grd.addColorStop(1, 'rgba(180,180,174,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const size = new Float32Array(N);
    const seeds = new Float32Array(N * 4);
    const emitters = dynamic.smokeEmitters;
    for (let i = 0; i < N; i++) {
      const e = emitters.length ? emitters[i % emitters.length] : { x: 0, y: 0, z: 0, scale: 1, color: 0x555555 };
      const ox = (worldRng() - 0.5) * 14 * e.scale;
      const oz = (worldRng() - 0.5) * 14 * e.scale;
      pos[i * 3] = e.x + ox;
      pos[i * 3 + 1] = e.y + worldRng() * 180;
      pos[i * 3 + 2] = e.z + oz;
      const cc = new THREE.Color(e.color);
      col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
      size[i] = 12 * e.scale * (0.5 + worldRng());
      seeds[i * 4] = e.x; seeds[i * 4 + 1] = e.y; seeds[i * 4 + 2] = e.z; seeds[i * 4 + 3] = worldRng() * 200;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: window.innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360)) },
        uMap: { value: tex },
        uFogColor: { value: new THREE.Color(0x0a1214) },
        uFogDensity: { value: 0.00037 }
      },
      vertexShader: `
        attribute float aSize;
        attribute vec4 aSeed;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uScale;
        uniform float uFogDensity;
        void main(){
          vColor = color;
          float rise = mod(uTime * (2.2 + aSeed.w*0.014) + aSeed.w, 230.0);
          vec3 p = position;
          p.x += sin(uTime*0.22 + aSeed.w) * rise * 0.24;
          p.z += cos(uTime*0.18 + aSeed.w*1.7) * rise * 0.2;
          p.y += rise;
          p.x += rise*0.11;
          vec4 mv = modelViewMatrix * vec4(p,1.0);
          float d = -mv.z;
          gl_PointSize = min(180.0, aSize * (0.7 + rise*0.018) * uScale / max(1.0,d));
          vAlpha = smoothstep(230.0, 40.0, rise) * smoothstep(0.0, 8.0, rise) * 0.34;
          float fog = 1.0 - exp(-uFogDensity*uFogDensity*d*d);
          vAlpha *= (1.0 - fog*0.75);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vAlpha;
        void main(){
          vec4 t = texture2D(uMap, gl_PointCoord);
          float a = t.a * vAlpha;
          if(a < 0.004) discard;
          gl_FragColor = vec4(vColor, a);
        }
      `,
      vertexColors: true,
    });
    smokeSystem = new THREE.Points(geo, mat);
    smokeSystem.frustumCulled = false;
    smokeSystem.renderOrder = 8;
    scene.add(smokeSystem);

    // Embers / drifting ash near the pit and market.
    const E = 520;
    const eg = new THREE.BufferGeometry();
    const ep = new Float32Array(E * 3);
    const ec = new Float32Array(E * 3);
    const es = new Float32Array(E);
    for (let i = 0; i < E; i++) {
      const deep = i < E * 0.55;
      ep[i * 3] = deep ? rand(-240, 240) : rand(-900, 900);
      ep[i * 3 + 1] = deep ? rand(-980, 160) : rand(2, 220);
      ep[i * 3 + 2] = deep ? (PIT.z1 + PIT.z2) / 2 + rand(-330, 330) : rand(-1000, 1000);
      const hot = worldRng();
      ec[i * 3] = 1.0; ec[i * 3 + 1] = 0.35 + hot * 0.4; ec[i * 3 + 2] = 0.08 + hot * 0.14;
      es[i] = 0.8 + worldRng() * 2.4;
    }
    eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
    eg.setAttribute('aColor', new THREE.BufferAttribute(ec, 3));
    eg.setAttribute('aSize', new THREE.BufferAttribute(es, 1));
    const em = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: window.innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360)) },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        varying vec3 vColor;
        varying float vA;
        uniform float uTime;
        uniform float uScale;
        void main(){
          vColor = aColor;
          vec3 p = position;
          p.y += mod(uTime * (2.4 + aSize*0.8) + position.x*0.7, 260.0);
          p.x += sin(uTime*0.5 + position.z)*4.0;
          vec4 mv = modelViewMatrix * vec4(p,1.0);
          float d = -mv.z;
          gl_PointSize = min(48.0, aSize * uScale / max(1.0,d));
          vA = smoothstep(260.0, 20.0, mod(uTime * (2.4 + aSize*0.8) + position.x*0.7, 260.0)) * 0.66;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vA;
        void main(){
          vec2 p = gl_PointCoord - 0.5;
          float d = length(p);
          float a = smoothstep(0.5,0.05,d)*vA;
          if(a<0.01) discard;
          gl_FragColor = vec4(vColor,a);
        }
      `
    });
    emberSystem = new THREE.Points(eg, em);
    emberSystem.frustumCulled = false;
    emberSystem.renderOrder = 7;
    scene.add(emberSystem);

    // Rain, visible mostly in the low city.
    const R = 2200;
    const rg = new THREE.BufferGeometry();
    const rp = new Float32Array(R * 6);
    const rc = new Float32Array(R * 6);
    for (let i = 0; i < R; i++) {
      const x = rand(-1400, 1400), z = rand(-1400, 1400), y = rand(0, 1200);
      rp[i * 6] = x; rp[i * 6 + 1] = y; rp[i * 6 + 2] = z;
      rp[i * 6 + 3] = x - 1.4; rp[i * 6 + 4] = y - 18 - rand(0, 20); rp[i * 6 + 5] = z + 0.8;
      rc[i * 6] = 0.34; rc[i * 6 + 1] = 0.42; rc[i * 6 + 2] = 0.44;
      rc[i * 6 + 3] = 0.18; rc[i * 6 + 4] = 0.24; rc[i * 6 + 5] = 0.27;
    }
    rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    rg.setAttribute('color', new THREE.BufferAttribute(rc, 3));
    const rm = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.20, depthWrite: false, blending: THREE.AdditiveBlending });
    rainMesh = new THREE.LineSegments(rg, rm);
    rainMesh.frustumCulled = false;
    scene.add(rainMesh);

    // Flying birds / drones as tiny high points.
    const D = 160;
    const dg = new THREE.BufferGeometry();
    const dp = new Float32Array(D * 3);
    for (let i = 0; i < D; i++) {
      const a = rand(0, TAU), r = rand(120, 1100);
      dp[i * 3] = Math.cos(a) * r;
      dp[i * 3 + 1] = rand(180, 1600);
      dp[i * 3 + 2] = Math.sin(a) * r;
    }
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    const dm = new THREE.PointsMaterial({ color: 0xffd0a0, size: 1.4, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    const drones = new THREE.Points(dg, dm);
    drones.frustumCulled = false;
    scene.add(drones);
    dynamic.animations.push({ mesh: drones, type: 'drones', base: dp.slice() });
  }

  function makeWindowGlowTexture() {
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Player / first-person controller                                   */
  /* ------------------------------------------------------------------ */
  const player = {
    pos: new THREE.Vector3().copy(START_POS),
    vel: new THREE.Vector3(),
    speed: 26,
    baseSpeed: 26,
    maxSpeed: 260,
    speedIndex: 0,
    keys: {},
    touch: { active: false, id: null, lastX: 0, lastY: 0 },
    dragging: false,
    accel: 72,
    vr: { x: 0, y: 0 },
    shake: 0,
    targetFov: 68,
    smoothYaw: 0,
    smoothPitch: 0,
  };
  const SPEEDS = [12, 26, 58, 110, 210];
  const SPEED_LABELS = ['WALK 12', 'CRUISE 26', 'TRANSIT 58', 'SKYLINE 110', 'ORBITAL 210'];

  let pointerLocked = false;
  let userInteracted = false;
  let lastMouseMoveLog = 0;

  function setupControls() {
    const canvas = renderer.domElement;
    window.addEventListener('keydown', (e) => {
      const k = e.code;
      player.keys[k] = true;
      if (e.key === 'Escape') {
        if (DOM.help.classList.contains('show')) closeModal('help');
        else if (DOM.transport.classList.contains('show')) closeModal('transport');
        else if (pointerLocked) document.exitPointerLock();
        return;
      }
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (k === 'KeyH') { e.preventDefault(); toggleHelp(); }
      else if (k === 'KeyT') { e.preventDefault(); toggleTransport(); }
      else if (k === 'KeyL') { e.preventDefault(); toggleLabels(); }
      else if (k === 'KeyV') { e.preventDefault(); toggleHud(); }
      else if (k === 'KeyM') { e.preventDefault(); toggleSound(); }
      else if (k === 'KeyP') { e.preventDefault(); cyclePostQuality(); }
      else if (k === 'KeyF') { e.preventDefault(); toggleFullscreen(); }
      else if (k === 'KeyR') { e.preventDefault(); goTo('overlook'); }
      else if (k === 'Digit1') { e.preventDefault(); goTo('pit'); }
      else if (k === 'Digit2') { e.preventDefault(); goTo('market'); }
      else if (k === 'Digit3') { e.preventDefault(); goTo('orbit'); }
      else if (k === 'Equal' || k === 'NumpadAdd') { e.preventDefault(); cycleSpeed(1); }
      else if (k === 'Minus' || k === 'NumpadSubtract') { e.preventDefault(); cycleSpeed(-1); }
    });
    window.addEventListener('keyup', (e) => { player.keys[e.code] = false; });
    window.addEventListener('blur', () => { player.keys = {}; });

    canvas.addEventListener('click', () => {
      if (!pointerLocked && !document.body.classList.contains('ui-modal') && !DOM.intro.classList.contains('show')) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      pointerLocked = document.pointerLockElement === canvas;
      document.body.classList.toggle('locked', pointerLocked);
      if (pointerLocked) markInteracted();
    });

    document.addEventListener('mousemove', (e) => {
      if (pointerLocked) {
        cameraYaw -= e.movementX * 0.0021;
        cameraPitch -= e.movementY * 0.0021;
        cameraPitch = clamp(cameraPitch, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
      } else if (player.dragging) {
        const dx = e.clientX - lastMouseMoveLog;
        // dragging is handled by pointer events below
      }
    });

    let dragX = 0, dragY = 0, dragging = false;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      dragX = e.clientX; dragY = e.clientY; dragging = true; canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', (e) => {
      if (pointerLocked || !dragging) return;
      const dx = e.clientX - dragX, dy = e.clientY - dragY;
      dragX = e.clientX; dragY = e.clientY;
      cameraYaw -= dx * 0.0032;
      cameraPitch = clamp(cameraPitch - dy * 0.0032, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
      markInteracted();
    });
    canvas.addEventListener('pointerup', (e) => {
      dragging = false;
      canvas.style.cursor = '';
    });
    canvas.addEventListener('pointercancel', () => { dragging = false; });

    // Touch look + virtual move for tablets.
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1 && !player.touch.active) {
        player.touch.active = true;
        player.touch.id = e.touches[0].identifier;
        player.touch.lastX = e.touches[0].clientX;
        player.touch.lastY = e.touches[0].clientY;
      }
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
      if (!player.touch.active) return;
      for (const t of e.touches) {
        if (t.identifier !== player.touch.id) continue;
        const dx = t.clientX - player.touch.lastX;
        const dy = t.clientY - player.touch.lastY;
        player.touch.lastX = t.clientX;
        player.touch.lastY = t.clientY;
        cameraYaw -= dx * 0.004;
        cameraPitch = clamp(cameraPitch - dy * 0.004, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
      }
    }, { passive: true });
    canvas.addEventListener('touchend', () => { player.touch.active = false; }, { passive: true });

    window.addEventListener('wheel', (e) => {
      if (document.body.classList.contains('ui-modal')) return;
      if (DOM.intro.classList.contains('show')) return;
      e.preventDefault();
      cycleSpeed(e.deltaY > 0 ? -1 : 1);
    }, { passive: false });

    window.addEventListener('resize', onResize);
  }

  function cycleSpeed(dir) {
    player.speedIndex = clamp(player.speedIndex + dir, 0, SPEEDS.length - 1);
    player.baseSpeed = SPEEDS[player.speedIndex];
    showToast('航速 / ' + SPEED_LABELS[player.speedIndex]);
    document.body.classList.add('speed');
    setTimeout(() => document.body.classList.remove('speed'), 450);
  }

  const _forward = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _wish = new THREE.Vector3();

  function updatePlayer(dt) {
    if (DOM.intro.classList.contains('show') || document.body.classList.contains('ui-modal')) {
      // gentle idle drift for the menu vista
      const t = performance.now() * 0.001;
      camera.position.x += Math.sin(t * 0.06) * dt * 1.2;
      camera.position.y += Math.sin(t * 0.11) * dt * 0.35;
      camera.rotation.set(cameraPitch, cameraYaw, 0);
      return;
    }
    const k = player.keys;
    const fwd = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    const side = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    const up = (k.Space ? 1 : 0) - (k.KeyC ? 1 : 0);
    const boost = k.ShiftLeft || k.ShiftRight ? 3.2 : 1;

    _forward.set(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    _right.set(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
    _wish.set(0, 0, 0);
    _wish.addScaledVector(_forward, fwd);
    _wish.addScaledVector(_right, side);
    // full 3D forward when looking up/down
    if (fwd > 0) {
      _wish.y += Math.sin(cameraPitch) * fwd * 0.85;
    } else if (fwd < 0) {
      _wish.y += Math.sin(cameraPitch) * fwd * 0.85;
    }
    _wish.y += up;
    if (_wish.lengthSq() > 0) {
      _wish.normalize();
      markInteracted();
    }
    const targetSpeed = player.baseSpeed * boost;
    const desired = _wish.multiplyScalar(targetSpeed);
    player.vel.x = lerp(player.vel.x, desired.x, 1 - Math.exp(-dt * 8));
    player.vel.y = lerp(player.vel.y, desired.y, 1 - Math.exp(-dt * 8));
    player.vel.z = lerp(player.vel.z, desired.z, 1 - Math.exp(-dt * 8));
    player.pos.addScaledVector(player.vel, dt);

    // Keep the visitor within the planet-city envelope.
    const horiz = Math.hypot(player.pos.x, player.pos.z);
    if (horiz > 1650) {
      const s = 1650 / horiz;
      player.pos.x *= s; player.pos.z *= s;
      player.vel.x *= 0.3; player.vel.z *= 0.3;
    }
    player.pos.y = clamp(player.pos.y, -992, 2920);

    camera.position.copy(player.pos);
    // Head bob only near the ground, subtle.
    const speedNow = player.vel.length();
    const near = player.pos.y > -20 && player.pos.y < 220 ? 1 : 0;
    player.shake += dt * (speedNow > 4 ? 1 : 0);
    const bobY = near ? Math.sin(player.shake * 8.2) * 0.09 * clamp(speedNow / 30, 0, 1) : 0;
    const bobX = near ? Math.cos(player.shake * 4.1) * 0.05 * clamp(speedNow / 30, 0, 1) : 0;
    camera.position.y += bobY;
    camera.position.x += bobX * Math.cos(cameraYaw);
    camera.position.z += bobX * -Math.sin(cameraYaw);
    camera.rotation.set(cameraPitch, cameraYaw, Math.sin(player.shake * 2.0) * 0.0015 * near);

    // Dynamic FOV based on speed.
    const targetFov = 68 + clamp((speedNow - 20) / 180, 0, 1) * 16;
    if (Math.abs(camera.fov - targetFov) > 0.1) {
      camera.fov = lerp(camera.fov, targetFov, 1 - Math.exp(-dt * 3));
      camera.updateProjectionMatrix();
      updatePointScale();
    }
  }

  function updatePointScale() {
    if (glowsMesh) glowsMesh.material.uniforms.uScale.value = window.innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360));
    if (smokeSystem) smokeSystem.material.uniforms.uScale.value = window.innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360));
    if (emberSystem) emberSystem.material.uniforms.uScale.value = window.innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360));
  }

  function markInteracted() {
    userInteracted = true;
  }
