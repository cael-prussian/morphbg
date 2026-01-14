#!/usr/bin/env node

/**
 * Build script for morphbg bundles
 * Creates bundled files for deployment to jsDelivr
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'dist');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🔨 Building morphbg bundles...\n');

// Helper to read file
function readFile(filePath) {
    return fs.readFileSync(path.join(ROOT_DIR, filePath), 'utf8');
}

// Helper to write file
function writeFile(fileName, content) {
    const outputPath = path.join(OUTPUT_DIR, fileName);
    fs.writeFileSync(outputPath, content, 'utf8');
    const size = (content.length / 1024).toFixed(2);
    console.log(`✓ ${fileName} (${size} KB)`);
}

// 1. Build individual shader bundles
// Each contains: config + shader + adapter
const shaders = [
    {
        id: 'gs1',
        name: 'Topographic Flow',
        files: ['src/shaders/gs1/config.js', 'src/shaders/gs1/shader.js', 'src/shaders/gs1/adaptor.js']
    },
    {
        id: 'gs2',
        name: 'Dynamic Warp',
        files: ['src/shaders/gs2/config.js', 'src/shaders/gs2/shader.js', 'src/shaders/gs2/adaptor.js']
    },
    {
        id: 'gs3',
        name: 'Dot Field',
        files: ['src/shaders/gs3/config.js', 'src/shaders/gs3/shader.js', 'src/shaders/gs3/adaptor.js']
    }
];

console.log('Building individual shader bundles:');
shaders.forEach(shader => {
    const header = `/**
 * morphbg - ${shader.name} Shader Bundle
 * Single-file shader bundle containing: config + shader + adapter
 * https://github.com/cael-prussian/morphbg
 */

`;
    const content = header + shader.files.map(readFile).join('\n\n');
    writeFile(`morphbg-${shader.id}.bundle.js`, content);
});

console.log('\nBuilding composite bundles:');

// 2. Build gs-engine+manager bundle
const engineWithManager = `/**
 * morphbg - Engine with Scroll Manager
 * Contains: Engine + ScrollShaderManager
 * https://github.com/cael-prussian/morphbg
 */

${readFile('src/engine.js')}

${readFile('src/scroll-manager.js')}

// Auto-init manager when multiple shaders detected
(function () {
    function checkAndInitManager() {
        const shaderCount = 
            (window.BG_SHADER_CONFIG ? 1 : 0) +
            (window.BG2_SHADER_CONFIG ? 1 : 0) +
            (window.BG3_SHADER_CONFIG ? 1 : 0);

        if (shaderCount > 1 && window.ScrollShaderManager) {
            console.log(\`ScrollShaderManager: Detected \${shaderCount} shaders, starting auto-switching\`);
            window.ScrollShaderManager.init();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndInitManager);
    } else {
        setTimeout(checkAndInitManager, 50);
    }
})();
`;
writeFile('morphbg-engine.bundle.js', engineWithManager);

// 3. Build complete all-in-one bundle
const allShadersBundled = shaders.map(s => s.files.map(readFile).join('\n\n')).join('\n\n');
const completeBundle = `/**
 * morphbg - Complete Bundle (All-in-One)
 * Includes: Engine + ScrollShaderManager + All 3 Shaders
 * Single file for maximum ease of use - just add Three.js and this file
 * https://github.com/cael-prussian/morphbg
 */

${readFile('src/engine.js')}

${readFile('src/scroll-manager.js')}

${allShadersBundled}

// Auto-init ScrollShaderManager
(function () {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (window.ScrollShaderManager) {
                window.ScrollShaderManager.init();
            }
        });
    } else {
        if (window.ScrollShaderManager) {
            window.ScrollShaderManager.init();
        }
    }
})();
`;
writeFile('morphbg-all.complete.js', completeBundle);

console.log('\n✨ Build complete! Files created in dist/\n');
console.log('Bundle Summary:');
console.log('━'.repeat(60));
console.log('Individual Shader Bundles (load with morphbg-engine.bundle.js):');
console.log('  • morphbg-gs1.bundle.js - Topographic Flow');
console.log('  • morphbg-gs2.bundle.js - Dynamic Warp');
console.log('  • morphbg-gs3.bundle.js - Dot Field');
console.log('');
console.log('Composite Bundles:');
console.log('  • morphbg-engine.bundle.js - Engine + Manager');
console.log('  • morphbg-all.complete.js - Everything in one file');
console.log('━'.repeat(60));
