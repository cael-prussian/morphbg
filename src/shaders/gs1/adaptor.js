window.BG_TopoReadAdapter = (() => {
    function clamp01(x) { return Math.max(0, Math.min(1, x)); }

    // Single source of truth: uniform definitions
    const UNIFORMS = {
        // Special uniforms (not accumulated)
        focusEnabled: { uniform: 'u_focusEnabled', default: 0, accumulate: false, threeValue: (THREE) => 0 },
        focusStrength: { uniform: 'u_focusStrength', default: 0, accumulate: false, threeValue: (THREE) => 0 },
        focusRect: { uniform: 'u_focusRect', default: null, accumulate: false, threeValue: (THREE) => new THREE.Vector4(0.5, 0.5, 1, 1) },

        // Accumulated uniforms - preset-driven
        cursorGlobal: { uniform: 'u_cursorGlobal', default: 0.0, dataAttr: 'data-cursor-global', useMaterialFallback: true },
        flatten: { uniform: 'u_flatten', default: 0.0, dataAttr: 'data-flatten' },
        heightContrast: { uniform: 'u_heightContrast', default: 1.0, dataAttr: 'data-height-contrast', validator: (v) => Math.max(0, v) },

        // Accumulated uniforms - data-driven
        warpIntensity: { uniform: 'u_warpIntensity', default: 1.0, dataAttr: 'data-warp-intensity' },
        topoBands: { uniform: 'u_topoBands', default: 20.0, dataAttr: 'data-topo-bands', validator: (v) => Math.max(2, Math.min(50, v)) },
        topoWhiteBias: { uniform: 'u_topoWhiteBias', default: 0.0, dataAttr: 'data-topo-white-bias' },
        organicBacklight: { uniform: 'u_organicBacklight', default: 1.0, dataAttr: 'data-organic-backlight' },
        organicDarkening: { uniform: 'u_organicDarkening', default: 1.0, dataAttr: 'data-organic-darkening' },
    };

    const accumulatedUniforms = Object.entries(UNIFORMS).filter(([_, def]) => def.accumulate !== false);

    return {
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

        accumulateFromSection({ el, w, acc, clamp01, material }) {
            for (const [key, def] of accumulatedUniforms) {
                let value;

                if (def.useMaterialFallback) {
                    // Preset-driven: fallback to current material value
                    value = parseFloat(el.getAttribute(def.dataAttr)) || material.uniforms[def.uniform]?.value || def.default;
                } else {
                    value = parseFloat(el.getAttribute(def.dataAttr)) || def.default;
                }

                if (def.validator) {
                    value = def.validator(value);
                } else {
                    value = clamp01(value);
                }

                acc[key] += value * w;
            }
        },

        accumulateBaseline({ need, acc, material }) {
            for (const [key, def] of accumulatedUniforms) {
                acc[key] += (material.uniforms[def.uniform]?.value || def.default) * need;
            }
        },

        finalizeTargets({ target, totalW, acc }) {
            const invW = 1.0 / Math.max(totalW, 1e-6);
            const next = { ...target };

            for (const [key] of accumulatedUniforms) {
                next[key] = acc[key] * invW;
            }

            return { target: next };
        },

        applyFrameUniforms({ material, target, a }) {
            for (const [key, def] of accumulatedUniforms) {
                const uniform = material.uniforms[def.uniform];
                if (uniform) {
                    uniform.value += (target[key] - uniform.value) * a;
                }
            }
        }
    };
})();