window.BG3_FRAGMENT_SHADER = `
precision highp float;

// ------------------------------------------------------------
// Core uniforms
// ------------------------------------------------------------
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_time;
uniform float u_mode;

// Mode weights from engine (which modes are actually in viewport)
uniform float u_modeWeight0;
uniform float u_modeWeight1;
uniform float u_modeWeight2;

uniform float u_spatialMotion;
uniform float u_temporalMotion;
uniform float u_cursorEnabled;
uniform float u_calm;

// Adapter-owned uniforms (BG3_DotAdapter)
uniform float u_viewportWidth;  // CSS pixel width (DPR-independent)
uniform float u_paletteK;
uniform float u_seed;
uniform float u_cursorInfluence;
uniform float u_cursorSpeed;

// Kusama knobs
uniform float u_kGrid;
uniform float u_kJitter;
uniform float u_kSize;
uniform float u_kLaneFreq;
uniform float u_kLaneWobble;
uniform float u_kAlpha;

// Mode 2 (Octopus Legs) knobs
uniform float u_kCurveAmp;      // Curve amplitude/intensity (0.0 = straight, 1.0 = dramatic)
uniform float u_kCurveVariety;  // Lane uniqueness (0.0 = all same, 1.0 = all different)
uniform float u_debugColors;    // Debug: color-code dots by lane scale (0.0 = off, 1.0 = on)

varying vec2 v_uv;

// ------------------------------------------------------------
// aspect helpers
// ------------------------------------------------------------
vec2 aspectVec() {
  return vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
}
vec2 toAspectUV(vec2 uv) {
  vec2 asp = aspectVec();
  return (uv - 0.5) * asp + 0.5;
}

// ------------------------------------------------------------
// palette
// ------------------------------------------------------------
vec3 beigeBG() { return vec3(242.0, 226.0, 209.0) / 255.0; } // #F2E2D1
vec3 ink()     { return vec3(0.04, 0.04, 0.04); }
vec3 cMag()    { return vec3(136.0,  12.0,  80.0) / 255.0; } // #880C50
vec3 cPurp()   { return vec3(117.0,  73.0, 167.0) / 255.0; } // #7549A7
vec3 cGreen()  { return vec3( 17.0, 127.0,  42.0) / 255.0; } // #117F2A

vec3 brandHueCycle(float t) {
  float T   = fract(t / 120.0);
  float seg = floor(T * 3.0);
  float tt  = smoothstep(0.0, 1.0, fract(T * 3.0));
  if (seg < 1.0)      return mix(cMag(),   cPurp(),  tt);
  else if (seg < 2.0) return mix(cPurp(),  cGreen(), tt);
  else                return mix(cGreen(), cMag(),   tt);
}

// ------------------------------------------------------------
// hashing + noise
// ------------------------------------------------------------
float hash11(float p) { return fract(sin(p) * 43758.5453123); }

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}

// Cursor radial falloff (1 at cursor → 0 at radius)
float cursorRadialK(vec2 p, vec2 c, float radiusPx) {
  float d = length(p - c);
  float k = 1.0 - smoothstep(0.0, radiusPx, d);
  return pow(k, 1.15);
}

void presetWeights(out float wHero, out float wAmbient, out float wRead) {
  wHero = smoothstep(0.70, 0.95, u_spatialMotion);
  float readCand = 1.0 - smoothstep(0.12, 0.18, u_temporalMotion);
  wRead = (1.0 - wHero) * readCand;
  wAmbient = max(0.0, 1.0 - wHero - wRead);
  float s = max(wHero + wAmbient + wRead, 1e-6);
  wHero    /= s;
  wAmbient /= s;
  wRead    /= s;
}

// helper: 0..1 -> eased 0..1 (choose curve by id 0..2)
float easeById(float x, float id) {
  x = clamp(x, 0.0, 1.0);
  if (id < 0.333) {
    return x * x * (3.0 - 2.0 * x);
  } else if (id < 0.666) {
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
  } else {
    return (x < 0.5)
      ? 4.0 * x * x * x
      : 1.0 - pow(-2.0 * x + 2.0, 3.0) * 0.5;
  }
}

// helper: looping segmented timeline with random segment lengths + easing
float timeline01(float t, float seed) {
  float r0 = hash11(seed + 10.0);
  float r1 = hash11(seed + 20.0);
  float r2 = hash11(seed + 30.0);
  float r3 = hash11(seed + 40.0);

  float d0 = mix(2.0, 7.0, r0);
  float d1 = mix(2.0, 7.0, r1);
  float d2 = mix(2.0, 7.0, r2);
  float d3 = mix(2.0, 7.0, r3);

  float D = d0 + d1 + d2 + d3;
  float tt = mod(t, D);

  float seg = 0.0;
  float segT = tt;
  float segDur = d0;

  if (tt >= d0) { seg = 1.0; segT = tt - d0; segDur = d1; }
  if (tt >= d0 + d1) { seg = 2.0; segT = tt - (d0 + d1); segDur = d2; }
  if (tt >= d0 + d1 + d2) { seg = 3.0; segT = tt - (d0 + d1 + d2); segDur = d3; }

  float x = segT / max(segDur, 1e-4);

  float eId = hash11(seed + 100.0 + seg * 13.7);
  float ex  = easeById(x, eId);

  float k0 = hash11(seed + 200.0);
  float k1 = hash11(seed + 210.0);
  float k2 = hash11(seed + 220.0);
  float k3 = hash11(seed + 230.0);
  float k4 = k0;

  float a = k0, b = k1;
  if (seg > 0.5) { a = k1; b = k2; }
  if (seg > 1.5) { a = k2; b = k3; }
  if (seg > 2.5) { a = k3; b = k4; }

  return mix(a, b, ex);
}

// ------------------------------------------------------------
// MODE 0 blob SDF (signed distance, <0 inside)
// mode0K = 1 at Mode0, 0 at Mode1
// ------------------------------------------------------------
float geomDotSDFPx(vec2 fragPx, vec2 cPx, float radPx, float laneSeed, float mode0K) {
  vec2 p = fragPx - cPx;

  // Optional: tiny “tighter” visual in Mode0 without changing placement
  float t01 = 1.0 - mode0K;
  p.y *= mix(1.00, 1.28, t01);

  float rowID = floor(cPx.y * 0.02);
  float seed  = laneSeed * 31.7 + rowID * 7.13 + u_seed * 0.13;

  float r0 = hash11(seed + 1.0);
  float r1 = hash11(seed + 2.0);
  float r2 = hash11(seed + 3.0);

  float k = clamp(u_paletteK, 0.0, 1.0);

  float tMorph = timeline01(u_time * mix(1.40, 3.20, r1), seed + 500.0);

  // Stronger response curve
  float morphK = mix(0.55, 1.00, tMorph);
  morphK = pow(morphK, 0.22);   // smaller exponent = more aggressive
  morphK *= k;

  float warpAmt = radPx * (0.07 + 0.26 * morphK) * mix(0.85, 1.45, r2);

  vec2 q = p / max(radPx, 1e-4);
  float tW = u_time * mix(0.12, 0.35, r0);

  float n1 = vnoise(q * 1.35 + vec2( 7.1, 13.7) + seed * 0.01 + tW);
  float n2 = vnoise(q * 1.35 + vec2(19.3,  2.9) - seed * 0.01 - tW);

  vec2 warp = (vec2(n1, n2) - 0.5) * 2.0;
  p += warp * warpAmt;

float ang = atan(p.y, p.x);

// --- angular shape (compile-safe) ---
float ph1 = r0 * 6.2831853 + u_time * 0.11;
float ph3 = r1 * 6.2831853 - u_time * 0.08;
float ph5 = r2 * 6.2831853 + u_time * 0.06;

// Slightly reduced higher harmonics (still lively, less spiky)
float a1 = sin(ang + ph1);
float a3 = sin(3.0 * ang + ph3) * 0.42;   // was 0.35 (but see saturation below)
float a5 = sin(5.0 * ang + ph5) * 0.24;   // was 0.18

float shape = a1 + a3 + a5;

// Your stronger intensity stays
float amp = (0.18 + 0.95 * morphK) * mix(0.85, 1.65, r1);

// --- KEY: soft-saturate the radial delta to prevent spikes ---
// dr is the additive delta in radius units (around 1.0)
float dr = amp * shape;

// Softsign saturator: keeps motion/intensity but rounds sharp lobes.
// Increase 2.2 -> more smoothing; decrease -> more edgy.
dr = dr / (1.0 + 2.2 * abs(dr));

// Optional extra rounding (very effective):
// dr = tanh(dr * 1.2) / 1.2;

// Now clamp *after* smoothing
float minR = 0.70;
float maxR = 1.25;

float rScale = clamp(1.0 + dr, minR, maxR);


  // SDF: negative inside
  return length(p) - (radPx * rScale);
}

// ------------------------------------------------------------
// Lane wobble (Mode 1 behaviour) — KEEP AS-IS
// ------------------------------------------------------------
float laneWobblePx(float yyPx, float kW, float t) {
  kW = clamp(kW, 0.0, 1.0);

  float wHero, wAmb, wRead;
  presetWeights(wHero, wAmb, wRead);

  // HERO — paired back
  float freqHero = 0.34;
  float z1Hero   = 150.0;
  float z2Hero   = 54.0;
  float t1Hero   = 0.18;
  float t2Hero   = 0.13;
  float mixHero  = 0.56;

  // AMBIENT — midpoint
  float freqAmb = 0.28;
  float z1Amb   = 220.0;
  float z2Amb   = 110.0;
  float t1Amb   = 0.075;
  float t2Amb   = 0.050;
  float mixAmb  = 0.74;

  // READ — calm
  float freqRead = 0.20;
  float z1Read   = 340.0;
  float z2Read   = 180.0;
  float t1Read   = 0.030;
  float t2Read   = 0.018;
  float mixRead  = 0.90;

  float freqMul = freqHero*wHero + freqAmb*wAmb + freqRead*wRead;
  float Z1      = z1Hero*wHero   + z1Amb*wAmb   + z1Read*wRead;
  float Z2      = z2Hero*wHero   + z2Amb*wAmb   + z2Read*wRead;
  float T1      = t1Hero*wHero   + t1Amb*wAmb   + t1Read*wRead;
  float T2      = t2Hero*wHero   + t2Amb*wAmb   + t2Read*wRead;
  float mixW    = mixHero*wHero  + mixAmb*wAmb  + mixRead*wRead;

  float kCurve    = pow(kW, 5.6);
  float maxWobble = 196.0;

  float y = yyPx * freqMul;

  float ph = (vnoise(vec2(yyPx * 0.0025, t * 0.03 + 10.0)) - 0.5) * 2.0;
  float wanderAmp = 1.6*wHero + 0.45*wAmb + 0.10*wRead;
  float phaseWander = ph * wanderAmp;

  float zebra1 = sin((y / Z1) + t * T1 + phaseWander);
  float zebra2 = sin((y / Z2) - t * T2 + phaseWander * 0.6);

  float Z3 = 0.73 * Z2 + 0.19 * Z1 + 41.0;
  float T3 = 0.86 * T1 + 0.11 * T2 + 0.05;
  float zebra3 = sin((y / Z3) + t * T3 + phaseWander * 0.35);

  float w3 = 0.20*wHero + 0.08*wAmb + 0.02*wRead;

  float w12  = (mixW * zebra1 + (1.0 - mixW) * zebra2);
  float wAll = mix(w12, (0.70*w12 + 0.30*zebra3), clamp(w3, 0.0, 0.35));

  return maxWobble * kCurve * wAll;
}

// ------------------------------------------------------------
// Mode-aware wobble (Mode0 gets MUCH stronger + more non-uniform)
// mode0K: 1=Mode0, 0=Mode1
// ------------------------------------------------------------
float laneWobblePx_M0Boost(float yyPx, float kW, float t, float mode0K) {
  kW     = clamp(kW, 0.0, 1.0);
  mode0K = clamp(mode0K, 0.0, 1.0);

  float wHero, wAmb, wRead;
  presetWeights(wHero, wAmb, wRead);

  // Same base numbers as your existing laneWobblePx (keeps Mode1 feel)
  float freqHero = 0.34;
  float z1Hero   = 150.0;
  float z2Hero   = 54.0;
  float t1Hero   = 0.18;
  float t2Hero   = 0.13;
  float mixHero  = 0.56;

  float freqAmb = 0.28;
  float z1Amb   = 220.0;
  float z2Amb   = 110.0;
  float t1Amb   = 0.075;
  float t2Amb   = 0.050;
  float mixAmb  = 0.74;

  float freqRead = 0.20;
  float z1Read   = 340.0;
  float z2Read   = 180.0;
  float t1Read   = 0.030;
  float t2Read   = 0.018;
  float mixRead  = 0.90;

  float freqMul = freqHero*wHero + freqAmb*wAmb + freqRead*wRead;
  float Z1      = z1Hero*wHero   + z1Amb*wAmb   + z1Read*wRead;
  float Z2      = z2Hero*wHero   + z2Amb*wAmb   + z2Read*wRead;
  float T1      = t1Hero*wHero   + t1Amb*wAmb   + t1Read*wRead;
  float T2      = t2Hero*wHero   + t2Amb*wAmb   + t2Read*wRead;
  float mixW    = mixHero*wHero  + mixAmb*wAmb  + mixRead*wRead;

  // MODE0: bigger amplitude + more energy even at moderate kW
  float kExp      = mix(5.6, 2.35, mode0K);
  float maxWobble = mix(196.0, 520.0, mode0K);
  float kCurve    = pow(kW, kExp);

  // MODE0: denser oscillation
  float freqBoost = mix(1.0, 1.55, mode0K);
  float y = yyPx * (freqMul * freqBoost);

  // OPTIMIZATION: Only compute expensive phase wander in Mode0 when it matters
  float phaseWander = 0.0;
  float phaseWarp = 0.0;
  float ph2 = 0.0;  // Needed for ampMod later
  
  if (mode0K > 0.05 && kW > 0.1) {
    // MODE0: phase non-uniformity (adds "kinks" and drift)
    float ph0 = (vnoise(vec2(yyPx * 0.0025, t * 0.03 + 10.0)) - 0.5) * 2.0;
    float ph1 = (vnoise(vec2(yyPx * 0.0048, t * 0.08 + 50.0)) - 0.5) * 2.0;
    ph2 = (vnoise(vec2(yyPx * 0.0017, t * 0.05 + 80.0)) - 0.5) * 2.0;

    float wanderAmpBase = 1.6*wHero + 0.45*wAmb + 0.10*wRead;
    float wanderAmp     = wanderAmpBase * (1.0 + 1.25 * mode0K);

    phaseWander = ph0 * wanderAmp;
    phaseWarp   = (0.55 * ph1 + 0.45 * ph2) * (1.35 * mode0K);
  }

  float zebra1 = sin((y / Z1) + t * T1 + phaseWander + phaseWarp);
  float zebra2 = sin((y / Z2) - t * T2 + phaseWander * 0.6 - phaseWarp * 0.7);

  // OPTIMIZATION: Skip extra harmonics in Mode1 (when mode0K < 0.05)
  float wAll;
  if (mode0K < 0.05) {
    // Mode1: Simple 2-harmonic blend (50% cheaper)
    wAll = mixW * zebra1 + (1.0 - mixW) * zebra2;
  } else {
    // Mode0: Full complexity with 4 harmonics
    float Z3 = 0.73 * Z2 + 0.19 * Z1 + 41.0;
    float T3 = 0.86 * T1 + 0.11 * T2 + 0.05;
    float zebra3 = sin((y / Z3) + t * T3 + phaseWander * 0.35 + phaseWarp * 0.9);

    float Z4 = 0.55 * Z2 + 0.33 * Z1 + 17.0;
    float T4 = 1.35 * T1 + 0.20 * T2 + 0.09;
    float zebra4 = sin((y / Z4) - t * T4 + phaseWander * 0.22 - phaseWarp * 0.4);

    float w3  = 0.20*wHero + 0.08*wAmb + 0.02*wRead;
    float w12 = (mixW * zebra1 + (1.0 - mixW) * zebra2);
    wAll = mix(w12, (0.70*w12 + 0.30*zebra3), clamp(w3, 0.0, 0.35));
    wAll += (0.18 + 0.42 * mode0K) * zebra4;
  }

  // Stable nonlinear shaping (kinkier feel in Mode0)
  float shapeK = 1.0 + 2.25 * mode0K;
  wAll *= shapeK;
  wAll = wAll / (1.0 + 0.85 * abs(wAll)); // soft saturation (prevents blowups)

  // Mild amplitude modulation (only in Mode0 where ph2 is calculated)
  float ampMod = 1.0;
  if (mode0K > 0.05) {
    ampMod = 1.0 + 0.55 * mode0K * ph2;
  }

  return maxWobble * kCurve * wAll * ampMod;
}

float laneLocalWobblePx(float yyPx, float laneSeed, float padPx, float kW, float t) {
  kW = clamp(kW, 0.0, 1.0);
  float maxLocal = padPx * 0.45;
  float k = pow(kW, 2.2);

  float y = yyPx * 0.22;
  float a = laneSeed * 1.73 + u_seed * 0.31;

  float s1 = sin((y / 120.0) + a + t * 0.18);
  float s2 = sin((y / 47.0)  - a * 1.3 - t * 0.11);
  float s3 = sin((y / 260.0) + a * 0.7 + t * 0.07);

  float w = (0.55 * s1 + 0.30 * s2 + 0.15 * s3);
  return maxLocal * k * w;
}

// ------------------------------------------------------------
// MODE 2: Octopus Legs - Per-lane unique wobble with variety control
// ------------------------------------------------------------
// laneID: unique lane identifier (colID from caller)
// kAmp: curve amplitude/intensity (0.0 = straight, 1.0 = dramatic)
// kVariety: lane uniqueness (0.0 = all lanes identical, 1.0 = all lanes different)
// ------------------------------------------------------------
float laneWobblePx_Mode2(float yyPx, float laneID, float kAmp, float kVariety, float t) {
  kAmp = clamp(kAmp, 0.0, 1.0);
  kVariety = clamp(kVariety, 0.0, 1.0);
  
  float wHero, wAmb, wRead;
  presetWeights(wHero, wAmb, wRead);
  
  // Frequency scales with kAmp: low amp = gentle long curves, high amp = dense short curves
  // Range: 0.28 (Mode 1 style) to 1.2 (compact tentacles)
  float freqBase = mix(0.28, 1.2, kAmp);
  
  // Wavelengths scale inversely with frequency
  float Z1 = mix(220.0, 50.0, kAmp);
  float Z2 = mix(110.0, 25.0, kAmp);
  float T1 = 0.15;   // Animation speed
  float T2 = 0.10;
  
  // Sequential variety: adjacent lanes get smoothly varying offsets
  // Instead of random hash, use smooth function of lane ID
  float varietyPhase = laneID * 0.85;  // Sequential offset (not random)
  
  // Phase shifts based on sequential position (smooth variation between neighbors)
  float phaseShift1 = varietyPhase * kVariety * 2.5;
  float phaseShift2 = varietyPhase * kVariety * 1.8;
  float phaseShift3 = varietyPhase * kVariety * 3.2;
  
  // Smooth amplitude modulation (sequential, not random)
  // Creates gentle thickness variation across adjacent lanes
  float laneAmpMul = 1.0 + 0.25 * sin(laneID * 0.73 + u_seed) * kVariety;
  
  float y = yyPx * freqBase;
  
  // 3 harmonics with sequential phase shifts for organic variation
  float zebra1 = sin((y / Z1) + t * T1 + phaseShift1);
  float zebra2 = sin((y / Z2) - t * T2 + phaseShift2);
  
  float Z3 = 0.70 * Z2 + 0.30 * Z1;
  float T3 = 0.88 * T1 + 0.12 * T2;
  float zebra3 = sin((y / Z3) + t * T3 + phaseShift3);
  
  float w3 = 0.25 * wHero + 0.18 * wAmb + 0.08 * wRead;
  float mixW = 0.60;
  
  float w12 = mixW * zebra1 + (1.0 - mixW) * zebra2;
  float wAll = mix(w12, (0.70 * w12 + 0.30 * zebra3), clamp(w3, 0.0, 0.35));
  
  // Amplitude: stronger than Mode 1 for dramatic tentacle curves
  // Max amplitude scales with kAmp (user control)
  float maxAmplitude = 280.0;  // Base amplitude for dramatic curves
  float amplitudeCurve = pow(kAmp, 2.8);  // Exponential scaling for control sensitivity
  
  return maxAmplitude * amplitudeCurve * wAll * laneAmpMul;
}

// ------------------------------------------------------------
// Dot sampling (SHARED for Mode 0 + Mode 1) — identity-critical
// Scales primitives (crisp) instead of zooming sampling coords.
// ------------------------------------------------------------
void kusamaDotSample(
  vec2 frag,
  float colID,
  float laneCoreCenterX,
  float xOff,
  float laneScale,
  float scaleG,
  float kJ,
  float kWBase,
  float useCursorWobble,
  vec2  cursorPx,
  float radiusPx,
  float aa,
  float laneSeed,
  float dotScaleUp,
  float padMul,
  float gapMul,
  float wobbleScale,
  out vec2  dotC,
  out float dotMaskPxOut,
  out float coreMaskOut,
  out float dotAOut
) {
  // VIEWPORT-RELATIVE SCALING: Scale all sizes based on CSS viewport width
  // Reference: 1440px viewport uses base pixel values
  // Use u_viewportWidth (CSS pixels) instead of u_resolution.x (buffer pixels)
  // to avoid flickering when DPR changes. Clamp to handle edge cases.
  float viewportScale = clamp(u_viewportWidth / 1440.0, 0.5, 4.0);

  // Base sizes in screen px (crisp SDF), scaled to viewport
  float lanePxBase = 48.0 * dotScaleUp * viewportScale;
  float dotDiaBase = 48.0 * dotScaleUp * viewportScale;

  // Spacing scales with dotScaleUp but can be tightened via multipliers
  float padBase    = 16.0 * padMul * dotScaleUp * viewportScale;
  float gapBase    = 32.0 * gapMul * dotScaleUp * viewportScale;

  float x = frag.x;
  float y = frag.y;

  float lanePx   = lanePxBase * laneScale;
  float dotDiaPx = dotDiaBase * laneScale;
  float dotRadPx = 0.5 * dotDiaPx;

  float padPx   = (padBase * scaleG);
  float gapPx   = (gapBase * scaleG);
  float pitchPx = dotDiaPx + gapPx;

  float yStart = dotRadPx + aa + 2.0;
  float nLane  = floor(((y - yStart) / pitchPx) + 0.5);
  float dotCy0 = yStart + nLane * pitchPx;

  // ---- ID BRIDGE ---- (reference grid must use same viewport scale)
  // Use viewport-scaled reference to maintain stable IDs across viewport sizes
  float dotDiaRef = 48.0 * viewportScale;  // Match viewport scaling (already clamped above)
  float dotRadRef = 0.5 * dotDiaRef;
  float gapRef    = (32.0 * viewportScale) * scaleG;  // Match viewport scaling (already clamped above)
  float pitchRef  = dotDiaRef + gapRef;
  float yStartRef = dotRadRef + aa + 2.0;
  float nRef = floor(((dotCy0 - yStartRef) / pitchRef) + 0.5);
  float nID  = nRef;

  float key1 = nID * 17.13 + u_seed * 0.71 + laneSeed * 1.31 + colID * 9.97;
  float key2 = nID * 41.77 + u_seed * 1.19 + laneSeed * 2.17 + colID * 6.43;

  float r1 = hash11(key1);
  float r2 = hash11(key2);

  float maxDx = padPx;
  float maxDy = 0.25 * gapPx;

  float fracDx = 0.40;
  float fracDy = 0.25;

  float kJc = clamp(kJ, 0.0, 1.0);
  float jx = (r1 - 0.5) * 2.0 * (maxDx * fracDx) * kJc;
  float jy = (r2 - 0.5) * 2.0 * (maxDy * fracDy) * kJc;

  float dotCy = dotCy0 + jy;

  vec2 dotCenterApprox = vec2(laneCoreCenterX + xOff, dotCy);

  float cursorK = cursorRadialK(dotCenterApprox, cursorPx, radiusPx);
  cursorK *= (u_cursorEnabled > 0.5) ? 1.0 : 0.0;

  float wobbleK = mix(1.0, cursorK, clamp(useCursorWobble, 0.0, 1.0));
  float kW = clamp(kWBase, 0.0, 1.0) * wobbleK;

// Mode-specific wobble behavior
float wG;
if (u_modeWeight2 > 0.5) {
  // Mode 2: Per-lane unique curves (octopus tentacles)
  wG = laneWobblePx_Mode2(dotCy, colID, u_kCurveAmp, u_kCurveVariety, u_time) * wobbleScale;
} else {
  // Mode 0/1: Synchronized wobble, blend based on mode weights
  float t01 = (u_modeWeight0 + u_modeWeight1 > 0.001) 
    ? u_modeWeight1 / (u_modeWeight0 + u_modeWeight1) 
    : 0.0;
  float mode0K = 1.0 - t01;
  wG = laneWobblePx_M0Boost(dotCy, kW, u_time, mode0K) * wobbleScale;
}

float wL = 0.0; // sanity check: disable local wobble
// float wL = laneLocalWobblePx(dotCy, laneSeed, padPx, kW, u_time) * wobbleScale;

  float laneCenterX_dot = laneCoreCenterX + xOff + wG + wL;
  float dotCx = laneCenterX_dot + jx;

  dotC = vec2(dotCx, dotCy);

  float d = length(frag - dotC);
  dotMaskPxOut = 1.0 - smoothstep(dotRadPx, dotRadPx + aa, d);

  float coreHalfW = 0.5 * lanePx;
  float coreDx = abs(x - dotCx) - coreHalfW;
  coreMaskOut = 1.0 - smoothstep(0.0, aa, coreDx);

  dotAOut = pow(clamp(u_kAlpha, 0.0, 1.0), 1.6);
}

// Pure-core proximity: 1.0 inside core, then smooth falloff to 0 by falloff.
// coreFrac/falloffFrac are fractions of radiusPx.
float cursorProxCoreFalloffK(
  vec2 p, vec2 c, float radiusPx,
  float coreFrac, float falloffFrac, float fallPow
) {
  float d    = length(p - c);
  float core = radiusPx * coreFrac;
  float fall = radiusPx * falloffFrac;

  // 1 in core, then soften out to 0 by fall
  float k = 1.0 - smoothstep(core, fall, d);

  // shape curve (lower = softer, higher = snappier)
  return pow(clamp(k, 0.0, 1.0), fallPow);
}

// ------------------------------------------------------------
// Mode 2: Check if a point is inside any lane with scale > threshold
// Used for occlusion testing - returns true if point is occluded by larger lane
// ------------------------------------------------------------
bool isPointInLargerLane(
  vec2 point,
  float currentLaneScale,
  float laneCoreCenterX,
  float scaleG,
  float wobbleScale,
  float lanePxBase,
  float padPxCommon,
  float rBase,
  int H,
  int C
) {
  // Check center lane (scale = 1.0)
  if (1.0 > currentLaneScale + 0.01) {
    float wG = laneWobblePx_Mode2(point.y, 0.0, u_kCurveAmp, u_kCurveVariety, u_time) * wobbleScale;
    float laneCenterX = laneCoreCenterX + wG;
    float laneWidthPx = lanePxBase * 1.0 + 2.0 * padPxCommon;
    float distToCenter = abs(point.x - laneCenterX);
    if (distToCenter < laneWidthPx * 0.5) {
      return true;  // Inside center lane which is larger
    }
  }
  
  // Check sibling lanes
  const int MAX_CHECK = 32;
  float prevRegionR = lanePxBase + 2.0 * padPxCommon;
  float prevRegionL = prevRegionR;
  float cumOffR = 0.0;
  float cumOffL = 0.0;
  
  for (int i = 1; i <= MAX_CHECK; i++) {
    float fi = float(i);
    int kInt = (i - 1) - ((i - 1) / C) * C;
    float k = float(kInt);
    float e = float(H) - abs((k + 1.0) - float(H));
    
    float jitterPct = 0.03;
    float rRight = clamp(rBase * (1.0 + (hash11(fi * 31.7 + u_seed * 2.1 + 11.0) - 0.5) * 2.0 * jitterPct), 0.60, 0.98);
    float rLeft = clamp(rBase * (1.0 + (hash11(fi * 29.3 + u_seed * 2.1 + 23.0) - 0.5) * 2.0 * jitterPct), 0.60, 0.98);
    
    float laneScaleR = (e < 0.5) ? 1.0 : pow(rRight, e);
    float laneScaleL = (e < 0.5) ? 1.0 : pow(rLeft, e);
    
    float regionR = lanePxBase * laneScaleR + 2.0 * padPxCommon;
    float regionL = lanePxBase * laneScaleL + 2.0 * padPxCommon;
    
    cumOffR += 0.5 * (prevRegionR + regionR);
    cumOffL += 0.5 * (prevRegionL + regionL);
    
    prevRegionR = regionR;
    prevRegionL = regionL;
    
    // Check right lane if it's larger
    if (laneScaleR > currentLaneScale + 0.01) {
      float wG = laneWobblePx_Mode2(point.y, fi, u_kCurveAmp, u_kCurveVariety, u_time) * wobbleScale;
      float laneCenterX = laneCoreCenterX + cumOffR + wG;
      float laneWidthPx = lanePxBase * laneScaleR + 2.0 * padPxCommon;
      float distToCenter = abs(point.x - laneCenterX);
      if (distToCenter < laneWidthPx * 0.5) {
        return true;  // Inside a larger lane
      }
    }
    
    // Check left lane if it's larger
    if (laneScaleL > currentLaneScale + 0.01) {
      float wG = laneWobblePx_Mode2(point.y, -fi, u_kCurveAmp, u_kCurveVariety, u_time) * wobbleScale;
      float laneCenterX = laneCoreCenterX - cumOffL + wG;
      float laneWidthPx = lanePxBase * laneScaleL + 2.0 * padPxCommon;
      float distToCenter = abs(point.x - laneCenterX);
      if (distToCenter < laneWidthPx * 0.5) {
        return true;  // Inside a larger lane
      }
    }
  }
  
  return false;  // Not inside any larger lane
}

// ------------------------------------------------------------
/// Shared lane render that MORPHS mask (Mode0 blob -> Mode1 circle)
// HERO/AMBIENT: closest to cursor = PURE circle, far = normal mode morph (blob in Mode0).
// READ (Mode0 only): opacity gated by proximity + inverted geometry proximity
// (near = blob + visible, far = circle + fades out).
// ------------------------------------------------------------
// Returns: vec4(dotCenterX, dotCenterY, dotRadius, unused)
vec4 addKusamaLaneUnified(
  inout vec3 col,
  vec2 frag,
  float colID,
  float laneCoreCenterX,
  float xOff,
  float laneScale,
  float scaleG,
  float kJ,
  float kWBase,
  float useCursorWobble,
  vec2  cursorPx,
  float radiusPx,
  float aa,
  float laneSeed,
  float t01,
  float wobbleScale,
  float mode0K,
  float wRead,
  float cursorOn
) {
  // mode0K, wRead, cursorOn now passed in to avoid recalculation
  // mode0K, wRead, cursorOn now passed in to avoid recalculation 

  // ------------------------------------------------------------
  // Sample base dot (identity-stable)
  // ------------------------------------------------------------
  vec2  dotC;
  float dotMaskCircle;
  float coreMask;
  float dotA;

  kusamaDotSample(
    frag, colID,
    laneCoreCenterX, xOff, laneScale, scaleG,
    kJ, kWBase, useCursorWobble,
    cursorPx, radiusPx, aa, laneSeed,
    1.0, 1.0, 1.0, wobbleScale,
    dotC, dotMaskCircle, coreMask, dotA
  );

  // READ-only behaviour when READ is dominant AND Mode0
  // wRead is now passed in from parent to avoid recalculation
  float readGate = smoothstep(0.45, 0.70, wRead) * mode0K;

  // Cursor enabled + influence (cursorOn passed in)
  float infl     = clamp(u_cursorInfluence, 0.0, 1.0) * cursorOn;

  // ------------------------------------------------------------
  // Your chosen shaping values
  // ------------------------------------------------------------
  float coreFrac    = 0.12;
  float falloffFrac = 0.55;
float fallPow = 0.70; // (was 0.85)

  // IMPORTANT:
  // - We do NOT multiply proximity by infl (so cursor core can be pure circle / 100% opacity).
  // - We instead scale the effective radius by infl, so low influence just shrinks the effect area.

  // Radius multipliers (these are your main knobs now)
  float heroRadiusMul = 0.55; // shrink HERO/AMBIENT circle influence (try 0.45..0.70)
  float readRadiusMul = 0.90; // READ gating radius (try 0.55..0.85)

  // Apply influence as a radius scaler (keeps peak at 1.0 in the core)
float inflRadiusMul = mix(0.50, 1.0, infl); // (was mix(0.35, 1.0, infl))

  float rHero = radiusPx * heroRadiusMul * inflRadiusMul;
  float rRead = radiusPx * readRadiusMul * inflRadiusMul;

  // OPTIMIZATION: Use lane center for proximity instead of individual dot position
  // Since all dots in a lane share similar X coords, this is nearly identical but avoids per-fragment calc
  vec2 laneCenter = vec2(laneCoreCenterX + xOff, dotC.y);
  
  // Proximity: 1 near cursor -> 0 far (PURE 1 in core, since we do not damp the peak)
  float proxHeroAmb = cursorOn * cursorProxCoreFalloffK(laneCenter, cursorPx, rHero, coreFrac, falloffFrac, fallPow);
  float proxRead    = cursorOn * cursorProxCoreFalloffK(laneCenter, cursorPx, rRead, coreFrac, falloffFrac, fallPow);

  // ------------------------------------------------------------
  // Base mode morph (t01=0 -> blob, t01=1 -> circle)
  // ------------------------------------------------------------
  float tShapeMode = smoothstep(0.00, 0.35, t01);

  // HERO/AMBIENT: near cursor -> force circle (PURE circle in core because proxHeroAmb==1 there)
  float tShapeHeroAmb = mix(tShapeMode, 1.0, proxHeroAmb);

  // READ (Mode0 only): INVERT proximity:
  // near cursor -> blob (tShapeMode), far -> circle (1.0)
  float tShapeRead = mix(tShapeMode, 1.0, (1.0 - proxRead));

  // As READ fades (proxRead -> 0), push even more circular so faint dots are circles
  float fadeToCircle = pow(clamp(1.0 - proxRead, 0.0, 1.0), 0.85);
  tShapeRead = mix(tShapeRead, 1.0, fadeToCircle);

  // Select behaviour
  float tShape = mix(tShapeHeroAmb, tShapeRead, readGate);

  // ------------------------------------------------------------
  // Distances
  // ------------------------------------------------------------
  float baseRadPx = 0.5 * (48.0 * laneScale);
  float dotRadPx  = baseRadPx;

  vec2  dp    = frag - dotC;
  float dCirc = length(dp) - dotRadPx;
  
  // OPTIMIZATION: Only compute expensive blob SDF when needed
  // tShape near 1.0 = pure circle (Mode1), near 0.0 = pure blob (Mode0)
  float dMix;
  if (tShape > 0.95) {
    // Pure circle - skip expensive blob calculation
    dMix = dCirc;
  } else if (tShape < 0.05) {
    // Pure blob - skip simple circle, compute full SDF
    dMix = geomDotSDFPx(frag, dotC, dotRadPx, laneSeed, mode0K);
  } else {
    // Transition - need both
    float dBlob = geomDotSDFPx(frag, dotC, dotRadPx, laneSeed, mode0K);
    dMix = mix(dBlob, dCirc, tShape);
  }
  
  float dotMask = 1.0 - smoothstep(-aa, aa, dMix);

  // ------------------------------------------------------------
  // Lane affinity
  // ------------------------------------------------------------
  float lanePx = 48.0 * laneScale;
  float extra  = dotRadPx * (1.10 * mode0K);
  float coreHalfW = 0.5 * lanePx + extra;

  float coreDx = abs(frag.x - dotC.x) - coreHalfW;
  float coreMaskWide =
    1.0 - smoothstep(0.0, aa * mix(1.0, 2.0, mode0K), coreDx);

  float laneAffinity =
    mix(0.70, 1.00, pow(clamp(coreMaskWide, 0.0, 1.0), 0.55));

  // ------------------------------------------------------------
  // READ-only opacity gating (Mode0 only)
  // - near cursor: alphaGate == 1.0 (fully visible)
  // - far away: fades out
  // ------------------------------------------------------------
float readOpacityPow = 0.85; // (was 1.35)
  float alphaGate = pow(clamp(proxRead, 0.0, 1.0), readOpacityPow);

  float alphaMul = mix(1.0, alphaGate, readGate);

  vec3 dotColor = vec3(0.0);  // Black dots
  
  // Debug color-coding (toggle with u_debugColors)
  if (u_debugColors > 0.5) {
    // Get current background color (not used for debug gradient)
    vec3 activeBG = brandHueCycle(u_time);
    
    // Use brand colors: Mag -> Purp -> Green
    // Map laneScale (smallest=~0.5, largest=1.0) to gradient
    float t = 1.0 - laneScale;  // Invert so largest scale = 0, smallest = 1
    t = clamp(t * 2.0, 0.0, 1.0);  // Expand range for better visibility
    
    // Determine which two brand colors to use (not the active background)
    vec3 color1, color2;
    
    // Check which color is closest to active background
    float distMag = length(activeBG - cMag());
    float distPurp = length(activeBG - cPurp());
    float distGreen = length(activeBG - cGreen());
    
    if (distMag > distPurp && distMag > distGreen) {
      // Mag is furthest, use Purp -> Green
      color1 = cPurp();
      color2 = cGreen();
    } else if (distPurp > distMag && distPurp > distGreen) {
      // Purp is furthest, use Mag -> Green
      color1 = cMag();
      color2 = cGreen();
    } else {
      // Green is furthest, use Mag -> Purp
      color1 = cMag();
      color2 = cPurp();
    }
    
    // Interpolate between the two non-background colors
    dotColor = mix(color1, color2, t);
  }

  // Render dots with debug colors or black
  col = mix(col, dotColor, dotMask * laneAffinity * dotA * alphaMul);
  
  // Return dot info (fourth component unused for now)
  return vec4(dotC, dotRadPx, 0.0);
}

// ------------------------------------------------------------
// Unified Mode 0/1 (single dot field + mask morph + Mode0 scale-up)
// Mode0 is ~4x larger dots (fewer visible) but remains continuous to Mode1.
//
// UPDATE: HERO-only auto-wobble for data-k-* medians (±0.25 range).
// Auto-wobble is applied ONLY when HERO is dominant; otherwise raw u_k* are used.
// ------------------------------------------------------------
vec3 modeKusamaUnified01(vec2 uv) {
  vec3 col = brandHueCycle(u_time);

  // Blend between mode 0 and mode 1 based on their relative weights
  // When mode 2 is active, use mode 1 behavior (t01=1.0)
  float t01;
  if (u_modeWeight2 > 0.5) {
    t01 = 1.0;  // Mode 2 uses mode 1's zoom/wobble settings
  } else if (u_modeWeight0 + u_modeWeight1 > 0.001) {
    t01 = u_modeWeight1 / (u_modeWeight0 + u_modeWeight1);
  } else {
    t01 = 0.0;
  }

  // --- pattern-space zoom ---
  // zoomIn=4 means: sample 1/4 the area -> looks 4x larger on screen
  float zoomIn = mix(4.0, 1.0, t01);

  vec2 frag   = uv * u_resolution;
  vec2 center = 0.5 * u_resolution;

  vec2 fragZ   = center + (frag - center) / zoomIn;

  vec2 cursorPx = vec2(u_mouse.x * u_resolution.x, u_mouse.y * u_resolution.y);
  vec2 cursorZ  = center + (cursorPx - center) / zoomIn;

  // Keep cursor radius consistent in pattern-space so interaction feels similar
  float radiusPx = (0.65 * u_resolution.x) / zoomIn;

  // Crisp AA under zoom (this is the key anti-blur fix)
  float aa  = 1.25;
  float aaZ = aa / zoomIn;

  // Reduce wobble in pattern-space so it doesn't explode when zoomed in
  float wobbleScale = 1.0 / zoomIn;

  // Cursor wobble blend (calmer near Mode0)
  float useCursorWobble0 = 1.0 - smoothstep(0.80, 0.94, u_spatialMotion);
  useCursorWobble0 = pow(clamp(useCursorWobble0, 0.0, 1.0), 1.9) * 0.65;

  float useCursorWobble1 = 1.0 - smoothstep(0.78, 0.92, u_spatialMotion);
  useCursorWobble1 = pow(clamp(useCursorWobble1, 0.0, 1.0), 1.6);

  float useCursorWobble = mix(useCursorWobble0, useCursorWobble1, t01);

  // ------------------------------------------------------------
  // HERO-only auto-wobble around data-k-* medians (±0.25)
  // ------------------------------------------------------------
  float wHero, wAmb, wRead;
  presetWeights(wHero, wAmb, wRead);

  // Gate: only when HERO dominates (no Mode restriction; pure "HERO only")
  float heroGate = smoothstep(0.55, 0.80, wHero);

  // Medians (your data-k-* values)
  float kGm  = clamp(u_kGrid,       0.0, 1.0);
  float kJm  = clamp(u_kJitter,     0.0, 1.0);
  float kSm  = clamp(u_kSize,       0.0, 1.0);
  float kLFm = clamp(u_kLaneFreq,   0.0, 1.0);
  float kWm  = clamp(u_kLaneWobble, 0.0, 1.0);
  float kAm  = clamp(u_kAlpha,      0.0, 1.0); // HERO-only wobble (requires addKusamaLaneUnified to use it)

  // Organic loop helper (only calculate if heroGate will be used)
  float xG = 0.0, xJ = 0.0, xS = 0.0, xLF = 0.0, xW = 0.0, xA = 0.0;
  
  if (heroGate > 0.01) {
    // timeline01 returns 0..1 => convert to -1..1 => scale by 0.25 => clamp
    float seedBase = u_seed * 0.17;

    xG  = (timeline01(u_time * 0.25, 101.0 + seedBase) - 0.5) * 2.0;
    xJ  = (timeline01(u_time * 0.30, 202.0 + seedBase) - 0.5) * 2.0;
    xS  = (timeline01(u_time * 0.22, 303.0 + seedBase) - 0.5) * 2.0;
    xLF = (timeline01(u_time * 0.18, 404.0 + seedBase) - 0.5) * 2.0;
    xW  = (timeline01(u_time * 0.28, 505.0 + seedBase) - 0.5) * 2.0;
    xA  = (timeline01(u_time * 0.16, 606.0 + seedBase) - 0.5) * 2.0;

    // Soft saturation to avoid "mechanical" extremes (keeps it organic)
    xG  = xG  / (1.0 + 0.85 * abs(xG));
    xJ  = xJ  / (1.0 + 0.85 * abs(xJ));
    xS  = xS  / (1.0 + 0.85 * abs(xS));
    xLF = xLF / (1.0 + 0.85 * abs(xLF));
    xW  = xW  / (1.0 + 0.85 * abs(xW));
    xA  = xA  / (1.0 + 0.85 * abs(xA));
  }

  float kG_auto  = clamp(kGm  + xG  * 0.25, 0.0, 1.0);
  float kJ_auto  = clamp(kJm  + xJ  * 0.25, 0.0, 1.0);
  float kS_auto  = clamp(kSm  + xS  * 0.25, 0.0, 1.0);
  float kLF_auto = clamp(kLFm + xLF * 0.25, 0.0, 1.0);
  float kW_auto  = clamp(kWm  + xW  * 0.25, 0.0, 1.0);
  float kA_auto  = clamp(kAm  + xA  * 0.25, 0.0, 1.0);

  // Final knobs: HERO => auto, else => medians
  float kG     = mix(kGm,  kG_auto,  heroGate);
  float kJ     = mix(kJm,  kJ_auto,  heroGate);
  float kSize  = mix(kSm,  kS_auto,  heroGate);
  float kLF    = mix(kLFm, kLF_auto, heroGate);
  float kWBase = mix(kWm,  kW_auto,  heroGate);

  // NOTE:
  // kAlpha is computed here for HERO-only wobble, but your current pipeline
  // uses u_kAlpha inside kusamaDotSample(). To actually apply HERO-only alpha wobble,
  // update addKusamaLaneUnified/kusamaDotSample to accept and use this value.
  // (Leaving this value computed here so you can wire it in cleanly.)
  float kAlpha = mix(kAm, kA_auto, heroGate);

  // ------------------------------------------------------------
  // Use kG to compute scaleG (as before)
  // ------------------------------------------------------------
  float scaleG = max(2.0 * kG, 0.25);

  float laneCoreCenterX = 0.5 * u_resolution.x;

  // Pre-calculate mode and cursor state (avoid recalc per lane)
  float mode0K = 1.0 - clamp(t01, 0.0, 1.0);
  float cursorOn = (u_cursorEnabled > 0.5) ? 1.0 : 0.0;

  float rBase = mix(0.90, 0.70, kSize);

  int H = int(floor(mix(3.0, 8.0, kLF) + 0.5));
  int C = 2 * H;

  // VIEWPORT-RELATIVE SCALING: Scale all sizes based on CSS viewport width
  // Reference: 1440px viewport uses base pixel values
  // Use u_viewportWidth (CSS pixels) instead of u_resolution.x (buffer pixels)
  // to avoid flickering when DPR changes. Clamp to handle edge cases.
  float viewportScale = clamp(u_viewportWidth / 1440.0, 0.5, 4.0);
  
  // These are Mode1-scale sizes, scaled to viewport
  float lanePxBase  = 48.0 * viewportScale;
  float padBase     = 16.0 * viewportScale;
  float padPxCommon = padBase * scaleG;
  float regionCenter = lanePxBase + 2.0 * padPxCommon;

  // Mode 2 uses z-index ordering (larger dots on top)
  bool isMode2 = (u_modeWeight2 > 0.5);

  const int MAX_ITERS = 32;  // Reduced from 64 for performance (revert if needed)

  // Early-exit bounds should use SCREEN space, not pattern space
  // Mode 0 wobble can reach 520px (see laneWobblePx_M0Boost line 398)
  float MAX_WOBBLE_PX_SCREEN = 520.0;  // Actual max wobble in screen pixels
  float halfW_SCREEN = 0.5 * u_resolution.x;
  
  // Pattern-space values for wobble calculations
  float MAX_WOBBLE_PX = 520.0 / zoomIn;
  float halfW = 0.5 * u_resolution.x / zoomIn;

  // Direct rendering - no collection or sorting
  float prevRegionR = regionCenter;
  float prevRegionL = regionCenter;
  float cumOffR = 0.0;
  float cumOffL = 0.0;

  for (int i = 1; i <= MAX_ITERS; i++) {
    float fi = float(i);

    int kInt = (i - 1) - ((i - 1) / C) * C;
    float k = float(kInt);
    float e = float(H) - abs((k + 1.0) - float(H));

    float jitterPct = 0.03;

    float rRight = clamp(
      rBase * (1.0 + (hash11(fi * 31.7 + u_seed * 2.1 + 11.0) - 0.5) * 2.0 * jitterPct),
      0.60, 0.98
    );
    float rLeft  = clamp(
      rBase * (1.0 + (hash11(fi * 29.3 + u_seed * 2.1 + 23.0) - 0.5) * 2.0 * jitterPct),
      0.60, 0.98
    );

    float laneScaleR = (e < 0.5) ? 1.0 : pow(rRight, e);
    float laneScaleL = (e < 0.5) ? 1.0 : pow(rLeft,  e);

    float regionR = lanePxBase * laneScaleR + 2.0 * padPxCommon;
    float regionL = lanePxBase * laneScaleL + 2.0 * padPxCommon;

    cumOffR += 0.5 * (prevRegionR + regionR);
    cumOffL += 0.5 * (prevRegionL + regionL);

    prevRegionR = regionR;
    prevRegionL = regionL;

    // Early-exit: check if both lanes are completely off-screen
    float nearR_screen = (cumOffR - regionR * 0.5) * zoomIn - MAX_WOBBLE_PX_SCREEN;
    float nearL_screen = (cumOffL - regionL * 0.5) * zoomIn - MAX_WOBBLE_PX_SCREEN;
    if (nearR_screen > halfW_SCREEN && nearL_screen > halfW_SCREEN) break;

    // Right lane
    addKusamaLaneUnified(
      col, fragZ,
      fi,
      laneCoreCenterX, cumOffR, laneScaleR,
      scaleG, kJ, kWBase, useCursorWobble,
      cursorZ, radiusPx, aaZ, 10.0 + fi,
      t01, wobbleScale,
      mode0K, wRead, cursorOn
    );

    // Left lane
    addKusamaLaneUnified(
      col, fragZ,
      -fi,
      laneCoreCenterX, -cumOffL, laneScaleL,
      scaleG, kJ, kWBase, useCursorWobble,
      cursorZ, radiusPx, aaZ, 20.0 + fi,
      t01, wobbleScale,
      mode0K, wRead, cursorOn
    );
  }

  // Center lane (scale=1.0)
  addKusamaLaneUnified(
    col, fragZ,
    0.0,
    laneCoreCenterX, 0.0, 1.0,
    scaleG, kJ, kWBase, useCursorWobble,
    cursorZ, radiusPx, aaZ, 0.0,
    t01, wobbleScale,
    mode0K, wRead, cursorOn
  );

  return col;
}

// ------------------------------------------------------------
// main
// ------------------------------------------------------------
void main() {
  vec2 uv = v_uv;

  // Unified renderer handles Mode0<->Mode1 via u_mode internally
  vec3 col = modeKusamaUnified01(uv);

  col = pow(col, vec3(0.99));
  gl_FragColor = vec4(col, 1.0);
}
`;