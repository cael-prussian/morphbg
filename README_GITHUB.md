# Cael Shaders - WebGL Backgrounds for Web Projects

Dynamic, scroll-responsive WebGL shader backgrounds powered by Three.js. Perfect for modern web projects and no-code tools.

## 🎨 Three Shader Systems

- **GS1 (Topographic)** - Organic flowing landscapes with contour lines and fabric textures
- **GS2 (Glitch)** - Technical geometric aesthetic with grid distortions and vector glitches  
- **GS3 (Dot Field)** - Artistic dot patterns inspired by Yayoi Kusama

## ⚡ Quick Start

### Via jsDelivr CDN (Recommended)

```html
<!-- Canvas -->
<canvas id="bg-canvas" style="position:fixed;inset:0;z-index:-1;width:100%;height:100%"></canvas>

<!-- Three.js -->
<script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>

<!-- Shader System (GS1 Example) -->
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs-engine.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs1/config.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs1/shader.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs1/adaptor.js"></script>

<!-- Initialize -->
<script>
(function(){
  function init() {
    window.__GS1_INSTANCE__ = window.initBGShaderSystem({
      canvasId: 'bg-canvas',
      fragmentShader: window.BG_FRAGMENT_SHADER,
      config: window.BG_SHADER_CONFIG,
      adapter: window.BG_TopoReadAdapter
    });
  }
  document.readyState === 'loading' 
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
</script>
```

### Add to HTML Sections

```html
<!-- Hero Section -->
<div data-shader-preset="hero" 
     data-shader-mode="topographic-flow"
     data-warp-intensity="1.0">
  <h1>Your Content</h1>
</div>

<!-- Content Section -->
<div data-shader-preset="ambient" 
     data-shader-mode="atmospheric-mesh"
     data-flatten="0.35">
  <p>Your content...</p>
</div>

<!-- Reading Section -->
<div data-shader-preset="read" 
     data-shader-mode="atmospheric-mesh"
     data-flatten="0.85">
  <p>Text content...</p>
</div>
```

## 🎯 Presets

| Preset | Energy | Use Case |
|--------|--------|----------|
| `hero` | ⚡⚡⚡ | Landing sections, high energy |
| `ambient` | ⚡⚡ | Features, balanced content |
| `read` | ⚡ | Text-heavy, minimal distraction |

## 🎛️ Parameters

### GS1 Common Attributes

- `data-shader-mode` - Visual style (`atmospheric-mesh`, `topographic-flow`, `fabric-warp`)
- `data-shader-preset` - Energy level (`hero`, `ambient`, `read`)
- `data-flatten` (0-1) - Reduce topography
- `data-warp-intensity` (0-1) - Distortion strength
- `data-topo-bands` (2-50) - Contour lines
- `data-height-contrast` (0-2) - Terrain drama

### GS2 Common Attributes

- `data-shader-mode` - Style (`glitch-grid`, `vector-glitch`, `signal-flow`)
- `data-flow-dir` - Direction (`0deg` to `360deg`)
- `data-grid-fill-amount` (0-1) - Grid density
- `data-shard-chaos` (0-1) - Glitch intensity

### GS3 Common Attributes

- `data-shader-mode` - Style (`kusama-infinite`, `perlin-dot-field`, `octopus-legs`)
- `data-palette` (0-1) - Color variation
- `data-k-grid` (0-1) - Grid regularity
- `data-k-jitter` (0-1) - Randomness

## 📚 Documentation

- **[JSDELIVR_DEPLOYMENT.md](docs/JSDELIVR_DEPLOYMENT.md)** - jsDelivr setup (recommended)
- **[ADAPTER_INTERFACE.md](docs/ADAPTER_INTERFACE.md)** - API documentation
- **[GS1_PARAMETER_GUIDE.md](docs/GS1_PARAMETER_GUIDE.md)** - GS1 parameters
- **[GS2_PARAMETER_GUIDE.md](docs/GS2_PARAMETER_GUIDE.md)** - GS2 parameters
- **[GS3_PARAMETER_GUIDE.md](docs/GS3_PARAMETER_GUIDE.md)** - GS3 parameters
- **[TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues

## 🖥️ Examples

- **[demo.html](examples/demo.html)** - Full demo with all shaders
- **[test-gs1.html](examples/test-gs1.html)** - GS1 standalone test
- **[test-gs2.html](examples/test-gs2.html)** - GS2 standalone test
- **[test-gs3.html](examples/test-gs3.html)** - GS3 standalone test

## 🚀 HTML Setup (3 Steps)

### 1. Add Canvas
Add to your HTML:
```html
<canvas id="bg-canvas" style="position:fixed;inset:0;z-index:-1;width:100%;height:100%"></canvas>
```

### 2. Add Scripts
Before closing `</body>` tag:
```html
<script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs-engine.js"></script>
<!-- ... rest of scripts ... -->
```

### 3. Add Attributes
Add to your HTML sections:
```html
<div data-shader-preset="hero" data-shader-mode="topographic-flow">
  <!-- Your content -->
</div>
```

**Done!** Background animates and responds to scroll.

## 🏗️ Architecture

```
Core Engine (gs-engine.js)
    ↓
Shader Adapters (gs1/gs2/gs3)
    ↓
Scroll Manager (optional)
    ↓
HTML Sections (data attributes)
```

### Shader Adapters

Each shader has three files:
- `config.js` - Preset values and modes
- `shader.js` - GLSL fragment shader
- `adaptor.js` - Parameter mapping

### Universal vs Shader-Specific

**Engine manages:**
- Time, resolution, mouse
- Universal presets (spatial, temporal, cursor, calm)

**Adapters manage:**
- Shader-specific parameters
- Mode-specific controls
- Custom accumulation logic

## 🎨 Use Cases

- **Landing Pages** - Bold hero sections with `hero` preset
- **Product Pages** - Balanced `ambient` backgrounds
- **Blogs/Articles** - Calm `read` preset for readability
- **Portfolios** - Different shaders per project section
- **Presentations** - Dynamic backgrounds that follow scroll

## 📦 File Sizes

| File | Size | Gzipped |
|------|------|---------|
| Three.js (CDN) | 580KB | ~170KB |
| gs-engine.js | 15KB | ~5KB |
| GS1 (3 files) | 12KB | ~3KB |
| GS2 (3 files) | 15KB | ~4KB |
| GS3 (3 files) | 18KB | ~5KB |

**Total (single shader):** ~600KB → ~180KB gzipped

## ⚙️ Performance

- 40-60 FPS on modern devices
- Adaptive DPR (Device Pixel Ratio)
- Efficient GPU usage
- Smooth scroll transitions
- Mobile-optimized

## 🔧 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Chrome/Safari

Requires WebGL support.

## 📄 License

MIT License - Use freely in personal and commercial projects

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 🐛 Issues

Found a bug? [Open an issue](https://github.com/cael-prussian/morphbg/issues)

## 💡 Credits

Built with:
- [Three.js](https://threejs.org/) - 3D rendering
- [jsDelivr](https://www.jsdelivr.com/) - CDN hosting

## 🌟 Show Your Support

If you find this useful, please ⭐ star the repo!

---

**Questions?** Check the [documentation](docs/) or [open an issue](https://github.com/cael-prussian/morphbg/issues).

**Need help?** See [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for common issues.
