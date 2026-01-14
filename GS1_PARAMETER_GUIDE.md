# GS1 Topographic Flow Shader - Parameter Guide

## Overview
GS1 creates organic topographic patterns using layered noise (fBm and ridged noise) with dynamic warping and height mapping. The shader creates flowing, terrain-like surfaces.

## Parameter Categories

### Universal Preset Parameters (Engine-Managed)

These are defined in `gs1/config.js` presets and automatically managed by the engine:

| Config Property | Uniform | Range | Preset Values (H/A/R) | Purpose |
|----------------|---------|-------|---------------------|---------|
| `spatial` | `u_spatialMotion` | 0-1 | 1.0 / 0.25 / 0.05 | Spatial animation intensity |
| `temporal` | `u_temporalMotion` | 0-1 | 1.0 / 0.20 / 0.03 | Temporal animation intensity |
| `cursor` | `u_cursorEnabled` | 0-1 | 1.0 / 0.0 / 0.0 | Cursor interaction enabled |
| `calm` | `u_calm` | 0-1 | 0.0 / 0.4 / 0.75 | Calmness/stillness factor |

### GS1-Specific Preset Parameters (Adaptor-Managed)

These are also defined in `gs1/config.js` presets but managed by the GS1 adaptor:

| Config Property | Uniform | Range | Preset Values (H/A/R) | Purpose |
|----------------|---------|-------|---------------------|---------|
| `cursorGlobal` | `u_cursorGlobal` | 0-1 | 0.0 / 0.0 / 1.0 | Global vs local cursor influence |
| `flatten` | `u_flatten` | 0-1 | 0.0 / 0.35 / 0.85 | Topographic flattening |
| `heightContrast` | `u_heightContrast` | 0-2 | 1.0 / 0.6 / 0.25 | Height map contrast |

### Data Attribute Parameters (Per-Section Override)

These can be set via HTML data attributes to override preset or adaptor defaults:

## Uniforms & Data Attributes

### `data-cursor-global` → `u_cursorGlobal`

**Purpose**: Controls whether cursor influence is global (entire viewport) or local (distance-based).

**Preset-Driven**: Yes - defined in config, can be overridden by data attribute

**Mathematical Usage**:
```glsl
// Splits cursor influence into local and global components
float cursorLocalK  = cursorOn * (1.0 - fMask) * (1.0 - u_cursorGlobal);
float cursorGlobalK = cursorOn * u_cursorGlobal;
```

**Recommended Range**:
- **Min**: `0.0` (local cursor - only affects nearby topology)
- **Max**: `1.0` (global cursor - affects entire viewport uniformly)
- **Default**: `0.0` (HERO/AMBIENT), `1.0` (READ)

**Visual Effect**:
- `0.0`: Cursor creates localized warping around pointer position
- `1.0`: Cursor shifts entire topology uniformly (better for reading)

**Use Cases**:
- **Hero/Ambient**: 0.0 for interactive, localized effects
- **Read**: 1.0 to avoid distracting local distortions

---

### `data-flatten` → `u_flatten`

**Purpose**: Controls the flattening of topographic height variations. Higher values compress the terrain into a flatter surface.

**Preset-Driven**: Yes - defined in config, can be overridden by data attribute

**Mathematical Usage**:
```glsl
// Used in height map calculations
float hFlat = h0 * 0.5; // Flattened version
float hUse = mix(h0, hFlat, clamp(u_flatten, 0.0, 1.0));
```

**Recommended Range**:
- **Min**: `0.0` (full topographic variation, maximum height contrast)
- **Max**: `1.0` (completely flattened, minimal height variation)
- **Default**: `0.0` (HERO), `0.35` (AMBIENT), `0.85` (READ)

---

### `data-height-contrast` → `u_heightContrast`

**Purpose**: Controls the contrast of the height map.

**Preset-Driven**: Yes

**Recommended Range**: 0-2  
**Default**: `1.0` (HERO), `0.6` (AMBIENT), `0.25` (READ)

---

## Preset Combinations

### Hero Preset
Config provides: `cursorGlobal=0.0`, `flatten=0.0`, `heightContrast=1.0`

### Ambient Preset  
Config provides: `cursorGlobal=0.0`, `flatten=0.35`, `heightContrast=0.6`

### Read Preset
Config provides: `cursorGlobal=1.0`, `flatten=0.85`, `heightContrast=0.25`

---

## Mode-Specific Behavior

GS1 has three modes that change the underlying noise algorithm:

### Atmospheric Mesh (`data-shader-mode="atmospheric-mesh"`)
- Uses multi-octave fBm (fractal Brownian motion)
- Creates soft, cloud-like organic flows
- **Best with**: Lower flatten (0.0-0.3) to show the flowing character
- **Suggested ranges**: Flatten 0.0-0.5, White-bias 0.0-0.3

### Topographic Flow (`data-shader-mode="topographic-flow"`)
- Uses ridged noise for contour-like patterns
- Creates sharp terrain features and height lines
- **Best with**: Moderate flatten (0.2-0.5) for visible contours
- **Suggested ranges**: Flatten 0.0-0.6, White-bias 0.0-0.4

### Fabric Warp (`data-shader-mode="fabric-warp"`)
- Uses warped noise for textile-like deformation
- Creates wrinkled, material-like surfaces
- **Best with**: Variable flatten depending on desired texture intensity
- **Suggested ranges**: Flatten 0.0-0.9, White-bias 0.0-0.6

---

## Testing Recommendations

### Phase 1: Establish Boundaries
1. Test flatten at 0.0, 0.5, 1.0 with white-bias at 0.0
2. Test white-bias at 0.0, 0.5, 1.0 with flatten at 0.0
3. Identify unusable ranges (if any)

### Phase 2: Find Sweet Spots
1. For each mode, find 3-5 "hero" combinations
2. Test transitions between extremes
3. Note any unexpected interactions

### Phase 3: Fine-Tune Steps
1. Test step sizes: 0.01 vs 0.05 vs 0.1
2. Determine if fine control (0.01) is necessary or if 0.05 is sufficient
3. Consider separate step sizes for coarse vs fine adjustment

---

## Config Form Recommendations

### Standard Controls (Initial Implementation)
```json
{
  "data-read-topo-flatten": {
    "label": "Topology Flatten",
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "default": 0.35
  },
  "data-read-white-bias": {
    "label": "White Bias (Brightness)",
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "default": 0.2
  }
}
```

### Advanced Controls (With Meta-Editing)
```html
<div class="param-control">
  <label>Topology Flatten</label>
  <input type="range" class="param-slider" 
         data-param="data-read-topo-flatten"
         min="0" max="1" step="0.01" value="0.35">
  <input type="number" class="param-value" value="0.35">
  
  <!-- Meta controls -->
  <details class="param-meta">
    <summary>Adjust Range</summary>
    <label>Min: <input type="number" class="meta-min" value="0.0" step="0.1"></label>
    <label>Max: <input type="number" class="meta-max" value="1.0" step="0.1"></label>
    <label>Step: <input type="number" class="meta-step" value="0.01" step="0.001"></label>
  </details>
</div>
```

---

## Known Constraints

1. **No negative values**: Both parameters are clamped to [0, 1] in adapter
2. **No upper limit beyond 1.0**: Values >1.0 are clamped, no extended range available
3. **Linear interpolation**: Both parameters use simple linear mixing, no easing curves
4. **Frame-rate independent**: Smooth interpolation happens in engine (not affected by FPS)

---

## Extreme Value Behavior

### Flatten = 0.0, White-bias = 0.0
**Result**: Maximum drama, full height variation, dark valleys possible  
**Performance**: Standard (no special considerations)

### Flatten = 1.0, White-bias = 0.0
**Result**: Flat textured surface with full color  
**Performance**: Slightly better (less height calculation)

### Flatten = 0.0, White-bias = 1.0
**Result**: Dramatic height still visible but completely white  
**Performance**: Standard

### Flatten = 1.0, White-bias = 1.0
**Result**: Nearly blank white surface, minimal visible detail  
**Performance**: Best (minimal computation needed)  
**Use**: Not recommended except for fade-out effects

---

## Future Enhancement Ideas

1. **Non-linear flatten curve**: Could use easing functions for more natural flattening
2. **Separate X/Y flatten**: Allow different flattening in different axes
3. **Brightness curve control**: Instead of linear white-bias, use exposure-style curves
4. **Contrast control**: Separate from flatten, control value range without flattening
5. **Color temperature**: Shift from cool to warm instead of just white-bias
