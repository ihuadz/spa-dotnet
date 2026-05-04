import { rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { readFile, writeFile } from "./utils.js";
import * as p from "@clack/prompts";

function randomPort(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createPorts() {
  const ports = new Set();
  const next = (min, max) => {
    let port;
    do {
      port = randomPort(min, max);
    } while (ports.has(port));
    ports.add(port);
    return port;
  };

  return {
    vite: next(54000, 55999),
    dotnetHttp: next(5000, 5299),
    dotnetHttps: next(7000, 7299),
  };
}

// ─── csproj ───────────────────────────────────────────────────────────────────

function buildCsprojSpaBlock(clientDirName, https, framework, ports) {
  const protocol = https ? "https" : "http";
  const majorVersion = framework.replace(/^net/, "").split(".")[0];

  return `
  <!-- SPA integration: dev proxy + publish build -->
  <PropertyGroup>
    <SpaRoot>../${clientDirName}/</SpaRoot>
    <SpaProxyLaunchCommand>npm run dev</SpaProxyLaunchCommand>
    <SpaProxyInstallCommand>npm install</SpaProxyInstallCommand>
    <SpaProxyServerUrl>${protocol}://localhost:${ports.vite}</SpaProxyServerUrl>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.SpaProxy" Version="${majorVersion}.*-*" />
    <PackageReference Include="Swashbuckle.AspNetCore" Version="${majorVersion}.*-*" />
  </ItemGroup>

  <!-- Exclude client source from build output -->
  <ItemGroup>
    <Content Remove="$(SpaRoot)/**" />
    <None Remove="$(SpaRoot)/**" />
  </ItemGroup>

  <!-- Build frontend for production -->
  <Target Name="PublishFrontend" AfterTargets="ComputeFilesToPublish">
    <Exec Command="npm ci" WorkingDirectory="$(SpaRoot)" Condition="Exists('$(SpaRoot)package-lock.json')" />
    <Exec Command="npm install" WorkingDirectory="$(SpaRoot)" Condition="!Exists('$(SpaRoot)package-lock.json')" />
    <Exec Command="npm run build" WorkingDirectory="$(SpaRoot)" />
    <ItemGroup>
      <SpaDistFiles Include="$(SpaRoot)/dist/**/*" />
      <ResolvedFileToPublish Include="@(SpaDistFiles->'%(FullPath)')" Exclude="@(ResolvedFileToPublish)">
        <RelativePath>wwwroot/%(RecursiveDir)%(Filename)%(Extension)</RelativePath>
        <CopyToPublishDirectory>PreserveNewest</CopyToPublishDirectory>
        <ExcludeFromSingleFile>true</ExcludeFromSingleFile>
      </ResolvedFileToPublish>
    </ItemGroup>
  </Target>
`;
}

async function configureCsproj(serverDir, clientDirName, https, framework, ports) {
  const csprojPath = join(serverDir, `${basename(serverDir)}.csproj`);
  let content = await readFile(csprojPath);

  const spaBlock = buildCsprojSpaBlock(clientDirName, https, framework, ports);
  content = content.replace("</Project>", `${spaBlock}\n</Project>`);

  await writeFile(csprojPath, content);
  p.log.success("Configured .csproj with SPA proxy and publish targets");
}

// ─── Program.cs ─────────────────────────────────────────────────────────────

async function configureProgramCs(serverDir, https) {
  const programPath = join(serverDir, "Program.cs");
  let content = await readFile(programPath);

  // Normalize line endings so replacements work regardless of OS template format
  content = content.replace(/\r\n/g, "\n");

  // Remove HTTPS redirection in HTTP mode to avoid 307 redirects that break the Vite proxy
  if (!https && content.includes("app.UseHttpsRedirection();")) {
    content = content.replace(/app\.UseHttpsRedirection\(\);\n?/, "");
  }

  // Prefix API routes with /api
  content = content.replace('app.MapGet("/weatherforecast"', 'app.MapGet("/api/weatherforecast"');

  // ── Swagger / OpenAPI ─────────────────────────────────────────────────────
  // .NET 10 uses MapOpenApi() — replace with Swagger (either standalone or inside dev check)
  const swaggerLines = `    app.UseSwagger();
    app.UseSwaggerUI();`;

  if (/app\.MapOpenApi\(\);/.test(content)) {
    // Replace the entire dev-check block if MapOpenApi is inside one
    if (/if\s*\(app\.Environment\.IsDevelopment\(\)\)\s*\{[^}]*app\.MapOpenApi\(\);/s.test(content)) {
      content = content.replace(
        /if\s*\(app\.Environment\.IsDevelopment\(\)\)\s*\{[^}]*app\.MapOpenApi\(\);\s*\n?\s*\}/,
        `if (app.Environment.IsDevelopment())\n{\n${swaggerLines}\n}`,
      );
    } else {
      // MapOpenApi is standalone — replace it
      content = content.replace("app.MapOpenApi();", `if (app.Environment.IsDevelopment())\n{\n${swaggerLines}\n}`);
    }
    // Append SwaggerGen after AddOpenApi (AddOpenApi provides base services SwaggerGen depends on)
    if (content.includes("AddOpenApi();") && !content.includes("AddSwaggerGen();")) {
      content = content.replace("AddOpenApi();", "AddOpenApi();\nbuilder.Services.AddSwaggerGen();");
    }
  } else if (!/app\.UseSwagger\(\)/.test(content)) {
    // .NET 9 or older — no MapOpenApi, add Swagger if not present
    if (!content.includes("AddSwaggerGen();")) {
      if (content.includes("var app = builder.Build();")) {
        content = content.replace(
          "var app = builder.Build();",
          "builder.Services.AddSwaggerGen();\n\nvar app = builder.Build();",
        );
      }
    }
    // Add swagger middleware inside existing dev check, or create a new one
    if (/if\s*\(app\.Environment\.IsDevelopment\(\)\)\s*\{/.test(content)) {
      content = content.replace(
        /if\s*\(app\.Environment\.IsDevelopment\(\)\)\s*\{/,
        `if (app.Environment.IsDevelopment())\n{\n${swaggerLines}`,
      );
    } else {
      const swaggerBlock = `if (app.Environment.IsDevelopment())
{
${swaggerLines}
}
`;
      if (content.includes("app.UseHttpsRedirection();")) {
        content = content.replace("app.UseHttpsRedirection();\n", `app.UseHttpsRedirection();\n\n${swaggerBlock}`);
      } else if (content.includes("var app = builder.Build();")) {
        content = content.replace("var app = builder.Build();\n", `var app = builder.Build();\n\n${swaggerBlock}`);
      }
    }
  }

  // ── Static files & SPA fallback ───────────────────────────────────────────
  if (!content.includes("app.UseStaticFiles();")) {
    const staticFilesBlock = "app.UseDefaultFiles();\napp.UseStaticFiles();\n";
    if (content.includes("app.UseHttpsRedirection();")) {
      content = content.replace("app.UseHttpsRedirection();\n", `app.UseHttpsRedirection();\n\n${staticFilesBlock}`);
    } else if (content.includes("var app = builder.Build();")) {
      content = content.replace("var app = builder.Build();\n", `var app = builder.Build();\n\n${staticFilesBlock}`);
    }
  }

  if (!content.includes('app.MapFallbackToFile("index.html");')) {
    content = content.replace("app.Run();", 'app.MapFallbackToFile("index.html");\n\napp.Run();');
  }

  await writeFile(programPath, content);
  p.log.success("Configured Program.cs with API prefix and SPA static file fallback");
}

// ─── launchSettings.json ──────────────────────────────────────────────────────

async function configureLaunchSettings(serverDir, https, ports) {
  const settingsPath = join(serverDir, "Properties", "launchSettings.json");
  let content = await readFile(settingsPath);
  const settings = JSON.parse(content.replace(/^\uFEFF/, ""));

  settings.$schema = settings.$schema || "https://json.schemastore.org/launchsettings.json";
  settings.profiles = settings.profiles || {};

  // Build a single profile — HTTPS mode uses "https" (both URLs), HTTP mode uses "http"
  const profileName = https ? "https" : "http";
  const applicationUrl = https
    ? `https://localhost:${ports.dotnetHttps};http://localhost:${ports.dotnetHttp}`
    : `http://localhost:${ports.dotnetHttp}`;

  settings.profiles = {};
  settings.profiles[profileName] = {
    commandName: "Project",
    dotnetRunMessages: true,
    launchBrowser: false,
    applicationUrl,
    environmentVariables: {
      ASPNETCORE_ENVIRONMENT: "Development",
      ASPNETCORE_HOSTINGSTARTUPASSEMBLIES: "Microsoft.AspNetCore.SpaProxy",
    },
  };

  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  p.log.success("Configured launchSettings.json with SPA proxy activation");
}

// ─── vite.config ─────────────────────────────────────────────────────────────

function buildViteProxyConfig(https, clientName, ports) {
  // Always proxy to the HTTP port — .NET listens on it regardless of which
  // launch profile (http or https) is active, so the proxy never gets ECONNREFUSED.
  const dotnetPort = ports.dotnetHttp;

  const lines = [];

  lines.push(`import { defineConfig } from 'vite';`, `import react from '@vitejs/plugin-react';`);

  if (https) {
    lines.push(
      `import fs from 'fs';`,
      `import path from 'path';`,
      `import child_process from 'child_process';`,
      `import { env } from 'process';`,
      ``,
      `const baseFolder =`,
      `    env.APPDATA !== undefined && env.APPDATA !== ''`,
      `        ? \`\${env.APPDATA}/ASP.NET/https\``,
      `        : \`\${env.HOME}/.aspnet/https\`;`,
      ``,
      `const certName = "${clientName}";`,
      `const certPath = path.join(baseFolder, \`\${certName}.pem\`);`,
      `const keyPath = path.join(baseFolder, \`\${certName}.key\`);`,
      ``,
      `if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {`,
      `    child_process.spawnSync('dotnet', [`,
      `        'dev-certs', 'https', '--export-path', certPath,`,
      `        '--format', 'Pem', '--no-password',`,
      `    ], { stdio: 'inherit' });`,
      `}`,
      ``,
    );
  }

  lines.push(
    `// https://vitejs.dev/config/`,
    `export default defineConfig({`,
    `    plugins: [react()],`,
    `    server: {`,
    `        port: ${ports.vite},`,
  );

  if (https) {
    lines.push(
      `        https: {`,
      `            key: fs.readFileSync(keyPath),`,
      `            cert: fs.readFileSync(certPath),`,
      `        },`,
    );
  }

  lines.push(
    `        proxy: {`,
    `            '/api': {`,
    `                target: 'http://localhost:${dotnetPort}',`,
    `                secure: false,`,
    `            },`,
    `        },`,
    `    },`,
    `});`,
  );

  return lines.join("\n");
}

async function configureVite(clientDir, https, clientName, language, ports) {
  const configName = language === "TypeScript" ? "vite.config.ts" : "vite.config.js";
  const otherConfigName = language === "TypeScript" ? "vite.config.js" : "vite.config.ts";
  const configPath = join(clientDir, configName);
  const otherConfigPath = join(clientDir, otherConfigName);

  // Delete the other vite config to prevent Vite from loading a stale one
  // (Vite loads .ts over .js, so a leftover file can override our config)
  await rm(otherConfigPath, { force: true });

  const content = buildViteProxyConfig(https, clientName, ports);
  await writeFile(configPath, content);
  p.log.success(`Configured ${configName} with API proxy${https ? " and HTTPS" : ""}`);
}

// ─── main export ─────────────────────────────────────────────────────────────

export async function configureProject(
  projectDir,
  name,
  https,
  framework,
  language = "TypeScript",
  ports = createPorts(),
) {
  p.log.step("Configuring project integration...");

  const serverDir = join(projectDir, `${name}.Server`);
  const clientDirName = `${name}.Client`;

  await configureCsproj(serverDir, clientDirName, https, framework, ports);
  await configureProgramCs(serverDir, https);
  await configureLaunchSettings(serverDir, https, ports);
  await configureVite(join(projectDir, clientDirName), https, clientDirName, language, ports);

  p.log.success("All configuration complete");
}
