# Custom Shader Development

Documentation for creating custom shaders for morphbg.

---

## Quick Start

**Want to build a custom shader?**

### Option 1: AI-Assisted (Recommended)
Follow the [AI workflow](ai-workflow.md):
0. AI learns morphbg architecture (provide engine + example shader)
1. **Find reference shaders** (ShaderToy, GLSL Sandbox) - AI recommends search terms
2. **Adapt shader code** to morphbg conventions
3. Create config & adapter
4. Package and test

**Key insight:** Don't generate shaders from scratch - find and adapt existing examples.

**Time:** ~10-15 minutes

### Option 2: Manual Development
Follow the [complete development guide](custom-shader-guide.md) for step-by-step instructions.

**Time:** ~1-2 hours

---

## Documentation

- **[AI Workflow](ai-workflow.md)** - Quick AI-assisted development process
- **[Complete Guide](custom-shader-guide.md)** - Comprehensive manual development guide
- **[Quick Reference](quick-reference.md)** - Fast lookup for experienced developers
- **[Architecture](architecture.md)** - System design and data flow diagrams
- **[Templates](templates/)** - Code templates for all required files

---

## AI Step Files

For AI-assisted development, provide these files as context:

### AI Step Files (Feed to AI in sequence)

0. **[ai-step0-context.md](ai-step0-context.md)** - Architecture review
1. **[ai-step1-define.md](ai-step1-define.md)** - Effect definition & uniform identification
   - **Reference: [glsl-translation-guide.md](glsl-translation-guide.md)** - Natural language → GLSL patterns
2. **[ai-step2-shader.md](ai-step2-shader.md)** - GLSL fragment shader generation
3. **[ai-step3-config-adapter.md](ai-step3-config-adapter.md)** - Config & adapter generation
4. **[ai-step4-package.md](ai-step4-package.md)** - Init wrapper & demo HTML

---

## File Structure

A complete custom shader consists of 4 files:

```
my-shader/
├── shader.js       # GLSL fragment shader (your visual effect)
├── config.js       # Preset definitions (HERO/AMBIENT/READ)
├── adaptor.js      # Uniform management (bridge to engine)
└── init.js         # Initialization wrapper (boilerplate)
```

---

## What You Need to Know

**morphbg provides automatically:**
- Scroll tracking and section detection
- Preset blending and smooth transitions
- Universal uniforms (u_time, u_resolution, u_mouse, motion controls)
- Rendering and performance optimization

**You provide:**
- Visual effect (GLSL shader code)
- Custom uniform definitions
- Preset values for different intensity levels

---

## Universal Uniforms

Always available in your shader:

| Uniform | Type | Purpose |
|---------|------|---------|
| `u_time` | float | Elapsed seconds |
| `u_resolution` | vec2 | Canvas dimensions |
| `u_mouse` | vec2 | Mouse position (0-1) |
| `u_spatialMotion` | float | Spatial complexity (0-1) |
| `u_temporalMotion` | float | Animation speed (0-1) |
| `u_cursorEnabled` | float | Cursor interaction (0-1) |
| `u_calm` | float | Effect simplification (0-1) |
| `v_uv` | vec2 | Normalized coordinates (0-1) |

---

## Preset Philosophy

**HERO** - Maximum drama (landing pages, CTAs)
- Full motion, vivid colors, interactive

**AMBIENT** - Balanced (content sections)
- Pleasant background, not distracting

**READ** - Minimal (text-heavy content)
- Subtle, text-friendly, almost static

---

## Getting Help

- **Examples:** See `src/shaders/gs1`, `gs2`, `gs3` for reference implementations
- **Issues:** [GitHub Issues](https://github.com/cael-prussian/morphbg/issues)
- **Showcase:** Tag with `[showcase]` to share your creation
