/**
 * Custom Shader - Configuration Template
 * 
 * Define modes (visual styles) and presets (motion levels) for your shader.
 */

window.CUSTOM_SHADER_CONFIG = {
    // ==================================================================
    // MODES (Optional)
    // ==================================================================
    // Define different visual styles for your shader.
    // Users can switch between modes using data-shader-mode attribute.
    // 
    // Example: data-shader-mode="flowing"
    // 
    // If you don't need modes, you can omit this or use a single mode.

    modes: {
        'default': 0.0,        // Your default visual style
        'alternate': 1.0,      // Alternative visual style
        'experimental': 2.0    // Experimental visual style
    },

    // ==================================================================
    // PRESETS (Required)
    // ==================================================================
    // Define motion levels: HERO (dramatic), AMBIENT (balanced), READ (subtle)
    // Users select presets via: data-shader-preset="HERO"

    presets: {
        // ---- HERO PRESET ----
        // Use for: Landing pages, hero sections, attention-grabbing content
        // Characteristics: Full motion, dramatic, eye-catching
        HERO: {
            // Universal motion controls (required for all presets)
            spatial: 1.0,          // 1.0 = full spatial variation
            temporal: 1.0,         // 1.0 = full animation speed
            cursor: 1.0,           // 1.0 = full cursor interaction
            calm: 0.0,             // 0.0 = no calming effect

            // Your custom uniforms (match what you defined in adaptor.js)
            density: 10.0,
            speed: 1.5,
            intensity: 1.0,
            colorA: [1.0, 0.2, 0.5],    // RGB array
            colorB: [0.2, 0.5, 1.0]
        },

        // ---- AMBIENT PRESET ----
        // Use for: General content sections, about pages, features
        // Characteristics: Balanced motion, pleasant, not too distracting
        AMBIENT: {
            spatial: 0.5,          // 50% spatial variation
            temporal: 0.5,         // 50% animation speed
            cursor: 0.3,           // 30% cursor interaction
            calm: 0.3,             // 30% calming

            density: 15.0,
            speed: 0.8,
            intensity: 0.6,
            colorA: [0.8, 0.4, 0.6],
            colorB: [0.4, 0.6, 0.8]
        },

        // ---- READ PRESET ----
        // Use for: Text-heavy sections, articles, documentation
        // Characteristics: Minimal motion, subtle, text-friendly
        READ: {
            spatial: 0.05,         // 5% spatial variation (nearly static)
            temporal: 0.03,        // 3% animation (very slow)
            cursor: 0.0,           // No cursor interaction
            calm: 0.8,             // 80% calming (very subtle)

            density: 20.0,
            speed: 0.3,
            intensity: 0.2,
            colorA: [0.95, 0.95, 0.95],  // Near white
            colorB: [0.9, 0.92, 0.95]    // Slightly blue-tinted
        }
    },

    // ==================================================================
    // TRANSITION SETTINGS
    // ==================================================================
    // Control how shaders blend during scroll transitions

    blendVh: 1.0,              // Viewport heights to blend (1.0 = 100vh)
    transitionVh: 0.5,         // Overlap band for transitions (0.5 = 50vh)
    smoothSpeed: 2.0           // Transition smoothing speed (higher = faster)
};

// ==================================================================
// PRESET DESIGN TIPS
// ==================================================================

/*
HERO Preset Guidelines:
- Full motion (spatial: 1.0, temporal: 1.0)
- Strong effects, high contrast
- Use for first impressions and call-to-actions
- Performance: Should still hit 60fps
- Example values: High density, fast speed, vivid colors

AMBIENT Preset Guidelines:
- Medium motion (spatial: 0.3-0.6, temporal: 0.3-0.6)
- Balanced, not too attention-grabbing
- Use for general content sections
- Should complement text without overwhelming
- Example values: Moderate density, medium speed, softer colors

READ Preset Guidelines:
- Minimal motion (spatial: <0.1, temporal: <0.1)
- Very subtle, nearly static
- High calm value (0.7-0.9)
- Must not interfere with text readability
- Example values: High density (fine detail), slow speed, neutral colors
- Tip: Test with actual text overlays

Color Recommendations:
- HERO: Vivid, contrasting colors (brand colors)
- AMBIENT: Softer, harmonious colors
- READ: Near-white or light grays, minimal saturation

Motion Philosophy:
- temporal controls time-based animation
- spatial controls position-based variation
- cursor enables/disables mouse interaction
- calm reduces overall intensity (multiplier effect)
*/
