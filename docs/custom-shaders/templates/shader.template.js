/**
 * Custom Shader - Fragment Shader Template
 * 
 * This is your shader's visual logic. Replace the example code
 * with your own GLSL fragment shader code.
 * 
 * Prototyping tip: Start in Shadertoy, then convert using the guide.
 */

window.BG_CUSTOM_SHADER_FRAG = `
precision highp float;

// ==================================================================
// UNIVERSAL UNIFORMS (Provided by morphbg engine)
// ==================================================================
uniform float u_time;              // Elapsed time in seconds
uniform vec2 u_resolution;         // Canvas size (width, height) in pixels
uniform vec2 u_mouse;              // Mouse position normalized (0-1, 0-1)
uniform float u_mode;              // Current mode value (e.g., 0.0, 1.0, 2.0)

// Motion controls (from presets: HERO, AMBIENT, READ)
uniform float u_spatialMotion;     // 0.0-1.0: Controls spatial variation
uniform float u_temporalMotion;    // 0.0-1.0: Controls time-based motion speed
uniform float u_cursorEnabled;     // 0.0-1.0: Cursor interaction strength
uniform float u_calm;              // 0.0-1.0: Calmness level (1.0 = very calm)

// ==================================================================
// YOUR CUSTOM UNIFORMS (Define these in adaptor.js)
// ==================================================================
// Example uniforms - replace with your own:
uniform float u_density;           // Example: Particle density or pattern frequency
uniform float u_speed;             // Example: Animation speed multiplier
uniform float u_intensity;         // Example: Effect intensity
uniform vec3 u_colorA;             // Example: Primary color
uniform vec3 u_colorB;             // Example: Secondary color

// ==================================================================
// VARYING (Provided by vertex shader)
// ==================================================================
varying vec2 v_uv;                 // UV coordinates (0-1, 0-1)

// ==================================================================
// HELPER FUNCTIONS (Optional - add your own)
// ==================================================================

// Example: Simple 2D random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Example: Smooth minimum for blending
float smin(float a, float b, float k) {
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * 0.25;
}

// ==================================================================
// MAIN SHADER LOGIC
// ==================================================================
void main() {
    // Normalized UV coordinates (0-1)
    vec2 uv = v_uv;
    
    // Aspect-corrected coordinates (-aspect to +aspect, -1 to 1)
    vec2 st = (2.0 * uv - 1.0) * vec2(u_resolution.x / u_resolution.y, 1.0);
    
    // Time scaled by temporal motion control
    float time = u_time * u_temporalMotion * u_speed;
    
    // Mouse influence (optional)
    vec2 mouseOffset = (u_mouse - 0.5) * 2.0;  // -1 to 1
    float mouseInfluence = u_cursorEnabled;
    
    // ==================================================================
    // YOUR SHADER CODE STARTS HERE
    // ==================================================================
    
    // Example 1: Simple animated gradient
    float gradient = sin(time + st.y * u_density) * 0.5 + 0.5;
    vec3 color = mix(u_colorA, u_colorB, gradient);
    
    // Example 2: Add cursor interaction
    float distToMouse = distance(uv, u_mouse);
    float cursorEffect = smoothstep(0.5, 0.0, distToMouse) * mouseInfluence;
    color += vec3(cursorEffect * u_intensity);
    
    // Example 3: Add spatial motion variation
    float spatial = sin(st.x * 5.0 + time) * u_spatialMotion;
    color *= 1.0 + spatial * 0.2;
    
    // ==================================================================
    // YOUR SHADER CODE ENDS HERE
    // ==================================================================
    
    // Apply calm factor (makes effect more subtle for READ preset)
    color = mix(color, vec3(1.0), u_calm * 0.5);
    
    // Output final color
    gl_FragColor = vec4(color, 1.0);
}
`;
