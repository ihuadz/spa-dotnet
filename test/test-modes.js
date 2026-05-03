import { access, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFile, readFile } from '../src/utils.js';
import { configureProject } from '../src/configurer.js';

const TEST_DIR = join(tmpdir(), 'test-spa-dotnet-modes');
const NAME = 'TestApp';
const TEST_PORTS = {
  vite: 55001,
  dotnetHttp: 5101,
  dotnetHttps: 7101,
};

async function setup() {
  await rm(TEST_DIR, { recursive: true, force: true });
  await mkdir(join(TEST_DIR, `${NAME}.Server`, 'Properties'), { recursive: true });
  await mkdir(join(TEST_DIR, `${NAME}.Client`), { recursive: true });

  const csproj = `<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
  </PropertyGroup>
</Project>`;

  const launchSettings = JSON.stringify({
    profiles: {
      http: {
        commandName: 'Project',
        applicationUrl: 'http://localhost:5000',
        environmentVariables: { ASPNETCORE_ENVIRONMENT: 'Development' },
      },
      https: {
        commandName: 'Project',
        applicationUrl: 'https://localhost:5001;http://localhost:5000',
        environmentVariables: { ASPNETCORE_ENVIRONMENT: 'Development' },
      },
    },
  }, null, 2);

  const programCs = `var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.UseHttpsRedirection();

app.MapGet("/weatherforecast", () => Array.Empty<object>());

app.Run();
`;

  const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`;

  await writeFile(join(TEST_DIR, `${NAME}.Server`, `${NAME}.Server.csproj`), csproj);
  await writeFile(join(TEST_DIR, `${NAME}.Server`, 'Program.cs'), programCs);
  await writeFile(join(TEST_DIR, `${NAME}.Server`, 'Properties', 'launchSettings.json'), launchSettings);
  await writeFile(join(TEST_DIR, `${NAME}.Client`, 'vite.config.ts'), viteConfig);
  await writeFile(join(TEST_DIR, `${NAME}.Client`, 'vite.config.js'), viteConfig);
}

async function testHttpMode() {
  console.log('=== Test: HTTP mode with net9.0 ===');
  await setup();
  await configureProject(TEST_DIR, NAME, false, 'net9.0', 'TypeScript', TEST_PORTS);

  const csproj = await readFile(join(TEST_DIR, `${NAME}.Server`, `${NAME}.Server.csproj`));
  const viteConfig = await readFile(join(TEST_DIR, `${NAME}.Client`, 'vite.config.ts'));
  const programCs = await readFile(join(TEST_DIR, `${NAME}.Server`, 'Program.cs'));
  const launchSettings = await readFile(join(TEST_DIR, `${NAME}.Server`, 'Properties', 'launchSettings.json'));

  const checks = [
    ['csproj version is 9.*', csproj.includes('Version="9.*-*"')],
    ['csproj SpaProxy url is http', csproj.includes('http://localhost:55001')],
    ['csproj uses npm ci when lockfile exists', csproj.includes('Command="npm ci"')],
    ['csproj has SpaProxyInstallCommand', csproj.includes('<SpaProxyInstallCommand>npm install</SpaProxyInstallCommand>')],
    ['csproj has Swashbuckle', csproj.includes('Swashbuckle.AspNetCore')],
    ['csproj publishes dist files to wwwroot', csproj.includes('<RelativePath>wwwroot/%(RecursiveDir)%(Filename)%(Extension)</RelativePath>')],
    ['program maps API route under /api', programCs.includes('app.MapGet("/api/weatherforecast"')],
    ['program removes UseHttpsRedirection in http mode', !programCs.includes('UseHttpsRedirection')],
    ['program serves static files', programCs.includes('app.UseStaticFiles();')],
    ['program has Swagger middleware', programCs.includes('app.UseSwagger();')],
    ['program has SwaggerUI middleware', programCs.includes('app.UseSwaggerUI();')],
    ['program has AddSwaggerGen service', programCs.includes('AddSwaggerGen()')],
    ['program maps SPA fallback', programCs.includes('app.MapFallbackToFile("index.html");')],
    ['vite has no HTTPS config', !viteConfig.includes('https: {')],
    ['vite has no cert generation', !viteConfig.includes('dev-certs')],
    ['vite proxies /api', viteConfig.includes("'/api'")],
    ['vite uses configured port', viteConfig.includes('port: 55001')],
    ['vite proxy target is http', viteConfig.includes("target: 'http://localhost:5101'")],
    ['vite has defineConfig import', viteConfig.includes("import { defineConfig } from 'vite'")],
    ['launchSettings has SPA proxy', launchSettings.includes('Microsoft.AspNetCore.SpaProxy')],
    ['launchSettings has http profile port', launchSettings.includes('http://localhost:5101')],
    ['launchSettings has no https profile in http mode', !launchSettings.includes('"https"')],
  ];

  let passed = 0;
  for (const [name, result] of checks) {
    console.log(`${result ? '✔' : '✖'} ${name}`);
    if (result) passed++;
  }
  console.log(`${passed}/${checks.length} checks passed\n`);
  return passed === checks.length;
}

async function testHttpsMode() {
  console.log('=== Test: HTTPS mode with net10.0 ===');
  await setup();
  await configureProject(TEST_DIR, NAME, true, 'net10.0', 'JavaScript', TEST_PORTS);

  const csproj = await readFile(join(TEST_DIR, `${NAME}.Server`, `${NAME}.Server.csproj`));
  const viteConfig = await readFile(join(TEST_DIR, `${NAME}.Client`, 'vite.config.js'));
  const launchSettings = await readFile(join(TEST_DIR, `${NAME}.Server`, 'Properties', 'launchSettings.json'));

  const checks = [
    ['csproj version is 10.*', csproj.includes('Version="10.*-*"')],
    ['csproj SpaProxy url is https', csproj.includes('https://localhost:55001')],
    ['vite has HTTPS config', viteConfig.includes('https')],
    ['vite has cert generation', viteConfig.includes('dev-certs')],
    ['javascript mode writes vite.config.js', viteConfig.includes("'/api'")],
    ['vite uses configured port', viteConfig.includes('port: 55001')],
    ['vite proxy target is http (always)', viteConfig.includes("target: 'http://localhost:5101'")],
    ['launchSettings has only https profile', !launchSettings.includes('"http"')],
    ['launchSettings has https profile', launchSettings.includes('"https"')],
    ['launchSettings has both URLs', launchSettings.includes('https://localhost:7101;http://localhost:5101')],
    ['launchSettings has SPA proxy', launchSettings.includes('Microsoft.AspNetCore.SpaProxy')],
  ];

  let passed = 0;
  for (const [name, result] of checks) {
    console.log(`${result ? '✔' : '✖'} ${name}`);
    if (result) passed++;
  }
  console.log(`${passed}/${checks.length} checks passed\n`);
  return passed === checks.length;
}

async function testCrlfLineEndings() {
  console.log('=== Test: CRLF line endings (.NET 10 template format) ===');
  const crlfDir = join(tmpdir(), 'test-spa-dotnet-crlf');
  await rm(crlfDir, { recursive: true, force: true });
  await mkdir(join(crlfDir, `${NAME}.Server`, 'Properties'), { recursive: true });
  await mkdir(join(crlfDir, `${NAME}.Client`), { recursive: true });

  // Simulate .NET 10 template with CRLF line endings
  const programCs = [
    'var builder = WebApplication.CreateBuilder(args);',
    '',
    'var app = builder.Build();',
    '',
    'app.MapGet("/weatherforecast", () => Array.Empty<object>());',
    '',
    'app.Run();',
  ].join('\r\n');

  await writeFile(join(crlfDir, `${NAME}.Server`, `${NAME}.Server.csproj`), '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup></Project>');
  await writeFile(join(crlfDir, `${NAME}.Server`, 'Program.cs'), programCs);
  await writeFile(join(crlfDir, `${NAME}.Server`, 'Properties', 'launchSettings.json'), JSON.stringify({ profiles: { http: { commandName: 'Project', applicationUrl: 'http://localhost:5000' } } }));
  await writeFile(join(crlfDir, `${NAME}.Client`, 'vite.config.ts'), 'export default {}');
  await writeFile(join(crlfDir, `${NAME}.Client`, 'vite.config.js'), 'export default {}');

  await configureProject(crlfDir, NAME, false, 'net10.0', 'TypeScript', TEST_PORTS);

  const result = await readFile(join(crlfDir, `${NAME}.Server`, 'Program.cs'));

  const checks = [
    ['inserts UseStaticFiles with CRLF template', result.includes('app.UseStaticFiles();')],
    ['inserts UseDefaultFiles with CRLF template', result.includes('app.UseDefaultFiles();')],
    ['inserts Swagger middleware with CRLF template', result.includes('app.UseSwagger();')],
    ['inserts SwaggerUI middleware with CRLF template', result.includes('app.UseSwaggerUI();')],
    ['inserts MapFallbackToFile with CRLF template', result.includes('app.MapFallbackToFile("index.html");')],
    ['updates API route with CRLF template', result.includes('app.MapGet("/api/weatherforecast"')],
  ];

  let passed = 0;
  for (const [name, ok] of checks) {
    console.log(`${ok ? '✔' : '✖'} ${name}`);
    if (ok) passed++;
  }
  console.log(`${passed}/${checks.length} checks passed\n`);

  await rm(crlfDir, { recursive: true, force: true });
  return passed === checks.length;
}

async function testViteConfigConflict() {
  console.log('=== Test: Vite config conflict (both .ts and .js exist) ===');
  const conflictDir = join(tmpdir(), 'test-spa-dotnet-vite-conflict');
  await rm(conflictDir, { recursive: true, force: true });
  await mkdir(join(conflictDir, `${NAME}.Server`, 'Properties'), { recursive: true });
  await mkdir(join(conflictDir, `${NAME}.Client`), { recursive: true });

  // Simulate npm create vite creating BOTH config files (e.g. template mismatch)
  const staleTsConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
// This stale .ts file has HTTPS enabled
export default defineConfig({
  plugins: [react()],
  server: {
    https: { key: fs.readFileSync('key'), cert: fs.readFileSync('cert') },
  },
})`;

  const staleJsConfig = `export default {}`;

  await writeFile(join(conflictDir, `${NAME}.Server`, `${NAME}.Server.csproj`), '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net9.0</TargetFramework></PropertyGroup></Project>');
  await writeFile(join(conflictDir, `${NAME}.Server`, 'Program.cs'), 'var app = builder.Build();\napp.MapGet("/weatherforecast", () => Array.Empty<object>());\napp.Run();');
  await writeFile(join(conflictDir, `${NAME}.Server`, 'Properties', 'launchSettings.json'), JSON.stringify({ profiles: { http: { commandName: 'Project', applicationUrl: 'http://localhost:5000' } } }));
  // Both vite config files exist - simulating the conflict
  await writeFile(join(conflictDir, `${NAME}.Client`, 'vite.config.ts'), staleTsConfig);
  await writeFile(join(conflictDir, `${NAME}.Client`, 'vite.config.js'), staleJsConfig);

  // Configure with HTTP mode and JavaScript language
  await configureProject(conflictDir, NAME, false, 'net9.0', 'JavaScript', TEST_PORTS);

  // vite.config.ts should be deleted (stale file with HTTPS)
  let tsDeleted = false;
  try {
    await access(join(conflictDir, `${NAME}.Client`, 'vite.config.ts'));
  } catch {
    tsDeleted = true;
  }

  // vite.config.js should exist with correct HTTP config
  const viteConfig = await readFile(join(conflictDir, `${NAME}.Client`, 'vite.config.js'));

  const checks = [
    ['stale vite.config.ts is deleted', tsDeleted],
    ['vite.config.js is created', viteConfig.includes('defineConfig')],
    ['vite.config.js has no HTTPS', !viteConfig.includes('https: {')],
    ['vite.config.js proxies /api', viteConfig.includes("'/api'")],
    ['vite.config.js uses http target', viteConfig.includes("target: 'http://localhost:5101'")],
  ];

  let passed = 0;
  for (const [name, ok] of checks) {
    console.log(`${ok ? '✔' : '✖'} ${name}`);
    if (ok) passed++;
  }
  console.log(`${passed}/${checks.length} checks passed\n`);

  await rm(conflictDir, { recursive: true, force: true });
  return passed === checks.length;
}

async function run() {
  const r1 = await testHttpMode();
  const r2 = await testHttpsMode();
  const r3 = await testCrlfLineEndings();
  const r4 = await testViteConfigConflict();

  await rm(TEST_DIR, { recursive: true, force: true });

  if (r1 && r2 && r3 && r4) {
    console.log('All tests passed!');
  } else {
    console.log('Some tests failed!');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
