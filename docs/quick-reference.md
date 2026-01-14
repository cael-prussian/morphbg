# Custom Shader Quick Reference

Fast reference for developing custom shaders with morphbg.

---

## File Structure

```
src/shaders/my-shader/
├── shader.js    # GLSL fragment shader
├── config.js    # Modes and presets
├── adaptor.js   # Uniform management
└── init.js      # Initialization wrapper
```

---

## Universal Uniforms (Always Available)

| Uniform | Type | Range | Purpose |
|---------|------|-------|---------|
| `u_time` | float | 0+ | Elapsed seconds |
| `u_resolution` | vec2 | pixels | Canvas width, height |
| `u_mouse` | vec2 | 0-1 | Mouse position normalized |
| `u_mode` | float | 0, 1, 2... | Current visual mode |
| `u_spatialMotion` | float | 0-1 | Spatial variation control |
| `u_temporalMotion` | float | 0-1 | Animation speed control |
| `u_cursorEnabled` | float | 0-1 | Cursor interaction strength |
| `u_calm` | float | 0-1 | Calmness level (1=very calm) |

---

## Shader Template (Minimal)

```glsl
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_spatialMotion;
uniform float u_temporalMotion;
uniform float u_cursorEnabled;
uniform float u_calm;

// Your custom uniforms here
uniform float u_density;

varying vec2 v_uv;

void main() {
    vec2 uv = v_uv;
    float t = u_time * u_temporalMotion;
    
    // Your effect here
    vec3 color = vec3(uv, sin(t));
    
    // Apply calm
    color = mix(color, vec3(1.0), u_calm * 0.5);
    
    gl_FragColor = vec4(color, 1.0);
}
```

---

## Config Template (Minimal)

```javascript
window.MY_SHADER_CONFIG = {
    modes: {
        'default': 0.0
    },
    
    presets: {
        HERO: {
            spatial: 1.0,
            temporal: 1.0,
            cursor: 1.0,
            calm: 0.0,
            // Your custom values
            density: 10.0
        },
        
        AMBIENT: {
            spatial: 0.5,
            temporal: 0.5,
            cursor: 0.3,
            calm: 0.3,
            density: 15.0
        },
        
        READ: {
            spatial: 0.05,
            temporal: 0.03,
            cursor: 0.0,
            calm: 0.8,
            density: 20.0
        }
    },
    
    blendVh: 1.0,
    transitionVh: 0.5,
    smoothSpeed: 2.0
};
```

---

## Adapter Template (Minimal)

```javascript
window.MY_SHADER_ADAPTER = (() => {
    const UNIFORMS = {
        density: {
            uniform: 'u_density',
            default: 10.0,
            dataAttr: 'data-density',
            validator: (v) => Math.max(1, Math.min(50, v))
        }
    };
    
    const accumulatedUniforms = Object.entries(UNIFORMS)
        .filter(([_, def]) => def.accumulate !== false);
    
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
        
        initAcc() {
            const acc = {};
            for (const [key] of accumulatedUniforms) {
                acc[key] = 0.0;
            }
            return acc;
        },
        
        accumulate(acc, section, preset, scrollWeight) {
            for (const [key, def] of accumulatedUniforms) {
                let value = section.hasAttribute(def.dataAttr)
                    ? parseFloat(section.getAttribute(def.dataAttr))
                    : (preset[key] ?? def.default);
                if (def.validator) value = def.validator(value);
                acc[key] += value * scrollWeight;
            }
        },
        
        finalize(acc, totalWeight) {
            if (totalWeight > 0.001) {
                for (const [key] of accumulatedUniforms) {
                    acc[key] /= totalWeight;
                }
            }
        },
        
        applyToTarget(target, acc, deltaSmoothed) {
            for (const [key] of accumulatedUniforms) {
                target[key] += (acc[key] - target[key]) * deltaSmoothed;
            }
        },
        
        updateMaterial(material, target) {
            for (const [key, def] of accumulatedUniforms) {
                if (material.uniforms[def.uniform]) {
                    material.uniforms[def.uniform].value = target[key];
                }
            }
        }
    };
})();
```

---

## Init Template (Minimal)

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

## HTML Usage

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; }
        #bg-canvas {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            z-index: -1;
        }
        section {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    </style>
</head>
<body>
    <canvas id="bg-canvas"></canvas>
    
    <section data-shader-preset="HERO">
        <h1>Hero Section</h1>
    </section>
    
    <section data-shader-preset="AMBIENT" data-density="25">
        <h2>Content</h2>
    </section>
    
    <section data-shader-preset="READ">
        <p>Reading text</p>
    </section>
    
    <script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
    <script src="engine.js"></script>
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

## Common Patterns

### Distance from Center
```glsl
float dist = length(uv - 0.5);
float circle = 1.0 - smoothstep(0.0, 0.5, dist);
```

### Time-Based Animation
```glsl
float t = u_time * u_temporalMotion;
float wave = sin(t + uv.x * 10.0);
```

### Cursor Influence
```glsl
float distToMouse = distance(uv, u_mouse);
float influence = 1.0 - smoothstep(0.0, 0.5, distToMouse);
vec3 color += vec3(influence) * u_cursorEnabled;
```

### Aspect-Corrected Coordinates
```glsl
vec2 st = (2.0 * uv - 1.0) * vec2(u_resolution.x / u_resolution.y, 1.0);
```

### Apply Calm Effect
```glsl
color = mix(color, vec3(1.0), u_calm * 0.5);
```

---

## Preset Design Guidelines

| Preset | spatial | temporal | cursor | calm | Use Case |
|--------|---------|----------|--------|------|----------|
| **HERO** | 1.0 | 1.0 | 1.0 | 0.0 | Landing pages, call-to-action |
| **AMBIENT** | 0.3-0.6 | 0.3-0.6 | 0.3 | 0.3 | General content sections |
| **READ** | <0.1 | <0.1 | 0.0 | 0.7-0.9 | Text-heavy, articles |

---

## Debugging

### Enable Debug Mode
```javascript
window.initMyShader('bg-canvas', { debug: true });
```

### Common Issues

**Black screen:**
- Check browser console for GLSL errors
- Ensure all uniforms are defined
- Check `gl_FragColor` is set

**Poor performance:**
- Reduce expensive ops (sin, cos, sqrt, pow)
- Minimize texture lookups
- Use cheaper approximations

**Uniforms not working:**
- Check spelling matches shader/adapter
- Verify data attributes on HTML elements
- Check validator isn't rejecting values

---

## Next Steps

1. **Copy templates** from `docs/templates/`
2. **Follow guide** in `docs/custom-shader-guide.md`
3. **Use AI assistance** with `docs/ai-shader-development.md`
4. **Reference existing shaders** in `src/shaders/gs1/`, `gs2/`, `gs3/`
5. **Test with demo page**

---

**Full Documentation:** [custom-shader-guide.md](custom-shader-guide.md)  
**AI Prompts:** [ai-shader-development.md](ai-shader-development.md)  
**Templates:** [templates/](templates/)
