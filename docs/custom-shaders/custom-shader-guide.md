# Custom Shader Development Guide

Build your own shader system that integrates seamlessly with morphbg's engine, presets, and scroll management.

**[🎮 See existing shaders in action](https://cael-prussian.github.io/morphbg/examples/demo.html)**

---

## Overview

morphbg's architecture separates concerns into three main components:

1. **Engine** (`src/engine.js`) - Handles rendering, uniforms, scroll tracking
2. **Shader** - Your custom GLSL fragment shader
3. **Adapter** - Bridges engine ↔ shader, manages custom uniforms
4. **Config** - Defines modes and presets for your shader

You only need to write **the shader** and **configuration**. The adapter can be generated from a template.

---

## Quick Start Checklist

- [ ] Conceptualize your shader effect (see [Shader Concepts](#shader-concepts))
- [ ] Prototype in Shadertoy (optional but recommended)
- [ ] Create your shader files from templates
- [ ] Define modes and presets
- [ ] Configure custom uniforms
- [ ] Test with morphbg engine
- [ ] Add demo page

**Estimated time**: 2-4 hours for simple shader, 1-2 days for complex

---

## File Structure

Create a new directory under `src/shaders/`:

```
src/shaders/my-shader/
├── shader.js       # GLSL fragment shader (required)
├── config.js       # Modes and presets (required)
├── adaptor.js      # Uniform management (generated from template)
└── init.js         # Initialization wrapper (minimal)
```

---

## Step-by-Step Guide

### Step 1: Concept Your Shader

Before writing code, define what your shader does:

**Questions to answer:**
- What's the visual effect? (particles, waves, noise patterns, etc.)
- Does it need modes? (different visual styles)
- What parameters should be controllable? (speed, density, color, etc.)
- How should it respond to cursor movement?
- How should it behave at different motion levels? (HERO vs READ presets)

**Example concepts:**
- ✨ **Particle Flow**: Flowing particles that respond to scroll and cursor
- 🌊 **Wave Distortion**: Animated wave patterns with color shifts
- 🎨 **Generative Art**: Procedural patterns with multiple styles
- 🔮 **Abstract Geometry**: Geometric shapes with transformations

**Resources:**
- [Shadertoy](https://www.shadertoy.com/) - Browse 100,000+ shader examples
- [The Book of Shaders](https://thebookofshaders.com/) - Learn GLSL fundamentals
- [Inigo Quilez Articles](https://iquilezles.org/articles/) - Advanced techniques

---

### Step 2: Prototype in Shadertoy (Recommended)

Shadertoy is perfect for rapid shader prototyping:

1. **Go to**: https://www.shadertoy.com/new
2. **Start with a base pattern** or find similar effects to remix
3. **Iterate quickly** with instant visual feedback
4. **Test performance** (aim for 60fps)
5. **Export to morphbg** (we'll convert uniforms)

**Key differences to note:**
- Shadertoy uses `mainImage(out vec4 fragColor, in vec2 fragCoord)`
- morphbg uses `varying vec2 v_uv` and `gl_FragColor`
- Shadertoy uniforms: `iTime`, `iResolution`, `iMouse`
- morphbg uniforms: `u_time`, `u_resolution`, `u_mouse`

**Conversion template** provided in [Appendix A](#appendix-a-shadertoy-conversion).

---

### Step 3: Create Shader Files

#### 3.1: shader.js - Your Fragment Shader

```javascript
window.BG_MY_SHADER_FRAG = `
precision highp float;

// ---- UNIVERSAL UNIFORMS (provided by engine) ----
uniform float u_time;              // Elapsed time in seconds
uniform vec2 u_resolution;         // Canvas width, height in pixels
uniform vec2 u_mouse;              // Mouse position (0-1, 0-1)
uniform float u_mode;              // Current mode value (0.0, 1.0, 2.0, etc.)

// Motion control (from presets)
uniform float u_spatialMotion;     // 0.0-1.0: spatial variation
uniform float u_temporalMotion;    // 0.0-1.0: time-based motion
uniform float u_cursorEnabled;     // 0.0-1.0: cursor influence
uniform float u_calm;              // 0.0-1.0: overall calmness

// ---- YOUR CUSTOM UNIFORMS (defined in adapter) ----
uniform float u_density;           // Example: particle density
uniform float u_speed;             // Example: animation speed
uniform vec3 u_colorA;             // Example: primary color
uniform vec3 u_colorB;             // Example: secondary color

// ---- VARYING ----
varying vec2 v_uv;                 // UV coordinates (0-1, 0-1)

// ---- YOUR SHADER CODE ----

void main() {
    // Normalized coordinates
    vec2 uv = v_uv;
    vec2 st = (2.0 * uv - 1.0) * vec2(u_resolution.x / u_resolution.y, 1.0);
    
    // Time with motion scaling
    float t = u_time * u_temporalMotion * u_speed;
    
    // Cursor influence
    vec2 mouseInfluence = (u_mouse - 0.5) * u_cursorEnabled;
    
    // YOUR EFFECT HERE
    // Example: Simple animated gradient
    vec3 color = mix(u_colorA, u_colorB, sin(t + st.y * u_density) * 0.5 + 0.5);
    
    // Apply calm (reduce intensity)
    color = mix(color, vec3(1.0), u_calm * 0.5);
    
    gl_FragColor = vec4(color, 1.0);
}
`;
```

**Key points:**
- Use `u_spatialMotion` and `u_temporalMotion` to scale your effects
- Respect `u_calm` for READ preset (reduce intensity)
- Use `u_cursorEnabled` to conditionally enable cursor effects
- Check `u_mode` if you have different visual styles

---

### Step 4: Define Config

#### 4.1: config.js - Modes and Presets

```javascript
window.MY_SHADER_CONFIG = {
    // ---- MODES (optional) ----
    // Different visual styles for your shader
    modes: {
        'style-a': 0.0,
        'style-b': 1.0,
        'style-c': 2.0
    },

    // ---- PRESETS (required) ----
    // Motion levels: HERO (high), AMBIENT (medium), READ (low)
    presets: {
        HERO: {
            // Universal motion controls (required)
            spatial: 1.0,        // Full spatial variation
            temporal: 1.0,       // Full temporal animation
            cursor: 1.0,         // Full cursor interaction
            calm: 0.0,           // No calming

            // Your custom uniforms (optional)
            density: 10.0,
            speed: 1.5,
            colorA: [1.0, 0.2, 0.5],
            colorB: [0.2, 0.5, 1.0]
        },

        AMBIENT: {
            spatial: 0.5,
            temporal: 0.5,
            cursor: 0.3,
            calm: 0.3,

            density: 15.0,
            speed: 0.8,
            colorA: [0.8, 0.4, 0.6],
            colorB: [0.4, 0.6, 0.8]
        },

        READ: {
            spatial: 0.05,       // Minimal spatial variation
            temporal: 0.03,      // Minimal animation
            cursor: 0.0,         // No cursor interaction
            calm: 0.8,           // High calming (subtle background)

            density: 20.0,
            speed: 0.3,
            colorA: [0.95, 0.95, 0.95],
            colorB: [0.9, 0.92, 0.95]
        }
    },

    // ---- TRANSITION SETTINGS ----
    blendVh: 1.0,           // Viewport heights to blend
    transitionVh: 0.5,      // Overlap band for transitions
    smoothSpeed: 2.0        // Transition smoothing speed
};
```

**Preset design principles:**
- **HERO**: Full motion, dramatic, eye-catching (landing pages)
- **AMBIENT**: Balanced, pleasant, not distracting (content sections)
- **READ**: Minimal, subtle, text-friendly (reading sections)

---

### Step 5: Create Adapter

The adapter manages custom uniforms. Use this template:

#### 5.1: adaptor.js - Generated from Template

```javascript
window.MY_SHADER_ADAPTER = (() => {
    function clamp01(x) { return Math.max(0, Math.min(1, x)); }

    // ---- DEFINE YOUR CUSTOM UNIFORMS ----
    const UNIFORMS = {
        // Format: key: { uniform, default, dataAttr?, validator?, accumulate?, threeValue? }
        
        // Simple float uniform
        density: {
            uniform: 'u_density',
            default: 10.0,
            dataAttr: 'data-density',
            validator: (v) => Math.max(1, Math.min(50, v))
        },
        
        // Speed control
        speed: {
            uniform: 'u_speed',
            default: 1.0,
            dataAttr: 'data-speed',
            validator: (v) => Math.max(0, v)
        },
        
        // Color uniform (vec3)
        colorA: {
            uniform: 'u_colorA',
            default: [1.0, 0.2, 0.5],
            dataAttr: 'data-color-a',
            threeValue: (THREE) => new THREE.Vector3(1.0, 0.2, 0.5)
        },
        
        colorB: {
            uniform: 'u_colorB',
            default: [0.2, 0.5, 1.0],
            dataAttr: 'data-color-b',
            threeValue: (THREE) => new THREE.Vector3(0.2, 0.5, 1.0)
        }
    };

    const accumulatedUniforms = Object.entries(UNIFORMS).filter(([_, def]) => def.accumulate !== false);

    return {
        // ---- 1. Extend engine uniforms ----
        extendUniforms(THREE) {
            const uniforms = {};
            for (const [key, def] of Object.entries(UNIFORMS)) {
                if (def.threeValue) {
                    uniforms[def.uniform] = { value: def.threeValue(THREE) };
                } else if (Array.isArray(def.default)) {
                    uniforms[def.uniform] = { value: new THREE.Vector3(...def.default) };
                } else {
                    uniforms[def.uniform] = { value: def.default };
                }
            }
            return uniforms;
        },

        // ---- 2. Initialize target state ----
        initTarget() {
            const target = {};
            for (const [key, def] of accumulatedUniforms) {
                target[key] = def.default;
            }
            return target;
        },

        // ---- 3. Initialize accumulator ----
        initAcc() {
            const acc = {};
            for (const [key] of accumulatedUniforms) {
                acc[key] = Array.isArray(UNIFORMS[key].default) ? [0, 0, 0] : 0.0;
            }
            return acc;
        },

        // ---- 4. Accumulate from sections ----
        accumulate(acc, section, preset, scrollWeight) {
            for (const [key, def] of accumulatedUniforms) {
                // Get value from data attribute or preset
                let value = section.hasAttribute(def.dataAttr) 
                    ? parseFloat(section.getAttribute(def.dataAttr))
                    : (preset[key] !== undefined ? preset[key] : def.default);

                // Validate
                if (def.validator) value = def.validator(value);

                // Accumulate with scroll weight
                if (Array.isArray(value)) {
                    for (let i = 0; i < 3; i++) {
                        acc[key][i] += value[i] * scrollWeight;
                    }
                } else {
                    acc[key] += value * scrollWeight;
                }
            }
        },

        // ---- 5. Finalize and normalize ----
        finalize(acc, totalWeight) {
            if (totalWeight > 0.001) {
                for (const [key] of accumulatedUniforms) {
                    if (Array.isArray(acc[key])) {
                        acc[key] = acc[key].map(v => v / totalWeight);
                    } else {
                        acc[key] /= totalWeight;
                    }
                }
            }
        },

        // ---- 6. Apply to target with smoothing ----
        applyToTarget(target, acc, deltaSmoothed) {
            for (const [key] of accumulatedUniforms) {
                if (Array.isArray(target[key])) {
                    for (let i = 0; i < 3; i++) {
                        target[key][i] += (acc[key][i] - target[key][i]) * deltaSmoothed;
                    }
                } else {
                    target[key] += (acc[key] - target[key]) * deltaSmoothed;
                }
            }
        },

        // ---- 7. Update material uniforms ----
        updateMaterial(material, target) {
            for (const [key, def] of accumulatedUniforms) {
                if (material.uniforms[def.uniform]) {
                    if (Array.isArray(target[key])) {
                        material.uniforms[def.uniform].value.set(...target[key]);
                    } else {
                        material.uniforms[def.uniform].value = target[key];
                    }
                }
            }
        }
    };
})();
```

---

### Step 6: Create Init Wrapper

#### 6.1: init.js - Minimal Initialization

```javascript
(function() {
    if (typeof window.initBGShaderSystem === 'function') {
        window.initMyShader = function(canvasId, opts = {}) {
            return window.initBGShaderSystem({
                canvasId: canvasId || 'bg-canvas',
                config: window.MY_SHADER_CONFIG,
                fragmentShader: window.BG_MY_SHADER_FRAG,
                adapter: window.MY_SHADER_ADAPTER,
                debug: opts.debug || false
            });
        };
    }
})();
```

---

### Step 7: Test Your Shader

Create a demo HTML file:

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; }
        #bg-canvas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
        }
        section {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
    </style>
</head>
<body>
    <canvas id="bg-canvas"></canvas>
    
    <section data-shader-preset="HERO" data-density="15">
        <h1>My Custom Shader</h1>
    </section>
    
    <section data-shader-preset="AMBIENT">
        <h2>Content Section</h2>
    </section>
    
    <section data-shader-preset="READ">
        <p>Reading section with calm background</p>
    </section>
    
    <script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
    <script src="../engine.js"></script>
    <script src="config.js"></script>
    <script src="shader.js"></script>
    <script src="adaptor.js"></script>
    <script src="init.js"></script>
    <script>
        window.initMyShader('bg-canvas', { debug: true });
    </script>
</body>
</html>
```

---

## Shader Concepts

### Understanding GLSL Fragment Shaders

A fragment shader runs **once per pixel** on the GPU:

```glsl
void main() {
    // This runs for EVERY pixel on screen
    // Calculate the color for THIS pixel
    gl_FragColor = vec4(red, green, blue, alpha);
}
```

**Key concepts:**
- **UV coordinates** (`v_uv`): Position of current pixel (0-1, 0-1)
- **Time** (`u_time`): Animate over time
- **Distance functions**: Create shapes (circles, boxes, etc.)
- **Noise functions**: Organic patterns (Perlin, Simplex, etc.)
- **Color mixing**: Blend colors based on position/time

### Common Patterns

#### Pattern 1: Distance-Based Effects

```glsl
float dist = length(uv - 0.5);  // Distance from center
float circle = smoothstep(0.5, 0.48, dist);  // Circle mask
```

#### Pattern 2: Time-Based Animation

```glsl
float wave = sin(u_time + uv.x * 10.0);  // Moving wave
float pulse = sin(u_time * 2.0) * 0.5 + 0.5;  // Pulsing 0-1
```

#### Pattern 3: Noise/Organic Motion

```glsl
// You'll need a noise function (many available online)
float noise = random(uv + u_time);
float perlin = noise(uv * 10.0 + u_time * 0.5);
```

#### Pattern 4: Cursor Interaction

```glsl
float distToMouse = distance(uv, u_mouse);
float influence = 1.0 - smoothstep(0.0, 0.5, distToMouse);
color += influence * u_cursorEnabled;
```

### Shadertoy as Reference Library

**Why Shadertoy is valuable:**
1. **100,000+ examples** - Almost any effect you can imagine
2. **Real-time testing** - Instant feedback
3. **Performance metrics** - FPS counter
4. **Community remixes** - Learn from variations

**How to use Shadertoy effectively:**

1. **Search by effect type**: "particles", "waves", "geometric", etc.
2. **Filter by complexity**: Start with shorter code
3. **Study the code**: Read comments, understand the math
4. **Remix incrementally**: Change one thing at a time
5. **Optimize**: Remove unused code, simplify calculations

**Popular techniques to explore:**
- [Raymarching](https://www.shadertoy.com/view/XllGW4) - 3D shapes from 2D
- [FBM Noise](https://www.shadertoy.com/view/4dS3Wd) - Organic patterns
- [Voronoi](https://www.shadertoy.com/view/ldl3W8) - Cell-like patterns
- [Domain Warping](https://www.shadertoy.com/view/lsl3RH) - Distorted patterns

---

## AI-Assisted Development

### Using GitHub Copilot + VS Code

**Recommended workflow:**

1. **Write descriptive comments first**:
```javascript
// Create a fragment shader that:
// - Shows flowing particles that move upward
// - Particles should be small bright dots
// - Use Perlin noise for organic motion
// - Respond to u_spatialMotion for density
// - Respond to u_temporalMotion for speed
```

2. **Let Copilot suggest structure**:
```javascript
void main() {
    // [Tab to accept Copilot suggestions]
}
```

3. **Iterate with specific modifications**:
```javascript
// Make particles larger
// Add color gradient based on height
// Slow down the motion
```

### Prompt Templates for AI

**For shader generation:**
```
Create a GLSL fragment shader that [EFFECT DESCRIPTION].
Use these uniforms:
- u_time (float): elapsed time
- u_resolution (vec2): canvas size
- u_mouse (vec2): mouse position (0-1)
- u_spatialMotion (float): 0-1 spatial variation
- u_temporalMotion (float): 0-1 animation speed
- u_calm (float): 0-1 calmness level
Output to gl_FragColor.
```

**For adapter generation:**
```
Generate a morphbg adapter for these custom uniforms:
- density (float, 1-50, default 10)
- speed (float, 0+, default 1.0)
- colorA (vec3, default [1, 0.2, 0.5])
- colorB (vec3, default [0.2, 0.5, 1])
Follow the adapter template structure.
```

---

## Advanced Topics

### Custom Modes

If your shader has distinct visual styles:

```javascript
// In shader
if (u_mode < 0.5) {
    // Style A
} else if (u_mode < 1.5) {
    // Style B
} else {
    // Style C
}
```

### Non-Accumulated Uniforms

Some uniforms shouldn't blend (like boolean flags):

```javascript
myUniform: {
    uniform: 'u_myFlag',
    default: 0,
    accumulate: false  // Don't blend this value
}
```

### Vector/Matrix Uniforms

```javascript
myVector: {
    uniform: 'u_myVec4',
    default: [0, 0, 0, 0],
    threeValue: (THREE) => new THREE.Vector4(0, 0, 0, 0)
}
```

### Debug Mode

Enable debug logging:

```javascript
window.initMyShader('bg-canvas', { debug: true });
```

---

## Appendix A: Shadertoy Conversion

### Uniform Mapping

| Shadertoy | morphbg | Notes |
|-----------|---------|-------|
| `iTime` | `u_time` | Elapsed seconds |
| `iResolution` | `u_resolution` | Width, height in pixels |
| `iMouse` | `u_mouse` | Normalized 0-1 (not pixels) |
| `fragCoord` | `v_uv * u_resolution` | Pixel coordinates |

### Function Signature

**Shadertoy:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 uv = fragCoord / iResolution.xy;
    fragColor = vec4(uv, 0.0, 1.0);
}
```

**morphbg:**
```glsl
varying vec2 v_uv;

void main()
{
    vec2 uv = v_uv;
    vec2 fragCoord = uv * u_resolution;
    gl_FragColor = vec4(uv, 0.0, 1.0);
}
```

---

## Examples

See the existing shaders for reference:
- **GS1** (Topographic) - [`src/shaders/gs1/`](../../src/shaders/gs1/)
- **GS2** (Dynamic Warp) - [`src/shaders/gs2/`](../../src/shaders/gs2/)
- **GS3** (Dot Field) - [`src/shaders/gs3/`](../../src/shaders/gs3/)

---

## Next Steps

1. **Start simple** - Begin with a basic pattern
2. **Test frequently** - Use debug mode and browser console
3. **Iterate** - Gradually add complexity
4. **Optimize** - Profile performance, aim for 60fps
5. **Share** - Contribute back to morphbg!

**Questions?** Open an issue on [GitHub](https://github.com/cael-prussian/morphbg/issues).
