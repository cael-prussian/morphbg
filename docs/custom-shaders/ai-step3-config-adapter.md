# Step 3: Config & Adapter Generation

**AI Task:** Generate preset configuration and uniform management adapter.

---

## Input From Developer

- Shader code from Step 2
- `templates/config.template.js` file
- `templates/adaptor.template.js` file

---

## AI Must Generate

### File 1: config.js

```javascript
window.MY_SHADER_CONFIG = {
    modes: {
        'default': 0.0
        // Add modes if shader supports multiple visual styles
    },
    
    presets: {
        HERO: {
            spatial: 1.0,
            temporal: 1.0,
            cursor: 1.0,
            calm: 0.0,
            // Custom uniforms: high intensity values
            customParam1: ...,
            customColor: [r, g, b]
        },
        
        AMBIENT: {
            spatial: 0.3-0.6,
            temporal: 0.3-0.6,
            cursor: 0.3,
            calm: 0.3,
            // Custom uniforms: medium values
        },
        
        READ: {
            spatial: 0.05,
            temporal: 0.03,
            cursor: 0.0,
            calm: 0.8,
            // Custom uniforms: low intensity values
        }
    },
    
    blendVh: 1.0,          // REQUIRED: Viewport height multiplier for blend range
    transitionVh: 0.5,     // Transition overlap in viewport heights
    smoothSpeed: 2.0       // Smoothing speed for uniform changes
};
```

### File 2: adaptor.js

**CRITICAL:** Engine expects these exact method signatures. Do not rename or omit any method.

```javascript
window.MY_SHADER_ADAPTER = (() => {
    function clamp01(x) { return Math.max(0, Math.min(1, x)); }

    const UNIFORMS = {
        customParam1: {
            uniform: 'u_customParam1',
            default: 10.0,
            dataAttr: 'data-custom-param-1',
            validator: (v) => Math.max(min, Math.min(max, v))
        },
        // ... all custom uniforms from shader
    };

    const accumulatedUniforms = Object.entries(UNIFORMS)
        .filter(([_, def]) => def.accumulate !== false);

    return {
        // 1. Create THREE.js uniform objects
        extendUniforms(THREE) {
            const uniforms = {};
            for (const [key, def] of Object.entries(UNIFORMS)) {
                if (def.threeValue) {
                    uniforms[def.uniform] = { value: def.threeValue(THREE) };
                } else {
                    uniforms[def.uniform] = { value: def.default };
                }
            }
            return uniforms;
        },

        // 2. Initialize target object (for smooth blending)
        initTarget() {
            const target = {};
            for (const [key] of accumulatedUniforms) {
                target[key] = UNIFORMS[key].default;  // Access from UNIFORMS object
            }
            return target;
        },

        // 3. Initialize accumulator (reset each frame)
        initAcc() {
            const acc = {};
            for (const [key] of accumulatedUniforms) {
                acc[key] = 0.0;
            }
            return acc;
        },

        // 4. Accumulate values from visible sections
        accumulateFromSection({ el, w, acc, clamp01, material }) {
            for (const [key, def] of accumulatedUniforms) {
                let value = parseFloat(el.getAttribute(def.dataAttr)) || 
                           material.uniforms[def.uniform]?.value || 
                           def.default;
                
                if (def.validator) {
                    value = def.validator(value);
                } else {
                    value = clamp01(value);
                }
                
                acc[key] += value * w;
            }
        },

        // 5. Accumulate baseline preset (for sections without data attributes)
        accumulateBaseline({ need, acc, material }) {
            for (const [key, def] of accumulatedUniforms) {
                acc[key] += (material.uniforms[def.uniform]?.value || def.default) * need;
            }
        },

        // 6. REQUIRED: Finalize accumulated weights (calculate weighted average)
        finalizeTargets({ target, totalW, acc }) {
            const invW = 1.0 / Math.max(totalW, 1e-6);
            const next = { ...target };

            for (const [key] of accumulatedUniforms) {
                next[key] = acc[key] * invW;
            }

            return { target: next };
        },

        // 7. REQUIRED: Apply smoothed values to material uniforms each frame
        applyFrameUniforms({ material, target, a }) {
            for (const [key, def] of accumulatedUniforms) {
                const uniform = material.uniforms[def.uniform];
                if (uniform) {
                    uniform.value += (target[key] - uniform.value) * a;
                }
            }
        },

        // 8. Apply preset values directly (immediate, no smoothing)
        applyFromPreset({ preset, material }) {
            for (const [key, def] of Object.entries(UNIFORMS)) {
                if (preset[key] !== undefined) {
                    if (def.threeValue) {
                        // Handle vec3/vec2/vec4
                        const arr = preset[key];
                        if (arr.length === 3) {
                            material.uniforms[def.uniform].value.set(arr[0], arr[1], arr[2]);
                        } else if (arr.length === 2) {
                            material.uniforms[def.uniform].value.set(arr[0], arr[1]);
                        }
                    } else {
                        material.uniforms[def.uniform].value = preset[key];
                    }
                }
            }
        }
    };
})();
```

---

## Requirements

**Config presets:**
- HERO: Maximum drama (spatial: 1.0, temporal: 1.0, calm: 0.0)
- READ: Minimum distraction (spatial: <0.1, temporal: <0.1, calm: >0.7)
- AMBIENT: Balanced between them
- Custom uniform values should match intensity level

**Adapter - CRITICAL Requirements:**
- Must implement 7 REQUIRED methods (methods 1-7)
- Method 8 (`applyFromPreset`) is OPTIONAL - only needed for special uniform types
- Methods 6 & 7 (`finalizeTargets`, `applyFrameUniforms`) are engine-required - DO NOT rename
- List ALL custom uniforms from shader in UNIFORMS object
- Use appropriate validators (clamp ranges, positive values, etc.)
- Vec3 uniforms need `threeValue: (THREE) => new THREE.Vector3(...)`
- Float uniforms just need `default` value
- Handle vec3/vec2 in `applyFromPreset` using `.set()` method

---

## Validation

Test preset switching:
```javascript
// Apply HERO preset
material.uniforms.u_spatialMotion.value = 1.0;
material.uniforms.u_temporalMotion.value = 1.0;
material.uniforms.u_calm.value = 0.0;
// ... custom uniform values from HERO preset

// Should look dramatic and animated

// Apply READ preset
material.uniforms.u_spatialMotion.value = 0.05;
material.uniforms.u_temporalMotion.value = 0.03;
material.uniforms.u_calm.value = 0.8;
// ... custom uniform values from READ preset

Check:
- [ ] Config has `blendVh`, `transitionVh`, `smoothSpeed` properties
- [ ] Adapter has ALL 7 required methods (not 8 - applyFromPreset is optional)
- [ ] `finalizeTargets` returns `{ target: next }`
- [ ] `applyFrameUniforms` uses parameter `a` (not `dt * smoothSpeed`)
- [ ] `initTarget()` accesses `UNIFORMS[key].default` (not undefined `def.default`)
- [ ] HERO and READ look dramatically different
- [ ] HERO is energetic, READ is subtle

**CROSS-CHECK UNIFORMS:**
- [ ] List all `uniform` declarations from shader (excluding engine-provided)
- [ ] Verify each custom uniform has entry in UNIFORMS object
- [ ] Verify each UNIFORMS entry has matching uniform in shader
- [ ] Verify uniform names match exactly (u_ prefix in shader, no prefix in adapter key)
- [ ] Verify each custom uniform appears in all 3 presets (HERO, AMBIENT, READ)
- [ ] HERO is energetic, READ is subtle
- [ ] All custom uniforms have matching entries in config and adapter
- [ ] Uniform names match shader declarations
