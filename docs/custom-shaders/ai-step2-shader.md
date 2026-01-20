# Step 2: Shader Generation

**AI Task:** Find reference shaders and adapt to morphbg conventions.

---

## ⚠️ CRITICAL: Reference-First Development

**DO NOT** attempt to write complex shaders from scratch. Visual effects are learned by **seeing working examples**.

### Step 2A: Find Reference Shaders

**ALWAYS search for existing shader examples BEFORE writing code:**

1. **Identify visual keywords** from developer's description:

   - Effect type: "ripple", "waves", "particles", "noise", "metallic", "fluid"
   - Surface quality: "chrome", "glass", "liquid", "fabric"
   - Motion: "flowing", "rotating", "pulsing", "expanding"

2. **Recommend searches to developer:**

   ```
   "I recommend searching ShaderToy for these terms to find reference examples:
   - '[keyword1] [keyword2]' (e.g., 'ripple metallic')
   - '[effect] [surface]' (e.g., 'wave chrome')

   Please share any promising shader code you find, and I'll adapt it to morphbg."
   ```

3. **Common shader resources:**
   - ShaderToy (shadertoy.com) - best for GLSL examples
   - GLSL Sandbox (glslsandbox.com)
   - The Book of Shaders examples

**Why this works:**

- Existing shaders have proven visual quality
- Math/formulas are correct and optimized
- Easier to adapt than generate from scratch
- Faster iteration to desired look

---

## Input From Developer

- Effect definition from Step 1
- Reference shader code (from ShaderToy, etc.)
- `templates/shader.template.js` file

---

## Step 2B: Adapt Reference Shader

Once developer provides reference shader code, adapt it to morphbg conventions:

### Shader Adaptation Checklist

1. **Convert ShaderToy conventions:**

   ```glsl
   // ShaderToy → morphbg
   iTime           → u_time
   iResolution     → u_resolution
   iMouse          → u_mouse (normalized 0-1, not pixels)
   fragCoord       → v_uv * u_resolution (if needed)
   mainImage()     → main()
   fragColor       → gl_FragColor
   ```

2. **Add morphbg motion controls:**

   ```glsl
   float time = u_time * u_temporalMotion;  // Scale animation speed
   float intensity = baseIntensity * u_spatialMotion;  // Scale effect strength
   ```

3. **Add cursor gating:**

   ```glsl
   if (u_cursorEnabled > 0.5) {
       // Use u_mouse for interaction
   }
   ```

4. **Add calm mode:**

   ```glsl
   // Desaturate colors
   float gray = dot(finalColor, vec3(0.299, 0.587, 0.114));
   finalColor = mix(finalColor, vec3(gray) * 0.8, u_calm * 0.6);

   // Reduce brightness/intensity
   finalColor *= mix(1.0, 0.7, u_calm * 0.5);
   ```

---

## AI Must Generate

Complete `shader.js` file following this structure:

```javascript
window.MY_SHADER_FRAGMENT = `
precision highp float;

// Universal uniforms (morphbg provides these)
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_mode;
uniform float u_modeWeight0;
uniform float u_modeWeight1;
uniform float u_modeWeight2;
uniform float u_spatialMotion;
uniform float u_temporalMotion;
uniform float u_cursorEnabled;
uniform float u_calm;

// Custom uniforms (from Step 1)
uniform float u_customParam1;
uniform vec3 u_customColor;
// ... all custom uniforms

varying vec2 v_uv;

// Helper functions (as needed)
float hash(vec2 p) { /* ... */ }
float noise(vec2 p) { /* ... */ }

void main() {
    vec2 uv = v_uv;
    
    // Scale animation by temporal motion
    float time = u_time * u_temporalMotion;
    
    // [CORE SHADER LOGIC]
    
    // Apply spatial motion to complexity
    // Apply cursor interaction (gated by u_cursorEnabled)
    // Apply calm to simplify/desaturate
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;
```

---

## Reference Shader Adaptation Example

**Input: ShaderToy ripple shader**

```glsl
// ShaderToy version
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float dist = distance(uv, iMouse.xy / iResolution.xy);
    float ripple = sin(dist * 50.0 - iTime * 10.0) / (dist * 50.0);
    fragColor = vec4(vec3(ripple), 1.0);
}
```

**Output: morphbg adapted version**

```glsl
window.MY_RIPPLE_SHADER = \`
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_spatialMotion;
uniform float u_temporalMotion;
uniform float u_cursorEnabled;
uniform float u_calm;

varying vec2 v_uv;

void main() {
    vec2 uv = v_uv;

    // morphbg motion controls
    float time = u_time * u_temporalMotion;
    float intensity = u_spatialMotion;

    // Cursor interaction (gated)
    vec2 center = (u_cursorEnabled > 0.5) ? u_mouse : vec2(0.5);

    // Original ripple logic
    float dist = distance(uv, center);
    float ripple = sin(dist * 50.0 - time * 10.0) / max(dist * 50.0, 0.1);

    // Base color + ripple effect
    vec3 baseColor = vec3(0.2, 0.3, 0.4);  // Always visible
    vec3 color = baseColor + vec3(ripple * intensity);

    // Calm adjustment
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(color, vec3(gray) * 0.8, u_calm * 0.6);

    gl_FragColor = vec4(color, 1.0);
}
\`;
```

**Key changes:**

- Converted ShaderToy uniforms to morphbg conventions
- Scaled animation by `u_temporalMotion`
- Scaled effect by `u_spatialMotion`
- Added cursor gating with `u_cursorEnabled`
- Added base color layer (always visible)
- Added calm desaturation
- Protected division by zero (`max(dist * 50.0, 0.1)`)

---

## Critical Shader Architecture Rules

### 1. Always Provide Base Visual

**PROBLEM:** Effect-only shaders produce blank screens when effect conditions aren't met.

```glsl
// ❌ BAD: Only shows when ripples are active
float totalRipple = calculateRipples();
vec3 color = baseColor * totalRipple;  // Goes dark when totalRipple = 0!
```

```glsl
// ✅ GOOD: Always shows something
vec3 baseColor = vec3(0.5, 0.5, 0.6);  // Visible background
float rippleEffect = calculateRipples();
vec3 color = baseColor + rippleEffect * vec3(0.3);  // Additive effect
```

### 2. Layer Effects, Don't Replace

Build visuals in layers:

1. **Base layer**: Always visible (gradient, color, subtle pattern)
2. **Primary effect**: Main visual (particles, waves, etc.)
3. **Interaction layer**: Mouse/motion response
4. **Calm adjustment**: Desaturation/simplification

### 3. Test Static First

Ensure `u_temporalMotion = 0.0` still shows something interesting.

```glsl
void main() {
    // Base visual (no time dependency)
    vec3 base = gradient(v_uv);

    // Animated effect (time-dependent)
    float time = u_time * u_temporalMotion;
    vec3 effect = calculateWaves(v_uv, time);

    // Combine (base always visible)
    vec3 color = base + effect * u_spatialMotion;
}
```

### 4. Debug Output Early

Start with simple visible output, then add complexity:

```glsl
// Step 1: Verify basic rendering
gl_FragColor = vec4(v_uv.x, v_uv.y, 0.5, 1.0);  // Rainbow gradient

// Step 2: Add time
gl_FragColor = vec4(v_uv.x, v_uv.y, sin(u_time) * 0.5 + 0.5, 1.0);

// Step 3: Add effect logic
vec3 effect = myEffect(v_uv, u_time);
gl_FragColor = vec4(effect, 1.0);
```

### 5. Aspect Ratio Correction (Required by Default)

**DEFAULT PATTERN:** Always use aspect-corrected UVs unless user explicitly requests screen-aligned effects.

```glsl
void main() {
    vec2 uv = v_uv;
    float aspect = u_resolution.x / u_resolution.y;

    // Aspect-corrected UVs (DEFAULT - use for all effects)
    vec2 uvA = vec2(uv.x * aspect, uv.y);
    vec2 centerA = vec2(0.5 * aspect, 0.5);

    // Use uvA for your effect
    vec3 effect = myEffect(uvA, u_time);
}
```

**Only skip aspect correction if user says:**

- "fill the screen", "edge to edge", "viewport-fitted"
- "screen-aligned", "full viewport width/height"
- Explicitly wants screen-stretching behavior

**Why this is default:**

- Preserves visual proportions on all screen sizes
- Prevents distortion of shapes, patterns, and textures
- Matches user's mental model of "how it should look"

---

## Requirements

**Must use motion controls:**

- Multiply time/animation by `u_temporalMotion`
- Scale spatial complexity by `u_spatialMotion`
- Gate cursor effects with `u_cursorEnabled`
- Simplify effect using `u_calm` (desaturate, reduce detail, etc.)

**Performance:**

- Target 60fps
- Minimize expensive ops (pow, exp, sqrt)
- Prefer: mix(), smoothstep(), sin(), cos()

**Code quality:**

- Include brief comments explaining key sections
- Handle edge cases (zero values, divisions)
- Use provided helper functions or add as needed

---

## Validation

Test with minimal HTML:

```html
<script src="https://cdn.jsdelivr.net/npm/three@0.150.0/build/three.min.js"></script>
<script>
  /* paste shader code */
</script>
<script>
  const material = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(800, 600) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_spatialMotion: { value: 1.0 },
      u_temporalMotion: { value: 1.0 },
      u_cursorEnabled: { value: 1.0 },
      u_calm: { value: 0.0 },
      // ... custom uniforms with test values
    },
    vertexShader: `varying vec2 v_uv; void main() { v_uv = uv; gl_Position = vec4(position, 1.0); }`,
    fragmentShader: window.MY_SHADER_FRAGMENT,
  });
  // ... render loop
</script>
```

Check:

- [ ] Compiles without errors
- [ ] Animates when `u_time` updates
- [ ] **CRITICAL**: Setting `u_temporalMotion = 0.0` still shows visible output
- [ ] **CRITICAL**: Shader never outputs pure black (vec4(0,0,0,1)) as default
- [ ] Setting `u_spatialMotion = 0.0` shows simplified but visible effect
- [ ] Setting `u_calm = 1.0` shows calmed/desaturated but visible effect
- [ ] Effect looks roughly correct

**Debugging Checklist:**

- [ ] Replace main() with `gl_FragColor = vec4(v_uv, 0.5, 1.0)` → Should see rainbow
- [ ] Add `+ 0.0001` to denominators to avoid division by zero
- [ ] Ensure all color calculations produce values in 0-1 range
- [ ] **REQUIRED**: Use aspect-corrected UVs (`uvA`) by default for all effects
- [ ] Test on different aspect ratios: visual proportions should remain consistent
