import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const projectDir = process.cwd();
const outputPath = resolve(projectDir, '..', 'Turing_Machine_v1.2.1.html');
const tempDir = resolve(projectDir, '.standalone-dist');
await build({ configFile: false, root: projectDir, plugins: [react()], build: { outDir: tempDir, emptyOutDir: true, assetsInlineLimit: Number.MAX_SAFE_INTEGER, target: ['chrome90', 'edge90', 'firefox88', 'safari14'], rollupOptions: { input: resolve(projectDir, 'standalone-source.html'), output: { inlineDynamicImports: true } } } });
const assetFiles = await readdir(resolve(tempDir, 'assets'));
const scriptName = assetFiles.find((name) => name.endsWith('.js'));
if (!scriptName) throw new Error('Standalone JavaScript bundle was not produced.');
const script = await readFile(resolve(tempDir, 'assets', scriptName), 'utf8');
const css = (await readFile(resolve(projectDir, 'app', 'globals.css'), 'utf8'))
  .replace(/^\s*@import\s+['"]tailwindcss['"];?\s*/u, '')
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter(Boolean)
  .join('\n');
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Turing Machine · 单人离线解谜</title><style>${css}</style></head><body><div id="root"></div><script type="module">${script.replaceAll('</script', '<\\/script')}</script></body></html>`;
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, html, 'utf8');
console.log(outputPath);
