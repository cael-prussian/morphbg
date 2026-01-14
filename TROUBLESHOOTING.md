# Troubleshooting Guide

Common issues and solutions for the cael_gs shader system.

## Table of Contents

- [Shader Rendering Issues](#shader-rendering-issues)
- [Performance Problems](#performance-problems)
- [Configuration Panel Issues](#configuration-panel-issues)
- [Shader Switching Problems](#shader-switching-problems)
- [Browser Compatibility](#browser-compatibility)
- [Development Issues](#development-issues)

---

## Shader Rendering Issues

### Problem: Black screen / No shader visible

**Symptoms**: Canvas is black or empty, no WebGL rendering

**Possible Causes**:

1. **WebGL not supported**
   ```
   Solution: Check browser WebGL support
   - Visit: https://get.webgl.org/
   - Enable hardware acceleration in browser settings
   ```

2. **Canvas element missing**
   ```
   Solution: Verify HTML has canvas element
   <canvas id="bg-canvas"></canvas>
   ```

3. **Script loading order wrong**
   ```
   Solution: Load scripts in this order:
   1. gs-engine.js
   2. Shader config/shader/adaptor/init files (gs1, gs2, gs3)
   3. scroll-shader-manager-simple.js
   4. Your initialization code
   ```

4. **Shader compilation error**
   ```
   Solution: Check browser console for WebGL errors
   - Look for "Failed to compile shader" messages
   - Check GLSL syntax in shader.js files
   ```

5. **No sections with shader data attributes**
   ```html
   Solution: Add data-shader-system to sections
   <div class="section" data-shader-system="gs3" data-shader-mode="kusama-infinite">
   ```

### Problem: Shader flickers during scroll

**Symptoms**: Visual glitches, flashing, or tearing during transitions

**Solutions**:

1. **Reduce transition speed** in scroll-shader-manager-simple.js:
   ```javascript
   const FADE_DURATION = 600; // Try increasing to 800-1000ms
   ```

2. **Check for overlapping sections**:
   ```
   Ensure sections don't have conflicting data-shader-system values
   ```

3. **Disable elastic scrolling effects** (iOS):
   ```css
   body {
       overscroll-behavior: none;
   }
   ```

### Problem: Shader displays but parameters don't work

**Symptoms**: Sliders move but shader appearance doesn't change

**Diagnostic Steps**:

1. **Open browser console** and check for errors
2. **Verify data attributes** match shader expectations:
   ```javascript
   // Check section attributes
   console.log(document.querySelector('.section').dataset);
   ```

3. **Test individual shader** using test pages:
   ```
   test-gs1.html, test-gs2.html, or test-gs3.html
   ```

4. **Verify adapter is reading attributes**:
   ```javascript
   // In adaptor.js accumulateFromSection()
   console.log('Reading attributes:', section.dataset);
   ```

---

## Performance Problems

### Problem: Low FPS (below 30fps)

**Diagnostic**:

1. **Check current FPS**:
   ```
   - Press 'F' key in test pages
   - Or add FPS counter to your page (see test-gs1.html)
   ```

2. **Identify bottleneck shader**:
   ```
   Test each shader individually:
   - GS1 target: 50-60 FPS
   - GS2 target: 50-60 FPS
   - GS3 target: 40-50 FPS
   ```

**Solutions by Shader**:

**GS1 (Topographic)**:
- Reduce `data-topo-bands` (try 10-15 instead of 30+)
- Lower `data-warp-intensity` (try 0.5 instead of 1.0)
- Use READ preset for content sections

**GS2 (Glitch)**:
- Increase `data-calm` value (try 0.7+ for calmer motion)
- Lower `data-grid-subdivision-depth` (try 0.5-0.8)
- Reduce `data-shard-speed` if using vector-glitch mode
- Use READ preset for content sections

**GS3 (Dot Field)**:
- Lower `data-k-wobble` (try 0.3-0.5 instead of 0.9+)
- Reduce `data-k-grid` (try 0.4-0.5 for fewer lanes)
- Use kusama-infinite mode instead of octopus-legs (simpler)
- Consider reducing MAX_ITERS in shader.js (line ~400):
  ```javascript
  const int MAX_ITERS = 32; // Instead of 64
  ```
- Use READ preset for content sections

### Problem: Performance degrades over time

**Symptoms**: Starts smooth, gets slower after minutes of use

**Possible Causes**:

1. **Memory leak during shader switches**
   ```javascript
   Solution: Verify cleanup in scroll-shader-manager-simple.js
   - Check stop() method is called
   - Verify dispose() cleans up all resources
   ```

2. **Accumulating event listeners**
   ```javascript
   Solution: Remove old listeners before adding new ones
   slider.removeEventListener('input', oldHandler);
   slider.addEventListener('input', newHandler);
   ```

3. **Browser tab in background**
   ```
   Solution: This is normal - browser throttles background tabs
   Return to tab to restore performance
   ```

### Problem: High battery/CPU usage

**Solutions**:

1. **Enable FPS cap** in gs-engine.js:
   ```javascript
   // Line ~100
   const TARGET_FPS = 30; // Lower from 60
   ```

2. **Use static presets** more often:
   ```
   - Increase use of READ preset (minimal motion)
   - Reduce wobble/calm parameters globally
   ```

3. **Implement visibility detection**:
   ```javascript
   document.addEventListener('visibilitychange', () => {
       if (document.hidden) {
           instance.freezeTime();
       } else {
           instance.unfreezeTime();
       }
   });
   ```

---

## Configuration Panel Issues

### Problem: Panel doesn't show

**Symptoms**: Pressing Ctrl+K does nothing, panel never appears

**Diagnostic**:

1. **Check if ConfigFormManager exists**:
   ```javascript
   console.log(window.ConfigFormManager); // Should not be undefined
   ```

2. **Check panel HTML exists**:
   ```javascript
   console.log(document.getElementById('shader-config-panel'));
   ```

3. **Check for JavaScript errors** in console

**Solutions**:

1. **Ensure config panel HTML is in page**:
   ```html
   <div id="shader-config-panel" class="config-panel">
       <!-- Controls here -->
   </div>
   ```

2. **Verify ConfigFormManager is initialized**:
   ```javascript
   // Should be at end of demo.html
   if (document.readyState === 'loading') {
       document.addEventListener('DOMContentLoaded', () => ConfigFormManager.init());
   } else {
       ConfigFormManager.init();
   }
   ```

### Problem: Wrong controls shown for active shader

**Symptoms**: GS3 controls visible when GS1 is active

**Solution**:

Ensure ScrollShaderManager calls `showControlsFor()`:
```javascript
// In scroll-shader-manager-simple.js
if (window.ConfigFormManager) {
    window.ConfigFormManager.showControlsFor(shaderId, instance, section);
}
```

### Problem: Slider changes don't affect shader

**Diagnostic**:

1. **Check slider has correct data attributes**:
   ```html
   <input type="range" 
          data-uniform="calm" 
          data-attr="data-calm">
   ```

2. **Check sections have matching attributes**:
   ```html
   <div class="section" data-calm="0.45">
   ```

3. **Verify computeScrollTargets() is called**:
   ```javascript
   // In ConfigFormManager.updateParameter()
   if (this.currentInstance && this.currentInstance.computeScrollTargets) {
       this.currentInstance.computeScrollTargets();
   }
   ```

### Problem: Slider values not saved

**Symptoms**: Settings reset on page reload

**Solution**:

Check localStorage functionality:
```javascript
// Test in console
localStorage.setItem('test', 'value');
console.log(localStorage.getItem('test')); // Should show 'value'
```

If localStorage is disabled:
- Check browser privacy settings
- Check if in private/incognito mode
- Check browser permissions

---

## Shader Switching Problems

### Problem: WebGL errors during switch

**Error Messages**:
```
WebGL: INVALID_OPERATION: uniform2f: location is not from the associated program
WebGL: too many errors, no more errors will be reported
```

**Solution**: Ensure proper cleanup sequence

This should already be fixed in current version, but verify:

1. **Check stop() method in gs-engine.js** (line ~180):
   ```javascript
   stop() {
       if (this.animationId) {
           cancelAnimationFrame(this.animationId);
           this.animationId = null;
       }
   }
   ```

2. **Check manager calls stop() before dispose()**:
   ```javascript
   // In scroll-shader-manager-simple.js
   if (currentInstance && typeof currentInstance.stop === 'function') {
       currentInstance.stop();
   }
   if (currentInstance && typeof currentInstance.dispose === 'function') {
       currentInstance.dispose();
   }
   ```

### Problem: Shader switch causes brief flash

**Symptoms**: Canvas goes white/black for a moment during transition

**This is expected behavior** - single canvas approach requires:
1. Fade out old shader (300ms)
2. Dispose and reinitialize (brief moment)
3. Fade in new shader (300ms)

To minimize flash:
- Keep transition durations short (300ms is optimal)
- Ensure sections have neutral background colors
- Consider using darker page backgrounds

### Problem: Previous shader still visible after switch

**Symptoms**: Overlay or ghosting of old shader

**Solution**:

1. **Verify canvas clear** in gs-engine.js:
   ```javascript
   // In render() method
   gl.clear(gl.COLOR_BUFFER_BIT);
   ```

2. **Check disposal cleans up textures**:
   ```javascript
   // In dispose() method
   if (this.texture1) gl.deleteTexture(this.texture1);
   if (this.texture2) gl.deleteTexture(this.texture2);
   ```

---

## Browser Compatibility

### Chrome (Desktop) - ✅ Fully Supported

**Known Issues**: None

### Firefox (Desktop) - Expected to Work

**Potential Issues**:
- Slightly different WebGL precision
- May need to adjust shader precision hints

**Test**: Load demo.html and verify rendering

### Safari (Desktop) - Expected to Work

**Potential Issues**:
- WebGL 1.0 differences
- May need Safari-specific CSS prefixes

**Test**: Load demo.html and check console for errors

### Mobile Browsers - Expected to Work

**Potential Issues**:
- Lower performance on older devices
- Touch event handling may need adjustment
- Use READ presets by default on mobile

**Recommendations**:
```javascript
// Detect mobile and adjust DPR
const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
const dpr = isMobile ? 1.0 : window.devicePixelRatio;
```

---

## Development Issues

### Problem: Changes to shader.js don't show

**Solution**: Hard refresh browser
- Chrome/Firefox: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Safari: `Cmd+Option+R`
- Or disable cache in DevTools Network tab

### Problem: Can't test with file:// protocol

**Symptoms**: CORS errors when using fetch() or loading files

**Solution**: Use local server

**Option 1 - Python**:
```bash
python -m http.server 8000
# Then open http://localhost:8000/demo.html
```

**Option 2 - Node.js**:
```bash
npx http-server -p 8000
# Then open http://localhost:8000/demo.html
```

**Option 3 - VS Code**:
```
Install "Live Server" extension
Right-click demo.html → "Open with Live Server"
```

### Problem: Adding new parameter doesn't work

**Checklist**:

1. ✅ Add uniform to shader.js:
   ```glsl
   uniform float u_myParam;
   ```

2. ✅ Add to adapter extendUniforms():
   ```javascript
   uniforms.myParam = 0.5;
   ```

3. ✅ Read in accumulateFromSection():
   ```javascript
   const val = parseFloat(section.getAttribute('data-my-param')) || 0.5;
   ```

4. ✅ Apply in applyFrameUniforms():
   ```javascript
   uniforms.myParam = this.acc.myParam;
   ```

5. ✅ Add to HTML sections:
   ```html
   data-my-param="0.5"
   ```

6. ✅ Add to config panel:
   ```html
   <input type="range" min="0" max="1" step="0.01" 
          data-uniform="myParam" data-attr="data-my-param">
   ```

### Problem: New shader not showing up

**Checklist**:

1. ✅ Created gs4/ directory with all files
2. ✅ Loaded scripts in HTML (config, shader, adaptor, init)
3. ✅ Added sections with data-shader-system="gs4"
4. ✅ Adapter implements all required methods
5. ✅ Init stores instance as window.__BG4_INSTANCE__
6. ✅ Config defines modes and presets
7. ✅ Added controls to config panel

---

## Getting Help

If issues persist:

1. **Check console for errors** (F12 in most browsers)
2. **Test with individual test pages** (test-gs1/2/3.html)
3. **Review REFACTOR_PLAN.md** for architecture details
4. **Check ADAPTER_INTERFACE.md** for adapter development
5. **Review parameter guides** (GS1/2/3_PARAMETER_GUIDE.md)

### Useful Console Commands

```javascript
// Check shader instance
console.log(window.__BG3_INSTANCE__);

// Check current shader in manager
console.log(ScrollShaderManager.getCurrentShader());

// Check section attributes
console.log(document.querySelector('.section').dataset);

// Force shader recomputation
window.__BG3_INSTANCE__.computeScrollTargets();

// Check WebGL context
console.log(document.getElementById('bg-canvas').getContext('webgl'));

// Toggle config panel
window.ConfigFormManager.togglePanel();
```

---

**Last Updated**: January 2026
