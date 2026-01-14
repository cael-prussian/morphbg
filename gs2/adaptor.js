window.BG2_AllModesAdapter = (() => {
    let lastMouseX = 0.5;
    let lastMouseY = 0.5;
    let cursorSpeed = 0.0;
    let ghostTime = 0.0;
    const SPEED_SMOOTH = 0.12;
    const SPEED_DECAY = 0.90;
    const MOVE_EPS = 1e-5;
    const GHOST_RATE_MIN = 0.10;
    const GHOST_RATE_MAX = 1.00;

    function clamp01(x) { return Math.max(0, Math.min(1, x)); }
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
    function degToRad(d) { return (d * Math.PI) / 180; }

    // Single source of truth: uniform definitions
    const UNIFORMS = {
        // Special uniforms (not accumulated)
        heroAlwaysOnK: { uniform: 'u_heroAlwaysOnK', default: 0.0, accumulate: false },
        cursorSpeed: { uniform: 'u_cursorSpeed', default: 0.0, accumulate: false },
        ghostTime: { uniform: 'u_ghostTime', default: 0.0, accumulate: false },

        // Special accumulated (uses vector accumulation for direction)
        flowDir: {
            uniform: 'u_flowDir',
            default: 0.0,
            dataAttr: 'data-flow-dir',
            accumulateAsVector: true,
            parseValue: (raw) => {
                const str = (raw || '').trim();
                if (str.endsWith('deg')) {
                    const v = parseFloat(str.replace('deg', ''));
                    return Number.isNaN(v) ? 0.0 : degToRad(v);
                }
                const v = parseFloat(str);
                return Number.isNaN(v) ? 0.0 : v;
            }
        },

        // Standard accumulated uniforms
        gridLineWidth: { uniform: 'u_gridLineWidth', default: 1.0, dataAttr: 'data-grid-line-width', validator: (v) => clamp(v, 0.5, 2.5) },
        gridFillAmount: { uniform: 'u_gridFillAmount', default: 0.5, dataAttr: 'data-grid-fill-amount' },
        gridCursorFills: { uniform: 'u_gridCursorFills', default: 1.0, dataAttr: 'data-grid-cursor-fills', validator: (v) => clamp(v, 0.0, 2.0) },
        gridSubdivisionDepth: { uniform: 'u_gridSubdivisionDepth', default: 1.0, dataAttr: 'data-grid-subdivision-depth', validator: (v) => clamp(v, 0.3, 1.5) },
        gridSmallFills: { uniform: 'u_gridSmallFills', default: 1.0, dataAttr: 'data-grid-small-fills' },
        shardCount: { uniform: 'u_shardCount', default: 1.0, dataAttr: 'data-shard-count', validator: (v) => clamp(v, 0.3, 2.0) },
        shardSpeed: { uniform: 'u_shardSpeed', default: 1.0, dataAttr: 'data-shard-speed', validator: (v) => clamp(v, 0.0, 2.0) },
        shardChaos: { uniform: 'u_shardChaos', default: 1.0, dataAttr: 'data-shard-chaos', validator: (v) => clamp(v, 0.0, 2.0) },
        flowDensity: { uniform: 'u_flowDensity', default: 1.0, dataAttr: 'data-flow-density', validator: (v) => clamp(v, 0.4, 2.0) },
        flowWarp: { uniform: 'u_flowWarp', default: 1.0, dataAttr: 'data-flow-warp', validator: (v) => clamp(v, 0.0, 2.0) },
    };

    const accumulatedUniforms = Object.entries(UNIFORMS).filter(([_, def]) => def.accumulate !== false);
    const standardUniforms = accumulatedUniforms.filter(([_, def]) => !def.accumulateAsVector);

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
            // Vector accumulation for flowDir
            acc.flowDirX = 0.0;
            acc.flowDirY = 0.0;
            // Standard accumulation
            for (const [key] of standardUniforms) {
                acc[key] = 0.0;
            }
            return acc;
        },

        accumulateFromSection({ el, w, acc }) {
            // Handle flowDir (vector accumulation)
            const flowDef = UNIFORMS.flowDir;
            const rawDir = el.getAttribute(flowDef.dataAttr);
            const dirRad = flowDef.parseValue(rawDir);
            acc.flowDirX += Math.cos(dirRad) * w;
            acc.flowDirY += Math.sin(dirRad) * w;

            // Handle standard uniforms
            for (const [key, def] of standardUniforms) {
                const raw = el.getAttribute(def.dataAttr);
                let value = parseFloat(raw) || def.default;
                if (def.validator) {
                    value = def.validator(value);
                } else {
                    value = clamp01(value);
                }
                acc[key] += value * w;
            }
        },

        accumulateBaseline({ need, acc, material }) {
            const u = material.uniforms || {};

            // Handle flowDir baseline (vector)
            const flowDir = u.u_flowDir?.value ?? 0;
            acc.flowDirX += Math.cos(flowDir) * need;
            acc.flowDirY += Math.sin(flowDir) * need;

            // Handle standard uniforms baseline
            for (const [key, def] of standardUniforms) {
                acc[key] += (u[def.uniform]?.value || def.default) * need;
            }
        },

        finalizeTargets({ target, totalW, acc }) {
            const invW = 1.0 / Math.max(totalW, 1e-6);
            const next = { ...target };

            // Finalize flowDir (vector to angle)
            const fx = acc.flowDirX * invW;
            const fy = acc.flowDirY * invW;
            next.flowDir = Math.atan2(fy, fx);

            // Finalize standard uniforms
            for (const [key] of standardUniforms) {
                next[key] = acc[key] * invW;
            }

            return { target: next };
        },

        applyFrameUniforms({ material }) {
            const u = material.uniforms || {};
            const um = u.u_mouse?.value;
            const ut = u.u_time?.value;
            if (!um || ut == null) return;

            // Hero always-on calculation
            const spatial = u.u_spatialMotion?.value ?? 0;
            const heroK = clamp((spatial - 0.70) / (0.95 - 0.70), 0, 1);
            const heroOn = heroK > 0.001;
            let k = 0.0;
            if (heroOn) {
                const dx = um.x - 0.5;
                const dy = um.y - 0.5;
                const d = Math.sqrt(dx * dx + dy * dy);
                const dNorm = Math.min(1, d / 0.7071);
                k = 1.0 - dNorm;
                k = k * k;
            }
            if (u.u_heroAlwaysOnK) u.u_heroAlwaysOnK.value = heroOn ? k : 0.0;

            // Cursor speed tracking
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
            if (u.u_cursorSpeed) u.u_cursorSpeed.value = heroOn ? cursorSpeed : 0.0;

            // Ghost time
            if (heroOn && dist > MOVE_EPS && dt > 0.0) {
                const rate = GHOST_RATE_MIN + (GHOST_RATE_MAX - GHOST_RATE_MIN) * cursorSpeed;
                ghostTime += dt * rate;
            }
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
