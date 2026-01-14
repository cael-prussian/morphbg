window.BG3_DotAdapter = (() => {
    let lastMouseX = 0.5, lastMouseY = 0.5;
    let cursorSpeed = 0.0;
    let ghostTime = 0.0;

    const SPEED_SMOOTH = 0.14;
    const SPEED_DECAY = 0.88;
    const MOVE_EPS = 1e-5;

    function clamp01(x) { return Math.max(0, Math.min(1, x)); }
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

    // Single source of truth: uniform definitions
    const UNIFORMS = {
        // Special uniforms (not part of standard accumulation)
        viewportWidth: { uniform: 'u_viewportWidth', default: () => window.innerWidth, accumulate: false },
        cursorSpeed: { uniform: 'u_cursorSpeed', default: 0.0, accumulate: false },
        ghostTime: { uniform: 'u_ghostTime', default: 0.0, accumulate: false },

        // Accumulated uniforms (standard pattern)
        dotDensity: { uniform: 'u_dotDensity', default: 0.55, dataAttr: 'data-dot-density' },
        dotScale: { uniform: 'u_dotScale', default: 0.55, dataAttr: 'data-dot-scale' },
        warpStrength: { uniform: 'u_warpStrength', default: 0.45, dataAttr: 'data-warp' },
        paletteK: { uniform: 'u_paletteK', default: 0.25, dataAttr: 'data-palette' },
        seed: { uniform: 'u_seed', default: 13.7, dataAttr: 'data-seed' },
        cursorInfluence: { uniform: 'u_cursorInfluence', default: 0.20, dataAttr: 'data-cursor-influence' },

        // Kusama knobs
        kGrid: { uniform: 'u_kGrid', default: 0.5, dataAttr: 'data-k-grid' },
        kJitter: { uniform: 'u_kJitter', default: 0.35, dataAttr: 'data-k-jitter' },
        kSize: { uniform: 'u_kSize', default: 0.55, dataAttr: 'data-k-size' },
        kLaneFreq: { uniform: 'u_kLaneFreq', default: 0.5, dataAttr: 'data-k-lane' },
        kLaneWobble: { uniform: 'u_kLaneWobble', default: 0.5, dataAttr: 'data-k-wobble' },
        kAlpha: { uniform: 'u_kAlpha', default: 0.9, dataAttr: 'data-k-alpha' },

        // Mode 2 (Octopus Legs) knobs
        kCurveAmp: { uniform: 'u_kCurveAmp', default: 0.7, dataAttr: 'data-k-curve-amp' },
        kCurveVariety: { uniform: 'u_kCurveVariety', default: 0.8, dataAttr: 'data-k-curve-variety' },

        // Debug toggles
        debugColors: { uniform: 'u_debugColors', default: 0.0, dataAttr: 'data-debug-colors' }
    };

    // Get only accumulated uniforms
    const accumulatedUniforms = Object.entries(UNIFORMS).filter(([_, def]) => def.accumulate !== false);

    return {
        extendUniforms() {
            const uniforms = {};
            for (const [key, def] of Object.entries(UNIFORMS)) {
                const defaultValue = typeof def.default === 'function' ? def.default() : def.default;
                uniforms[def.uniform] = { value: defaultValue };
            }
            return uniforms;
        },

        initTarget() {
            const target = {};
            for (const [key, def] of accumulatedUniforms) {
                target[key] = typeof def.default === 'function' ? def.default() : def.default;
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

        accumulateFromSection({ el, w, acc }) {
            for (const [key, def] of accumulatedUniforms) {
                const defaultValue = typeof def.default === 'function' ? def.default() : def.default;
                const value = clamp01(parseFloat(el.getAttribute(def.dataAttr)) || defaultValue);
                acc[key] += value * w;
            }
        },

        accumulateBaseline({ need, acc, material }) {
            const u = material.uniforms || {};
            for (const [key, def] of accumulatedUniforms) {
                acc[key] += (u[def.uniform]?.value ?? 0) * need;
            }
        },

        finalizeTargets({ target, totalW, acc }) {
            const invW = 1 / Math.max(totalW, 1e-6);
            const next = { ...target };

            for (const [key, def] of accumulatedUniforms) {
                const defaultValue = typeof def.default === 'function' ? def.default() : def.default;
                next[key] = acc[key] * invW || defaultValue;
            }

            return { target: next };
        },

        applyFrameUniforms({ material }) {
            const u = material.uniforms || {};
            const um = u.u_mouse?.value;
            const ut = u.u_time?.value;
            if (!um || ut == null) return;

            // Update CSS viewport width every frame (handles window resize)
            if (u.u_viewportWidth) {
                u.u_viewportWidth.value = window.innerWidth;
            }

            if (this._lastT == null) this._lastT = ut;
            const dt = Math.max(0.0, Math.min(0.05, ut - this._lastT));
            this._lastT = ut;

            const dx = um.x - lastMouseX;
            const dy = um.y - lastMouseY;
            lastMouseX = um.x;
            lastMouseY = um.y;

            const dist = Math.sqrt(dx * dx + dy * dy);
            const rawSpeed = clamp01(dist * 120.0);

            cursorSpeed = cursorSpeed * SPEED_DECAY + rawSpeed * SPEED_SMOOTH;
            cursorSpeed = clamp01(cursorSpeed);

            if (u.u_cursorSpeed) u.u_cursorSpeed.value = cursorSpeed;

            if (dist > MOVE_EPS && dt > 0.0) ghostTime += dt * (0.15 + 0.85 * cursorSpeed);
            if (u.u_ghostTime) u.u_ghostTime.value = ghostTime;
        },

        applyTargetsToUniforms({ material, target }) {
            const u = material.uniforms || {};

            for (const [key, def] of accumulatedUniforms) {
                if (u[def.uniform]) {
                    u[def.uniform].value = target[key];
                }
            }
        }
    };
})();