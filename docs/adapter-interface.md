# Shader Adapter Interface

## Overview

The shader adapter is the bridge between the generic `gs-engine.js` and shader-specific implementations. Each shader system (GS1, GS2, GS3) provides an adapter that defines:

1. **Custom uniforms** - Shader-specific parameters beyond the standard engine uniforms
2. **Data attribute mapping** - How HTML `data-*` attributes map to shader uniforms
3. **Section-based blending** - How to accumulate and blend values across multiple viewport sections

## Universal vs Shader-Specific Uniforms

### Engine-Managed Universal Uniforms

The engine (`gs-engine.js`) manages these uniforms that are available to **all shaders**:

- `u_time` - Elapsed time in seconds
- `u_resolution` - Canvas resolution (buffer pixels, affected by DPR)
- `u_mouse` - Mouse position in normalized coordinates (0-1)
- `u_mode` - Current rendering mode (numeric value for smooth transitions)
- `u_modeWeight0` - Weight of mode 0 in viewport (0-1, set instantly by engine)
- `u_modeWeight1` - Weight of mode 1 in viewport (0-1, set instantly by engine)
- `u_modeWeight2` - Weight of mode 2 in viewport (0-1, set instantly by engine)
- `u_spatialMotion` - Spatial animation intensity (0-1)
- `u_temporalMotion` - Temporal animation intensity (0-1)
- `u_cursorEnabled` - Cursor interaction enabled flag (0-1)
- `u_calm` - Calmness/stillness factor (0-1)

**Mode Uniforms Explained:**

- `u_mode` lerps smoothly between mode values (e.g., 0.0 → 1.0 → 2.0) for transitions
- `u_modeWeight0/1/2` represent the actual viewport weights computed by the engine's smart blending
- Use mode weights in your shader to blend between visual modes, not `u_mode` ranges
- This prevents unwanted mode activation during wrap-around transitions (e.g., mode 0 ↔ mode 2)

These uniforms are automatically accumulated from preset values and smoothly interpolated by the engine. **Adaptors should NOT declare these uniforms** in `extendUniforms()`.

### Shader-Specific Uniforms

Each shader's adaptor declares additional uniforms specific to that shader's visual needs:

**GS1 (Topographic)**:

- `u_cursorGlobal`, `u_flatten`, `u_heightContrast` - Preset-driven visual controls
- `u_focusEnabled`, `u_focusStrength`, `u_focusRect` - Focus zone controls
- `u_warpIntensity`, `u_topoBands`, `u_topoWhiteBias`, `u_organicBacklight`, `u_organicDarkening` - Mode-specific controls

**GS2 (Glitch)**:

- `u_heroAlwaysOnK`, `u_flowDir`, `u_cursorSpeed`, `u_ghostTime` - Motion and state tracking
- Mode-specific grid, shard, and flow parameters

**GS3 (Dot Field)**:

- `u_viewportWidth` - DPR-independent viewport scaling
- `u_paletteK`, `u_seed`, `u_cursorInfluence`, `u_cursorSpeed` - Visual state
- Kusama-specific knobs for dot patterns

## Declarative Uniforms Pattern

All three shader adaptors use a **declarative pattern** to define uniforms once as a single source of truth:

```javascript
const UNIFORMS = {
  // Each uniform defined with metadata
  myParam: {
    uniform: "u_myParam", // Uniform name in shader
    default: 1.0, // Default value
    dataAttr: "data-my-param", // HTML data attribute name
    accumulate: true, // Whether to accumulate from sections (default: true)
    validator: (v) => clamp(v, 0, 2), // Optional value validation/clamping
    threeValue: (THREE) => new THREE.Vector4(), // For THREE.js types (GS1 only)
    accumulateAsVector: true, // Special vector accumulation (GS2 flowDir)
    parseValue: (raw) => parseFloat(raw), // Custom parsing logic
    useMaterialFallback: true, // Fall back to preset-driven uniform value
  },
};
```

**Benefits**:

- **Single source of truth**: Define each uniform once, not in 6+ methods
- **Easy maintenance**: Adding a parameter requires just one line
- **Self-documenting**: Metadata serves as inline documentation
- **Consistent behavior**: All uniforms processed uniformly
- **Flexible**: Supports special cases (vectors, THREE types, validators)

**How it works**: All adapter methods (extendUniforms, initTarget, initAcc, etc.) iterate over the UNIFORMS object rather than manually listing properties.

### UNIFORMS Metadata Properties

Each uniform definition supports these properties:

| Property              | Type         | Required | Purpose                                                   | Example                            |
| --------------------- | ------------ | -------- | --------------------------------------------------------- | ---------------------------------- |
| `uniform`             | string       | ✅       | Uniform name in shader                                    | `'u_myParam'`                      |
| `default`             | any/function | ✅       | Default value (or function returning value)               | `1.0` or `() => window.innerWidth` |
| `dataAttr`            | string       | ⬜       | HTML data attribute to read                               | `'data-my-param'`                  |
| `accumulate`          | boolean      | ⬜       | Whether to accumulate from sections (default: true)       | `false` for computed uniforms      |
| `validator`           | function     | ⬜       | Validate/clamp parsed values                              | `(v) => Math.max(0, v)`            |
| `threeValue`          | function     | ⬜       | Create THREE.js types (receives THREE instance)           | `(THREE) => new THREE.Vector4()`   |
| `accumulateAsVector`  | boolean      | ⬜       | Use vector accumulation for angles (GS2 only)             | `true` for flowDir                 |
| `parseValue`          | function     | ⬜       | Custom parsing logic                                      | `(raw) => parseDegrees(raw)`       |
| `useMaterialFallback` | boolean      | ⬜       | Fall back to preset-driven material value if no data-attr | `true` for preset-driven params    |

**Special Cases**:

**GS1 - THREE.js Vector4**:

```javascript
focusRect: {
    uniform: 'u_focusRect',
    default: null,
    accumulate: false,
    threeValue: (THREE) => new THREE.Vector4(0.5, 0.5, 1, 1)
}
```

**GS2 - Vector Accumulation for Angles**:

```javascript
flowDir: {
    uniform: 'u_flowDir',
    default: 0.0,
    dataAttr: 'data-flow-dir',
    accumulateAsVector: true,  // Accumulate as X/Y components
    parseValue: (raw) => {
        // Parse "45deg" or "0.785"
        if (raw.endsWith('deg')) return degToRad(parseFloat(raw));
        return parseFloat(raw);
    }
}
```

**GS3 - Function-Based Default**:

```javascript
viewportWidth: {
    uniform: 'u_viewportWidth',
    default: () => window.innerWidth,  // Function called each time
    accumulate: false
}
```

**Preset-Driven with Data Override** (GS1):

```javascript
cursorGlobal: {
    uniform: 'u_cursorGlobal',
    default: 0.0,
    dataAttr: 'data-cursor-global',
    useMaterialFallback: true  // Use preset value if no data-attr
}
```

---

## Adapter API

All adapters must implement the following methods. The engine calls these at specific lifecycle points.

---

### `extendUniforms(THREE)`

**Called**: Once during engine initialization  
**Purpose**: Define additional uniforms that will be added to the shader material

**Parameters**:

- `THREE` - The Three.js library instance

**Returns**: Object mapping uniform names to Three.js uniform objects

**Example** (declarative pattern):

```javascript
extendUniforms(THREE) {
    const uniforms = {};
    for (const [key, def] of Object.entries(UNIFORMS)) {
        if (def.threeValue) {
            // Handle THREE.js types (e.g., Vector4)
            uniforms[def.uniform] = { value: def.threeValue(THREE) };
        } else {
            // Standard values
            const defaultValue = typeof def.default === 'function' ? def.default() : def.default;
            uniforms[def.uniform] = { value: defaultValue };
        }
    }
    return uniforms;
}
```

**Legacy Example** (manual listing):

```javascript
extendUniforms(THREE) {
    return {
        u_cursorGlobal: { value: 0.0 },
        u_flatten: { value: 0.0 },
        u_warpIntensity: { value: 1.0 },
        u_focusRect: { value: new THREE.Vector4(0.5, 0.5, 1, 1) }
    };
}
```

**Important Notes**:

- Do NOT declare engine-managed uniforms (`u_time`, `u_resolution`, `u_mouse`, `u_mode`, `u_modeWeight0`, `u_modeWeight1`, `u_modeWeight2`, `u_spatialMotion`, `u_temporalMotion`, `u_cursorEnabled`, `u_calm`)
- Only declare uniforms specific to your shader's needs
- If your shader needs preset-driven values not in the universal set (like `u_cursorGlobal`, `u_flatten`), declare them here

---

### `initTarget()`

**Called**: Once during engine initialization  
**Purpose**: Initialize the target state object that will hold the goal values for smooth transitions

**Returns**: Object with initial target values (usually 0.0 or default values)

**Example** (declarative pattern):

```javascript
initTarget() {
    const target = {};
    // Only include accumulated uniforms (filter out accumulate: false)
    for (const [key, def] of accumulatedUniforms) {
        target[key] = typeof def.default === 'function' ? def.default() : def.default;
    }
    return target;
}
```

**Legacy Example** (manual listing):

```javascript
initTarget() {
    return {
        cursorGlobal: 0.0,
        flatten: 0.0,
        warpIntensity: 1.0,
        topoBands: 20.0
    };
}
```

**Note**: Only include properties for shader-specific uniforms. Engine-managed properties (`spatial`, `temporal`, `cursor`, `calm`) are handled automatically. Non-accumulated uniforms (with `accumulate: false`) should be excluded.

---

### `initAcc()`

**Called**: Every frame before section accumulation  
**Purpose**: Initialize the accumulator object that will sum weighted values from visible sections

**Returns**: Object with properties matching `initTarget()`, all initialized to 0.0

**Example** (declarative pattern):

```javascript
initAcc() {
    const acc = {};
    for (const [key] of accumulatedUniforms) {
        acc[key] = 0.0;
    }
    // Special case: vector accumulation for angles (GS2 only)
    if (UNIFORMS.flowDir?.accumulateAsVector) {
        acc.flowDirX = 0.0;
        acc.flowDirY = 0.0;
    }
    return acc;
}
```

**Legacy Example** (manual listing):

```javascript
initAcc() {
    return {
        cursorGlobal: 0.0,
        flatten: 0.0,
        warpIntensity: 0.0,
        topoBands: 0.0
    };
}
```

**Note**: Properties should match `initTarget()` keys, all initialized to 0.0 for proper weighted accumulation. Only include accumulated uniforms.

---

### `accumulateFromSection({ el, w, acc, clamp01 })`

**Called**: For each visible section in the viewport  
**Purpose**: Read data attributes from the section element and accumulate weighted values

**Parameters**:

- `el` - The DOM section element (has `data-*` attributes)
- `w` - Weight for this section (0.0 to 1.0, based on viewport overlap)
- `acc` - Accumulator object to add values to
- `clamp01` - Utility function to clamp values to [0, 1] range
- `material` - Three.js material (for accessing current uniform values)

**Returns**: Nothing (modifies `acc` in place)

**Example** (declarative pattern):

```javascript
accumulateFromSection({ el, w, acc, clamp01, material }) {
    for (const [key, def] of standardUniforms) {
        let raw = el.getAttribute(def.dataAttr);
        let val = def.default;

        if (raw !== null && raw !== '') {
            val = def.parseValue ? def.parseValue(raw) : parseFloat(raw);
            if (Number.isNaN(val)) val = def.default;
        } else if (def.useMaterialFallback) {
            // Fall back to preset-driven value from material
            val = material.uniforms[def.uniform]?.value ?? def.default;
        }

        if (def.validator) val = def.validator(val);
        acc[key] += val * w;
    }

    // Special case: vector accumulation for angles (GS2 only)
    if (UNIFORMS.flowDir?.accumulateAsVector) {
        const angle = parseAngle(el.getAttribute('data-flow-dir')) || 0.0;
        acc.flowDirX += Math.cos(angle) * w;
        acc.flowDirY += Math.sin(angle) * w;
    }
}
```

**Legacy Example** (manual listing):

```javascript
accumulateFromSection({ el, w, acc, clamp01, material }) {
    const cursorGlobal = clamp01(parseFloat(el.getAttribute('data-cursor-global'))
        || material.uniforms.u_cursorGlobal?.value || 0);
    const warpIntensity = clamp01(parseFloat(el.getAttribute('data-warp-intensity')) || 1.0);

    acc.cursorGlobal += cursorGlobal * w;
    acc.warpIntensity += warpIntensity * w;
}
```

**Data Attribute Guidelines**:

- Use lowercase with hyphens: `data-my-param`
- Provide sensible defaults with `|| defaultValue`
- Always parse and validate values (parseFloat, parseInt, etc.)
- Clamp values to appropriate ranges using `clamp01()` or custom logic
- For preset-driven values (like `cursorGlobal`), fall back to current uniform value from material

---

### `accumulateBaseline({ need, acc, material })`

**Called**: After section accumulation, if viewport overlap doesn't sum to 1.0  
**Purpose**: Fill the remaining weight with current shader state (creates smooth transitions)

**Parameters**:

- `need` - Weight needed to sum to 1.0 (e.g., 0.3 if sections only covered 0.7)
- `acc` - Accumulator object to add baseline values to
- `material` - Three.js material (access current uniform values via `material.uniforms`)

**Returns**: Nothing (modifies `acc` in place)

**Example** (declarative pattern):

```javascript
accumulateBaseline({ need, acc, material }) {
    for (const [key, def] of accumulatedUniforms) {
        const currentValue = material.uniforms[def.uniform]?.value ?? def.default;
        acc[key] += currentValue * need;
    }

    // Special case: vector accumulation (GS2 only)
    if (UNIFORMS.flowDir?.accumulateAsVector) {
        const currentAngle = material.uniforms.u_flowDir?.value || 0.0;
        acc.flowDirX += Math.cos(currentAngle) * need;
        acc.flowDirY += Math.sin(currentAngle) * need;
    }
}
```

**Legacy Example** (manual listing):

```javascript
accumulateBaseline({ need, acc, material }) {
    acc.cursorGlobal += (material.uniforms.u_cursorGlobal?.value || 0) * need;
    acc.warpIntensity += (material.uniforms.u_warpIntensity?.value || 1.0) * need;
}
```

**Note**: Use current uniform values (not defaults) to ensure smooth transitions when scrolling past all sections.

---

### `finalizeTargets({ target, totalW, acc })`

**Called**: After all accumulation is complete  
**Purpose**: Normalize accumulated values and update the target state

**Parameters**:

- `target` - Current target state object
- `totalW` - Total weight accumulated (should be ~1.0 after baseline)
- `acc` - Accumulator with summed weighted values

**Returns**: Object with updated `target` property

**Example** (declarative pattern):

```javascript
finalizeTargets({ target, totalW, acc }) {
    const invW = 1.0 / Math.max(totalW, 1e-6);
    const newTarget = { ...target };

    for (const [key] of accumulatedUniforms) {
        newTarget[key] = acc[key] * invW;
    }

    // Special case: convert vector to angle (GS2 only)
    if (UNIFORMS.flowDir?.accumulateAsVector) {
        const x = acc.flowDirX * invW;
        const y = acc.flowDirY * invW;
        newTarget.flowDir = Math.atan2(y, x);
    }

    return { target: newTarget };
}
```

**Legacy Example** (manual listing):

```javascript
finalizeTargets({ target, totalW, acc }) {
    const invW = 1.0 / Math.max(totalW, 1e-6);
    return {
        target: {
            ...target,
            cursorGlobal: acc.cursorGlobal * invW,
            warpIntensity: acc.warpIntensity * invW
        }
    };
}
```

**Note**: Always normalize by `invW` and spread the existing `target` to preserve engine-managed properties.

---

### `applyFrameUniforms({ material, target, a })`

**Called**: Every animation frame  
**Purpose**: Smoothly interpolate current uniform values toward target values

**Parameters**:

- `material` - Three.js material with uniforms to update
- `target` - Target state (goal values)
- `a` - Alpha value for smooth interpolation (typically 0.05-0.15)

**Returns**: Nothing (modifies `material.uniforms` in place)

**Example** (declarative pattern):

```javascript
applyFrameUniforms({ material, target, a }) {
    for (const [key, def] of accumulatedUniforms) {
        const u = material.uniforms[def.uniform];
        if (u && target[key] !== undefined) {
            u.value += (target[key] - u.value) * a;
        }
    }

    // Update computed uniforms (GS2/GS3)
    if (material.uniforms.u_cursorSpeed) {
        material.uniforms.u_cursorSpeed.value = cursorSpeed;
    }
    if (material.uniforms.u_ghostTime) {
        material.uniforms.u_ghostTime.value = ghostTime;
    }
}
```

**Legacy Example** (manual listing):

```javascript
applyFrameUniforms({ material, target, a }) {
    const uCursorGlobal = material.uniforms.u_cursorGlobal;
    const uWarp = material.uniforms.u_warpIntensity;

    if (uCursorGlobal) uCursorGlobal.value += (target.cursorGlobal - uCursorGlobal.value) * a;
    if (uWarp) uWarp.value += (target.warpIntensity - uWarp.value) * a;
}
```

**Important**: The engine automatically lerps universal uniforms (`u_spatialMotion`, `u_temporalMotion`, `u_cursorEnabled`, `u_calm`, `u_mode`). Mode weights (`u_modeWeight0`, `u_modeWeight1`, `u_modeWeight2`) are set instantly without lerping. Do NOT lerp engine-managed uniforms in your adaptor.

**Interpolation Guidelines**:

- Use `+= (target - current) * alpha` for smooth transitions
- Always check if uniform exists before updating
- Typical alpha values: 0.05 (slow), 0.1 (medium), 0.2 (fast)

---

## Data Flow Summary

```
1. Engine initializes
   ├─> extendUniforms() - Define shader-specific uniforms
   ├─> initTarget() - Initialize shader-specific target state
   ├─> Material created with universal + shader-specific uniforms
   └─> Engine sets up universal uniforms (time, resolution, mouse, mode, spatial, temporal, cursor, calm)

2. Every frame during scroll
   ├─> Engine accumulates universal presets (spatial, temporal, cursor, calm)
   ├─> initAcc() - Reset shader-specific accumulator
   ├─> For each visible section:
   │   └─> accumulateFromSection() - Add weighted shader-specific values
   ├─> If totalW < 1.0:
   │   └─> accumulateBaseline() - Fill with current shader-specific state
   ├─> finalizeTargets() - Normalize and set shader-specific targets
   ├─> Engine lerps universal uniforms (mode, spatialMotion, temporalMotion, cursorEnabled, calm)
   └─> applyFrameUniforms() - Lerp shader-specific uniforms
```

---

## Shader-Specific Data Attributes

### Universal Preset Attributes (All Shaders)

These attributes are read from preset configs and automatically managed by the engine:

| Attribute            | Uniform                                                            | Type   | Purpose                           |
| -------------------- | ------------------------------------------------------------------ | ------ | --------------------------------- |
| `data-shader-preset` | `u_spatialMotion`, `u_temporalMotion`, `u_cursorEnabled`, `u_calm` | string | Preset name (HERO, AMBIENT, READ) |
| `data-shader-mode`   | `u_mode`                                                           | string | Rendering mode name               |

**Engine reads these from config files** - you don't need data-attributes for `spatial`, `temporal`, `cursor`, `calm` unless overriding.

---

### GS1: Topographic Flow Shader

**Adapter**: `BG_TopoReadAdapter`  
**Config**: `gs1/config.js`

#### Preset-Driven Attributes (from config)

| Config Property  | Uniform            | Range | Purpose                          |
| ---------------- | ------------------ | ----- | -------------------------------- |
| `cursorGlobal`   | `u_cursorGlobal`   | 0-1   | Global vs local cursor influence |
| `flatten`        | `u_flatten`        | 0-1   | Topographic flattening           |
| `heightContrast` | `u_heightContrast` | 0-2   | Height map contrast              |

#### Data Attribute Overrides

| Attribute                | Uniform              | Range | Purpose                                   |
| ------------------------ | -------------------- | ----- | ----------------------------------------- |
| `data-cursor-global`     | `u_cursorGlobal`     | 0-1   | Override preset cursorGlobal              |
| `data-flatten`           | `u_flatten`          | 0-1   | Override preset flatten                   |
| `data-height-contrast`   | `u_heightContrast`   | 0-2   | Override preset heightContrast            |
| `data-warp-intensity`    | `u_warpIntensity`    | 0-1   | Spatial distortion strength               |
| `data-topo-bands`        | `u_topoBands`        | 2-50  | Contour line count (topographic mode)     |
| `data-topo-white-bias`   | `u_topoWhiteBias`    | 0-0.5 | White region expansion (topographic mode) |
| `data-organic-backlight` | `u_organicBacklight` | 0-1   | Backlight intensity (fabric mode)         |
| `data-organic-darkening` | `u_organicDarkening` | 0-1   | Peak darkening (fabric mode)              |

**Preset Examples**:

```html
<!-- Hero: Maximum topology variation, local cursor control -->
<div data-shader-preset="hero" data-shader-mode="topographic-flow">
  <!-- Config provides: cursorGlobal=0.0, flatten=0.0, heightContrast=1.0 -->

  <!-- Ambient: Balanced -->
  <div data-shader-preset="ambient" data-warp-intensity="0.8">
    <!-- Config provides: cursorGlobal=0.0, flatten=0.35, heightContrast=0.6 -->

    <!-- Read: Flattened for readability, global cursor -->
    <div data-shader-preset="read" data-topo-bands="30">
      <!-- Config provides: cursorGlobal=1.0, flatten=0.85, heightContrast=0.25 -->
    </div>
  </div>
</div>
```

---

### GS2: Glitch Technical Shader

**Adapter**: `BG2_AllModesAdapter`  
**Config**: `gs2/config.js`

**Note**: GS2's presets only define universal properties (`spatial`, `temporal`, `cursor`, `calm`). All other controls are data-attribute driven.

| Attribute                | Uniform                  | Range                 | Purpose                              |
| ------------------------ | ------------------------ | --------------------- | ------------------------------------ |
| `data-flow-dir`          | `u_flowDir`              | 0-360deg or 0-6.28rad | Directional flow angle               |
| `data-grid-line-width`   | `u_gridLineWidth`        | 0-3                   | Grid line thickness (Mode 0)         |
| `data-grid-fill-amount`  | `u_gridFillAmount`       | 0-1                   | Cell fill probability (Mode 0)       |
| `data-grid-cursor-fills` | `u_gridCursorFills`      | 0-1                   | Cursor-influenced fills (Mode 0)     |
| `data-grid-subdivision`  | `u_gridSubdivisionDepth` | 0-1                   | BSP recursion depth (Mode 0)         |
| `data-grid-small-fills`  | `u_gridSmallFills`       | 0-1                   | Small cell fill probability (Mode 0) |
| `data-shard-count`       | `u_shardCount`           | 0-1                   | Shard density (Mode 1)               |
| `data-shard-speed`       | `u_shardSpeed`           | 0-1                   | Shard animation speed (Mode 1)       |
| `data-shard-chaos`       | `u_shardChaos`           | 0-1                   | Shard disorder (Mode 1)              |
| `data-flow-density`      | `u_flowDensity`          | 0-1                   | Flow line density (Mode 2)           |
| `data-flow-warp`         | `u_flowWarp`             | 0-1                   | Flow distortion (Mode 2)             |

**Computed Uniforms** (not directly settable):

- `u_cursorSpeed` - Calculated from mouse movement
- `u_ghostTime` - Time value for ghost cursor trails
- `u_heroAlwaysOnK` - Derived from spatial motion preset

**Preset Examples**:

```html
<!-- Hero: Maximum chaos -->
<div
  data-shader-preset="hero"
  data-shader-mode="glitch-grid"
  data-flow-dir="0deg"
  data-grid-fill-amount="0.7"
>
  <!-- Config provides: spatial=0.95, temporal=0.70, cursor=1.0, calm=0.05 -->

  <!-- Ambient: Balanced technical aesthetic -->
  <div
    data-shader-preset="ambient"
    data-shader-mode="vector-glitch"
    data-flow-dir="45deg"
    data-shard-chaos="0.5"
  >
    <!-- Config provides: spatial=0.30, temporal=0.16, cursor=1.0, calm=0.45 -->

    <!-- Read: Minimal disruption -->
    <div
      data-shader-preset="read"
      data-shader-mode="signal-flow"
      data-flow-dir="90deg"
      data-flow-density="0.3"
    >
      <!-- Config provides: spatial=0.12, temporal=0.06, cursor=1.0, calm=0.85 -->
    </div>
  </div>
</div>
```

**Note**: `data-flow-dir` accepts both degrees (e.g., `"45deg"`) and radians (e.g., `"0.785"`).

---

### GS3: Dot Field Shader

**Adapter**: `BG3_DotAdapter`  
**Config**: `gs3/config.js`

**Note**: GS3's presets only define universal properties (`spatial`, `temporal`, `cursor`, `calm`). All other controls are data-attribute driven.

| Attribute               | Uniform             | Range | Purpose                           |
| ----------------------- | ------------------- | ----- | --------------------------------- |
| `data-palette`          | `u_paletteK`        | 0-1   | Color palette variation           |
| `data-seed`             | `u_seed`            | any   | Random seed for dot placement     |
| `data-cursor-influence` | `u_cursorInfluence` | 0-1   | Cursor effect on dots             |
| `data-k-grid`           | `u_kGrid`           | 0-1   | Grid regularity (Kusama mode)     |
| `data-k-jitter`         | `u_kJitter`         | 0-1   | Position randomness (Kusama mode) |
| `data-k-size`           | `u_kSize`           | 0-2   | Dot size multiplier (Kusama mode) |
| `data-k-lane-freq`      | `u_kLaneFreq`       | 0-1   | Lane frequency (Kusama mode)      |
| `data-k-lane-wobble`    | `u_kLaneWobble`     | 0-1   | Animation wobble (Kusama mode)    |
| `data-k-alpha`          | `u_kAlpha`          | 0-1   | Dot opacity (Kusama mode)         |
| `data-k-curve-amp`      | `u_kCurveAmp`       | 0-1   | Curve amplitude (Octopus mode)    |
| `data-k-curve-variety`  | `u_kCurveVariety`   | 0-1   | Lane uniqueness (Octopus mode)    |

**Computed Uniforms** (not directly settable):

- `u_cursorSpeed` - Calculated from mouse movement
- `u_viewportWidth` - CSS pixel width (DPR-independent)

**Preset Examples**:

```html
<!-- Hero: Dense organic clustering -->
<div
  data-shader-preset="hero"
  data-shader-mode="kusama-infinite"
  data-k-grid="0.5"
  data-k-jitter="0.35"
  data-k-size="0.5"
>
  <!-- Config provides: spatial=0.95, temporal=0.70, cursor=1.0, calm=0.10 -->

  <!-- Read: Sparse meditative -->
  <div
    data-shader-preset="read"
    data-shader-mode="perlin-dot-field"
    data-palette="0.3"
    data-cursor-influence="0.2"
  >
    <!-- Config provides: spatial=0.12, temporal=0.06, cursor=1.0, calm=0.90 -->
  </div>
</div>
```

**Seed Guidelines**:

- Keep `data-seed` consistent within the same mode to avoid visual disruption
- Changing seed causes complete re-distribution of dots
- Recommended: Use seed=0 or omit entirely for consistent results

---

## Creating a New Adapter

To create a new shader adapter, use the **declarative UNIFORMS pattern** for maintainability:

1. **Define your UNIFORMS object** (single source of truth):

   ```javascript
   window.MY_ShaderAdapter = (() => {
     const UNIFORMS = {
       // Define each uniform with metadata
       myParam: {
         uniform: "u_myParam",
         default: 1.0,
         dataAttr: "data-my-param",
         validator: (v) => Math.max(0, Math.min(2, v)),
       },
       anotherParam: {
         uniform: "u_anotherParam",
         default: 0.5,
         dataAttr: "data-another-param",
       },
     };

     // Filter accumulated uniforms (exclude accumulate: false)
     const accumulatedUniforms = Object.entries(UNIFORMS).filter(
       ([_, def]) => def.accumulate !== false
     );

     return {
       extendUniforms(THREE) {
         const uniforms = {};
         for (const [key, def] of Object.entries(UNIFORMS)) {
           uniforms[def.uniform] = { value: def.default };
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

       // ... implement remaining methods using iteration ...
     };
   })();
   ```

2. **Create your config** with modes and presets:

   ```javascript
   window.MY_SHADER_CONFIG = {
     modes: { "mode-name": 0.0, "other-mode": 1.0 },
     presets: {
       HERO: { spatial: 0.95, temporal: 0.7, cursor: 1.0, calm: 0.1 },
       AMBIENT: { spatial: 0.35, temporal: 0.18, cursor: 1.0, calm: 0.55 },
       READ: { spatial: 0.12, temporal: 0.06, cursor: 1.0, calm: 0.9 },
     },
     transitionVh: 0.5,
     smoothSpeed: 2.0,
   };
   ```

   **Important**: Only include universal preset properties (`spatial`, `temporal`, `cursor`, `calm`). Shader-specific properties should be managed by your adaptor.

3. **Create your fragment shader** as `window.MY_FRAGMENT_SHADER`

4. **Create init.js** using the standard IIFE pattern:

   ```javascript
   (function () {
     function initMY() {
       window.__MY_INSTANCE__ = window.initBGShaderSystem({
         canvasId: "bg-canvas",
         fragmentShader: window.MY_FRAGMENT_SHADER,
         config: window.MY_SHADER_CONFIG,
         adapter: window.MY_ShaderAdapter,
       });
     }
     if (document.readyState === "loading") {
       document.addEventListener("DOMContentLoaded", initMY);
     } else {
       initMY();
     }
   })();
   ```

5. **Register with ShaderManager** in `scroll-shader-manager-simple.js`:
   ```javascript
   SHADER_MAP: {
       'gs1': { /* ... */ },
       'gs2': { /* ... */ },
       'gs3': { /* ... */ },
       'my-shader': {
           config: 'MY_SHADER_CONFIG',
           shader: 'MY_FRAGMENT_SHADER',
           adapter: 'MY_ShaderAdapter',
           init: 'gs-my/init.js', // or wherever your init is
           scripts: ['gs-my/config.js', 'gs-my/shader.js', 'gs-my/adaptor.js']
       }
   }
   ```

---

## Best Practices

### Code Organization

- **Use declarative UNIFORMS pattern**: Define uniforms once, iterate in all methods
- **Single source of truth**: Avoid duplicating property names across multiple methods
- **Filter accumulated vs non-accumulated**: Use `accumulate: false` for computed uniforms
- Keep adaptor wrapped in IIFE to avoid global pollution: `window.MyAdapter = (() => { ... })()`

### Performance

- Keep `accumulateFromSection()` fast - it's called for every visible section every frame
- Avoid complex calculations in `applyFrameUniforms()` - use simple interpolation
- Use filtered arrays (`accumulatedUniforms`) to avoid processing non-accumulated uniforms
- Cache parsed attribute values in UNIFORMS metadata rather than re-parsing every frame

### Smoothness

- Use consistent alpha values in `applyFrameUniforms()` (0.05-0.15 is good)
- Ensure `accumulateBaseline()` uses current uniform values for smooth transitions
- Always normalize in `finalizeTargets()` to avoid accumulation drift

### Robustness

- Always provide fallback values: `|| defaultValue` or use `def.default`
- Check if uniforms exist before updating: `if (u) u.value = ...`
- Use validators in UNIFORMS definitions to keep values in valid ranges
- Handle missing or invalid attribute values gracefully via `parseValue` functions
- For preset-driven shader-specific properties, use `useMaterialFallback: true`

### Architecture

- **Engine manages**: Universal uniforms that all shaders need (`time`, `resolution`, `mouse`, `mode`, `spatial`, `temporal`, `cursor`, `calm`)
- **Adaptor manages**: Shader-specific uniforms and their accumulation/lerping
- **Config defines**: Only universal preset properties - shader-specific values come from data-attributes or adaptor logic
- **No duplicate management**: If engine manages it, don't redeclare it in `extendUniforms()` or lerp it in `applyFrameUniforms()`

### Debugging

- Add console logging to `finalizeTargets()` to see computed values
- Check `material.uniforms` in browser console to verify values
- Use dat.GUI or similar to manually control uniforms for testing
- Test with extreme values (0, 1, negative, very large) to ensure robustness

---

## Troubleshooting

**Problem**: Uniforms not updating  
**Solution**: Check that uniform names match between `extendUniforms()` and `applyFrameUniforms()`

**Problem**: Jumpy transitions  
**Solution**: Ensure `accumulateBaseline()` is filling with current uniform values, not defaults

**Problem**: Values not accumulating correctly  
**Solution**: Verify `totalW` is close to 1.0 in `finalizeTargets()`, check normalization

**Problem**: Attribute not being read  
**Solution**: Verify attribute name matches exactly (case-sensitive, including `data-` prefix)

**Problem**: Visual glitches on scroll  
**Solution**: Check that `initAcc()` resets all accumulator properties to 0.0 each frame

---

## Additional Resources

- See `gs1/adaptor.js` for a clean example using declarative UNIFORMS pattern with THREE.js types and validators
- See `gs2/adaptor.js` for advanced vector accumulation (angle handling) and motion tracking
- See `gs3/adaptor.js` for handling many uniforms efficiently with declarative pattern (18 uniforms)
- See `gs-engine.js` lines 180-280 for adapter hook calling points
- All three adaptors demonstrate the recommended declarative pattern - define uniforms once, iterate everywhere
