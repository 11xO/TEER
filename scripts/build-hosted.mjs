import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join, extname } from 'node:path';
import { build as buildClient } from 'vite';
import { build as buildWorker } from 'esbuild';
import { gzipSync } from 'node:zlib';

const root = resolve('.');
await buildClient({ root });
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };
const assets = {};
function collect(directory, prefix = '') {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.openai' || entry.name === 'server') continue;
    const path = join(directory, entry.name), name = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) collect(path, name);
    else if (entry.isFile()) {
      const data = readFileSync(path);
      assets[name] = { content: data.toString('base64'), type: types[extname(entry.name)] || 'application/octet-stream', etag: `"${createHash('sha256').update(data).digest('hex')}"` };
    } else throw new Error('Hosted assets must be regular files.');
  }
}
collect(join(root, 'dist'));
await buildWorker({ entryPoints: [join(root, 'api/hosted/index.js')], outfile: join(root, 'dist/server/index.js'), bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true,
  plugins: [{ name: 'site-assets', setup(build) {
    build.onResolve({ filter: /^virtual:site-assets$/ }, () => ({ path: 'site-assets', namespace: 'site-assets' }));
    build.onLoad({ filter: /.*/, namespace: 'site-assets' }, () => ({ contents: `export default ${JSON.stringify(assets)};`, loader: 'js' }));
  } }],
});
const hosting = JSON.parse(readFileSync(join(root, '.openai/hosting.json'), 'utf8'));
if (hosting.static || hosting.d1 !== 'DB') throw new Error('Hosted API requires a Worker manifest with D1 binding DB.');
mkdirSync(join(root, 'dist/.openai'), { recursive: true });
writeFileSync(join(root, 'dist/.openai/hosting.json'), JSON.stringify(hosting, null, 2) + '\n');
const size = gzipSync(readFileSync(join(root, 'dist/server/index.js'))).byteLength;
if (size > 3 * 1024 * 1024) throw new Error('Worker bundle exceeds 3 MiB compressed.');
console.log(`Hosted API and ${Object.keys(assets).length} frontend assets built; Worker gzip ${(size / 1024).toFixed(0)} KiB.`);
