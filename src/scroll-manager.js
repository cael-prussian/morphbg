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
