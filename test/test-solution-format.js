import { createPorts } from '../src/configurer.js';
import { solutionFormatForFramework } from '../src/scaffolder.js';

const ports = createPorts();

const checks = [
  ['net10.0 uses slnx', solutionFormatForFramework('net10.0') === 'slnx'],
  ['net9.0 uses sln', solutionFormatForFramework('net9.0') === 'sln'],
  ['net8.0 uses sln', solutionFormatForFramework('net8.0') === 'sln'],
  ['vite port is randomized in range', ports.vite >= 54000 && ports.vite <= 55999],
  ['http port is randomized in range', ports.dotnetHttp >= 5000 && ports.dotnetHttp <= 5299],
  ['https port is randomized in range', ports.dotnetHttps >= 7000 && ports.dotnetHttps <= 7299],
  ['randomized ports are unique', new Set(Object.values(ports)).size === 3],
];

let passed = 0;
for (const [name, result] of checks) {
  console.log(`${result ? '✔' : '✖'} ${name}`);
  if (result) passed++;
}

console.log(`${passed}/${checks.length} checks passed`);

if (passed !== checks.length) {
  process.exit(1);
}
