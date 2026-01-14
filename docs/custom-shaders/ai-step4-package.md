# Step 4: Init & Demo Generation

**AI Task:** Generate initialization wrapper and complete HTML demo.

---

## Input From Developer

- All files from Steps 1-3
- `templates/init.template.js` file

---

## AI Must Generate

### File 1: init.js

```javascript
window.initMyShader = function(canvasId, opts = {}) {
    if (!window.initBGShaderSystem) {
        console.error('Engine not loaded (initBGShaderSystem missing)');
        return null;
    }
    
    return window.initBGShaderSystem({
        canvasId: canvasId,
        fragmentShader: window.MY_SHADER_FRAGMENT,
        config: {
            modes: { HERO: 0.8, AMBIENT: 0.5, READ: 0.2 },
            presets: window.MY_SHADER_CONFIG,
            transitionVh: 0.5,
            smoothSpeed: 2.0
        },
        adapter: window.MY_SHADER_ADAPTER,
        debug: opts.debug || false
    });
};
```

**CRITICAL:** The config object must have this structure:
- `modes`: Map of preset names to mode values (0.0-1.0)
- `presets`: Your preset definitions (HERO/AMBIENT/READ)
- `transitionVh`: Viewport height for transitions (default 0.5)
- `smoothSpeed`: Smoothing speed (default 2.0)

### File 2: demo.html

Complete HTML page with:
- Fixed background canvas
- Multiple sections with different presets
- Demonstrates HERO → AMBIENT → READ transitions
- Styled content that's readable
- Proper script loading order

---

## HTML Structure Required

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shader Name Demo</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui; overflow-x: hidden; }
        #bg-canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; }
        section { min-height: 100vh; padding: 4rem 2rem; display: flex; align-items: center; justify-content: center; }
        .content { max-width: 800px; background: rgba(255,255,255,0.95); padding: 3rem; border-radius: 1rem; }
    </style>
</head>
<body>
    <canvas id="bg-canvas"></canvas>
    
    <section data-shader-preset="HERO">
        <div class="content">
            <h1>Hero Section</h1>
            <p>Dramatic, full motion background</p>
        </div>
    </section>
    
    <section data-shader-preset="AMBIENT">
        <div class="content">
            <h2>Content Section</h2>
            <p>Balanced, pleasant background</p>
        </div>
    </section>
    
    <section data-shader-preset="READ">
        <div class="content">
            <h2>Reading Content</h2>
            <p>Subtle, text-friendly background</p>
        </div>
    </section>

    <!-- Dependencies - CRITICAL: Load in this exact order -->
    <script src="../../build/three.min.js"></script>
    <script src="../../src/engine.js"></script>
    
    <!-- Shader files -->
    <script src="shader.js"></script>
    <script src="config.js"></script>
    <script src="adaptor.js"></script>
    <script src="init.js"></script>
    
    <script>
        // Initialize shader
        window.initMyShader('bg-canvas', { debug: false });
    </script>
</body>
</html>
```

---

## Critical: Engine API Pattern

**ALWAYS use `window.initBGShaderSystem()` - NOT `morphbg.Engine`**

The engine exposes a global function, not a class:
```javascript
// ✅ CORRECT
window.initBGShaderSystem({ canvasId, fragmentShader, config, adapter })

// ❌ WRONG - this API doesn't exist
new morphbg.Engine(canvas)
engine.useShader(...)
```

**Config structure:**
```javascript
config: {
    modes: { HERO: 0.8, AMBIENT: 0.5, READ: 0.2 },  // Required
    presets: YOUR_PRESET_OBJECT,                     // Required
    transitionVh: 0.5,                               // Optional
    smoothSpeed: 2.0                                 // Optional
}
```

---

## Validation

Open demo.html in browser and check:
- [ ] No "morphbg is not defined" error
- [ ] No "initBGShaderSystem is not defined" error
- [ ] Background renders immediately
- [ ] Effect animates in HERO section
- [ ] Scrolling triggers smooth transitions
- [ ] READ section is noticeably calmer
- [ ] No other console errors
- [ ] Runs at 60fps

Enable debug mode to see:
- Section weights
- Preset blending
- Uniform values updating

---

## Optional: Custom Data Attributes

Can add per-section overrides:
```html
<section 
    data-shader-preset="HERO"
    data-custom-param-1="50"
    data-custom-color="[1.0, 0.0, 0.5]">
</section>
```

Adapter will read these if `dataAttr` is defined.
