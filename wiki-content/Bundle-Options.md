# Bundle Options

morphbg provides flexible deployment options to match your project's needs - from a simple all-in-one bundle to modular shader loading.

## Quick Reference

| Approach | Scripts Loaded | Total Size (gzipped) | Best For |
|----------|----------------|---------------------|----------|
| **Complete Bundle** | 2 scripts | ~28KB | Simplest setup, all features |
| **Single Shader** | 3 scripts | ~15KB | One shader throughout site |
| **Multiple Shaders** | 4-5 scripts | ~24-30KB | Custom combinations |

---

## Option 1: Complete Bundle (Recommended)

**Files**: `morphbg-all.complete.js`  
**Size**: ~75KB (~25KB gzipped)  
**Includes**: Engine + Scroll Manager + All 3 Shaders

This is the **easiest option** - just add Three.js and one script tag.

### Example

```html
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
        }
        h1, h2 { 
            color: white; 
            font-size: 3em; 
            text-shadow: 0 2px 10px rgba(0,0,0,0.5); 
        }
    </style>
</head>
<body>
    <canvas id="bg-canvas"></canvas>
    
    <section data-shader-system="gs1" data-shader-preset="HERO">
        <h1>Topographic Flow</h1>
    </section>
    
    <section data-shader-system="gs2" data-shader-preset="AMBIENT">
        <h2>Dynamic Warp</h2>
    </section>
    
    <section data-shader-system="gs3" data-shader-preset="READ">
        <h2>Dot Field</h2>
    </section>
    
    <!-- Only 2 scripts needed! -->
    <script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-all.complete.js"></script>
</body>
</html>
```

**Pros**:
- ✅ Simplest setup (2 script tags)
- ✅ All features included
- ✅ Automatic shader switching
- ✅ No configuration needed

**Cons**:
- ❌ Larger file size if you only need one shader

---

## Option 2: Modular - Single Shader

Load the engine bundle with just one shader for minimal file size.

**Files**: `morphbg-engine.bundle.js` + one shader bundle  
**Size**: ~15KB gzipped total

### Example: GS2 Only

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; overflow: hidden; }
        #bg-canvas { 
            position: fixed; 
            inset: 0; 
            z-index: -1; 
        }
    </style>
</head>
<body>
    <canvas id="bg-canvas"></canvas>
    
    <section data-shader-system="gs2" data-shader-preset="HERO">
        <h1>My Content</h1>
    </section>
    
    <script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-engine.bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-gs2.bundle.js"></script>
</body>
</html>
```

**Pros**:
- ✅ Smallest file size
- ✅ Fast loading
- ✅ Perfect for single-shader sites

**Cons**:
- ❌ No shader switching (only one shader loaded)

---

## Option 3: Modular - Multiple Shaders

Load the engine with specific shader combinations to optimize file size.

**Files**: `morphbg-engine.bundle.js` + shader bundles (pick what you need)  
**Size**: Depends on shaders chosen

### Example: GS1 + GS3 (Skip GS2)

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; }
        #bg-canvas { position: fixed; inset: 0; z-index: -1; }
        section { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        h1 { color: white; font-size: 3em; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }
    </style>
</head>
<body>
    <canvas id="bg-canvas"></canvas>
    
    <section data-shader-system="gs1" data-shader-preset="HERO">
        <h1>Topographic Section</h1>
    </section>
    
    <section data-shader-system="gs3" data-shader-preset="AMBIENT">
        <h1>Dots Section</h1>
    </section>
    
    <script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-engine.bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-gs1.bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/dist/morphbg-gs3.bundle.js"></script>
</body>
</html>
```

**Pros**:
- ✅ Automatic shader switching
- ✅ Optimized file size (only load what you need)
- ✅ Flexible combinations

**Cons**:
- ❌ More script tags than complete bundle

---

## Available Bundle Files

### Core Bundles

| File | Size (raw) | Size (gzipped) | Contents |
|------|-----------|----------------|----------|
| `morphbg-all.complete.js` | ~75KB | ~25KB | Engine + Manager + All 3 Shaders |
| `morphbg-engine.bundle.js` | ~23KB | ~7KB | Engine + Scroll Manager only |

### Individual Shader Bundles

| File | Size (raw) | Size (gzipped) | Shader System |
|------|-----------|----------------|---------------|
| `morphbg-gs1.bundle.js` | ~20KB | ~6KB | Topographic Flow (GS1) |
| `morphbg-gs2.bundle.js` | ~22KB | ~7KB | Dynamic Warp (GS2) |
| `morphbg-gs3.bundle.js` | ~18KB | ~5KB | Dot Field (GS3) |

---

## How Shader Switching Works

When you load multiple shader bundles, morphbg automatically detects them and enables scroll-based switching.

### Section Attributes

Add these data attributes to your HTML sections:

```html
<section data-shader-system="gs1|gs2|gs3" data-shader-preset="HERO|AMBIENT|READ">
    <!-- Your content -->
</section>
```

**Shader Systems:**
- `gs1` - Topographic Flow (organic terrain-like patterns)
- `gs2` - Dynamic Warp (glitch/technical aesthetic)
- `gs3` - Dot Field (Kusama-inspired dot patterns)

**Presets:**
- `HERO` - High motion, dramatic (for hero sections)
- `AMBIENT` - Medium motion, balanced (for content sections)
- `CALM` - Low motion, subtle (for reading sections)

### Automatic Detection

The scroll manager:
1. Detects which section is in the viewport
2. Switches to the appropriate shader with smooth fade
3. Only switches to shaders you've loaded (ignores missing ones)
4. Updates shader parameters based on section attributes

---

## Advanced: Manual Initialization

For custom canvas IDs, debug mode, or manual control, load individual source files:

```html
<canvas id="my-custom-canvas"></canvas>

<script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/src/engine.js"></script>

<!-- Load shader components separately -->
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/src/shaders/gs1/config.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/src/shaders/gs1/shader.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/src/shaders/gs1/adaptor.js"></script>

<!-- Manual initialization -->
<script>
window.__BG_INSTANCE__ = window.initBGShaderSystem({
    canvasId: 'my-custom-canvas',  // Custom canvas ID
    fragmentShader: window.BG_FRAGMENT_SHADER,
    config: window.BG_SHADER_CONFIG,
    adapter: window.BG_TopoReadAdapter,
    debug: true  // Enable debug mode
});
</script>
```

See [Configuration](Configuration) for more manual initialization options.

---

## File Size Breakdown

### Complete Bundle Approach
```
Three.js (CDN):           ~3KB gzipped
morphbg-all.complete.js: ~25KB gzipped
─────────────────────────────────────
Total:                   ~28KB gzipped
```

### Single Shader Approach (e.g., GS2 only)
```
Three.js (CDN):              ~3KB gzipped
morphbg-engine.bundle.js:    ~7KB gzipped
morphbg-gs2.bundle.js:       ~7KB gzipped
──────────────────────────────────────
Total:                      ~17KB gzipped
```

### Custom Combination (e.g., GS1 + GS3)
```
Three.js (CDN):              ~3KB gzipped
morphbg-engine.bundle.js:    ~7KB gzipped
morphbg-gs1.bundle.js:       ~6KB gzipped
morphbg-gs3.bundle.js:       ~5KB gzipped
──────────────────────────────────────
Total:                      ~21KB gzipped
```

---

## Decision Guide

**Choose Complete Bundle if:**
- You want the simplest setup
- You'll use multiple shaders
- File size isn't critical (~28KB is acceptable)
- You want all features available

**Choose Single Shader if:**
- You only need one shader throughout your site
- File size optimization is important
- Your site has a consistent visual style

**Choose Multiple Shaders if:**
- You want automatic switching between specific shaders
- You want to optimize file size (skip unused shaders)
- You need custom shader combinations

---

## Next Steps

- See [Installation](Installation) for jsDelivr URLs and version pinning
- See [Shader Systems](Shader-Systems) for details on GS1, GS2, and GS3
- See [Configuration](Configuration) for customization options
- See [Troubleshooting](Troubleshooting) if you encounter issues
