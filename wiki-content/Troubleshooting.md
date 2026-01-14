# Troubleshooting

Common issues and solutions for morphbg shader system.

## Table of Contents

- [Shader Rendering Issues](#shader-rendering-issues)
- [Performance Problems](#performance-problems)
- [Shader Switching Problems](#shader-switching-problems)
- [Debug Mode](#debug-mode)
- [Browser Compatibility](#browser-compatibility)
- [Getting Help](#getting-help)

---

## Shader Rendering Issues

### Black Screen / No Shader Visible

**Symptoms**: Canvas is black or empty, no WebGL rendering

**Possible Causes & Solutions**:

#### 1. WebGL Not Supported

```javascript
// Test WebGL support
function hasWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
        return false;
    }
}

if (!hasWebGL()) {
    console.error('WebGL not supported');
}
```

**Solutions**:
- Visit [get.webgl.org](https://get.webgl.org/) to check support
- Enable hardware acceleration in browser settings
- Update graphics drivers
- Try a different browser

#### 2. Canvas Element Missing

```html
<!-- Verify this element exists -->
<canvas id="bg-canvas"></canvas>
```

**Test**:
```javascript
const canvas = document.getElementById('bg-canvas');
console.log(canvas); // Should not be null
```

#### 3. Script Loading Order Wrong

**Correct order**:
```html
<!-- 1. Three.js first -->
<script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>

<!-- 2. morphbg bundle -->
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-all.complete.js"></script>
```

#### 4. No Sections with Data Attributes

```html
<!-- Sections must have these attributes -->
<section data-shader-system="gs1" data-shader-preset="HERO">
    <!-- Content -->
</section>
```

#### 5. Shader Compilation Error

Check browser console (F12) for errors like:
- `Failed to compile shader`
- `WebGL: INVALID_OPERATION`
- `GLSL syntax error`

---

### Shader Flickers During Scroll

**Symptoms**: Visual glitches, flashing, or tearing during transitions

**Solutions**:

#### 1. Adjust Transition Speed

For modular loading (manual init), you can adjust fade duration:

```javascript
// In your initialization code
window.ScrollShaderManager.FADE_DURATION = 800; // Increase from default 600ms
```

#### 2. Check for Overlapping Sections

Ensure sections don't conflict:
```html
<!-- ❌ Bad: overlapping heights -->
<section style="height: 150vh" data-shader-system="gs1">...</section>
<section style="margin-top: -50vh" data-shader-system="gs2">...</section>

<!-- ✅ Good: clear boundaries -->
<section style="min-height: 100vh" data-shader-system="gs1">...</section>
<section style="min-height: 100vh" data-shader-system="gs2">...</section>
```

#### 3. Disable Elastic Scrolling (iOS)

```css
body {
    overscroll-behavior: none;
    -webkit-overflow-scrolling: touch;
}
```

---

### Parameters Don't Work

**Symptoms**: Data attributes don't affect shader appearance

**Diagnostic Steps**:

1. **Verify attributes are set correctly**:
```javascript
const section = document.querySelector('section');
console.log(section.dataset); // Check all data- attributes
```

2. **Check attribute names match shader expectations**:
```html
<!-- GS1 example -->
<section 
    data-shader-system="gs1" 
    data-shader-preset="HERO"
    data-topo-bands="20"
    data-warp-intensity="0.8">
```

3. **Enable debug mode to see parameter values** (see [Debug Mode](#debug-mode) below)

---

## Performance Problems

### Low FPS (Below 30fps)

**Diagnostic**:

Enable [Debug Mode](#debug-mode) to see current FPS.

**Solutions by Shader**:

#### GS1 (Topographic Flow)

Reduce complexity:
```html
<section 
    data-shader-system="gs1" 
    data-shader-preset="READ"           <!-- Use READ instead of HERO -->
    data-topo-bands="10"            <!-- Fewer bands (try 10-15 instead of 30+) -->
    data-warp-intensity="0.3">      <!-- Lower warp (try 0.3 instead of 1.0) -->
```

#### GS2 (Dynamic Warp)

Optimize parameters:
```html
<section 
    data-shader-system="gs2" 
    data-shader-preset="READ"           <!-- Use READ preset -->
    data-calm="0.8"                 <!-- Higher calm value -->
    data-grid-subdivision-depth="0.5"> <!-- Lower subdivision -->
```

#### GS3 (Dot Field)

Simplify rendering:
```html
<section 
    data-shader-system="gs3" 
    data-shader-preset="READ"           <!-- Use READ preset -->
    data-k-wobble="0.3"             <!-- Lower wobble -->
    data-k-grid="0.4">              <!-- Fewer grid lanes -->
```

**General Performance Tips**:
- Use `READ` preset for content/reading sections
- Use `AMBIENT` for moderate motion
- Reserve `HERO` for hero sections only
- On mobile, default to `READ` preset

---

### Performance Degrades Over Time

**Symptoms**: Starts smooth, gets slower after minutes

**Solutions**:

#### 1. Check for Memory Leaks

If using manual shader switching:
```javascript
// Ensure proper cleanup
if (instance.stop) instance.stop();
if (instance.dispose) instance.dispose();
```

#### 2. Pause When Tab Hidden

```javascript
document.addEventListener('visibilitychange', () => {
    const instance = window.ScrollShaderManager.getInstance();
    if (document.hidden) {
        if (instance && instance.stop) instance.stop();
    } else {
        // Will auto-restart when tab becomes visible
        window.ScrollShaderManager.init();
    }
});
```

---

### High Battery/CPU Usage

**Solutions**:

#### 1. Use Lower-Motion Presets

```html
<!-- Use READ preset globally for better battery life -->
<section data-shader-system="gs1" data-shader-preset="READ">
```

#### 2. Detect Reduced Motion Preference

```javascript
// Respect user's motion preferences
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Force all sections to READ
    document.querySelectorAll('section[data-shader-preset]').forEach(section => {
        section.setAttribute('data-shader-preset', 'READ');
    });
}
```

#### 3. Pause on Low Battery (Mobile)

```javascript
// Experimental: Battery API
if ('getBattery' in navigator) {
    navigator.getBattery().then(battery => {
        if (battery.level < 0.2) { // Below 20%
            console.log('Low battery - using minimal motion');
            // Switch to READ presets
        }
    });
}
```

---

## Shader Switching Problems

### Shader Switch Causes Flash

**Symptoms**: Canvas goes white/black briefly during transition

**This is expected behavior** due to single-canvas architecture:
1. Fade out old shader (300ms)
2. Dispose and reinitialize
3. Fade in new shader (300ms)

**Mitigation**:
```css
/* Use darker page background to minimize flash */
body {
    background: #000;
}

/* Ensure sections have neutral backgrounds */
section {
    background: rgba(0, 0, 0, 0.3);
}
```

---

### Previous Shader Still Visible

**Symptoms**: Ghosting or overlay of old shader

**Solution**: Ensure proper disposal (usually automatic, but check):

```javascript
// If using manual control
const manager = window.ScrollShaderManager;
manager.switchTo('gs2'); // Automatically disposes previous shader
```

---

## Debug Mode

Enable debug mode to diagnose issues and monitor performance.

### Enabling Debug Mode

For manual initialization:

```javascript
window.__INSTANCE__ = window.initBGShaderSystem({
    canvasId: 'bg-canvas',
    fragmentShader: window.BG_FRAGMENT_SHADER,
    config: window.BG_SHADER_CONFIG,
    adapter: window.BG_TopoReadAdapter,
    debug: true  // Enable debug mode
});
```

### Debug Features

#### 1. FPS Counter

A live FPS counter appears in the top-left corner showing:
- **Current FPS** - Actual rendering framerate
- **Target FPS** - Desired FPS based on preset
- **DPR** - Current device pixel ratio

**Color coding:**
- 🟢 **Green** - Performance good (≥80% of target)
- 🟡 **Yellow** - Performance degraded (50-80% of target)
- 🔴 **Red** - Performance poor (<50% of target)

#### 2. Console Logging

Debug mode logs key events:

**Initialization:**
```
[morphbg] Debug mode enabled
[morphbg] Config: {...}
[morphbg] Adapter: BG_TopoReadAdapter
```

**Scroll events:**
```
[morphbg] Computing scroll targets
[morphbg] Section weight: 0.850 - preset: HERO
[morphbg] Final targets: {spatial: 0.89, temporal: 0.64, ...}
```

### Debug on Localhost Only

```javascript
const isDev = window.location.hostname === 'localhost' || 
              window.location.hostname === '127.0.0.1';

window.__INSTANCE__ = window.initBGShaderSystem({
    canvasId: 'bg-canvas',
    fragmentShader: window.BG_FRAGMENT_SHADER,
    config: window.BG_SHADER_CONFIG,
    adapter: window.BG_TopoReadAdapter,
    debug: isDev  // Only enable locally
});
```

### Custom FPS Counter Styling

```css
#morphbg-fps-counter {
    top: 10px !important;
    right: 10px !important;  /* Move to top-right */
    left: auto !important;
    background: rgba(0, 0, 0, 0.9) !important;
    font-size: 14px !important;
}
```

### Accessing Debug Info Programmatically

```javascript
const instance = window.__INSTANCE__;

// Check uniforms
console.log('Spatial motion:', instance.material.uniforms.u_spatialMotion.value);
console.log('Temporal motion:', instance.material.uniforms.u_temporalMotion.value);

// Force recalculation
instance.computeScrollTargets();
```

---

## Browser Compatibility

### Chrome - ✅ Fully Supported

No known issues.

### Firefox - ✅ Supported

**Potential issues**:
- Slightly different WebGL precision
- May need to adjust shader precision hints

### Safari - ✅ Supported

**Potential issues**:
- WebGL 1.0 differences
- May need CSS prefixes for some features

### Mobile Browsers

**Performance tips**:
- Default to `READ` preset
- Use lower device pixel ratio
- Test on actual devices

```javascript
const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
if (isMobile) {
    // Use READ preset on mobile
    document.querySelectorAll('section').forEach(s => {
        s.setAttribute('data-shader-preset', 'READ');
    });
}
```

---

## Getting Help

### Diagnostic Checklist

Before asking for help:

1. ✅ Check browser console for errors (F12)
2. ✅ Verify WebGL support: [get.webgl.org](https://get.webgl.org/)
3. ✅ Test with complete bundle (simplest setup)
4. ✅ Enable debug mode
5. ✅ Check network tab for failed script loads

### Useful Console Commands

```javascript
// Check if morphbg loaded
console.log(window.initBGShaderSystem); // Should be a function

// Check if scroll manager loaded
console.log(window.ScrollShaderManager); // Should be an object

// Get current shader
console.log(ScrollShaderManager.getCurrentShader());

// Get instance
const instance = ScrollShaderManager.getInstance();
console.log(instance);

// Check section attributes
document.querySelectorAll('section[data-shader-system]').forEach(s => {
    console.log(s.dataset);
});

// Check WebGL context
const canvas = document.getElementById('bg-canvas');
const gl = canvas.getContext('webgl');
console.log('WebGL context:', gl);
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Cannot read property 'uniforms' of undefined` | Instance not initialized | Check if scripts loaded correctly |
| `WebGL: INVALID_OPERATION` | Shader switch issue | Usually auto-handled, check console for details |
| `Failed to compile shader` | GLSL syntax error | Check browser/device WebGL support |
| `THREE is not defined` | Three.js not loaded | Load Three.js before morphbg |
| `computeScrollTargets is not a function` | Wrong instance type | Ensure using correct shader instance |

### Report an Issue

If problems persist:

1. **GitHub Issues**: [cael-prussian/morphbg/issues](https://github.com/cael-prussian/morphbg/issues)
2. **Include**:
   - Browser and version
   - Console errors (screenshot)
   - Minimal reproduction code
   - Debug mode output

---

## Related Documentation

- [Installation](Installation) - Setup and installation
- [Configuration](Configuration) - Parameter reference
- [Shader Systems](Shader-Systems) - GS1, GS2, GS3 details
- [Bundle Options](Bundle-Options) - Choose your deployment approach
