# jsDelivr CDN Deployment Guide (Open Source)

Using GitHub + jsDelivr provides free global CDN hosting for your shader system.

## Why jsDelivr?

✅ **Free** - No hosting costs, no CDN fees  
✅ **Automatic CDN** - Global edge network with 99.9% uptime  
✅ **Version Control** - Git tags = automatic versioning  
✅ **Zero Configuration** - No CORS setup, no bucket policies  
✅ **npm Ready** - Optionally publish as npm package  
✅ **Open Source** - Share with the community  

---

## Quick Start (Fastest Method)

### 1. Create GitHub Repository

```bash
cd /Users/cael/cael_gs

# Initialize git (if not already)
git init

# Add all files
git add .
git commit -m "Initial commit: WebGL shader system"

# Create repo on GitHub, then:
git remote add origin https://github.com/cael-prussian/morphbg.git
git branch -M main
git push -u origin main
```

### 2. Create Release/Tag

```bash
# Tag your first version
git tag v1.0.0
git push origin v1.0.0
```

### 3. Use in Your Web Projects

**That's it!** Your files are now available via jsDelivr:

```html
<!-- Single Shader (GS1) -->
<script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs-engine.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs1/config.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs1/shader.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs1/adaptor.js"></script>
<script>
(function(){function i(){window.__GS1_INSTANCE__=window.initBGShaderSystem({canvasId:'bg-canvas',fragmentShader:window.BG_FRAGMENT_SHADER,config:window.BG_SHADER_CONFIG,adapter:window.BG_TopoReadAdapter})}document.readyState==='loading'?document.addEventListener('DOMContentLoaded',i):i()})();
</script>
```

**URL Pattern:**
```
https://cdn.jsdelivr.net/gh/USERNAME/REPO@VERSION/FILE
```

---

## Optional: Publish to npm

For even better caching and versioning:

### 1. Create package.json

```json
{
  "name": "@cael-prussian/morphbg",
  "version": "1.0.0",
  "description": "WebGL shader backgrounds for web projects",
  "main": "gs-engine.js",
  "files": [
    "gs-engine.js",
    "scroll-shader-manager-simple.js",
    "gs1/",
    "gs2/",
    "gs3/"
  ],
  "keywords": [
    "webgl",
    "shader",
    "three.js",
    "background",
    "animation"
  ],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/cael-prussian/morphbg.git"
  }
}
```

### 2. Publish to npm

```bash
npm login
npm publish --access public
```

### 3. Use npm URLs (Better Caching)

```html
<!-- Using npm package (recommended) -->
<script src="https://cdn.jsdelivr.net/npm/@cael-prussian/morphbg@1.0.0/gs-engine.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@cael-prussian/morphbg@1.0.0/gs1/config.js"></script>
<!-- etc... -->
```

---

## Web Integration Examples

### Example 1: Single Shader (GS1)

```html
<canvas id="bg-canvas" style="position:fixed;inset:0;z-index:-1;width:100%;height:100%"></canvas>

<script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs-engine.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs1/config.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs1/shader.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs1/adaptor.js"></script>
<script>
(function(){function i(){window.__GS1_INSTANCE__=window.initBGShaderSystem({canvasId:'bg-canvas',fragmentShader:window.BG_FRAGMENT_SHADER,config:window.BG_SHADER_CONFIG,adapter:window.BG_TopoReadAdapter})}document.readyState==='loading'?document.addEventListener('DOMContentLoaded',i):i()})();
</script>
```

### Example 2: All Three Shaders with Scroll Manager

```html
<canvas id="bg-canvas" style="position:fixed;inset:0;z-index:-1;width:100%;height:100%"></canvas>

<script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs-engine.js"></script>

<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs1/config.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs1/shader.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs1/adaptor.js"></script>

<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs2/config.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs2/shader.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs2/adaptor.js"></script>

<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs3/config.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs3/shader.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs3/adaptor.js"></script>

<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/scroll-shader-manager-simple.js"></script>
<script>
(function(){function i(){window.ScrollShaderManager.init()}document.readyState==='loading'?document.addEventListener('DOMContentLoaded',i):i()})();
</script>
```

---

## Version Management

### Update Your Shaders

```bash
# Make changes to your code
git add .
git commit -m "Fixed GS2 flow direction bug"

# Create new version
git tag v1.0.1
git push origin v1.0.1
```

### Use Specific Versions

```html
<!-- Pin to specific version (recommended for production) -->
<script src="https://cdn.jsdelivr.net/gh/YOU/morphbg@1.0.0/gs-engine.js"></script>

<!-- Always get latest patch (1.0.x) -->
<script src="https://cdn.jsdelivr.net/gh/YOU/morphbg@1.0/gs-engine.js"></script>

<!-- Always get latest (risky, for development only) -->
<script src="https://cdn.jsdelivr.net/gh/YOU/morphbg@main/gs-engine.js"></script>
```

---

## Creating Bundles (Optional)

If you want bundled versions for fewer HTTP requests:

### Add build script to package.json:

```json
{
  "scripts": {
    "build": "./build-for-deployment.sh",
    "prepublishOnly": "npm run build"
  }
}
```

This auto-builds bundles before npm publish.

---

## Repository Structure

Recommended structure for open source:

```
morphbg/
├── README.md                    # Project overview
├── LICENSE                      # MIT License
├── package.json                 # npm package config
├── .gitignore                   # Ignore node_modules, dist, etc.
│
├── gs-engine.js                 # Core engine
├── scroll-shader-manager-simple.js  # Scroll manager
│
├── gs1/                         # GS1 Topographic
│   ├── README.md               # GS1 documentation
│   ├── config.js
│   ├── shader.js
│   └── adaptor.js
│
├── gs2/                         # GS2 Glitch
│   ├── README.md
│   ├── config.js
│   ├── shader.js
│   └── adaptor.js
│
├── gs3/                         # GS3 Dot Field
│   ├── README.md
│   ├── config.js
│   ├── shader.js
│   └── adaptor.js
│
├── docs/                        # Documentation
│   ├── ADAPTER_INTERFACE.md
│   ├── GS1_PARAMETER_GUIDE.md
│   ├── GS2_PARAMETER_GUIDE.md
│   ├── GS3_PARAMETER_GUIDE.md
│   └── TROUBLESHOOTING.md
│
├── examples/                    # Example files
│   ├── demo.html
│   ├── test-gs1.html
│   ├── test-gs2.html
│   └── test-gs3.html
│
└── dist/                        # Built bundles (gitignored)
    ├── gs1-bundle.js
    ├── gs2-bundle.js
    ├── gs3-bundle.js
    └── shaders-complete.js
```

---

## Comparison: jsDelivr vs S3

| Feature | jsDelivr (GitHub) | S3 + CloudFront |
|---------|------------------|-----------------|
| **Cost** | Free | $5-50/month |
| **Setup Time** | 5 minutes | 30+ minutes |
| **CORS Config** | Automatic | Manual |
| **CDN** | Built-in | Need CloudFront |
| **Versioning** | Git tags | Manual |
| **Public Access** | Default | Must configure |
| **Cache Control** | Automatic | Manual headers |
| **Updates** | `git push` | Upload files |

**Winner:** jsDelivr for 99% of use cases

---

## jsDelivr Features

### Auto-Minification
Add `.min.js` to any URL:
```html
<script src="https://cdn.jsdelivr.net/gh/YOU/morphbg@1.0.0/gs-engine.min.js"></script>
```
jsDelivr auto-minifies on the fly!

### Combine Files
Load multiple files in one request:
```html
<script src="https://cdn.jsdelivr.net/combine/
  gh/YOU/morphbg@1.0.0/gs-engine.js,
  gh/YOU/morphbg@1.0.0/gs1/config.js,
  gh/YOU/morphbg@1.0.0/gs1/shader.js,
  gh/YOU/morphbg@1.0.0/gs1/adaptor.js
"></script>
```

### SRI Hash (Security)
Generate integrity hash:
```
https://www.jsdelivr.com/package/gh/YOU/morphbg
```
Click file → Copy SRI hash → Use in script tag

---

## Open Source Benefits

### MIT License (Recommended)

Create `LICENSE` file:
```
MIT License

Copyright (c) 2026 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Community Benefits
- Others can contribute improvements
- Bug reports from real users
- Free testing across different browsers/devices
- Portfolio piece showing open source work
- Potential sponsorships/donations

---

## Quick Deploy Checklist

- [ ] Create GitHub repository
- [ ] Push code: `git push origin main`
- [ ] Create tag: `git tag v1.0.0 && git push origin v1.0.0`
- [ ] Test jsDelivr URL in browser (wait ~5 min for CDN)
- [ ] Use jsDelivr URLs in your web project
- [ ] (Optional) Create npm account
- [ ] (Optional) Publish to npm: `npm publish --access public`

---

## Example: Complete HTML Setup

**1. Canvas element:**
```html
<canvas id="bg-canvas" style="position:fixed;inset:0;z-index:-1;width:100%;height:100%;pointer-events:none"></canvas>
```

**2. Scripts (before closing </body> tag):**
```html
<script src="https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs-engine.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs1/config.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs1/shader.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cael-prussian/morphbg@1.0.0/gs1/adaptor.js"></script>
<script>
(function(){function i(){window.__GS1_INSTANCE__=window.initBGShaderSystem({canvasId:'bg-canvas',fragmentShader:window.BG_FRAGMENT_SHADER,config:window.BG_SHADER_CONFIG,adapter:window.BG_TopoReadAdapter})}document.readyState==='loading'?document.addEventListener('DOMContentLoaded',i):i()})();
</script>
```

**3. Section Attributes:**
- Hero: `data-shader-preset="hero"` + `data-shader-mode="topographic-flow"`
- Content: `data-shader-preset="ambient"` + `data-shader-mode="atmospheric-mesh"`
- Footer: `data-shader-preset="read"` + `data-shader-mode="atmospheric-mesh"` + `data-flatten="0.85"`

**Done!** No S3, no CORS, no hosting fees.

---

## Performance Notes

jsDelivr CDN:
- ✅ 100+ global edge locations
- ✅ HTTP/2 support
- ✅ Brotli compression
- ✅ 99.9% uptime SLA
- ✅ Smart caching (1 year for versioned URLs)
- ✅ Automatic failover to multiple CDN providers

**Load time:** Typically 50-150ms globally

---

## Next Steps

1. **Create GitHub repo** (5 min)
2. **Push your code** (2 min)
3. **Create v1.0.0 tag** (1 min)
4. **Test jsDelivr URL** (5 min wait for CDN)
5. **Integrate into your web project** (10 min)
6. **Publish and celebrate!** 🎉

Total: ~20 minutes
