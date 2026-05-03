import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { customizePackageJson } from '../src/scaffolder.js';
import { readFile, writeFile } from '../src/utils.js';

const TEST_DIR = join(tmpdir(), 'test-spa-dotnet-client-package');
const NAME = 'MyApp';

await rm(TEST_DIR, { recursive: true, force: true });
await mkdir(TEST_DIR, { recursive: true });
await writeFile(
  join(TEST_DIR, 'package.json'),
  JSON.stringify({ name: 'myapp-client', version: '0.0.0', scripts: { dev: 'vite' } }, null, 2),
);

await customizePackageJson(TEST_DIR, NAME);

const packageJson = JSON.parse(await readFile(join(TEST_DIR, 'package.json')));
const checks = [
  ['uses lowercase client package name', packageJson.name === 'myapp.client'],
  ['preserves version', packageJson.version === '0.0.0'],
  ['preserves scripts', packageJson.scripts.dev === 'vite'],
  ['adds predev script for auto npm install', packageJson.scripts.predev === 'npm install'],
];

let passed = 0;
for (const [name, result] of checks) {
  console.log(`${result ? '✔' : '✖'} ${name}`);
  if (result) passed++;
}

await rm(TEST_DIR, { recursive: true, force: true });

console.log(`${passed}/${checks.length} checks passed`);

if (passed !== checks.length) {
  process.exit(1);
}
