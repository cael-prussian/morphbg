# Natural Language to GLSL Translation Guide

**Purpose:** Help AI convert user's visual descriptions into concrete GLSL shader techniques.

---

## Visual Concepts → GLSL Patterns

### Motion & Animation

| User Says | GLSL Technique | Code Pattern |
|-----------|----------------|--------------|
| "flowing", "drifting" | Time-based offset + noise | `pos + vec2(sin(time), cos(time)) * noise(pos)` |
| "spinning", "rotating" | Rotation matrix | `mat2(cos(a), -sin(a), sin(a), cos(a)) * uv` |
| "pulsing", "breathing" | Sine wave modulation | `scale * (sin(time * freq) * 0.5 + 0.5)` |
| "expanding", "growing" | Time-based scale | `length(uv) - time * speed` |

### Shapes & Patterns

| User Says | GLSL Technique | Code Pattern |
|-----------|----------------|--------------|
| "ripples", "waves", "rings" | Distance field + sine | `sin(length(uv - center) * freq - time)` |
| "circles", "dots", "particles" | Grid iteration + hash | `for (int i = 0; i < N; i++) { dist = length(uv - hashPos(i)); }` |
| "stripes", "lines" | UV coordinate modulation | `sin(uv.x * frequency)` or `mod(uv.y, spacing)` |
| "grid", "tiles" | Floor + fract | `vec2 cell = floor(uv * scale); vec2 local = fract(uv * scale);` |

### Textures & Surfaces

| User Says | GLSL Technique | Code Pattern |
|-----------|----------------|--------------|
| "organic", "natural", "flowing" | Perlin noise, fbm | `fbm(uv * scale + time)` |
| "metallic", "chrome", "mirror" | **Strong Fresnel + specular highlights** | `pow(1.0 - dot(N, V), 3.0) * 2.0` |
| "reflective", "shiny", "polished" | **Environment reflection + high contrast** | `mix(darkColor, brightColor * 1.5, fresnel)` |
| "glitchy", "digital", "pixelated" | Step functions, modulo | `step(0.5, noise(floor(uv * res)))` |
| "smooth", "soft", "blurry" | Wide smoothstep, multiple samples | `smoothstep(0.3, 0.7, value)` |
| "sharp", "hard", "crisp" | Step, tight smoothstep | `step(threshold, value)` or `smoothstep(0.48, 0.52, v)` |

### Color & Lighting

| User Says | GLSL Technique | Code Pattern |
|-----------|----------------|--------------|
| "rainbow", "colorful", "vibrant" | HSV/palette mapping | `palette(time)` or `hsv2rgb(vec3(t, 1, 1))` |
| "glowing", "luminous" | Additive color, high values | `color * intensity` (intensity > 1.0) |
| "dark", "shadowy", "moody" | Multiply by < 1.0 | `color * 0.5` |
| "fade", "transition" | Mix/lerp | `mix(colorA, colorB, t)` |

---

## Common Effect Recipes

**Note:** All examples use aspect-corrected UVs by default.

### 1. Expanding Ripples

```glsl
vec3 ripples(vec2 uv, float time, float aspect) {
    vec2 uvA = vec2(uv.x * aspect, uv.y);
    vec2 centerA = vec2(0.5 * aspect, 0.5);
    float dist = length(uvA - centerA);
    float ring = sin(dist * 20.0 - time * 3.0);
    ring = smoothstep(0.4, 0.6, ring);
    return vec3(ring);
}
```

### 2. Flowing Particles

```glsl
vec3 particles(vec2 uv, float time, float aspect) {
    vec2 uvA = vec2(uv.x * aspect, uv.y);
    vec3 color = vec3(0.0);
    for (int i = 0; i < 10; i++) {
        vec2 pos = hash22(vec2(float(i)));
        pos.x *= aspect;
        pos.y = fract(pos.y + time * 0.1);
        float dist = length(uvA - pos);
        color += smoothstep(0.02, 0.0, dist);
    }
    return color;
}
```

### 3. Organic Noise Field

```glsl
vec3 organicField(vec2 uv, float time, float aspect) {
    vec2 uvA = vec2(uv.x * aspect, uv.y);
    float n = fbm(uvA * 3.0 + time * 0.2);
    vec3 color = palette(n);
    return color;
}
```

### 4. Metallic Surface

```glsl
vec3 metallic(vec2 uv, float aspect) {
    vec2 uvA = vec2(uv.x * aspect, uv.y);
    vec2 centerA = vec2(0.5 * aspect, 0.5);
    vec3 offset = vec3(uvA - centerA, 0.0);
    
    // Normal for lighting calculations
    vec3 normal = normalize(vec3(offset.xy, 0.5));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    
    // Strong Fresnel (edge glow) - KEY for metallic look
    float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 3.0);
    
    // Simulated environment reflection (dark center, bright edges)
    vec3 darkColor = vec3(0.3, 0.35, 0.4);   // Dark metal
    vec3 brightColor = vec3(1.2, 1.3, 1.5);  // Bright highlights (>1.0!)
    
    // Mix based on fresnel - creates chrome look
    vec3 color = mix(darkColor, brightColor, fresnel);
    
    // Optional: Add specular highlight
    vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
    vec3 reflectDir = reflect(-viewDir, normal);
    float spec = pow(max(dot(reflectDir, lightDir), 0.0), 32.0);
    color += spec * vec3(1.5);  // Bright white highlight
    
    return color;
}
```

**Key Principles for Metallic/Chrome:**
- **High contrast**: Dark valleys (0.2-0.4) + bright highlights (1.2-2.0)
- **Strong Fresnel**: Use exponent 2-4, multiply by 1.5-3.0
- **Sharp edges**: Tight smoothstep ranges (< 0.1) or step functions
- **HDR colors**: Values > 1.0 for bloom/glow effect
- **Environment fake**: Mix dark/bright based on viewing angle

---

## Critical: Aspect Ratio Correction (Default Pattern)

**DEFAULT BEHAVIOR:** Always use aspect-corrected UVs unless user explicitly requests screen-aligned effects.

**WHY:** Raw UV coordinates (0-1, 0-1) stretch with screen dimensions, distorting visual proportions.

**Standard Pattern (use by default):**

```glsl
void main() {
    vec2 uv = v_uv;  // Original (0-1, 0-1)
    
    // Calculate aspect ratio
    float aspect = u_resolution.x / u_resolution.y;
    
    // Aspect-corrected UVs (DEFAULT - preserves visual proportions)
    vec2 uvA = vec2(uv.x * aspect, uv.y);
    vec2 centerA = vec2(0.5 * aspect, 0.5);
    
    // Use uvA for most effects
    float dist = length(uvA - centerA);
    vec3 effect = myEffect(uvA, u_time);
}
```

**When to use aspect-corrected (DEFAULT):**
- ✅ Almost all effects (particles, ripples, noise, gradients, etc.)
- ✅ Any effect where visual proportions matter
- ✅ When user doesn't specify screen-aligned behavior
- ✅ Circles, organic shapes, patterns, textures

**When to skip aspect correction (RARE):**
- ❌ User explicitly says "screen-width", "full viewport", "edge-to-edge"
- ❌ Intentional screen-aligned effects (e.g., "vertical stripes filling viewport")
- ❌ UI elements that should stretch with screen

**Natural Language that means SKIP correction:**
- "fill the screen", "edge to edge", "full viewport width"
- "screen-aligned", "viewport-fitted"
- "horizontal/vertical stripes from edge to edge"

---

## Required Helper Functions Library

### Noise Functions

```glsl
// Hash (pseudo-random)
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.78));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
    float n = hash21(p);
    return vec2(hash21(p + n), hash21(p + n * 2.0));
}

// Perlin-like noise
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Fractal Brownian Motion (layered noise)
float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.02;
        amplitude *= 0.5;
    }
    return value;
}
```

### Utility Functions

```glsl
// Smooth minimum (for blending shapes)
float smin(float a, float b, float k) {
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * 0.25;
}

// Rotation matrix
mat2 rot(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

// Simple palette
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
}
```

---

## Metallic/Chrome Effects Deep Dive

**User triggers:** "metallic", "chrome", "mirror", "shiny", "reflective", "mercury", "liquid metal", "polished"

### Core Technique: Strong Fresnel + High Contrast

```glsl
// Calculate normal (varies with surface)
vec3 normal = normalize(vec3(uvOffset, depth));
vec3 viewDir = vec3(0.0, 0.0, 1.0);

// Strong Fresnel effect (KEY ingredient)
float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 3.0);

// Environment reflection simulation
vec3 darkMetal = vec3(0.2, 0.25, 0.3);    // Shadows/valleys
vec3 brightMetal = vec3(1.3, 1.4, 1.6);   // Highlights (>1.0!)

vec3 metalColor = mix(darkMetal, brightMetal, fresnel);
```

### Critical Parameters for Metallic Look:

1. **Fresnel Exponent**: 2.0-4.0 (higher = sharper edge glow)
2. **Fresnel Multiplier**: 1.5-3.0 (how bright the edges are)
3. **Dark Value**: 0.2-0.4 (not pure black, keeps detail)
4. **Bright Value**: 1.2-2.0 (over 1.0 for bloom effect)
5. **Edge Sharpness**: smoothstep range < 0.1 for crisp transitions

### Common Mistakes to Avoid:

❌ **Too weak Fresnel:**
```glsl
// BAD: Only adds 0.3 brightness
baseColor += fresnel * 0.3;
```

✅ **Strong Fresnel:**
```glsl
// GOOD: Multiplies by 2.0, creates dramatic effect
color = mix(dark, bright, fresnel);
color += fresnel * 1.5;
```

❌ **Low contrast:**
```glsl
// BAD: Base too bright, no dark areas
vec3 base = vec3(0.7, 0.8, 0.9) * 0.8;
```

✅ **High contrast:**
```glsl
// GOOD: Dark valleys, bright peaks
vec3 dark = vec3(0.3, 0.35, 0.4);
vec3 bright = vec3(1.2, 1.3, 1.5);
```

❌ **Blurry edges:**
```glsl
// BAD: Wide transition makes it soft
smoothstep(-0.3, 0.3, value);
```

✅ **Sharp edges:**
```glsl
// GOOD: Tight range for crisp metal look
smoothstep(0.45, 0.55, value);
// OR
step(0.5, value);  // Hard edge
```

### Complete Chrome Ripples Example:

```glsl
void main() {
    vec2 uv = v_uv;
    float aspect = u_resolution.x / u_resolution.y;
    vec2 uvA = vec2(uv.x * aspect, uv.y);
    vec2 centerA = vec2(0.5 * aspect, 0.5);
    
    // === BASE METALLIC LAYER ===
    vec3 normal = normalize(vec3(uvA - centerA, 0.5));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 3.0);
    
    // Chrome gradient (dark to bright)
    vec3 darkChrome = vec3(0.3, 0.35, 0.4);
    vec3 brightChrome = vec3(1.3, 1.4, 1.6);
    vec3 baseColor = mix(darkChrome, brightChrome, fresnel * 0.7 + 0.3);
    
    // === RIPPLE LAYER ===
    float dist = length(uvA - centerA);
    float ripple = sin(dist * 15.0 - u_time * 2.0);
    
    // SHARP ripple edges (not blurry)
    ripple = smoothstep(0.4, 0.5, ripple) - smoothstep(0.5, 0.6, ripple);
    
    // Add ripples as bright bands
    vec3 rippleColor = vec3(1.5) * ripple;  // Over 1.0 for bloom
    
    // === COMBINE ===
    vec3 finalColor = baseColor + rippleColor * 0.5;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
```

### Checklist for Metallic Effects:

- [ ] Fresnel exponent 2.0-4.0
- [ ] Bright highlights > 1.0 (for bloom)
- [ ] Dark areas 0.2-0.4 (not black)
- [ ] High contrast ratio (dark:bright = 1:4 or more)
- [ ] Sharp edges (smoothstep range < 0.1)
- [ ] Environment reflection simulation (dark→bright gradient)

---

## Translation Workflow

1. **Extract Keywords**: Identify visual descriptors from user's description
2. **Map to Techniques**: Use table above to find GLSL patterns
3. **Choose Base Layer**: Start with always-visible foundation
4. **Add Effects**: Layer techniques on top
5. **Integrate Motion Controls**: Apply u_spatialMotion, u_temporalMotion, u_calm
6. **Test Static First**: Verify base visual with motion = 0

### Example: "Liquid mercury ripples"

**Keywords:** liquid, mercury, ripples
**Mapping:**
- "liquid" → organic noise, smooth flow
- "mercury" → metallic/chrome, high reflectivity
- "ripples" → expanding rings, distance fields
- **"ripples" triggers aspect correction** ✓

**Translation:**
```glsl
void main() {
    vec2 uv = v_uv;
    
    // CRITICAL: Aspect correction for circular ripples
    float aspect = u_resolution.x / u_resolution.y;
    vec2 uvA = vec2(uv.x * aspect, uv.y);
    vec2 centerA = vec2(0.5 * aspect, 0.5);
    
    // Base metallic color (always visible)
    vec3 baseColor = vec3(0.7, 0.8, 0.9) * 0.8;
    
    // Ripple effect (using aspect-corrected coordinates)
    float time = u_time * u_temporalMotion;
    float dist = length(uvA - centerA);
    float ripple = sin(dist * 15.0 - time * 2.0);
    ripple = smoothstep(0.3, 0.7, ripple) * u_spatialMotion;
    
    // Metallic reflection
    vec3 normal = normalize(vec3(uvA - centerA, 1.0));
    vec3 viewDir = vec3(0, 0, 1);
    float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.0);
    
    // Combine
    vec3 color = baseColor + ripple * 0.3 + fresnel * 0.4;
    
    // Apply calm (desaturate)
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(color, vec3(gray), u_calm * 0.5);
    
    gl_FragColor = vec4(color, 1.0);
}
```
