/**
 * morphbg - Complete Bundle (All-in-One)
 * Includes: Engine + ScrollShaderManager + All 3 Shaders
 * Single file for maximum ease of use - just add Three.js and this file
 * https://github.com/cael-prussian/morphbg
 */

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


/**
 * ScrollShaderManager - Scroll-based shader switching (single canvas)
 * Automatically switches shaders based on scroll position
 */
window.ScrollShaderManager = (function () {
    let currentShader = null;
    let instance = null;
    let isTransitioning = false;
    let lastSection = null;

    // Shader registry
    const shaders = {
        gs1: {
            name: 'Topographic Flow',
            config: () => window.BG_SHADER_CONFIG,
            fragment: () => window.BG_FRAGMENT_SHADER,
            adapter: () => window.BG_TopoReadAdapter,
        },
        gs2: {
            name: 'Glitch Technical',
            config: () => window.BG2_SHADER_CONFIG,
            fragment: () => window.BG2_FRAGMENT_SHADER,
            adapter: () => window.BG2_AllModesAdapter,
        },
        gs3: {
            name: 'Dot Field',
            config: () => window.BG3_SHADER_CONFIG,
            fragment: () => window.BG3_FRAGMENT_SHADER,
            adapter: () => window.BG3_DotAdapter,
        }
    };

    /**
     * Dispose of current shader instance
     */
    function dispose() {
        if (!instance) return;

        try {
            // Stop animation loop first
            if (instance.stop && typeof instance.stop === 'function') {
                instance.stop();
            }

            // Clean up Three.js resources
            if (instance.renderer) {
                instance.renderer.dispose();
            }

            if (instance.scene) {
                instance.scene.traverse((object) => {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(mat => mat.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                });
            }

            instance = null;
            console.log('ScrollShaderManager: Disposed shader instance');
        } catch (error) {
            console.error('ScrollShaderManager: Error during disposal:', error);
        }
    }

    /**
     * Initialize a shader
     */
    function initShader(shaderId) {
        const shader = shaders[shaderId];
        if (!shader) {
            console.error(`ScrollShaderManager: Unknown shader "${shaderId}"`);
            return null;
        }

        if (!window.initBGShaderSystem) {
            console.error('ScrollShaderManager: Engine not loaded');
            return null;
        }

        const config = shader.config();
        const fragment = shader.fragment();
        const adapter = shader.adapter();

        if (!config || !fragment) {
            console.error(`ScrollShaderManager: Missing files for ${shaderId}`);
            return null;
        }

        try {
            return window.initBGShaderSystem({
                canvasId: 'bg-canvas',
                fragmentShader: fragment,
                config: config,
                adapter: adapter || null
            });
        } catch (error) {
            console.error(`ScrollShaderManager: Error initializing ${shaderId}:`, error);
            return null;
        }
    }

    /**
     * Switch to a new shader with brief fade
     */
    function switchTo(shaderId) {
        if (currentShader === shaderId || isTransitioning) {
            return true;
        }

        isTransitioning = true;
        console.log(`ScrollShaderManager: Switching to ${shaderId}`);

        const canvas = document.getElementById('bg-canvas');
        if (!canvas) {
            console.error('ScrollShaderManager: Canvas not found');
            isTransitioning = false;
            return false;
        }

        // Brief fade out
        canvas.style.transition = 'opacity 0.3s ease-out';
        canvas.style.opacity = '0';

        setTimeout(() => {
            // Dispose old shader
            dispose();

            // Initialize new shader
            instance = initShader(shaderId);

            if (instance) {
                currentShader = shaderId;

                // Store instance globally for config form access
                const instanceMap = {
                    'gs1': '__BG1_INSTANCE__',
                    'gs2': '__BG2_INSTANCE__',
                    'gs3': '__BG3_INSTANCE__'
                };
                const globalName = instanceMap[shaderId];
                if (globalName) {
                    window[globalName] = instance;
                }

                // Trigger scroll recalculation
                if (instance.computeScrollTargets) {
                    setTimeout(() => instance.computeScrollTargets(), 50);
                }

                // Update config form to show controls for this shader
                if (window.ConfigFormManager && typeof window.ConfigFormManager.showControlsFor === 'function') {
                    // Get the current active section
                    const result = detectActiveShaderAndSection();
                    window.ConfigFormManager.showControlsFor(shaderId, instance, result.section);
                }

                // Fade in
                setTimeout(() => {
                    canvas.style.opacity = '1';
                    setTimeout(() => {
                        isTransitioning = false;
                    }, 300);
                }, 50);

                console.log(`ScrollShaderManager: Switched to ${shaderId}`);
            } else {
                console.error(`ScrollShaderManager: Failed to initialize ${shaderId}`);
                canvas.style.opacity = '1';
                isTransitioning = false;
            }
        }, 300);

        return true;
    }

    /**
     * Detect which shader and section should be active based on scroll position
     * Returns { shader, section } object
     */
    function detectActiveShaderAndSection() {
        const vh = window.innerHeight;
        const scrollY = window.scrollY;
        const viewportCenter = scrollY + vh * 0.5;

        // Get all sections with data-shader-system attribute
        const sections = document.querySelectorAll('[data-shader-system]');

        let bestMatch = null;
        let bestSection = null;
        let bestWeight = 0;

        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            const top = rect.top + scrollY;
            const bottom = top + rect.height;

            // Calculate how much of this section is in the viewport
            const visibleTop = Math.max(top, scrollY);
            const visibleBottom = Math.min(bottom, scrollY + vh);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            const weight = visibleHeight / vh;

            // Also consider distance to viewport center
            const sectionCenter = (top + bottom) / 2;
            const distanceToCenter = Math.abs(sectionCenter - viewportCenter);
            const centerWeight = Math.max(0, 1 - distanceToCenter / (vh * 1.5));

            const totalWeight = weight * 0.6 + centerWeight * 0.4;

            if (totalWeight > bestWeight) {
                bestWeight = totalWeight;
                bestMatch = section.getAttribute('data-shader-system');
                bestSection = section;
            }
        });

        return { shader: bestMatch, section: bestSection };
    }

    /**
     * Monitor scroll and switch shaders as needed
     */
    function startScrollMonitoring() {
        let ticking = false;
        let lastDetected = null;

        function onScroll() {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const result = detectActiveShaderAndSection();
                    const detected = result.shader;
                    const section = result.section;

                    // Check if shader changed
                    if (detected && detected !== lastDetected && detected !== currentShader && !isTransitioning) {
                        lastDetected = detected;
                        lastSection = section;
                        switchTo(detected);
                    }
                    // Check if section changed within same shader
                    else if (detected === currentShader && section !== lastSection && !isTransitioning) {
                        lastSection = section;
                        // Update config form with new section
                        if (window.ConfigFormManager && typeof window.ConfigFormManager.showControlsFor === 'function') {
                            window.ConfigFormManager.showControlsFor(currentShader, instance, section);
                        }
                    }

                    ticking = false;
                });
                ticking = true;
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });

        // Initial detection
        setTimeout(() => {
            const result = detectActiveShaderAndSection();
            const initial = result.shader;
            const section = result.section;
            if (initial) {
                console.log(`ScrollShaderManager: Initial shader: ${initial}`);
                instance = initShader(initial);
                lastDetected = initial;
                lastSection = section;
                if (instance) {
                    currentShader = initial;
                    // Update config form with initial section
                    if (window.ConfigFormManager && typeof window.ConfigFormManager.showControlsFor === 'function') {
                        window.ConfigFormManager.showControlsFor(initial, instance, section);
                    }
                }
            }
        }, 100);
    }

    /**
     * Initialize the scroll-based shader system
     */
    function init() {
        console.log('ScrollShaderManager: Initializing...');
        startScrollMonitoring();
    }

    /**
     * Get current shader info
     */
    function getCurrentShader() {
        return currentShader;
    }

    function getInstance() {
        return instance;
    }

    function isInTransition() {
        return isTransitioning;
    }

    function getCurrentSection() {
        return lastSection;
    }

    // Public API
    return {
        init,
        switchTo,
        getCurrentShader,
        getInstance,
        isInTransition,
        getCurrentSection
    };
})();


window.BG_SHADER_CONFIG = {
    modes: {
        'atmospheric-mesh': 0.0,
        'topographic-flow': 1.0,
        'fabric-warp': 2.0
    },

    presets: {
        HERO: {
            spatial: 1.0,
            temporal: 1.0,
            cursor: 1.0,
            cursorGlobal: 0.0,
            flatten: 0.0,
            heightContrast: 1.0,
            calm: 0.0
        },

        READ: {
            spatial: 0.05,
            temporal: 0.03,
            cursor: 0.0,
            cursorGlobal: 1.0,
            flatten: 0.85,
            heightContrast: 0.25,
            calm: 0.75
        },

        AMBIENT: {
            spatial: 0.25,
            temporal: 0.20,
            cursor: 0.0,
            cursorGlobal: 0.0,
            flatten: 0.35,
            heightContrast: 0.6,
            calm: 0.4
        }
    },

    blendVh: 1.0,
    transitionVh: 0.5,   // ~50vh overlap band
    smoothSpeed: 2.0
};

window.BG_FRAGMENT_SHADER = `
precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_mode;

uniform float u_spatialMotion;
uniform float u_temporalMotion;
uniform float u_cursorEnabled;
uniform float u_calm;

uniform float u_focusEnabled;
uniform float u_focusStrength;
uniform vec4  u_focusRect;
uniform float u_cursorGlobal;

uniform float u_flatten;
uniform float u_heightContrast;
uniform float u_warpIntensity;

// Phase B: Mode-specific controls
uniform float u_topoBands;          // Mode 1: Contour line count
uniform float u_topoWhiteBias;      // Mode 1: White region expansion
uniform float u_organicBacklight;   // Mode 2: Trough glow intensity
uniform float u_organicDarkening;   // Mode 2: Peak shadow intensity

varying vec2 v_uv;

// ----------------------------------------------------
// Noise / helpers
// ----------------------------------------------------
float hash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p.x + p.y) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float smooth01(float x) { x = clamp(x, 0.0, 1.0); return x * x * (3.0 - 2.0 * x); }

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

// (1) Dither helper: breaks 8-bit banding (use near output)
float dither01(vec2 p) {
  return hash21(p) - 0.5; // -0.5..0.5
}

// fBm and ridged noise for organic textures
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

float ridged(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 5; i++) {
    float n = noise(p);
    n = 1.0 - abs(n * 2.0 - 1.0);
    v += a * n;
    p *= 2.05;
    a *= 0.5;
  }
  return v;
}

// ----------------------------------------------------
// Focus mask
// ----------------------------------------------------
float focusMask(vec2 uv) {
  if (u_focusEnabled < 0.5) return 0.0;
  vec2 c = u_focusRect.xy;
  vec2 s = u_focusRect.zw * 0.5;
  vec2 d = abs(uv - c) - s;
  float outside = max(d.x, d.y);
  float px = 2.0 / max(min(u_resolution.x, u_resolution.y), 1.0);
  return 1.0 - smoothstep(0.0, px * 18.0, outside);
}

// ----------------------------------------------------
// Warp
// ----------------------------------------------------
vec2 centerWarp(vec2 p, vec2 c, float radius, float strength) {
  float r = max(radius, 0.0001);
  float d = length(p - c);
  float w = exp(-(d * d) / (r * r));
  return (c - p) * w * strength;
}

// ----------------------------------------------------
// Palette for atmospheric mode (kept)
// ----------------------------------------------------
vec3 palette5(float t) {
  vec3 c0 = vec3(0.53, 0.05, 0.31);
  vec3 c1 = vec3(0.46, 0.29, 0.65);
  vec3 c2 = vec3(0.42, 0.04, 0.25);
  vec3 c3 = vec3(0.46, 0.29, 0.65);
  vec3 c4 = vec3(0.53, 0.05, 0.31);

  t = fract(t);
  float x = t * 4.0;
  float i = floor(x);
  float f = fract(x);
  f = f * f * (3.0 - 2.0 * f);

  vec3 a = (i < 1.0) ? c0 : (i < 2.0) ? c1 : (i < 3.0) ? c2 : c3;
  vec3 b = (i < 1.0) ? c1 : (i < 2.0) ? c2 : (i < 3.0) ? c3 : c4;

  return mix(a, b, f);
}

// ----------------------------------------------------
// Topo field (UNCHANGED BEHAVIOUR)
// ----------------------------------------------------
struct TopoField { vec2 p; float h; float x; float d; float detail; float bands; };

TopoField computeTopoField(vec2 warpedA, float aspect, vec2 cursorA, vec2 uvA, float temporalK, float spatialK, float cursorLocalK) {
  TopoField F;

  vec2 center1 = vec2(
    0.3 * aspect + 0.25 * aspect * sin(u_time * (0.35 * temporalK)),
    0.3 + 0.22 * cos(u_time * (0.27 * temporalK))
  );
  vec2 center2 = vec2(
    0.7 * aspect + 0.28 * aspect * sin(u_time * (0.22 * temporalK) + 1.3),
    0.7 + 0.24 * cos(u_time * (0.31 * temporalK) + 2.1)
  );

  vec2 p = warpedA;
  p += centerWarp(p, cursorA, 0.55, 0.30 * spatialK * cursorLocalK);
  p += centerWarp(p, center1, 0.75, 0.35 * spatialK);
  p += centerWarp(p, center2, 0.75, 0.35 * spatialK);

  float maxR = 1.2;
  float r = length(uvA - cursorA);
  float localDetail = smooth01(1.0 - clamp(r / maxR, 0.0, 1.0));
  float detail = clamp(0.15 + localDetail * 0.95, 0.0, 1.0);

  float bands = mix(8.0, 50.0, detail);
  float freq  = mix(2.0, 7.0, detail);

  vec2 centered = p - vec2(0.5 * aspect, 0.5);

  float irregular = clamp(u_mouse.y, 0.0, 1.0) * cursorLocalK;
  float jitterAmp  = mix(0.0, 0.25, irregular) * spatialK;
  float jitterFreq = mix(3.0, 10.0, irregular);

  float ttA = u_time * (0.25 * temporalK);
  float ttB = u_time * (0.18 * temporalK);
  float ttC = u_time * (0.60 * temporalK);

  float h = noise(centered * freq + ttA);
  h += 0.5 * noise(centered * freq * 2.0 - ttB);
  h /= 1.5;
  h += jitterAmp * (noise(centered * jitterFreq + ttC) - 0.5);
  h = clamp(h, 0.0, 1.0);

  float x = h * bands;
  float fx = fract(x);
  float d  = min(fx, 1.0 - fx);

  F.p = p; F.h = h; F.x = x; F.d = d; F.detail = detail; F.bands = bands;
  return F;
}

// ----------------------------------------------------
// Organic texture color for mode 3 (procedural)
// Adds: trough backlight + peak darkening + OPTIONAL wobble
// ----------------------------------------------------
vec3 organicTextureColor(vec2 p, vec2 uvA, vec2 cursorA, float t, float hUse, float phase, float spatialK, float temporalK, float calmFactor, float readK) {
  float r = length(uvA - cursorA);
  float cursorZone = smooth01(1.0 - clamp(r / 0.95, 0.0, 1.0));
  cursorZone *= (1.0 - calmFactor);

  // Domain warp for organic flow
  vec2 warp = vec2(
    fbm(p * 2.2 + vec2(t * 0.35, -t * 0.28)),
    fbm(p.yx * 2.2 + vec2(-t * 0.30, t * 0.33))
  ) - 0.5;
  warp *= mix(0.06, 0.18, spatialK) * (0.55 + 0.45 * cursorZone);

  vec2 q = p + warp;

  // Three material layers
  float fibres   = fbm(q * 3.4 + vec2(t * 0.12, -t * 0.09));
  float sediment = ridged(q * 1.9 + vec2(-t * 0.08, t * 0.06));
  float pores    = fbm((q + (fibres - 0.5) * 0.35) * 8.5 + t * 0.15);

  fibres   = (fibres - 0.5);
  sediment = (sediment - 0.5);
  pores    = smoothstep(0.45, 0.78, pores) - smoothstep(0.78, 0.98, pores);

  // Cursor-bound but not blotchy
  vec2 cq = q * (2.2 + 4.0 * spatialK);
  cq += (noise(q * 2.7 + t * 0.9) - 0.5) * 0.65;
  float chaos = ridged(cq * 2.0 + vec2(t * 0.9, -t * 0.85)) - 0.5;
  chaos *= (0.10 + 0.30 * cursorZone) * mix(1.0, 0.55, readK);

  // Peak/trough weights from topo height
  float peak   = smoothstep(0.55, 0.92, hUse);
  float trough = 1.0 - smoothstep(0.08, 0.45, hUse);

  // Height-driven mix
  float matA = fibres * 0.55 + pores * 0.35;
  float matB = sediment * 0.70 + fibres * 0.25;
  float mat  = mix(matB, matA, peak);
  mat += trough * (-0.10 + 0.15 * sediment);
  mat += chaos;

  // Tone base (darker/mid by default, READ dark)
  vec3 baseDark = vec3(0.14, 0.12, 0.11);
  vec3 baseMid  = vec3(0.34, 0.30, 0.28);
  vec3 baseLite = vec3(0.48, 0.44, 0.41);

  vec3 base = mix(baseMid, baseLite, peak * 0.35);
  base = mix(base, baseDark, readK);

  // Subtle chroma variation
  vec3 warm = vec3(1.06, 1.00, 0.96);
  vec3 cool = vec3(0.97, 1.02, 1.06);
  float tintN = fbm(q * 0.55 + vec2(12.7, 3.9));
  vec3 tint = mix(warm, cool, tintN);

  // Shading
  float shade = clamp(0.52 + mat * 0.90, 0.0, 1.0);
  shade = mix(shade, shade * shade, readK);

  vec3 col = base * mix(0.70, 1.18, shade);
  col *= tint;

  // Backlight / subsurface lift
  float backMask = (trough * trough) * (0.20 + 0.80 * cursorZone);

  float shimmer = fbm(q * 1.4 + vec2(t * 0.35, -t * 0.28));
  shimmer = (shimmer - 0.5) * 2.0;

  float thin = clamp(0.55 + 0.55 * shimmer + 0.85 * chaos, 0.0, 1.0);

  float backAmt = 0.35;
  backAmt *= mix(1.35, 0.70, readK);
  backAmt *= mix(0.65, 1.10, spatialK);
  backAmt *= (1.0 - calmFactor);
  backAmt *= u_organicBacklight;  // Apply Phase B control

  vec3 backTint = vec3(1.10, 0.98, 0.88);

  float wobble = (shimmer * 0.5 + 0.5); // 0..1
  backMask *= mix(0.85, 1.25, wobble);

  col += backTint * (backAmt * backMask * thin);

  // Peak darkening
  float peakMask = (peak * peak) * (0.35 + 0.65 * cursorZone);

  float charN = ridged(q * 1.25 + vec2(-t * 0.22, t * 0.18));
  charN = clamp((charN - 0.45) * 1.35, 0.0, 1.0);

  float darkAmt = 0.55;
  darkAmt *= mix(1.10, 0.75, readK);
  darkAmt *= (1.0 - calmFactor);
  darkAmt *= u_organicDarkening;  // Apply Phase B control

  vec3 nearBlack = vec3(0.02, 0.02, 0.02);

  peakMask *= mix(0.80, 1.30, 1.0 - wobble);

  float darkK = darkAmt * peakMask * (0.55 + 0.45 * charN);
  col = mix(col, nearBlack, clamp(darkK, 0.0, 1.0));

  col *= 1.0 + (phase * 0.04);

  return col;
}

void main() {
  float aspect = u_resolution.x / u_resolution.y;

  vec2 uvN = v_uv;
  vec2 uvA = vec2(uvN.x * aspect, uvN.y);

  float topoPresence = 1.0 - smoothstep(0.0, 1.0, abs(u_mode - 1.0) / 0.85);
  float fabricT = smoothstep(1.50, 2.00, u_mode);

  float fMask = focusMask(uvN);
  float calmFactor = clamp(u_calm + fMask * u_focusStrength, 0.0, 1.0);

  float readK = clamp(u_cursorGlobal * smoothstep(0.8, 1.2, u_mode), 0.0, 1.0);

  float spatialK  = u_spatialMotion  * (1.0 - calmFactor);
  float temporalK = u_temporalMotion * (1.0 - calmFactor);

  float cursorOn = (u_cursorEnabled > 0.5) ? 1.0 : 0.0;
  float cursorLocalK  = cursorOn * (1.0 - fMask) * (1.0 - u_cursorGlobal);
  float cursorGlobalK = cursorOn * u_cursorGlobal;

  float t = u_time * mix(0.04, 0.22, temporalK);

  // Apply warpIntensity to spatial warp calculations
  float warpBase = clamp(u_warpIntensity, 0.0, 1.0);
  float warpFreq = mix(1.4, 4.2, spatialK * warpBase);
  float warpAmp  = mix(0.004, 0.12, spatialK * warpBase);

  vec2 warpField = vec2(
    noise(uvA * warpFreq + t),
    noise(uvA * (warpFreq + 0.7) - t)
  );
  vec2 warpedA = uvA + (warpField - 0.5) * warpAmp;

  vec2 cursorA = vec2(u_mouse.x * aspect, u_mouse.y);

  if (cursorGlobalK > 0.001) {
    vec2 c0 = vec2(0.5 * aspect, 0.5);
    float shiftAmt = mix(0.08, 0.012, readK);
    vec2 shift = (cursorA - c0) * shiftAmt * cursorGlobalK;
    warpedA += shift;
  }

  TopoField F = computeTopoField(warpedA, aspect, cursorA, uvA, temporalK, spatialK, cursorLocalK);

  float h0 = F.h;
  float contrast = clamp(u_heightContrast, 0.0, 1.0);
  float hFlat = 0.5 + (h0 - 0.5) * contrast;
  float hUse = mix(h0, hFlat, clamp(u_flatten, 0.0, 1.0));

  float mx = smooth01(u_mouse.x);
  float my = smooth01(u_mouse.y);
  float mousePhase = (mx * 0.18 + my * 0.06) * (cursorLocalK + cursorGlobalK * 0.20);
  float autoPhase  = u_time * (0.020 * temporalK);
  float phaseScale = mix(1.0, 0.08, readK);
  float phase = (mousePhase + autoPhase) * phaseScale;

  float h = hUse;
  float blurScale = mix(1.0, 0.12, readK);
  float blurN = (noise(F.p * 1.25 + t) - 0.5) * (0.10 * (1.0 - calmFactor)) * blurScale;
  h = clamp(h + blurN, 0.0, 1.0);

  vec3 col = palette5(h + phase);
  col = mix(col, col * 0.97, smooth01(F.d * 4.0) * 0.06);

  vec3 atmOnlyCol = col;

  // TOPOGRAPHIC (Mode 1: topographic-flow)
  {
    float bandsUse = mix(F.bands, mix(4.0, 9.0, F.detail), readK);
    // Apply u_topoBands to override automatic band calculation
    bandsUse = mix(bandsUse, u_topoBands, step(2.0, u_topoBands));
    float xUse = clamp(hUse, 0.0, 1.0) * bandsUse;

    float parity = fract(xUse * 0.5);
    // Apply u_topoWhiteBias to control white region expansion
    float whiteBias = mix(0.0, 0.05, readK) + u_topoWhiteBias;
    float regionParity = step(0.5 - whiteBias, parity);

    vec3 topoCol = mix(vec3(1.0), vec3(0.0), regionParity);

    vec3 blended = mix(atmOnlyCol, topoCol, topoPresence);

    if (readK > 0.001) {
      float isWhite = 1.0 - regionParity;
      float isBlack = regionParity;
      blended = mix(blended, vec3(1.0), isWhite * readK);
      blended = mix(blended, atmOnlyCol, isBlack * readK);
    }

    col = blended;
  }

  // MODE 3 (fabric-warp slot): organic textured atmospheric + wobble
  if (fabricT > 0.0001) {
    vec3 organicCol = organicTextureColor(F.p, uvA, cursorA, t, hUse, phase, spatialK, temporalK, calmFactor, readK);
    col = mix(atmOnlyCol, organicCol, fabricT);
  }

  // Grain removed per user preference (no performance impact)
  
  // (1) Dither: break gradient banding without temporal artifacts
  // Static per-frame using floor() to prevent flickering vertical lines
  float d = dither01(gl_FragCoord.xy + vec2(19.7, 73.3) + floor(u_time * 3.0));
  col += d * (1.0 / 255.0) * 0.85;

  col = clamp(col, 0.0, 1.0);
  col = pow(col, vec3(0.95));

  gl_FragColor = vec4(col, 1.0);
}
`;

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

window.BG2_SHADER_CONFIG = {
    modes: {
        'glitch-grid': 0.0,
        'vector-glitch': 1.0,
        'signal-flow': 2.0
    },
    presets: {
        READ: { spatial: 0.12, temporal: 0.06, cursor: 1.0, calm: 0.85 },
        AMBIENT: { spatial: 0.30, temporal: 0.16, cursor: 1.0, calm: 0.45 },
        HERO: { spatial: 0.95, temporal: 0.70, cursor: 1.0, calm: 0.05 },
    },

    blendVh: 1.0,
    transitionVh: 0.5,
    smoothSpeed: 2.0
};


window.BG2_FRAGMENT_SHADER = `
precision highp float;

uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_time;
uniform float u_mode;

uniform float u_heroAlwaysOnK;
uniform float u_spatialMotion;
uniform float u_temporalMotion;
uniform float u_cursorEnabled;
uniform float u_calm;

uniform float u_ghostTime;
uniform float u_cursorSpeed;
uniform float u_flowDir;

// Phase B: Mode-specific parameters
uniform float u_gridLineWidth;       // Mode 0: line thickness
uniform float u_gridFillAmount;      // Mode 0: medium cell fill probability
uniform float u_gridCursorFills;     // Mode 0: fill density near cursor/ghosts
uniform float u_gridSubdivisionDepth; // Mode 0: BSP recursion depth (cell size)
uniform float u_gridSmallFills;      // Mode 0: small cell fill probability (0=none, 1=all)
uniform float u_shardCount;          // Mode 1
uniform float u_shardSpeed;          // Mode 1
uniform float u_shardChaos;          // Mode 1
uniform float u_flowDensity;         // Mode 2
uniform float u_flowWarp;            // Mode 2

varying vec2 v_uv;

// ----------------------------------------------------
// Hash helpers
// ----------------------------------------------------
float hash11(float p) { return fract(sin(p) * 43758.5453123); }

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

vec2 hash22(float p) {
  float x = hash11(p * 127.1 + 311.7);
  float y = hash11(p * 269.5 + 183.3);
  return vec2(x, y);
}

float dither01(vec2 p) { return hash21(p) - 0.5; }

float smooth01(float x) { x = clamp(x, 0.0, 1.0); return x * x * (3.0 - 2.0 * x); }

// ----------------------------------------------------
// Cursor-position -> center weight (1 center, 0 edges)
// ----------------------------------------------------
float centerKFromCursor(vec2 cur) {
  vec2 d = cur - vec2(0.5);
  float dn = length(d) / 0.70710678;
  return 1.0 - smoothstep(0.15, 0.95, dn);
}

// ----------------------------------------------------
// Palette
// ----------------------------------------------------
vec3 beigeBG() { return vec3(242.0, 226.0, 209.0) / 255.0; } // #F2E2D1
vec3 ink()     { return vec3(0.03, 0.03, 0.03); }
vec3 cMag() { return vec3(136.0,  12.0,  80.0) / 255.0; }    // #880C50
vec3 cBlue(){ return vec3(117.0,  73.0, 167.0) / 255.0; }    // #7549A7
vec3 cRed() { return vec3( 17.0, 127.0,  42.0) / 255.0; }    // #117F2A
vec3 cYel() { return vec3(136.0,  12.0,  80.0) / 255.0;; }    // warm gold (readable on #F2E2D1)

// ----------------------------------------------------
// Distance to a line segment (for reveal / proximity)
// ----------------------------------------------------
float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

// ----------------------------------------------------
// Repel p away from q within radius rUV
// ----------------------------------------------------
vec2 repel(vec2 p, vec2 q, float rUV, float strength) {
  vec2 d = p - q;
  float dist = length(d) + 1e-5;
  float w = smooth01(1.0 - clamp(dist / max(rUV, 1e-5), 0.0, 1.0));
  return p + (d / dist) * (w * strength);
}

// ----------------------------------------------------
// dwell-ease: slows to near-stop at both ends
// ----------------------------------------------------
float dwellEase(float x, float dwell) {
  x = clamp(x, 0.0, 1.0);
  float t = (x - dwell) / max(1.0 - 2.0 * dwell, 1e-6);
  t = clamp(t, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  t = t * t * (3.0 - 2.0 * t);
  return t;
}

// waypoint hop: each ghost moves between seeded points with dwell at ends
vec2 ghostHopPos(float time, float seed, float period, float dwell, vec2 padMin, vec2 padMax) {
  float k  = floor(time / period);
  float ph = fract(time / period);

  vec2 A = mix(padMin, padMax, hash22(seed + k * 19.13 + 1.7));
  vec2 B = mix(padMin, padMax, hash22(seed + (k + 1.0) * 19.13 + 1.7));

  float t = dwellEase(ph, dwell);
  return mix(A, B, t);
}

// ---- macro-line builder (approx top-level BSP lines, global) ----
void macroLines(out vec4 xL, out vec4 yL) {
  xL = vec4(-1.0);
  yL = vec4(-1.0);

  float seed = 101.37;
  float PHI  = 0.61803398875;

  vec4 r0 = vec4(0.0, 0.0, 1.0, 1.0);

  // Level 0
  float lvl = 0.0;
  float rAxis = hash11(seed + lvl *  9.31 + 1.27);
  float rRat  = hash11(seed + lvl *  7.77 + 4.41);

  float pick = step(0.5, rRat);
  float phiRatio = mix(1.0 - PHI, PHI, pick);
  float dev = (hash11(seed + lvl * 5.91 + 8.13) - 0.5) * 0.06;
  float ratio = clamp(phiRatio + dev, 0.20, 0.80);

  float splitX = mix(1.0, 0.0, step(0.70, rAxis));

  vec4 a0, b0;
  if (splitX > 0.5) {
    float s = mix(r0.x, r0.z, ratio);
    xL.x = s;
    a0 = vec4(r0.x, r0.y, s,    r0.w);
    b0 = vec4(s,    r0.y, r0.z, r0.w);
  } else {
    float s = mix(r0.y, r0.w, ratio);
    yL.x = s;
    a0 = vec4(r0.x, r0.y, r0.z, s);
    b0 = vec4(r0.x, s,    r0.z, r0.w);
  }

  // Level 1 (one split in each child)
  lvl = 1.0;

  float rAxisA = hash11(seed + lvl *  9.31 + 1.27 + 11.0);
  float rRatA  = hash11(seed + lvl *  7.77 + 4.41 + 11.0);

  vec2 szA = a0.zw - a0.xy;
  float preferXA = step(szA.y, szA.x);
  float splitXA  = mix(preferXA, 1.0 - preferXA, step(0.70, rAxisA));
  float ratioA   = clamp(mix(0.40, 0.60, rRatA), 0.20, 0.80);

  if (splitXA > 0.5) xL.y = mix(a0.x, a0.z, ratioA);
  else               yL.y = mix(a0.y, a0.w, ratioA);

  float rAxisB = hash11(seed + lvl *  9.31 + 1.27 + 29.0);
  float rRatB  = hash11(seed + lvl *  7.77 + 4.41 + 29.0);

  vec2 szB = b0.zw - b0.xy;
  float preferXB = step(szB.y, szB.x);
  float splitXB  = mix(preferXB, 1.0 - preferXB, step(0.70, rAxisB));
  float ratioB   = clamp(mix(0.40, 0.60, rRatB), 0.20, 0.80);

  if (splitXB > 0.5) xL.z = mix(b0.x, b0.z, ratioB);
  else               yL.z = mix(b0.y, b0.w, ratioB);
}

// nearest valid entry in vec4 (skips <0)
float nearestLine(float v, vec4 L) {
  float best = 1e9;
  float outv = -1.0;

  float d0 = (L.x > 0.0) ? abs(v - L.x) : 1e9;
  float d1 = (L.y > 0.0) ? abs(v - L.y) : 1e9;
  float d2 = (L.z > 0.0) ? abs(v - L.z) : 1e9;
  float d3 = (L.w > 0.0) ? abs(v - L.w) : 1e9;

  best = d0; outv = L.x;
  if (d1 < best) { best = d1; outv = L.y; }
  if (d2 < best) { best = d2; outv = L.z; }
  if (d3 < best) { best = d3; outv = L.w; }

  return outv;
}

// ----------------------------------------------------
// MODE 2 helpers: flowField + stripes + pulse
// ----------------------------------------------------

// smooth-ish 2D noise (value noise)
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// returns vec3(dir.xy, magnitude)
vec3 flowField(vec2 p, float t, float scale, float warp) {
  vec2 q = p * scale;

  float n1 = vnoise(q + vec2(0.0, t * 0.20));
  float n2 = vnoise(q + vec2(13.7, -t * 0.17));
  vec2  w  = (vec2(n1, n2) - 0.5) * warp;
  q += w;

  float e = 0.35; // bigger = cheaper/smoother
  float a = vnoise(q + vec2(e, 0.0));
  float b = vnoise(q - vec2(e, 0.0));
  float c = vnoise(q + vec2(0.0, e));
  float d = vnoise(q - vec2(0.0, e));

  vec2 grad = vec2(a - b, c - d);
  vec2 v = vec2(-grad.y, grad.x);

  float m = length(v);
  v = v / max(m, 1e-4);

  float ph = 6.2831853 * vnoise(q * 0.33 + t * 0.07);
  v = normalize(mix(v, vec2(cos(ph), sin(ph)), 0.12));

  return vec3(v, m);
}

// anti-aliased stripe family along 1D coordinate x
float stripeLines(float x, float freq, float halfWidthUV, float aaUV) {
  float v = fract(x * freq);
  float d = abs(v - 0.5);
  float w = halfWidthUV * freq;
  float a = aaUV * freq * 1.25;
  return 1.0 - smoothstep(w, w + a, d);
}

// sparse pulse per cell, occasionally turns on and breathes
float rarePulse(vec2 cellID, float t) {
  float r = hash21(cellID + vec2(4.2, 7.9));
  float alive = step(0.92, r); // ~8%
  float spd   = mix(0.35, 0.85, hash21(cellID + vec2(1.1, 9.3)));
  float ph    = hash21(cellID + vec2(8.7, 2.6)) * 6.2831853;
  float s     = sin(t * spd + ph) * 0.5 + 0.5;
  s = s * s * (3.0 - 2.0 * s);
  float gate = step(0.65, sin(t * (0.07 + 0.11 * spd) + ph));
  return alive * s * gate;
}

// ----------------------------------------------------
// Reveal for a split segment
// ----------------------------------------------------
float revealForSegment(vec2 p, vec2 a, vec2 b, float pxUnit) {
  vec2 cur = clamp(u_mouse, 0.0, 1.0);

  float heroK = smoothstep(0.70, 0.95, u_spatialMotion);
  float centerK = centerKFromCursor(cur);

  float baseRpx = mix(260.0, 150.0, heroK);

  float readK = 1.0 - smoothstep(0.12, 0.18, u_temporalMotion);
  baseRpx *= mix(1.0, 0.28, readK);

  float softPx = mix(28.0, 55.0, heroK);
  float softUV = softPx * pxUnit;

  float rCur = baseRpx * pxUnit;

  // HERO ghosts
  float t = u_ghostTime;

  vec2 padMin = vec2(0.14, 0.14);
  vec2 padMax = vec2(0.86, 0.86);
  float dwell = 0.28;

  vec2 g1 = ghostHopPos(t, 17.7, 6.8, dwell, padMin, padMax);
  vec2 g2 = ghostHopPos(t, 33.3, 7.6, dwell, padMin, padMax);
  vec2 g3 = ghostHopPos(t, 51.1, 8.4, dwell, padMin, padMax);
  vec2 g4 = ghostHopPos(t, 68.2, 5.9, dwell, padMin, padMax);
  vec2 g5 = ghostHopPos(t, 84.6, 9.2, dwell, padMin, padMax);
  vec2 g6 = ghostHopPos(t, 97.9, 7.1, dwell, padMin, padMax);

  float p1 = 0.5 + 0.5 * sin(t * 0.42 + 1.1);
  float p2 = 0.5 + 0.5 * sin(t * 0.36 + 2.7);
  float p3 = 0.5 + 0.5 * sin(t * 0.48 + 4.2);
  float p4 = 0.5 + 0.5 * sin(t * 0.40 + 0.6);
  float p5 = 0.5 + 0.5 * sin(t * 0.33 + 5.1);
  float p6 = 0.5 + 0.5 * sin(t * 0.46 + 3.3);

  float r1 = (baseRpx * mix(0.46, 0.76, p1)) * pxUnit;
  float r2 = (baseRpx * mix(0.50, 0.83, p2)) * pxUnit;
  float r3 = (baseRpx * mix(0.54, 0.97, p3)) * pxUnit;
  float r4 = (baseRpx * mix(0.44, 0.72, p4)) * pxUnit;
  float r5 = (baseRpx * mix(0.48, 0.86, p5)) * pxUnit;
  float r6 = (baseRpx * mix(0.52, 0.92, p6)) * pxUnit;

  float s12 = mix(1.0, 0.70, centerK);
  float s3  = mix(1.0, 1.25, centerK);
  r1 *= s12; r2 *= s12; r3 *= s3;

  // separation
  float sepUV = 0.42;
  float sepStrength = 0.070;

  for (int it = 0; it < 2; it++) {
    g1 = repel(g1, g2, sepUV, sepStrength * heroK);
    g1 = repel(g1, g3, sepUV, sepStrength * heroK);
    g1 = repel(g1, g4, sepUV, sepStrength * heroK);
    g1 = repel(g1, g5, sepUV, sepStrength * heroK);
    g1 = repel(g1, g6, sepUV, sepStrength * heroK);

    g2 = repel(g2, g1, sepUV, sepStrength * heroK);
    g2 = repel(g2, g3, sepUV, sepStrength * heroK);
    g2 = repel(g2, g4, sepUV, sepStrength * heroK);
    g2 = repel(g2, g5, sepUV, sepStrength * heroK);
    g2 = repel(g2, g6, sepUV, sepStrength * heroK);

    g3 = repel(g3, g1, sepUV, sepStrength * heroK);
    g3 = repel(g3, g2, sepUV, sepStrength * heroK);
    g3 = repel(g3, g4, sepUV, sepStrength * heroK);
    g3 = repel(g3, g5, sepUV, sepStrength * heroK);
    g3 = repel(g3, g6, sepUV, sepStrength * heroK);

    g4 = repel(g4, g1, sepUV, sepStrength * heroK);
    g4 = repel(g4, g2, sepUV, sepStrength * heroK);
    g4 = repel(g4, g3, sepUV, sepStrength * heroK);
    g4 = repel(g4, g5, sepUV, sepStrength * heroK);
    g4 = repel(g4, g6, sepUV, sepStrength * heroK);

    g5 = repel(g5, g1, sepUV, sepStrength * heroK);
    g5 = repel(g5, g2, sepUV, sepStrength * heroK);
    g5 = repel(g5, g3, sepUV, sepStrength * heroK);
    g5 = repel(g5, g4, sepUV, sepStrength * heroK);
    g5 = repel(g5, g6, sepUV, sepStrength * heroK);

    g6 = repel(g6, g1, sepUV, sepStrength * heroK);
    g6 = repel(g6, g2, sepUV, sepStrength * heroK);
    g6 = repel(g6, g3, sepUV, sepStrength * heroK);
    g6 = repel(g6, g4, sepUV, sepStrength * heroK);
    g6 = repel(g6, g5, sepUV, sepStrength * heroK);
  }

  // macro attraction
  vec4 xL, yL;
  macroLines(xL, yL);

  float LINE_ATTRACT_UV   = 0.085;
  float LINE_PULL         = 0.16;
  float INTERSECT_CHANCE  = 0.35;
  float INTERSECT_PULL    = 0.20;

  // helper macro for one ghost
  #define ATTRACT_G(G, SEED) { \
    float nx = nearestLine(G.x, xL); \
    float ny = nearestLine(G.y, yL); \
    float kx = (nx > 0.0) ? (1.0 - smoothstep(0.0, LINE_ATTRACT_UV, abs(G.x - nx))) : 0.0; \
    float ky = (ny > 0.0) ? (1.0 - smoothstep(0.0, LINE_ATTRACT_UV, abs(G.y - ny))) : 0.0; \
    float rr = hash11(SEED + floor(u_ghostTime * 0.25) * 9.1); \
    float useBoth = step(1.0 - INTERSECT_CHANCE, rr); \
    if (nx > 0.0) G.x = mix(G.x, nx, kx * LINE_PULL * (1.0 + useBoth * INTERSECT_PULL)); \
    if (ny > 0.0) G.y = mix(G.y, ny, ky * LINE_PULL * (1.0 + useBoth * INTERSECT_PULL)); \
  }

  ATTRACT_G(g1, 17.0)
  ATTRACT_G(g2, 33.0)
  ATTRACT_G(g3, 51.0)
  ATTRACT_G(g4, 68.0)
  ATTRACT_G(g5, 84.0)
  ATTRACT_G(g6, 97.0)

  #undef ATTRACT_G

  // cursor avoidance
  float maxR = max(r1, max(r2, max(r3, max(r4, max(r5, r6)))));
  float cursorAvoidUV = (rCur + maxR) * 2.10;
  float cursorAvoidStrength = 0.120;

  g1 = repel(g1, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g2 = repel(g2, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g3 = repel(g3, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g4 = repel(g4, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g5 = repel(g5, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g6 = repel(g6, cur, cursorAvoidUV, cursorAvoidStrength * heroK);

  // reveal
  float dSeg = sdSegment(cur, a, b);
  float cursorRevealBase = mix(step(dSeg, rCur), 1.0 - smoothstep(rCur, rCur + softUV, dSeg), heroK);
  float cursorReveal = cursorRevealBase * (1.0 - heroK); // HERO forces off

  float dSeg1 = sdSegment(g1, a, b);
  float dSeg2 = sdSegment(g2, a, b);
  float dSeg3 = sdSegment(g3, a, b);
  float dSeg4 = sdSegment(g4, a, b);
  float dSeg5 = sdSegment(g5, a, b);
  float dSeg6 = sdSegment(g6, a, b);

  float ghostsReveal =
    max(step(dSeg1, r1),
    max(step(dSeg2, r2),
    max(step(dSeg3, r3),
    max(step(dSeg4, r4),
    max(step(dSeg5, r5),
        step(dSeg6, r6)))))) * heroK;

  float cursorOn = (u_cursorEnabled > 0.5) ? 1.0 : 0.0;
  float combined = max(cursorReveal, ghostsReveal);
  float revealed = mix(1.0, combined, cursorOn);

  return clamp(revealed, 0.0, 1.0);
}

// Optimized version: takes pre-computed ghost positions and radii
float revealForSegmentCached(
  vec2 p, vec2 a, vec2 b, 
  vec2 cur, float rCur, float softUV, float heroK,
  vec2 g1, vec2 g2, vec2 g3, vec2 g4, vec2 g5, vec2 g6,
  float r1, float r2, float r3, float r4, float r5, float r6
) {
  // reveal
  float dSeg = sdSegment(cur, a, b);
  float cursorRevealBase = mix(step(dSeg, rCur), 1.0 - smoothstep(rCur, rCur + softUV, dSeg), heroK);
  float cursorReveal = cursorRevealBase * (1.0 - heroK); // HERO forces off

  float dSeg1 = sdSegment(g1, a, b);
  float dSeg2 = sdSegment(g2, a, b);
  float dSeg3 = sdSegment(g3, a, b);
  float dSeg4 = sdSegment(g4, a, b);
  float dSeg5 = sdSegment(g5, a, b);
  float dSeg6 = sdSegment(g6, a, b);

  float ghostsReveal =
    max(step(dSeg1, r1),
    max(step(dSeg2, r2),
    max(step(dSeg3, r3),
    max(step(dSeg4, r4),
    max(step(dSeg5, r5),
        step(dSeg6, r6)))))) * heroK;

  float cursorOn = (u_cursorEnabled > 0.5) ? 1.0 : 0.0;
  float combined = max(cursorReveal, ghostsReveal);
  float revealed = mix(1.0, combined, cursorOn);

  return clamp(revealed, 0.0, 1.0);
}

// ----------------------------------------------------
// Uniform line mask (same width everywhere)
// ----------------------------------------------------
float lineMask1D(float distToLine, float halfWidthUV, float aaUV) {
  return 1.0 - smoothstep(halfWidthUV, halfWidthUV + aaUV, distToLine);
}

// ----------------------------------------------------
// Helpers for MODE 1 — Vector Glitch Map
// ----------------------------------------------------
mat2 rot2(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float sdIrregularConvexPoly(vec2 p, int N, float seed, float baseR) {
  float d = -1e6;
  float ang0 = 6.2831853 * hash11(seed + 1.1);
  float jitter = mix(0.10, 0.55, hash11(seed + 2.2));

  for (int i = 0; i < 8; i++) {
    if (i >= N) break;
    float fi = float(i);
    float tt  = (fi + 0.5) / float(N);

    float a = ang0 + 6.2831853 * tt
            + (hash11(seed + 10.0 + fi * 3.7) - 0.5) * jitter;

    vec2 n = vec2(cos(a), sin(a));
    float r = baseR * mix(0.55, 1.05, hash11(seed + 30.0 + fi * 5.1));
    d = max(d, dot(p, n) - r);
  }
  return d;
}

float edgeMaskFromSDF(float sdf, float w, float aa) {
  return 1.0 - smoothstep(w, w + aa, abs(sdf));
}

float softCellFade(vec2 p, vec2 mn, vec2 mx, float fadeUV) {
  float dx = min(p.x - mn.x, mx.x - p.x);
  float dy = min(p.y - mn.y, mx.y - p.y);
  float d  = min(dx, dy);
  return smoothstep(0.0, fadeUV, d);
}

float distToNearestMacroRail(vec2 p, vec4 xL, vec4 yL) {
  float d = 1e9;
  if (xL.x > 0.0) d = min(d, abs(p.x - xL.x));
  if (xL.y > 0.0) d = min(d, abs(p.x - xL.y));
  if (xL.z > 0.0) d = min(d, abs(p.x - xL.z));
  if (xL.w > 0.0) d = min(d, abs(p.x - xL.w));

  if (yL.x > 0.0) d = min(d, abs(p.y - yL.x));
  if (yL.y > 0.0) d = min(d, abs(p.y - yL.y));
  if (yL.z > 0.0) d = min(d, abs(p.y - yL.z));
  if (yL.w > 0.0) d = min(d, abs(p.y - yL.w));

  return d;
}

// ----------------------------------------------------
// MODE 0 — Dense BSP layout + cursor/ghost reveal
// ----------------------------------------------------
vec3 glitchGrid(vec2 uvN) {
  vec3 bg  = beigeBG();
  vec3 col = bg;

  float pxUnit = 1.0 / max(min(u_resolution.x, u_resolution.y), 1.0);

  // Phase A: calm parameter integration
  float calmK = clamp(u_calm, 0.0, 1.0);

  // Phase B: Control subdivision depth dynamically
  // Range 0.3-1.5: lower = fewer/larger rectangles, higher = more/smaller rectangles
  float depthControl = clamp(u_gridSubdivisionDepth, 0.3, 1.5);
  
  const int MAX_L        = 10;
  const int EARLY_SPLITS = 4;
  // STOP_START: when early stopping begins (lower = stops earlier = larger cells)
  int STOP_START_BASE = 6;
  int STOP_START   = int(float(STOP_START_BASE) * depthControl);
  STOP_START = clamp(STOP_START, 3, 9);
  
  // STOP probabilities: higher = more likely to stop = larger cells
  float STOP_BASE        = 0.10 * (2.0 - depthControl);  // Inverse: lower depth = higher stop chance
  float STOP_SLOPE       = 0.12 * (2.0 - depthControl);

  float seed = 101.37;

  // Apply calm to line thickness (thinner lines when calm)
  // Phase B: Apply gridLineWidth multiplier
  float LINE_PX = 2.0 * mix(0.65, 1.0, calmK) * clamp(u_gridLineWidth, 0.5, 2.5);
  float halfW   = 0.5 * LINE_PX * pxUnit;
  float aa = max(pxUnit, fwidth(uvN.x) + fwidth(uvN.y)) * 0.9;

  vec2 p = clamp(uvN, 0.0, 1.0);

  vec2 bmin = vec2(0.0);
  vec2 bmax = vec2(1.0);

  float Lpos = 0.0, Rpos = 1.0, Bpos = 0.0, Tpos = 1.0;
  float Lrev = 1.0, Rrev = 1.0, Brev = 1.0, Trev = 1.0;
  float Llvl = -999.0, Rlvl = -999.0, Blvl = -999.0, Tlvl = -999.0;

  vec2 cur = clamp(u_mouse, 0.0, 1.0);
  float heroK  = smoothstep(0.70, 0.95, u_spatialMotion);
  float readK  = 1.0 - smoothstep(0.12, 0.18, u_temporalMotion);

  float readRadiusScale = mix(1.0, 0.28, readK);

  int ALWAYS_ON = 5;
  if (readK > 0.5) ALWAYS_ON = 3;
  if (heroK > 0.5) ALWAYS_ON = 9;
  ALWAYS_ON = clamp(ALWAYS_ON, 1, MAX_L);
  float aOn = float(ALWAYS_ON);

  // PRE-COMPUTE GHOST POSITIONS (once per pixel, not per BSP iteration)
  float centerK = centerKFromCursor(cur);
  float baseRpx = mix(260.0, 150.0, heroK);
  baseRpx *= readRadiusScale;
  float softPx = mix(28.0, 55.0, heroK);
  float softUV = softPx * pxUnit;
  float rCur = baseRpx * pxUnit;

  float t = u_ghostTime;
  vec2 padMin = vec2(0.14, 0.14);
  vec2 padMax = vec2(0.86, 0.86);
  float dwell = 0.28;

  vec2 g1 = ghostHopPos(t, 17.7, 6.8, dwell, padMin, padMax);
  vec2 g2 = ghostHopPos(t, 33.3, 7.6, dwell, padMin, padMax);
  vec2 g3 = ghostHopPos(t, 51.1, 8.4, dwell, padMin, padMax);
  vec2 g4 = ghostHopPos(t, 68.2, 5.9, dwell, padMin, padMax);
  vec2 g5 = ghostHopPos(t, 84.6, 9.2, dwell, padMin, padMax);
  vec2 g6 = ghostHopPos(t, 97.9, 7.1, dwell, padMin, padMax);

  float p1 = 0.5 + 0.5 * sin(t * 0.42 + 1.1);
  float p2 = 0.5 + 0.5 * sin(t * 0.36 + 2.7);
  float p3 = 0.5 + 0.5 * sin(t * 0.48 + 4.2);
  float p4 = 0.5 + 0.5 * sin(t * 0.40 + 0.6);
  float p5 = 0.5 + 0.5 * sin(t * 0.33 + 5.1);
  float p6 = 0.5 + 0.5 * sin(t * 0.46 + 3.3);

  float r1 = (baseRpx * mix(0.46, 0.76, p1)) * pxUnit;
  float r2 = (baseRpx * mix(0.50, 0.83, p2)) * pxUnit;
  float r3 = (baseRpx * mix(0.54, 0.97, p3)) * pxUnit;
  float r4 = (baseRpx * mix(0.44, 0.72, p4)) * pxUnit;
  float r5 = (baseRpx * mix(0.48, 0.86, p5)) * pxUnit;
  float r6 = (baseRpx * mix(0.52, 0.92, p6)) * pxUnit;

  float s12 = mix(1.0, 0.70, centerK);
  float s3  = mix(1.0, 1.25, centerK);
  r1 *= s12; r2 *= s12; r3 *= s3;

  // separation
  float sepUV = 0.42;
  float sepStrength = 0.070;

  for (int it = 0; it < 2; it++) {
    g1 = repel(g1, g2, sepUV, sepStrength * heroK);
    g1 = repel(g1, g3, sepUV, sepStrength * heroK);
    g1 = repel(g1, g4, sepUV, sepStrength * heroK);
    g1 = repel(g1, g5, sepUV, sepStrength * heroK);
    g1 = repel(g1, g6, sepUV, sepStrength * heroK);

    g2 = repel(g2, g1, sepUV, sepStrength * heroK);
    g2 = repel(g2, g3, sepUV, sepStrength * heroK);
    g2 = repel(g2, g4, sepUV, sepStrength * heroK);
    g2 = repel(g2, g5, sepUV, sepStrength * heroK);
    g2 = repel(g2, g6, sepUV, sepStrength * heroK);

    g3 = repel(g3, g1, sepUV, sepStrength * heroK);
    g3 = repel(g3, g2, sepUV, sepStrength * heroK);
    g3 = repel(g3, g4, sepUV, sepStrength * heroK);
    g3 = repel(g3, g5, sepUV, sepStrength * heroK);
    g3 = repel(g3, g6, sepUV, sepStrength * heroK);

    g4 = repel(g4, g1, sepUV, sepStrength * heroK);
    g4 = repel(g4, g2, sepUV, sepStrength * heroK);
    g4 = repel(g4, g3, sepUV, sepStrength * heroK);
    g4 = repel(g4, g5, sepUV, sepStrength * heroK);
    g4 = repel(g4, g6, sepUV, sepStrength * heroK);

    g5 = repel(g5, g1, sepUV, sepStrength * heroK);
    g5 = repel(g5, g2, sepUV, sepStrength * heroK);
    g5 = repel(g5, g3, sepUV, sepStrength * heroK);
    g5 = repel(g5, g4, sepUV, sepStrength * heroK);
    g5 = repel(g5, g6, sepUV, sepStrength * heroK);

    g6 = repel(g6, g1, sepUV, sepStrength * heroK);
    g6 = repel(g6, g2, sepUV, sepStrength * heroK);
    g6 = repel(g6, g3, sepUV, sepStrength * heroK);
    g6 = repel(g6, g4, sepUV, sepStrength * heroK);
    g6 = repel(g6, g5, sepUV, sepStrength * heroK);
  }

  // macro attraction
  vec4 xL, yL;
  macroLines(xL, yL);

  float LINE_ATTRACT_UV   = 0.085;
  float LINE_PULL         = 0.16;
  float INTERSECT_CHANCE  = 0.35;
  float INTERSECT_PULL    = 0.20;

  #define ATTRACT_G(G, SEED) { \
    float nx = nearestLine(G.x, xL); \
    float ny = nearestLine(G.y, yL); \
    float kx = (nx > 0.0) ? (1.0 - smoothstep(0.0, LINE_ATTRACT_UV, abs(G.x - nx))) : 0.0; \
    float ky = (ny > 0.0) ? (1.0 - smoothstep(0.0, LINE_ATTRACT_UV, abs(G.y - ny))) : 0.0; \
    float rr = hash11(SEED + floor(u_ghostTime * 0.25) * 9.1); \
    float useBoth = step(1.0 - INTERSECT_CHANCE, rr); \
    if (nx > 0.0) G.x = mix(G.x, nx, kx * LINE_PULL * (1.0 + useBoth * INTERSECT_PULL)); \
    if (ny > 0.0) G.y = mix(G.y, ny, ky * LINE_PULL * (1.0 + useBoth * INTERSECT_PULL)); \
  }

  ATTRACT_G(g1, 17.0)
  ATTRACT_G(g2, 33.0)
  ATTRACT_G(g3, 51.0)
  ATTRACT_G(g4, 68.0)
  ATTRACT_G(g5, 84.0)
  ATTRACT_G(g6, 97.0)

  #undef ATTRACT_G

  // cursor avoidance
  float maxR = max(r1, max(r2, max(r3, max(r4, max(r5, r6)))));
  float cursorAvoidUV = (rCur + maxR) * 2.10;
  float cursorAvoidStrength = 0.120;

  g1 = repel(g1, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g2 = repel(g2, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g3 = repel(g3, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g4 = repel(g4, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g5 = repel(g5, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g6 = repel(g6, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  // END GHOST PRE-COMPUTATION

  for (int i = 0; i < MAX_L; i++) {
    float lvl = float(i);

    float rStop = hash11(seed + lvl * 12.71 + 3.17);
    float rAxis = hash11(seed + lvl *  9.31 + 1.27);
    float rRat  = hash11(seed + lvl *  7.77 + 4.41);

    if (i >= STOP_START) {
      float stopProb = clamp(STOP_BASE + STOP_SLOPE * (lvl - float(STOP_START)), 0.0, 0.80);

      vec2 curSizeIter = bmax - bmin;
      float curAreaIter = curSizeIter.x * curSizeIter.y;
      
      // Skip tiny cells aggressively
      if (curAreaIter < 0.0015) break;

      float TARGET_MED_AREA = 0.080;
      float TARGET_BIG_AREA = 0.300;
      float medBand = 1.0 - smoothstep(TARGET_MED_AREA, TARGET_BIG_AREA, curAreaIter);

      float rMix = hash11(seed + lvl * 41.7 + floor((bmin.x + bmin.y) * 31.0) * 7.3);
      float MED_STOP_CHANCE = 0.55;
      float forceContinue = medBand * (1.0 - step(1.0 - MED_STOP_CHANCE, rMix));

      if (forceContinue < 0.5) {
        if (rStop < stopProb) break;
      }
    }

    vec2 curSize = bmax - bmin;
    float preferX = step(curSize.y, curSize.x);
    float flip    = step(0.70, rAxis);
    float splitX  = mix(preferX, 1.0 - preferX, flip);

    float baseRatio;
    if (i < EARLY_SPLITS) {
      float PHI  = 0.61803398875;
      float pick = step(0.5, rRat);
      float phiRatio = mix(1.0 - PHI, PHI, pick);
      float dev = (hash11(seed + lvl * 5.91 + 8.13) - 0.5) * 0.06;
      baseRatio = phiRatio + dev;
    } else {
      baseRatio = mix(0.40, 0.60, rRat);
    }

    float ratio = clamp(baseRatio, 0.20, 0.80);
    float splitPosX = mix(bmin.x, bmax.x, ratio);
    float splitPosY = mix(bmin.y, bmax.y, ratio);
    float splitPos  = mix(splitPosY, splitPosX, splitX);

    float segRev = 1.0;

    if (splitX > 0.5) {
      vec2 a = vec2(splitPos, bmin.y);
      vec2 b = vec2(splitPos, bmax.y);
      segRev = revealForSegmentCached(p, a, b, cur, rCur, softUV, heroK, g1, g2, g3, g4, g5, g6, r1, r2, r3, r4, r5, r6);
      if (i < ALWAYS_ON) segRev = 1.0;

      if (p.x < splitPos) {
        bmax.x = splitPos;
        Rpos = splitPos; Rrev = segRev; Rlvl = lvl;
      } else {
        bmin.x = splitPos;
        Lpos = splitPos; Lrev = segRev; Llvl = lvl;
      }
    } else {
      vec2 a = vec2(bmin.x, splitPos);
      vec2 b = vec2(bmax.x, splitPos);
      segRev = revealForSegmentCached(p, a, b, cur, rCur, softUV, heroK, g1, g2, g3, g4, g5, g6, r1, r2, r3, r4, r5, r6);
      if (i < ALWAYS_ON) segRev = 1.0;

      if (p.y < splitPos) {
        bmax.y = splitPos;
        Tpos = splitPos; Trev = segRev; Tlvl = lvl;
      } else {
        bmin.y = splitPos;
        Bpos = splitPos; Brev = segRev; Blvl = lvl;
      }
    }
  }

  vec2 size = bmax - bmin;
  float area = size.x * size.y;

  float minRev = min(min(Lrev, Rrev), min(Brev, Trev));
  float fullyBordered = step(0.999, minRev);

  float BORDER_T = 0.85;
  float bL = step(BORDER_T, Lrev);
  float bR = step(BORDER_T, Rrev);
  float bB = step(BORDER_T, Brev);
  float bT = step(BORDER_T, Trev);
  float borderCount = bL + bR + bB + bT;

  vec2 cellID = floor((bmin + bmax) * 97.0);
  float rFill = hash21(cellID + vec2(31.7, 9.2));

  // Simplified random fill control - applies to all cell sizes
  // gridSmallFills: 0=no random fills, 1=all cells filled
  float fillThreshold = clamp(u_gridSmallFills, 0.0, 1.0);
  
  // Require cells to have borders to be eligible for fill
  float canFill = step(2.5, borderCount);
  
  // Simple RNG check: if random value < threshold, fill it
  float fillRandom = canFill * step(rFill, fillThreshold);
  
  // Ghost-influenced fills: calculate direct distance to cursor/ghosts
  // This is independent of BSP reveal system and ALWAYS_ON forcing
  vec2 cellCenter = (bmin + bmax) * 0.5;
  vec2 cellSize = bmax - bmin;
  float cellRadius = length(cellSize) * 0.5;  // Half diagonal of cell
  
  // Separate cursor and ghost distances
  float dCur = max(0.0, length(cellCenter - cur) - cellRadius);
  float dG1 = max(0.0, length(cellCenter - g1) - cellRadius);
  float dG2 = max(0.0, length(cellCenter - g2) - cellRadius);
  float dG3 = max(0.0, length(cellCenter - g3) - cellRadius);
  float dG4 = max(0.0, length(cellCenter - g4) - cellRadius);
  float dG5 = max(0.0, length(cellCenter - g5) - cellRadius);
  float dG6 = max(0.0, length(cellCenter - g6) - cellRadius);
  
  // Cursor proximity (for AMBIENT mode only)
  float cursorProx = 1.0 - smoothstep(0.0, rCur, dCur);
  
  // Ghost proximity (for HERO mode only)
  float ghostProx = 0.0;
  ghostProx = max(ghostProx, 1.0 - smoothstep(0.0, r1, dG1));
  ghostProx = max(ghostProx, 1.0 - smoothstep(0.0, r2, dG2));
  ghostProx = max(ghostProx, 1.0 - smoothstep(0.0, r3, dG3));
  ghostProx = max(ghostProx, 1.0 - smoothstep(0.0, r4, dG4));
  ghostProx = max(ghostProx, 1.0 - smoothstep(0.0, r5, dG5));
  ghostProx = max(ghostProx, 1.0 - smoothstep(0.0, r6, dG6));
  
  // Mode-specific fills:
  // HERO (heroK > 0.5): Only ghosts fill, not cursor
  // AMBIENT (heroK < 0.5, readK < 0.5): Only cursor fills
  // READ (readK > 0.5): No proximity fills at all
  float cursorFill = step(0.6, cursorProx) * step(heroK, 0.5) * step(readK, 0.5);
  float ghostsFill = step(0.6, ghostProx) * step(0.5, heroK);
  float ghostFill = max(cursorFill, ghostsFill);
  
  // Combine: fill if random OR ghost-revealed
  float fillOn = max(fillRandom, ghostFill);
  
  float pick = hash21(cellID + vec2(4.1, 22.7));

  // Phase A: flowDir integration (directional color temperature shift)
  vec2 flowVec = vec2(cos(u_flowDir), sin(u_flowDir));
  vec2 cellC = 0.5 * (bmin + bmax);
  float flowBias = dot(normalize(cellC - 0.5), flowVec);
  float warmth = flowBias * 0.5 + 0.5;  // 0-1 range

  // Apply subtle temperature shift based on direction
  vec3 fillCol;
  if (pick < 0.34) fillCol = mix(cYel(), cBlue(), warmth * 0.15);
  else if (pick < 0.67) fillCol = mix(cBlue(), cYel(), warmth * 0.12);
  else fillCol = mix(cRed(), cMag(), warmth * 0.10);
  if (pick < 0.34) fillCol = cYel();
  else if (pick < 0.67) fillCol = cBlue();
  else fillCol = cRed();

  col = mix(col, fillCol, fillOn);

  // Gate logic: for borders beyond ALWAYS_ON level, allow reveals OR fills to open the gate
  float gateL = (Llvl < aOn) ? 1.0 : max(fillOn, Lrev);
  float gateR = (Rlvl < aOn) ? 1.0 : max(fillOn, Rrev);
  float gateB = (Blvl < aOn) ? 1.0 : max(fillOn, Brev);
  float gateT = (Tlvl < aOn) ? 1.0 : max(fillOn, Trev);

  gateL = mix(1.0, gateL, heroK);
  gateR = mix(1.0, gateR, heroK);
  gateB = mix(1.0, gateB, heroK);
  gateT = mix(1.0, gateT, heroK);

  float dL = abs(p.x - Lpos);
  float dR = abs(p.x - Rpos);
  float dB = abs(p.y - Bpos);
  float dT = abs(p.y - Tpos);

  float Ldraw = max(Lrev, fillOn);
  float Rdraw = max(Rrev, fillOn);
  float Bdraw = max(Brev, fillOn);
  float Tdraw = max(Trev, fillOn);

  float mL = lineMask1D(dL, halfW, aa) * Ldraw * gateL;
  float mR = lineMask1D(dR, halfW, aa) * Rdraw * gateR;
  float mB = lineMask1D(dB, halfW, aa) * Bdraw * gateB;
  float mT = lineMask1D(dT, halfW, aa) * Tdraw * gateT;

  float borderMask = max(max(mL, mR), max(mB, mT));
  col = mix(col, ink(), clamp(borderMask, 0.0, 1.0));

  float dd = dither01(gl_FragCoord.xy + vec2(19.7, 73.3));
  col += dd * (1.0 / 255.0) * 0.65;

  return clamp(col, 0.0, 1.0);
}

// ----------------------------------------------------
// MODE 1 — Vector Glitch Map (broken-glass shards)
// ----------------------------------------------------
vec3 vectorGlitchMap(vec2 uvN) {
  vec3 col = beigeBG();

  float pxUnit = 1.0 / max(min(u_resolution.x, u_resolution.y), 1.0);
  float aa = max(pxUnit, fwidth(uvN.x) + fwidth(uvN.y)) * 0.9;

  vec2 p = clamp(uvN, 0.0, 1.0);

  vec2 cur = clamp(u_mouse, 0.0, 1.0);
  float heroK = smoothstep(0.70, 0.95, u_spatialMotion);
  float readK = 1.0 - smoothstep(0.12, 0.18, u_temporalMotion);
  float ambientK = 1.0 - readK;

  // Phase A: calm parameter integration
  float calmK = clamp(u_calm, 0.0, 1.0);

  // BSP traversal (same backbone as Mode 0)
  const int MAX_L        = 10;
  const int EARLY_SPLITS = 4;
  const int STOP_START   = 6;

  float STOP_BASE  = 0.10;
  float STOP_SLOPE = 0.12;

  float PHI  = 0.61803398875;
  float seed = 101.37;

  vec2 bmin = vec2(0.0);
  vec2 bmax = vec2(1.0);

  float Lrev = 1.0, Rrev = 1.0, Brev = 1.0, Trev = 1.0;
  float Llvl = -999.0, Rlvl = -999.0, Blvl = -999.0, Tlvl = -999.0;
  float Lpos = 0.0,  Rpos = 1.0,  Bpos = 0.0,  Tpos = 1.0;

  int ALWAYS_ON = 5;
  if (readK > 0.5) ALWAYS_ON = 3;
  if (heroK > 0.5) ALWAYS_ON = 9;
  ALWAYS_ON = clamp(ALWAYS_ON, 1, MAX_L);

  // PRE-COMPUTE GHOST POSITIONS (once per pixel, not per BSP iteration)
  float centerK = centerKFromCursor(cur);
  float baseRpx = mix(260.0, 150.0, heroK);
  float readRadiusScale = mix(1.0, 0.28, readK);
  baseRpx *= readRadiusScale;
  float softPx = mix(28.0, 55.0, heroK);
  float softUV = softPx * pxUnit;
  float rCur = baseRpx * pxUnit;

  float t = u_ghostTime;
  vec2 padMin = vec2(0.14, 0.14);
  vec2 padMax = vec2(0.86, 0.86);
  float dwell = 0.28;

  vec2 g1 = ghostHopPos(t, 17.7, 6.8, dwell, padMin, padMax);
  vec2 g2 = ghostHopPos(t, 33.3, 7.6, dwell, padMin, padMax);
  vec2 g3 = ghostHopPos(t, 51.1, 8.4, dwell, padMin, padMax);
  vec2 g4 = ghostHopPos(t, 68.2, 5.9, dwell, padMin, padMax);
  vec2 g5 = ghostHopPos(t, 84.6, 9.2, dwell, padMin, padMax);
  vec2 g6 = ghostHopPos(t, 97.9, 7.1, dwell, padMin, padMax);

  float p1 = 0.5 + 0.5 * sin(t * 0.42 + 1.1);
  float p2 = 0.5 + 0.5 * sin(t * 0.36 + 2.7);
  float p3 = 0.5 + 0.5 * sin(t * 0.48 + 4.2);
  float p4 = 0.5 + 0.5 * sin(t * 0.40 + 0.6);
  float p5 = 0.5 + 0.5 * sin(t * 0.33 + 5.1);
  float p6 = 0.5 + 0.5 * sin(t * 0.46 + 3.3);

  float r1 = (baseRpx * mix(0.46, 0.76, p1)) * pxUnit;
  float r2 = (baseRpx * mix(0.50, 0.83, p2)) * pxUnit;
  float r3 = (baseRpx * mix(0.54, 0.97, p3)) * pxUnit;
  float r4 = (baseRpx * mix(0.44, 0.72, p4)) * pxUnit;
  float r5 = (baseRpx * mix(0.48, 0.86, p5)) * pxUnit;
  float r6 = (baseRpx * mix(0.52, 0.92, p6)) * pxUnit;

  float s12 = mix(1.0, 0.70, centerK);
  float s3  = mix(1.0, 1.25, centerK);
  r1 *= s12; r2 *= s12; r3 *= s3;

  float sepUV = 0.42;
  float sepStrength = 0.070;

  for (int it = 0; it < 2; it++) {
    g1 = repel(g1, g2, sepUV, sepStrength * heroK);
    g1 = repel(g1, g3, sepUV, sepStrength * heroK);
    g1 = repel(g1, g4, sepUV, sepStrength * heroK);
    g1 = repel(g1, g5, sepUV, sepStrength * heroK);
    g1 = repel(g1, g6, sepUV, sepStrength * heroK);

    g2 = repel(g2, g1, sepUV, sepStrength * heroK);
    g2 = repel(g2, g3, sepUV, sepStrength * heroK);
    g2 = repel(g2, g4, sepUV, sepStrength * heroK);
    g2 = repel(g2, g5, sepUV, sepStrength * heroK);
    g2 = repel(g2, g6, sepUV, sepStrength * heroK);

    g3 = repel(g3, g1, sepUV, sepStrength * heroK);
    g3 = repel(g3, g2, sepUV, sepStrength * heroK);
    g3 = repel(g3, g4, sepUV, sepStrength * heroK);
    g3 = repel(g3, g5, sepUV, sepStrength * heroK);
    g3 = repel(g3, g6, sepUV, sepStrength * heroK);

    g4 = repel(g4, g1, sepUV, sepStrength * heroK);
    g4 = repel(g4, g2, sepUV, sepStrength * heroK);
    g4 = repel(g4, g3, sepUV, sepStrength * heroK);
    g4 = repel(g4, g5, sepUV, sepStrength * heroK);
    g4 = repel(g4, g6, sepUV, sepStrength * heroK);

    g5 = repel(g5, g1, sepUV, sepStrength * heroK);
    g5 = repel(g5, g2, sepUV, sepStrength * heroK);
    g5 = repel(g5, g3, sepUV, sepStrength * heroK);
    g5 = repel(g5, g4, sepUV, sepStrength * heroK);
    g5 = repel(g5, g6, sepUV, sepStrength * heroK);

    g6 = repel(g6, g1, sepUV, sepStrength * heroK);
    g6 = repel(g6, g2, sepUV, sepStrength * heroK);
    g6 = repel(g6, g3, sepUV, sepStrength * heroK);
    g6 = repel(g6, g4, sepUV, sepStrength * heroK);
    g6 = repel(g6, g5, sepUV, sepStrength * heroK);
  }

  vec4 xL, yL;
  macroLines(xL, yL);

  float LINE_ATTRACT_UV   = 0.085;
  float LINE_PULL         = 0.16;
  float INTERSECT_CHANCE  = 0.35;
  float INTERSECT_PULL    = 0.20;

  #define ATTRACT_G(G, SEED) { \
    float nx = nearestLine(G.x, xL); \
    float ny = nearestLine(G.y, yL); \
    float kx = (nx > 0.0) ? (1.0 - smoothstep(0.0, LINE_ATTRACT_UV, abs(G.x - nx))) : 0.0; \
    float ky = (ny > 0.0) ? (1.0 - smoothstep(0.0, LINE_ATTRACT_UV, abs(G.y - ny))) : 0.0; \
    float rr = hash11(SEED + floor(u_ghostTime * 0.25) * 9.1); \
    float useBoth = step(1.0 - INTERSECT_CHANCE, rr); \
    if (nx > 0.0) G.x = mix(G.x, nx, kx * LINE_PULL * (1.0 + useBoth * INTERSECT_PULL)); \
    if (ny > 0.0) G.y = mix(G.y, ny, ky * LINE_PULL * (1.0 + useBoth * INTERSECT_PULL)); \
  }

  ATTRACT_G(g1, 17.0)
  ATTRACT_G(g2, 33.0)
  ATTRACT_G(g3, 51.0)
  ATTRACT_G(g4, 68.0)
  ATTRACT_G(g5, 84.0)
  ATTRACT_G(g6, 97.0)

  #undef ATTRACT_G

  float maxR = max(r1, max(r2, max(r3, max(r4, max(r5, r6)))));
  float cursorAvoidUV = (rCur + maxR) * 2.10;
  float cursorAvoidStrength = 0.120;

  g1 = repel(g1, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g2 = repel(g2, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g3 = repel(g3, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g4 = repel(g4, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g5 = repel(g5, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  g6 = repel(g6, cur, cursorAvoidUV, cursorAvoidStrength * heroK);
  // END GHOST PRE-COMPUTATION

  for (int i = 0; i < MAX_L; i++) {
    float lvl = float(i);

    float rStop = hash11(seed + lvl * 12.71 + 3.17);
    float rAxis = hash11(seed + lvl *  9.31 + 1.27);
    float rRat  = hash11(seed + lvl *  7.77 + 4.41);

    if (i >= STOP_START) {
      float stopProb = clamp(STOP_BASE + STOP_SLOPE * (lvl - float(STOP_START)), 0.0, 0.80);

      vec2 curSizeIter = bmax - bmin;
      float curAreaIter = curSizeIter.x * curSizeIter.y;

      float TARGET_MED_AREA = 0.080;
      float TARGET_BIG_AREA = 0.300;
      float medBand = 1.0 - smoothstep(TARGET_MED_AREA, TARGET_BIG_AREA, curAreaIter);

      float rMix = hash11(seed + lvl * 41.7 + floor((bmin.x + bmin.y) * 31.0) * 7.3);
      float MED_STOP_CHANCE = 0.55;
      float forceContinue = medBand * (1.0 - step(1.0 - MED_STOP_CHANCE, rMix));

      if (forceContinue < 0.5) {
        if (rStop < stopProb) break;
      }
    }

    vec2 curSize = bmax - bmin;
    float preferX = step(curSize.y, curSize.x);
    float flip    = step(0.70, rAxis);
    float splitX  = mix(preferX, 1.0 - preferX, flip);

    float baseRatio;
    if (i < EARLY_SPLITS) {
      float pick = step(0.5, rRat);
      float phiRatio = mix(1.0 - PHI, PHI, pick);
      float dev = (hash11(seed + lvl * 5.91 + 8.13) - 0.5) * 0.06;
      baseRatio = phiRatio + dev;
    } else {
      baseRatio = mix(0.40, 0.60, rRat);
    }

    float ratio = clamp(baseRatio, 0.20, 0.80);

    float splitPosX = mix(bmin.x, bmax.x, ratio);
    float splitPosY = mix(bmin.y, bmax.y, ratio);
    float splitPos  = mix(splitPosY, splitPosX, splitX);

    float segRev = 1.0;

    if (splitX > 0.5) {
      vec2 a = vec2(splitPos, bmin.y);
      vec2 b = vec2(splitPos, bmax.y);
      segRev = revealForSegmentCached(p, a, b, cur, rCur, softUV, heroK, g1, g2, g3, g4, g5, g6, r1, r2, r3, r4, r5, r6);
      if (i < ALWAYS_ON) segRev = 1.0;

      if (p.x < splitPos) { bmax.x = splitPos; Rpos = splitPos; Rrev = segRev; Rlvl = lvl; }
      else                { bmin.x = splitPos; Lpos = splitPos; Lrev = segRev; Llvl = lvl; }
    } else {
      vec2 a = vec2(bmin.x, splitPos);
      vec2 b = vec2(bmax.x, splitPos);
      segRev = revealForSegmentCached(p, a, b, cur, rCur, softUV, heroK, g1, g2, g3, g4, g5, g6, r1, r2, r3, r4, r5, r6);
      if (i < ALWAYS_ON) segRev = 1.0;

      if (p.y < splitPos) { bmax.y = splitPos; Tpos = splitPos; Trev = segRev; Tlvl = lvl; }
      else                { bmin.y = splitPos; Bpos = splitPos; Brev = segRev; Blvl = lvl; }
    }
  }

  vec2 size = max(bmax - bmin, vec2(1e-5));
  float area = size.x * size.y;
  vec2 c = 0.5 * (bmin + bmax);

  float minRev = min(min(Lrev, Rrev), min(Brev, Trev));
  float revealK = smoothstep(0.35, 0.95, minRev);

  float cellFade = softCellFade(p, bmin, bmax, 18.0 * pxUnit);

  vec2 cellID = floor((bmin + bmax) * 97.0);
  float r0 = hash21(cellID + vec2(10.1, 3.7));

  float dC = distance(c, cur);
  float proxR0 = mix(0.09, 0.06, readK);
  float proxR1 = mix(0.30, 0.18, readK);
  float prox = 1.0 - smoothstep(proxR0, proxR1, dC);
  prox *= (1.0 - 0.25 * smoothstep(0.25, 0.55, area));

  float s = max(min(size.x, size.y), 1e-5);
  vec2 q0 = (p - c) / s;

  int SHARDS = 2;
  if (prox > 0.03) SHARDS = 6;
  if (prox > 0.18) SHARDS = 8;
  if (heroK > 0.5) SHARDS = 6;
  SHARDS = clamp(SHARDS, 2, 8);
  
  // Apply calm to reduce shard count (calmer = fewer shards)
  // Phase B: Apply shardCount multiplier
  int shardMult = int(mix(0.65, 1.0, 1.0 - calmK) * float(SHARDS) * clamp(u_shardCount, 0.3, 2.0));
  SHARDS = clamp(shardMult, 2, 8);

  vec3 outCol = col;

  for (int si = 0; si < 8; si++) {
    if (si >= SHARDS) break;

    float sSeed = r0 * 1000.0 + float(si) * 91.7 + 17.0;
    vec2 o = (hash22(sSeed + 13.7) - 0.5) * (0.18 + 0.24 * prox);

    // Phase A: flowDir integration (directional phase offset)
    vec2 flowVec = vec2(cos(u_flowDir), sin(u_flowDir));
    vec2 cellC2 = 0.5 * (bmin + bmax);
    float flowPhaseOffset = dot(cellC2 - 0.5, flowVec) * 2.0;

    // Apply calm to slow down wobble animation
    // Phase B: Apply shardSpeed multiplier
    float ph = u_time * 0.40 * mix(0.35, 1.0, 1.0 - calmK) * clamp(u_shardSpeed, 0.0, 2.0) + flowPhaseOffset;
    float wob = (sin(ph) * 0.5 + 0.5);
    float z = 1.0 + prox * (0.35 + 0.45 * wob);

    // Apply calm to reduce rotation chaos
    // Phase B: Apply shardChaos multiplier
    float rotA = (hash11(sSeed + 5.0) - 0.5) * (0.80 * prox) * mix(0.40, 1.0, 1.0 - calmK) * clamp(u_shardChaos, 0.0, 2.0);
    float sc   = (1.0 + (hash11(sSeed + 8.0) - 0.5) * 0.18 * prox) * z;

    vec2 qq = q0 + o;
    qq = rot2(rotA) * (qq * sc);

    int N = 3 + int(floor(hash11(sSeed + 9.0) * 6.0));
    float baseR = mix(0.16, 0.40, hash11(sSeed + 11.0)) * mix(1.0, 0.78, float(si) / 7.0);

    float sdf = sdIrregularConvexPoly(qq, N, sSeed, baseR);

    float fill = 1.0 - smoothstep(0.0, aa / s, sdf);
    float edge = edgeMaskFromSDF(sdf, 0.010, aa / s);

    fill *= revealK * cellFade;
    edge *= revealK * cellFade;

    float pr = hash11(sSeed + 21.0);
    vec3 accent = (pr < 0.33) ? cBlue() : (pr < 0.66) ? cYel() : cRed();

    float colorBoost = smoothstep(0.02, 0.35, prox);
    colorBoost = mix(colorBoost, 1.0, readK * smoothstep(0.10, 0.55, prox));

    vec2 e = vec2(0.004, 0.0);
    float sx = sdIrregularConvexPoly(qq + e.xy, N, sSeed, baseR) - sdIrregularConvexPoly(qq - e.xy, N, sSeed, baseR);
    float sy = sdIrregularConvexPoly(qq + e.yx, N, sSeed, baseR) - sdIrregularConvexPoly(qq - e.yx, N, sSeed, baseR);
    vec3 nrm = normalize(vec3(sx, sy, 0.08));
    vec3 lgt = normalize(vec3(-0.35, 0.55, 0.75));
    float lit = clamp(dot(nrm, lgt) * 0.5 + 0.65, 0.0, 1.0);

    float alphaBase = mix(0.08, 0.22, ambientK);
    alphaBase = mix(alphaBase, 0.26, readK);
    alphaBase *= mix(0.35, 1.0, smoothstep(0.06, 0.32, prox));

    vec3 shardBase = mix(vec3(0.10), accent, 0.28 + 0.70 * colorBoost);
    shardBase *= lit;

    // Apply calm to slow down flicker
    // Phase B: Apply shardSpeed to flicker as well
    float tick = floor(u_time * mix(6.0, 12.0, pr) * mix(0.45, 1.0, 1.0 - calmK) * clamp(u_shardSpeed, 0.0, 2.0));
    float flick = step(0.70, hash11(tick + sSeed * 0.13));
    float popK = flick * smoothstep(0.06, 0.95, prox);

    vec3 popCol = vec3(accent.r, accent.g * 0.65, accent.b * 1.15);
    popCol = clamp(popCol, 0.0, 1.0);

    outCol = mix(outCol, shardBase, alphaBase * fill);
    outCol = mix(outCol, mix(vec3(0.08), accent, 0.45 + 0.45 * colorBoost), (alphaBase * 0.95) * edge);
    outCol = mix(outCol, popCol, (0.14 + 0.55 * prox) * popK * fill);
  }

  col = outCol;

  float dd = dither01(gl_FragCoord.xy + vec2(19.7, 73.3));
  col += dd * (1.0 / 255.0) * 0.65;

  return clamp(col, 0.0, 1.0);
}

// ----------------------------------------------------
// MODE 2 — Signal Flow / Field Lines (UPDATED)
// - removes straight macro-rail coloured lines entirely
// - puts colour/glow ON the curvy lines (visible in READ/AMBIENT)
// ----------------------------------------------------
vec3 signalFlow(vec2 uvN) {
  vec3 bg  = beigeBG();
  vec3 col = bg;

  float pxUnit = 1.0 / max(min(u_resolution.x, u_resolution.y), 1.0);
  float aa = max(pxUnit, fwidth(uvN.x) + fwidth(uvN.y)) * 1.1;

  vec2 p   = clamp(uvN, 0.0, 1.0);
  vec2 cur = clamp(u_mouse, 0.0, 1.0);

  float heroK = smoothstep(0.70, 0.95, u_spatialMotion);
  float readK = 1.0 - smoothstep(0.12, 0.18, u_temporalMotion);
  float calmK = clamp(u_calm, 0.0, 1.0);

  // Phase B: Apply flowDensity multiplier
  float density = mix(0.65, 1.35, heroK);
  density *= mix(0.80, 0.55, readK);
  density *= clamp(u_flowDensity, 0.4, 2.0);

  float scale = mix(3.2, 6.8, heroK);
  scale *= mix(0.85, 0.70, readK);

  float baseSpeed = mix(0.06, 0.28, u_temporalMotion);
  float speed = baseSpeed * mix(0.20, 1.0, 1.0 - calmK);
  speed *= mix(0.55, 1.15, heroK);

  // Phase B: Apply flowWarp multiplier
  float warp = mix(0.35, 0.85, heroK);
  warp *= mix(0.55, 1.0, 1.0 - 0.65 * readK);
  warp *= clamp(u_flowWarp, 0.0, 2.0);

  float t = u_time * speed;

  float cursorOn = (u_cursorEnabled > 0.5) ? 1.0 : 0.0;
  float dC = distance(p, cur);

  float bendR0 = mix(0.14, 0.22, heroK);
  bendR0 *= mix(0.75, 0.55, readK);
  float bend = (1.0 - smoothstep(0.0, bendR0, dC)) * cursorOn;

  vec2 q = p;

  if (bend > 0.0) {
    vec2 away = normalize(q - cur + vec2(1e-4));
    q += away * (bend * 0.010);
  }

  float stepLen = 0.030 * mix(0.85, 1.10, heroK);

  vec2 drift = vec2(cos(u_flowDir), sin(u_flowDir));
  float driftK = mix(0.06, 0.18, heroK) * mix(1.0, 0.55, readK);

  for (int i = 0; i < 5; i++) {
    vec3 f = flowField(q, t + float(i) * 0.17, scale, warp);
    vec2 v = f.xy;

    v = normalize(mix(v, drift, driftK));

    if (bend > 0.0) {
      vec2 away = normalize(q - cur + vec2(1e-4));
      v = normalize(mix(v, away, bend * 0.35));
    }

    q += v * stepLen;
  }

  // ------------------------------------------------
  // Line layers
  // ------------------------------------------------
  float freqA = 18.0 * density;
  float freqB = 10.0 * density;

  float thinW = (1.2 * pxUnit) * mix(1.0, 1.25, heroK);
  float midW  = (2.1 * pxUnit) * mix(1.0, 1.35, heroK);

  float la = stripeLines(q.y + 0.35 * q.x, freqA, thinW, aa);
  float lb = stripeLines(q.x - 0.25 * q.y, freqB, thinW, aa);

  float lp     = stripeLines(q.y, 7.5 * density, midW, aa);
  float lpHalo = stripeLines(q.y, 7.5 * density, midW * 3.2, aa * 1.6);

  float edge = min(min(p.x, 1.0 - p.x), min(p.y, 1.0 - p.y));
  float edgeFade = smoothstep(0.00, 0.18, edge);

  float aBg = mix(0.03, 0.070, heroK);
  aBg *= mix(0.55, 0.35, readK);
  aBg *= mix(1.0, 0.60, calmK);

  float aPrimary = mix(0.09, 0.180, heroK);
  aPrimary *= mix(0.55, 0.40, readK);
  aPrimary *= mix(1.0, 0.70, calmK);

  float aHalo = mix(0.020, 0.080, heroK);
  aHalo *= mix(0.55, 0.40, readK);      // keep halo visible in READ
  aHalo *= mix(1.0, 0.60, calmK);
  aHalo *= edgeFade;

  float linesBg   = clamp(0.65 * la + 0.55 * lb, 0.0, 1.0);
  float linesP    = clamp(lp, 0.0, 1.0);
  float linesHalo = clamp(lpHalo, 0.0, 1.0);

  // base halo + ink
  vec3 haloCol = cBlue();
  col = mix(col, haloCol, linesHalo * aHalo);
  col = mix(col, ink(), linesBg * aBg * edgeFade);
  col = mix(col, ink(), linesP  * aPrimary * edgeFade);

// ------------------------------------------------
// CHROMATIC PACKETS ON CURVY LINES (UPDATED: more saturated + more visible)
// Replace ONLY this section inside signalFlow() where you currently build packet/chroma.
// ------------------------------------------------

// --- packet basis (same as before) ---
float along = q.y * (7.5 * density);

float segFreq  = mix(10.0, 18.0, heroK);
segFreq       *= mix(1.25, 1.05, readK);

float segSpeed = mix(0.18, 0.55, heroK);
segSpeed      *= mix(0.75, 0.45, calmK);

float segWidth = mix(0.12, 0.22, heroK);
segWidth      *= mix(1.55, 1.20, readK);

float ph = along * segFreq - u_time * segSpeed;
float w  = fract(ph);

float packet = smoothstep(0.0, segWidth, w) * (1.0 - smoothstep(1.0 - segWidth, 1.0, w));

// organic irregularity
float jitter = vnoise(q * 1.2 + u_time * 0.05);
packet *= smoothstep(0.18, 0.92, jitter);

// --- choose saturated accent per region ---
vec2 cid = floor(p * (14.0 * density));
float pick = hash21(cid + vec2(2.7, 9.9));

// Use your actual brand primaries (more saturation than the old cBlue/cYel)
vec3 accCol =
  (pick < 0.33) ? cMag() :                       // #880C50 (strong)
  (pick < 0.66) ? vec3(0.46, 0.29, 0.65) :       // ~#7549A7
                 vec3(0.07, 0.50, 0.16);         // ~#117F2A

// “Bloom” is towards white but only a little (keeps saturation)
vec3 accGlow = mix(accCol, vec3(1.0), 0.18);

// --- visibility controls (the important part) ---
// 1) More alpha overall
float chromaA = mix(0.10, 0.24, heroK);          // was ~0.04..0.12
chromaA *= mix(1.10, 0.90, readK);               // don't crush READ
chromaA *= mix(1.00, 0.75, calmK);
chromaA *= edgeFade;

// 2) Stronger carrier so colour actually reads on thin lines
float lineCarrier = max(linesP, 0.85 * linesHalo); // was 0.65

// 3) Boost packet density in READ/AMBIENT by widening a touch + adding a second packet lane
float packet2 = smoothstep(0.0, segWidth * 0.85, fract(ph + 0.37))
              * (1.0 - smoothstep(1.0 - segWidth * 0.85, 1.0, fract(ph + 0.37)));
packet2 *= smoothstep(0.22, 0.90, vnoise(q * 1.35 + u_time * 0.043 + 7.3));

packet = clamp(max(packet, 0.75 * packet2), 0.0, 1.0);

// 4) Cheap “glow”: stack 2 halos + a core
float glowA1 = chromaA * 0.95;
float glowA2 = chromaA * 0.55;
float coreA  = chromaA * 1.15;

// extra halo width by borrowing the halo mask (no new stripeLines call)
float softCarrier = max(linesHalo, 0.35 * linesP);

// --- composite: glow then core ---
col = mix(col, accGlow, softCarrier * glowA2 * packet);
col = mix(col, accGlow, softCarrier * glowA1 * packet);
col = mix(col, accCol,  lineCarrier * coreA  * packet);

  // ------------------------------------------------
  // Rare accent pulses (optional extra sparkle)
  // ------------------------------------------------
  vec2 id = floor(p * (12.0 * density));
  float pulse = rarePulse(id, u_time);

  float pick2 = hash21(id + vec2(2.7, 9.9));
  vec3 accCol2 = (pick2 < 0.33) ? cBlue() : (pick2 < 0.66) ? cYel() : cMag();

  float accA = (0.020 + 0.060 * heroK) * pulse;
  accA *= mix(0.70, 0.45, readK);
  accA *= edgeFade;

  col = mix(col, accCol2, max(linesP, 0.6 * linesHalo) * accA);

  // dither
  float dd = dither01(gl_FragCoord.xy + vec2(19.7, 73.3));
  col += dd * (1.0 / 255.0) * 0.65;

  return clamp(col, 0.0, 1.0);
}

void main() {
  vec2 uvN = v_uv;
  vec3 col;

  // Compute blend weights for smooth transitions
  float m0 = 1.0 - smoothstep(0.35, 0.90, abs(u_mode - 0.0));
  float m1 = 1.0 - smoothstep(0.35, 0.90, abs(u_mode - 1.0));
  float m2 = 1.0 - smoothstep(0.35, 0.90, abs(u_mode - 2.0));

  // Branch: execute only modes with non-zero weight
  // This preserves smooth transitions while avoiding redundant computation
  if (m0 > 0.001) {
    vec3 col0 = glitchGrid(uvN);
    if (m1 > 0.001 || m2 > 0.001) {
      // Transition: blend with second mode
      float sum = m0 + m1 + m2;
      if (m1 > 0.001) {
        vec3 col1 = vectorGlitchMap(uvN);
        col = (col0 * m0 + col1 * m1) / sum;
      } else {
        vec3 col2 = signalFlow(uvN);
        col = (col0 * m0 + col2 * m2) / sum;
      }
    } else {
      col = col0; // Mode 0 fully active
    }
  } else if (m1 > 0.001) {
    vec3 col1 = vectorGlitchMap(uvN);
    if (m2 > 0.001) {
      // Transition between mode 1 and 2
      float sum = m1 + m2;
      vec3 col2 = signalFlow(uvN);
      col = (col1 * m1 + col2 * m2) / sum;
    } else {
      col = col1; // Mode 1 fully active
    }
  } else {
    col = signalFlow(uvN); // Mode 2 fully active
  }

  col = pow(col, vec3(0.98));
  gl_FragColor = vec4(col, 1.0);
}
`;

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


window.BG3_SHADER_CONFIG = {
    modes: {
        'perlin-dot-field': 0.0,
        'kusama-infinite': 1.0,
        'octopus-legs': 2.0
    },
    presets: {
        READ: { spatial: 0.12, temporal: 0.06, cursor: 1.0, calm: 0.90 },
        AMBIENT: { spatial: 0.35, temporal: 0.18, cursor: 1.0, calm: 0.55 },
        HERO: { spatial: 0.95, temporal: 0.70, cursor: 1.0, calm: 0.10 },
    },

    blendVh: 1.0,
    transitionVh: 0.5,
    smoothSpeed: 2.0
};

window.BG3_FRAGMENT_SHADER = `
precision highp float;

// ------------------------------------------------------------
// Core uniforms
// ------------------------------------------------------------
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_time;
uniform float u_mode;

uniform float u_spatialMotion;
uniform float u_temporalMotion;
uniform float u_cursorEnabled;
uniform float u_calm;

// Adapter-owned uniforms (BG3_DotAdapter)
uniform float u_viewportWidth;  // CSS pixel width (DPR-independent)
uniform float u_paletteK;
uniform float u_seed;
uniform float u_cursorInfluence;
uniform float u_cursorSpeed;

// Kusama knobs
uniform float u_kGrid;
uniform float u_kJitter;
uniform float u_kSize;
uniform float u_kLaneFreq;
uniform float u_kLaneWobble;
uniform float u_kAlpha;

// Mode 2 (Octopus Legs) knobs
uniform float u_kCurveAmp;      // Curve amplitude/intensity (0.0 = straight, 1.0 = dramatic)
uniform float u_kCurveVariety;  // Lane uniqueness (0.0 = all same, 1.0 = all different)
uniform float u_debugColors;    // Debug: color-code dots by lane scale (0.0 = off, 1.0 = on)

varying vec2 v_uv;

// ------------------------------------------------------------
// aspect helpers
// ------------------------------------------------------------
vec2 aspectVec() {
  return vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
}
vec2 toAspectUV(vec2 uv) {
  vec2 asp = aspectVec();
  return (uv - 0.5) * asp + 0.5;
}

// ------------------------------------------------------------
// palette
// ------------------------------------------------------------
vec3 beigeBG() { return vec3(242.0, 226.0, 209.0) / 255.0; } // #F2E2D1
vec3 ink()     { return vec3(0.04, 0.04, 0.04); }
vec3 cMag()    { return vec3(136.0,  12.0,  80.0) / 255.0; } // #880C50
vec3 cPurp()   { return vec3(117.0,  73.0, 167.0) / 255.0; } // #7549A7
vec3 cGreen()  { return vec3( 17.0, 127.0,  42.0) / 255.0; } // #117F2A

vec3 brandHueCycle(float t) {
  float T   = fract(t / 120.0);
  float seg = floor(T * 3.0);
  float tt  = smoothstep(0.0, 1.0, fract(T * 3.0));
  if (seg < 1.0)      return mix(cMag(),   cPurp(),  tt);
  else if (seg < 2.0) return mix(cPurp(),  cGreen(), tt);
  else                return mix(cGreen(), cMag(),   tt);
}

// ------------------------------------------------------------
// hashing + noise
// ------------------------------------------------------------
float hash11(float p) { return fract(sin(p) * 43758.5453123); }

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}

// Cursor radial falloff (1 at cursor → 0 at radius)
float cursorRadialK(vec2 p, vec2 c, float radiusPx) {
  float d = length(p - c);
  float k = 1.0 - smoothstep(0.0, radiusPx, d);
  return pow(k, 1.15);
}

void presetWeights(out float wHero, out float wAmbient, out float wRead) {
  wHero = smoothstep(0.70, 0.95, u_spatialMotion);
  float readCand = 1.0 - smoothstep(0.12, 0.18, u_temporalMotion);
  wRead = (1.0 - wHero) * readCand;
  wAmbient = max(0.0, 1.0 - wHero - wRead);
  float s = max(wHero + wAmbient + wRead, 1e-6);
  wHero    /= s;
  wAmbient /= s;
  wRead    /= s;
}

// helper: 0..1 -> eased 0..1 (choose curve by id 0..2)
float easeById(float x, float id) {
  x = clamp(x, 0.0, 1.0);
  if (id < 0.333) {
    return x * x * (3.0 - 2.0 * x);
  } else if (id < 0.666) {
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
  } else {
    return (x < 0.5)
      ? 4.0 * x * x * x
      : 1.0 - pow(-2.0 * x + 2.0, 3.0) * 0.5;
  }
}

// helper: looping segmented timeline with random segment lengths + easing
float timeline01(float t, float seed) {
  float r0 = hash11(seed + 10.0);
  float r1 = hash11(seed + 20.0);
  float r2 = hash11(seed + 30.0);
  float r3 = hash11(seed + 40.0);

  float d0 = mix(2.0, 7.0, r0);
  float d1 = mix(2.0, 7.0, r1);
  float d2 = mix(2.0, 7.0, r2);
  float d3 = mix(2.0, 7.0, r3);

  float D = d0 + d1 + d2 + d3;
  float tt = mod(t, D);

  float seg = 0.0;
  float segT = tt;
  float segDur = d0;

  if (tt >= d0) { seg = 1.0; segT = tt - d0; segDur = d1; }
  if (tt >= d0 + d1) { seg = 2.0; segT = tt - (d0 + d1); segDur = d2; }
  if (tt >= d0 + d1 + d2) { seg = 3.0; segT = tt - (d0 + d1 + d2); segDur = d3; }

  float x = segT / max(segDur, 1e-4);

  float eId = hash11(seed + 100.0 + seg * 13.7);
  float ex  = easeById(x, eId);

  float k0 = hash11(seed + 200.0);
  float k1 = hash11(seed + 210.0);
  float k2 = hash11(seed + 220.0);
  float k3 = hash11(seed + 230.0);
  float k4 = k0;

  float a = k0, b = k1;
  if (seg > 0.5) { a = k1; b = k2; }
  if (seg > 1.5) { a = k2; b = k3; }
  if (seg > 2.5) { a = k3; b = k4; }

  return mix(a, b, ex);
}

// ------------------------------------------------------------
// MODE 0 blob SDF (signed distance, <0 inside)
// mode0K = 1 at Mode0, 0 at Mode1
// ------------------------------------------------------------
float geomDotSDFPx(vec2 fragPx, vec2 cPx, float radPx, float laneSeed, float mode0K) {
  vec2 p = fragPx - cPx;

  // Optional: tiny “tighter” visual in Mode0 without changing placement
  float t01 = 1.0 - mode0K;
  p.y *= mix(1.00, 1.28, t01);

  float rowID = floor(cPx.y * 0.02);
  float seed  = laneSeed * 31.7 + rowID * 7.13 + u_seed * 0.13;

  float r0 = hash11(seed + 1.0);
  float r1 = hash11(seed + 2.0);
  float r2 = hash11(seed + 3.0);

  float k = clamp(u_paletteK, 0.0, 1.0);

  float tMorph = timeline01(u_time * mix(1.40, 3.20, r1), seed + 500.0);

  // Stronger response curve
  float morphK = mix(0.55, 1.00, tMorph);
  morphK = pow(morphK, 0.22);   // smaller exponent = more aggressive
  morphK *= k;

  float warpAmt = radPx * (0.07 + 0.26 * morphK) * mix(0.85, 1.45, r2);

  vec2 q = p / max(radPx, 1e-4);
  float tW = u_time * mix(0.12, 0.35, r0);

  float n1 = vnoise(q * 1.35 + vec2( 7.1, 13.7) + seed * 0.01 + tW);
  float n2 = vnoise(q * 1.35 + vec2(19.3,  2.9) - seed * 0.01 - tW);

  vec2 warp = (vec2(n1, n2) - 0.5) * 2.0;
  p += warp * warpAmt;

float ang = atan(p.y, p.x);

// --- angular shape (compile-safe) ---
float ph1 = r0 * 6.2831853 + u_time * 0.11;
float ph3 = r1 * 6.2831853 - u_time * 0.08;
float ph5 = r2 * 6.2831853 + u_time * 0.06;

// Slightly reduced higher harmonics (still lively, less spiky)
float a1 = sin(ang + ph1);
float a3 = sin(3.0 * ang + ph3) * 0.42;   // was 0.35 (but see saturation below)
float a5 = sin(5.0 * ang + ph5) * 0.24;   // was 0.18

float shape = a1 + a3 + a5;

// Your stronger intensity stays
float amp = (0.18 + 0.95 * morphK) * mix(0.85, 1.65, r1);

// --- KEY: soft-saturate the radial delta to prevent spikes ---
// dr is the additive delta in radius units (around 1.0)
float dr = amp * shape;

// Softsign saturator: keeps motion/intensity but rounds sharp lobes.
// Increase 2.2 -> more smoothing; decrease -> more edgy.
dr = dr / (1.0 + 2.2 * abs(dr));

// Optional extra rounding (very effective):
// dr = tanh(dr * 1.2) / 1.2;

// Now clamp *after* smoothing
float minR = 0.70;
float maxR = 1.25;

float rScale = clamp(1.0 + dr, minR, maxR);


  // SDF: negative inside
  return length(p) - (radPx * rScale);
}

// ------------------------------------------------------------
// Lane wobble (Mode 1 behaviour) — KEEP AS-IS
// ------------------------------------------------------------
float laneWobblePx(float yyPx, float kW, float t) {
  kW = clamp(kW, 0.0, 1.0);

  float wHero, wAmb, wRead;
  presetWeights(wHero, wAmb, wRead);

  // HERO — paired back
  float freqHero = 0.34;
  float z1Hero   = 150.0;
  float z2Hero   = 54.0;
  float t1Hero   = 0.18;
  float t2Hero   = 0.13;
  float mixHero  = 0.56;

  // AMBIENT — midpoint
  float freqAmb = 0.28;
  float z1Amb   = 220.0;
  float z2Amb   = 110.0;
  float t1Amb   = 0.075;
  float t2Amb   = 0.050;
  float mixAmb  = 0.74;

  // READ — calm
  float freqRead = 0.20;
  float z1Read   = 340.0;
  float z2Read   = 180.0;
  float t1Read   = 0.030;
  float t2Read   = 0.018;
  float mixRead  = 0.90;

  float freqMul = freqHero*wHero + freqAmb*wAmb + freqRead*wRead;
  float Z1      = z1Hero*wHero   + z1Amb*wAmb   + z1Read*wRead;
  float Z2      = z2Hero*wHero   + z2Amb*wAmb   + z2Read*wRead;
  float T1      = t1Hero*wHero   + t1Amb*wAmb   + t1Read*wRead;
  float T2      = t2Hero*wHero   + t2Amb*wAmb   + t2Read*wRead;
  float mixW    = mixHero*wHero  + mixAmb*wAmb  + mixRead*wRead;

  float kCurve    = pow(kW, 5.6);
  float maxWobble = 196.0;

  float y = yyPx * freqMul;

  float ph = (vnoise(vec2(yyPx * 0.0025, t * 0.03 + 10.0)) - 0.5) * 2.0;
  float wanderAmp = 1.6*wHero + 0.45*wAmb + 0.10*wRead;
  float phaseWander = ph * wanderAmp;

  float zebra1 = sin((y / Z1) + t * T1 + phaseWander);
  float zebra2 = sin((y / Z2) - t * T2 + phaseWander * 0.6);

  float Z3 = 0.73 * Z2 + 0.19 * Z1 + 41.0;
  float T3 = 0.86 * T1 + 0.11 * T2 + 0.05;
  float zebra3 = sin((y / Z3) + t * T3 + phaseWander * 0.35);

  float w3 = 0.20*wHero + 0.08*wAmb + 0.02*wRead;

  float w12  = (mixW * zebra1 + (1.0 - mixW) * zebra2);
  float wAll = mix(w12, (0.70*w12 + 0.30*zebra3), clamp(w3, 0.0, 0.35));

  return maxWobble * kCurve * wAll;
}

// ------------------------------------------------------------
// Mode-aware wobble (Mode0 gets MUCH stronger + more non-uniform)
// mode0K: 1=Mode0, 0=Mode1
// ------------------------------------------------------------
float laneWobblePx_M0Boost(float yyPx, float kW, float t, float mode0K) {
  kW     = clamp(kW, 0.0, 1.0);
  mode0K = clamp(mode0K, 0.0, 1.0);

  float wHero, wAmb, wRead;
  presetWeights(wHero, wAmb, wRead);

  // Same base numbers as your existing laneWobblePx (keeps Mode1 feel)
  float freqHero = 0.34;
  float z1Hero   = 150.0;
  float z2Hero   = 54.0;
  float t1Hero   = 0.18;
  float t2Hero   = 0.13;
  float mixHero  = 0.56;

  float freqAmb = 0.28;
  float z1Amb   = 220.0;
  float z2Amb   = 110.0;
  float t1Amb   = 0.075;
  float t2Amb   = 0.050;
  float mixAmb  = 0.74;

  float freqRead = 0.20;
  float z1Read   = 340.0;
  float z2Read   = 180.0;
  float t1Read   = 0.030;
  float t2Read   = 0.018;
  float mixRead  = 0.90;

  float freqMul = freqHero*wHero + freqAmb*wAmb + freqRead*wRead;
  float Z1      = z1Hero*wHero   + z1Amb*wAmb   + z1Read*wRead;
  float Z2      = z2Hero*wHero   + z2Amb*wAmb   + z2Read*wRead;
  float T1      = t1Hero*wHero   + t1Amb*wAmb   + t1Read*wRead;
  float T2      = t2Hero*wHero   + t2Amb*wAmb   + t2Read*wRead;
  float mixW    = mixHero*wHero  + mixAmb*wAmb  + mixRead*wRead;

  // MODE0: bigger amplitude + more energy even at moderate kW
  float kExp      = mix(5.6, 2.35, mode0K);
  float maxWobble = mix(196.0, 520.0, mode0K);
  float kCurve    = pow(kW, kExp);

  // MODE0: denser oscillation
  float freqBoost = mix(1.0, 1.55, mode0K);
  float y = yyPx * (freqMul * freqBoost);

  // OPTIMIZATION: Only compute expensive phase wander in Mode0 when it matters
  float phaseWander = 0.0;
  float phaseWarp = 0.0;
  float ph2 = 0.0;  // Needed for ampMod later
  
  if (mode0K > 0.05 && kW > 0.1) {
    // MODE0: phase non-uniformity (adds "kinks" and drift)
    float ph0 = (vnoise(vec2(yyPx * 0.0025, t * 0.03 + 10.0)) - 0.5) * 2.0;
    float ph1 = (vnoise(vec2(yyPx * 0.0048, t * 0.08 + 50.0)) - 0.5) * 2.0;
    ph2 = (vnoise(vec2(yyPx * 0.0017, t * 0.05 + 80.0)) - 0.5) * 2.0;

    float wanderAmpBase = 1.6*wHero + 0.45*wAmb + 0.10*wRead;
    float wanderAmp     = wanderAmpBase * (1.0 + 1.25 * mode0K);

    phaseWander = ph0 * wanderAmp;
    phaseWarp   = (0.55 * ph1 + 0.45 * ph2) * (1.35 * mode0K);
  }

  float zebra1 = sin((y / Z1) + t * T1 + phaseWander + phaseWarp);
  float zebra2 = sin((y / Z2) - t * T2 + phaseWander * 0.6 - phaseWarp * 0.7);

  // OPTIMIZATION: Skip extra harmonics in Mode1 (when mode0K < 0.05)
  float wAll;
  if (mode0K < 0.05) {
    // Mode1: Simple 2-harmonic blend (50% cheaper)
    wAll = mixW * zebra1 + (1.0 - mixW) * zebra2;
  } else {
    // Mode0: Full complexity with 4 harmonics
    float Z3 = 0.73 * Z2 + 0.19 * Z1 + 41.0;
    float T3 = 0.86 * T1 + 0.11 * T2 + 0.05;
    float zebra3 = sin((y / Z3) + t * T3 + phaseWander * 0.35 + phaseWarp * 0.9);

    float Z4 = 0.55 * Z2 + 0.33 * Z1 + 17.0;
    float T4 = 1.35 * T1 + 0.20 * T2 + 0.09;
    float zebra4 = sin((y / Z4) - t * T4 + phaseWander * 0.22 - phaseWarp * 0.4);

    float w3  = 0.20*wHero + 0.08*wAmb + 0.02*wRead;
    float w12 = (mixW * zebra1 + (1.0 - mixW) * zebra2);
    wAll = mix(w12, (0.70*w12 + 0.30*zebra3), clamp(w3, 0.0, 0.35));
    wAll += (0.18 + 0.42 * mode0K) * zebra4;
  }

  // Stable nonlinear shaping (kinkier feel in Mode0)
  float shapeK = 1.0 + 2.25 * mode0K;
  wAll *= shapeK;
  wAll = wAll / (1.0 + 0.85 * abs(wAll)); // soft saturation (prevents blowups)

  // Mild amplitude modulation (only in Mode0 where ph2 is calculated)
  float ampMod = 1.0;
  if (mode0K > 0.05) {
    ampMod = 1.0 + 0.55 * mode0K * ph2;
  }

  return maxWobble * kCurve * wAll * ampMod;
}

float laneLocalWobblePx(float yyPx, float laneSeed, float padPx, float kW, float t) {
  kW = clamp(kW, 0.0, 1.0);
  float maxLocal = padPx * 0.45;
  float k = pow(kW, 2.2);

  float y = yyPx * 0.22;
  float a = laneSeed * 1.73 + u_seed * 0.31;

  float s1 = sin((y / 120.0) + a + t * 0.18);
  float s2 = sin((y / 47.0)  - a * 1.3 - t * 0.11);
  float s3 = sin((y / 260.0) + a * 0.7 + t * 0.07);

  float w = (0.55 * s1 + 0.30 * s2 + 0.15 * s3);
  return maxLocal * k * w;
}

// ------------------------------------------------------------
// MODE 2: Octopus Legs - Per-lane unique wobble with variety control
// ------------------------------------------------------------
// laneID: unique lane identifier (colID from caller)
// kAmp: curve amplitude/intensity (0.0 = straight, 1.0 = dramatic)
// kVariety: lane uniqueness (0.0 = all lanes identical, 1.0 = all lanes different)
// ------------------------------------------------------------
float laneWobblePx_Mode2(float yyPx, float laneID, float kAmp, float kVariety, float t) {
  kAmp = clamp(kAmp, 0.0, 1.0);
  kVariety = clamp(kVariety, 0.0, 1.0);
  
  float wHero, wAmb, wRead;
  presetWeights(wHero, wAmb, wRead);
  
  // Frequency scales with kAmp: low amp = gentle long curves, high amp = dense short curves
  // Range: 0.28 (Mode 1 style) to 1.2 (compact tentacles)
  float freqBase = mix(0.28, 1.2, kAmp);
  
  // Wavelengths scale inversely with frequency
  float Z1 = mix(220.0, 50.0, kAmp);
  float Z2 = mix(110.0, 25.0, kAmp);
  float T1 = 0.15;   // Animation speed
  float T2 = 0.10;
  
  // Sequential variety: adjacent lanes get smoothly varying offsets
  // Instead of random hash, use smooth function of lane ID
  float varietyPhase = laneID * 0.85;  // Sequential offset (not random)
  
  // Phase shifts based on sequential position (smooth variation between neighbors)
  float phaseShift1 = varietyPhase * kVariety * 2.5;
  float phaseShift2 = varietyPhase * kVariety * 1.8;
  float phaseShift3 = varietyPhase * kVariety * 3.2;
  
  // Smooth amplitude modulation (sequential, not random)
  // Creates gentle thickness variation across adjacent lanes
  float laneAmpMul = 1.0 + 0.25 * sin(laneID * 0.73 + u_seed) * kVariety;
  
  float y = yyPx * freqBase;
  
  // 3 harmonics with sequential phase shifts for organic variation
  float zebra1 = sin((y / Z1) + t * T1 + phaseShift1);
  float zebra2 = sin((y / Z2) - t * T2 + phaseShift2);
  
  float Z3 = 0.70 * Z2 + 0.30 * Z1;
  float T3 = 0.88 * T1 + 0.12 * T2;
  float zebra3 = sin((y / Z3) + t * T3 + phaseShift3);
  
  float w3 = 0.25 * wHero + 0.18 * wAmb + 0.08 * wRead;
  float mixW = 0.60;
  
  float w12 = mixW * zebra1 + (1.0 - mixW) * zebra2;
  float wAll = mix(w12, (0.70 * w12 + 0.30 * zebra3), clamp(w3, 0.0, 0.35));
  
  // Amplitude: stronger than Mode 1 for dramatic tentacle curves
  // Max amplitude scales with kAmp (user control)
  float maxAmplitude = 280.0;  // Base amplitude for dramatic curves
  float amplitudeCurve = pow(kAmp, 2.8);  // Exponential scaling for control sensitivity
  
  return maxAmplitude * amplitudeCurve * wAll * laneAmpMul;
}

// ------------------------------------------------------------
// Dot sampling (SHARED for Mode 0 + Mode 1) — identity-critical
// Scales primitives (crisp) instead of zooming sampling coords.
// ------------------------------------------------------------
void kusamaDotSample(
  vec2 frag,
  float colID,
  float laneCoreCenterX,
  float xOff,
  float laneScale,
  float scaleG,
  float kJ,
  float kWBase,
  float useCursorWobble,
  vec2  cursorPx,
  float radiusPx,
  float aa,
  float laneSeed,
  float dotScaleUp,
  float padMul,
  float gapMul,
  float wobbleScale,
  out vec2  dotC,
  out float dotMaskPxOut,
  out float coreMaskOut,
  out float dotAOut
) {
  // VIEWPORT-RELATIVE SCALING: Scale all sizes based on CSS viewport width
  // Reference: 1440px viewport uses base pixel values
  // Use u_viewportWidth (CSS pixels) instead of u_resolution.x (buffer pixels)
  // to avoid flickering when DPR changes. Clamp to handle edge cases.
  float viewportScale = clamp(u_viewportWidth / 1440.0, 0.5, 4.0);

  // Base sizes in screen px (crisp SDF), scaled to viewport
  float lanePxBase = 48.0 * dotScaleUp * viewportScale;
  float dotDiaBase = 48.0 * dotScaleUp * viewportScale;

  // Spacing scales with dotScaleUp but can be tightened via multipliers
  float padBase    = 16.0 * padMul * dotScaleUp * viewportScale;
  float gapBase    = 32.0 * gapMul * dotScaleUp * viewportScale;

  float x = frag.x;
  float y = frag.y;

  float lanePx   = lanePxBase * laneScale;
  float dotDiaPx = dotDiaBase * laneScale;
  float dotRadPx = 0.5 * dotDiaPx;

  float padPx   = (padBase * scaleG);
  float gapPx   = (gapBase * scaleG);
  float pitchPx = dotDiaPx + gapPx;

  float yStart = dotRadPx + aa + 2.0;
  float nLane  = floor(((y - yStart) / pitchPx) + 0.5);
  float dotCy0 = yStart + nLane * pitchPx;

  // ---- ID BRIDGE ---- (reference grid must use same viewport scale)
  // Use viewport-scaled reference to maintain stable IDs across viewport sizes
  float dotDiaRef = 48.0 * viewportScale;  // Match viewport scaling (already clamped above)
  float dotRadRef = 0.5 * dotDiaRef;
  float gapRef    = (32.0 * viewportScale) * scaleG;  // Match viewport scaling (already clamped above)
  float pitchRef  = dotDiaRef + gapRef;
  float yStartRef = dotRadRef + aa + 2.0;
  float nRef = floor(((dotCy0 - yStartRef) / pitchRef) + 0.5);
  float nID  = nRef;

  float key1 = nID * 17.13 + u_seed * 0.71 + laneSeed * 1.31 + colID * 9.97;
  float key2 = nID * 41.77 + u_seed * 1.19 + laneSeed * 2.17 + colID * 6.43;

  float r1 = hash11(key1);
  float r2 = hash11(key2);

  float maxDx = padPx;
  float maxDy = 0.25 * gapPx;

  float fracDx = 0.40;
  float fracDy = 0.25;

  float kJc = clamp(kJ, 0.0, 1.0);
  float jx = (r1 - 0.5) * 2.0 * (maxDx * fracDx) * kJc;
  float jy = (r2 - 0.5) * 2.0 * (maxDy * fracDy) * kJc;

  float dotCy = dotCy0 + jy;

  vec2 dotCenterApprox = vec2(laneCoreCenterX + xOff, dotCy);

  float cursorK = cursorRadialK(dotCenterApprox, cursorPx, radiusPx);
  cursorK *= (u_cursorEnabled > 0.5) ? 1.0 : 0.0;

  float wobbleK = mix(1.0, cursorK, clamp(useCursorWobble, 0.0, 1.0));
  float kW = clamp(kWBase, 0.0, 1.0) * wobbleK;

float t01    = clamp(u_mode, 0.0, 1.0);
float mode0K = 1.0 - t01;

// MODE 2 DETECTION: Use per-lane wobble for octopus tentacles
float wG;
if (u_mode > 1.5) {
  // Mode 2: Per-lane unique curves
  wG = laneWobblePx_Mode2(dotCy, colID, u_kCurveAmp, u_kCurveVariety, u_time) * wobbleScale;
} else {
  // Mode 0/1: Synchronized wobble
  wG = laneWobblePx_M0Boost(dotCy, kW, u_time, mode0K) * wobbleScale;
}

float wL = 0.0; // sanity check: disable local wobble
// float wL = laneLocalWobblePx(dotCy, laneSeed, padPx, kW, u_time) * wobbleScale;

  float laneCenterX_dot = laneCoreCenterX + xOff + wG + wL;
  float dotCx = laneCenterX_dot + jx;

  dotC = vec2(dotCx, dotCy);

  float d = length(frag - dotC);
  dotMaskPxOut = 1.0 - smoothstep(dotRadPx, dotRadPx + aa, d);

  float coreHalfW = 0.5 * lanePx;
  float coreDx = abs(x - dotCx) - coreHalfW;
  coreMaskOut = 1.0 - smoothstep(0.0, aa, coreDx);

  dotAOut = pow(clamp(u_kAlpha, 0.0, 1.0), 1.6);
}

// Pure-core proximity: 1.0 inside core, then smooth falloff to 0 by falloff.
// coreFrac/falloffFrac are fractions of radiusPx.
float cursorProxCoreFalloffK(
  vec2 p, vec2 c, float radiusPx,
  float coreFrac, float falloffFrac, float fallPow
) {
  float d    = length(p - c);
  float core = radiusPx * coreFrac;
  float fall = radiusPx * falloffFrac;

  // 1 in core, then soften out to 0 by fall
  float k = 1.0 - smoothstep(core, fall, d);

  // shape curve (lower = softer, higher = snappier)
  return pow(clamp(k, 0.0, 1.0), fallPow);
}

// ------------------------------------------------------------
// Mode 2: Check if a point is inside any lane with scale > threshold
// Used for occlusion testing - returns true if point is occluded by larger lane
// ------------------------------------------------------------
bool isPointInLargerLane(
  vec2 point,
  float currentLaneScale,
  float laneCoreCenterX,
  float scaleG,
  float wobbleScale,
  float lanePxBase,
  float padPxCommon,
  float rBase,
  int H,
  int C
) {
  // Check center lane (scale = 1.0)
  if (1.0 > currentLaneScale + 0.01) {
    float wG = laneWobblePx_Mode2(point.y, 0.0, u_kCurveAmp, u_kCurveVariety, u_time) * wobbleScale;
    float laneCenterX = laneCoreCenterX + wG;
    float laneWidthPx = lanePxBase * 1.0 + 2.0 * padPxCommon;
    float distToCenter = abs(point.x - laneCenterX);
    if (distToCenter < laneWidthPx * 0.5) {
      return true;  // Inside center lane which is larger
    }
  }
  
  // Check sibling lanes
  const int MAX_CHECK = 32;
  float prevRegionR = lanePxBase + 2.0 * padPxCommon;
  float prevRegionL = prevRegionR;
  float cumOffR = 0.0;
  float cumOffL = 0.0;
  
  for (int i = 1; i <= MAX_CHECK; i++) {
    float fi = float(i);
    int kInt = (i - 1) - ((i - 1) / C) * C;
    float k = float(kInt);
    float e = float(H) - abs((k + 1.0) - float(H));
    
    float jitterPct = 0.03;
    float rRight = clamp(rBase * (1.0 + (hash11(fi * 31.7 + u_seed * 2.1 + 11.0) - 0.5) * 2.0 * jitterPct), 0.60, 0.98);
    float rLeft = clamp(rBase * (1.0 + (hash11(fi * 29.3 + u_seed * 2.1 + 23.0) - 0.5) * 2.0 * jitterPct), 0.60, 0.98);
    
    float laneScaleR = (e < 0.5) ? 1.0 : pow(rRight, e);
    float laneScaleL = (e < 0.5) ? 1.0 : pow(rLeft, e);
    
    float regionR = lanePxBase * laneScaleR + 2.0 * padPxCommon;
    float regionL = lanePxBase * laneScaleL + 2.0 * padPxCommon;
    
    cumOffR += 0.5 * (prevRegionR + regionR);
    cumOffL += 0.5 * (prevRegionL + regionL);
    
    prevRegionR = regionR;
    prevRegionL = regionL;
    
    // Check right lane if it's larger
    if (laneScaleR > currentLaneScale + 0.01) {
      float wG = laneWobblePx_Mode2(point.y, fi, u_kCurveAmp, u_kCurveVariety, u_time) * wobbleScale;
      float laneCenterX = laneCoreCenterX + cumOffR + wG;
      float laneWidthPx = lanePxBase * laneScaleR + 2.0 * padPxCommon;
      float distToCenter = abs(point.x - laneCenterX);
      if (distToCenter < laneWidthPx * 0.5) {
        return true;  // Inside a larger lane
      }
    }
    
    // Check left lane if it's larger
    if (laneScaleL > currentLaneScale + 0.01) {
      float wG = laneWobblePx_Mode2(point.y, -fi, u_kCurveAmp, u_kCurveVariety, u_time) * wobbleScale;
      float laneCenterX = laneCoreCenterX - cumOffL + wG;
      float laneWidthPx = lanePxBase * laneScaleL + 2.0 * padPxCommon;
      float distToCenter = abs(point.x - laneCenterX);
      if (distToCenter < laneWidthPx * 0.5) {
        return true;  // Inside a larger lane
      }
    }
  }
  
  return false;  // Not inside any larger lane
}

// ------------------------------------------------------------
/// Shared lane render that MORPHS mask (Mode0 blob -> Mode1 circle)
// HERO/AMBIENT: closest to cursor = PURE circle, far = normal mode morph (blob in Mode0).
// READ (Mode0 only): opacity gated by proximity + inverted geometry proximity
// (near = blob + visible, far = circle + fades out).
// ------------------------------------------------------------
// Returns: vec4(dotCenterX, dotCenterY, dotRadius, unused)
vec4 addKusamaLaneUnified(
  inout vec3 col,
  vec2 frag,
  float colID,
  float laneCoreCenterX,
  float xOff,
  float laneScale,
  float scaleG,
  float kJ,
  float kWBase,
  float useCursorWobble,
  vec2  cursorPx,
  float radiusPx,
  float aa,
  float laneSeed,
  float t01,
  float wobbleScale,
  float mode0K,
  float wRead,
  float cursorOn
) {
  // mode0K, wRead, cursorOn now passed in to avoid recalculation
  // mode0K, wRead, cursorOn now passed in to avoid recalculation 

  // ------------------------------------------------------------
  // Sample base dot (identity-stable)
  // ------------------------------------------------------------
  vec2  dotC;
  float dotMaskCircle;
  float coreMask;
  float dotA;

  kusamaDotSample(
    frag, colID,
    laneCoreCenterX, xOff, laneScale, scaleG,
    kJ, kWBase, useCursorWobble,
    cursorPx, radiusPx, aa, laneSeed,
    1.0, 1.0, 1.0, wobbleScale,
    dotC, dotMaskCircle, coreMask, dotA
  );

  // READ-only behaviour when READ is dominant AND Mode0
  // wRead is now passed in from parent to avoid recalculation
  float readGate = smoothstep(0.45, 0.70, wRead) * mode0K;

  // Cursor enabled + influence (cursorOn passed in)
  float infl     = clamp(u_cursorInfluence, 0.0, 1.0) * cursorOn;

  // ------------------------------------------------------------
  // Your chosen shaping values
  // ------------------------------------------------------------
  float coreFrac    = 0.12;
  float falloffFrac = 0.55;
float fallPow = 0.70; // (was 0.85)

  // IMPORTANT:
  // - We do NOT multiply proximity by infl (so cursor core can be pure circle / 100% opacity).
  // - We instead scale the effective radius by infl, so low influence just shrinks the effect area.

  // Radius multipliers (these are your main knobs now)
  float heroRadiusMul = 0.55; // shrink HERO/AMBIENT circle influence (try 0.45..0.70)
  float readRadiusMul = 0.90; // READ gating radius (try 0.55..0.85)

  // Apply influence as a radius scaler (keeps peak at 1.0 in the core)
float inflRadiusMul = mix(0.50, 1.0, infl); // (was mix(0.35, 1.0, infl))

  float rHero = radiusPx * heroRadiusMul * inflRadiusMul;
  float rRead = radiusPx * readRadiusMul * inflRadiusMul;

  // OPTIMIZATION: Use lane center for proximity instead of individual dot position
  // Since all dots in a lane share similar X coords, this is nearly identical but avoids per-fragment calc
  vec2 laneCenter = vec2(laneCoreCenterX + xOff, dotC.y);
  
  // Proximity: 1 near cursor -> 0 far (PURE 1 in core, since we do not damp the peak)
  float proxHeroAmb = cursorOn * cursorProxCoreFalloffK(laneCenter, cursorPx, rHero, coreFrac, falloffFrac, fallPow);
  float proxRead    = cursorOn * cursorProxCoreFalloffK(laneCenter, cursorPx, rRead, coreFrac, falloffFrac, fallPow);

  // ------------------------------------------------------------
  // Base mode morph (t01=0 -> blob, t01=1 -> circle)
  // ------------------------------------------------------------
  float tShapeMode = smoothstep(0.00, 0.35, t01);

  // HERO/AMBIENT: near cursor -> force circle (PURE circle in core because proxHeroAmb==1 there)
  float tShapeHeroAmb = mix(tShapeMode, 1.0, proxHeroAmb);

  // READ (Mode0 only): INVERT proximity:
  // near cursor -> blob (tShapeMode), far -> circle (1.0)
  float tShapeRead = mix(tShapeMode, 1.0, (1.0 - proxRead));

  // As READ fades (proxRead -> 0), push even more circular so faint dots are circles
  float fadeToCircle = pow(clamp(1.0 - proxRead, 0.0, 1.0), 0.85);
  tShapeRead = mix(tShapeRead, 1.0, fadeToCircle);

  // Select behaviour
  float tShape = mix(tShapeHeroAmb, tShapeRead, readGate);

  // ------------------------------------------------------------
  // Distances
  // ------------------------------------------------------------
  float baseRadPx = 0.5 * (48.0 * laneScale);
  float dotRadPx  = baseRadPx;

  vec2  dp    = frag - dotC;
  float dCirc = length(dp) - dotRadPx;
  
  // OPTIMIZATION: Only compute expensive blob SDF when needed
  // tShape near 1.0 = pure circle (Mode1), near 0.0 = pure blob (Mode0)
  float dMix;
  if (tShape > 0.95) {
    // Pure circle - skip expensive blob calculation
    dMix = dCirc;
  } else if (tShape < 0.05) {
    // Pure blob - skip simple circle, compute full SDF
    dMix = geomDotSDFPx(frag, dotC, dotRadPx, laneSeed, mode0K);
  } else {
    // Transition - need both
    float dBlob = geomDotSDFPx(frag, dotC, dotRadPx, laneSeed, mode0K);
    dMix = mix(dBlob, dCirc, tShape);
  }
  
  float dotMask = 1.0 - smoothstep(-aa, aa, dMix);

  // ------------------------------------------------------------
  // Lane affinity
  // ------------------------------------------------------------
  float lanePx = 48.0 * laneScale;
  float extra  = dotRadPx * (1.10 * mode0K);
  float coreHalfW = 0.5 * lanePx + extra;

  float coreDx = abs(frag.x - dotC.x) - coreHalfW;
  float coreMaskWide =
    1.0 - smoothstep(0.0, aa * mix(1.0, 2.0, mode0K), coreDx);

  float laneAffinity =
    mix(0.70, 1.00, pow(clamp(coreMaskWide, 0.0, 1.0), 0.55));

  // ------------------------------------------------------------
  // READ-only opacity gating (Mode0 only)
  // - near cursor: alphaGate == 1.0 (fully visible)
  // - far away: fades out
  // ------------------------------------------------------------
float readOpacityPow = 0.85; // (was 1.35)
  float alphaGate = pow(clamp(proxRead, 0.0, 1.0), readOpacityPow);

  float alphaMul = mix(1.0, alphaGate, readGate);

  vec3 dotColor = vec3(0.0);  // Black dots
  
  // Debug color-coding (toggle with u_debugColors)
  if (u_debugColors > 0.5) {
    // Get current background color (not used for debug gradient)
    vec3 activeBG = brandHueCycle(u_time);
    
    // Use brand colors: Mag -> Purp -> Green
    // Map laneScale (smallest=~0.5, largest=1.0) to gradient
    float t = 1.0 - laneScale;  // Invert so largest scale = 0, smallest = 1
    t = clamp(t * 2.0, 0.0, 1.0);  // Expand range for better visibility
    
    // Determine which two brand colors to use (not the active background)
    vec3 color1, color2;
    
    // Check which color is closest to active background
    float distMag = length(activeBG - cMag());
    float distPurp = length(activeBG - cPurp());
    float distGreen = length(activeBG - cGreen());
    
    if (distMag > distPurp && distMag > distGreen) {
      // Mag is furthest, use Purp -> Green
      color1 = cPurp();
      color2 = cGreen();
    } else if (distPurp > distMag && distPurp > distGreen) {
      // Purp is furthest, use Mag -> Green
      color1 = cMag();
      color2 = cGreen();
    } else {
      // Green is furthest, use Mag -> Purp
      color1 = cMag();
      color2 = cPurp();
    }
    
    // Interpolate between the two non-background colors
    dotColor = mix(color1, color2, t);
  }

  // Render dots with debug colors or black
  col = mix(col, dotColor, dotMask * laneAffinity * dotA * alphaMul);
  
  // Return dot info (fourth component unused for now)
  return vec4(dotC, dotRadPx, 0.0);
}

// ------------------------------------------------------------
// Unified Mode 0/1 (single dot field + mask morph + Mode0 scale-up)
// Mode0 is ~4x larger dots (fewer visible) but remains continuous to Mode1.
//
// UPDATE: HERO-only auto-wobble for data-k-* medians (±0.25 range).
// Auto-wobble is applied ONLY when HERO is dominant; otherwise raw u_k* are used.
// ------------------------------------------------------------
vec3 modeKusamaUnified01(vec2 uv) {
  vec3 col = brandHueCycle(u_time);

  float t01 = clamp(u_mode, 0.0, 1.0); // 0 = mode0, 1 = mode1

  // --- pattern-space zoom ---
  // zoomIn=4 means: sample 1/4 the area -> looks 4x larger on screen
  float zoomIn = mix(4.0, 1.0, t01);

  vec2 frag   = uv * u_resolution;
  vec2 center = 0.5 * u_resolution;

  vec2 fragZ   = center + (frag - center) / zoomIn;

  vec2 cursorPx = vec2(u_mouse.x * u_resolution.x, u_mouse.y * u_resolution.y);
  vec2 cursorZ  = center + (cursorPx - center) / zoomIn;

  // Keep cursor radius consistent in pattern-space so interaction feels similar
  float radiusPx = (0.65 * u_resolution.x) / zoomIn;

  // Crisp AA under zoom (this is the key anti-blur fix)
  float aa  = 1.25;
  float aaZ = aa / zoomIn;

  // Reduce wobble in pattern-space so it doesn't explode when zoomed in
  float wobbleScale = 1.0 / zoomIn;

  // Cursor wobble blend (calmer near Mode0)
  float useCursorWobble0 = 1.0 - smoothstep(0.80, 0.94, u_spatialMotion);
  useCursorWobble0 = pow(clamp(useCursorWobble0, 0.0, 1.0), 1.9) * 0.65;

  float useCursorWobble1 = 1.0 - smoothstep(0.78, 0.92, u_spatialMotion);
  useCursorWobble1 = pow(clamp(useCursorWobble1, 0.0, 1.0), 1.6);

  float useCursorWobble = mix(useCursorWobble0, useCursorWobble1, t01);

  // ------------------------------------------------------------
  // HERO-only auto-wobble around data-k-* medians (±0.25)
  // ------------------------------------------------------------
  float wHero, wAmb, wRead;
  presetWeights(wHero, wAmb, wRead);

  // Gate: only when HERO dominates (no Mode restriction; pure "HERO only")
  float heroGate = smoothstep(0.55, 0.80, wHero);

  // Medians (your data-k-* values)
  float kGm  = clamp(u_kGrid,       0.0, 1.0);
  float kJm  = clamp(u_kJitter,     0.0, 1.0);
  float kSm  = clamp(u_kSize,       0.0, 1.0);
  float kLFm = clamp(u_kLaneFreq,   0.0, 1.0);
  float kWm  = clamp(u_kLaneWobble, 0.0, 1.0);
  float kAm  = clamp(u_kAlpha,      0.0, 1.0); // HERO-only wobble (requires addKusamaLaneUnified to use it)

  // Organic loop helper (only calculate if heroGate will be used)
  float xG = 0.0, xJ = 0.0, xS = 0.0, xLF = 0.0, xW = 0.0, xA = 0.0;
  
  if (heroGate > 0.01) {
    // timeline01 returns 0..1 => convert to -1..1 => scale by 0.25 => clamp
    float seedBase = u_seed * 0.17;

    xG  = (timeline01(u_time * 0.25, 101.0 + seedBase) - 0.5) * 2.0;
    xJ  = (timeline01(u_time * 0.30, 202.0 + seedBase) - 0.5) * 2.0;
    xS  = (timeline01(u_time * 0.22, 303.0 + seedBase) - 0.5) * 2.0;
    xLF = (timeline01(u_time * 0.18, 404.0 + seedBase) - 0.5) * 2.0;
    xW  = (timeline01(u_time * 0.28, 505.0 + seedBase) - 0.5) * 2.0;
    xA  = (timeline01(u_time * 0.16, 606.0 + seedBase) - 0.5) * 2.0;

    // Soft saturation to avoid "mechanical" extremes (keeps it organic)
    xG  = xG  / (1.0 + 0.85 * abs(xG));
    xJ  = xJ  / (1.0 + 0.85 * abs(xJ));
    xS  = xS  / (1.0 + 0.85 * abs(xS));
    xLF = xLF / (1.0 + 0.85 * abs(xLF));
    xW  = xW  / (1.0 + 0.85 * abs(xW));
    xA  = xA  / (1.0 + 0.85 * abs(xA));
  }

  float kG_auto  = clamp(kGm  + xG  * 0.25, 0.0, 1.0);
  float kJ_auto  = clamp(kJm  + xJ  * 0.25, 0.0, 1.0);
  float kS_auto  = clamp(kSm  + xS  * 0.25, 0.0, 1.0);
  float kLF_auto = clamp(kLFm + xLF * 0.25, 0.0, 1.0);
  float kW_auto  = clamp(kWm  + xW  * 0.25, 0.0, 1.0);
  float kA_auto  = clamp(kAm  + xA  * 0.25, 0.0, 1.0);

  // Final knobs: HERO => auto, else => medians
  float kG     = mix(kGm,  kG_auto,  heroGate);
  float kJ     = mix(kJm,  kJ_auto,  heroGate);
  float kSize  = mix(kSm,  kS_auto,  heroGate);
  float kLF    = mix(kLFm, kLF_auto, heroGate);
  float kWBase = mix(kWm,  kW_auto,  heroGate);

  // NOTE:
  // kAlpha is computed here for HERO-only wobble, but your current pipeline
  // uses u_kAlpha inside kusamaDotSample(). To actually apply HERO-only alpha wobble,
  // update addKusamaLaneUnified/kusamaDotSample to accept and use this value.
  // (Leaving this value computed here so you can wire it in cleanly.)
  float kAlpha = mix(kAm, kA_auto, heroGate);

  // ------------------------------------------------------------
  // Use kG to compute scaleG (as before)
  // ------------------------------------------------------------
  float scaleG = max(2.0 * kG, 0.25);

  float laneCoreCenterX = 0.5 * u_resolution.x;

  // Pre-calculate mode and cursor state (avoid recalc per lane)
  float mode0K = 1.0 - clamp(t01, 0.0, 1.0);
  float cursorOn = (u_cursorEnabled > 0.5) ? 1.0 : 0.0;

  float rBase = mix(0.90, 0.70, kSize);

  int H = int(floor(mix(3.0, 8.0, kLF) + 0.5));
  int C = 2 * H;

  // VIEWPORT-RELATIVE SCALING: Scale all sizes based on CSS viewport width
  // Reference: 1440px viewport uses base pixel values
  // Use u_viewportWidth (CSS pixels) instead of u_resolution.x (buffer pixels)
  // to avoid flickering when DPR changes. Clamp to handle edge cases.
  float viewportScale = clamp(u_viewportWidth / 1440.0, 0.5, 4.0);
  
  // These are Mode1-scale sizes, scaled to viewport
  float lanePxBase  = 48.0 * viewportScale;
  float padBase     = 16.0 * viewportScale;
  float padPxCommon = padBase * scaleG;
  float regionCenter = lanePxBase + 2.0 * padPxCommon;

  // Mode 2: Render with z-index ordering (larger dots on top)
  bool isMode2 = (u_mode > 1.5);

  const int MAX_ITERS = 32;  // Reduced from 64 for performance (revert if needed)

  // Early-exit bounds should use SCREEN space, not pattern space
  // Mode 0 wobble can reach 520px (see laneWobblePx_M0Boost line 398)
  float MAX_WOBBLE_PX_SCREEN = 520.0;  // Actual max wobble in screen pixels
  float halfW_SCREEN = 0.5 * u_resolution.x;
  
  // Pattern-space values for wobble calculations
  float MAX_WOBBLE_PX = 520.0 / zoomIn;
  float halfW = 0.5 * u_resolution.x / zoomIn;

  // Direct rendering - no collection or sorting
  float prevRegionR = regionCenter;
  float prevRegionL = regionCenter;
  float cumOffR = 0.0;
  float cumOffL = 0.0;

  for (int i = 1; i <= MAX_ITERS; i++) {
    float fi = float(i);

    int kInt = (i - 1) - ((i - 1) / C) * C;
    float k = float(kInt);
    float e = float(H) - abs((k + 1.0) - float(H));

    float jitterPct = 0.03;

    float rRight = clamp(
      rBase * (1.0 + (hash11(fi * 31.7 + u_seed * 2.1 + 11.0) - 0.5) * 2.0 * jitterPct),
      0.60, 0.98
    );
    float rLeft  = clamp(
      rBase * (1.0 + (hash11(fi * 29.3 + u_seed * 2.1 + 23.0) - 0.5) * 2.0 * jitterPct),
      0.60, 0.98
    );

    float laneScaleR = (e < 0.5) ? 1.0 : pow(rRight, e);
    float laneScaleL = (e < 0.5) ? 1.0 : pow(rLeft,  e);

    float regionR = lanePxBase * laneScaleR + 2.0 * padPxCommon;
    float regionL = lanePxBase * laneScaleL + 2.0 * padPxCommon;

    cumOffR += 0.5 * (prevRegionR + regionR);
    cumOffL += 0.5 * (prevRegionL + regionL);

    prevRegionR = regionR;
    prevRegionL = regionL;

    // Early-exit: check if both lanes are completely off-screen
    float nearR_screen = (cumOffR - regionR * 0.5) * zoomIn - MAX_WOBBLE_PX_SCREEN;
    float nearL_screen = (cumOffL - regionL * 0.5) * zoomIn - MAX_WOBBLE_PX_SCREEN;
    if (nearR_screen > halfW_SCREEN && nearL_screen > halfW_SCREEN) break;

    // Right lane
    addKusamaLaneUnified(
      col, fragZ,
      fi,
      laneCoreCenterX, cumOffR, laneScaleR,
      scaleG, kJ, kWBase, useCursorWobble,
      cursorZ, radiusPx, aaZ, 10.0 + fi,
      t01, wobbleScale,
      mode0K, wRead, cursorOn
    );

    // Left lane
    addKusamaLaneUnified(
      col, fragZ,
      -fi,
      laneCoreCenterX, -cumOffL, laneScaleL,
      scaleG, kJ, kWBase, useCursorWobble,
      cursorZ, radiusPx, aaZ, 20.0 + fi,
      t01, wobbleScale,
      mode0K, wRead, cursorOn
    );
  }

  // Center lane (scale=1.0)
  addKusamaLaneUnified(
    col, fragZ,
    0.0,
    laneCoreCenterX, 0.0, 1.0,
    scaleG, kJ, kWBase, useCursorWobble,
    cursorZ, radiusPx, aaZ, 0.0,
    t01, wobbleScale,
    mode0K, wRead, cursorOn
  );

  return col;
}

// ------------------------------------------------------------
// main
// ------------------------------------------------------------
void main() {
  vec2 uv = v_uv;

  // Unified renderer handles Mode0<->Mode1 via u_mode internally
  vec3 col = modeKusamaUnified01(uv);

  col = pow(col, vec3(0.99));
  gl_FragColor = vec4(col, 1.0);
}
`;

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

// Auto-init ScrollShaderManager
(function () {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (window.ScrollShaderManager) {
                window.ScrollShaderManager.init();
            }
        });
    } else {
        if (window.ScrollShaderManager) {
            window.ScrollShaderManager.init();
        }
    }
})();
