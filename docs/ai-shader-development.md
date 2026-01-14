# AI-Assisted Shader Development

Guide for using AI tools (GitHub Copilot, ChatGPT, Claude, etc.) to develop custom shaders for morphbg.

---

## Overview

AI can significantly speed up shader development by:
1. **Generating boilerplate** - Adapters, configs, HTML
2. **Creating shader effects** - GLSL code from descriptions
3. **Debugging** - Finding issues and suggesting fixes
4. **Optimizing** - Improving performance
5. **Learning** - Explaining shader concepts

---

## Recommended Workflow

### Phase 1: Concept → Prompt
1. **Define your vision** clearly
2. **Break it into components** (shader, config, adapter)
3. **Use structured prompts** (see below)

### Phase 2: Generate → Review
1. **Generate code** with AI
2. **Review and understand** what was generated
3. **Test immediately** (don't accumulate untested code)

### Phase 3: Iterate → Refine
1. **Ask for specific modifications**
2. **Test each change**
3. **Combine successful iterations**

---

## Prompt Templates

### 1. Shader Effect Generation

**Template:**
```
Create a GLSL fragment shader for morphbg with this effect:
[DESCRIBE VISUAL EFFECT]

Requirements:
- Use these morphbg uniforms:
  * u_time (float): elapsed seconds
  * u_resolution (vec2): canvas size
  * u_mouse (vec2): normalized mouse position (0-1)
  * u_spatialMotion (float): 0-1, controls spatial variation
  * u_temporalMotion (float): 0-1, controls animation speed
  * u_cursorEnabled (float): 0-1, controls cursor interaction
  * u_calm (float): 0-1, calmness level

- Custom uniforms I need:
  * [LIST YOUR CUSTOM UNIFORMS]

- Output to gl_FragColor (vec4)
- Use varying vec2 v_uv for coordinates (0-1)

Style: [minimalist/organic/geometric/technical/artistic]
Performance: Must run at 60fps
```

**Example:**
```
Create a GLSL fragment shader for morphbg with this effect:
Flowing particles that move upward with organic motion

Requirements:
- Use these morphbg uniforms:
  * u_time (float): elapsed seconds
  * u_resolution (vec2): canvas size
  * u_mouse (vec2): normalized mouse position (0-1)
  * u_spatialMotion (float): 0-1, controls spatial variation
  * u_temporalMotion (float): 0-1, controls animation speed
  * u_cursorEnabled (float): 0-1, controls cursor interaction
  * u_calm (float): 0-1, calmness level

- Custom uniforms I need:
  * u_particleDensity (float): number of particles
  * u_particleSize (float): size of each particle
  * u_flowSpeed (float): vertical flow speed
  * u_colorPrimary (vec3): particle color
  * u_colorSecondary (vec3): background color

- Output to gl_FragColor (vec4)
- Use varying vec2 v_uv for coordinates (0-1)

Style: organic, flowing, ethereal
Performance: Must run at 60fps
```

---

### 2. Adapter Generation

**Template:**
```
Generate a morphbg shader adapter using the adapter template.

Custom uniforms to manage:
1. [uniformName] (type, range, default)
2. [uniformName] (type, range, default)
...

For each uniform:
- GLSL name: u_[name]
- Default value: [value]
- Data attribute: data-[name]
- Validation: [describe validation rules]
- Accumulate: [yes/no - should blend during scroll?]

Follow the morphbg adapter template structure with:
- extendUniforms()
- initTarget()
- initAcc()
- accumulate()
- finalize()
- applyToTarget()
- updateMaterial()
```

**Example:**
```
Generate a morphbg shader adapter using the adapter template.

Custom uniforms to manage:
1. particleDensity (float, 10-100, default 50)
2. particleSize (float, 0.5-5.0, default 2.0)
3. flowSpeed (float, 0.1-5.0, default 1.0)
4. colorPrimary (vec3, RGB, default [0.2, 0.6, 1.0])
5. colorSecondary (vec3, RGB, default [0.1, 0.1, 0.2])

For each uniform:
- particleDensity: u_particleDensity, data-particle-density, clamp 10-100, accumulate
- particleSize: u_particleSize, data-particle-size, clamp 0.5-5.0, accumulate
- flowSpeed: u_flowSpeed, data-flow-speed, must be positive, accumulate
- colorPrimary: u_colorPrimary, data-color-primary, RGB vec3, accumulate
- colorSecondary: u_colorSecondary, data-color-secondary, RGB vec3, accumulate

Follow the morphbg adapter template structure.
```

---

### 3. Config Generation

**Template:**
```
Create a morphbg shader config with these modes and presets:

Modes (visual styles):
- [modeName]: [description]
- [modeName]: [description]

Presets:
- HERO (dramatic, full motion):
  [custom uniform values for high-impact effect]
  
- AMBIENT (balanced, medium motion):
  [custom uniform values for pleasant effect]
  
- READ (subtle, minimal motion):
  [custom uniform values for text-friendly effect]

Include:
- spatial, temporal, cursor, calm values for each preset
- blendVh: 1.0, transitionVh: 0.5, smoothSpeed: 2.0
```

**Example:**
```
Create a morphbg shader config with these modes and presets:

Modes (visual styles):
- flowing: smooth upward particle flow
- chaotic: random particle movement
- orbiting: particles orbit the center

Presets:
- HERO (dramatic, full motion):
  particleDensity: 30, particleSize: 3.0, flowSpeed: 2.0
  colorPrimary: [0.2, 0.6, 1.0], colorSecondary: [0.0, 0.0, 0.1]
  
- AMBIENT (balanced, medium motion):
  particleDensity: 50, particleSize: 2.0, flowSpeed: 1.0
  colorPrimary: [0.4, 0.5, 0.8], colorSecondary: [0.1, 0.1, 0.15]
  
- READ (subtle, minimal motion):
  particleDensity: 100, particleSize: 1.0, flowSpeed: 0.3
  colorPrimary: [0.9, 0.9, 0.95], colorSecondary: [0.95, 0.95, 0.97]

Include:
- spatial: 1.0/0.5/0.05 for HERO/AMBIENT/READ
- temporal: 1.0/0.5/0.03 for HERO/AMBIENT/READ
- cursor: 1.0/0.3/0.0 for HERO/AMBIENT/READ
- calm: 0.0/0.3/0.8 for HERO/AMBIENT/READ
- blendVh: 1.0, transitionVh: 0.5, smoothSpeed: 2.0
```

---

### 4. Shadertoy Conversion

**Template:**
```
Convert this Shadertoy shader to morphbg format:

[PASTE SHADERTOY CODE]

Changes needed:
1. Replace mainImage() with main()
2. Replace fragColor with gl_FragColor
3. Replace fragCoord with v_uv * u_resolution
4. Replace iTime with u_time
5. Replace iResolution with u_resolution
6. Replace iMouse with u_mouse * u_resolution
7. Add morphbg uniforms: u_spatialMotion, u_temporalMotion, u_cursorEnabled, u_calm
8. Scale animation by u_temporalMotion
9. Scale cursor effects by u_cursorEnabled
10. Apply calm factor: mix(color, vec3(1.0), u_calm * 0.5)

Also identify:
- What custom uniforms would be useful?
- What should be controllable via data attributes?
```

---

### 5. Debugging and Optimization

**Debug Prompt:**
```
This shader has [DESCRIBE ISSUE]:

[PASTE SHADER CODE]

Debug steps:
1. Check for GLSL syntax errors
2. Check uniform types match usage
3. Check for division by zero
4. Check for NaN/Inf potential
5. Suggest console.log points
6. Suggest visual debugging techniques
```

**Optimization Prompt:**
```
Optimize this shader for 60fps performance:

[PASTE SHADER CODE]

Focus on:
1. Reduce expensive operations (sin, cos, pow, sqrt)
2. Precompute constants
3. Minimize texture lookups
4. Reduce branching (if statements)
5. Use cheaper approximations
6. Maintain visual quality
```

---

## GitHub Copilot Tips

### In VS Code with Copilot

**1. Write descriptive comments first:**
```javascript
// Create a particle system that:
// - Spawns 50-100 particles based on u_particleDensity
// - Each particle moves upward with Perlin noise
// - Particles fade at edges based on u_calm
// - Color blends from u_colorPrimary to u_colorSecondary
// - Cursor creates ripples when u_cursorEnabled > 0
```

**2. Let Copilot suggest structure:**
```javascript
void main() {
    // [Press Tab to accept Copilot suggestions]
}
```

**3. Iterate with inline comments:**
```javascript
// Make particles smaller
// Add glow effect
// Slow down animation
```

**4. Use Copilot Chat:**
- `/explain` - Understand existing code
- `/fix` - Debug issues
- `/tests` - Generate test cases
- `/doc` - Generate documentation

---

## ChatGPT / Claude Workflow

### Multi-Step Conversation

**Step 1: Conceptualize**
```
I want to create a custom shader for morphbg. The visual effect should be:
[DESCRIBE YOUR VISION]

Help me break this down into:
1. Core shader effect
2. Required custom uniforms
3. Modes (if needed)
4. Preset values for HERO/AMBIENT/READ
```

**Step 2: Generate Shader**
```
Generate the GLSL fragment shader code using the morphbg template.
Use these custom uniforms we identified:
[LIST UNIFORMS]
```

**Step 3: Generate Config**
```
Generate the config.js file with:
- Modes: [LIST]
- Presets with the values we discussed
```

**Step 4: Generate Adapter**
```
Generate the adaptor.js file managing these uniforms:
[LIST WITH TYPES AND VALIDATION]
```

**Step 5: Refine**
```
The shader looks good but [DESCRIBE ISSUE].
Modify the shader to [SPECIFIC CHANGE].
```

---

## Common AI Pitfalls

### ❌ Don't:
1. **Accept without understanding** - Always review AI-generated code
2. **Accumulate untested code** - Test each iteration
3. **Skip validation** - Always validate uniform ranges
4. **Ignore performance** - Test FPS, optimize if needed
5. **Use outdated patterns** - Ensure AI uses morphbg conventions

### ✅ Do:
1. **Be specific** - Detailed prompts get better results
2. **Iterate gradually** - Small changes, test, repeat
3. **Ask for explanations** - "Explain this shader technique"
4. **Request alternatives** - "Show 3 different approaches"
5. **Validate against docs** - Check against morphbg templates

---

## Example Full Workflow

### Goal: Create "Aurora Wave" Shader

**Prompt 1: Concept**
```
I want to create a custom morphbg shader called "Aurora Wave" with these characteristics:
- Flowing wave patterns like northern lights
- Smooth color gradients (blues, purples, greens)
- Gentle undulating motion
- Responds to cursor by warping nearby waves
- Three modes: subtle, vibrant, ethereal

Help me design:
1. What custom uniforms do I need?
2. What should each preset (HERO/AMBIENT/READ) look like?
3. How should the three modes differ?
```

**AI Response guides you through planning...**

**Prompt 2: Shader**
```
Generate the GLSL fragment shader using morphbg template with:
- Wave pattern using sine waves and noise
- Custom uniforms: u_waveFrequency, u_waveAmplitude, u_colorShift, u_warpStrength
- Three modes controlled by u_mode (0.0=subtle, 1.0=vibrant, 2.0=ethereal)
- Cursor warping controlled by u_cursorEnabled
- Respect u_temporalMotion for animation speed
- Respect u_calm for intensity reduction
```

**Prompt 3: Config**
```
Generate config.js with:
- Modes: subtle (0.0), vibrant (1.0), ethereal (2.0)
- HERO: high frequency, large amplitude, full color shift
- AMBIENT: medium frequency, medium amplitude, moderate color
- READ: low frequency, tiny amplitude, desaturated colors
```

**Prompt 4: Adapter**
```
Generate adaptor.js for:
- waveFrequency (1-20, default 5, data-wave-frequency)
- waveAmplitude (0-2, default 0.5, data-wave-amplitude)
- colorShift (0-1, default 0.5, data-color-shift)
- warpStrength (0-2, default 1.0, data-warp-strength)
```

**Prompt 5: Test & Refine**
```
The waves look good but move too fast at AMBIENT preset.
Reduce temporal values in AMBIENT preset to 0.4.
Also, add more blue tint to READ preset.
```

---

## Learning Resources

### Shader Programming
- [The Book of Shaders](https://thebookofshaders.com/) - Interactive GLSL tutorial
- [Shadertoy](https://www.shadertoy.com/) - Browse 100k+ shaders
- [Inigo Quilez](https://iquilezles.org/) - Advanced techniques
- [GPU Gems](https://developer.nvidia.com/gpugems) - Classic techniques

### AI-Assisted Coding
- [GitHub Copilot Docs](https://docs.github.com/en/copilot)
- [ChatGPT Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)
- [Claude Prompt Engineering](https://docs.anthropic.com/claude/docs/prompt-engineering)

---

## Next Steps

1. **Try the templates** - Start with template files in `docs/templates/`
2. **Use structured prompts** - Copy-paste from this guide
3. **Iterate quickly** - Test each AI suggestion immediately
4. **Learn and adapt** - Understand what the AI generates
5. **Share your shaders!** - Contribute back to morphbg

**Questions?** Open an issue with `[AI-assisted]` tag on [GitHub](https://github.com/cael-prussian/morphbg/issues).
