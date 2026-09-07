/**
 * Build script - bundles src/ into worker/worker.js
 * For users who deploy via CF Dashboard "Connect to Git"
 *
 * Usage: npm run build
 * Requires: npm install (esbuild)
 */

import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateIcons } from './generate-icons.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function build() {
  try {
    await generateIcons();
    const isMinify = process.env.MINIFY === 'true';
    await esbuild.build({
      entryPoints: [path.join(__dirname, '..', 'src', 'index.js')],
      bundle: true,
      outfile: path.join(__dirname, '..', 'worker', 'worker.js'),
      format: 'esm',
      target: 'es2022',
      platform: 'browser',
      minify: isMinify, // Keep readable for debugging by default, set MINIFY=true for production
      sourcemap: false,
    });
    console.log(`✅ Build successful → worker/worker.js${isMinify ? ' (minified)' : ''}`);
  } catch (err) {
    console.error('❌ Build failed:', err.message);
    process.exit(1);
  }
}

build();
