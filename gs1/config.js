window.BG_SHADER_CONFIG = {
    modes: {
        'atmospheric-mesh': 0.0,
        'topographic-flow': 1.0,
        'fabric-warp': 2.0
    },

    presets: {
        HERO: {
            spatial: 1.0,
            temporal: 1.0,
            cursor: 1.0,
            cursorGlobal: 0.0,
            flatten: 0.0,
            heightContrast: 1.0,
            calm: 0.0
        },

        READ: {
            spatial: 0.05,
            temporal: 0.03,
            cursor: 0.0,
            cursorGlobal: 1.0,
            flatten: 0.85,
            heightContrast: 0.25,
            calm: 0.75
        },

        AMBIENT: {
            spatial: 0.25,
            temporal: 0.20,
            cursor: 0.0,
            cursorGlobal: 0.0,
            flatten: 0.35,
            heightContrast: 0.6,
            calm: 0.4
        }
    },

    blendVh: 1.0,
    transitionVh: 0.5,   // ~50vh overlap band
    smoothSpeed: 2.0
};