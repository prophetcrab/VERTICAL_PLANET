  /* ------------------------------------------------------------------ */
  /* Cinematic post-processing                                          */
  /* Hand-rolled pass chain so the page stays a single self-contained    */
  /* file: SSAO -> HDR bloom -> ACES grade -> FXAA.                     */
  /* ------------------------------------------------------------------ */
  const PS_QUALITIES = ['high', 'medium', 'off'];
  let psQuality = 'high';
  let ps = null;
  const PS_EXPOSURE = 1.46;

  const PS_VERT = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;

  function psMakeRT(w, h, opts) {
    const o = opts || {};
    return new THREE.WebGLRenderTarget(Math.max(2, Math.floor(w)), Math.max(2, Math.floor(h)), {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: o.type || THREE.UnsignedByteType,
      depthBuffer: !!o.depth,
      stencilBuffer: false,
      encoding: THREE.LinearEncoding,
    });
  }

  function psMakePass(fragment, uniforms) {
    const mat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: PS_VERT,
      fragmentShader: fragment,
      depthTest: false,
      depthWrite: false,
      extensions: { derivatives: true },
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  }

  function psBlit(mesh, target) {
    ps.quad.material = mesh.material;
    renderer.setRenderTarget(target);
    renderer.clear(true, true, true);
    renderer.render(ps.quadScene, ps.quadCamera);
  }

  function psNoiseTexture() {
    const N = 4;
    const data = new Uint8Array(N * N * 4);
    const rng = mulberry32(9182);
    for (let i = 0; i < N * N; i++) {
      // random vector on the XY plane, remapped to [0,1]
      const a = rng() * Math.PI * 2;
      data[i * 4] = Math.floor((Math.cos(a) * 0.5 + 0.5) * 255);
      data[i * 4 + 1] = Math.floor((Math.sin(a) * 0.5 + 0.5) * 255);
      data[i * 4 + 2] = Math.floor(rng() * 255);
      data[i * 4 + 3] = 255;
    }
    const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
    t.needsUpdate = true;
    t.minFilter = THREE.NearestFilter;
    t.magFilter = THREE.NearestFilter;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  const PS_BLOOM_MAT = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D tColor;
    uniform vec2 uTexel;
    void main() {
      vec3 c = vec3(0.0);
      c += texture2D(tColor, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
      c += texture2D(tColor, vUv + uTexel * vec2( 1.0, -1.0)).rgb;
      c += texture2D(tColor, vUv + uTexel * vec2(-1.0,  1.0)).rgb;
      c += texture2D(tColor, vUv + uTexel * vec2( 1.0,  1.0)).rgb;
      gl_FragColor = vec4(c * 0.25, 1.0);
    }
  `;

  const PS_SSAO_MAT = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D tDepth;
    uniform sampler2D tNoise;
    uniform vec2 uRes;
    uniform mat4 uProjInv;
    uniform mat4 uProj;
    uniform float uRadius;
    uniform float uBias;
    uniform float uIntensity;

    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    vec3 viewPosAt(vec2 uv) {
      float d = texture2D(tDepth, uv).x;
      vec4 clip = vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
      vec4 view = uProjInv * clip;
      return view.xyz / view.w;
    }

    void main() {
      float depth = texture2D(tDepth, vUv).x;
      if (depth > 0.99999) {
        gl_FragColor = vec4(1.0);
        return;
      }
      vec3 p = viewPosAt(vUv);
      if (-p.z > 900.0) {
        gl_FragColor = vec4(1.0);
        return;
      }
      vec2 tx = 1.0 / uRes;
      vec3 px = viewPosAt(vUv + vec2(tx.x, 0.0));
      vec3 py = viewPosAt(vUv + vec2(0.0, tx.y));
      vec3 n = normalize(cross(px - p, py - p));
      if (dot(n, normalize(-p)) < 0.0) n = -n;

      vec3 rvec = normalize(vec3(texture2D(tNoise, vUv * uRes / 4.0).xy * 2.0 - 1.0, 0.0) + vec3(0.0001));
      vec3 tangent = normalize(rvec - n * dot(rvec, n));
      vec3 bitangent = cross(n, tangent);
      mat3 tbn = mat3(tangent, bitangent, n);

      float occ = 0.0;
      const int SAMPLES = 12;
      for (int i = 0; i < SAMPLES; i++) {
        float fi = float(i);
        float a = fi * 2.399963 + rand(vUv * 37.0) * 6.283185;
        float r = sqrt((fi + 1.0) / float(SAMPLES));
        vec3 k = vec3(cos(a) * r, sin(a) * r, sqrt(max(0.0, 1.0 - r * r)));
        vec3 dir = normalize(tbn * k);
        vec3 sp = p + dir * uRadius * (0.55 + 0.45 * rand(vUv + fi * 0.017));
        vec4 off = uProj * vec4(sp, 1.0);
        vec2 suv = off.xy / off.w * 0.5 + 0.5;
        if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) continue;
        vec3 spv = viewPosAt(suv);
        float rangeCheck = smoothstep(0.0, 1.0, uRadius * 1.6 / max(0.001, abs(p.z - spv.z)));
        occ += (spv.z > sp.z + uBias ? 1.0 : 0.0) * rangeCheck;
      }
      float ao = 1.0 - (occ / float(SAMPLES)) * uIntensity;
      float distFade = smoothstep(760.0, 120.0, -p.z);
      ao = mix(1.0, clamp(ao, 0.0, 1.0), distFade);
      gl_FragColor = vec4(vec3(ao), 1.0);
    }
  `;

  const PS_BRIGHT_MAT = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D tColor;
    uniform vec2 uTexel;
    uniform float uThreshold;
    uniform float uKnee;
    void main() {
      vec3 c = texture2D(tColor, vUv).rgb * 0.4;
      c += texture2D(tColor, vUv + uTexel * vec2(-0.75, -0.75)).rgb * 0.15;
      c += texture2D(tColor, vUv + uTexel * vec2( 0.75, -0.75)).rgb * 0.15;
      c += texture2D(tColor, vUv + uTexel * vec2(-0.75,  0.75)).rgb * 0.15;
      c += texture2D(tColor, vUv + uTexel * vec2( 0.75,  0.75)).rgb * 0.15;
      float br = max(c.r, max(c.g, c.b));
      float knee = max(0.0001, uThreshold * uKnee);
      float soft = clamp(br - uThreshold + knee, 0.0, 2.0 * knee);
      soft = soft * soft / (4.0 * knee);
      float contrib = max(soft, br - uThreshold) / max(br, 0.0001);
      gl_FragColor = vec4(c * contrib, 1.0);
    }
  `;

  const PS_BLUR_MAT = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D tColor;
    uniform vec2 uDir;
    void main() {
      vec3 c = texture2D(tColor, vUv).rgb * 0.227027;
      c += texture2D(tColor, vUv + uDir * 1.384615).rgb * 0.316216;
      c += texture2D(tColor, vUv - uDir * 1.384615).rgb * 0.316216;
      c += texture2D(tColor, vUv + uDir * 3.230769).rgb * 0.070270;
      c += texture2D(tColor, vUv - uDir * 3.230769).rgb * 0.070270;
      gl_FragColor = vec4(c, 1.0);
    }
  `;

  const PS_COMPOSITE_MAT = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D tScene;
    uniform sampler2D tBlur0;
    uniform sampler2D tBlur1;
    uniform sampler2D tBlur2;
    uniform sampler2D tAO;
    uniform vec2 uRes;
    uniform float uTime;
    uniform float uExposure;
    uniform float uBloom;
    uniform float uAOStrength;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uCA;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uAOEnabled;

    vec3 aces(vec3 x) {
      const float a = 2.51; const float b = 0.03;
      const float c = 2.43; const float d = 0.59; const float e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec2 dc = uv - 0.5;
      float rad2 = dot(dc, dc);

      // Lens: subtle lateral chromatic aberration toward the frame edges.
      float edge = smoothstep(0.10, 0.30, rad2);
      vec2 caDir = dc * edge * uCA * 0.010;
      vec3 col;
      col.r = texture2D(tScene, uv - caDir).r;
      col.g = texture2D(tScene, uv).g;
      col.b = texture2D(tScene, uv + caDir).b;

      // Contact darkening from the depth-derived AO buffer.
      vec2 aoTexel = 2.0 / uRes;
      float ao = texture2D(tAO, uv).r * 0.48;
      ao += texture2D(tAO, uv + vec2(aoTexel.x, 0.0)).r * 0.13;
      ao += texture2D(tAO, uv - vec2(aoTexel.x, 0.0)).r * 0.13;
      ao += texture2D(tAO, uv + vec2(0.0, aoTexel.y)).r * 0.13;
      ao += texture2D(tAO, uv - vec2(0.0, aoTexel.y)).r * 0.13;
      ao = mix(1.0, ao, uAOStrength * uAOEnabled);
      col *= ao;

      // HDR bloom, three scales.
      vec3 bloom = texture2D(tBlur0, uv).rgb * 0.55;
      bloom += texture2D(tBlur1, uv).rgb * 0.40;
      bloom += texture2D(tBlur2, uv).rgb * 0.28;
      col += bloom * uBloom;

      // Exposure + filmic response.
      col *= uExposure;
      col = aces(col);

      // Cinematic grade: teal shadows, warm highlights, filmic contrast.
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, uSaturation);
      vec3 shadowTint = vec3(0.93, 1.00, 1.045);
      vec3 highTint = vec3(1.045, 1.005, 0.945);
      col *= mix(shadowTint, highTint, smoothstep(0.18, 0.78, luma));
      col = (col - 0.5) * uContrast + 0.5;
      // Filmic toe lift: keeps the deepest shadows readable instead of crushed.
      col = mix(col, col * 0.9 + vec3(0.008, 0.009, 0.011), 0.35);

      // Optical vignette.
      float vig = smoothstep(1.02, 0.28, length(dc) * 1.38);
      col *= mix(1.0 - uVignette, 1.0, vig);

      // Luminance-weighted grain: visible on lit surfaces, invisible in blacks,
      // so the image never turns dirty in shadow.
      float grain = hash(uv * uRes + vec2(uTime * 61.7, uTime * 39.3)) - 0.5;
      float grainLum = smoothstep(0.04, 0.45, dot(col, vec3(0.2126, 0.7152, 0.0722)));
      col += grain * uGrain * (0.25 + 0.75 * grainLum);

      // Display encode.
      col = max(col, vec3(0.0));
      col = pow(col, vec3(1.0 / 2.2));
      col = col * 0.992 + 0.006;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const PS_FXAA_MAT = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D tColor;
    uniform vec2 uTexel;
    float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
    void main() {
      vec3 rgbM = texture2D(tColor, vUv).rgb;
      float lumaM = luma(rgbM);
      float lumaNW = luma(texture2D(tColor, vUv + vec2(-1.0, -1.0) * uTexel).rgb);
      float lumaNE = luma(texture2D(tColor, vUv + vec2( 1.0, -1.0) * uTexel).rgb);
      float lumaSW = luma(texture2D(tColor, vUv + vec2(-1.0,  1.0) * uTexel).rgb);
      float lumaSE = luma(texture2D(tColor, vUv + vec2( 1.0,  1.0) * uTexel).rgb);
      float lumaN  = luma(texture2D(tColor, vUv + vec2( 0.0, -1.0) * uTexel).rgb);
      float lumaS  = luma(texture2D(tColor, vUv + vec2( 0.0,  1.0) * uTexel).rgb);
      float lumaE  = luma(texture2D(tColor, vUv + vec2( 1.0,  0.0) * uTexel).rgb);
      float lumaW  = luma(texture2D(tColor, vUv + vec2(-1.0,  0.0) * uTexel).rgb);

      float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(min(lumaSW, lumaSE), min(lumaN, min(lumaS, min(lumaE, lumaW))))));
      float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(max(lumaSW, lumaSE), max(lumaN, max(lumaS, max(lumaE, lumaW))))));
      float range = lumaMax - lumaMin;
      if (range < max(0.0312, lumaMax * 0.125)) {
        gl_FragColor = vec4(rgbM, 1.0);
        return;
      }
      vec2 dir = vec2(-((lumaNW + lumaNE) - (lumaSW + lumaSE)), ((lumaNW + lumaSW) - (lumaNE + lumaSE)));
      float reduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * 0.03125, 0.0078125);
      float rcpMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
      dir = clamp(dir * rcpMin, -8.0, 8.0) * uTexel;

      vec3 rgbA = 0.5 * (
        texture2D(tColor, vUv + dir * (1.0 / 3.0 - 0.5)).rgb +
        texture2D(tColor, vUv + dir * (2.0 / 3.0 - 0.5)).rgb
      );
      vec3 rgbB = rgbA * 0.5 + 0.25 * (
        texture2D(tColor, vUv - dir * 0.5).rgb +
        texture2D(tColor, vUv + dir * 0.5).rgb
      );
      float lumaB = luma(rgbB);
      gl_FragColor = vec4((lumaB < lumaMin || lumaB > lumaMax) ? rgbA : rgbB, 1.0);
    }
  `;

  function initPost() {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const w = Math.max(2, Math.floor(size.x));
    const h = Math.max(2, Math.floor(size.y));

    const quadScene = new THREE.Scene();
    const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    quad.frustumCulled = false;
    quadScene.add(quad);

    const noise = psNoiseTexture();

    ps = {
      w, h, quad, quadScene, quadCamera,
      rtScene: null,
      rtAO: null,
      rtLDR: null,
      brightMesh: null,
      blurMesh: null,
      aoMesh: null,
      compMesh: null,
      fxaaMesh: null,
      levels: [],
      lastTime: 0,
    };

    ps.rtScene = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: true,
      stencilBuffer: false,
      encoding: THREE.LinearEncoding,
      samples: renderer.capabilities.isWebGL2 ? 4 : 0,
    });
    ps.rtScene.depthTexture = new THREE.DepthTexture(w, h);
    ps.rtScene.depthTexture.format = THREE.DepthFormat;
    ps.rtScene.depthTexture.type = THREE.UnsignedIntType;

    ps.aoMesh = psMakePass(PS_SSAO_MAT, {
      tDepth: { value: ps.rtScene.depthTexture },
      tNoise: { value: noise },
      uRes: { value: new THREE.Vector2(w * 0.5, h * 0.5) },
      uProjInv: { value: new THREE.Matrix4() },
      uProj: { value: new THREE.Matrix4() },
      uRadius: { value: 2.4 },
      uBias: { value: 0.05 },
      uIntensity: { value: 1.55 },
    });

    ps.brightMesh = psMakePass(PS_BRIGHT_MAT, {
      tColor: { value: ps.rtScene.texture },
      uTexel: { value: new THREE.Vector2(1 / w, 1 / h) },
      uThreshold: { value: 1.15 },
      uKnee: { value: 0.55 },
    });

    ps.blurMesh = psMakePass(PS_BLUR_MAT, {
      tColor: { value: null },
      uDir: { value: new THREE.Vector2() },
    });

    ps.downMesh = psMakePass(PS_BLOOM_MAT, {
      tColor: { value: null },
      uTexel: { value: new THREE.Vector2() },
    });

    ps.compMesh = psMakePass(PS_COMPOSITE_MAT, {
      tScene: { value: ps.rtScene.texture },
      tBlur0: { value: null },
      tBlur1: { value: null },
      tBlur2: { value: null },
      tAO: { value: null },
      uRes: { value: new THREE.Vector2(w, h) },
      uTime: { value: 0 },
      uExposure: { value: PS_EXPOSURE },
      uBloom: { value: 0.40 },
      uAOStrength: { value: 0.85 },
      uVignette: { value: 0.30 },
      uGrain: { value: 0.014 },
      uCA: { value: 0.30 },
      uSaturation: { value: 1.02 },
      uContrast: { value: 1.055 },
      uAOEnabled: { value: 1 },
    });

    ps.fxaaMesh = psMakePass(PS_FXAA_MAT, {
      tColor: { value: null },
      uTexel: { value: new THREE.Vector2(1 / w, 1 / h) },
    });

    resizePost(w, h);
    renderer.toneMapping = THREE.NoToneMapping;
    applyPostQuality();
  }

  function buildPostTargets(w, h) {
    if (ps.rtAO) ps.rtAO.dispose();
    if (ps.rtLDR) ps.rtLDR.dispose();
    for (const lv of ps.levels) {
      lv.a.dispose();
      lv.b.dispose();
    }
    const halfW = Math.max(2, Math.floor(w / 2));
    const halfH = Math.max(2, Math.floor(h / 2));
    ps.rtAO = psMakeRT(halfW, halfH);
    ps.rtLDR = psMakeRT(w, h);
    ps.levels = [];
    for (let i = 0; i < 3; i++) {
      const sc = 1 / Math.pow(2, i + 1);
      ps.levels.push({
        w: Math.max(2, Math.floor(w * sc)),
        h: Math.max(2, Math.floor(h * sc)),
        a: psMakeRT(w * sc, h * sc),
        b: psMakeRT(w * sc, h * sc),
      });
    }
    ps.aoMesh.material.uniforms.uRes.value.set(halfW, halfH);
    ps.aoMesh.material.uniforms.tDepth.value = ps.rtScene.depthTexture;
    ps.compMesh.material.uniforms.tAO.value = ps.rtAO.texture;
    ps.compMesh.material.uniforms.tBlur0.value = ps.levels[0].a.texture;
    ps.compMesh.material.uniforms.tBlur1.value = ps.levels[1].a.texture;
    ps.compMesh.material.uniforms.tBlur2.value = ps.levels[2].a.texture;
    ps.compMesh.material.uniforms.uRes.value.set(w, h);
    ps.fxaaMesh.material.uniforms.uTexel.value.set(1 / w, 1 / h);
  }

  function resizePost(w, h) {
    if (!ps) return;
    ps.w = Math.max(2, Math.floor(w));
    ps.h = Math.max(2, Math.floor(h));
    if (ps.rtScene) ps.rtScene.dispose();
    ps.rtScene = new THREE.WebGLRenderTarget(ps.w, ps.h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: true,
      stencilBuffer: false,
      encoding: THREE.LinearEncoding,
      samples: renderer.capabilities.isWebGL2 ? 4 : 0,
    });
    ps.rtScene.depthTexture = new THREE.DepthTexture(ps.w, ps.h);
    ps.rtScene.depthTexture.format = THREE.DepthFormat;
    ps.rtScene.depthTexture.type = THREE.UnsignedIntType;

    ps.brightMesh.material.uniforms.tColor.value = ps.rtScene.texture;
    ps.brightMesh.material.uniforms.uTexel.value.set(1 / ps.w, 1 / ps.h);
    ps.compMesh.material.uniforms.tScene.value = ps.rtScene.texture;
    buildPostTargets(ps.w, ps.h);
  }

  function applyPostQuality() {
    if (!ps) return;
    const on = psQuality !== 'off';
    renderer.toneMapping = on ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = PS_EXPOSURE;
    if (!ps.compMesh) return;
    if (psQuality === 'high') {
      ps.compMesh.material.uniforms.uAOEnabled.value = 1;
      ps.compMesh.material.uniforms.uBloom.value = 0.40;
      ps.compMesh.material.uniforms.uGrain.value = 0.018;
      ps.compMesh.material.uniforms.uCA.value = 0.30;
      ps.compMesh.material.uniforms.uVignette.value = 0.34;
      ps.compMesh.material.uniforms.uAOStrength.value = 0.85;
      ps.aoMesh.material.uniforms.uIntensity.value = 1.55;
    } else if (psQuality === 'medium') {
      ps.compMesh.material.uniforms.uAOEnabled.value = 1;
      ps.compMesh.material.uniforms.uBloom.value = 0.38;
      ps.compMesh.material.uniforms.uGrain.value = 0.012;
      ps.compMesh.material.uniforms.uCA.value = 0.16;
      ps.compMesh.material.uniforms.uVignette.value = 0.28;
      ps.compMesh.material.uniforms.uAOStrength.value = 0.52;
      ps.aoMesh.material.uniforms.uIntensity.value = 1.20;
    }
    const btn = $('btn-fx');
    if (btn) {
      btn.classList.toggle('on', psQuality !== 'off');
      btn.textContent = psQuality === 'off' ? 'FX' : (psQuality === 'high' ? 'HQ' : 'MED');
      btn.title = '画质 [P] / ' + psQuality.toUpperCase();
    }
  }

  function cyclePostQuality() {
    const i = PS_QUALITIES.indexOf(psQuality);
    psQuality = PS_QUALITIES[(i + 1) % PS_QUALITIES.length];
    applyPostQuality();
    showToast('画质 / ' + psQuality.toUpperCase() + (psQuality === 'off' ? ' · 直出' : ' · 后处理'));
  }

  function renderFrame(dt) {
    if (!ps || psQuality === 'off') {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      return;
    }
    // 1. scene -> HDR buffer
    renderer.setRenderTarget(ps.rtScene);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);

    // 2. SSAO (half res)
    const aoU = ps.aoMesh.material.uniforms;
    aoU.uProj.value.copy(camera.projectionMatrix);
    aoU.uProjInv.value.copy(camera.projectionMatrixInverse);
    psBlit(ps.aoMesh, ps.rtAO);

    // 3. bright pass -> half res
    psBlit(ps.brightMesh, ps.levels[0].a);

    // 4. three blur levels
    const levels = Math.min(psQuality === 'high' ? 3 : 2, ps.levels.length);
    for (let i = 0; i < levels; i++) {
      const lv = ps.levels[i];
      if (i > 0) {
        const prev = ps.levels[i - 1].a.texture;
        const dm = ps.downMesh.material.uniforms;
        dm.tColor.value = prev;
        dm.uTexel.value.set(0.5 / ps.levels[i - 1].w, 0.5 / ps.levels[i - 1].h);
        psBlit(ps.downMesh, lv.b);
        ps.blurMesh.material.uniforms.tColor.value = lv.b.texture;
      } else {
        ps.blurMesh.material.uniforms.tColor.value = lv.a.texture;
      }
      const um = ps.blurMesh.material.uniforms;
      um.uDir.value.set(1.0 / lv.w, 0.0);
      psBlit(ps.blurMesh, lv.b);
      um.tColor.value = lv.b.texture;
      um.uDir.value.set(0.0, 1.0 / lv.h);
      psBlit(ps.blurMesh, lv.a);
    }

    // 5. grade to LDR
    const cu = ps.compMesh.material.uniforms;
    cu.uTime.value = elapsed;
    psBlit(ps.compMesh, ps.rtLDR);

    // 6. anti-alias to screen
    ps.fxaaMesh.material.uniforms.tColor.value = ps.rtLDR.texture;
    ps.quad.material = ps.fxaaMesh.material;
    renderer.setRenderTarget(null);
    renderer.render(ps.quadScene, ps.quadCamera);
  }

  /* ------------------------------------------------------------------ */
  /* Environment capture (one-time IBL for metal / wet surfaces)         */
  /* ------------------------------------------------------------------ */
  function buildEnvironmentMap() {
    try {
      const prevTone = renderer.toneMapping;
      renderer.toneMapping = THREE.NoToneMapping;
      const cubeRT = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType });
      const cubeCam = new THREE.CubeCamera(0.5, 14000, cubeRT);
      cubeCam.position.set(0, 420, 120);
      cubeCam.update(renderer, scene);
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileCubemapShader();
      const envRT = pmrem.fromCubemap(cubeRT.texture);
      scene.environment = envRT.texture;
      pmrem.dispose();
      cubeRT.dispose();
      renderer.toneMapping = prevTone;
    } catch (err) {
      console.warn('environment capture skipped', err);
    }
  }

  function enableStaticShadows() {
    // A single 2k cascade cannot cover a 1.6 km voxel city without acne, so
    // static geometry is excluded and contact occlusion comes from SSAO.
    const keyLight = scene.getObjectByName('vcKeyLight');
    if (keyLight) keyLight.castShadow = false;
    for (const child of staticGroup.children) {
      child.castShadow = false;
      child.receiveShadow = false;
    }
    renderer.shadowMap.enabled = false;
  }
