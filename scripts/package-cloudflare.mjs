import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

// UI deployment is independent of the 10-minute GitHub data refresh.
// This avoids rebuilding Cloudflare Pages for every collection run.
const target = resolve(process.argv[2] || '../binjari-cloudflare-ready');
await mkdir(target, { recursive: true });
for (const file of ['index.html', 'style.css', 'model.js', 'icon.svg']) {
  await copyFile(new URL('../docs/' + file, import.meta.url), join(target, file));
}
const app = await readFile(new URL('../docs/app.js', import.meta.url), 'utf8');
const migrated = app.replaceAll('fetch(`data/', 'fetch(`https://raw.githubusercontent.com/Yu-Jusang/snu-course-radar/main/docs/data/');
if (migrated === app || migrated.includes('fetch(`data/')) throw new Error('Data URL migration failed');
await writeFile(join(target, 'app.js'), migrated);
await writeFile(join(target, '_headers'), '/\n  Cache-Control: no-cache\n/*.js\n  Cache-Control: no-cache\n');
console.log('Cloudflare upload files ready: ' + target);
