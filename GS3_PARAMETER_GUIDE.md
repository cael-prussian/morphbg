# GS3 Kusama Dot Technical Shader - Parameter Guide

## Overview
GS3 creates infinite dot fields inspired by Yayoi Kusama with organic motion, cursor interaction, and mode transitions. Features three distinct modes:
- **Mode 0 (Blob)**: Large organic blobs (~4x scale), fewer visible, strong wobble
- **Mode 1 (Circle)**: Dense crisp circles, technical precision, subtle motion  
- **Mode 2 (Octopus Legs)**: Curvy lanes with customizable amplitude and variety

All parameters accept `0.0-1.0` range and are **clamped in shader** for safety.

## Implementation Status

### Current State ✅
- **Mode 0/1**: Fully functional with smooth transitions
- **Mode 2**: Curvy lanes implemented with:
  - Multi-harmonic wave patterns for organic curves
  - Per-lane variety using sequential phase shifts
  - Customizable amplitude (k-curve-amp) and variety (k-curve-variety)
  - Debug color visualization (toggle with u_debugColors)
  - Accepts overlapping dots (no occlusion system - simpler, faster)

### Performance
- Mode 0/1: 40-50 fps baseline
- Mode 2: 40-50 fps (restored after removing expensive occlusion attempts)
- Viewport scaling: Robust handling with clamping (0.5-4.0) to prevent flicker during elastic scrolling

### Known Issues
- Minor dot size flicker during elastic scrolling at page boundaries (improved with viewport clamping)
- Dots may overlap in Mode 2 (accepted behavior - occlusion attempts were too expensive)

---

## Core Adaptive Parameters

### `data-shader-mode` → `u_mode`
**Purpose**: Controls transition between blob (0.0), circle (1.0), and octopus legs (2.0) modes.

**Values**:
- `blob`: Mode 0 (u_mode=0.0) - large organic blobs with strong wobble
- `circle`: Mode 1 (u_mode=1.0) - dense crisp circles with technical precision
- `octopus-legs`: Mode 2 (u_mode=2.0) - curvy lanes with organic wave patterns

**Mathematical Usage**:
```glsl
float t01 = clamp(u_mode, 0.0, 1.0); // Mode 0/1 blend
float mode0K = 1.0 - t01; // 1 at blob, 0 at circle
float zoomIn = mix(4.0, 1.0, t01); // 4x scale in blob mode
```

**Mode 2 Specific Behavior**:
- Uses `laneWobblePx_Mode2()` function with multi-harmonic wave curves
- Sequential phase shifts create organic variety between adjacent lanes
- Amplitude controlled by `u_kCurveAmp`, variety by `u_kCurveVariety`
- Accepts overlapping dots (no occlusion - performance optimized)

---

## Kusama Knobs (Primary Artistic Controls)

The six "k-knobs" are the main creative parameters. They use **timeline-based auto-wobble in HERO preset** within a ±0.25 range around their base values.

### `data-kusama-k-grid` → `u_kGrid`

**Purpose**: Controls lane spacing and scale calculations.

**Mathematical Usage**:
```glsl
float kG = clamp(u_kGrid, 0.0, 1.0);
float scaleG = max(2.0 * kG, 0.25); // Affects spacing
```

**Recommended Range**:
- **Min**: `0.0` (wider spacing)
- **Max**: `1.0` (tighter spacing)
- **Step**: `0.01`
- **Default**: `0.5` (balanced)

**Visual Effect**:
- Lower values: More open, spacious
- Higher values: Tighter packing, denser
- Works with k-lane-freq to determine lane count

---

### `data-kusama-k-jitter` → `u_kJitter`

**Purpose**: Adds random positional offset to each dot for organic hand-placed feel.

**Recommended Range**:
- **Min**: `0.0` (perfect grid alignment)
- **Max**: `1.0` (maximum organic scatter)
- **Step**: `0.01`
- **Default**: `0.35` (subtle hand-painted feel)

**Visual Effect**:
- `0.0`: Perfectly aligned grid, mechanical
- `0.1-0.3`: Subtle imperfection, still orderly
- `0.4-0.6`: Noticeable organic quality, hand-painted
- `0.7-1.0`: Strong scatter, chaotic but intentional

---

### `data-kusama-k-size` → `u_kSize`

**Purpose**: Controls base dot size (diameter).

**Mathematical Usage**:
```glsl
float kSz = clamp(u_kSize, 0.0, 1.0);
float rBase = mix(0.90, 0.70, kSz); // Scale base for lane calculations
```

**Recommended Range**:
- **Min**: `0.0` (tiny dots)
- **Max**: `1.0` (large dots)
- **Step**: `0.01`
- **Default**: `0.55` (medium)

**Mode Interaction**:
- **Blob mode**: Already 4x scaled, so dots are much larger
- **Circle mode**: Normal scale, precise size control
- **Mode 2**: Affects dot size within curves

---

### `data-kusama-k-lane-freq` → `u_kLaneFreq`

**Purpose**: Controls lane count and vertical spacing of dots.

**Mathematical Usage**:
```glsl
float kLF = clamp(u_kLaneFreq, 0.0, 1.0);
int H = int(floor(mix(3.0, 8.0, kLF) + 0.5)); // 3 to 8 half-lanes
// Total lanes: 2*H + 1 (center) = 7 to 17 lanes
```

**Recommended Range**:
- **Min**: `0.0` (fewer lanes, ~7 total)
- **Max**: `1.0` (more lanes, ~17 total)
- **Step**: `0.01`
- **Default**: `0.5` (~11-13 lanes)

---

### `data-kusama-k-lane-wobble` → `u_kLaneWobble`

**Purpose**: PRIMARY MOTION CONTROL. Adds horizontal sinusoidal lane wobble (wave motion).

**Recommended Range**:
- **Min**: `0.0` (static lanes, no motion)
- **Max**: `1.0` (maximum wave amplitude)
- **Step**: `0.01` (CRITICAL - small changes very noticeable)
- **Default**: `0.5` (moderate motion)

**Visual Effect**:
- `0.0-0.1`: Nearly static, subtle breathing
- `0.2-0.4`: Gentle wave motion, calm
- `0.5-0.7`: Active undulation, energetic
- `0.8-1.0`: Strong waves, hypnotic motion

**Mode-Specific Behavior**:
- **Blob mode**: Strong amplitude, gentler curve = motion at lower values
- **Circle mode**: Subtle amplitude, steeper curve = requires higher values
- **Mode 2**: Multi-harmonic organic curves with frequency scaling

**Testing Priority**: **CRITICAL** - primary "energy level" control.

---

### `data-kusama-k-alpha` → `u_kAlpha`

**Purpose**: Controls dot opacity (ink darkness).

**Recommended Range**:
- **Min**: `0.0` (fully transparent, invisible dots)
- **Max**: `1.0` (maximum opacity)
- **Step**: `0.01`
- **Default**: `0.9` (strong but not opaque)

**Visual Effect**:
- `0.0-0.2`: Nearly invisible, ghost traces
- `0.3-0.5`: Translucent, ethereal
- `0.6-0.8`: Semi-opaque, visible presence
- `0.9-1.0`: Strong ink, bold contrast

---

## Mode 2 Specific Parameters (Octopus Legs)

### `data-kusama-k-curve-amp` → `u_kCurveAmp`

**Purpose**: **MODE 2 ONLY**. Controls the amplitude/intensity of curvy lane deformation.

**Mathematical Usage**:
```glsl
float kAmp = clamp(u_kCurveAmp, 0.0, 1.0);
float maxAmplitude = 280.0; // Base amplitude
float amplitudeCurve = pow(kAmp, 2.8); // Exponential control sensitivity
```

**Recommended Range**:
- **Min**: `0.0` (no curves, straight lanes)
- **Max**: `1.0` (maximum curve amplitude)
- **Step**: `0.01`
- **Default**: `0.7` (moderate to strong curves)

**Visual Effect**:
- `0.0`: Straight vertical lanes
- `0.2-0.4`: Gentle curves, subtle undulation
- `0.5-0.7`: Moderate curves, clear "octopus leg" feel
- `0.8-1.0`: Strong curves, dramatic wave patterns

---

### `data-kusama-k-curve-variety` → `u_kCurveVariety`

**Purpose**: **MODE 2 ONLY**. Controls lane uniqueness (how differently each lane curves).

**Mathematical Usage**:
```glsl
float kVar = clamp(u_kCurveVariety, 0.0, 1.0);
// Sequential phase shifts based on lane ID
float phaseShift = laneID * 0.85 * kVar * 2.5; // Example
```

**Recommended Range**:
- **Min**: `0.0` (all lanes curve identically)
- **Max**: `1.0` (maximum lane-to-lane variation)
- **Step**: `0.01`
- **Default**: `0.8` (high variety)

**Visual Effect**:
- `0.0`: Synchronized lanes, uniform pattern
- `0.3-0.5`: Some variation, organic but ordered
- `0.6-0.8`: High variety, each lane unique
- `0.9-1.0`: Maximum uniqueness, independent curves

---

### `data-debug-colors` → `u_debugColors`

**Purpose**: **MODE 2 DEBUG**. Toggles color visualization of dot scales.

**Values**:
- `0.0`: Normal black dots (default)
- `1.0`: Colored gradient by scale (debug mode)

**Color Mapping**:
- Uses two brand colors (excludes current background color)
- Gradient from largest scale to smallest scale
- Colors: Magenta (#880C50), Purple (#7549A7), Green (#117F2A)

**Usage**: Helpful for understanding scale distribution during development.

---

## Secondary Technical Parameters

### `data-kusama-cursor-influence` → `u_cursorInfluence`

**Purpose**: Controls strength of mouse cursor interaction effects.

**Recommended Range**:
- **Min**: `0.0` (no cursor interaction)
- **Max**: `1.0` (full interaction effects)
- **Step**: `0.01`
- **Default**: `0.20` (subtle interaction)

---

### `data-kusama-seed` → `u_seed`

**Purpose**: Global random seed affecting all hash-based randomization.

**Recommended Range**:
- **Min**: `0.0`
- **Max**: `100.0`
- **Step**: `1.0`
- **Default**: `13.7`

**Note**: Changing seed causes visible pattern jump (by design).

---

## Preset Combinations

### Hero Preset (Maximum Energy - Blob Mode)
```html
data-shader-mode="blob"
data-kusama-k-grid="0.55"
data-kusama-k-jitter="0.40"
data-kusama-k-size="0.60"
data-kusama-k-lane-freq="0.55"
data-kusama-k-lane-wobble="0.55"
data-kusama-k-alpha="0.90"
data-kusama-cursor-influence="0.25"
data-kusama-seed="13.7"
```

### Ambient Preset (Balanced - Circle Mode)
```html
data-shader-mode="circle"
data-kusama-k-grid="0.50"
data-kusama-k-jitter="0.35"
data-kusama-k-size="0.55"
data-kusama-k-lane-freq="0.50"
data-kusama-k-lane-wobble="0.45"
data-kusama-k-alpha="0.85"
data-kusama-cursor-influence="0.20"
data-kusama-seed="13.7"
```

### Read Preset (Minimal Distraction - Circle Mode)
```html
data-shader-mode="circle"
data-kusama-k-grid="0.40"
data-kusama-k-jitter="0.25"
data-kusama-k-size="0.45"
data-kusama-k-lane-freq="0.35"
data-kusama-k-lane-wobble="0.25"
data-kusama-k-alpha="0.75"
data-kusama-cursor-influence="0.15"
data-kusama-seed="13.7"
```

### Octopus-Legs Preset (Mode 2 - Curvy Lanes)
```html
data-shader-mode="octopus-legs"
data-kusama-k-grid="0.50"
data-kusama-k-jitter="0.30"
data-kusama-k-size="0.50"
data-kusama-k-lane-freq="0.45"
data-kusama-k-lane-wobble="0.40"
data-kusama-k-alpha="0.85"
data-kusama-k-curve-amp="0.7"
data-kusama-k-curve-variety="0.8"
data-kusama-cursor-influence="0.20"
data-kusama-seed="13.7"
data-debug-colors="0.0"
```

---

## Technical Implementation Notes

### Viewport Scaling
- Reference viewport: 1440px width
- Scaling formula: `viewportScale = clamp(u_resolution.x / 1440.0, 0.5, 4.0)`
- Clamping prevents flicker during elastic scrolling (iOS bounce effects)
- All base pixel sizes (48px, 16px, 32px) multiplied by viewport scale

### ID Bridge System
- Maintains dot identity across scale changes
- Reference grid uses same viewport scaling as actual dots
- Prevents dots from "jumping" during transitions
- Critical for consistent random seeding per dot

### Mode 2 Wave System
- Multi-harmonic waves with 3 frequencies
- Sequential phase shifts (not random) for organic variety
- Amplitude scaling: 220-50px wavelength range based on k-curve-amp
- Smooth variety via `laneID * 0.85 * kVariety` phase calculation

### Performance Characteristics
- All modes: Single-pass rendering, 40-50 fps
- Viewport clamping overhead: Negligible
- Critical bottleneck: Fragment shader fill rate (large dots = more pixels)

---

## Config Form Recommendations

### Essential Controls (Mode-Independent)
1. **Mode Selector** (prominent): blob / circle / octopus-legs
2. **k-lane-wobble** (highlight as primary control)
3. **k-grid**
4. **k-size**
5. **k-lane-freq**
6. **k-jitter**
7. **k-alpha**
8. **cursor-influence**
9. **seed** (with "Randomize" button)

### Mode 2 Specific Controls (conditional visibility)
- **k-curve-amp** (show only when mode="octopus-legs")
- **k-curve-variety** (show only when mode="octopus-legs")
- **debug-colors** (show only when mode="octopus-legs", developer mode)

### Preset Buttons
- Hero (Blob Energy)
- Ambient (Balanced)
- Read (Minimal)
- Octopus-Legs (Curvy)
- Custom...

---

## Known Limitations

1. **Overlapping dots in Mode 2**: Accepted behavior (occlusion attempts too expensive)
2. **Seed discontinuity**: Changing seed causes visible jump (by design)
3. **Minor flicker**: During elastic scrolling at page boundaries (improved with clamping)
4. **Alpha maximum**: Power curve prevents full opacity even at k-alpha=1.0

---

## Conclusion

GS3 provides 12 parameters for artistic control:
- **6 core k-knobs**: grid, jitter, size, lane-freq, lane-wobble, alpha
- **2 mode-specific**: curve-amp, curve-variety (Mode 2 only)
- **2 technical**: cursor-influence, seed
- **2 debug**: debug-colors, shader-mode

**Key insight**: `k-lane-wobble` is the primary energy/motion control. Mode selection (blob/circle/octopus-legs) fundamentally changes character. All parameters work together to create unique dot field compositions.

**Performance**: Simplified single-pass rendering across all modes ensures consistent 40-50 fps. Viewport scaling with clamping provides stable sizing across devices and during scrolling edge cases.
