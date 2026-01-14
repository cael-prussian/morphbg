# Contributing to morphbg

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites
- Node.js (for build script)
- Git
- A modern web browser

### Clone and Setup

```bash
git clone https://github.com/cael-prussian/morphbg.git
cd morphbg
```

No npm install needed - the build script uses only Node.js built-ins.

## Repository Structure

```
morphbg/
├── src/                      # Source code
│   ├── engine.js             # Core shader engine
│   ├── scroll-manager.js     # Multi-shader orchestration
│   └── shaders/              # Shader systems
│       ├── gs1/              # Topographic Flow
│       ├── gs2/              # Dynamic Warp
│       └── gs3/              # Dot Field
├── examples/                 # Demo files
├── docs/                     # Technical documentation
├── scripts/                  # Build/deployment scripts
└── dist/                     # Generated bundles (gitignored)
```

## Development Workflow

### 1. Make Changes

Edit source files in `src/` or `src/shaders/`:

```bash
# Edit a shader
vim src/shaders/gs1/shader.js

# Edit the engine
vim src/engine.js
```

### 2. Test Locally

Open example files directly in your browser (no server needed):

```bash
# macOS
open examples/demo-complete-bundle.html

# Linux
xdg-open examples/demo-complete-bundle.html

# Windows
start examples/demo-complete-bundle.html
```

### 3. Build Bundles

Generate deployment bundles:

```bash
node scripts/build.js
```

This creates files in `dist/`:
- `morphbg-gs1.bundle.js`
- `morphbg-gs2.bundle.js`
- `morphbg-gs3.bundle.js`
- `morphbg-engine.bundle.js`
- `morphbg-all.complete.js`

### 4. Test Bundles

Test the bundled version:

```bash
open examples/demo-complete-bundle.html
```

### 5. Submit Pull Request

```bash
git add src/
git commit -m "Description of changes"
git push origin your-branch-name
```

Then create a PR on GitHub.

## Creating a New Shader

### 1. Create Directory Structure

```bash
mkdir -p src/shaders/gs4
```

### 2. Create Required Files

**config.js** - Define modes and presets:

```javascript
window.BG4_SHADER_CONFIG = {
    modes: {
        'mode-name': {
            spatialMotion: 0.5,
            temporalMotion: 0.5,
            cursorStrength: 1.0,
            calmDown: 0.3
        }
    },
    presets: {
        HERO: {
            mode: 'mode-name',
            cursorStrength: 1.0
        }
    }
};
```

**shader.js** - Fragment shader code:

```javascript
window.BG4_FRAGMENT_SHADER = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
// ... shader code
`;
```

**adaptor.js** - Shader adapter (optional):

```javascript
window.BG4_Adapter = {
    extendUniforms(THREE, config, presets) {
        return {
            u_custom: { value: 0.0 }
        };
    },
    computeTargets(preset, section, viewportInfo, config) {
        return {
            customValue: 1.0
        };
    },
    applyToMaterial(material, targets, config) {
        material.uniforms.u_custom.value = targets.customValue;
    }
};
```

**init.js** - Auto-initialization:

```javascript
(function () {
    function initBG4() {
        if (!window.initBGShaderSystem) return;
        
        window.__BG4_INSTANCE__ = window.initBGShaderSystem({
            canvasId: 'bg-canvas',
            fragmentShader: window.BG4_FRAGMENT_SHADER,
            config: window.BG4_SHADER_CONFIG,
            adapter: window.BG4_Adapter
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBG4);
    } else {
        initBG4();
    }
})();
```

### 3. Register in ScrollShaderManager

Edit `src/scroll-manager.js` and add your shader to the registry:

```javascript
const shaders = {
    gs1: { /* ... */ },
    gs2: { /* ... */ },
    gs3: { /* ... */ },
    gs4: {
        name: 'Your Shader Name',
        config: () => window.BG4_SHADER_CONFIG,
        fragment: () => window.BG4_FRAGMENT_SHADER,
        adapter: () => window.BG4_Adapter,
    }
};
```

### 4. Update Build Script

Edit `scripts/build.js` to include your shader:

```javascript
const shaders = [
    // ... existing shaders
    {
        id: 'gs4',
        name: 'Your Shader Name',
        files: ['src/shaders/gs4/config.js', 'src/shaders/gs4/shader.js', 'src/shaders/gs4/adaptor.js']
    }
];
```

### 5. Create Example

Create `examples/test-gs4.html` to showcase your shader.

## Code Style

- Use consistent indentation (4 spaces)
- Add comments for complex logic
- Follow existing naming conventions
- Keep functions focused and small

## Testing

Before submitting:

1. ✅ Test in Chrome, Firefox, and Safari
2. ✅ Test on mobile devices
3. ✅ Verify no console errors
4. ✅ Check performance (should maintain 60fps)
5. ✅ Test all presets work correctly
6. ✅ Verify scroll-based switching works
7. ✅ Run build script successfully

## Commit Messages

Use clear, descriptive commit messages:

```bash
# Good
git commit -m "Add wave effect to GS1 shader"
git commit -m "Fix GS2 performance on mobile"
git commit -m "Update API documentation"

# Bad
git commit -m "Update stuff"
git commit -m "Fix bug"
```

## Documentation

If you add new features:

1. Update `docs/api-reference.md`
2. Add examples to `examples/`
3. Update wiki pages if needed
4. Add comments in code

## Questions?

- Open an issue on GitHub
- Check existing issues/discussions
- Review the wiki for documentation

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
