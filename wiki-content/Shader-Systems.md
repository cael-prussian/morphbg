# Shader Systems

morphbg includes three distinct shader systems, each with unique visual aesthetics and customization parameters.

## Overview

| Shader | Visual Style | Best For | Complexity |
|--------|--------------|----------|------------|
| **GS1** | Topographic Flow | Organic, terrain-like backgrounds | Medium |
| **GS2** | Dynamic Warp | Technical, glitch aesthetics | Medium |
| **GS3** | Dot Field | Kusama-inspired dot patterns | High |

---

## GS1: Topographic Flow

Organic topographic patterns using layered noise with dynamic warping and height mapping. Creates flowing, terrain-like surfaces.

### Visual Characteristics

- Topographic contour lines
- Organic flow patterns
- Height-based coloring
- Smooth transitions
- Cursor-reactive warping

### Presets

```html
<!-- High motion, dramatic -->
<section data-shader-system="gs1" data-shader-preset="HERO">

<!-- Medium motion, balanced -->
<section data-shader-system="gs1" data-shader-preset="AMBIENT">

<!-- Low motion, subtle -->
<section data-shader-system="gs1" data-shader-preset="READ">
```

### Modes

GS1 has three distinct visual modes:

```html
<!-- Atmospheric mesh patterns -->
<section data-shader-mode="atmospheric-mesh">

<!-- Flowing topographic patterns -->
<section data-shader-mode="topographic-flow">

<!-- Woven fabric-like textures -->
<section data-shader-mode="fabric-warp">
```

### Key Parameters

#### `data-topo-bands`
Controls number of topographic contour lines.

```html
<section data-topo-bands="20">
```

- **Range**: 1-50
- **Default**: 20
- **Low** (5-10): Few bold lines, minimal detail
- **Medium** (15-25): Balanced detail
- **High** (30-50): Dense contours, more complex

**Performance**: Higher values = lower FPS

#### `data-warp-intensity`
Controls how much the pattern warps and distorts.

```html
<section data-warp-intensity="0.8">
```

- **Range**: 0.0-2.0
- **Default**: 1.0
- **Low** (0.0-0.5): Subtle warping
- **Medium** (0.6-1.2): Noticeable flow
- **High** (1.3-2.0): Dramatic distortion

#### `data-read-topo-flatten`
Flattens topography for reading sections.

```html
<section data-read-topo-flatten="0.7">
```

- **Range**: 0.0-1.0
- **Default**: 0.0
- **0.0**: Full topographic relief
- **0.5**: Moderate flattening
- **1.0**: Nearly flat surface

**Use**: Increase for text-heavy sections.

#### `data-read-white-bias`
Adds brightness/whiteness to output.

```html
<section data-read-white-bias="0.3">
```

- **Range**: 0.0-1.0
- **Default**: 0.0
- **0.0**: Full color saturation
- **0.5**: Lightened, pastel-like
- **1.0**: Nearly white

**Use**: Improve text legibility on darker backgrounds.

### Example: Complete GS1 Section

```html
<section 
    data-shader-system="gs1" 
    data-shader-preset="HERO"
    data-topo-bands="25"
    data-warp-intensity="1.2"
    data-read-topo-flatten="0.0"
    data-read-white-bias="0.1">
    
    <h1>Hero Section</h1>
</section>
```

### Performance Tips

- Use 10-20 bands for better performance
- Lower warp-intensity on mobile
- Use READ preset for content sections

---

## GS2: Dynamic Warp

Technical, glitch-inspired effects with geometric disruption, directional flow, and motion tracking. Features data stream aesthetics and controlled chaos.

### Visual Characteristics

- Glitch artifacts
- Geometric fragmentation
- Directional flow
- Ghost cursors
- Technical aesthetic

### Modes

GS2 has three distinct visual modes:

```html
<!-- Geometric grid disruption -->
<section data-shader-mode="glitch-grid">

<!-- Angular vector disruption -->
<section data-shader-mode="vector-glitch">

<!-- Flowing data streams -->
<section data-shader-mode="signal-flow">
```

### Key Parameters

#### `data-flow-dir`
Controls directional bias of glitch effects.

```html
<section data-flow-dir="45deg">
<!-- Or use radians -->
<section data-flow-dir="1.57">
```

- **Format**: Degrees with `deg` suffix or radians
- **Range**: 0-360deg (0-6.28rad)
- **Common values**:
  - `0deg` - Right →
  - `45deg` - Diagonal up-right ↗
  - `90deg` - Up ↑
  - `135deg` - Diagonal up-left ↖
  - `180deg` - Left ←
  - `270deg` - Down ↓

**Effect**: Creates directional "streaming" of glitch artifacts.

#### `data-grid-subdivision-depth`
Controls geometric fragmentation detail.

```html
<section data-grid-subdivision-depth="0.7">
```

- **Range**: 0.0-1.0
- **Default**: 0.5
- **Low** (0.0-0.3): Large chunks, bold
- **Medium** (0.4-0.7): Balanced detail
- **High** (0.8-1.0): Fine fragmentation

**Performance**: Higher = more GPU work.

#### `data-shard-speed`
Controls animation speed of glitch shards (vector-glitch mode).

```html
<section data-shard-speed="0.8">
```

- **Range**: 0.0-2.0
- **Default**: 1.0
- **Slow** (0.0-0.5): Subtle motion
- **Medium** (0.6-1.2): Balanced
- **Fast** (1.3-2.0): Rapid movement

#### `data-read-topo-flatten`
Reduces glitch intensity.

```html
<section data-read-topo-flatten="0.5">
```

- **Range**: 0.0-1.0
- **Default**: 0.0
- **0.0**: Full glitch effects
- **0.5**: Moderate reduction
- **1.0**: Minimal glitch

**Note**: In GS2, `data-calm` is the primary intensity control.

#### `data-read-white-bias`
Lightens the technical color palette.

```html
<section data-read-white-bias="0.2">
```

- **Range**: 0.0-1.0
- **Default**: 0.0
- **0.0**: Full saturation (purples, magentas, greens)
- **0.5**: Washed out, ethereal
- **1.0**: Nearly white

### Example: Complete GS2 Section

```html
<section 
    data-shader-system="gs2" 
    data-shader-preset="AMBIENT"
    data-shader-mode="vector-glitch"
    data-flow-dir="45deg"
    data-grid-subdivision-depth="0.6"
    data-shard-speed="0.9"
    data-read-white-bias="0.15">
    
    <h2>Technical Section</h2>
</section>
```

### Performance Tips

- Use signal-flow mode (simplest)
- Lower grid-subdivision-depth
- Reduce shard-speed
- Use READ preset

---

## GS3: Dot Field

Infinite dot fields inspired by Yayoi Kusama with organic motion and cursor interaction.

### Visual Characteristics

- Infinite dot patterns
- Organic motion
- Cursor-reactive
- Three distinct modes
- Hand-painted feel

### Modes

GS3 has three visual modes:

```html
<!-- Large organic blobs, strong wobble -->
<section data-shader-mode="perlin-dot-field">

<!-- Dense crisp circles, technical precision -->
<section data-shader-mode="kusama-infinite">

<!-- Curvy lanes with wave patterns -->
<section data-shader-mode="octopus-legs">
```

**Mode characteristics**:
- **perlin-dot-field**: 4x scale, fewer dots, maximum organic feel
- **kusama-infinite**: 1x scale, dense packing, minimal wobble
- **octopus-legs**: Curvy lanes with customizable amplitude

### Key Parameters (Kusama K-Knobs)

Six primary artistic controls:

#### `data-kusama-k-grid`
Controls lane spacing and density.

```html
<section data-kusama-k-grid="0.5">
```

- **Range**: 0.0-1.0
- **Default**: 0.5
- **Low** (0.0-0.3): Wider spacing, more open
- **High** (0.7-1.0): Tighter packing, denser

#### `data-kusama-k-jitter`
Adds random positional offset for organic feel.

```html
<section data-kusama-k-jitter="0.35">
```

- **Range**: 0.0-1.0
- **Default**: 0.35
- **0.0**: Perfect grid alignment
- **0.3-0.5**: Subtle hand-painted feel
- **0.7-1.0**: Strong scatter, chaotic

#### `data-kusama-k-size`
Controls base dot size.

```html
<section data-kusama-k-size="0.55">
```

- **Range**: 0.0-1.0
- **Default**: 0.55
- **Small** (0.0-0.3): Tiny dots
- **Medium** (0.4-0.7): Balanced
- **Large** (0.8-1.0): Large dots

**Note**: In blob mode, dots are 4x larger.

#### `data-kusama-k-wobble`
Controls animation/wobble intensity.

```html
<section data-kusama-k-wobble="0.5">
```

- **Range**: 0.0-1.0
- **Default**: 0.5
- **0.0**: Static, no movement
- **0.3-0.5**: Subtle breathing
- **0.7-1.0**: Strong wobble

**Performance**: Higher = more GPU work.

#### `data-kusama-k-lane-freq`
Controls number of horizontal lanes.

```html
<section data-kusama-k-lane-freq="0.5">
```

- **Range**: 0.0-1.0
- **Default**: 0.5
- **Low** (0.0-0.3): Few lanes, spacious
- **High** (0.7-1.0): Many lanes, dense

#### `data-kusama-k-cursor`
Controls cursor interaction strength.

```html
<section data-kusama-k-cursor="0.5">
```

- **Range**: 0.0-1.0
- **Default**: 0.5 (HERO), 0.0 (READ)
- **0.0**: No cursor interaction
- **0.5**: Moderate reactivity
- **1.0**: Strong repulsion/attraction

#### Mode 2 Specific: Curve Parameters

For `octopus-legs` mode:

```html
<section 
    data-shader-mode="octopus-legs"
    data-kusama-k-curve-amp="0.5"      <!-- Curve amplitude -->
    data-kusama-k-curve-variety="0.5"> <!-- Curve variety -->
```

- **k-curve-amp**: How much lanes curve (0.0=straight, 1.0=maximum curve)
- **k-curve-variety**: Variation between adjacent lanes (0.0=uniform, 1.0=maximum variety)

### Example: Complete GS3 Section

```html
<section 
    data-shader-system="gs3" 
    data-shader-preset="HERO"
    data-shader-mode="perlin-dot-field"
    data-kusama-k-grid="0.5"
    data-kusama-k-jitter="0.4"
    data-kusama-k-size="0.6"
    data-kusama-k-wobble="0.7"
    data-kusama-k-lane-freq="0.5"
    data-kusama-k-cursor="0.8">
    
    <h1>Kusama-Inspired Section</h1>
</section>
```

### Performance Tips

- Use kusama-infinite mode (simplest)
- Lower k-wobble value
- Reduce k-grid for fewer dots
- Use READ preset
- Target 40-50 FPS baseline

---

## Universal Parameters

These parameters work across **all shader systems**:

### `data-shader-system`
**Required**. Specifies which shader to use.

```html
<section data-shader-system="gs1|gs2|gs3">
```

### `data-shader-preset`
**Required**. Controls motion intensity.

```html
<section data-shader-preset="HERO|AMBIENT|READ">
```

**Presets**:
- **HERO**: High motion, dramatic (hero sections, above fold)
- **AMBIENT**: Medium motion, balanced (feature sections)
- **READ**: Low motion, subtle (content/reading sections)

### `data-calm`
Fine-tune calmness within a preset.

```html
<section data-calm="0.5">
```

- **Range**: 0.0-1.0
- **0.0**: Maximum motion
- **0.5**: Balanced
- **1.0**: Nearly static

**Override preset defaults**:
```html
<!-- HERO preset but with reduced motion -->
<section data-shader-preset="HERO" data-calm="0.6">
```

---

## Choosing a Shader System

### Use GS1 (Topographic) when:
- ✅ Organic, natural aesthetic desired
- ✅ Terrain/landscape themes
- ✅ Smooth, flowing backgrounds
- ✅ Medium performance requirements

### Use GS2 (Dynamic Warp) when:
- ✅ Technical, futuristic aesthetic
- ✅ Glitch/cyberpunk themes
- ✅ Directional flow desired
- ✅ Bold, geometric look

### Use GS3 (Dot Field) when:
- ✅ Kusama/art gallery aesthetic
- ✅ Playful, artistic themes
- ✅ Strong cursor interaction desired
- ✅ Infinite pattern feel

---

## Performance Comparison

| Shader | Baseline FPS | HERO FPS | READ FPS |
|--------|--------------|----------|----------|
| GS1 | 50-60 | 45-55 | 55-60 |
| GS2 | 50-60 | 40-50 | 55-60 |
| GS3 | 40-50 | 35-45 | 45-55 |

**Performance order**: GS1 (fastest) → GS2 (medium) → GS3 (slowest)

---

## Mixing Shaders

You can use different shaders for different sections:

```html
<section data-shader-system="gs1" data-shader-preset="HERO">
    <h1>Hero with Topographic</h1>
</section>

<section data-shader-system="gs2" data-shader-preset="AMBIENT">
    <h2>Features with Glitch</h2>
</section>

<section data-shader-system="gs3" data-shader-preset="READ">
    <h2>Gallery with Dots</h2>
</section>
```

Shaders automatically switch with smooth fade transitions (600ms).

---

## Advanced: Gradient Transitions

Shaders blend smoothly when sections overlap in the viewport:

```html
<!-- As you scroll, shader transitions gradually -->
<section style="height: 120vh" data-shader-system="gs1" data-shader-preset="HERO">
    <!-- Top of section: 100% GS1 -->
    <!-- Middle: Blending GS1 → GS2 -->
</section>

<section style="height: 120vh" data-shader-system="gs2" data-shader-preset="AMBIENT">
    <!-- Top: Still blending -->
    <!-- Bottom: 100% GS2 -->
</section>
```

The scroll manager calculates section weights based on viewport visibility.

---

## Next Steps

- See [Configuration](Configuration) for detailed parameter reference
- See [Bundle Options](Bundle-Options) for deployment approaches  
- See [Troubleshooting](Troubleshooting) for performance optimization
- See [Installation](Installation) for setup instructions
