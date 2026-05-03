import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scaffoldClientProjectFile } from '../src/scaffolder.js';
import { readFile } from '../src/utils.js';

const TEST_DIR = join(tmpdir(), 'test-spa-dotnet-client-project');
const NAME = 'TestApp';

await rm(TEST_DIR, { recursive: true, force: true });
await mkdir(join(TEST_DIR, `${NAME}.Client`), { recursive: true });

const projectPath = await scaffoldClientProjectFile(join(TEST_DIR, `${NAME}.Client`), NAME, 'net10.0');
const content = await readFile(projectPath);

const checks = [
  ['creates client .csproj', projectPath.endsWith(`${NAME}.Client.csproj`)],
  ['uses Web SDK', content.includes('Microsoft.NET.Sdk.Web')],
  ['targets selected framework', content.includes('<TargetFramework>net10.0</TargetFramework>')],
  ['builds as library', content.includes('<OutputType>Library</OutputType>')],
  ['is not publishable', content.includes('<IsPublishable>false</IsPublishable>')],
  ['includes frontend files', content.includes('<None Include="**/*"')],
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
