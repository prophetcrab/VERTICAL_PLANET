  /* ------------------------------------------------------------------ */
  /* Cinematic mode — deterministic frame timeline for the promo film     */
  /* ------------------------------------------------------------------ */
  const FILM = {
    fps: 24,
    duration: 60,
    width: 1920,
    height: 1080,
    // Explicit shot list. Every shot owns a start and end pose plus its own
    // grade, so hard cuts can never overlap or be resolved ambiguously, and
    // the camera only ever drifts slowly inside a verified framing.
    shots: [
      { dur: 6, from: { p: [1150, 1500, 700], l: [-300, 900, -600], f: 43 },
                 to: { p: [1000, 1620, 760], l: [-330, 960, -660], f: 43 },
        expo: [1.16, 1.34], fog: [0.00028, 0.00030] },
      { dur: 6, from: { p: [30, -520, 420], l: [0, -810, -140], f: 54 },
                 to: { p: [34, -548, 432], l: [0, -816, -146], f: 52 },
        expo: [1.62, 1.52], fog: [0.00100, 0.00098] },
      { dur: 6, from: { p: [120, -450, 300], l: [200, -520, -160], f: 56 },
                 to: { p: [126, -446, 306], l: [204, -517, -164], f: 55 },
        expo: [1.62, 1.56], fog: [0.00098, 0.00094] },
      { dur: 6, from: { p: [250, 8, 780], l: [420, 22, 700], f: 55 },
                 to: { p: [262, 14, 786], l: [436, 26, 694], f: 53 },
        expo: [1.34, 1.36], fog: [0.00084, 0.00086] },
      { dur: 6, from: { p: [250, 90, 760], l: [-460, 60, 330], f: 53 },
                 to: { p: [238, 98, 752], l: [-474, 68, 320], f: 52 },
        expo: [1.42, 1.40], fog: [0.00078, 0.00072] },
      { dur: 6, from: { p: [700, 460, 700], l: [-200, 500, -200], f: 50 },
                 to: { p: [684, 476, 684], l: [-214, 510, -214], f: 49 },
        expo: [1.44, 1.44], fog: [0.00054, 0.00050] },
      { dur: 6, from: { p: [700, 724, -326], l: [470, 636, -570], f: 48 },
                 to: { p: [686, 738, -338], l: [458, 628, -578], f: 47 },
        expo: [1.38, 1.36], fog: [0.00044, 0.00042] },
      { dur: 6, from: { p: [900, 1180, 900], l: [-200, 800, -400], f: 44 },
                 to: { p: [936, 1238, 872], l: [-218, 818, -416], f: 43 },
        expo: [1.36, 1.36], fog: [0.00030, 0.00030] },
      { dur: 6, from: { p: [40, -420, 430], l: [10, -700, -180], f: 52 },
                 to: { p: [44, -392, 442], l: [14, -680, -190], f: 51 },
        expo: [1.54, 1.50], fog: [0.00096, 0.00092] },
      { dur: 6, from: { p: [1120, 1480, 720], l: [-290, 880, -590], f: 43 },
                 to: { p: [1180, 1550, 700], l: [-310, 920, -610], f: 42 },
        expo: [1.34, 1.24], fog: [0.00030, 0.00028] },
    ],
    // Fade to black at the very start and end (seconds).
    fadeIn: 1.4,
    fadeOut: 1.8,
  };
  FILM.frames = Math.round(FILM.fps * FILM.duration);

  const filmState = { active: false, lastFog: -1 };

  function filmShotAt(t) {
    let acc = 0;
    for (let i = 0; i < FILM.shots.length; i++) {
      const shot = FILM.shots[i];
      if (t < acc + shot.dur || i === FILM.shots.length - 1) {
        return { shot, index: i, local: clamp((t - acc) / shot.dur, 0, 1) };
      }
      acc += shot.dur;
    }
    return { shot: FILM.shots[FILM.shots.length - 1], index: FILM.shots.length - 1, local: 1 };
  }

  function filmSetCamera(t) {
    const { shot, local, index } = filmShotAt(t);
    // Smootherstep inside a shot: slow in, slow out, never a jump.
    const u = local * local * local * (local * (local * 6 - 15) + 10);
    const a = shot.from, b = shot.to;
    const px = lerp(a.p[0], b.p[0], u);
    const py = lerp(a.p[1], b.p[1], u);
    const pz = lerp(a.p[2], b.p[2], u);
    const lx = lerp(a.l[0], b.l[0], u);
    const ly = lerp(a.l[1], b.l[1], u);
    const lz = lerp(a.l[2], b.l[2], u);
    const fov = lerp(a.f, b.f, u);

    camera.position.set(px, py, pz);
    const dir = new THREE.Vector3(lx - px, ly - py, lz - pz).normalize();
    const yaw = Math.atan2(-dir.x, -dir.z);
    const pitch = Math.asin(clamp(dir.y, -1, 1));
    camera.rotation.set(pitch, yaw, 0);

    // A few centimetres of handheld float keeps the frame from feeling locked.
    const wob = t * 0.7 + index * 11.0;
    camera.position.x += Math.sin(wob * 1.13) * 0.14 + Math.sin(wob * 2.7) * 0.04;
    camera.position.y += Math.sin(wob * 0.93 + 1.1) * 0.11;
    camera.rotation.z = Math.sin(wob * 0.61) * 0.0018;

    if (Math.abs(camera.fov - fov) > 0.001) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
      updatePointScale();
    }
  }

  function filmApplyGrade(t) {
    if (!ps) return;
    const { shot, local, index } = filmShotAt(t);
    const lerpEase = local * local * (3 - 2 * local);
    let expo = lerp(shot.expo[0], shot.expo[1], lerpEase);
    // Fade in at the head of the film and out at the tail.
    if (t < FILM.fadeIn) expo *= Math.max(0, t / FILM.fadeIn);
    if (t > FILM.duration - FILM.fadeOut) expo *= Math.max(0, (FILM.duration - t) / FILM.fadeOut);
    ps.compMesh.material.uniforms.uExposure.value = expo;

    const dens = lerp(shot.fog[0], shot.fog[1], lerpEase);
    if (Math.abs(dens - filmState.lastFog) > 1e-6) {
      scene.fog.density = dens;
      filmState.lastFog = dens;
    }
    const bloom = 0.40 + (index >= 6 ? 0.08 : 0);
    ps.compMesh.material.uniforms.uBloom.value = bloom;
    // Video compression turns strong fringing into mush: keep the lens subtle.
    ps.compMesh.material.uniforms.uCA.value = 0.12;
    ps.compMesh.material.uniforms.uGrain.value = 0.010;
  }

  function filmEnter() {
    filmState.active = true;
    paused = true;
    document.body.classList.add('hide-hud');
    const hudEl = $('hud');
    hudEl.style.transition = 'none';
    hudEl.style.opacity = '0';
    // Kill the intro/boot overlays outright.
    const introEl = DOM.intro;
    introEl.classList.remove('show');
    introEl.classList.add('hide');
    introEl.style.transition = 'none';
    introEl.style.opacity = '0';
    introEl.style.visibility = 'hidden';
    const bootEl = $('boot');
    bootEl.classList.add('done');
    bootEl.style.transition = 'none';
    bootEl.style.opacity = '0';
    bootEl.style.visibility = 'hidden';
    document.body.classList.remove('ui-modal');
    DOM.help.classList.remove('show');
    DOM.transport.classList.remove('show');
    // Freeze weather/particles into a deterministic state.
    elapsed = 0;
    renderer.setPixelRatio(1);
    renderer.setSize(FILM.width, FILM.height, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    const dbSize = renderer.getDrawingBufferSize(new THREE.Vector2());
    if (ps) resizePost(dbSize.x, dbSize.y);
    return { fps: FILM.fps, duration: FILM.duration, frames: FILM.frames };
  }

  function filmFrame(i, dt) {
    const t = clamp(i / FILM.fps, 0, FILM.duration - 1 / FILM.fps);
    const step = dt || 1 / FILM.fps;
    elapsed = t;
    filmSetCamera(t);
    filmApplyGrade(t);
    updatePlayer(step);
    // updatePlayer writes the camera from player state; restore the film camera.
    filmSetCamera(t);
    updateDynamics(step, t);
    updateTransition(step);
    filmSetCamera(t);
    filmApplyGrade(t);
    renderFrame(step);
    return t;
  }

  /* Frames are pushed to the local recorder with a synchronous XHR so a whole
     batch can run inside one JS turn regardless of rAF throttling. */
  function filmPushFrame(i) {
    filmFrame(i);
    const url = renderer.domElement.toDataURL('image/webp', 0.95);
    const payload = JSON.stringify({ name: 'f' + String(i).padStart(5, '0'), data: url });
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/shot', false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(payload);
    return xhr.status === 200;
  }

  function filmCaptureRange(start, count) {
    const out = [];
    for (let k = 0; k < count; k++) {
      const i = start + k;
      if (i >= FILM.frames) break;
      out.push(filmPushFrame(i));
    }
    return { start, rendered: out.length, ok: out.every(Boolean), next: start + out.length };
  }

  /* Self-scheduling renderer: the MCP evaluate bridge is capped at a few
     seconds, so a long capture is split into macrotasks that keep running in
     the page while the outside caller polls progress. */
  const filmJob = { running: false, next: 0, total: 0, chunk: 10, errors: 0, startedAt: 0, finishedAt: 0 };

  // Reading a WebGL canvas with toDataURL can capture a partially presented
  // frame (wide vertical tears). Forcing GL to finish and copying through a 2D
  // canvas produces a stable snapshot of exactly the frame we just drew.
  let filmSnapshot = null;

  function filmGrab(mime, quality) {
    const gl = renderer.getContext();
    gl.finish();
    const src = renderer.domElement;
    if (!filmSnapshot) filmSnapshot = document.createElement('canvas');
    if (filmSnapshot.width !== src.width || filmSnapshot.height !== src.height) {
      filmSnapshot.width = src.width;
      filmSnapshot.height = src.height;
    }
    const ctx = filmSnapshot.getContext('2d');
    ctx.clearRect(0, 0, filmSnapshot.width, filmSnapshot.height);
    ctx.drawImage(src, 0, 0);
    return filmSnapshot.toDataURL(mime || 'image/png', quality === undefined ? 0.95 : quality);
  }

  function filmRenderOne(i) {
    return new Promise((resolve) => {
      try {
        filmFrame(i);
        const url = filmGrab('image/webp', 0.95);
        fetch('/shot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'f' + String(i).padStart(5, '0'), data: url }),
        }).then((r) => resolve(r.ok)).catch(() => resolve(false));
      } catch (err) {
        console.error(err);
        resolve(false);
      }
    });
  }

  function filmJobStep() {
    if (!filmJob.running) return;
    if (filmJob.next >= filmJob.total) {
      filmJob.running = false;
      filmJob.finishedAt = Date.now();
      return;
    }
    const end = Math.min(filmJob.total, filmJob.next + filmJob.chunk);
    const jobs = [];
    for (let i = filmJob.next; i < end; i++) jobs.push(filmRenderOne(i));
    Promise.all(jobs).then((results) => {
      filmJob.errors += results.filter((ok) => !ok).length;
      filmJob.next = end;
      setTimeout(filmJobStep, 0);
    });
  }

  function filmStartJob(start, total, chunk) {
    filmJob.running = true;
    filmJob.next = start;
    filmJob.total = Math.min(total, FILM.frames);
    filmJob.chunk = chunk || 10;
    filmJob.errors = 0;
    filmJob.startedAt = Date.now();
    filmJob.finishedAt = 0;
    setTimeout(filmJobStep, 0);
    return { start, total: filmJob.total };
  }

  window.__VC_FILM = {
    info() {
      return {
        fps: FILM.fps, duration: FILM.duration, frames: FILM.frames,
        width: FILM.width, height: FILM.height, shots: FILM.shots.length,
      };
    },
    enter: filmEnter,
    frame(i) { return filmFrame(i); },
    captureRange: filmCaptureRange,
    // Render a single preview frame and hand back a data URL for spot checks.
    preview(i) {
      filmFrame(i);
      return filmGrab('image/jpeg', 0.9);
    },
    grab(mime, q) { return filmGrab(mime, q); },
    startRender(start, total, chunk) { return filmStartJob(start, total, chunk); },
    progress() {
      return {
        running: filmJob.running, next: filmJob.next, total: filmJob.total,
        errors: filmJob.errors, frames: FILM.frames,
        elapsedMs: (filmJob.finishedAt || Date.now()) - filmJob.startedAt,
      };
    },
    exit() {
      filmState.active = false;
      paused = false;
      lastTickTime = performance.now();
      document.body.classList.remove('hide-hud');
      const hudEl = $('hud');
      hudEl.style.opacity = '1';
      onResize();
    },
  };
