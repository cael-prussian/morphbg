window.BG2_FRAGMENT_SHADER = `
precision highp float;

uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_time;
uniform float u_mode;

uniform float u_heroAlwaysOnK;
uniform float u_spatialMotion;
uniform float u_temporalMotion;
uniform float u_cursorEnabled;
uniform float u_calm;

uniform float u_ghostTime;
uniform float u_cursorSpeed;
uniform float u_flowDir;

// Phase B: Mode-specific parameters
uniform float u_gridLineWidth;       // Mode 0: line thickness
uniform float u_gridFillAmount;      // Mode 0: medium cell fill probability
uniform float u_gridCursorFills;     // Mode 0: fill density near cursor/ghosts
uniform float u_gridSubdivisionDepth; // Mode 0: BSP recursion depth (cell size)
uniform float u_gridSmallFills;      // Mode 0: small cell fill probability (0=none, 1=all)
uniform float u_shardCount;          // Mode 1
uniform float u_shardSpeed;          // Mode 1
uniform float u_shardChaos;          // Mode 1
uniform float u_flowDensity;         // Mode 2
uniform float u_flowWarp;            // Mode 2

varying vec2 v_uv;

// ----------------------------------------------------
// Hash helpers
// ----------------------------------------------------
float hash11(float p) { return fract(sin(p) * 43758.5453123); }

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

vec2 hash22(float p) {
  float x = hash11(p * 127.1 + 311.7);
  float y = hash11(p * 269.5 + 183.3);
  return vec2(x, y);
}

float dither01(vec2 p) { return hash21(p) - 0.5; }

float smooth01(float x) { x = clamp(x, 0.0, 1.0); return x * x * (3.0 - 2.0 * x); }

// ----------------------------------------------------
// Cursor-position -> center weight (1 center, 0 edges)
// ----------------------------------------------------
float centerKFromCursor(vec2 cur) {
  vec2 d = cur - vec2(0.5);
  float dn = length(d) / 0.70710678;
  return 1.0 - smoothstep(0.15, 0.95, dn);
}

// ----------------------------------------------------
// Palette
// ----------------------------------------------------
vec3 beigeBG() { return vec3(242.0, 226.0, 209.0) / 255.0; } // #F2E2D1
vec3 ink()     { return vec3(0.03, 0.03, 0.03); }
vec3 cMag() { return vec3(136.0,  12.0,  80.0) / 255.0; }    // #880C50
vec3 cBlue(){ return vec3(117.0,  73.0, 167.0) / 255.0; }    // #7549A7
vec3 cRed() { return vec3( 17.0, 127.0,  42.0) / 255.0; }    // #117F2A
vec3 cYel() { return vec3(136.0,  12.0,  80.0) / 255.0;; }    // warm gold (readable on #F2E2D1)

// ----------------------------------------------------
// Distance to a line segment (for reveal / proximity)
// ----------------------------------------------------
float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

// ----------------------------------------------------
// Repel p away from q within radius rUV
// ----------------------------------------------------
vec2 repel(vec2 p, vec2 q, float rUV, float strength) {
  vec2 d = p - q;
  float dist = length(d) + 1e-5;
  float w = smooth01(1.0 - clamp(dist / max(rUV, 1e-5), 0.0, 1.0));
  return p + (d / dist) * (w * strength);
}

// ----------------------------------------------------
// dwell-ease: slows to near-stop at both ends
// ----------------------------------------------------
float dwellEase(float x, float dwell) {
  x = clamp(x, 0.0, 1.0);
  float t = (x - dwell) / max(1.0 - 2.0 * dwell, 1e-6);
  t = clamp(t, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  t = t * t * (3.0 - 2.0 * t);
  return t;
}

// waypoint hop: each ghost moves between seeded points with dwell at ends
vec2 ghostHopPos(float time, float seed, float period, float dwell, vec2 padMin, vec2 padMax) {
  float k  = floor(time / period);
  float ph = fract(time / period);

  vec2 A = mix(padMin, padMax, hash22(seed + k * 19.13 + 1.7));
  vec2 B = mix(padMin, padMax, hash22(seed + (k + 1.0) * 19.13 + 1.7));

  float t = dwellEase(ph, dwell);
  return mix(A, B, t);
}

// ---- macro-line builder (approx top-level BSP lines, global) ----
void macroLines(out vec4 xL, out vec4 yL) {
  xL = vec4(-1.0);
  yL = vec4(-1.0);

  float seed = 101.37;
  float PHI  = 0.61803398875;

  vec4 r0 = vec4(0.0, 0.0, 1.0, 1.0);

  // Level 0
  float lvl = 0.0;
  float rAxis = hash11(seed + lvl *  9.31 + 1.27);
  float rRat  = hash11(seed + lvl *  7.77 + 4.41);

  float pick = step(0.5, rRat);
  float phiRatio = mix(1.0 - PHI, PHI, pick);
  float dev = (hash11(seed + lvl * 5.91 + 8.13) - 0.5) * 0.06;
  float ratio = clamp(phiRatio + dev, 0.20, 0.80);

  float splitX = mix(1.0, 0.0, step(0.70, rAxis));

  vec4 a0, b0;
  if (splitX > 0.5) {
    float s = mix(r0.x, r0.z, ratio);
    xL.x = s;
    a0 = vec4(r0.x, r0.y, s,    r0.w);
    b0 = vec4(s,    r0.y, r0.z, r0.w);
  } else {
    float s = mix(r0.y, r0.w, ratio);
    yL.x = s;
    a0 = vec4(r0.x, r0.y, r0.z, s);
    b0 = vec4(r0.x, s,    r0.z, r0.w);
  }

  // Level 1 (one split in each child)
  lvl = 1.0;

  float rAxisA = hash11(seed + lvl *  9.31 + 1.27 + 11.0);
  float rRatA  = hash11(seed + lvl *  7.77 + 4.41 + 11.0);

  vec2 szA = a0.zw - a0.xy;
  float preferXA = step(szA.y, szA.x);
  float splitXA  = mix(preferXA, 1.0 - preferXA, step(0.70, rAxisA));
  float ratioA   = clamp(mix(0.40, 0.60, rRatA), 0.20, 0.80);

  if (splitXA > 0.5) xL.y = mix(a0.x, a0.z, ratioA);
  else               yL.y = mix(a0.y, a0.w, ratioA);

  float rAxisB = hash11(seed + lvl *  9.31 + 1.27 + 29.0);
  float rRatB  = hash11(seed + lvl *  7.77 + 4.41 + 29.0);

  vec2 szB = b0.zw - b0.xy;
  float preferXB = step(szB.y, szB.x);
  float splitXB  = mix(preferXB, 1.0 - preferXB, step(0.70, rAxisB));
  float ratioB   = clamp(mix(0.40, 0.60, rRatB), 0.20, 0.80);

  if (splitXB > 0.5) xL.z = mix(b0.x, b0.z, ratioB);
  else               yL.z = mix(b0.y, b0.w, ratioB);
}

// nearest valid entry in vec4 (skips <0)
float nearestLine(float v, vec4 L) {
  float best = 1e9;
  float outv = -1.0;

  float d0 = (L.x > 0.0) ? abs(v - L.x) : 1e9;
  float d1 = (L.y > 0.0) ? abs(v - L.y) : 1e9;
  float d2 = (L.z > 0.0) ? abs(v - L.z) : 1e9;
  float d3 = (L.w > 0.0) ? abs(v - L.w) : 1e9;

  best = d0; outv = L.x;
  if (d1 < best) { best = d1; outv = L.y; }
  if (d2 < best) { best = d2; outv = L.z; }
  if (d3 < best) { best = d3; outv = L.w; }

  return outv;
}

// ----------------------------------------------------
// MODE 2 helpers: flowField + stripes + pulse
// ----------------------------------------------------

// smooth-ish 2D noise (value noise)
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// returns vec3(dir.xy, magnitude)
vec3 flowField(vec2 p, float t, float scale, float warp) {
  vec2 q = p * scale;

  float n1 = vnoise(q + vec2(0.0, t * 0.20));
  float n2 = vnoise(q + vec2(13.7, -t * 0.17));
  vec2  w  = (vec2(n1, n2) - 0.5) * warp;
  q += w;

  float e = 0.35; // bigger = cheaper/smoother
  float a = vnoise(q + vec2(e, 0.0));
  float b = vnoise(q - vec2(e, 0.0));
  float c = vnoise(q + vec2(0.0, e));
  float d = vnoise(q - vec2(0.0, e));

  vec2 grad = vec2(a - b, c - d);
  vec2 v = vec2(-grad.y, grad.x);

  float m = length(v);
  v = v / max(m, 1e-4);

  float ph = 6.2831853 * vnoise(q * 0.33 + t * 0.07);
  v = normalize(mix(v, vec2(cos(ph), sin(ph)), 0.12));

  return vec3(v, m);
}

// anti-aliased stripe family along 1D coordinate x
float stripeLines(float x, float freq, float halfWidthUV, float aaUV) {
  float v = fract(x * freq);
  float d = abs(v - 0.5);
  float w = halfWidthUV * freq;
  float a = aaUV * freq * 1.25;
  return 1.0 - smoothstep(w, w + a, d);
}

// sparse pulse per cell, occasionally turns on and breathes
float rarePulse(vec2 cellID, float t) {
  float r = hash21(cellID + vec2(4.2, 7.9));
  float alive = step(0.92, r); // ~8%
  float spd   = mix(0.35, 0.85, hash21(cellID + vec2(1.1, 9.3)));
  float ph    = hash21(cellID + vec2(8.7, 2.6)) * 6.2831853;
  float s     = sin(t * spd + ph) * 0.5 + 0.5;
  s = s * s * (3.0 - 2.0 * s);
  float gate = step(0.65, sin(t * (0.07 + 0.11 * spd) + ph));
  return alive * s * gate;
}

// ----------------------------------------------------
// Reveal for a split segment
// ----------------------------------------------------
float revealForSegment(vec2 p, vec2 a, vec2 b, float pxUnit) {
  vec2 cur = clamp(u_mouse, 0.0, 1.0);

  float heroK = smoothstep(0.70, 0.95, u_spatialMotion);
  float centerK = centerKFromCursor(cur);

  float baseRpx = mix(260.0, 150.0, heroK);

  float readK = 1.0 - smoothstep(0.12, 0.18, u_temporalMotion);
  baseRpx *= mix(1.0, 0.28, readK);

  float softPx = mix(28.0, 55.0, heroK);
  float softUV = softPx * pxUnit;

  float rCur = baseRpx * pxUnit;

  // HERO ghosts
  float t = u_ghostTime;

  vec2 padMin = vec2(0.14, 0.14);
  vec2 padMax = vec2(0.86, 0.86);
  float dwell = 0.28;

  vec2 g1 = ghostHopPos(t, 17.7, 6.8, dwell, padMin, padMax);
  vec2 g2 = ghostHopPos(t, 33.3, 7.6, dwell, padMin, padMax);
  vec2 g3 = ghostHopPos(t, 51.1, 8.4, dwell, padMin, padMax);
  vec2 g4 = ghostHopPos(t, 68.2, 5.9, dwell, padMin, padMax);
  vec2 g5 = ghostHopPos(t, 84.6, 9.2, dwell, padMin, padMax);
  vec2 g6 = ghostHopPos(t, 97.9, 7.1, dwell, padMin, padMax);

  float p1 = 0.5 + 0.5 * sin(t * 0.42 + 1.1);
  float p2 = 0.5 + 0.5 * sin(t * 0.36 + 2.7);
  float p3 = 0.5 + 0.5 * sin(t * 0.48 + 4.2);
  float p4 = 0.5 + 0.5 * sin(t * 0.40 + 0.6);
  float p5 = 0.5 + 0.5 * sin(t * 0.33 + 5.1);
  float p6 = 0.5 + 0.5 * sin(t * 0.46 + 3.3);

  float r1 = (baseRpx * mix(0.46, 0.76, p1)) * pxUnit;
  float r2 = (baseRpx * mix(0.50, 0.83, p2)) * pxUnit;
  float r3 = (baseRpx * mix(0.54, 0.97, p3)) * pxUnit;
  float r4 = (baseRpx * mix(0.44, 0.72, p4)) * pxUnit;
  float r5 = (baseRpx * mix(0.48, 0.86, p5)) * pxUnit;
  float r6 = (baseRpx * mix(0.52, 0.92, p6)) * pxUnit;

  float s12 = mix(1.0, 0.70, centerK);
  float s3  = mix(1.0, 1.25, centerK);
  r1 *= s12; r2 *= s12; r3 *= s3;

  // separation
  float sepUV = 0.42;
  float sepStrength = 0.070;

  for (int it = 0; it < 2; it++) {
    g1 = repel(g1, g2, sepUV, sepStrength * heroK);
    g1 = repel(g1, g3, sepUV, sepStrength * heroK);
    g1 = repel(g1, g4, sepUV, sepStrength * heroK);
    g1 = repel(g1, g5, sepUV, sepStrength * heroK);
    g1 = repel(g1, g6, sepUV, sepStrength * heroK);

    g2 = repel(g2, g1, sepUV, sepStrength * heroK);
    g2 = repel(g2, g3, sepUV, sepStrength * heroK);
    g2 = repel(g2, g4, sepUV, sepStrength * heroK);
    g2 = repel(g2, g5, sepUV, sepStrength * heroK);
    g2 = repel(g2, g6, sepUV, sepStrength * heroK);

    g3 = repel(g3, g1, sepUV, sepStrength * heroK);
    g3 = repel(g3, g2, sepUV, sepStrength * heroK);
    g3 = repel(g3, g4, sepUV, sepStrength * heroK);
    g3 = repel(g3, g5, sepUV, sepStrength * heroK);
    g3 = repel(g3, g6, sepUV, sepStrength * heroK);

    g4 = repel(g4, g1, sepUV, sepStrength * heroK);
    g4 = repel(g4, g2, sepUV, sepStrength * heroK);
    g4 = repel(g4, g3, sepUV, sepStrength * heroK);
    g4 = repel(g4, g5, sepUV, sepStrength * heroK);
    g4 = repel(g4, g6, sepUV, sepStrength * heroK);

    g5 = repel(g5, g1, sepUV, sepStrength * heroK);
    g5 = repel(g5, g2, sepUV, sepStrength * heroK);
    g5 = repel(g5, g3, sepUV, sepStrength * heroK);
    g5 = repel(g5, g4, sepUV, sepStrength * heroK);
    g5 = repel(g5, g6, sepUV, sepStrength * heroK);

    g6 = repel(g6, g1, sepUV, sepStrength * heroK);
    g6 = repel(g6, g2, sepUV, sepStrength * heroK);
    g6 = repel(g6, g3, sepUV, sepStrength * heroK);
    g6 = repel(g6, g4, sepUV, sepStrength * heroK);
    g6 = repel(g6, g5, sepUV, sepStrength * heroK);
  }

  // macro attraction
  vec4 xL, yL;
  macroLines(xL, yL);

  float LINE_ATTRACT_UV   = 0.085;
  float LINE_PULL         = 0.16;
  float INTERSECT_CHANCE  = 0.35;
  float INTERSECT_PULL    = 0.20;

  // helper macro for one ghost
  #define ATTRACT_G(G, SEED) { \
    float nx = nearestLine(G.x, xL); \
    float ny = nearestLine(G.y, yL); \
    float kx = (nx > 0.0) ? (1.0 - smoothstep(0.0, LINE_ATTRACT_UV, abs(G.x - nx))) : 0.0; \
    float ky = (ny > 0.0) ? (1.0 - smoothstep(0.0, LINE_ATTRACT_UV, abs(G.y - ny))) : 0.0; \
    float rr = hash11(SEED + floor(u_ghostTime * 0.25) * 9.1); \
    float useBoth = step(1.0 - INTERSECT_CHANCE, rr); \
    if (nx > 0.0) G.x = mix(G.x, nx, kx * LINE_PULL * (1.0 + useBoth * INTERSECT_PULL)); \
    if (ny > 0.0) G.y = mix(G.y, ny, ky * LINE_PULL * (1.0 + useBoth * INTERSECT_PULL)); \
  }

  ATTRACT_G(g1, 17.0)
  ATTRACT_G(g2, 33.0)
  ATTRACT_G(g3, 51.0)
  ATTRACT_G(g4, 68.0)
  ATTRACT_G(g5, 84.0)
  ATTRACT_G(g6, 97.0)

  #undef ATTRACT_G

  // cursor avoidance
  float maxR = max(r1, max(r2, max(r3, max(r4, max(r5, r6)))));
  float cursorAvoidUV = (rCur + maxR) * 2.10;
  float cursorAvoidStrength = 0.120;

  g1 = repel(g1, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g2 = repel(g2, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g3 = repel(g3, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g4 = repel(g4, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g5 = repel(g5, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g6 = repel(g6, cur, cursorAvoidUV, cursorAvoidStrength * heroK);

  // reveal
  float dSeg = sdSegment(cur, a, b);
  float cursorRevealBase = mix(step(dSeg, rCur), 1.0 - smoothstep(rCur, rCur + softUV, dSeg), heroK);
  float cursorReveal = cursorRevealBase * (1.0 - heroK); // HERO forces off

  float dSeg1 = sdSegment(g1, a, b);
  float dSeg2 = sdSegment(g2, a, b);
  float dSeg3 = sdSegment(g3, a, b);
  float dSeg4 = sdSegment(g4, a, b);
  float dSeg5 = sdSegment(g5, a, b);
  float dSeg6 = sdSegment(g6, a, b);

  float ghostsReveal =
    max(step(dSeg1, r1),
    max(step(dSeg2, r2),
    max(step(dSeg3, r3),
    max(step(dSeg4, r4),
    max(step(dSeg5, r5),
        step(dSeg6, r6)))))) * heroK;

  float cursorOn = (u_cursorEnabled > 0.5) ? 1.0 : 0.0;
  float combined = max(cursorReveal, ghostsReveal);
  float revealed = mix(1.0, combined, cursorOn);

  return clamp(revealed, 0.0, 1.0);
}

// Optimized version: takes pre-computed ghost positions and radii
float revealForSegmentCached(
  vec2 p, vec2 a, vec2 b, 
  vec2 cur, float rCur, float softUV, float heroK,
  vec2 g1, vec2 g2, vec2 g3, vec2 g4, vec2 g5, vec2 g6,
  float r1, float r2, float r3, float r4, float r5, float r6
) {
  // reveal
  float dSeg = sdSegment(cur, a, b);
  float cursorRevealBase = mix(step(dSeg, rCur), 1.0 - smoothstep(rCur, rCur + softUV, dSeg), heroK);
  float cursorReveal = cursorRevealBase * (1.0 - heroK); // HERO forces off

  float dSeg1 = sdSegment(g1, a, b);
  float dSeg2 = sdSegment(g2, a, b);
  float dSeg3 = sdSegment(g3, a, b);
  float dSeg4 = sdSegment(g4, a, b);
  float dSeg5 = sdSegment(g5, a, b);
  float dSeg6 = sdSegment(g6, a, b);

  float ghostsReveal =
    max(step(dSeg1, r1),
    max(step(dSeg2, r2),
    max(step(dSeg3, r3),
    max(step(dSeg4, r4),
    max(step(dSeg5, r5),
        step(dSeg6, r6)))))) * heroK;

  float cursorOn = (u_cursorEnabled > 0.5) ? 1.0 : 0.0;
  float combined = max(cursorReveal, ghostsReveal);
  float revealed = mix(1.0, combined, cursorOn);

  return clamp(revealed, 0.0, 1.0);
}

// ----------------------------------------------------
// Uniform line mask (same width everywhere)
// ----------------------------------------------------
float lineMask1D(float distToLine, float halfWidthUV, float aaUV) {
  return 1.0 - smoothstep(halfWidthUV, halfWidthUV + aaUV, distToLine);
}

// ----------------------------------------------------
// Helpers for MODE 1 — Vector Glitch Map
// ----------------------------------------------------
mat2 rot2(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float sdIrregularConvexPoly(vec2 p, int N, float seed, float baseR) {
  float d = -1e6;
  float ang0 = 6.2831853 * hash11(seed + 1.1);
  float jitter = mix(0.10, 0.55, hash11(seed + 2.2));

  for (int i = 0; i < 8; i++) {
    if (i >= N) break;
    float fi = float(i);
    float tt  = (fi + 0.5) / float(N);

    float a = ang0 + 6.2831853 * tt
            + (hash11(seed + 10.0 + fi * 3.7) - 0.5) * jitter;

    vec2 n = vec2(cos(a), sin(a));
    float r = baseR * mix(0.55, 1.05, hash11(seed + 30.0 + fi * 5.1));
    d = max(d, dot(p, n) - r);
  }
  return d;
}

float edgeMaskFromSDF(float sdf, float w, float aa) {
  return 1.0 - smoothstep(w, w + aa, abs(sdf));
}

float softCellFade(vec2 p, vec2 mn, vec2 mx, float fadeUV) {
  float dx = min(p.x - mn.x, mx.x - p.x);
  float dy = min(p.y - mn.y, mx.y - p.y);
  float d  = min(dx, dy);
  return smoothstep(0.0, fadeUV, d);
}

float distToNearestMacroRail(vec2 p, vec4 xL, vec4 yL) {
  float d = 1e9;
  if (xL.x > 0.0) d = min(d, abs(p.x - xL.x));
  if (xL.y > 0.0) d = min(d, abs(p.x - xL.y));
  if (xL.z > 0.0) d = min(d, abs(p.x - xL.z));
  if (xL.w > 0.0) d = min(d, abs(p.x - xL.w));

  if (yL.x > 0.0) d = min(d, abs(p.y - yL.x));
  if (yL.y > 0.0) d = min(d, abs(p.y - yL.y));
  if (yL.z > 0.0) d = min(d, abs(p.y - yL.z));
  if (yL.w > 0.0) d = min(d, abs(p.y - yL.w));

  return d;
}

// ----------------------------------------------------
// MODE 0 — Dense BSP layout + cursor/ghost reveal
// ----------------------------------------------------
vec3 glitchGrid(vec2 uvN) {
  vec3 bg  = beigeBG();
  vec3 col = bg;

  float pxUnit = 1.0 / max(min(u_resolution.x, u_resolution.y), 1.0);

  // Phase A: calm parameter integration
  float calmK = clamp(u_calm, 0.0, 1.0);

  // Phase B: Control subdivision depth dynamically
  // Range 0.3-1.5: lower = fewer/larger rectangles, higher = more/smaller rectangles
  float depthControl = clamp(u_gridSubdivisionDepth, 0.3, 1.5);
  
  const int MAX_L        = 10;
  const int EARLY_SPLITS = 4;
  // STOP_START: when early stopping begins (lower = stops earlier = larger cells)
  int STOP_START_BASE = 6;
  int STOP_START   = int(float(STOP_START_BASE) * depthControl);
  STOP_START = clamp(STOP_START, 3, 9);
  
  // STOP probabilities: higher = more likely to stop = larger cells
  float STOP_BASE        = 0.10 * (2.0 - depthControl);  // Inverse: lower depth = higher stop chance
  float STOP_SLOPE       = 0.12 * (2.0 - depthControl);

  float seed = 101.37;

  // Apply calm to line thickness (thinner lines when calm)
  // Phase B: Apply gridLineWidth multiplier
  float LINE_PX = 2.0 * mix(0.65, 1.0, calmK) * clamp(u_gridLineWidth, 0.5, 2.5);
  float halfW   = 0.5 * LINE_PX * pxUnit;
  float aa = max(pxUnit, fwidth(uvN.x) + fwidth(uvN.y)) * 0.9;

  vec2 p = clamp(uvN, 0.0, 1.0);

  vec2 bmin = vec2(0.0);
  vec2 bmax = vec2(1.0);

  float Lpos = 0.0, Rpos = 1.0, Bpos = 0.0, Tpos = 1.0;
  float Lrev = 1.0, Rrev = 1.0, Brev = 1.0, Trev = 1.0;
  float Llvl = -999.0, Rlvl = -999.0, Blvl = -999.0, Tlvl = -999.0;

  vec2 cur = clamp(u_mouse, 0.0, 1.0);
  float heroK  = smoothstep(0.70, 0.95, u_spatialMotion);
  float readK  = 1.0 - smoothstep(0.12, 0.18, u_temporalMotion);

  float readRadiusScale = mix(1.0, 0.28, readK);

  int ALWAYS_ON = 5;
  if (readK > 0.5) ALWAYS_ON = 3;
  if (heroK > 0.5) ALWAYS_ON = 9;
  ALWAYS_ON = clamp(ALWAYS_ON, 1, MAX_L);
  float aOn = float(ALWAYS_ON);

  // PRE-COMPUTE GHOST POSITIONS (once per pixel, not per BSP iteration)
  float centerK = centerKFromCursor(cur);
  float baseRpx = mix(260.0, 150.0, heroK);
  baseRpx *= readRadiusScale;
  float softPx = mix(28.0, 55.0, heroK);
  float softUV = softPx * pxUnit;
  float rCur = baseRpx * pxUnit;

  float t = u_ghostTime;
  vec2 padMin = vec2(0.14, 0.14);
  vec2 padMax = vec2(0.86, 0.86);
  float dwell = 0.28;

  vec2 g1 = ghostHopPos(t, 17.7, 6.8, dwell, padMin, padMax);
  vec2 g2 = ghostHopPos(t, 33.3, 7.6, dwell, padMin, padMax);
  vec2 g3 = ghostHopPos(t, 51.1, 8.4, dwell, padMin, padMax);
  vec2 g4 = ghostHopPos(t, 68.2, 5.9, dwell, padMin, padMax);
  vec2 g5 = ghostHopPos(t, 84.6, 9.2, dwell, padMin, padMax);
  vec2 g6 = ghostHopPos(t, 97.9, 7.1, dwell, padMin, padMax);

  float p1 = 0.5 + 0.5 * sin(t * 0.42 + 1.1);
  float p2 = 0.5 + 0.5 * sin(t * 0.36 + 2.7);
  float p3 = 0.5 + 0.5 * sin(t * 0.48 + 4.2);
  float p4 = 0.5 + 0.5 * sin(t * 0.40 + 0.6);
  float p5 = 0.5 + 0.5 * sin(t * 0.33 + 5.1);
  float p6 = 0.5 + 0.5 * sin(t * 0.46 + 3.3);

  float r1 = (baseRpx * mix(0.46, 0.76, p1)) * pxUnit;
  float r2 = (baseRpx * mix(0.50, 0.83, p2)) * pxUnit;
  float r3 = (baseRpx * mix(0.54, 0.97, p3)) * pxUnit;
  float r4 = (baseRpx * mix(0.44, 0.72, p4)) * pxUnit;
  float r5 = (baseRpx * mix(0.48, 0.86, p5)) * pxUnit;
  float r6 = (baseRpx * mix(0.52, 0.92, p6)) * pxUnit;

  float s12 = mix(1.0, 0.70, centerK);
  float s3  = mix(1.0, 1.25, centerK);
  r1 *= s12; r2 *= s12; r3 *= s3;

  // separation
  float sepUV = 0.42;
  float sepStrength = 0.070;

  for (int it = 0; it < 2; it++) {
    g1 = repel(g1, g2, sepUV, sepStrength * heroK);
    g1 = repel(g1, g3, sepUV, sepStrength * heroK);
    g1 = repel(g1, g4, sepUV, sepStrength * heroK);
    g1 = repel(g1, g5, sepUV, sepStrength * heroK);
    g1 = repel(g1, g6, sepUV, sepStrength * heroK);

    g2 = repel(g2, g1, sepUV, sepStrength * heroK);
    g2 = repel(g2, g3, sepUV, sepStrength * heroK);
    g2 = repel(g2, g4, sepUV, sepStrength * heroK);
    g2 = repel(g2, g5, sepUV, sepStrength * heroK);
    g2 = repel(g2, g6, sepUV, sepStrength * heroK);

    g3 = repel(g3, g1, sepUV, sepStrength * heroK);
    g3 = repel(g3, g2, sepUV, sepStrength * heroK);
    g3 = repel(g3, g4, sepUV, sepStrength * heroK);
    g3 = repel(g3, g5, sepUV, sepStrength * heroK);
    g3 = repel(g3, g6, sepUV, sepStrength * heroK);

    g4 = repel(g4, g1, sepUV, sepStrength * heroK);
    g4 = repel(g4, g2, sepUV, sepStrength * heroK);
    g4 = repel(g4, g3, sepUV, sepStrength * heroK);
    g4 = repel(g4, g5, sepUV, sepStrength * heroK);
    g4 = repel(g4, g6, sepUV, sepStrength * heroK);

    g5 = repel(g5, g1, sepUV, sepStrength * heroK);
    g5 = repel(g5, g2, sepUV, sepStrength * heroK);
    g5 = repel(g5, g3, sepUV, sepStrength * heroK);
    g5 = repel(g5, g4, sepUV, sepStrength * heroK);
    g5 = repel(g5, g6, sepUV, sepStrength * heroK);

    g6 = repel(g6, g1, sepUV, sepStrength * heroK);
    g6 = repel(g6, g2, sepUV, sepStrength * heroK);
    g6 = repel(g6, g3, sepUV, sepStrength * heroK);
    g6 = repel(g6, g4, sepUV, sepStrength * heroK);
    g6 = repel(g6, g5, sepUV, sepStrength * heroK);
  }

  // macro attraction
  vec4 xL, yL;
  macroLines(xL, yL);

  float LINE_ATTRACT_UV   = 0.085;
  float LINE_PULL         = 0.16;
  float INTERSECT_CHANCE  = 0.35;
  float INTERSECT_PULL    = 0.20;

  #define ATTRACT_G(G, SEED) { \
    float nx = nearestLine(G.x, xL); \
    float ny = nearestLine(G.y, yL); \
    float kx = (nx > 0.0) ? (1.0 - smoothstep(0.0, LINE_ATTRACT_UV, abs(G.x - nx))) : 0.0; \
    float ky = (ny > 0.0) ? (1.0 - smoothstep(0.0, LINE_ATTRACT_UV, abs(G.y - ny))) : 0.0; \
    float rr = hash11(SEED + floor(u_ghostTime * 0.25) * 9.1); \
    float useBoth = step(1.0 - INTERSECT_CHANCE, rr); \
    if (nx > 0.0) G.x = mix(G.x, nx, kx * LINE_PULL * (1.0 + useBoth * INTERSECT_PULL)); \
    if (ny > 0.0) G.y = mix(G.y, ny, ky * LINE_PULL * (1.0 + useBoth * INTERSECT_PULL)); \
  }

  ATTRACT_G(g1, 17.0)
  ATTRACT_G(g2, 33.0)
  ATTRACT_G(g3, 51.0)
  ATTRACT_G(g4, 68.0)
  ATTRACT_G(g5, 84.0)
  ATTRACT_G(g6, 97.0)

  #undef ATTRACT_G

  // cursor avoidance
  float maxR = max(r1, max(r2, max(r3, max(r4, max(r5, r6)))));
  float cursorAvoidUV = (rCur + maxR) * 2.10;
  float cursorAvoidStrength = 0.120;

  g1 = repel(g1, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g2 = repel(g2, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g3 = repel(g3, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g4 = repel(g4, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g5 = repel(g5, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g6 = repel(g6, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  // END GHOST PRE-COMPUTATION

  for (int i = 0; i < MAX_L; i++) {
    float lvl = float(i);

    float rStop = hash11(seed + lvl * 12.71 + 3.17);
    float rAxis = hash11(seed + lvl *  9.31 + 1.27);
    float rRat  = hash11(seed + lvl *  7.77 + 4.41);

    if (i >= STOP_START) {
      float stopProb = clamp(STOP_BASE + STOP_SLOPE * (lvl - float(STOP_START)), 0.0, 0.80);

      vec2 curSizeIter = bmax - bmin;
      float curAreaIter = curSizeIter.x * curSizeIter.y;
      
      // Skip tiny cells aggressively
      if (curAreaIter < 0.0015) break;

      float TARGET_MED_AREA = 0.080;
      float TARGET_BIG_AREA = 0.300;
      float medBand = 1.0 - smoothstep(TARGET_MED_AREA, TARGET_BIG_AREA, curAreaIter);

      float rMix = hash11(seed + lvl * 41.7 + floor((bmin.x + bmin.y) * 31.0) * 7.3);
      float MED_STOP_CHANCE = 0.55;
      float forceContinue = medBand * (1.0 - step(1.0 - MED_STOP_CHANCE, rMix));

      if (forceContinue < 0.5) {
        if (rStop < stopProb) break;
      }
    }

    vec2 curSize = bmax - bmin;
    float preferX = step(curSize.y, curSize.x);
    float flip    = step(0.70, rAxis);
    float splitX  = mix(preferX, 1.0 - preferX, flip);

    float baseRatio;
    if (i < EARLY_SPLITS) {
      float PHI  = 0.61803398875;
      float pick = step(0.5, rRat);
      float phiRatio = mix(1.0 - PHI, PHI, pick);
      float dev = (hash11(seed + lvl * 5.91 + 8.13) - 0.5) * 0.06;
      baseRatio = phiRatio + dev;
    } else {
      baseRatio = mix(0.40, 0.60, rRat);
    }

    float ratio = clamp(baseRatio, 0.20, 0.80);
    float splitPosX = mix(bmin.x, bmax.x, ratio);
    float splitPosY = mix(bmin.y, bmax.y, ratio);
    float splitPos  = mix(splitPosY, splitPosX, splitX);

    float segRev = 1.0;

    if (splitX > 0.5) {
      vec2 a = vec2(splitPos, bmin.y);
      vec2 b = vec2(splitPos, bmax.y);
      segRev = revealForSegmentCached(p, a, b, cur, rCur, softUV, heroK, g1, g2, g3, g4, g5, g6, r1, r2, r3, r4, r5, r6);
      if (i < ALWAYS_ON) segRev = 1.0;

      if (p.x < splitPos) {
        bmax.x = splitPos;
        Rpos = splitPos; Rrev = segRev; Rlvl = lvl;
      } else {
        bmin.x = splitPos;
        Lpos = splitPos; Lrev = segRev; Llvl = lvl;
      }
    } else {
      vec2 a = vec2(bmin.x, splitPos);
      vec2 b = vec2(bmax.x, splitPos);
      segRev = revealForSegmentCached(p, a, b, cur, rCur, softUV, heroK, g1, g2, g3, g4, g5, g6, r1, r2, r3, r4, r5, r6);
      if (i < ALWAYS_ON) segRev = 1.0;

      if (p.y < splitPos) {
        bmax.y = splitPos;
        Tpos = splitPos; Trev = segRev; Tlvl = lvl;
      } else {
        bmin.y = splitPos;
        Bpos = splitPos; Brev = segRev; Blvl = lvl;
      }
    }
  }

  vec2 size = bmax - bmin;
  float area = size.x * size.y;

  float minRev = min(min(Lrev, Rrev), min(Brev, Trev));
  float fullyBordered = step(0.999, minRev);

  float BORDER_T = 0.85;
  float bL = step(BORDER_T, Lrev);
  float bR = step(BORDER_T, Rrev);
  float bB = step(BORDER_T, Brev);
  float bT = step(BORDER_T, Trev);
  float borderCount = bL + bR + bB + bT;

  vec2 cellID = floor((bmin + bmax) * 97.0);
  float rFill = hash21(cellID + vec2(31.7, 9.2));

  // Simplified random fill control - applies to all cell sizes
  // gridSmallFills: 0=no random fills, 1=all cells filled
  float fillThreshold = clamp(u_gridSmallFills, 0.0, 1.0);
  
  // Require cells to have borders to be eligible for fill
  float canFill = step(2.5, borderCount);
  
  // Simple RNG check: if random value < threshold, fill it
  float fillRandom = canFill * step(rFill, fillThreshold);
  
  // Ghost-influenced fills: calculate direct distance to cursor/ghosts
  // This is independent of BSP reveal system and ALWAYS_ON forcing
  vec2 cellCenter = (bmin + bmax) * 0.5;
  vec2 cellSize = bmax - bmin;
  float cellRadius = length(cellSize) * 0.5;  // Half diagonal of cell
  
  // Separate cursor and ghost distances
  float dCur = max(0.0, length(cellCenter - cur) - cellRadius);
  float dG1 = max(0.0, length(cellCenter - g1) - cellRadius);
  float dG2 = max(0.0, length(cellCenter - g2) - cellRadius);
  float dG3 = max(0.0, length(cellCenter - g3) - cellRadius);
  float dG4 = max(0.0, length(cellCenter - g4) - cellRadius);
  float dG5 = max(0.0, length(cellCenter - g5) - cellRadius);
  float dG6 = max(0.0, length(cellCenter - g6) - cellRadius);
  
  // Cursor proximity (for AMBIENT mode only)
  float cursorProx = 1.0 - smoothstep(0.0, rCur, dCur);
  
  // Ghost proximity (for HERO mode only)
  float ghostProx = 0.0;
  ghostProx = max(ghostProx, 1.0 - smoothstep(0.0, r1, dG1));
  ghostProx = max(ghostProx, 1.0 - smoothstep(0.0, r2, dG2));
  ghostProx = max(ghostProx, 1.0 - smoothstep(0.0, r3, dG3));
  ghostProx = max(ghostProx, 1.0 - smoothstep(0.0, r4, dG4));
  ghostProx = max(ghostProx, 1.0 - smoothstep(0.0, r5, dG5));
  ghostProx = max(ghostProx, 1.0 - smoothstep(0.0, r6, dG6));
  
  // Mode-specific fills:
  // HERO (heroK > 0.5): Only ghosts fill, not cursor
  // AMBIENT (heroK < 0.5, readK < 0.5): Only cursor fills
  // READ (readK > 0.5): No proximity fills at all
  float cursorFill = step(0.6, cursorProx) * step(heroK, 0.5) * step(readK, 0.5);
  float ghostsFill = step(0.6, ghostProx) * step(0.5, heroK);
  float ghostFill = max(cursorFill, ghostsFill);
  
  // Combine: fill if random OR ghost-revealed
  float fillOn = max(fillRandom, ghostFill);
  
  float pick = hash21(cellID + vec2(4.1, 22.7));

  // Phase A: flowDir integration (directional color temperature shift)
  vec2 flowVec = vec2(cos(u_flowDir), sin(u_flowDir));
  vec2 cellC = 0.5 * (bmin + bmax);
  float flowBias = dot(normalize(cellC - 0.5), flowVec);
  float warmth = flowBias * 0.5 + 0.5;  // 0-1 range

  // Apply subtle temperature shift based on direction
  vec3 fillCol;
  if (pick < 0.34) fillCol = mix(cYel(), cBlue(), warmth * 0.15);
  else if (pick < 0.67) fillCol = mix(cBlue(), cYel(), warmth * 0.12);
  else fillCol = mix(cRed(), cMag(), warmth * 0.10);
  if (pick < 0.34) fillCol = cYel();
  else if (pick < 0.67) fillCol = cBlue();
  else fillCol = cRed();

  col = mix(col, fillCol, fillOn);

  // Gate logic: for borders beyond ALWAYS_ON level, allow reveals OR fills to open the gate
  float gateL = (Llvl < aOn) ? 1.0 : max(fillOn, Lrev);
  float gateR = (Rlvl < aOn) ? 1.0 : max(fillOn, Rrev);
  float gateB = (Blvl < aOn) ? 1.0 : max(fillOn, Brev);
  float gateT = (Tlvl < aOn) ? 1.0 : max(fillOn, Trev);

  gateL = mix(1.0, gateL, heroK);
  gateR = mix(1.0, gateR, heroK);
  gateB = mix(1.0, gateB, heroK);
  gateT = mix(1.0, gateT, heroK);

  float dL = abs(p.x - Lpos);
  float dR = abs(p.x - Rpos);
  float dB = abs(p.y - Bpos);
  float dT = abs(p.y - Tpos);

  float Ldraw = max(Lrev, fillOn);
  float Rdraw = max(Rrev, fillOn);
  float Bdraw = max(Brev, fillOn);
  float Tdraw = max(Trev, fillOn);

  float mL = lineMask1D(dL, halfW, aa) * Ldraw * gateL;
  float mR = lineMask1D(dR, halfW, aa) * Rdraw * gateR;
  float mB = lineMask1D(dB, halfW, aa) * Bdraw * gateB;
  float mT = lineMask1D(dT, halfW, aa) * Tdraw * gateT;

  float borderMask = max(max(mL, mR), max(mB, mT));
  col = mix(col, ink(), clamp(borderMask, 0.0, 1.0));

  float dd = dither01(gl_FragCoord.xy + vec2(19.7, 73.3));
  col += dd * (1.0 / 255.0) * 0.65;

  return clamp(col, 0.0, 1.0);
}

// ----------------------------------------------------
// MODE 1 — Vector Glitch Map (broken-glass shards)
// ----------------------------------------------------
vec3 vectorGlitchMap(vec2 uvN) {
  vec3 col = beigeBG();

  float pxUnit = 1.0 / max(min(u_resolution.x, u_resolution.y), 1.0);
  float aa = max(pxUnit, fwidth(uvN.x) + fwidth(uvN.y)) * 0.9;

  vec2 p = clamp(uvN, 0.0, 1.0);

  vec2 cur = clamp(u_mouse, 0.0, 1.0);
  float heroK = smoothstep(0.70, 0.95, u_spatialMotion);
  float readK = 1.0 - smoothstep(0.12, 0.18, u_temporalMotion);
  float ambientK = 1.0 - readK;

  // Phase A: calm parameter integration
  float calmK = clamp(u_calm, 0.0, 1.0);

  // BSP traversal (same backbone as Mode 0)
  const int MAX_L        = 10;
  const int EARLY_SPLITS = 4;
  const int STOP_START   = 6;

  float STOP_BASE  = 0.10;
  float STOP_SLOPE = 0.12;

  float PHI  = 0.61803398875;
  float seed = 101.37;

  vec2 bmin = vec2(0.0);
  vec2 bmax = vec2(1.0);

  float Lrev = 1.0, Rrev = 1.0, Brev = 1.0, Trev = 1.0;
  float Llvl = -999.0, Rlvl = -999.0, Blvl = -999.0, Tlvl = -999.0;
  float Lpos = 0.0,  Rpos = 1.0,  Bpos = 0.0,  Tpos = 1.0;

  int ALWAYS_ON = 5;
  if (readK > 0.5) ALWAYS_ON = 3;
  if (heroK > 0.5) ALWAYS_ON = 9;
  ALWAYS_ON = clamp(ALWAYS_ON, 1, MAX_L);

  // PRE-COMPUTE GHOST POSITIONS (once per pixel, not per BSP iteration)
  float centerK = centerKFromCursor(cur);
  float baseRpx = mix(260.0, 150.0, heroK);
  float readRadiusScale = mix(1.0, 0.28, readK);
  baseRpx *= readRadiusScale;
  float softPx = mix(28.0, 55.0, heroK);
  float softUV = softPx * pxUnit;
  float rCur = baseRpx * pxUnit;

  float t = u_ghostTime;
  vec2 padMin = vec2(0.14, 0.14);
  vec2 padMax = vec2(0.86, 0.86);
  float dwell = 0.28;

  vec2 g1 = ghostHopPos(t, 17.7, 6.8, dwell, padMin, padMax);
  vec2 g2 = ghostHopPos(t, 33.3, 7.6, dwell, padMin, padMax);
  vec2 g3 = ghostHopPos(t, 51.1, 8.4, dwell, padMin, padMax);
  vec2 g4 = ghostHopPos(t, 68.2, 5.9, dwell, padMin, padMax);
  vec2 g5 = ghostHopPos(t, 84.6, 9.2, dwell, padMin, padMax);
  vec2 g6 = ghostHopPos(t, 97.9, 7.1, dwell, padMin, padMax);

  float p1 = 0.5 + 0.5 * sin(t * 0.42 + 1.1);
  float p2 = 0.5 + 0.5 * sin(t * 0.36 + 2.7);
  float p3 = 0.5 + 0.5 * sin(t * 0.48 + 4.2);
  float p4 = 0.5 + 0.5 * sin(t * 0.40 + 0.6);
  float p5 = 0.5 + 0.5 * sin(t * 0.33 + 5.1);
  float p6 = 0.5 + 0.5 * sin(t * 0.46 + 3.3);

  float r1 = (baseRpx * mix(0.46, 0.76, p1)) * pxUnit;
  float r2 = (baseRpx * mix(0.50, 0.83, p2)) * pxUnit;
  float r3 = (baseRpx * mix(0.54, 0.97, p3)) * pxUnit;
  float r4 = (baseRpx * mix(0.44, 0.72, p4)) * pxUnit;
  float r5 = (baseRpx * mix(0.48, 0.86, p5)) * pxUnit;
  float r6 = (baseRpx * mix(0.52, 0.92, p6)) * pxUnit;

  float s12 = mix(1.0, 0.70, centerK);
  float s3  = mix(1.0, 1.25, centerK);
  r1 *= s12; r2 *= s12; r3 *= s3;

  float sepUV = 0.42;
  float sepStrength = 0.070;

  for (int it = 0; it < 2; it++) {
    g1 = repel(g1, g2, sepUV, sepStrength * heroK);
    g1 = repel(g1, g3, sepUV, sepStrength * heroK);
    g1 = repel(g1, g4, sepUV, sepStrength * heroK);
    g1 = repel(g1, g5, sepUV, sepStrength * heroK);
    g1 = repel(g1, g6, sepUV, sepStrength * heroK);

    g2 = repel(g2, g1, sepUV, sepStrength * heroK);
    g2 = repel(g2, g3, sepUV, sepStrength * heroK);
    g2 = repel(g2, g4, sepUV, sepStrength * heroK);
    g2 = repel(g2, g5, sepUV, sepStrength * heroK);
    g2 = repel(g2, g6, sepUV, sepStrength * heroK);

    g3 = repel(g3, g1, sepUV, sepStrength * heroK);
    g3 = repel(g3, g2, sepUV, sepStrength * heroK);
    g3 = repel(g3, g4, sepUV, sepStrength * heroK);
    g3 = repel(g3, g5, sepUV, sepStrength * heroK);
    g3 = repel(g3, g6, sepUV, sepStrength * heroK);

    g4 = repel(g4, g1, sepUV, sepStrength * heroK);
    g4 = repel(g4, g2, sepUV, sepStrength * heroK);
    g4 = repel(g4, g3, sepUV, sepStrength * heroK);
    g4 = repel(g4, g5, sepUV, sepStrength * heroK);
    g4 = repel(g4, g6, sepUV, sepStrength * heroK);

    g5 = repel(g5, g1, sepUV, sepStrength * heroK);
    g5 = repel(g5, g2, sepUV, sepStrength * heroK);
    g5 = repel(g5, g3, sepUV, sepStrength * heroK);
    g5 = repel(g5, g4, sepUV, sepStrength * heroK);
    g5 = repel(g5, g6, sepUV, sepStrength * heroK);

    g6 = repel(g6, g1, sepUV, sepStrength * heroK);
    g6 = repel(g6, g2, sepUV, sepStrength * heroK);
    g6 = repel(g6, g3, sepUV, sepStrength * heroK);
    g6 = repel(g6, g4, sepUV, sepStrength * heroK);
    g6 = repel(g6, g5, sepUV, sepStrength * heroK);
  }

  vec4 xL, yL;
  macroLines(xL, yL);

  float LINE_ATTRACT_UV   = 0.085;
  float LINE_PULL         = 0.16;
  float INTERSECT_CHANCE  = 0.35;
  float INTERSECT_PULL    = 0.20;

  #define ATTRACT_G(G, SEED) { \
    float nx = nearestLine(G.x, xL); \
    float ny = nearestLine(G.y, yL); \
    float kx = (nx > 0.0) ? (1.0 - smoothstep(0.0, LINE_ATTRACT_UV, abs(G.x - nx))) : 0.0; \
    float ky = (ny > 0.0) ? (1.0 - smoothstep(0.0, LINE_ATTRACT_UV, abs(G.y - ny))) : 0.0; \
    float rr = hash11(SEED + floor(u_ghostTime * 0.25) * 9.1); \
    float useBoth = step(1.0 - INTERSECT_CHANCE, rr); \
    if (nx > 0.0) G.x = mix(G.x, nx, kx * LINE_PULL * (1.0 + useBoth * INTERSECT_PULL)); \
    if (ny > 0.0) G.y = mix(G.y, ny, ky * LINE_PULL * (1.0 + useBoth * INTERSECT_PULL)); \
  }

  ATTRACT_G(g1, 17.0)
  ATTRACT_G(g2, 33.0)
  ATTRACT_G(g3, 51.0)
  ATTRACT_G(g4, 68.0)
  ATTRACT_G(g5, 84.0)
  ATTRACT_G(g6, 97.0)

  #undef ATTRACT_G

  float maxR = max(r1, max(r2, max(r3, max(r4, max(r5, r6)))));
  float cursorAvoidUV = (rCur + maxR) * 2.10;
  float cursorAvoidStrength = 0.120;

  g1 = repel(g1, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g2 = repel(g2, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g3 = repel(g3, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g4 = repel(g4, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g5 = repel(g5, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g6 = repel(g6, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  // END GHOST PRE-COMPUTATION

  for (int i = 0; i < MAX_L; i++) {
    float lvl = float(i);

    float rStop = hash11(seed + lvl * 12.71 + 3.17);
    float rAxis = hash11(seed + lvl *  9.31 + 1.27);
    float rRat  = hash11(seed + lvl *  7.77 + 4.41);

    if (i >= STOP_START) {
      float stopProb = clamp(STOP_BASE + STOP_SLOPE * (lvl - float(STOP_START)), 0.0, 0.80);

      vec2 curSizeIter = bmax - bmin;
      float curAreaIter = curSizeIter.x * curSizeIter.y;

      float TARGET_MED_AREA = 0.080;
      float TARGET_BIG_AREA = 0.300;
      float medBand = 1.0 - smoothstep(TARGET_MED_AREA, TARGET_BIG_AREA, curAreaIter);

      float rMix = hash11(seed + lvl * 41.7 + floor((bmin.x + bmin.y) * 31.0) * 7.3);
      float MED_STOP_CHANCE = 0.55;
      float forceContinue = medBand * (1.0 - step(1.0 - MED_STOP_CHANCE, rMix));

      if (forceContinue < 0.5) {
        if (rStop < stopProb) break;
      }
    }

    vec2 curSize = bmax - bmin;
    float preferX = step(curSize.y, curSize.x);
    float flip    = step(0.70, rAxis);
    float splitX  = mix(preferX, 1.0 - preferX, flip);

    float baseRatio;
    if (i < EARLY_SPLITS) {
      float pick = step(0.5, rRat);
      float phiRatio = mix(1.0 - PHI, PHI, pick);
      float dev = (hash11(seed + lvl * 5.91 + 8.13) - 0.5) * 0.06;
      baseRatio = phiRatio + dev;
    } else {
      baseRatio = mix(0.40, 0.60, rRat);
    }

    float ratio = clamp(baseRatio, 0.20, 0.80);

    float splitPosX = mix(bmin.x, bmax.x, ratio);
    float splitPosY = mix(bmin.y, bmax.y, ratio);
    float splitPos  = mix(splitPosY, splitPosX, splitX);

    float segRev = 1.0;

    if (splitX > 0.5) {
      vec2 a = vec2(splitPos, bmin.y);
      vec2 b = vec2(splitPos, bmax.y);
      segRev = revealForSegmentCached(p, a, b, cur, rCur, softUV, heroK, g1, g2, g3, g4, g5, g6, r1, r2, r3, r4, r5, r6);
      if (i < ALWAYS_ON) segRev = 1.0;

      if (p.x < splitPos) { bmax.x = splitPos; Rpos = splitPos; Rrev = segRev; Rlvl = lvl; }
      else                { bmin.x = splitPos; Lpos = splitPos; Lrev = segRev; Llvl = lvl; }
    } else {
      vec2 a = vec2(bmin.x, splitPos);
      vec2 b = vec2(bmax.x, splitPos);
      segRev = revealForSegmentCached(p, a, b, cur, rCur, softUV, heroK, g1, g2, g3, g4, g5, g6, r1, r2, r3, r4, r5, r6);
      if (i < ALWAYS_ON) segRev = 1.0;

      if (p.y < splitPos) { bmax.y = splitPos; Tpos = splitPos; Trev = segRev; Tlvl = lvl; }
      else                { bmin.y = splitPos; Bpos = splitPos; Brev = segRev; Blvl = lvl; }
    }
  }

  vec2 size = max(bmax - bmin, vec2(1e-5));
  float area = size.x * size.y;
  vec2 c = 0.5 * (bmin + bmax);

  float minRev = min(min(Lrev, Rrev), min(Brev, Trev));
  float revealK = smoothstep(0.35, 0.95, minRev);

  float cellFade = softCellFade(p, bmin, bmax, 18.0 * pxUnit);

  vec2 cellID = floor((bmin + bmax) * 97.0);
  float r0 = hash21(cellID + vec2(10.1, 3.7));

  float dC = distance(c, cur);
  float proxR0 = mix(0.09, 0.06, readK);
  float proxR1 = mix(0.30, 0.18, readK);
  float prox = 1.0 - smoothstep(proxR0, proxR1, dC);
  prox *= (1.0 - 0.25 * smoothstep(0.25, 0.55, area));

  float s = max(min(size.x, size.y), 1e-5);
  vec2 q0 = (p - c) / s;

  int SHARDS = 2;
  if (prox > 0.03) SHARDS = 6;
  if (prox > 0.18) SHARDS = 8;
  if (heroK > 0.5) SHARDS = 6;
  SHARDS = clamp(SHARDS, 2, 8);
  
  // Apply calm to reduce shard count (calmer = fewer shards)
  // Phase B: Apply shardCount multiplier
  int shardMult = int(mix(0.65, 1.0, 1.0 - calmK) * float(SHARDS) * clamp(u_shardCount, 0.3, 2.0));
  SHARDS = clamp(shardMult, 2, 8);

  vec3 outCol = col;

  for (int si = 0; si < 8; si++) {
    if (si >= SHARDS) break;

    float sSeed = r0 * 1000.0 + float(si) * 91.7 + 17.0;
    vec2 o = (hash22(sSeed + 13.7) - 0.5) * (0.18 + 0.24 * prox);

    // Phase A: flowDir integration (directional phase offset)
    vec2 flowVec = vec2(cos(u_flowDir), sin(u_flowDir));
    vec2 cellC2 = 0.5 * (bmin + bmax);
    float flowPhaseOffset = dot(cellC2 - 0.5, flowVec) * 2.0;

    // Apply calm to slow down wobble animation
    // Phase B: Apply shardSpeed multiplier
    float ph = u_time * 0.40 * mix(0.35, 1.0, 1.0 - calmK) * clamp(u_shardSpeed, 0.0, 2.0) + flowPhaseOffset;
    float wob = (sin(ph) * 0.5 + 0.5);
    float z = 1.0 + prox * (0.35 + 0.45 * wob);

    // Apply calm to reduce rotation chaos
    // Phase B: Apply shardChaos multiplier
    float rotA = (hash11(sSeed + 5.0) - 0.5) * (0.80 * prox) * mix(0.40, 1.0, 1.0 - calmK) * clamp(u_shardChaos, 0.0, 2.0);
    float sc   = (1.0 + (hash11(sSeed + 8.0) - 0.5) * 0.18 * prox) * z;

    vec2 qq = q0 + o;
    qq = rot2(rotA) * (qq * sc);

    int N = 3 + int(floor(hash11(sSeed + 9.0) * 6.0));
    float baseR = mix(0.16, 0.40, hash11(sSeed + 11.0)) * mix(1.0, 0.78, float(si) / 7.0);

    float sdf = sdIrregularConvexPoly(qq, N, sSeed, baseR);

    float fill = 1.0 - smoothstep(0.0, aa / s, sdf);
    float edge = edgeMaskFromSDF(sdf, 0.010, aa / s);

    fill *= revealK * cellFade;
    edge *= revealK * cellFade;

    float pr = hash11(sSeed + 21.0);
    vec3 accent = (pr < 0.33) ? cBlue() : (pr < 0.66) ? cYel() : cRed();

    float colorBoost = smoothstep(0.02, 0.35, prox);
    colorBoost = mix(colorBoost, 1.0, readK * smoothstep(0.10, 0.55, prox));

    vec2 e = vec2(0.004, 0.0);
    float sx = sdIrregularConvexPoly(qq + e.xy, N, sSeed, baseR) - sdIrregularConvexPoly(qq - e.xy, N, sSeed, baseR);
    float sy = sdIrregularConvexPoly(qq + e.yx, N, sSeed, baseR) - sdIrregularConvexPoly(qq - e.yx, N, sSeed, baseR);
    vec3 nrm = normalize(vec3(sx, sy, 0.08));
    vec3 lgt = normalize(vec3(-0.35, 0.55, 0.75));
    float lit = clamp(dot(nrm, lgt) * 0.5 + 0.65, 0.0, 1.0);

    float alphaBase = mix(0.08, 0.22, ambientK);
    alphaBase = mix(alphaBase, 0.26, readK);
    alphaBase *= mix(0.35, 1.0, smoothstep(0.06, 0.32, prox));

    vec3 shardBase = mix(vec3(0.10), accent, 0.28 + 0.70 * colorBoost);
    shardBase *= lit;

    // Apply calm to slow down flicker
    // Phase B: Apply shardSpeed to flicker as well
    float tick = floor(u_time * mix(6.0, 12.0, pr) * mix(0.45, 1.0, 1.0 - calmK) * clamp(u_shardSpeed, 0.0, 2.0));
    float flick = step(0.70, hash11(tick + sSeed * 0.13));
    float popK = flick * smoothstep(0.06, 0.95, prox);

    vec3 popCol = vec3(accent.r, accent.g * 0.65, accent.b * 1.15);
    popCol = clamp(popCol, 0.0, 1.0);

    outCol = mix(outCol, shardBase, alphaBase * fill);
    outCol = mix(outCol, mix(vec3(0.08), accent, 0.45 + 0.45 * colorBoost), (alphaBase * 0.95) * edge);
    outCol = mix(outCol, popCol, (0.14 + 0.55 * prox) * popK * fill);
  }

  col = outCol;

  float dd = dither01(gl_FragCoord.xy + vec2(19.7, 73.3));
  col += dd * (1.0 / 255.0) * 0.65;

  return clamp(col, 0.0, 1.0);
}

// ----------------------------------------------------
// MODE 2 — Signal Flow / Field Lines (UPDATED)
// - removes straight macro-rail coloured lines entirely
// - puts colour/glow ON the curvy lines (visible in READ/AMBIENT)
// ----------------------------------------------------
vec3 signalFlow(vec2 uvN) {
  vec3 bg  = beigeBG();
  vec3 col = bg;

  float pxUnit = 1.0 / max(min(u_resolution.x, u_resolution.y), 1.0);
  float aa = max(pxUnit, fwidth(uvN.x) + fwidth(uvN.y)) * 1.1;

  vec2 p   = clamp(uvN, 0.0, 1.0);
  vec2 cur = clamp(u_mouse, 0.0, 1.0);

  float heroK = smoothstep(0.70, 0.95, u_spatialMotion);
  float readK = 1.0 - smoothstep(0.12, 0.18, u_temporalMotion);
  float calmK = clamp(u_calm, 0.0, 1.0);

  // Phase B: Apply flowDensity multiplier
  float density = mix(0.65, 1.35, heroK);
  density *= mix(0.80, 0.55, readK);
  density *= clamp(u_flowDensity, 0.4, 2.0);

  float scale = mix(3.2, 6.8, heroK);
  scale *= mix(0.85, 0.70, readK);

  float baseSpeed = mix(0.06, 0.28, u_temporalMotion);
  float speed = baseSpeed * mix(0.20, 1.0, 1.0 - calmK);
  speed *= mix(0.55, 1.15, heroK);

  // Phase B: Apply flowWarp multiplier
  float warp = mix(0.35, 0.85, heroK);
  warp *= mix(0.55, 1.0, 1.0 - 0.65 * readK);
  warp *= clamp(u_flowWarp, 0.0, 2.0);

  float t = u_time * speed;

  float cursorOn = (u_cursorEnabled > 0.5) ? 1.0 : 0.0;
  float dC = distance(p, cur);

  float bendR0 = mix(0.14, 0.22, heroK);
  bendR0 *= mix(0.75, 0.55, readK);
  float bend = (1.0 - smoothstep(0.0, bendR0, dC)) * cursorOn;

  vec2 q = p;

  if (bend > 0.0) {
    vec2 away = normalize(q - cur + vec2(1e-4));
    q += away * (bend * 0.010);
  }

  float stepLen = 0.030 * mix(0.85, 1.10, heroK);

  vec2 drift = vec2(cos(u_flowDir), sin(u_flowDir));
  float driftK = mix(0.06, 0.18, heroK) * mix(1.0, 0.55, readK);

  for (int i = 0; i < 5; i++) {
    vec3 f = flowField(q, t + float(i) * 0.17, scale, warp);
    vec2 v = f.xy;

    v = normalize(mix(v, drift, driftK));

    if (bend > 0.0) {
      vec2 away = normalize(q - cur + vec2(1e-4));
      v = normalize(mix(v, away, bend * 0.35));
    }

    q += v * stepLen;
  }

  // ------------------------------------------------
  // Line layers
  // ------------------------------------------------
  float freqA = 18.0 * density;
  float freqB = 10.0 * density;

  float thinW = (1.2 * pxUnit) * mix(1.0, 1.25, heroK);
  float midW  = (2.1 * pxUnit) * mix(1.0, 1.35, heroK);

  float la = stripeLines(q.y + 0.35 * q.x, freqA, thinW, aa);
  float lb = stripeLines(q.x - 0.25 * q.y, freqB, thinW, aa);

  float lp     = stripeLines(q.y, 7.5 * density, midW, aa);
  float lpHalo = stripeLines(q.y, 7.5 * density, midW * 3.2, aa * 1.6);

  float edge = min(min(p.x, 1.0 - p.x), min(p.y, 1.0 - p.y));
  float edgeFade = smoothstep(0.00, 0.18, edge);

  float aBg = mix(0.03, 0.070, heroK);
  aBg *= mix(0.55, 0.35, readK);
  aBg *= mix(1.0, 0.60, calmK);

  float aPrimary = mix(0.09, 0.180, heroK);
  aPrimary *= mix(0.55, 0.40, readK);
  aPrimary *= mix(1.0, 0.70, calmK);

  float aHalo = mix(0.020, 0.080, heroK);
  aHalo *= mix(0.55, 0.40, readK);      // keep halo visible in READ
  aHalo *= mix(1.0, 0.60, calmK);
  aHalo *= edgeFade;

  float linesBg   = clamp(0.65 * la + 0.55 * lb, 0.0, 1.0);
  float linesP    = clamp(lp, 0.0, 1.0);
  float linesHalo = clamp(lpHalo, 0.0, 1.0);

  // base halo + ink
  vec3 haloCol = cBlue();
  col = mix(col, haloCol, linesHalo * aHalo);
  col = mix(col, ink(), linesBg * aBg * edgeFade);
  col = mix(col, ink(), linesP  * aPrimary * edgeFade);

// ------------------------------------------------
// CHROMATIC PACKETS ON CURVY LINES (UPDATED: more saturated + more visible)
// Replace ONLY this section inside signalFlow() where you currently build packet/chroma.
// ------------------------------------------------

// --- packet basis (same as before) ---
float along = q.y * (7.5 * density);

float segFreq  = mix(10.0, 18.0, heroK);
segFreq       *= mix(1.25, 1.05, readK);

float segSpeed = mix(0.18, 0.55, heroK);
segSpeed      *= mix(0.75, 0.45, calmK);

float segWidth = mix(0.12, 0.22, heroK);
segWidth      *= mix(1.55, 1.20, readK);

float ph = along * segFreq - u_time * segSpeed;
float w  = fract(ph);

float packet = smoothstep(0.0, segWidth, w) * (1.0 - smoothstep(1.0 - segWidth, 1.0, w));

// organic irregularity
float jitter = vnoise(q * 1.2 + u_time * 0.05);
packet *= smoothstep(0.18, 0.92, jitter);

// --- choose saturated accent per region ---
vec2 cid = floor(p * (14.0 * density));
float pick = hash21(cid + vec2(2.7, 9.9));

// Use your actual brand primaries (more saturation than the old cBlue/cYel)
vec3 accCol =
  (pick < 0.33) ? cMag() :                       // #880C50 (strong)
  (pick < 0.66) ? vec3(0.46, 0.29, 0.65) :       // ~#7549A7
                 vec3(0.07, 0.50, 0.16);         // ~#117F2A

// “Bloom” is towards white but only a little (keeps saturation)
vec3 accGlow = mix(accCol, vec3(1.0), 0.18);

// --- visibility controls (the important part) ---
// 1) More alpha overall
float chromaA = mix(0.10, 0.24, heroK);          // was ~0.04..0.12
chromaA *= mix(1.10, 0.90, readK);               // don't crush READ
chromaA *= mix(1.00, 0.75, calmK);
chromaA *= edgeFade;

// 2) Stronger carrier so colour actually reads on thin lines
float lineCarrier = max(linesP, 0.85 * linesHalo); // was 0.65

// 3) Boost packet density in READ/AMBIENT by widening a touch + adding a second packet lane
float packet2 = smoothstep(0.0, segWidth * 0.85, fract(ph + 0.37))
              * (1.0 - smoothstep(1.0 - segWidth * 0.85, 1.0, fract(ph + 0.37)));
packet2 *= smoothstep(0.22, 0.90, vnoise(q * 1.35 + u_time * 0.043 + 7.3));

packet = clamp(max(packet, 0.75 * packet2), 0.0, 1.0);

// 4) Cheap “glow”: stack 2 halos + a core
float glowA1 = chromaA * 0.95;
float glowA2 = chromaA * 0.55;
float coreA  = chromaA * 1.15;

// extra halo width by borrowing the halo mask (no new stripeLines call)
float softCarrier = max(linesHalo, 0.35 * linesP);

// --- composite: glow then core ---
col = mix(col, accGlow, softCarrier * glowA2 * packet);
col = mix(col, accGlow, softCarrier * glowA1 * packet);
col = mix(col, accCol,  lineCarrier * coreA  * packet);

  // ------------------------------------------------
  // Rare accent pulses (optional extra sparkle)
  // ------------------------------------------------
  vec2 id = floor(p * (12.0 * density));
  float pulse = rarePulse(id, u_time);

  float pick2 = hash21(id + vec2(2.7, 9.9));
  vec3 accCol2 = (pick2 < 0.33) ? cBlue() : (pick2 < 0.66) ? cYel() : cMag();

  float accA = (0.020 + 0.060 * heroK) * pulse;
  accA *= mix(0.70, 0.45, readK);
  accA *= edgeFade;

  col = mix(col, accCol2, max(linesP, 0.6 * linesHalo) * accA);

  // dither
  float dd = dither01(gl_FragCoord.xy + vec2(19.7, 73.3));
  col += dd * (1.0 / 255.0) * 0.65;

  return clamp(col, 0.0, 1.0);
}

void main() {
  vec2 uvN = v_uv;
  vec3 col;

  // Compute blend weights for smooth transitions
  float m0 = 1.0 - smoothstep(0.35, 0.90, abs(u_mode - 0.0));
  float m1 = 1.0 - smoothstep(0.35, 0.90, abs(u_mode - 1.0));
  float m2 = 1.0 - smoothstep(0.35, 0.90, abs(u_mode - 2.0));

  // Branch: execute only modes with non-zero weight
  // This preserves smooth transitions while avoiding redundant computation
  if (m0 > 0.001) {
    vec3 col0 = glitchGrid(uvN);
    if (m1 > 0.001 || m2 > 0.001) {
      // Transition: blend with second mode
      float sum = m0 + m1 + m2;
      if (m1 > 0.001) {
        vec3 col1 = vectorGlitchMap(uvN);
        col = (col0 * m0 + col1 * m1) / sum;
      } else {
        vec3 col2 = signalFlow(uvN);
        col = (col0 * m0 + col2 * m2) / sum;
      }
    } else {
      col = col0; // Mode 0 fully active
    }
  } else if (m1 > 0.001) {
    vec3 col1 = vectorGlitchMap(uvN);
    if (m2 > 0.001) {
      // Transition between mode 1 and 2
      float sum = m1 + m2;
      vec3 col2 = signalFlow(uvN);
      col = (col1 * m1 + col2 * m2) / sum;
    } else {
      col = col1; // Mode 1 fully active
    }
  } else {
    col = signalFlow(uvN); // Mode 2 fully active
  }

  col = pow(col, vec3(0.98));
  gl_FragColor = vec4(col, 1.0);
}
`;