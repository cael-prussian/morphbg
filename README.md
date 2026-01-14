# morphbg

> Animated WebGL background shaders for modern websites

**morphbg** provides beautiful, performant animated backgrounds using WebGL shaders. Three shader systems, automatic scroll-based transitions, and zero configuration required.

**[🎮 Try Live Demos →](https://cael-prussian.github.io/morphbg/)**

## ✨ Features

- 🎨 **Three Shader Systems** - Topographic Flow, Dynamic Warp, Dot Field
- 🔄 **Automatic Transitions** - Smooth shader switching on scroll
- ⚡ **High Performance** - Optimized WebGL rendering at 60fps
- 📦 **Multiple Approaches** - Complete bundle or modular loading
- 🎯 **Zero Config** - Works out of the box with sensible defaults
- 📱 **Responsive** - Adapts to any screen size
- 🌐 **CDN Ready** - Served via jsDelivr

## 🚀 Quick Start

**[Try the live demos →](https://cael-prussian.github.io/morphbg/)**

### Method 1: Complete Bundle (Recommended)

**[→ See this demo live](https://cael-prussian.github.io/morphbg/examples/demo-complete-bundle.html)**

The simplest way - just 2 script tags:

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; }
        #bg-canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; }
        section { height: 100vh; display: flex; align-items: center; justify-content: center; color: white; }
    </style>
</head>
<body>
    <canvas id="bg-canvas"></canvas>
    
    <section data-shader-system="gs1" data-shader-preset="HERO">
        <h1>Welcome</h1>
    </section>
    
    <section data-shader-system="gs2" data-shader-preset="AMBIENT">
        <h2>About</h2>
    </section>
    
    <script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.1.0/dist/morphbg-all.complete.js"></script>
</body>
</html>
```

**That's it!** The background will automatically transition between shaders as you scroll.

---

### Method 2: Single Shader (Smallest Size)

**[→ See this demo live](https://cael-prussian.github.io/morphbg/examples/demo-modular-single.html)**

For sites that only need one shader (~13KB gzipped):

```html
<canvas id="bg-canvas"></canvas>

<section data-shader-preset="HERO">
    <h1>Content</h1>
</section>

<script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.1.0/src/engine.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.1.0/src/shaders/gs2/config.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.1.0/src/shaders/gs2/shader.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.1.0/src/shaders/gs2/adaptor.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.1.0/src/shaders/gs2/init.js"></script>
```

---

### Method 3: Modular Multi-Shader

**[→ See this demo live](https://cael-prussian.github.io/morphbg/examples/demo-modular-multi.html)**

Load only specific shaders you need:

```html
<canvas id="bg-canvas"></canvas>

<section data-shader-system="gs1" data-shader-preset="HERO">
    <h1>Section 1</h1>
</section>

<section data-shader-system="gs3" data-shader-preset="AMBIENT">
    <h2>Section 2</h2>
</section>

<script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.1.0/src/engine.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.1.0/src/scroll-manager.js"></script>
<!-- Load only GS1 -->
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.1.0/src/shaders/gs1/config.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.1.0/src/shaders/gs1/shader.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.1.0/src/shaders/gs1/adaptor.js"></script>
<!-- Load only GS3 -->
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.1.0/src/shaders/gs3/config.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.1.0/src/shaders/gs3/shader.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.1.0/src/shaders/gs3/adaptor.js"></script>
```

## 📚 Documentation

- **[Wiki](https://github.com/cael-prussian/morphbg/wiki)** - Full user documentation
- **[Live Demos](https://cael-prussian.github.io/morphbg/)** - Interactive examples
- **[API Reference](docs/api-reference.md)** - Complete API documentation
- **[Examples](examples/)** - Working examples with source code
- **[Contributing](docs/contributing.md)** - Guide for contributors

## 🎨 Shader Systems

### GS1: Topographic Flow
Flowing topographic lines with smooth motion. Perfect for technical sites and portfolios.

**Presets:** HERO, AMBIENT, READ

### GS2: Dynamic Warp
Dynamic warping grid with multiple modes. Great for creative agencies and product launches.

**Presets:** HERO, AMBIENT, READ

### GS3: Dot Field
Minimalist dot pattern. Ideal for reading-focused and minimal designs.

**Presets:** HERO, AMBIENT, READ

## 🎯 Use Cases

- **Landing Pages** - Eye-catching animated backgrounds
- **Portfolios** - Showcase creative work with dynamic visuals
- **Product Sites** - Enhance product launches with motion
- **Documentation** - Add visual interest to technical docs
- **Presentations** - Create immersive presentation backgrounds

## 📦 Bundle Sizes

| Bundle | Gzipped | Contents |
|--------|---------|----------|
| **Complete** | ~25KB | Engine + Manager + All 3 Shaders |
| **Engine + Manager** | ~7KB | For modular approach |
| **Single Shader** | ~5-7KB | One shader only |

## ⚡ Performance

- Runs at 60fps on modern devices
- GPU-accelerated WebGL rendering
- Automatic viewport optimization
- Smooth shader transitions
- Mobile-friendly

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires WebGL support.

## 🛠️ Development

```bash
# Clone repository
git clone https://github.com/cael-prussian/morphbg.git
cd morphbg

# Build bundles
node scripts/build.js

# Open examples (no server needed)
open examples/demo-complete-bundle.html
```

See [Contributing Guide](docs/contributing.md) for details.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Credits

Built with [Three.js](https://threejs.org/)

---

**[Get Started →](https://github.com/cael-prussian/morphbg/wiki)** | **[Live Demos →](https://cael-prussian.github.io/morphbg/)** | **[API Docs →](docs/api-reference.md)**
