(function () {
    function initBG1() {
        if (!window.initBGShaderSystem) {
            console.warn('GS1 init: engine not loaded (initBGShaderSystem missing).');
            return;
        }
        if (!window.BG_SHADER_CONFIG || !window.BG_FRAGMENT_SHADER) {
            console.warn('GS1 init: missing BG_SHADER_CONFIG or BG_FRAGMENT_SHADER.');
            return;
        }

        window.__BG1_INSTANCE__ = window.initBGShaderSystem({
            canvasId: 'bg-canvas',
            fragmentShader: window.BG_FRAGMENT_SHADER,
            config: window.BG_SHADER_CONFIG,
            adapter: window.BG_TopoReadAdapter
        });
    }

    // Run after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBG1);
    } else {
        initBG1();
    }
})();
