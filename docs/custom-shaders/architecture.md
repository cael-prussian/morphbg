# morphbg Architecture for Custom Shaders

Understanding how components work together.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Your HTML                            │
│  <section data-shader-preset="HERO" data-density="15">     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   morphbg Engine                             │
│  • Scroll tracking                                           │
│  • Section detection                                         │
│  • Smooth transitions                                        │
│  • Rendering loop                                            │
└────┬─────────────────┬─────────────────┬────────────────────┘
     │                 │                 │
     │                 │                 │
     ▼                 ▼                 ▼
┌─────────┐     ┌──────────┐     ┌──────────────┐
│ Config  │     │ Adapter  │     │ Your Shader  │
│ (modes  │────▶│ (uniform │────▶│ (GLSL code)  │
│ presets)│     │ manager) │     │              │
└─────────┘     └──────────┘     └──────────────┘
```

---

## Component Responsibilities

### 1. Engine (`engine.js`)

**What it does:**

- Monitors scroll position
- Detects which sections are visible
- Calculates scroll weights
- Manages Three.js rendering
- Provides universal uniforms
- Smooths transitions

**What you don't touch:**

- Scroll detection logic
- Rendering pipeline
- Transition algorithms

---

### 2. Your Shader (`shader.js`)

**What it does:**

- Defines visual appearance (GLSL)
- Receives uniforms from engine + adapter
- Outputs pixel colors

**What you write:**

```glsl
// Your creative visual logic
void main() {
    vec2 uv = v_uv;
    vec3 color = yourEffect(uv);
    gl_FragColor = vec4(color, 1.0);
}
```

**What you don't touch:**

- Uniform management
- Scroll-based blending
- Rendering lifecycle

---

### 3. Config (`config.js`)

**What it does:**

- Defines visual modes (e.g., flowing, chaotic, calm)
- Defines presets (HERO, AMBIENT, READ)
- Sets custom uniform values per preset
- Controls transition settings

**What you write:**

```javascript
presets: {
    HERO: {
        spatial: 1.0,
        temporal: 1.0,
        density: 10.0,  // Your custom values
        speed: 2.0
    }
}
```

**What you don't touch:**

- Preset application logic
- Scroll weight calculations

---

### 4. Adapter (`adaptor.js`)

**What it does:**

- Defines your custom uniforms
- Accumulates values during scroll
- Smooths transitions
- Updates Three.js material

**What you configure:**

```javascript
const UNIFORMS = {
  density: {
    uniform: "u_density",
    default: 10.0,
    dataAttr: "data-density",
    validator: (v) => Math.max(1, Math.min(50, v)),
  },
};
```

**What you don't touch:**

- Accumulation algorithm
- Scroll weight logic
- Smoothing implementation

---

## Data Flow

### At Initialization

```
1. Load Config
   └─> Define modes and presets

2. Create Adapter
   └─> Define custom uniforms
   └─> Extend engine uniforms

3. Initialize Shader
   └─> Compile GLSL code
   └─> Create Three.js material
   └─> Connect uniforms

4. Start Engine
   └─> Begin render loop
   └─> Start scroll monitoring
```

### Each Frame (60fps)

```
1. Scroll Detection
   ├─> Find visible sections
   ├─> Calculate scroll weights
   └─> Determine active preset per section

2. Accumulation (via Adapter)
   ├─> Initialize accumulator
   ├─> For each visible section:
   │   ├─> Get preset values
   │   ├─> Override with data attributes
   │   └─> Accumulate with scroll weight
   └─> Normalize by total weight

3. Smoothing (via Adapter)
   ├─> Interpolate current → target
   └─> Apply delta smoothing

4. Material Update (via Adapter)
   └─> Write to Three.js uniforms

5. Shader Execution (GPU)
   ├─> Run for every pixel
   └─> Output to canvas
```

---

## Uniform Flow

```
HTML Attribute
    ↓
┌───────────────────┐
│ data-density="25" │
└─────────┬─────────┘
          │
          ▼
┌──────────────────────────┐
│ Adapter: accumulate()    │
│ • Read attribute         │
│ • Or use preset value    │
│ • Apply validator        │
│ • Accumulate with weight │
└──────────┬───────────────┘
           │
           ▼
┌───────────────────────┐
│ Adapter: finalize()   │
│ • Normalize by weight │
└──────────┬────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Adapter: applyToTarget()    │
│ • Smooth transition         │
│ • Interpolate current→new   │
└──────────┬──────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Adapter: updateMaterial()    │
│ • Write to Three.js uniform  │
└──────────┬───────────────────┘
           │
           ▼
┌───────────────────┐
│ GPU: Your Shader  │
│ uniform float     │
│ u_density;        │
└───────────────────┘
```

---

## Preset Application

```
Section Enters View
    ↓
┌────────────────────────────────┐
│ <section                       │
│   data-shader-preset="HERO"    │
│   data-density="15">           │
└─────────┬──────────────────────┘
          │
          ▼
┌────────────────────────────┐
│ Engine: getPreset("HERO")  │
└─────────┬──────────────────┘
          │
          ▼
┌─────────────────────────────┐
│ Config.presets.HERO         │
│ {                           │
│   spatial: 1.0,             │
│   temporal: 1.0,            │
│   density: 10.0  ←── Base   │
│ }                           │
└─────────┬───────────────────┘
          │
          ▼
┌────────────────────────────────┐
│ Adapter: accumulate()          │
│ • Check data-density="15"      │
│ • Override: 15 (not 10)        │
│ • Validate: max(1, min(50, 15))│
│ • Result: 15.0                 │
└────────────────────────────────┘
```

**Priority:**

1. HTML data attribute (highest)
2. Preset value
3. Default value (lowest)

---

## Scroll-Based Blending

```
Scroll Position:
├─ Section A (90% visible) ─ preset: HERO
│  density: 10, speed: 2.0
│
├─ Section B (10% visible) ─ preset: AMBIENT
│  density: 15, speed: 1.0
└─ (rest offscreen)

Accumulation:
density = (10 × 0.9) + (15 × 0.1) = 9.0 + 1.5 = 10.5
speed   = (2.0 × 0.9) + (1.0 × 0.1) = 1.8 + 0.1 = 1.9

Smoothing (over ~8 frames):
frame 1: current=10.0, target=10.5 → move 20% → 10.1
frame 2: current=10.1, target=10.5 → move 20% → 10.18
frame 3: current=10.18, target=10.5 → move 20% → 10.26
...
frame 8: current≈10.5

Result: Smooth transition as sections blend
```

---

## Mode Switching

```
<section data-shader-mode="flowing">
                ↓
┌────────────────────────────────┐
│ Config.modes                   │
│ { 'flowing': 0, 'ripple': 1 } │
└────────┬───────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Engine: Smart mode blending          │
│ u_mode = 0.5 (lerps smoothly)       │
│ u_modeWeight0 = 0.6 (instant)       │
│ u_modeWeight1 = 0.4 (instant)       │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Shader:                              │
│ vec3 flowingColor = ...;            │
│ vec3 rippleColor = ...;             │
│ vec3 final = flowingColor *         │
│              u_modeWeight0 +        │
│              rippleColor *          │
│              u_modeWeight1;         │
└──────────────────────────────────────┘
```

**Note:** Use mode weights for blending, not `u_mode` ranges. Mode weights represent actual viewport presence, while `u_mode` lerps smoothly through intermediate values.

---

## Extension Points

Where you can hook in:

### ✅ You Control

1. **Shader visual logic** - Complete freedom
2. **Custom uniform definitions** - Any uniforms you need
3. **Preset values** - What each preset does
4. **Validators** - Constrain uniform ranges
5. **Data attributes** - Which HTML attrs to read

### ❌ Engine Controls

1. **Scroll detection** - Automatic
2. **Section weighting** - Smooth blending algorithm
3. **Transition timing** - Configurable but engine-managed
4. **Render loop** - Three.js lifecycle
5. **Universal uniforms** - time, resolution, mouse, etc.

---

## Performance Considerations

```
Frame Budget: 16.67ms (60fps)

Breakdown:
├─ JavaScript (Engine + Adapter)
│  ├─ Scroll detection: ~0.5ms
│  ├─ Weight calculation: ~0.3ms
│  ├─ Accumulation: ~0.2ms × uniforms
│  ├─ Smoothing: ~0.1ms × uniforms
│  └─ Material update: ~0.2ms
│  └─ Total: ~1-2ms
│
└─ GPU (Your Shader)
   ├─ Per-pixel operations
   ├─ 1920×1080 = 2,073,600 pixels
   └─ Budget: ~14ms

Your shader must be efficient:
✅ Use fast operations
✅ Minimize texture lookups
✅ Avoid branches
✅ Use approximations
❌ No expensive functions per pixel
```

---

## Debugging Flow

```
Enable Debug Mode:
    ↓
┌──────────────────────────────────┐
│ initMyShader('canvas', {         │
│   debug: true                    │
│ });                              │
└────────┬─────────────────────────┘
         │
         ▼
Console Output:
├─ Visible sections detected
├─ Scroll weights per section
├─ Accumulated uniform values
├─ Target vs current values
├─ Preset being applied
└─ Performance warnings

Browser DevTools:
├─ Three.js Inspector extension
├─ WebGL error checking
├─ Performance profiling
└─ Shader compilation errors
```

---

## Summary

**You write:**

- GLSL shader code (visual effect)
- Uniform definitions (what's controllable)
- Preset values (how presets behave)

**Engine provides:**

- Scroll-based blending
- Smooth transitions
- Uniform management
- Rendering lifecycle

**Result:**

- Minimal boilerplate
- Maximum creative control
- AI-friendly structure
- Seamless integration

---

**Next:** Start with [Custom Shader Guide](custom-shader-guide.md)
