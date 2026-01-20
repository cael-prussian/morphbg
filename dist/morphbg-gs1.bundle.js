/**
 * morphbg - Topographic Flow Shader Bundle
 * Single-file shader bundle containing: config + shader + adapter
 * https://github.com/cael-prussian/morphbg
 */

window.BG_SHADER_CONFIG = {
    modes: {
        'atmospheric-mesh': 0.0,
        'topographic-flow': 1.0,
        'fabric-warp': 2.0
    },

    presets: {

        HERO: {
            spatial: 1.0,
            temporal: 1.0,
            cursor: 1.0,
            cursorGlobal: 0.0,
            flatten: 0.0,
            heightContrast: 1.0,
            calm: 0.0
        },

        READ: {
            spatial: 0.05,
            temporal: 0.03,
            cursor: 1.0,
            cursorGlobal: 0.0,
            flatten: 0.85,
            heightContrast: 0.25,
            calm: 0.75
        },

        AMBIENT: {
            spatial: 0.25,
            temporal: 0.20,
            cursor: 1.0,
            cursorGlobal: 0.0,
            flatten: 0.35,
            heightContrast: 0.6,
            calm: 0.4
        }
    },

    blendVh: 1.0,
    transitionVh: 0.5,   // ~50vh overlap band
    smoothSpeed: 2.0
};

window.BG_FRAGMENT_SHADER = `
precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_mode;

// Mode weights from engine (which modes are actually in viewport)
uniform float u_modeWeight0;
uniform float u_modeWeight1;
uniform float u_modeWeight2;

uniform float u_spatialMotion;
uniform float u_temporalMotion;
uniform float u_cursorEnabled;
uniform float u_calm;

uniform float u_focusEnabled;
uniform float u_focusStrength;
uniform vec4  u_focusRect;
uniform float u_cursorGlobal;

uniform float u_flatten;
uniform float u_heightContrast;
uniform float u_warpIntensity;

// Phase B: Mode-specific controls
uniform float u_topoBands;          // Mode 1: Contour line count
uniform float u_topoWhiteBias;      // Mode 1: White region expansion
uniform float u_organicBacklight;   // Mode 2: Trough glow intensity
uniform float u_organicDarkening;   // Mode 2: Peak shadow intensity

varying vec2 v_uv;

// ----------------------------------------------------
// Noise / helpers
// ----------------------------------------------------
float hash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p.x + p.y) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float smooth01(float x) { x = clamp(x, 0.0, 1.0); return x * x * (3.0 - 2.0 * x); }

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

// (1) Dither helper: breaks 8-bit banding (use near output)
float dither01(vec2 p) {
  return hash21(p) - 0.5; // -0.5..0.5
}

// fBm and ridged noise for organic textures
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

float ridged(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 5; i++) {
    float n = noise(p);
    n = 1.0 - abs(n * 2.0 - 1.0);
    v += a * n;
    p *= 2.05;
    a *= 0.5;
  }
  return v;
}

// ----------------------------------------------------
// Focus mask
// ----------------------------------------------------
float focusMask(vec2 uv) {
  if (u_focusEnabled < 0.5) return 0.0;
  vec2 c = u_focusRect.xy;
  vec2 s = u_focusRect.zw * 0.5;
  vec2 d = abs(uv - c) - s;
  float outside = max(d.x, d.y);
  float px = 2.0 / max(min(u_resolution.x, u_resolution.y), 1.0);
  return 1.0 - smoothstep(0.0, px * 18.0, outside);
}

// ----------------------------------------------------
// Warp
// ----------------------------------------------------
vec2 centerWarp(vec2 p, vec2 c, float radius, float strength) {
  float r = max(radius, 0.0001);
  float d = length(p - c);
  float w = exp(-(d * d) / (r * r));
  return (c - p) * w * strength;
}

// ----------------------------------------------------
// Palette for atmospheric mode (kept)
// ----------------------------------------------------
vec3 palette5(float t) {
  vec3 c0 = vec3(0.53, 0.05, 0.31);
  vec3 c1 = vec3(0.46, 0.29, 0.65);
  vec3 c2 = vec3(0.42, 0.04, 0.25);
  vec3 c3 = vec3(0.46, 0.29, 0.65);
  vec3 c4 = vec3(0.53, 0.05, 0.31);

  t = fract(t);
  float x = t * 4.0;
  float i = floor(x);
  float f = fract(x);
  f = f * f * (3.0 - 2.0 * f);

  vec3 a = (i < 1.0) ? c0 : (i < 2.0) ? c1 : (i < 3.0) ? c2 : c3;
  vec3 b = (i < 1.0) ? c1 : (i < 2.0) ? c2 : (i < 3.0) ? c3 : c4;

  return mix(a, b, f);
}

// ----------------------------------------------------
// Topo field (UNCHANGED BEHAVIOUR)
// ----------------------------------------------------
struct TopoField { vec2 p; float h; float x; float d; float detail; float bands; };

TopoField computeTopoField(vec2 warpedA, float aspect, vec2 cursorA, vec2 uvA, float temporalK, float spatialK, float cursorLocalK) {
  TopoField F;

  vec2 center1 = vec2(
    0.3 * aspect + 0.25 * aspect * sin(u_time * (0.35 * temporalK)),
    0.3 + 0.22 * cos(u_time * (0.27 * temporalK))
  );
  vec2 center2 = vec2(
    0.7 * aspect + 0.28 * aspect * sin(u_time * (0.22 * temporalK) + 1.3),
    0.7 + 0.24 * cos(u_time * (0.31 * temporalK) + 2.1)
  );

  vec2 p = warpedA;
  p += centerWarp(p, cursorA, 0.55, 0.30 * spatialK * cursorLocalK);
  p += centerWarp(p, center1, 0.75, 0.35 * spatialK);
  p += centerWarp(p, center2, 0.75, 0.35 * spatialK);

  float maxR = 1.2;
  float r = length(uvA - cursorA);
  float localDetail = smooth01(1.0 - clamp(r / maxR, 0.0, 1.0));
  float detail = clamp(0.15 + localDetail * 0.95, 0.0, 1.0);

  float bands = mix(8.0, 50.0, detail);
  float freq  = mix(2.0, 7.0, detail);

  vec2 centered = p - vec2(0.5 * aspect, 0.5);

  float irregular = clamp(u_mouse.y, 0.0, 1.0) * cursorLocalK;
  float jitterAmp  = mix(0.0, 0.25, irregular) * spatialK;
  float jitterFreq = mix(3.0, 10.0, irregular);

  float ttA = u_time * (0.25 * temporalK);
  float ttB = u_time * (0.18 * temporalK);
  float ttC = u_time * (0.60 * temporalK);

  float h = noise(centered * freq + ttA);
  h += 0.5 * noise(centered * freq * 2.0 - ttB);
  h /= 1.5;
  h += jitterAmp * (noise(centered * jitterFreq + ttC) - 0.5);
  h = clamp(h, 0.0, 1.0);

  float x = h * bands;
  float fx = fract(x);
  float d  = min(fx, 1.0 - fx);

  F.p = p; F.h = h; F.x = x; F.d = d; F.detail = detail; F.bands = bands;
  return F;
}

// ----------------------------------------------------
// Organic texture color for mode 3 (procedural)
// Adds: trough backlight + peak darkening + OPTIONAL wobble
// ----------------------------------------------------
vec3 organicTextureColor(vec2 p, vec2 uvA, vec2 cursorA, float t, float hUse, float phase, float spatialK, float temporalK, float calmFactor, float readK) {
  float r = length(uvA - cursorA);
  float cursorZone = smooth01(1.0 - clamp(r / 0.95, 0.0, 1.0));
  cursorZone *= (1.0 - calmFactor);

  // Domain warp for organic flow
  vec2 warp = vec2(
    fbm(p * 2.2 + vec2(t * 0.35, -t * 0.28)),
    fbm(p.yx * 2.2 + vec2(-t * 0.30, t * 0.33))
  ) - 0.5;
  warp *= mix(0.06, 0.18, spatialK) * (0.55 + 0.45 * cursorZone);

  vec2 q = p + warp;

  // Three material layers
  float fibres   = fbm(q * 3.4 + vec2(t * 0.12, -t * 0.09));
  float sediment = ridged(q * 1.9 + vec2(-t * 0.08, t * 0.06));
  float pores    = fbm((q + (fibres - 0.5) * 0.35) * 8.5 + t * 0.15);

  fibres   = (fibres - 0.5);
  sediment = (sediment - 0.5);
  pores    = smoothstep(0.45, 0.78, pores) - smoothstep(0.78, 0.98, pores);

  // Cursor-bound but not blotchy
  vec2 cq = q * (2.2 + 4.0 * spatialK);
  cq += (noise(q * 2.7 + t * 0.9) - 0.5) * 0.65;
  float chaos = ridged(cq * 2.0 + vec2(t * 0.9, -t * 0.85)) - 0.5;
  chaos *= (0.10 + 0.30 * cursorZone) * mix(1.0, 0.55, readK);

  // Peak/trough weights from topo height
  float peak   = smoothstep(0.55, 0.92, hUse);
  float trough = 1.0 - smoothstep(0.08, 0.45, hUse);

  // Height-driven mix
  float matA = fibres * 0.55 + pores * 0.35;
  float matB = sediment * 0.70 + fibres * 0.25;
  float mat  = mix(matB, matA, peak);
  mat += trough * (-0.10 + 0.15 * sediment);
  mat += chaos;

  // Tone base (darker/mid by default, READ dark)
  vec3 baseDark = vec3(0.14, 0.12, 0.11);
  vec3 baseMid  = vec3(0.34, 0.30, 0.28);
  vec3 baseLite = vec3(0.48, 0.44, 0.41);

  vec3 base = mix(baseMid, baseLite, peak * 0.35);
  base = mix(base, baseDark, readK);

  // Subtle chroma variation
  vec3 warm = vec3(1.06, 1.00, 0.96);
  vec3 cool = vec3(0.97, 1.02, 1.06);
  float tintN = fbm(q * 0.55 + vec2(12.7, 3.9));
  vec3 tint = mix(warm, cool, tintN);

  // Shading
  float shade = clamp(0.52 + mat * 0.90, 0.0, 1.0);
  shade = mix(shade, shade * shade, readK);

  vec3 col = base * mix(0.70, 1.18, shade);
  col *= tint;

  // Backlight / subsurface lift
  float backMask = (trough * trough) * (0.20 + 0.80 * cursorZone);

  float shimmer = fbm(q * 1.4 + vec2(t * 0.35, -t * 0.28));
  shimmer = (shimmer - 0.5) * 2.0;

  float thin = clamp(0.55 + 0.55 * shimmer + 0.85 * chaos, 0.0, 1.0);

  float backAmt = 0.35;
  backAmt *= mix(1.35, 0.70, readK);
  backAmt *= mix(0.65, 1.10, spatialK);
  backAmt *= (1.0 - calmFactor);
  backAmt *= u_organicBacklight;  // Apply Phase B control

  vec3 backTint = vec3(1.10, 0.98, 0.88);

  float wobble = (shimmer * 0.5 + 0.5); // 0..1
  backMask *= mix(0.85, 1.25, wobble);

  col += backTint * (backAmt * backMask * thin);

  // Peak darkening
  float peakMask = (peak * peak) * (0.35 + 0.65 * cursorZone);

  float charN = ridged(q * 1.25 + vec2(-t * 0.22, t * 0.18));
  charN = clamp((charN - 0.45) * 1.35, 0.0, 1.0);

  float darkAmt = 0.55;
  darkAmt *= mix(1.10, 0.75, readK);
  darkAmt *= (1.0 - calmFactor);
  darkAmt *= u_organicDarkening;  // Apply Phase B control

  vec3 nearBlack = vec3(0.02, 0.02, 0.02);

  peakMask *= mix(0.80, 1.30, 1.0 - wobble);

  float darkK = darkAmt * peakMask * (0.55 + 0.45 * charN);
  col = mix(col, nearBlack, clamp(darkK, 0.0, 1.0));

  col *= 1.0 + (phase * 0.04);

  return col;
}

void main() {
  float aspect = u_resolution.x / u_resolution.y;

  vec2 uvN = v_uv;
  vec2 uvA = vec2(uvN.x * aspect, uvN.y);

  // Use mode weights directly from engine - they already know which modes are in viewport
  // No need for complex u_mode range detection - the engine tells us explicitly
  float mode0T = u_modeWeight0;
  float mode1T = u_modeWeight1;
  float mode2T = u_modeWeight2;
  
  // Ensure weights sum to 1.0 (should already be normalized, but safeguard)
  float totalWeight = mode0T + mode1T + mode2T;
  if (totalWeight > 0.001) {
    mode0T /= totalWeight;
    mode1T /= totalWeight;
    mode2T /= totalWeight;
  }

  float fMask = focusMask(uvN);
  float calmFactor = clamp(u_calm + fMask * u_focusStrength, 0.0, 1.0);

  float readK = clamp(u_cursorGlobal * smoothstep(0.8, 1.2, u_mode), 0.0, 1.0);

  float spatialK  = u_spatialMotion  * (1.0 - calmFactor);
  float temporalK = u_temporalMotion * (1.0 - calmFactor);

  float cursorOn = (u_cursorEnabled > 0.5) ? 1.0 : 0.0;
  float cursorLocalK  = cursorOn * (1.0 - fMask) * (1.0 - u_cursorGlobal);
  float cursorGlobalK = cursorOn * u_cursorGlobal;

  // Make time periodic to prevent accumulation and ensure consistent movement intensity
  float TIME_PERIOD = 1000.0; // seconds, adjust as needed for visual cycle
  float tRaw = mod(u_time, TIME_PERIOD) * mix(0.04, 0.22, temporalK);
  // Clamp t to max corresponding to ~10 seconds of motion
  float T_CLAMP = 20.0 * 0.22; // 20 seconds at max temporalK
  float t = min(tRaw, T_CLAMP);

  // Debug: log t and amplitude if window.DEBUG_MORPHBG is set
#ifdef GL_ES
#else
  if (window.DEBUG_MORPHBG) {
    // This will only work in environments supporting JS in GLSL (e.g. via engine debug hooks)
    // For real GLSL, use engine-side logging if needed
    // console.log('GS1 t:', t, 'tRaw:', tRaw, 'T_CLAMP:', T_CLAMP);
  }
#endif

  // Apply warpIntensity to spatial warp calculations
  float warpBase = clamp(u_warpIntensity, 0.0, 1.0);
  float warpFreq = mix(1.4, 4.2, spatialK * warpBase);
  float warpAmp  = mix(0.004, 0.12, spatialK * warpBase);

  vec2 warpField = vec2(
    noise(uvA * warpFreq + t),
    noise(uvA * (warpFreq + 0.7) - t)
  );
  vec2 warpedA = uvA + (warpField - 0.5) * warpAmp;

  vec2 cursorA = vec2(u_mouse.x * aspect, u_mouse.y);

  if (cursorGlobalK > 0.001) {
    vec2 c0 = vec2(0.5 * aspect, 0.5);
    float shiftAmt = mix(0.08, 0.012, readK);
    vec2 shift = (cursorA - c0) * shiftAmt * cursorGlobalK;
    // Clamp the shift length to avoid excessive movement during scroll transitions
    float maxShift = 0.12; // maximum allowed shift (tunable)
    float shiftLen = length(shift);
    if (shiftLen > maxShift) {
      shift = normalize(shift) * maxShift;
    }
    warpedA += shift;
  }

  TopoField F = computeTopoField(warpedA, aspect, cursorA, uvA, temporalK, spatialK, cursorLocalK);

  float h0 = F.h;
  float contrast = clamp(u_heightContrast, 0.0, 1.0);
  float hFlat = 0.5 + (h0 - 0.5) * contrast;
  float hUse = mix(h0, hFlat, clamp(u_flatten, 0.0, 1.0));

  float mx = smooth01(u_mouse.x);
  float my = smooth01(u_mouse.y);
  float mousePhase = (mx * 0.18 + my * 0.06) * (cursorLocalK + cursorGlobalK * 0.20);
  float autoPhase  = u_time * (0.020 * temporalK);
  float phaseScale = mix(1.0, 0.08, readK);
  float phase = (mousePhase + autoPhase) * phaseScale;

  float h = hUse;
  float blurScale = mix(1.0, 0.12, readK);
  float blurN = (noise(F.p * 1.25 + t) - 0.5) * (0.10 * (1.0 - calmFactor)) * blurScale;
  h = clamp(h + blurN, 0.0, 1.0);

  vec3 col = palette5(h + phase);
  col = mix(col, col * 0.97, smooth01(F.d * 4.0) * 0.06);

  vec3 atmOnlyCol = col;

  // Mode 0: Atmospheric mesh (gradient-based)
  vec3 mode0Col = palette5(h + phase);

  // Mode 1: Topographic flow (contour lines)
  float bandsUse = mix(F.bands, mix(4.0, 9.0, F.detail), readK);
  bandsUse = mix(bandsUse, u_topoBands, step(2.0, u_topoBands));
  float xUse = clamp(hUse, 0.0, 1.0) * bandsUse;
  float parity = fract(xUse * 0.5);
  float whiteBias = mix(0.0, 0.05, readK) + u_topoWhiteBias;
  float regionParity = step(0.5 - whiteBias, parity);
  vec3 topoCol = mix(vec3(1.0), vec3(0.0), regionParity);
  vec3 mode1Col = mix(atmOnlyCol, topoCol, 1.0);
  if (readK > 0.001) {
    float isWhite = 1.0 - regionParity;
    float isBlack = regionParity;
    mode1Col = mix(mode1Col, vec3(1.0), isWhite * readK);
    mode1Col = mix(mode1Col, atmOnlyCol, isBlack * readK);
  }
  
  // Mode 2: Fabric warp (organic texture)
  vec3 mode2Col = organicTextureColor(warpedA, uvA, cursorA, t, hUse, phase, spatialK, temporalK, calmFactor, readK);
  
  // Blend modes using weights from engine
  col = mode0Col * mode0T + mode1Col * mode1T + mode2Col * mode2T;

  // Dither: break gradient banding without temporal artifacts
  float d = dither01(gl_FragCoord.xy + vec2(19.7, 73.3) + floor(u_time * 3.0));
  col += d * (1.0 / 255.0) * 0.85;

  col = clamp(col, 0.0, 1.0);
  col = pow(col, vec3(0.95));

  gl_FragColor = vec4(col, 1.0);
}
`;

window.BG_TopoReadAdapter = (() => {
    function clamp01(x) { return Math.max(0, Math.min(1, x)); }

    // Single source of truth: uniform definitions
    const UNIFORMS = {
        // Special uniforms (not accumulated)
        focusEnabled: { uniform: 'u_focusEnabled', default: 0, accumulate: false, threeValue: (THREE) => 0 },
        focusStrength: { uniform: 'u_focusStrength', default: 0, accumulate: false, threeValue: (THREE) => 0 },
        focusRect: { uniform: 'u_focusRect', default: null, accumulate: false, threeValue: (THREE) => new THREE.Vector4(0.5, 0.5, 1, 1) },

        // Accumulated uniforms - preset-driven
        cursorGlobal: { uniform: 'u_cursorGlobal', default: 0.0, dataAttr: 'data-cursor-global', useMaterialFallback: true },
        flatten: { uniform: 'u_flatten', default: 0.0, dataAttr: 'data-flatten' },
        heightContrast: { uniform: 'u_heightContrast', default: 1.0, dataAttr: 'data-height-contrast', validator: (v) => Math.max(0, v) },

        // Accumulated uniforms - data-driven
        warpIntensity: { uniform: 'u_warpIntensity', default: 1.0, dataAttr: 'data-warp-intensity' },
        topoBands: { uniform: 'u_topoBands', default: 20.0, dataAttr: 'data-topo-bands', validator: (v) => Math.max(2, Math.min(50, v)) },
        topoWhiteBias: { uniform: 'u_topoWhiteBias', default: 0.0, dataAttr: 'data-topo-white-bias' },
        organicBacklight: { uniform: 'u_organicBacklight', default: 1.0, dataAttr: 'data-organic-backlight' },
        organicDarkening: { uniform: 'u_organicDarkening', default: 1.0, dataAttr: 'data-organic-darkening' },
    };

    const accumulatedUniforms = Object.entries(UNIFORMS).filter(([_, def]) => def.accumulate !== false);

    return {
        extendUniforms(THREE) {
            const uniforms = {};
            for (const [key, def] of Object.entries(UNIFORMS)) {
                if (def.threeValue) {
                    uniforms[def.uniform] = { value: def.threeValue(THREE) };
                } else {
                    uniforms[def.uniform] = { value: def.default };
                }
            }
            return uniforms;
        },

        initTarget() {
            const target = {};
            for (const [key, def] of accumulatedUniforms) {
                target[key] = def.default;
            }
            return target;
        },

        initAcc() {
            const acc = {};
            for (const [key] of accumulatedUniforms) {
                acc[key] = 0.0;
            }
            return acc;
        },

        accumulateFromSection({ el, w, acc, clamp01, material }) {
            for (const [key, def] of accumulatedUniforms) {
                let value;

                if (def.useMaterialFallback) {
                    value = parseFloat(el.getAttribute(def.dataAttr)) || material.uniforms[def.uniform]?.value || def.default;
                } else {
                    value = parseFloat(el.getAttribute(def.dataAttr)) || def.default;
                }

                if (def.validator) {
                    value = def.validator(value);
                } else {
                    value = clamp01(value);
                }

                if (window.DEBUG_MORPHBG) {
                    const preset = el.getAttribute('data-shader-preset') || 'unknown';
                    const mode = el.getAttribute('data-shader-mode') || 'unknown';
                    console.log(`[adaptor] accumulateFromSection: preset=${preset}, mode=${mode}, key=${key}, value=${value}, w=${w}, acc=${acc[key]}`);
                }
                acc[key] += value * w;
            }
        },

        accumulateBaseline({ need, acc, material }) {
            for (const [key, def] of accumulatedUniforms) {
                acc[key] += (material.uniforms[def.uniform]?.value || def.default) * need;
            }
        },

        finalizeTargets({ target, totalW, acc }) {
            const invW = 1.0 / Math.max(totalW, 1e-6);
            const next = { ...target };

            for (const [key] of accumulatedUniforms) {
                next[key] = acc[key] * invW;
                if (window.DEBUG_MORPHBG) {
                    console.log(`[adaptor] finalizeTargets: key=${key}, acc=${acc[key]}, totalW=${totalW}, next=${next[key]}`);
                }
            }

            return { target: next };
        },

        applyFrameUniforms({ material, target, a }) {
            for (const [key, def] of accumulatedUniforms) {
                const uniform = material.uniforms[def.uniform];
                if (uniform) {
                    uniform.value += (target[key] - uniform.value) * a;
                }
            }
        }
    };
})();