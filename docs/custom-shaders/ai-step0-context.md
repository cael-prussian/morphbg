# Step 0: morphbg Context & Reference-First Approach

**AI Task:** Understand morphbg architecture and reference-first shader development philosophy.

---

## Critical Philosophy: Reference-First Development

**DO NOT attempt to generate complex visual shaders from scratch.**

Visual effects are best created by:

1. **Finding existing examples** (ShaderToy, GLSL Sandbox, etc.)
2. **Adapting them** to morphbg conventions
3. **Iterating** based on visual feedback

Writing shaders from scratch leads to:

- ❌ Weak visual quality (generic math → generic look)
- ❌ Technical errors (incorrect formulas, edge cases)
- ❌ Multiple iterations to get "right feel"

Using reference shaders provides:

- ✅ Proven visual quality
- ✅ Correct math and optimizations
- ✅ Faster path to desired appearance

**Your role as AI:** Recommend shader searches, then adapt found examples.

---

## What to Review

Developer should provide these files for context:

1. **`src/engine.js`** - Core engine that handles scroll tracking, preset blending, rendering
2. **Example shader implementation** (choose one):
   - `src/shaders/gs1/shader.js` - Topographic flow effect
   - `src/shaders/gs1/config.js` - Preset definitions
   - `src/shaders/gs1/adaptor.js` - Uniform management

---

## Key Concepts to Understand

### 1. Universal Uniforms (Engine-Provided)

The engine automatically provides these to ALL shaders:

```glsl
uniform float u_time;           // Elapsed seconds
uniform vec2 u_resolution;      // Canvas size (width, height)
uniform vec2 u_mouse;           // Mouse position (0-1, 0-1)
uniform float u_mode;           // Current mode value (lerps smoothly)
uniform float u_modeWeight0;    // Mode 0 viewport weight (instant)
uniform float u_modeWeight1;    // Mode 1 viewport weight (instant)
uniform float u_modeWeight2;    // Mode 2 viewport weight (instant)

// Motion controls (blended by scroll)
uniform float u_spatialMotion;  // 0-1: spatial complexity
uniform float u_temporalMotion; // 0-1: animation speed
uniform float u_cursorEnabled;  // 0-1: cursor interaction
uniform float u_calm;           // 0-1: effect simplification
```

### 2. Scroll-Based Preset Blending

Users assign presets to HTML sections:

```html
<section data-shader-preset="HERO">...</section>
<section data-shader-preset="READ">...</section>
```

Engine:

- Detects which sections are visible during scroll
- Calculates weight for each section (based on viewport overlap)
- Blends preset values smoothly using these weights
- Updates uniforms in real-time

### 3. Preset Philosophy

**HERO** - Maximum drama

- `spatial: 1.0, temporal: 1.0, cursor: 1.0, calm: 0.0`
- Custom uniforms: high intensity values

**AMBIENT** - Balanced

- `spatial: 0.3-0.6, temporal: 0.3-0.6, cursor: 0.3, calm: 0.3`
- Custom uniforms: medium values

**READ** - Minimal, text-friendly

- `spatial: <0.1, temporal: <0.1, cursor: 0.0, calm: >0.7`
- Custom uniforms: low intensity values

### 4. Custom Uniform Flow

```
HTML Section
    ↓ data-shader-preset="HERO"
Config (config.js)
    ↓ preset.customUniform = value
Adapter (adaptor.js)
    ↓ accumulate values by scroll weight
    ↓ smooth transition over time
Engine
    ↓ update material.uniforms
Shader (shader.js)
    ↓ use uniform float u_customUniform
GPU renders
```

### 5. Adapter Interface

Adapter bridges custom uniforms between config and shader:

```javascript
const UNIFORMS = {
    customParam: {
        uniform: 'u_customParam',    // GLSL name
        default: 10.0,               // Default value
        dataAttr: 'data-custom-param', // HTML attribute (optional)
        validator: (v) => clamp(v)   // Validation function
    }
};

// Required methods:
extendUniforms(THREE)           // Initialize THREE.js uniforms
initTarget()                    // Initialize target values
initAcc()                       // Initialize accumulator
accumulateFromSection({...})    // Accumulate weighted values
finalizeAccumulatedWeights({})  // Post-accumulation processing
applyTarget({...})              // Smooth transition to target
applyFromPreset({...})          // Apply preset directly
```

### 6. Shader Requirements

Shaders MUST:

- Use `u_temporalMotion` to scale all time-based animations
- Use `u_spatialMotion` to scale spatial complexity/variation
- Gate cursor effects with `u_cursorEnabled` (multiply or if-check)
- Apply `u_calm` to simplify/desaturate the effect
- Always set `gl_FragColor`
- Handle edge cases (zero values, division by zero)

### 7. Performance Targets

- 60fps on modern devices
- GPU operations preferred over CPU
- Fast operations: `+`, `-`, `*`, `/`, `mix()`, `smoothstep()`
- Medium: `sin()`, `cos()`, `length()`
- Slow: `pow()`, `exp()`, `sqrt()` - minimize these

---

## What AI Should Learn

After reviewing engine and example shader:

✅ **How engine provides universal uniforms**

- Where they're defined in engine.js
- How they're updated each frame

✅ **How scroll detection works**

- Section weight calculation
- Transition zones (transitionVh)

✅ **How preset blending works**

- Accumulation by weight
- Smooth transitions (smoothSpeed)

✅ **How adapters manage custom uniforms**

- UNIFORMS object structure
- Accumulation pattern
- Validation

✅ **How shaders use motion controls**

- Scaling animation with u_temporalMotion
- Scaling complexity with u_spatialMotion
- Gating cursor with u_cursorEnabled
- Applying calm effect

✅ **Patterns in existing shaders**

- Noise functions
- Helper functions
- Common GLSL techniques
- Performance optimizations

---

## Example Analysis

When reviewing `src/shaders/gs1/`:

**shader.js observations:**

- Uses `u_time * u_temporalMotion` for animation scaling
- Uses `u_spatialMotion` to scale noise influence
- Cursor effects gated by `u_cursorEnabled`
- Calm applied via desaturation/flattening
- Helper functions: hash, noise, fbm, ridged
- Performance conscious (no expensive operations in main loop)

**config.js observations:**

- Three distinct presets with clear intensity differences
- HERO: full motion values, dramatic custom uniform values
- READ: minimal motion, calmed custom uniform values
- transitionVh and smoothSpeed control blending behavior

**adaptor.js observations:**

- All custom uniforms listed in UNIFORMS object
- Validators ensure reasonable ranges
- Uses `accumulate !== false` pattern for scroll blending
- applyFromPreset directly updates material uniforms

---

## Questions AI Should Ask

After reviewing context, AI should be able to answer:

1. What universal uniforms are always available?
2. How does scroll position affect uniform values?
3. What's the difference between HERO, AMBIENT, and READ presets?
4. How do I make my shader respond to motion controls?
5. What pattern does the adapter follow?
6. What performance considerations should I keep in mind?

---

## Next Step

Once AI understands the architecture, proceed to:
**[Step 1: Effect Definition](ai-step1-define.md)**
