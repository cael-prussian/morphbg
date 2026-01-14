(function () {
    function initBG2() {
        if (!window.initBGShaderSystem) {
            console.warn('BG2 init: engine not loaded (initBGShaderSystem missing).');
            return;
        }
        if (!window.BG2_SHADER_CONFIG || !window.BG2_FRAGMENT_SHADER) {
            console.warn('BG2 init: missing BG2_SHADER_CONFIG or BG2_FRAGMENT_SHADER.');
            return;
        }

        // Optional: adapter (safe if missing)
        const adapter = window.BG2_TopoReadAdapter || null;

        window.__BG2_INSTANCE__ = window.initBGShaderSystem({
            canvasId: 'bg-canvas',
            fragmentShader: window.BG2_FRAGMENT_SHADER,
            config: window.BG2_SHADER_CONFIG,
            adapter: window.BG2_AllModesAdapter
        });
    }

    // Run after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBG2);
    } else {
        initBG2();
    }
})();