/**
 * Custom Shader - Initialization Template
 * 
 * Simple wrapper that connects everything together.
 * Minimal code required - just update the names.
 */

(function() {
    // Wait for engine to be available
    if (typeof window.initBGShaderSystem === 'function') {
        
        /**
         * Initialize your custom shader
         * 
         * @param {string} canvasId - ID of canvas element (default: 'bg-canvas')
         * @param {object} opts - Options object
         * @param {boolean} opts.debug - Enable debug logging
         * @returns {object} Shader system instance
         */
        window.initCustomShader = function(canvasId, opts = {}) {
            return window.initBGShaderSystem({
                canvasId: canvasId || 'bg-canvas',
                config: window.CUSTOM_SHADER_CONFIG,
                fragmentShader: window.BG_CUSTOM_SHADER_FRAG,
                adapter: window.CUSTOM_SHADER_ADAPTER,
                debug: opts.debug || false
            });
        };
        
        console.log('Custom shader initialized. Call window.initCustomShader("bg-canvas") to start.');
    } else {
        console.error('morphbg engine not found. Make sure engine.js is loaded first.');
    }
})();

// ==================================================================
// USAGE
// ==================================================================

/*
In your HTML:

<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; }
        #bg-canvas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
        }
        section {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
    </style>
</head>
<body>
    <canvas id="bg-canvas"></canvas>
    
    <section data-shader-preset="HERO">
        <h1>My Custom Shader</h1>
    </section>
    
    <section data-shader-preset="AMBIENT" data-density="25">
        <h2>Content Section</h2>
    </section>
    
    <section data-shader-preset="READ">
        <p>Reading section</p>
    </section>
    
    <!-- Load Three.js -->
    <script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
    
    <!-- Load morphbg engine -->
    <script src="path/to/engine.js"></script>
    
    <!-- Load your shader files -->
    <script src="config.js"></script>
    <script src="shader.js"></script>
    <script src="adaptor.js"></script>
    <script src="init.js"></script>
    
    <!-- Initialize -->
    <script>
        window.initCustomShader('bg-canvas', { debug: true });
    </script>
</body>
</html>
*/
