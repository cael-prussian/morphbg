# morphbg Examples

Working examples demonstrating different implementation approaches.

## Running Examples

**No server required!** Just open HTML files directly in your browser:

```bash
# macOS
open demo-complete-bundle.html

# Linux  
xdg-open demo-complete-bundle.html

# Windows
start demo-complete-bundle.html
```

## Available Examples

### Complete Bundle Demo
**File:** `demo-complete-bundle.html`

Demonstrates the complete all-in-one bundle approach.

- ✅ Simplest implementation (2 script tags)
- ✅ All 3 shaders included
- ✅ Automatic shader switching on scroll
- ✅ Multiple presets showcased

**Use this when:** You want the easiest setup with all features.

---

### Modular Single Shader Demo
**File:** `demo-modular-single.html`

Demonstrates loading a single shader with modular approach.

- ✅ Smallest file size (~13KB gzipped)
- ✅ Only GS2 shader loaded
- ✅ Multiple presets within one shader
- ✅ No ScrollShaderManager needed

**Use this when:** You only need one shader and want to optimize file size.

---

### Modular Multi-Shader Demo
**File:** `demo-modular-multi.html`

Demonstrates loading multiple specific shaders modularly.

- ✅ Load only the shaders you need
- ✅ Automatic shader switching
- ✅ Only loads GS1 and GS3 (skips GS2)
- ✅ File size optimization

**Use this when:** You want shader switching but don't need all shaders.

---

### Individual Shader Tests

Test files for each shader system:

- `test-gs1.html` - Test GS1 (Topographic Flow)
- `test-gs2.html` - Test GS2 (Dynamic Warp)  
- `test-gs3.html` - Test GS3 (Dot Field)

**Use these for:** Testing individual shaders during development.

---

### Configuration Form
**File:** `config-form.html`

Interactive configuration interface for testing shader parameters in real-time.

- ✅ Live parameter adjustment
- ✅ Preset testing
- ✅ Debug mode toggle
- ✅ Visual feedback

**Use this for:** Testing and fine-tuning shader configurations.

---

## File Structure

All examples follow this pattern:

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        /* Styles for canvas and content */
    </style>
</head>
<body>
    <canvas id="bg-canvas"></canvas>
    
    <!-- Content sections -->
    <section data-shader-system="gs1" data-bg-preset="HERO">
        <h1>Content</h1>
    </section>
    
    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
    <script src="../dist/morphbg-all.complete.js"></script>
</body>
</html>
```

## Key Concepts

### Canvas Element
All examples use a fixed-position canvas with `id="bg-canvas"`:

```css
#bg-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
}
```

### Section Attributes
Sections use data attributes to control the shader:

```html
<section data-shader-system="gs2" data-bg-preset="ENERGETIC">
```

- `data-shader-system` - Which shader to use (gs1, gs2, gs3)
- `data-bg-preset` - Which preset to apply (HERO, AMBIENT, CALM, etc.)

### Script Loading Order
Always load in this order:

1. Three.js (required dependency)
2. morphbg files (engine, shaders, manager)

## Customizing Examples

### Change Presets
Edit the `data-bg-preset` attribute:

```html
<section data-shader-system="gs1" data-bg-preset="CALM">
```

Available presets vary by shader (see shader documentation).

### Change Shaders
Edit the `data-shader-system` attribute:

```html
<section data-shader-system="gs3" data-bg-preset="HERO">
```

### Add Sections
Just add more sections with appropriate attributes:

```html
<section data-shader-system="gs2" data-bg-preset="AMBIENT">
    <h2>New Section</h2>
    <p>Content here</p>
</section>
```

### Styling Content
Add styles in the `<head>`:

```css
section {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
}
```

## Troubleshooting

### Example doesn't load
- Check browser console for errors
- Ensure Three.js CDN is accessible
- Verify `dist/` folder exists (run `node scripts/build.js`)

### Shader doesn't appear
- Check canvas element exists with `id="bg-canvas"`
- Verify z-index is negative
- Check console for WebGL errors

### Shader doesn't switch on scroll
- Ensure sections have `data-shader-system` attributes
- Verify ScrollShaderManager is loaded
- Check that multiple shaders are loaded

### Performance issues
- Try the single shader approach
- Reduce number of sections
- Check browser GPU acceleration is enabled

## Next Steps

- Read the [API Reference](../docs/api-reference.md)
- Check the [Wiki](https://github.com/cael-prussian/morphbg/wiki) for full documentation
- See [Contributing Guide](../docs/contributing.md) to add your own examples
