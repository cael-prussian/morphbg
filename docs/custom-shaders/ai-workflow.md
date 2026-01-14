# AI-Assisted Shader Development

Quick reference-first workflow for creating custom morphbg shaders with AI assistance.

**Key Philosophy:** Find and adapt existing shaders rather than generating from scratch.

---

## Prerequisites

- AI assistant (ChatGPT, Claude, Copilot)
- Text editor
- Browser with WebGL support
- Access to ShaderToy (shadertoy.com) or similar shader libraries

---

## The 4-Step Process

### Step 0: Understand morphbg
**Goal:** AI learns morphbg architecture

**Give AI:**
- `src/engine.js`
- One existing shader (e.g., `src/shaders/gs1/*.js`)
- `ai-step0-context.md` (review guide)

**AI should learn:**
- How universal uniforms work
- How scroll-based blending works
- How adapters manage custom uniforms
- How shaders use motion controls
- Patterns from existing implementations

**Validate:** AI can explain the architecture

---

### Step 1: Find Reference Shaders
**Goal:** Locate existing shader examples that match desired effect

**Give AI:**
- Visual effect description
- Desired behaviors (motion, colors, interactions)
- `ai-step1-define.md`

**AI should output:**
- Recommended ShaderToy search terms
- Keywords for effect type, surface quality, motion
- Guidance on what to look for in results

**Developer action:**
- Search ShaderToy/GLSL Sandbox with recommended terms
- Copy promising shader code
- Share with AI for adaptation

**Validate:** Found shader(s) visually match desired effect

---

### Step 2: Adapt Shader to morphbg
**Goal:** Convert reference shader to morphbg conventions

**Give AI:**
- Reference shader code (from ShaderToy, etc.)
- Effect definition
- `ai-step2-shader.md`
- `templates/shader.template.js`

**Request:** "Adapt this reference shader to morphbg conventions"

**AI should output:**
- Complete `shader.js` with adapted GLSL code
- Converted ShaderToy uniforms (iTime → u_time, etc.)
- Added `u_temporalMotion`, `u_spatialMotion`, `u_cursorEnabled`, `u_calm` controls
- Added base layer (always visible)
- Added calm desaturation
- Preserved core visual logic from reference

**Validate:** Shader compiles, animates, maintains reference shader's visual quality

---

### Step 3: Generate Config & Adapter
**Goal:** Create preset definitions and uniform management

**Give AI:**
- Shader code from Step 2
- `templates/config.template.js`
- `templates/adaptor.template.js`

**Request:** "Generate config and adapter following templates"

**AI should output:**
- `config.js` with HERO/AMBIENT/READ presets
- `adaptor.js` with all custom uniforms defined
- Sensible preset values (HERO dramatic, READ subtle)

**Validate:** Presets feel appropriately different

---

### Step 4: Package
**Goal:** Create initialization and demo

**Give AI:**
- All files from Steps 1-3
- `templates/init.template.js`

**Request:** "Generate init wrapper and HTML demo"

**AI should output:**
- `init.js` wrapper
- Complete `demo.html` with scroll sections

**Validate:** Scroll transitions work smoothly

---

## morphbg Architecture Reference

```
HTML → Engine → Config → Adapter → Shader
         ↓         ↓        ↓         ↓
      Scroll    Presets  Uniforms  Pixels
```

**Engine provides automatically:**
- `u_time`, `u_resolution`, `u_mouse`
- `u_spatialMotion`, `u_temporalMotion`, `u_cursorEnabled`, `u_calm`
- Scroll tracking and preset blending

**You provide:**
- Shader: Visual effect (GLSL)
- Config: Preset values (HERO/AMBIENT/READ)
- Adapter: Custom uniform definitions
- Init: Boilerplate wrapper

---

## Preset Philosophy

**HERO:** Maximum intensity (landing pages, CTAs)
- spatial: 1.0, temporal: 1.0, cursor: 1.0, calm: 0.0

**AMBIENT:** Balanced (content sections)
- spatial: 0.3-0.6, temporal: 0.3-0.6, cursor: 0.3, calm: 0.3

**READ:** Minimal (text-heavy content)
- spatial: <0.1, temporal: <0.1, cursor: 0.0, calm: >0.7

---

## Files Generated

```
my-shader/
├── shader.js       # GLSL fragment shader
├── config.js       # Preset definitions
├── adaptor.js      # Uniform management
├── init.js         # Initialization wrapper
└── demo.html       # Test page
```

---

## Tips

**Be specific:** "Flowing particles, blue/white gradient, scatter on hover" > "Cool effect"

**Test incrementally:** Validate after each step before proceeding

**Iterate naturally:** Easy to refine individual files

**Total time:** ~10-15 minutes from idea to working shader

---

## Additional Resources

- **[Complete Guide](custom-shader-guide.md)** - Manual development walkthrough
- **[Quick Reference](quick-reference.md)** - Fast lookup for experienced devs
- **[Architecture](architecture.md)** - System design details
- **[Templates](templates/)** - Code templates with annotations
