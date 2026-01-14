# API Reference

Complete API documentation for morphbg shader system.

## Developer Resources

**Want to create custom shaders?** See the [Custom Shader Documentation](custom-shaders/)

- **[AI Workflow](custom-shaders/ai-workflow.md)** - Quick AI-assisted development (~10-15 min)
- **[Complete Guide](custom-shaders/custom-shader-guide.md)** - Manual development walkthrough
- **[Quick Reference](custom-shaders/quick-reference.md)** - Fast lookup for experienced developers
- **[Architecture](custom-shaders/architecture.md)** - System design diagrams
- **[Templates](custom-shaders/templates/)** - Code templates

---

## Core Functions

### `initBGShaderSystem(options)`

Initializes a shader instance on a canvas element.

**Parameters:**

```javascript
{
  canvasId: string,           // Canvas element ID (default: 'bg-canvas')
  fragmentShader: string,     // Fragment shader code
  config: object,             // Shader configuration
  adapter: object|null,       // Shader adapter (optional)
  debug: boolean              // Enable debug mode (default: false)
}
```

**Returns:** Instance object with methods:
- `renderer` - Three.js WebGLRenderer
- `scene` - Three.js Scene
- `camera` - Three.js Camera
- `material` - Three.js ShaderMaterial
- `computeScrollTargets()` - Recalculate scroll-based targets
- `stop()` - Stop animation and cleanup
- `debug` - Debug mode flag

**Example:**

```javascript
const instance = window.initBGShaderSystem({
  canvasId: 'bg-canvas',
  fragmentShader: window.BG_FRAGMENT_SHADER,
  config: window.BG_SHADER_CONFIG,
  adapter: window.BG_TopoReadAdapter
});
```

## ScrollShaderManager

Manages automatic shader switching based on scroll position.

### `ScrollShaderManager.init()`

Starts the scroll-based shader switching system.

**Example:**

```javascript
window.ScrollShaderManager.init();
```

### `ScrollShaderManager.switchTo(shaderId)`

Manually switch to a specific shader.

**Parameters:**
- `shaderId` - Shader ID ('gs1', 'gs2', or 'gs3')

**Returns:** `boolean` - Success status

**Example:**

```javascript
window.ScrollShaderManager.switchTo('gs2');
```

### `ScrollShaderManager.getCurrentShader()`

Get the currently active shader ID.

**Returns:** `string|null` - Current shader ID

### `ScrollShaderManager.getInstance()`

Get the current shader instance.

**Returns:** `object|null` - Shader instance

### `ScrollShaderManager.isInTransition()`

Check if a shader transition is in progress.

**Returns:** `boolean`

### `ScrollShaderManager.getCurrentSection()`

Get the currently active section element.

**Returns:** `HTMLElement|null`

## Configuration Objects

### Shader Config

```javascript
{
  modes: {
    'mode-name': {
      spatialMotion: number,    // 0-1
      temporalMotion: number,   // 0-1
      cursorStrength: number,   // 0-1
      calmDown: number          // 0-1
    }
  },
  presets: {
    PRESET_NAME: {
      mode: string,             // Mode name
      cursorStrength: number    // 0-1
    }
  },
  transitionVh: number,        // Viewport height units (default: 0.5)
  smoothSpeed: number          // Transition speed (default: 2.0)
}
```

### Adapter Interface

```javascript
{
  // Define extra uniforms
  extendUniforms(THREE, config, presets) {
    return {
      u_customUniform: { value: 0.0 }
    };
  },

  // Compute target values from scroll position
  computeTargets(preset, section, viewportInfo, config) {
    return {
      customValue: number
    };
  },

  // Apply targets to material uniforms
  applyToMaterial(material, targets, config) {
    material.uniforms.u_customUniform.value = targets.customValue;
  }
}
```

## Data Attributes

### `data-shader-system`

Specifies which shader to use for a section.

**Values:** `'gs1'`, `'gs2'`, `'gs3'`

**Example:**

```html
<section data-shader-system="gs1">
  <!-- Content -->
</section>
```

### `data-bg-preset`

Specifies the preset to use for a section.

**Values:** Depends on shader
- GS1: `'HERO'`, `'AMBIENT'`, `'CALM'`
- GS2: `'HERO'`, `'AMBIENT'`, `'CALM'`, `'ENERGETIC'`
- GS3: `'HERO'`, `'AMBIENT'`, `'CALM'`

**Example:**

```html
<section data-shader-system="gs2" data-bg-preset="ENERGETIC">
  <!-- Content -->
</section>
```

## Debug Mode

Enable debug mode to see performance metrics and configuration:

```javascript
const instance = window.initBGShaderSystem({
  // ... other options
  debug: true
});
```

Debug mode displays:
- FPS counter
- Current mode values
- Scroll position
- Target values
- Uniform values

## Global Variables

Shader systems register themselves on `window`:

- `window.BG_SHADER_CONFIG` - GS1 config
- `window.BG_FRAGMENT_SHADER` - GS1 shader
- `window.BG_TopoReadAdapter` - GS1 adapter
- `window.__BG1_INSTANCE__` - GS1 instance

- `window.BG2_SHADER_CONFIG` - GS2 config
- `window.BG2_FRAGMENT_SHADER` - GS2 shader
- `window.BG2_AllModesAdapter` - GS2 adapter
- `window.__BG2_INSTANCE__` - GS2 instance

- `window.BG3_SHADER_CONFIG` - GS3 config
- `window.BG3_FRAGMENT_SHADER` - GS3 shader
- `window.BG3_DotAdapter` - GS3 adapter
- `window.__BG3_INSTANCE__` - GS3 instance

## Events

The system uses standard DOM events:

- `DOMContentLoaded` - Triggers auto-initialization
- `scroll` - Monitored for shader switching
- `resize` - Triggers viewport recalculation

## Browser Support

Requires:
- WebGL support
- ES6 (arrow functions, const/let)
- requestAnimationFrame
- CSS transitions

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
