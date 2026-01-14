# cael_gs - Multi-Shader Background System

A modular WebGL shader system featuring three distinct visual styles with scroll-based switching and real-time parameter control.

## Overview

This project provides a unified shader engine that powers three distinct shader systems, each with multiple modes and presets. The system supports smooth transitions between shaders based on scroll position and includes a dynamic configuration panel for real-time parameter adjustments.

## 🚀 Deployment

**Deploy via GitHub + jsDelivr CDN:**

- **[JSDELIVR_DEPLOYMENT.md](JSDELIVR_DEPLOYMENT.md)** - jsDelivr CDN setup guide
- **[deploy-to-github.sh](deploy-to-github.sh)** - One-command deploy script

**Quick Deploy:**
```bash
./deploy-to-github.sh    # Push to GitHub + create release tag
# Wait 5 min, then your files are available on jsDelivr CDN
```

## Features

- **Three Shader Systems**:
  - **GS1 (Topographic)**: Organic, flowing landscapes with contour lines and fabric-like textures
  - **GS2 (Glitch)**: Technical, geometric aesthetic with grid distortions and vector glitches
  - **GS3 (Dot Field)**: Artistic dot patterns inspired by Yayoi Kusama's infinite rooms

- **Scroll-Based Switching**: Automatically switches between shaders as you scroll through different sections
- **Real-Time Configuration**: Dynamic control panel adapts to show relevant parameters for the active shader
- **Performance Optimized**: 40-60 FPS across all shaders with adaptive DPR and efficient resource management
- **Preset System**: Each shader includes Hero, Ambient, and Read presets for different visual intensities
- **Mode System**: Multiple rendering modes per shader for varied visual effects

## Quick Start

### View the Demo

Open `demo.html` in a modern web browser to see all three shader systems in action:

```bash
open demo.html
```

The demo page includes:
- All three shader systems (GS1, GS2, GS3)
- Multiple modes per shader (e.g., glitch-grid, vector-glitch, signal-flow for GS2)
- Three presets per mode (Hero, Ambient, Read)
- Interactive configuration panel (press `Ctrl+K` to toggle)

### Individual Shader Testing

Each shader has a dedicated test page:

```bash
open test-gs1.html  # Test GS1 (Topographic) alone
open test-gs2.html  # Test GS2 (Glitch) alone
open test-gs3.html  # Test GS3 (Dot Field) alone
```

## File Structure

```
/
├── README.md                      # This file
├── REFACTOR_PLAN.md              # Complete development history
├── demo.html                      # Main demo page (all shaders)
├── test-gs1.html                 # GS1 test page
├── test-gs2.html                 # GS2 test page
├── test-gs3.html                 # GS3 test page
├── gs-engine.js                  # Unified WebGL shader engine
├── scroll-shader-manager-simple.js  # Scroll-based shader switcher
│
├── gs1/                          # Topographic shader
│   ├── config.js                # Mode/preset definitions
│   ├── shader.js                # GLSL fragment shader
│   ├── adaptor.js               # Parameter adapter
│   └── init.js                  # Initialization
│
├── gs2/                          # Glitch shader
│   ├── config.js                # Mode/preset definitions
│   ├── shader.js                # GLSL fragment shader
│   ├── adaptor.js               # Parameter adapter
│   └── init.js                  # Initialization
│
├── gs3/                          # Dot Field shader
│   ├── config.js                # Mode/preset definitions
│   ├── shader.js                # GLSL fragment shader
│   ├── adaptor.js               # Parameter adapter
│   └── init.js                  # Initialization
│
└── docs/                         # Documentation
    ├── ADAPTER_INTERFACE.md      # Adapter development guide
    ├── GS1_PARAMETER_GUIDE.md    # GS1 parameters
    ├── GS1_SHADER_ANALYSIS.md    # GS1 shader internals
    ├── GS2_PARAMETER_GUIDE.md    # GS2 parameters
    └── GS3_PARAMETER_GUIDE.md    # GS3 parameters
```

## Usage

### HTML Structure

Create sections with shader data attributes:

```html
<!-- GS1 Section -->
<div class="section" 
     data-shader-system="gs1" 
     data-shader-preset="hero" 
     data-shader-mode="topographic-flow"
     data-flatten="0.0"
     data-height-contrast="1.0"
     data-warp-intensity="1.0">
    <h1>Your Content</h1>
</div>

<!-- GS2 Section -->
<div class="section" 
     data-shader-system="gs2" 
     data-shader-preset="ambient" 
     data-shader-mode="glitch-grid"
     data-calm="0.45"
     data-flow-dir="45deg">
    <h1>Your Content</h1>
</div>

<!-- GS3 Section -->
<div class="section" 
     data-shader-system="gs3" 
     data-shader-preset="read" 
     data-shader-mode="kusama-infinite"
     data-k-grid="0.5"
     data-k-jitter="1.0"
     data-k-size="0.55">
    <h1>Your Content</h1>
</div>
```

### Include Required Scripts

```html
<!-- Canvas element -->
<canvas id="bg-canvas"></canvas>

<!-- Engine -->
<script src="gs-engine.js"></script>

<!-- Shader files (load all three systems) -->
<script src="gs1/config.js"></script>
<script src="gs1/shader.js"></script>
<script src="gs1/adaptor.js"></script>
<script src="gs1/init.js"></script>

<script src="gs2/config.js"></script>
<script src="gs2/shader.js"></script>
<script src="gs2/adaptor.js"></script>
<script src="gs2/init.js"></script>

<script src="gs3/config.js"></script>
<script src="gs3/shader.js"></script>
<script src="gs3/adaptor.js"></script>
<script src="gs3/init.js"></script>

<!-- Shader manager -->
<script src="scroll-shader-manager-simple.js"></script>

<!-- Initialize -->
<script>
    ScrollShaderManager.init();
</script>
```

### Configuration Panel

The config panel is embedded in `demo.html` and provides:

- **Dynamic controls** that adapt to the active shader
- **Real-time updates** - changes apply immediately
- **Preset buttons** for quick configuration
- **Meta-controls** for adjusting parameter ranges (advanced users)
- **Keyboard shortcut**: `Ctrl+K` to toggle panel
- **Persistent state** via localStorage

## Shader Systems

### GS1: Topographic

**Modes**:
- `atmospheric-mesh` - Color palette with organic phase cycling
- `topographic-flow` - Contour lines with adjustable band count
- `fabric-warp` - Organic texture with lighting effects

**Key Parameters** (7 total):
- `data-flatten` (0-1): Topographic detail vs flat color
- `data-height-contrast` (0-2): Height map contrast
- `data-warp-intensity` (0-1): Spatial distortion strength
- `data-topo-bands` (2-50): Contour line count (topographic mode)
- `data-topo-white-bias` (0-0.5): White region expansion (topographic mode)
- `data-organic-backlight` (0-1): Backlight intensity (fabric mode)
- `data-organic-darkening` (0-1): Peak darkening (fabric mode)

**Performance**: 50-60 FPS

### GS2: Glitch

**Modes**:
- `glitch-grid` - Recursive grid subdivision with colored fills
- `vector-glitch` - Animated shard fragments
- `signal-flow` - Flowing line patterns

**Key Parameters** (13 total):
- `data-calm` (0-1): **PRIMARY** motion intensity control
- `data-flow-dir` (0-360deg): Directional bias for animation
- `data-grid-line-width` (0.5-2.5): Grid line thickness (glitch-grid)
- `data-grid-subdivision-depth` (0.3-1.5): Cell size (glitch-grid)
- `data-grid-small-fills` (0-1): Fill density (glitch-grid)
- `data-shard-count` (0.3-2.0): Shard density (vector-glitch)
- `data-shard-speed` (0-2): Animation speed (vector-glitch)
- `data-shard-chaos` (0-2): Rotation intensity (vector-glitch)
- `data-flow-density` (0.4-2): Line frequency (signal-flow)
- `data-flow-warp` (0-2): Curvature intensity (signal-flow)

**Performance**: 50-60 FPS

### GS3: Dot Field

**Modes**:
- `kusama-infinite` - Static dot grid (Kusama's Infinity Rooms)
- `octopus-legs` - Curved dot lanes (organic tentacle motion)

**Key Parameters** (12 total):
- `data-k-grid` (0-1): Grid density (lane count)
- `data-k-jitter` (0-1): Organic scatter amount
- `data-k-size` (0-1): Dot diameter
- `data-k-lane` (0-1): Vertical lane frequency
- `data-k-wobble` (0-1): **PRIMARY** motion control
- `data-k-alpha` (0-1): Dot opacity
- `data-k-curve-amp` (0-1): Curve intensity (octopus mode)
- `data-k-curve-variety` (0-1): Lane uniqueness (octopus mode)
- `data-cursor-influence` (0-1): Mouse interaction strength
- `data-seed` (0-100): Pattern randomization seed
- `data-debug-colors` (0/1): Colored vs black dots

**Performance**: 40-50 FPS

## Presets

Each shader system includes three preset intensity levels:

- **Hero** - Maximum visual impact, dramatic motion
- **Ambient** - Balanced presence, moderate activity
- **Read** - Subtle background, minimal distraction

Presets automatically configure all parameters for optimal visual hierarchy.

## Development

### Adding a New Shader

See `ADAPTER_INTERFACE.md` for complete adapter development guide.

**Basic Steps**:

1. Create shader directory: `gs4/`
2. Define config in `gs4/config.js`:
   ```javascript
   const BG4_SHADER_CONFIG = {
       modes: { 'my-mode': 0.0 },
       presets: {
           HERO: { /* params */ },
           AMBIENT: { /* params */ },
           READ: { /* params */ }
       }
   };
   ```

3. Write GLSL shader in `gs4/shader.js`
4. Create adapter in `gs4/adaptor.js` implementing required hooks
5. Initialize in `gs4/init.js`
6. Add sections to HTML with `data-shader-system="gs4"`

### Extending Existing Shaders

1. Add new parameters to adapter's `extendUniforms()`
2. Read attributes in `accumulateFromSection()`
3. Apply values in `applyFrameUniforms()`
4. Add controls to config panel HTML
5. Update parameter guide documentation

## Performance

### Benchmarks

Tested on desktop Chrome (integrated GPU):

- **GS1**: 50-60 FPS (excellent)
- **GS2**: 50-60 FPS (excellent)
- **GS3**: 40-50 FPS (acceptable)

### Optimization Features

- **Adaptive DPR**: Automatically adjusts resolution based on device pixel ratio
- **FPS capping**: Limits maximum frame rate to save battery
- **Time freezing**: Pauses animation when not visible
- **Resource cleanup**: Proper WebGL disposal on shader switches
- **Per-fragment culling**: GS3 skips distant lanes for ~40% performance gain

### Performance Tips

1. Use **Read preset** for content-heavy sections
2. Adjust `data-calm` (GS2) or `data-k-wobble` (GS3) to reduce motion
3. Reduce `data-topo-bands` (GS1) for simpler contours
4. Lower `data-grid-subdivision-depth` (GS2) for larger cells
5. Consider reducing MAX_ITERS in GS3 shader (line ~400) if needed

## Keyboard Shortcuts

- **`Ctrl+K`** or **`Cmd+K`**: Toggle configuration panel
- **`F`**: Toggle FPS counter (test pages only)

## Browser Support

**Tested**:
- ✅ Chrome (desktop) - Full support

**Expected to work**:
- Firefox, Safari, Edge (desktop)
- Chrome, Firefox, Safari (mobile)

**Requirements**:
- WebGL 1.0 support
- ES6 JavaScript support
- CSS Grid support

## Troubleshooting

### Shader Not Rendering

**Check**:
1. Console for WebGL errors
2. Canvas element exists with id `bg-canvas`
3. All script files loaded in correct order
4. Section has proper `data-shader-system` attribute

### Performance Issues

**Solutions**:
1. Open DevTools Performance tab and profile
2. Check FPS counter (press `F` in test pages)
3. Reduce motion parameters (calm, wobble)
4. Lower visual complexity (bands, subdivision depth)
5. Test on different device/browser

### Config Panel Not Working

**Check**:
1. `ConfigFormManager` is initialized
2. Sliders have correct `data-attr` attributes
3. Sections have matching data attributes
4. Console for JavaScript errors

### Shader Switching Glitches

**Solutions**:
1. Check scroll position during switch
2. Verify section boundaries are correct
3. Look for resource cleanup errors in console
4. Test in single-shader test pages first

## Documentation

- **`REFACTOR_PLAN.md`** - Complete development history and architecture decisions
- **`ADAPTER_INTERFACE.md`** - Adapter development guide
- **`GS1_PARAMETER_GUIDE.md`** - GS1 parameter reference
- **`GS1_SHADER_ANALYSIS.md`** - GS1 shader internals
- **`GS2_PARAMETER_GUIDE.md`** - GS2 parameter reference
- **`GS3_PARAMETER_GUIDE.md`** - GS3 parameter reference
- **`GS3_STATUS.md`** - GS3 implementation status

## Contributing

This project is part of a larger system. For contributions:

1. Review existing shader implementations for patterns
2. Follow adapter interface conventions
3. Test performance across all modes/presets
4. Update parameter guides for new features
5. Maintain backward compatibility with existing sections

## License

[Specify your license here]

## Credits

**Shader Inspirations**:
- GS1: Topographic map aesthetics, organic flow fields
- GS2: Digital glitch art, technical/cyberpunk aesthetics
- GS3: Yayoi Kusama's Infinity Rooms, polka dot installations

**Technologies**:
- WebGL 1.0 for GPU-accelerated rendering
- Vanilla JavaScript (no frameworks)
- CSS Grid and Flexbox for layouts

---

**Version**: 1.0.0  
**Last Updated**: January 2026
