# Step 1: Effect Definition & Reference Search

**AI Task:** Understand visual effect and recommend shader references for developer to find.

**Prerequisites:** AI has reviewed Step 0 context (engine, existing shader, architecture)

---

## Input From Developer

Visual effect description (plain English)

---

## AI Should Output

### 1. Effect Summary
Confirm understanding of the visual effect

### 2. Shader Reference Search Recommendations

**CRITICAL:** Recommend specific search terms for finding reference shaders BEFORE attempting to write code.

**Extract visual keywords from description:**
- Effect type: "ripple", "wave", "particle", "noise", "fluid", "distortion"
- Surface quality: "metallic", "chrome", "glass", "liquid", "fabric", "plasma"
- Motion type: "flowing", "rotating", "pulsing", "expanding", "turbulent"

**Output format:**
```
I recommend searching ShaderToy for these combinations:
1. "[keyword1] [keyword2]" - for the [visual aspect] effect
2. "[keyword3] [surface]" - for the [appearance quality]
3. "[motion] [pattern]" - for the [animation style]

Please share promising shader code you find, and I'll adapt it to morphbg.
If you prefer to generate from scratch, I can provide custom uniforms list.
```

**Example:**
```
For "liquid metal ripples", I recommend:
1. "ripple metallic" - for expanding wave patterns
2. "chrome reflection" - for metal surface appearance  
3. "fluid animation" - for organic motion

Search on shadertoy.com or glslsandbox.com
```

### 3. Custom Uniforms List (If generating from scratch)

**ONLY if developer wants to skip references or no suitable examples found.**

**IMPORTANT:** Only create uniforms for parameters NOT provided by engine.

**Engine provides (DO NOT create these):**
- u_time, u_resolution, u_mouse, u_mode
- u_spatialMotion, u_temporalMotion, u_cursorEnabled, u_calm

**Create custom uniforms for:**
- Effect-specific parameters (particle count, wave frequency, etc.)
- Color palettes
- Intensity/scale modifiers
- Effect-specific behavior toggles
For each uniform:
- Name (e.g., `particleDensity`)
- Type (float, vec2, vec3, etc.)
- Reasonable value range
- Default value
- Purpose/description

### 3. Motion Control Responses
How should the effect respond to:
- **u_spatialMotion** (0-1): Spatial complexity/variation
- **u_temporalMotion** (0-1): Animation speed
- **u_cursorEnabled** (0-1): Mouse interaction strength
- **u_calm** (0-1): Effect simplification

### 4. Design Notes
Any important technical considerations or decisions

---

## Example Output

```
Effect: Flowing particles drifting upward with noise displacement

Custom Uniforms:
1. particleDensity (float, 10-100, default 30)
   - Controls number of particles rendered
   
2. particleSize (float, 0.5-5.0, default 2.0)
   - Size of each particle in pixels
   
3. flowSpeed (float, 0.1-3.0, default 1.0)
   - Base upward drift velocity
   
4. noiseScale (float, 1.0-20.0, default 5.0)
   - Frequency of noise displacement
   
5. colorA (vec3, RGB, default [1.0, 0.8, 0.9])
   - Primary particle color
   
6. colorB (vec3, RGB, default [0.6, 0.8, 1.0])
   - Secondary particle color for variation

Motion Control Responses:
- u_spatialMotion: Scales noiseScale and particle distribution randomness
- u_temporalMotion: Multiplies flowSpeed and noise evolution rate
- u_cursorEnabled: Gates the mouse scatter behavior (0=off, 1=full)
- u_calm: Reduces particle count, slows motion, desaturates colors

Design Notes:
- Use hash function for particle positions
- Perlin noise for organic displacement
- Distance-based mouse repulsion when enabled
```

---

## Validation

Before Step 2:
- [ ] Effect description is clear
- [ ] All needed uniforms identified
- [ ] Ranges and defaults are reasonable
- [ ] Motion control behaviors defined
