# GS2 Glitch Technical Shader - Parameter Guide

## Overview
GS2 creates technical, glitch-inspired effects with geometric disruption, directional flow, and motion tracking. Features ghost cursors, data stream aesthetics, and controlled chaos.

## Uniforms & Data Attributes

### `data-read-topo-flatten` → `u_readTopoFlatten`

**Purpose**: Inherited parameter that reduces glitch intensity and disruption. Despite the name, in GS2 it controls overall effect intensity rather than topology.

**Mathematical Usage**:
```glsl
// Used to dampen glitch effects
float effectIntensity = 1.0 - u_readTopoFlatten;
// Applied to displacement, color shifts, geometric disruption
```

**Recommended Range**:
- **Min**: `0.0` (full glitch effects, maximum disruption)
- **Max**: `1.0` (minimal glitch, nearly clean)
- **Step**: `0.01` (fine control recommended)
- **Default**: `0.0` (Hero/Ambient), `0.0-0.1` (Read)

**Visual Effect**:
- `0.0`: Full glitch intensity, maximum geometric fragmentation
- `0.1-0.3`: Noticeable but controlled glitch artifacts
- `0.4-0.7`: Subtle technical aesthetic, hints of disruption
- `0.8-1.0`: Nearly clean, minimal visible effects

**Use Cases**:
- **Hero sections**: 0.0 for maximum impact
- **Ambient sections**: 0.0-0.1 for visible but controlled effects
- **Reading sections**: 0.0-0.2 (calm parameter does most of the work here)

**Note**: This parameter is less important in GS2 than GS1. The `calm` parameter is the primary intensity control.

---

### `data-read-white-bias` → `u_readWhiteBias`

**Purpose**: Adds brightness/whiteness to the overall output, similar to GS1.

**Mathematical Usage**:
```glsl
vec3 finalColor = mix(technicalColor, vec3(1.0), u_readWhiteBias);
```

**Recommended Range**:
- **Min**: `0.0` (natural colors, full saturation)
- **Max**: `1.0` (completely white)
- **Step**: `0.01`
- **Default**: `0.0` (Hero/Ambient), `0.0-0.2` (Read)

**Visual Effect**:
- `0.0`: Full technical color palette (purples, magentas, greens)
- `0.1-0.3`: Lightened technical aesthetic
- `0.4-0.7`: Washed out, ethereal glitch
- `0.8-1.0`: Nearly white with hints of color

**Use Cases**:
- **Hero sections**: 0.0-0.1 for bold color
- **Ambient sections**: 0.0-0.15 for visible but comfortable
- **Reading sections**: 0.0-0.2 for legibility

**Interaction**: Can create interesting "data fog" effects when combined with high calm values.

---

### `data-flow-dir` → `u_flowDir`

**Purpose**: Controls the directional bias of glitch flow and geometric displacement. Creates sense of data streaming in a particular direction.

**Mathematical Usage**:
```glsl
vec2 drift = vec2(cos(u_flowDir), sin(u_flowDir));
// Applied to UV coordinates, ghost movement, displacement vectors
```

**Input Format**: 
- Accepts degrees with `"deg"` suffix: `"45deg"`, `"90deg"`
- Accepts radians as plain numbers: `"1.57"`, `"3.14"`
- Adapter converts degrees to radians automatically

**Recommended Range**:
- **Min**: `0deg` / `0` (rightward flow)
- **Max**: `360deg` / `6.28` (full rotation)
- **Step**: `1deg` / `0.017rad` (360 steps for degree mode, ~369 for radian mode)
- **Common Values**:
  - `0deg`: Horizontal right →
  - `45deg`: Diagonal up-right ↗
  - `90deg`: Vertical up ↑
  - `135deg`: Diagonal up-left ↖
  - `180deg`: Horizontal left ←
  - `270deg`: Vertical down ↓

**Visual Effect**:
- Creates directional "streaming" of glitch artifacts
- Affects ghost cursor movement trajectories
- Influences geometric displacement orientation
- Most visible in vector-glitch and signal-flow modes

**Mode-Specific Recommendations**:
- **Glitch Grid**: 0°, 45°, 90° (aligned with grid)
- **Vector Glitch**: 30°, 45°, 60° (diagonal emphasis)
- **Signal Flow**: 0°, 90°, 180° (data stream directions)

**Testing Recommendations**:
1. Test cardinal directions first (0°, 90°, 180°, 270°)
2. Test diagonals (45°, 135°, 225°, 315°)
3. Determine if intermediate angles (15°, 30°, 60°) add value
4. Consider if step size of 5° or 15° is sufficient for most use cases

**Advanced Use**: 
- Could be animated over time for rotating effect
- Could follow mouse/cursor direction for interactive flow
- Could be mapped to scroll position for progressive direction shift

---

### `data-calm` → `u_calm`

**Purpose**: PRIMARY intensity control for GS2. Reduces motion, disruption, and chaos. This is the most important parameter for controlling the shader's energy level.

**Mathematical Usage**:
```glsl
float calmK = clamp(u_calm, 0.0, 1.0);
// Applied to:
// - Temporal displacement speed (multiplied by (1.0 - calmK))
// - Geometric fragmentation intensity
// - Ghost cursor speed and count
// - Color shift magnitude
```

**Recommended Range**:
- **Min**: `0.0` (maximum chaos, full motion)
- **Max**: `1.0` (nearly static, minimal disruption)
- **Step**: `0.01` (fine control important for preset tuning)
- **Default**: `0.05` (Hero), `0.45` (Ambient), `0.85` (Read)

**Visual Effect**:
- `0.0-0.1`: Intense glitch, rapid motion, multiple ghost cursors, high energy
- `0.2-0.4`: Active but controlled, visible motion, moderate disruption
- `0.5-0.7`: Calm technical aesthetic, slow gentle movement
- `0.8-0.95`: Very subtle, near-static with hints of life
- `0.95-1.0`: Nearly frozen, minimal perceptible motion

**Use Cases**:
- **Hero sections**: 0.03-0.1 for maximum energy
- **Ambient sections**: 0.4-0.5 for comfortable viewing
- **Reading sections**: 0.8-0.9 for minimal distraction

**Performance Impact**:
- Higher calm values can improve performance (fewer ghost calculations)
- Lower calm values may reduce frame rate on slower devices
- Consider device-adaptive calm adjustment

**Precision Requirements**:
- 0.01 step recommended - the 0.05 vs 0.15 difference is very noticeable
- Consider separate "coarse" (0.1) and "fine" (0.01) step modes

---

## Preset Combinations

### Hero Preset (Maximum Energy)
```html
data-read-topo-flatten="0.0"
data-read-white-bias="0.0" 
data-flow-dir="0deg"
data-calm="0.05"
```
**Character**: Intense, chaotic, high-energy technical disruption

### Ambient Preset (Balanced Technical)
```html
data-read-topo-flatten="0.0"
data-read-white-bias="0.0"
data-flow-dir="45deg" 
data-calm="0.45"
```
**Character**: Controlled glitch aesthetic, moderate motion, diagonal flow

### Read Preset (Minimal Disruption)
```html
data-read-topo-flatten="0.0"
data-read-white-bias="0.0"
data-flow-dir="90deg"
data-calm="0.85"
```
**Character**: Very subtle technical hints, minimal motion, vertical calm flow

---

## Mode-Specific Behavior

### Glitch Grid (`data-shader-mode="glitch-grid"`)
- Geometric grid fragmentation and displacement
- **Calm effect**: Reduces fragment count and displacement amount
- **Flow effect**: Tilts grid displacement direction
- **Best calm range**: 0.05-0.5 (very visible at low calm)
- **Best flow**: 0°, 45°, 90° (grid-aligned)

### Vector Glitch (`data-shader-mode="vector-glitch"`)
- Sharp vector-based disruption and data corruption aesthetics
- **Calm effect**: Reduces vector displacement speed and sharpness
- **Flow effect**: Strong influence on vector orientation
- **Best calm range**: 0.05-0.6 (maintains vector character)
- **Best flow**: 30°, 45°, 60° (dynamic diagonals)

### Signal Flow (`data-shader-mode="signal-flow"`)
- Data stream visualization with flowing particles/lines
- **Calm effect**: Slows stream speed, reduces particle density
- **Flow effect**: Primary stream direction (very important here)
- **Best calm range**: 0.1-0.85 (wide useful range)
- **Best flow**: 0°, 90°, 180° (cardinal data flow)

---

## Advanced Uniforms (Engine/Adapter Controlled)

These are NOT directly controlled by data attributes but are worth understanding:

### `u_heroAlwaysOnK` 
- Controlled by preset system
- Affects "always-on" technical effect intensity
- Automatically set based on spatial/temporal motion

### `u_cursorSpeed`
- Calculated by adapter from mouse movement
- Affects ghost cursor behavior and effect intensity
- Read-only (cannot be set via attribute)

### `u_ghostTime`
- Accumulator for ghost animation timing
- Auto-increments based on cursor activity
- Read-only

---

## Config Form Recommendations

### Standard Controls
```json
{
  "data-calm": {
    "label": "Calm (Motion Intensity)",
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "default": 0.45,
    "description": "Primary control: 0=chaos, 1=calm"
  },
  "data-flow-dir": {
    "label": "Flow Direction",
    "min": 0,
    "max": 360,
    "step": 1,
    "default": 45,
    "unit": "deg",
    "description": "Direction of glitch flow (degrees)"
  },
  "data-read-white-bias": {
    "label": "White Bias (Brightness)",
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "default": 0.0
  },
  "data-read-topo-flatten": {
    "label": "Effect Flatten",
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "default": 0.0,
    "description": "Reduces glitch intensity (less used than calm)"
  }
}
```

### Advanced Form Features

**Direction Presets** (helpful for flow-dir):
```html
<div class="preset-buttons">
  <button data-value="0">→ Right</button>
  <button data-value="45">↗ Up-Right</button>
  <button data-value="90">↑ Up</button>
  <button data-value="135">↖ Up-Left</button>
  <button data-value="180">← Left</button>
  <button data-value="270">↓ Down</button>
</div>
```

**Dual Step Sizes** (for calm):
```html
<label>
  <input type="radio" name="calm-step" value="0.1" checked> Coarse (0.1)
  <input type="radio" name="calm-step" value="0.01"> Fine (0.01)
</label>
```

---

## Testing Recommendations

### Phase 1: Calm Range Testing
1. Test calm at 0.0, 0.25, 0.5, 0.75, 1.0 across all modes
2. Identify minimum usable calm (when is it too chaotic?)
3. Identify maximum useful calm (when does it become boring?)
4. Determine if 0.01 step is necessary or if 0.05 suffices

### Phase 2: Flow Direction Testing
1. Test all cardinal directions (0°, 90°, 180°, 270°)
2. Test common diagonals (45°, 135°, 225°, 315°)
3. Determine if intermediate angles provide value
4. Test if step size of 15° or 5° is sufficient

### Phase 3: Interaction Testing
1. Test extreme combinations (high calm + all directions)
2. Test low calm with varying flow directions
3. Document any unexpected visual artifacts
4. Identify "sweet spot" combinations per mode

### Phase 4: Performance Testing
1. Test low calm (<0.1) on target devices
2. Measure frame rate impact
3. Consider adaptive calm for low-end devices

---

## Known Constraints

1. **Flow direction**: Accepts 0-360° or 0-2π radians, wraps around
2. **Calm clamping**: Always clamped to [0, 1], no extension possible
3. **Direction precision**: Adapter uses floating-point radians internally (high precision)
4. **No negative calm**: Values <0 are clamped to 0
5. **White-bias independence**: Does not affect glitch structure, only color

---

## Extreme Value Behavior

### Calm = 0.0
**Result**: Maximum chaos, many ghost cursors, rapid motion  
**Performance**: Can be demanding (30-45 FPS on mid-range devices)  
**Visual**: Very energetic, possibly overwhelming

### Calm = 1.0
**Result**: Nearly static, minimal motion, single ghost hint  
**Performance**: Best (60 FPS easily achievable)  
**Visual**: Subtle, almost boring, minimal technical character

### Flow = 0° vs 180° (opposite directions)
**Result**: Completely different directional character  
**Transition**: Can be jarring if changed abruptly (consider smooth rotation)

---

## Future Enhancement Ideas

1. **Separate spatial/temporal calm**: Independent control of motion types
2. **Flow speed multiplier**: Control flow rate independent of direction
3. **Ghost cursor count control**: Explicit control over number of ghosts
4. **Fragment size control**: Control geometric fragmentation scale
5. **Color palette selection**: Choose between different technical color schemes
6. **Flow direction animation**: Auto-rotate option
7. **Calm easing curves**: Non-linear calm response for more natural feel
