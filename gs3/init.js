(function () {
    function initBG3() {
        if (!window.initBGShaderSystem) {
            console.warn('BG3 init: engine not loaded (initBGShaderSystem missing).');
            return;
        }
        if (!window.BG3_SHADER_CONFIG || !window.BG3_FRAGMENT_SHADER) {
            console.warn('BG3 init: missing BG3_SHADER_CONFIG or BG3_FRAGMENT_SHADER.');
            return;
        }

        window.__BG3_INSTANCE__ = window.initBGShaderSystem({
            canvasId: 'bg-canvas',
            fragmentShader: window.BG3_FRAGMENT_SHADER,
            config: window.BG3_SHADER_CONFIG,
            adapter: window.BG3_DotAdapter
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBG3);
    } else {
        initBG3();
    }
})();