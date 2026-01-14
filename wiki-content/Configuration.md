# Configuration

Complete reference for configuring morphbg shader backgrounds.

## Quick Reference

### Required Attributes

Every section must have these two attributes:

```html
<section 
    data-shader-system="gs1|gs2|gs3"    <!-- Which shader -->
    data-shader-preset="HERO|AMBIENT|READ"> <!-- Motion level -->
```

### Common Patterns

```html
<!-- Hero section: High motion, dramatic -->
<section data-shader-system="gs1" data-shader-preset="HERO">

<!-- Content section: Medium motion -->
<section data-shader-system="gs2" data-shader-preset="AMBIENT">

<!-- Reading section: Low motion -->
<section data-shader-system="gs3" data-shader-preset="READ">
```

---

## Universal Parameters

These work across all shader systems.

### `data-shader-system`

**Required**. Specifies which shader to use.

```html
<section data-shader-system="gs1|gs2|gs3">
```

**Values**:
- `gs1` - Topographic Flow (organic patterns)
- `gs2` - Dynamic Warp (glitch aesthetic)
- `gs3` - Dot Field (Kusama-inspired)

See [Shader Systems](Shader-Systems) for details on each.

---

### `data-shader-preset`

**Required**. Controls motion intensity preset.

```html
<section data-shader-preset="HERO|AMBIENT|READ">
```

**Presets**:

| Preset | Motion | Target FPS | Best For |
|--------|--------|------------|----------|
| `HERO` | High | 50-60 | Hero sections, above fold |
| `AMBIENT` | Medium | 55-60 | Feature sections, mid-page |
| `READ` | Low | 60 | Content sections, reading |

**Under the hood**: Presets control these uniforms:
- `u_spatialMotion` - Spatial animation intensity
- `u_temporalMotion` - Temporal animation intensity
- `u_cursorEnabled` - Cursor interaction on/off
- `u_calm` - Overall calmness factor

---

### `data-calm`

Fine-tune calmness within a preset.

```html
<section data-calm="0.5">
```

- **Range**: 0.0-1.0
- **Default**: Preset-dependent
- **0.0**: Maximum motion
- **1.0**: Nearly static

**Use case**: Override preset defaults
```html
<!-- HERO preset but calmer -->
<section data-shader-preset="HERO" data-calm="0.6">

<!-- AMBIENT but more energetic -->
<section data-shader-preset="AMBIENT" data-calm="0.2">
```

---

## GS1 Parameters

Topographic Flow shader customization.

### `data-shader-mode`

Visual mode for GS1.

```html
<section data-shader-mode="atmospheric-mesh">
```

**Modes**:
- `atmospheric-mesh` - Atmospheric mesh patterns
- `topographic-flow` - Flowing topographic patterns
- `fabric-warp` - Woven fabric-like textures

---

### `data-topo-bands`

Number of topographic contour lines.

```html
<section data-topo-bands="20">
```

- **Range**: 1-50
- **Default**: 20
- **Low** (5-10): Few bold lines
- **High** (30-50): Dense contours

**Performance**: Higher = more GPU work.

---

### `data-warp-intensity`

How much the pattern warps and flows.

```html
<section data-warp-intensity="0.8">
```

- **Range**: 0.0-2.0
- **Default**: 1.0
- **Subtle** (0.0-0.5): Gentle flow
- **Dramatic** (1.5-2.0): Strong distortion

---

### `data-read-topo-flatten`

Flattens topography (good for text sections).

```html
<section data-read-topo-flatten="0.7">
```

- **Range**: 0.0-1.0
- **Default**: 0.0
- **0.0**: Full relief
- **1.0**: Nearly flat

---

### `data-read-white-bias`

Adds brightness for better text legibility.

```html
<section data-read-white-bias="0.3">
```

- **Range**: 0.0-1.0
- **Default**: 0.0
- **0.0**: Full color
- **1.0**: Nearly white

---

### Example: GS1 Section

```html
<section 
    data-shader-system="gs1" 
    data-shader-preset="AMBIENT"
    data-topo-bands="15"
    data-warp-intensity="0.6"
    data-read-topo-flatten="0.2"
    data-read-white-bias="0.1">
    
    <h2>Features</h2>
    <p>Your content here...</p>
</section>
```

---

## GS2 Parameters

Dynamic Warp shader customization.

### `data-shader-mode`

Visual mode for GS2.

```html
<section data-shader-mode="glitch-grid">
```

**Modes**:
- `glitch-grid` - Geometric grid disruption
- `vector-glitch` - Angular vector disruption
- `signal-flow` - Flowing data streams

---

### `data-flow-dir`

Directional bias of glitch flow.

```html
<section data-flow-dir="45deg">
<!-- Or radians -->
<section data-flow-dir="1.57">
```

- **Format**: Degrees with `deg` suffix or radians
- **Range**: 0-360deg / 0-6.28rad
- **Common**:
  - `0deg` - Right →
  - `45deg` - Diagonal ↗
  - `90deg` - Up ↑
  - `180deg` - Left ←
  - `270deg` - Down ↓

---

### `data-grid-subdivision-depth`

Geometric fragmentation detail level.

```html
<section data-grid-subdivision-depth="0.6">
```

- **Range**: 0.0-1.0
- **Default**: 0.5
- **Low** (0.0-0.3): Large chunks
- **High** (0.8-1.0): Fine fragmentation

**Performance**: Higher = more work.

---

### `data-shard-speed`

Animation speed (vector-glitch mode).

```html
<section data-shard-speed="0.8">
```

- **Range**: 0.0-2.0
- **Default**: 1.0

---

### `data-read-topo-flatten`

Reduces glitch intensity.

```html
<section data-read-topo-flatten="0.5">
```

- **Range**: 0.0-1.0
- **Default**: 0.0

**Note**: `data-calm` is the primary control for GS2.

---

### `data-read-white-bias`

Lightens technical color palette.

```html
<section data-read-white-bias="0.2">
```

- **Range**: 0.0-1.0
- **Default**: 0.0

---

### Example: GS2 Section

```html
<section 
    data-shader-system="gs2" 
    data-shader-preset="HERO"
    data-shader-mode="vector-glitch"
    data-flow-dir="45deg"
    data-grid-subdivision-depth="0.7"
    data-shard-speed="1.2"
    data-read-white-bias="0.1">
    
    <h1>Technical Hero</h1>
</section>
```

---

## GS3 Parameters

Dot Field (Kusama) shader customization.

### `data-shader-mode`

Visual mode for GS3.

```html
<section data-shader-mode="perlin-dot-field">
```

**Modes**:
- `perlin-dot-field` - Large organic blobs (4x scale)
- `kusama-infinite` - Dense crisp circles
- `octopus-legs` - Curvy lanes with wave patterns

---

### Kusama K-Knobs

Six primary artistic controls:

#### `data-kusama-k-grid`

Lane spacing and density.

```html
<section data-kusama-k-grid="0.5">
```

- **Range**: 0.0-1.0
- **Default**: 0.5
- **Lower**: More spacious
- **Higher**: Tighter packing

---

#### `data-kusama-k-jitter`

Random positional offset for organic feel.

```html
<section data-kusama-k-jitter="0.35">
```

- **Range**: 0.0-1.0
- **Default**: 0.35
- **0.0**: Perfect grid
- **0.5**: Hand-painted feel
- **1.0**: Strong scatter

---

#### `data-kusama-k-size`

Base dot size.

```html
<section data-kusama-k-size="0.55">
```

- **Range**: 0.0-1.0
- **Default**: 0.55

**Note**: In perlin-dot-field mode, dots are 4x larger.

---

#### `data-kusama-k-wobble`

Animation/wobble intensity.

```html
<section data-kusama-k-wobble="0.5">
```

- **Range**: 0.0-1.0
- **Default**: 0.5
- **0.0**: Static
- **1.0**: Strong wobble

**Performance**: Higher = more GPU work.

---

#### `data-kusama-k-lane-freq`

Number of horizontal lanes.

```html
<section data-kusama-k-lane-freq="0.5">
```

- **Range**: 0.0-1.0
- **Default**: 0.5
- **Lower**: Fewer lanes
- **Higher**: More lanes

---

#### `data-kusama-k-cursor`

Cursor interaction strength.

```html
<section data-kusama-k-cursor="0.5">
```

- **Range**: 0.0-1.0
- **Default**: 0.5 (HERO), 0.0 (READ)
- **0.0**: No interaction
- **1.0**: Strong repulsion

---

### Octopus Legs Mode Parameters

Additional parameters for `octopus-legs` mode:

#### `data-kusama-k-curve-amp`

Curve amplitude (how much lanes bend).

```html
<section data-kusama-k-curve-amp="0.5">
```

- **Range**: 0.0-1.0
- **Default**: 0.5
- **0.0**: Straight lanes
- **1.0**: Maximum curve

---

#### `data-kusama-k-curve-variety`

Variation between adjacent lanes.

```html
<section data-kusama-k-curve-variety="0.5">
```

- **Range**: 0.0-1.0
- **Default**: 0.5
- **0.0**: Uniform curves
- **1.0**: Maximum variety

---

### Example: GS3 Section

```html
<section 
    data-shader-system="gs3" 
    data-shader-preset="HERO"
    data-shader-mode="perlin-dot-field"
    data-kusama-k-grid="0.6"
    data-kusama-k-jitter="0.4"
    data-kusama-k-size="0.65"
    data-kusama-k-wobble="0.7"
    data-kusama-k-lane-freq="0.5"
    data-kusama-k-cursor="0.8">
    
    <h1>Kusama Hero</h1>
</section>
```

---

## Advanced Configuration

### Custom Canvas ID

By default, morphbg looks for `#bg-canvas`. To use a different ID:

```html
<canvas id="my-custom-canvas"></canvas>

<script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/src/engine.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/src/scroll-manager.js"></script>
<!-- Load shader files... -->

<script>
// Manual initialization with custom canvas
ScrollShaderManager.init('my-custom-canvas');
</script>
```

---

### Debug Mode

Enable debug mode for development:

```javascript
window.__INSTANCE__ = window.initBGShaderSystem({
    canvasId: 'bg-canvas',
    fragmentShader: window.BG_FRAGMENT_SHADER,
    config: window.BG_SHADER_CONFIG,
    adapter: window.BG_TopoReadAdapter,
    debug: true  // Enables FPS counter and console logging
});
```

See [Troubleshooting#Debug Mode](Troubleshooting#debug-mode) for details.

---

### Manual Shader Switching

Programmatically switch shaders:

```javascript
// Switch to GS2
window.ScrollShaderManager.switchTo('gs2');

// Get current shader
const current = window.ScrollShaderManager.getCurrentShader();
console.log(current); // 'gs1', 'gs2', or 'gs3'
```

---

### Responsive Configuration

Adjust parameters based on viewport:

```javascript
// Detect mobile
const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

// Update sections for mobile
if (isMobile) {
    document.querySelectorAll('section').forEach(section => {
        // Use READ preset on mobile
        section.setAttribute('data-shader-preset', 'READ');
        
        // Reduce parameters for better performance
        if (section.dataset.shaderSystem === 'gs1') {
            section.setAttribute('data-topo-bands', '10');
        }
        if (section.dataset.shaderSystem === 'gs3') {
            section.setAttribute('data-kusama-k-wobble', '0.3');
        }
    });
}
```

---

### Respect Reduced Motion Preference

```javascript
// Check user's motion preference
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Force READ preset globally
    document.querySelectorAll('section[data-shader-preset]').forEach(section => {
        section.setAttribute('data-shader-preset', 'READ');
        section.setAttribute('data-calm', '0.9');
    });
}
```

---

## Configuration Best Practices

### 1. Start Simple

Begin with just required attributes:
```html
<section data-shader-system="gs1" data-shader-preset="HERO">
```

Add optional parameters only if needed.

### 2. Use Presets First

Presets are tuned for good performance and aesthetics:
- `HERO` for hero sections
- `AMBIENT` for content
- `READ` for reading

### 3. Test Performance

Enable debug mode and check FPS:
- Target 50-60 FPS for smooth experience
- Use READ preset if FPS drops below 40
- Reduce complexity parameters on lower-end devices

### 4. Mobile Optimization

Mobile devices need lighter configuration:
```html
<!-- Desktop: High motion -->
<section 
    data-shader-system="gs1" 
    data-shader-preset="HERO"
    data-topo-bands="25">

<!-- Consider mobile overrides via JavaScript -->
```

### 5. Accessibility

Respect user preferences:
```javascript
// Reduced motion
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Use minimal motion
}

// Contrast preference
if (window.matchMedia('(prefers-contrast: high)').matches) {
    // Increase read-white-bias
}
```

---

## Parameter Precedence

When multiple sources define parameters:

1. **Section `data-` attributes** (highest priority)
2. **Preset defaults**
3. **Shader defaults** (lowest priority)

Example:
```html
<!-- READ preset sets calm=0.75 -->
<!-- But section overrides to calm=0.3 -->
<section 
    data-shader-preset="READ"  
    data-calm="0.3">       
<!-- Result: calm=0.3 is used -->
```

---

## Next Steps

- See [Shader Systems](Shader-Systems) for detailed parameter descriptions
- See [Troubleshooting](Troubleshooting) for performance optimization
- See [Installation](Installation) for setup instructions
- See [Bundle Options](Bundle-Options) for deployment approaches
