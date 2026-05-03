import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFile, readFile } from '../src/utils.js';
import { configureProject } from '../src/configurer.js';

const TEST_DIR = join(tmpdir(), 'test-spa-dotnet-configurer');
const NAME = 'TestApp';
const TEST_PORTS = {
  vite: 55002,
  dotnetHttp: 5102,
  dotnetHttps: 7102,
};

async function setup() {
  await rm(TEST_DIR, { recursive: true, force: true });
  await mkdir(join(TEST_DIR, `${NAME}.Server`, 'Properties'), { recursive: true });
  await mkdir(join(TEST_DIR, `${NAME}.Client`), { recursive: true });

  // Mock csproj
  const csproj = `<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="10.0.7" />
  </ItemGroup>

</Project>`;

  // Mock launchSettings.json
  const launchSettings = JSON.stringify({
    profiles: {
      http: {
        commandName: 'Project',
        dotnetRunMessages: true,
        launchBrowser: false,
        applicationUrl: 'http://localhost:5114',
        environmentVariables: {
          ASPNETCORE_ENVIRONMENT: 'Development',
        },
      },
      https: {
        commandName: 'Project',
        dotnetRunMessages: true,
        launchBrowser: false,
        applicationUrl: 'https://localhost:7267;http://localhost:5114',
        environmentVariables: {
          ASPNETCORE_ENVIRONMENT: 'Development',
        },
      },
    },
  }, null, 2);

  const programCs = `var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.UseHttpsRedirection();

app.MapGet("/weatherforecast", () => Array.Empty<object>());

app.Run();
`;

  // Mock vite.config.ts
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
}

async function test() {
  console.log('Setting up test fixtures...');
  await setup();

  console.log('Running configureProject...');
  await configureProject(TEST_DIR, NAME, true, 'net10.0', 'TypeScript', TEST_PORTS);

  console.log('\n=== Generated .csproj ===');
  const csproj = await readFile(join(TEST_DIR, `${NAME}.Server`, `${NAME}.Server.csproj`));
  console.log(csproj);

  console.log('\n=== Generated launchSettings.json ===');
  const launchSettings = await readFile(join(TEST_DIR, `${NAME}.Server`, 'Properties', 'launchSettings.json'));
  console.log(launchSettings);

  console.log('\n=== Generated Program.cs ===');
  const programCs = await readFile(join(TEST_DIR, `${NAME}.Server`, 'Program.cs'));
  console.log(programCs);

  console.log('\n=== Generated vite.config.ts ===');
  const viteConfig = await readFile(join(TEST_DIR, `${NAME}.Client`, 'vite.config.ts'));
  console.log(viteConfig);

  // Verify key content
  console.log('\n=== Verification ===');
  const checks = [
    ['csproj has SpaRoot', csproj.includes('<SpaRoot>')],
    ['csproj has SpaProxy', csproj.includes('Microsoft.AspNetCore.SpaProxy')],
    ['csproj has configured SpaProxy URL', csproj.includes('https://localhost:55002')],
    ['csproj has PublishFrontend target', csproj.includes('Name="PublishFrontend"')],
    ['csproj prefers npm ci with lockfile', csproj.includes('Command="npm ci"')],
    ['csproj has npm install fallback', csproj.includes('Command="npm install"')],
    ['csproj publishes dist files to wwwroot', csproj.includes('<RelativePath>wwwroot/%(RecursiveDir)%(Filename)%(Extension)</RelativePath>')],
    ['csproj has Content Remove', csproj.includes('Content Remove')],
    ['Program.cs maps /api/weatherforecast', programCs.includes('app.MapGet("/api/weatherforecast"')],
    ['Program.cs serves static files', programCs.includes('app.UseStaticFiles();')],
    ['Program.cs has SPA fallback', programCs.includes('app.MapFallbackToFile("index.html");')],
    ['launchSettings has SPA proxy', launchSettings.includes('Microsoft.AspNetCore.SpaProxy')],
    ['launchSettings has only https profile', !launchSettings.includes('"http"')],
    ['launchSettings has https profile', launchSettings.includes('"https"')],
    ['launchSettings has configured HTTPS URL', launchSettings.includes('https://localhost:7102;http://localhost:5102')],
    ['vite has proxy config', viteConfig.includes("'/api'")],
    ['vite has configured port', viteConfig.includes('port: 55002')],
    ['vite has HTTPS config', viteConfig.includes('https')],
    ['vite has cert generation', viteConfig.includes('dev-certs')],
    ['vite has defineConfig import', viteConfig.includes("import { defineConfig } from 'vite'")],
    ['vite has react import', viteConfig.includes("import react from '@vitejs/plugin-react'")],
  ];

  let passed = 0;
  for (const [name, result] of checks) {
    console.log(`${result ? '✔' : '✖'} ${name}`);
    if (result) passed++;
  }

  console.log(`\n${passed}/${checks.length} checks passed`);

  // Cleanup
  await rm(TEST_DIR, { recursive: true, force: true });
}

test().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
