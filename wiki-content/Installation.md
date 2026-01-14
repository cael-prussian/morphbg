# Installation

Get morphbg running on your website using jsDelivr CDN.

## Quick Start

Add morphbg to any HTML page with just 2 script tags:

```html
<!-- Add before closing </body> tag -->
<script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-all.complete.js"></script>
```

That's it! The shader will auto-initialize and respond to your section attributes.

---

## Complete Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My morphbg Site</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: sans-serif; }
        
        /* Position canvas as background */
        #bg-canvas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
        }
        
        /* Style your sections */
        section {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }
        
        h1 {
            color: white;
            font-size: 4rem;
            text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
        }
    </style>
</head>
<body>
    <!-- Canvas element (required) -->
    <canvas id="bg-canvas"></canvas>
    
    <!-- Your content sections -->
    <section data-shader-system="gs1" data-shader-preset="HERO">
        <h1>Welcome</h1>
    </section>
    
    <section data-shader-system="gs2" data-shader-preset="AMBIENT">
        <h1>About</h1>
    </section>
    
    <section data-shader-system="gs3" data-shader-preset="READ">
        <h1>Contact</h1>
    </section>
    
    <!-- Load morphbg (before closing body tag) -->
    <script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-all.complete.js"></script>
</body>
</html>
```

---

## jsDelivr CDN URLs

### Using GitHub Releases (Recommended)

```html
<!-- Complete bundle (all shaders) -->
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-all.complete.js"></script>

<!-- Engine + Manager bundle -->
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-engine.bundle.js"></script>

<!-- Individual shader bundles -->
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-gs1.bundle.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-gs2.bundle.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-gs3.bundle.js"></script>
```

### Version Pinning

Always specify a version tag for production:

```html
<!-- ✅ Good: Version pinned -->
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-all.complete.js"></script>

<!-- ❌ Avoid: No version (may break with updates) -->
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg/dist/morphbg-all.complete.js"></script>
```

**Version formats:**
- `@1.0.0` - Exact version (recommended for production)
- `@1.0` - Latest patch version (e.g., 1.0.x)
- `@1` - Latest minor version (e.g., 1.x.x)
- No version - Latest commit (not recommended)

---

## Installation Methods

### Method 1: Complete Bundle (Simplest)

Best for: Most websites, multiple shaders

```html
<script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-all.complete.js"></script>
```

**Includes**: Engine, Scroll Manager, GS1, GS2, GS3  
**Size**: ~28KB gzipped  
**Auto-init**: Yes

### Method 2: Single Shader

Best for: One shader throughout site, optimized file size

```html
<script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-engine.bundle.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-gs2.bundle.js"></script>
```

**Includes**: Engine, Scroll Manager, one shader  
**Size**: ~17KB gzipped  
**Auto-init**: Yes

### Method 3: Custom Combination

Best for: Specific shader combinations, file size optimization

```html
<script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-engine.bundle.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-gs1.bundle.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-gs3.bundle.js"></script>
```

**Includes**: Engine, Scroll Manager, selected shaders  
**Size**: ~21KB gzipped (GS1+GS3 example)  
**Auto-init**: Yes

### Method 4: Manual (Advanced)

Best for: Custom canvas ID, debug mode, manual control

```html
<script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/src/engine.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/src/scroll-manager.js"></script>

<!-- Load shader source files -->
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/src/shaders/gs1/config.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/src/shaders/gs1/shader.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/src/shaders/gs1/adaptor.js"></script>

<!-- Manual initialization -->
<script>
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ScrollShaderManager.init();
    });
} else {
    ScrollShaderManager.init();
}
</script>
```

**Includes**: Unbundled source files  
**Size**: Depends on shaders loaded  
**Auto-init**: No (manual)

---

## Required HTML Elements

### Canvas Element

morphbg requires a canvas element with the ID `bg-canvas`:

```html
<canvas id="bg-canvas"></canvas>
```

**Styling** (recommended):

```css
#bg-canvas {
    position: fixed;      /* Stay in place during scroll */
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;         /* Behind all content */
}
```

### Content Sections

Add data attributes to your sections to control shader behavior:

```html
<section 
    data-shader-system="gs1|gs2|gs3"  
    data-shader-preset="HERO|AMBIENT|READ">
    <!-- Your content -->
</section>
```

**Required attributes:**
- `data-shader-system` - Which shader to use (`gs1`, `gs2`, or `gs3`)
- `data-shader-preset` - Motion preset (`HERO`, `AMBIENT`, or `READ`)

See [Configuration](Configuration) for all available attributes.

---

## Browser Requirements

### Minimum Requirements

- **WebGL 1.0** support (available in all modern browsers)
- **ES6 JavaScript** support
- **Hardware acceleration** enabled

### Supported Browsers

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome | ✅ 60+ | ✅ 60+ |
| Firefox | ✅ 55+ | ✅ 55+ |
| Safari | ✅ 11+ | ✅ 11+ |
| Edge | ✅ 79+ | ✅ 79+ |

### Checking WebGL Support

Test if the user's browser supports WebGL:

```javascript
function hasWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
        return false;
    }
}

if (!hasWebGL()) {
    console.warn('WebGL not supported - morphbg will not work');
}
```

---

## Performance Considerations

### File Sizes (Gzipped)

| Component | Size |
|-----------|------|
| Three.js (CDN) | ~3KB |
| Complete bundle | ~25KB |
| Engine + Manager | ~7KB |
| GS1 shader | ~6KB |
| GS2 shader | ~7KB |
| GS3 shader | ~5KB |

### Loading Strategy

**Option 1: Synchronous** (simpler, blocks rendering)
```html
<!-- In <head> or before </body> -->
<script src="three.min.js"></script>
<script src="morphbg-all.complete.js"></script>
```

**Option 2: Async** (faster page load, requires init check)
```html
<script src="three.min.js" async></script>
<script src="morphbg-all.complete.js" async></script>

<script>
// Wait for both scripts to load
window.addEventListener('load', () => {
    if (window.ScrollShaderManager) {
        ScrollShaderManager.init();
    }
});
</script>
```

**Option 3: Deferred** (parallel download, execute in order)
```html
<script src="three.min.js" defer></script>
<script src="morphbg-all.complete.js" defer></script>
```

### Mobile Optimization

For better mobile performance:

```html
<script>
// Detect mobile devices
const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

// Use lower DPR on mobile
if (isMobile) {
    // morphbg automatically adapts, but you can force it:
    // Set data-shader-preset="READ" on mobile sections for better performance
}
</script>
```

---

## Troubleshooting Installation

### Canvas Not Showing

1. Check canvas element exists: `document.getElementById('bg-canvas')`
2. Verify WebGL support: Visit [get.webgl.org](https://get.webgl.org/)
3. Check browser console for errors (F12)

### Shaders Not Loading

1. Verify script URLs are correct
2. Check network tab in DevTools (F12 → Network)
3. Ensure version tag exists on GitHub

### No Shader Switching

1. Verify sections have `data-shader-system` attributes
2. Check if ScrollShaderManager initialized: `console.log(window.ScrollShaderManager)`
3. For manual mode, ensure you called `ScrollShaderManager.init()`

### CORS Errors

jsDelivr automatically handles CORS - if you see CORS errors:
- Ensure you're using jsDelivr URLs (not direct GitHub URLs)
- Check your jsDelivr URL format is correct

---

## Next Steps

- Choose your bundle approach: [Bundle Options](Bundle-Options)
- Configure shader behavior: [Configuration](Configuration)
- Learn about shader systems: [Shader Systems](Shader-Systems)
- Customize parameters: [GS1](Shader-Systems#gs1), [GS2](Shader-Systems#gs2), [GS3](Shader-Systems#gs3)

---

## Version History

- **v1.0.0** (2026-01) - Initial release
  - Complete bundle approach
  - Modular shader loading
  - Automatic shader switching
  - Three shader systems (GS1, GS2, GS3)
