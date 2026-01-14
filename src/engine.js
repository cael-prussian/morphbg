window.initBGShaderSystem = function initBGShaderSystem(opts) {
    const THREE = window.THREE;
    const CFG = opts.config;
    const FRAG = opts.fragmentShader;
    const canvasId = opts.canvasId || 'bg-canvas';
    const ADAPTER = opts.adapter || null;
    const DEBUG = opts.debug || false; // Enable debug mode

    if (!THREE || !CFG || !FRAG) {
        console.warn('Missing THREE, config, or fragment shader', opts);
        return null;
    }

    const MODE_MAP = CFG.modes || {};
    const PRESETS = CFG.presets || {};

    const transitionVh = typeof CFG.transitionVh === 'number' ? CFG.transitionVh : 0.5;
    const smoothSpeed = typeof CFG.smoothSpeed === 'number' ? CFG.smoothSpeed : 2.0;

    // Keep your curves generic (not shader-specific)
    const CURVES = {
        HERO: { radiusMul: 0.85, exponent: 2.2 },
        READ: { radiusMul: 1.60, exponent: 0.65 },
        AMBIENT: { radiusMul: 1.10, exponent: 1.25 }
    };

    const clamp01 = (x) => Math.min(1, Math.max(0, x));
    function smoothstep(a, b, x) {
        const t = clamp01((x - a) / (b - a));
        return t * t * (3 - 2 * t);
    }
    function modeNameToValue(name) {
        return (name && MODE_MAP[name] != null) ? MODE_MAP[name] : 0.0;
    }
    function getPreset(name) {
        const key = (name || 'AMBIENT').toUpperCase();
        return PRESETS[key] || PRESETS.AMBIENT;
    }
    function getCurve(name) {
        const key = (name || 'AMBIENT').toUpperCase();
        return CURVES[key] || CURVES.AMBIENT;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geom = new THREE.PlaneGeometry(2, 2);

    const mouse = new THREE.Vector2(0.5, 0.5);
    const mouseTarget = new THREE.Vector2(0.5, 0.5);

    const basePreset = PRESETS.AMBIENT;

    // ---- Adapter hook: extra uniforms (shader-specific)
    const extraUniforms =
        (ADAPTER && typeof ADAPTER.extendUniforms === 'function')
            ? (ADAPTER.extendUniforms(THREE, CFG, PRESETS) || {})
            : {};

    const material = new THREE.ShaderMaterial({
        uniforms: {
            // Universal uniforms (engine-owned)
            u_time: { value: 0 },
            u_resolution: { value: new THREE.Vector2() },
            u_mouse: { value: mouse.clone() },
            u_mode: { value: 0 },

            u_spatialMotion: { value: basePreset.spatial },
            u_temporalMotion: { value: basePreset.temporal },
            u_cursorEnabled: { value: basePreset.cursor },
            u_calm: { value: basePreset.calm },

            // Shader-specific uniforms (adapter-owned)
            ...extraUniforms,
        },
        vertexShader: `
      varying vec2 v_uv;
      void main() {
        v_uv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
        fragmentShader: FRAG
    });

    scene.add(new THREE.Mesh(geom, material));

    // -------------------------
    // Adaptive performance knobs
    // -------------------------
    let scrolling = false;
    let scrollTimer = null;

    // Debug FPS tracking
    let fpsCounter = null;
    let fpsFrames = [];
    let fpsLastTime = performance.now();

    if (DEBUG) {
        // Create FPS counter element
        fpsCounter = document.createElement('div');
        fpsCounter.id = 'morphbg-fps-counter';
        fpsCounter.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #0f0;
            padding: 8px 12px;
            font-family: monospace;
            font-size: 12px;
            border-radius: 4px;
            z-index: 9999;
            pointer-events: none;
        `;
        fpsCounter.textContent = 'FPS: --';
        document.body.appendChild(fpsCounter);

        console.log('[morphbg] Debug mode enabled');
        console.log('[morphbg] Config:', CFG);
        console.log('[morphbg] Adapter:', ADAPTER ? ADAPTER.constructor.name || 'Anonymous' : 'None');
    }

    window.addEventListener('scroll', () => {
        scrolling = true;
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => (scrolling = false), 120);
    }, { passive: true });

    function currentReadK() {
        // 1 = READ-ish, 0 = AMBIENT/HERO-ish (mirrors shader mapping)
        const t = material.uniforms.u_temporalMotion?.value ?? 0;
        return 1.0 - smoothstep(0.12, 0.18, t);
    }
    function currentHeroK() {
        const s = material.uniforms.u_spatialMotion?.value ?? 0;
        return smoothstep(0.70, 0.95, s);
    }
    function currentCursorSpeed() {
        // Provided by your adapter (TopoReadAdapter). If not present, assume low.
        return material.uniforms.u_cursorSpeed?.value ?? 0;
    }

    function desiredFps() {
        const readK = currentReadK();
        const heroK = currentHeroK();
        const cSpeed = currentCursorSpeed();

        if (scrolling) return 60;
        if (cSpeed > 0.02) return 60;

        if (heroK > 0.20) return 45;

        if (readK > 0.60) return 20;  // READ calm
        return 30;                    // AMBIENT default
    }

    function updateFpsCounter(actualFps, targetFps) {
        if (!DEBUG || !fpsCounter) return;

        // Color based on performance
        let color = '#0f0'; // green
        if (actualFps < targetFps * 0.8) color = '#ff0'; // yellow
        if (actualFps < targetFps * 0.5) color = '#f00'; // red

        fpsCounter.style.color = color;
        fpsCounter.textContent = `FPS: ${actualFps.toFixed(1)} / ${targetFps} (DPR: ${dpr.toFixed(2)})`;
    }

    let dpr = 1;
    function setDpr(next) {
        next = Math.max(1, Math.min(2, next));
        if (Math.abs(next - dpr) < 0.01) return;
        dpr = next;
        renderer.setPixelRatio(dpr);
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        material.uniforms.u_resolution.value.set(
            renderer.domElement.width,
            renderer.domElement.height
        );
    }

    function desiredDpr() {
        const heroK = currentHeroK();
        const cSpeed = currentCursorSpeed();

        if (scrolling || cSpeed > 0.02 || heroK > 0.20) {
            return Math.min(window.devicePixelRatio || 1, 2);
        }
        return 1;
    }

    function resize() {
        // keep current adaptive dpr (don’t force retina on resize)
        renderer.setPixelRatio(dpr);
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        material.uniforms.u_resolution.value.set(
            renderer.domElement.width,
            renderer.domElement.height
        );
    }
    window.addEventListener('resize', resize, { passive: true });

    // initial DPR
    setDpr(desiredDpr());
    resize();

    window.addEventListener('pointermove', (e) => {
        mouseTarget.set(
            e.clientX / window.innerWidth,
            1.0 - e.clientY / window.innerHeight
        );
    }, { passive: true });

    window.addEventListener('pointerleave', () => {
        mouseTarget.set(0.5, 0.5);
    });

    const sections = Array.from(
        document.querySelectorAll('[data-shader-mode], [data-shader-preset]')
    );

    let lastPreset = 'AMBIENT';
    let lastMode = Object.keys(MODE_MAP)[0] || 'glitch-grid';

    let targetMode = 0;

    // ---- Adapter hook: extra target fields (shader-specific)
    const targetExtraInit =
        (ADAPTER && typeof ADAPTER.initTarget === 'function')
            ? (ADAPTER.initTarget() || {})
            : {};

    let target = { ...basePreset, ...targetExtraInit };

    function computeScrollTargets() {
        const vh = window.innerHeight;
        const vc = vh * 0.5;
        const transitionPx = Math.max(1, vh * transitionVh);

        if (DEBUG) {
            console.log('[morphbg] Computing scroll targets - viewport center:', vc);
        }

        let totalW = 0;
        let modeSum = 0;

        let strongestW = 0;
        let strongestPreset = lastPreset;
        let strongestMode = lastMode;

        const acc = {
            spatial: 0, temporal: 0, cursor: 0, calm: 0,
        };

        // ---- Adapter hook: extra accumulator (shader-specific)
        const accExtra =
            (ADAPTER && typeof ADAPTER.initAcc === 'function')
                ? (ADAPTER.initAcc() || {})
                : {};

        function sectionWeight(rect, exponent) {
            const top = rect.top;
            const bottom = rect.bottom;

            if (vc >= top && vc <= bottom) return 1.0;

            if (vc < top && vc >= top - transitionPx) {
                const t = (vc - (top - transitionPx)) / transitionPx;
                return Math.pow(smoothstep(0, 1, t), exponent);
            }

            if (vc > bottom && vc <= bottom + transitionPx) {
                const t = (vc - bottom) / transitionPx;
                return Math.pow(1.0 - smoothstep(0, 1, t), exponent);
            }

            return 0.0;
        }

        for (const el of sections) {
            const rect = el.getBoundingClientRect();

            const presetName = (el.getAttribute('data-shader-preset') || 'AMBIENT').toUpperCase();
            const modeName = el.getAttribute('data-shader-mode') || lastMode;

            const curve = getCurve(presetName);
            const preset = getPreset(presetName);

            const w = sectionWeight(rect, curve.exponent);
            if (w <= 0.00001) continue;

            if (DEBUG && w > 0.01) {
                console.log(`[morphbg] Section weight: ${w.toFixed(3)} - preset: ${presetName}, mode: ${modeName}`);
            }

            if (w > strongestW) {
                strongestW = w;
                strongestPreset = presetName;
                strongestMode = modeName;
            }

            totalW += w;
            modeSum += modeNameToValue(modeName) * w;

            acc.spatial += preset.spatial * w;
            acc.temporal += preset.temporal * w;
            acc.cursor += preset.cursor * w;
            acc.calm += preset.calm * w;

            // ---- Adapter hook: read shader-specific data-* and accumulate
            if (ADAPTER && typeof ADAPTER.accumulateFromSection === 'function') {
                ADAPTER.accumulateFromSection({ el, w, acc: accExtra, clamp01, material });
            }
        }

        if (strongestW > 0.001) {
            lastPreset = strongestPreset;
            lastMode = strongestMode;
        }

        const BASELINE_W = 0.15;
        if (totalW < BASELINE_W) {
            const p = getPreset(lastPreset);
            const need = BASELINE_W - totalW;

            totalW += need;
            modeSum += modeNameToValue(lastMode) * need;

            acc.spatial += p.spatial * need;
            acc.temporal += p.temporal * need;
            acc.cursor += p.cursor * need;
            acc.calm += p.calm * need;

            // ---- Adapter hook: keep shader-specific continuity during baseline fill
            if (ADAPTER && typeof ADAPTER.accumulateBaseline === 'function') {
                ADAPTER.accumulateBaseline({ need, acc: accExtra, material, clamp01 });
            }
        }

        targetMode = modeSum / totalW;

        // Base target values from universal presets
        let nextTarget = {
            spatial: acc.spatial / totalW,
            temporal: acc.temporal / totalW,
            cursor: acc.cursor / totalW,
            calm: acc.calm / totalW,
        };

        if (DEBUG) {
            console.log('[morphbg] Final targets:', {
                mode: targetMode.toFixed(2),
                spatial: nextTarget.spatial.toFixed(2),
                temporal: nextTarget.temporal.toFixed(2),
                cursor: nextTarget.cursor.toFixed(2),
                calm: nextTarget.calm.toFixed(2),
                totalWeight: totalW.toFixed(2),
                strongestPreset: lastPreset,
                strongestMode: lastMode
            });
        }

        const res = ADAPTER.finalizeTargets({
            target: { ...nextTarget, ...(targetExtraInit || {}) },
            totalW,
            acc: accExtra,
            material,
            lastPreset,
            lastMode
        });
        if (res && res.target) nextTarget = res.target;

        target = nextTarget;
    }

    window.addEventListener('scroll', computeScrollTargets, { passive: true });
    window.addEventListener('load', computeScrollTargets);
    computeScrollTargets();

    let lastTime = performance.now() * 0.001;

    // render throttling state
    let lastRenderT = performance.now() * 0.001;

    // Animation control
    let animationId = null;
    let isRunning = true;

    function animate() {
        if (!isRunning) return; // Stop animation loop

        animationId = requestAnimationFrame(animate);

        const now = performance.now() * 0.001;
        const dt = now - lastTime;
        lastTime = now;

        // --- FPS cap ---
        const fps = desiredFps();
        const minStep = 1 / fps;
        if ((now - lastRenderT) < minStep) return;
        lastRenderT = now;

        // --- Adaptive DPR (retina only when active) ---
        setDpr(desiredDpr());

        // Always keep mouse smoothing (even if time is frozen)
        mouse.lerp(mouseTarget, 0.1);
        material.uniforms.u_mouse.value.copy(mouse);

        const a = Math.min(dt * smoothSpeed, 1);

        // Lerp engine-owned uniforms
        material.uniforms.u_mode.value += (targetMode - material.uniforms.u_mode.value) * a;
        material.uniforms.u_spatialMotion.value += (target.spatial - material.uniforms.u_spatialMotion.value) * a;
        material.uniforms.u_temporalMotion.value += (target.temporal - material.uniforms.u_temporalMotion.value) * a;
        material.uniforms.u_cursorEnabled.value += (target.cursor - material.uniforms.u_cursorEnabled.value) * a;
        material.uniforms.u_calm.value += (target.calm - material.uniforms.u_calm.value) * a;

        // Adapter-owned uniform application
        if (ADAPTER && typeof ADAPTER.applyTargetsToUniforms === 'function') {
            ADAPTER.applyTargetsToUniforms({ material, target });
        }

        // Existing per-frame adaptor logic
        if (ADAPTER && typeof ADAPTER.applyFrameUniforms === 'function') {
            ADAPTER.applyFrameUniforms({ material, target, a });
        }

        // --- Freeze time when idle (so shader stops “always animating”) ---
        const heroK = currentHeroK();
        const cSpeed = currentCursorSpeed();
        const shouldAdvanceTime = scrolling || cSpeed > 0.01 || heroK > 0.20;

        if (shouldAdvanceTime) {
            material.uniforms.u_time.value = now;
        }
        // else: keep previous u_time

        renderer.render(scene, camera);

        // Update FPS counter
        if (DEBUG) {
            const fpsNow = performance.now();
            const fpsDelta = fpsNow - fpsLastTime;
            fpsLastTime = fpsNow;

            if (fpsDelta > 0) {
                const currentFps = 1000 / fpsDelta;
                fpsFrames.push(currentFps);
                if (fpsFrames.length > 60) fpsFrames.shift();

                const avgFps = fpsFrames.reduce((a, b) => a + b, 0) / fpsFrames.length;
                updateFpsCounter(avgFps, fps);
            }
        }
    }

    animate();

    // Return instance with stop method
    return {
        renderer,
        scene,
        camera,
        material,
        computeScrollTargets,
        debug: DEBUG,
        stop: () => {
            isRunning = false;
            if (animationId !== null) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            if (DEBUG && fpsCounter && fpsCounter.parentNode) {
                fpsCounter.parentNode.removeChild(fpsCounter);
            }
        }
    };
};
