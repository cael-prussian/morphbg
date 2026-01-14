/**
 * Custom Shader - Adapter Template
 * 
 * The adapter bridges your shader with the morphbg engine.
 * It manages custom uniforms, handles scroll-based accumulation,
 * and applies smooth transitions.
 * 
 * INSTRUCTIONS:
 * 1. Define your custom uniforms in the UNIFORMS object
 * 2. The rest of the code works automatically
 * 3. Customize validators as needed
 */

window.CUSTOM_SHADER_ADAPTER = (() => {
    // Helper function
    function clamp01(x) { return Math.max(0, Math.min(1, x)); }

    // ==================================================================
    // DEFINE YOUR CUSTOM UNIFORMS
    // ==================================================================
    // 
    // Uniform Definition Format:
    // 
    // uniformName: {
    //     uniform: 'u_uniformName',     // GLSL uniform name
    //     default: value,                // Default value
    //     dataAttr: 'data-attr-name',   // HTML attribute (optional)
    //     validator: (v) => ...,         // Validation function (optional)
    //     accumulate: true/false,        // Should blend during scroll? (default: true)
    //     threeValue: (THREE) => ...    // THREE.js value constructor (for vectors)
    // }
    
    const UNIFORMS = {
        // ---- Example 1: Simple float uniform ----
        density: {
            uniform: 'u_density',
            default: 10.0,
            dataAttr: 'data-density',
            validator: (v) => Math.max(1, Math.min(50, v))  // Clamp 1-50
        },

        // ---- Example 2: Speed control ----
        speed: {
            uniform: 'u_speed',
            default: 1.0,
            dataAttr: 'data-speed',
            validator: (v) => Math.max(0, v)  // Must be positive
        },

        // ---- Example 3: Intensity ----
        intensity: {
            uniform: 'u_intensity',
            default: 1.0,
            dataAttr: 'data-intensity',
            validator: (v) => clamp01(v)  // Clamp 0-1
        },

        // ---- Example 4: Color uniform (vec3) ----
        colorA: {
            uniform: 'u_colorA',
            default: [1.0, 0.2, 0.5],  // RGB array
            dataAttr: 'data-color-a',  // Optional: parse from HTML
            threeValue: (THREE) => new THREE.Vector3(1.0, 0.2, 0.5)
        },

        colorB: {
            uniform: 'u_colorB',
            default: [0.2, 0.5, 1.0],
            dataAttr: 'data-color-b',
            threeValue: (THREE) => new THREE.Vector3(0.2, 0.5, 1.0)
        },

        // ---- Example 5: Non-accumulated uniform (boolean-like) ----
        // Some uniforms shouldn't blend during transitions
        // useEffect: {
        //     uniform: 'u_useEffect',
        //     default: 0,
        //     accumulate: false  // Don't blend this value
        // },

        // ---- ADD YOUR UNIFORMS HERE ----
        // Copy the examples above and customize for your shader
    };

    // Filter to get only accumulated uniforms
    const accumulatedUniforms = Object.entries(UNIFORMS).filter(([_, def]) => def.accumulate !== false);

    // ==================================================================
    // ADAPTER IMPLEMENTATION (Auto-generated from UNIFORMS)
    // ==================================================================
    // You typically don't need to modify code below this line.
    // The adapter automatically handles all uniforms defined above.

    return {
        // ---- 1. Extend engine uniforms ----
        // Called once during initialization to create Three.js uniforms
        extendUniforms(THREE) {
            const uniforms = {};
            
            for (const [key, def] of Object.entries(UNIFORMS)) {
                if (def.threeValue) {
                    // Use custom THREE.js value constructor
                    uniforms[def.uniform] = { value: def.threeValue(THREE) };
                } else if (Array.isArray(def.default)) {
                    // Auto-create vector from array
                    const length = def.default.length;
                    if (length === 2) {
                        uniforms[def.uniform] = { value: new THREE.Vector2(...def.default) };
                    } else if (length === 3) {
                        uniforms[def.uniform] = { value: new THREE.Vector3(...def.default) };
                    } else if (length === 4) {
                        uniforms[def.uniform] = { value: new THREE.Vector4(...def.default) };
                    }
                } else {
                    // Simple scalar value
                    uniforms[def.uniform] = { value: def.default };
                }
            }
            
            return uniforms;
        },

        // ---- 2. Initialize target state ----
        // Called once to create the target state object
        initTarget() {
            const target = {};
            for (const [key, def] of accumulatedUniforms) {
                target[key] = Array.isArray(def.default) ? [...def.default] : def.default;
            }
            return target;
        },

        // ---- 3. Initialize accumulator ----
        // Called each frame to create a fresh accumulator
        initAcc() {
            const acc = {};
            for (const [key, def] of accumulatedUniforms) {
                if (Array.isArray(def.default)) {
                    acc[key] = new Array(def.default.length).fill(0);
                } else {
                    acc[key] = 0.0;
                }
            }
            return acc;
        },

        // ---- 4. Accumulate values from sections ----
        // Called for each visible section during scroll
        accumulate(acc, section, preset, scrollWeight) {
            for (const [key, def] of accumulatedUniforms) {
                // Get value from HTML attribute or preset or default
                let value;
                
                if (section.hasAttribute(def.dataAttr)) {
                    // Parse from data attribute
                    const attrValue = section.getAttribute(def.dataAttr);
                    if (Array.isArray(def.default)) {
                        // Parse array (e.g., "1.0,0.5,0.2")
                        value = attrValue.split(',').map(parseFloat);
                    } else {
                        value = parseFloat(attrValue);
                    }
                } else if (preset[key] !== undefined) {
                    // Use preset value
                    value = preset[key];
                } else {
                    // Use default
                    value = def.default;
                }

                // Apply validator if defined
                if (def.validator) {
                    if (Array.isArray(value)) {
                        value = value.map(def.validator);
                    } else {
                        value = def.validator(value);
                    }
                }

                // Accumulate with scroll weight
                if (Array.isArray(value)) {
                    for (let i = 0; i < value.length; i++) {
                        acc[key][i] += value[i] * scrollWeight;
                    }
                } else {
                    acc[key] += value * scrollWeight;
                }
            }
        },

        // ---- 5. Finalize accumulator ----
        // Normalize accumulated values by total weight
        finalize(acc, totalWeight) {
            if (totalWeight > 0.001) {
                for (const [key, def] of accumulatedUniforms) {
                    if (Array.isArray(acc[key])) {
                        acc[key] = acc[key].map(v => v / totalWeight);
                    } else {
                        acc[key] /= totalWeight;
                    }
                }
            }
        },

        // ---- 6. Apply to target with smoothing ----
        // Smooth transition from current target to accumulated values
        applyToTarget(target, acc, deltaSmoothed) {
            for (const [key, def] of accumulatedUniforms) {
                if (Array.isArray(target[key])) {
                    for (let i = 0; i < target[key].length; i++) {
                        target[key][i] += (acc[key][i] - target[key][i]) * deltaSmoothed;
                    }
                } else {
                    target[key] += (acc[key] - target[key]) * deltaSmoothed;
                }
            }
        },

        // ---- 7. Update material uniforms ----
        // Apply target values to Three.js material uniforms
        updateMaterial(material, target) {
            for (const [key, def] of accumulatedUniforms) {
                const uniform = material.uniforms[def.uniform];
                if (uniform) {
                    if (Array.isArray(target[key])) {
                        // Update vector uniform
                        if (uniform.value.set) {
                            uniform.value.set(...target[key]);
                        }
                    } else {
                        // Update scalar uniform
                        uniform.value = target[key];
                    }
                }
            }
        }
    };
})();

// ==================================================================
// USAGE TIPS
// ==================================================================

/*
1. ADDING NEW UNIFORMS:
   - Add to UNIFORMS object above
   - Add corresponding uniform in shader.js
   - Add to presets in config.js

2. VALIDATORS:
   Common patterns:
   - Clamp range: (v) => Math.max(min, Math.min(max, v))
   - Positive only: (v) => Math.max(0, v)
   - Normalize 0-1: (v) => clamp01(v)
   - Round to int: (v) => Math.round(v)

3. HTML ATTRIBUTES:
   Users can override preset values:
   <section data-shader-preset="HERO" data-density="25">
   
4. NON-ACCUMULATED UNIFORMS:
   Use accumulate: false for:
   - Boolean flags
   - Mode switches
   - Discrete values that shouldn't blend

5. VECTOR UNIFORMS:
   - Arrays auto-convert to THREE.Vector2/3/4
   - Provide threeValue for custom construction
   - Data attributes: "1.0,0.5,0.2" (comma-separated)

6. DEBUGGING:
   Enable debug mode to see uniform values:
   window.initCustomShader('bg-canvas', { debug: true });
*/
