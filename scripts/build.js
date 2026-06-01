/**
 * Build script - bundles src/ into worker/worker.js
 * For users who deploy via CF Dashboard "Connect to Git"
 *
 * Usage: npm run build
 * Requires: npm install (esbuild)
 */

const esbuild = require('esbuild');
const path = require('path');

async function build() {
  try {
    await esbuild.build({
      entryPoints: [path.join(__dirname, '..', 'src', 'index.js')],
      bundle: true,
      outfile: path.join(__dirname, '..', 'worker', 'worker.js'),
      format: 'esm',
      target: 'es2022',
      platform: 'browser',
      minify: false, // Keep readable for debugging
      sourcemap: false,
    });
    console.log('✅ Build successful → worker/worker.js');
  } catch (err) {
    console.error('❌ Build failed:', err.message);
    process.exit(1);
  }
}

build();
