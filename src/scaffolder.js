import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { execCommandAsync, execNpmAsync, readFile, writeFile } from "./utils.js";
import * as p from "@clack/prompts";

export function solutionFormatForFramework(framework) {
  const majorVersion = Number(framework.replace(/^net/, "").split(".")[0]);
  return majorVersion >= 10 ? "slnx" : "sln";
}

function generateApp(language) {
  const isTs = language === "TypeScript";
  const typeAnnotation = isTs ? `<Forecast[]>` : "";
  const interfaceBlock = isTs
    ? `interface Forecast {
  date: string
  temperatureC: number
  temperatureF: number
  summary: string
}

`
    : "";

  return `import { useState, useEffect } from 'react'
import './App.css'

${interfaceBlock}function App() {
  const [forecasts, setForecasts] = useState${typeAnnotation}([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/weatherforecast')
      .then(res => res.json())
      .then(data => {
        setForecasts(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        setError(true)
      })
  }, [])

  const tempColor = (celsius${isTs ? ": number" : ""}) => {
    if (celsius <= 0) return '#60a5fa'
    if (celsius <= 15) return '#22d3ee'
    if (celsius <= 25) return '#fbbf24'
    return '#f87171'
  }

  const tempEmoji = (celsius${isTs ? ": number" : ""}) => {
    if (celsius <= 0) return '❄️'
    if (celsius <= 15) return '🌤️'
    if (celsius <= 25) return '☀️'
    return '🔥'
  }

  return (
    <div className="app">
      <div className="grid-bg" />

      <header className="hero">
        <div className="hero-inner">
          <div className="logo-row">
            <div className="logo-item">
              <svg className="logo-svg logo-react" viewBox="-10.5 -9.45 21 18.9" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="0" cy="0" r="2" fill="#61dafb"/>
                <g stroke="#61dafb" strokeWidth="1" fill="none">
                  <ellipse rx="10" ry="4.5"/>
                  <ellipse rx="10" ry="4.5" transform="rotate(60)"/>
                  <ellipse rx="10" ry="4.5" transform="rotate(120)"/>
                </g>
              </svg>
              <span className="logo-label">React</span>
            </div>

            <span className="logo-sep">+</span>

            <div className="logo-item">
              <svg className="logo-svg logo-vite" viewBox="0 0 410 404" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M399.641 59.5246L215.643 388.545C211.844 395.338 202.084 395.378 198.228 388.618L10.5817 59.5563C6.38087 52.1896 12.6802 43.2665 21.0281 44.7586L205.223 77.6824C206.398 77.8924 207.601 77.8904 208.776 77.6763L389.119 44.8058C397.439 43.2894 403.768 52.1434 399.641 59.5246Z" fill="url(#vite-paint0)"/>
                <path d="M292.965 1.5744L156.801 28.2552C154.563 28.6937 152.906 30.5903 152.771 32.8664L144.395 167.344C144.198 170.631 147.258 173.078 150.355 172.161L188.876 161.16C192.023 160.227 195.028 163.073 194.284 166.274L183.02 213.624C182.276 216.825 185.157 219.766 188.335 218.988L211.901 213.178C215.082 212.401 217.965 215.349 217.214 218.554L193.238 321.078C192.164 325.616 198.593 327.83 200.532 323.714L209.953 303.815C211.9 299.701 218.341 297.495 219.4 302.014L243.671 403.369C244.762 408.015 251.378 405.641 250.607 400.893L250.581 400.736L177.316 56.2741C176.616 52.1082 180.404 48.6176 184.462 49.6468L320.279 83.8923C324.341 84.921 324.392 90.6065 320.365 91.7081L293.151 99.0456C289.604 99.8614 288.766 104.394 291.78 106.303L351.946 144.067C357.235 147.439 363.765 142.991 362.402 136.996L337.766 46.5315C336.615 41.4339 340.552 36.6745 345.763 36.8613L376.659 37.9781C381.874 38.1648 385.683 42.9476 384.454 48.0402L292.965 1.5744Z" fill="url(#vite-paint1)"/>
                <defs>
                  <linearGradient id="vite-paint0" x1="6.00017" y1="32.9999" x2="235" y2="344" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#41D1FF"/>
                    <stop offset="1" stopColor="#BD34FE"/>
                  </linearGradient>
                  <linearGradient id="vite-paint1" x1="194.651" y1="8.81818" x2="236.076" y2="292.989" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FFBD4F"/>
                    <stop offset="1" stopColor="#FF9640"/>
                  </linearGradient>
                </defs>
              </svg>
              <span className="logo-label">Vite</span>
            </div>

            <span className="logo-sep">+</span>

            <div className="logo-item">
              <svg className="logo-svg logo-dotnet" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="dotnet-grad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#512BD4"/>
                    <stop offset="100%" stopColor="#9B4DCA"/>
                  </radialGradient>
                </defs>
                <circle cx="128" cy="128" r="120" fill="url(#dotnet-grad)"/>
                <circle cx="128" cy="128" r="100" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
                <text x="128" y="148" textAnchor="middle" fontFamily="'Segoe UI',sans-serif" fontSize="90" fontWeight="700" fill="white">.NET</text>
              </svg>
              <span className="logo-label">.NET</span>
            </div>
          </div>

          <h1 className="hero-title">Weather Forecast</h1>
          <p className="hero-sub">Full-Stack SPA Demo</p>
        </div>
      </header>

      <main className="main">
        {loading && (
          <div className="card loading-card">
            <div className="spinner" />
            <span>Loading forecasts...</span>
          </div>
        )}

        {error && (
          <div className="card error-card">
            <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <p className="error-title">Connection Failed</p>
              <p className="error-desc">Cannot reach the API. Make sure the backend is running.</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="card table-card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Temperature</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {forecasts.map((f, i) => (
                    <tr key={i} style={{ animationDelay: \`\${i * 0.06}s\` }}>
                      <td className="cell-date">{f.date}</td>
                      <td className="cell-temp">
                        <span className="temp-badge" style={{ background: tempColor(f.temperatureC) }}>
                          {tempEmoji(f.temperatureC)} {f.temperatureC}°C
                        </span>
                        <span className="temp-f">{f.temperatureF}°F</span>
                      </td>
                      <td className="cell-summary">{f.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <span>Powered by</span>
        <span className="footer-tech">React</span>
        <span className="footer-dot">·</span>
        <span className="footer-tech">Vite</span>
        <span className="footer-dot">·</span>
        <span className="footer-tech">ASP.NET Core</span>
      </footer>
    </div>
  )
}

export default App
`;
}

const APP_CSS = `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: #0a0e1a;
  color: #e2e8f0;
  font-family: 'Outfit', sans-serif;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* ── Grid background ─────────────────────────────────── */
.grid-bg {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(99, 102, 241, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.04) 1px, transparent 1px);
  background-size: 64px 64px;
  pointer-events: none;
  z-index: 0;
}

/* ── Hero ─────────────────────────────────────────────── */
.hero {
  position: relative;
  z-index: 1;
  padding: 4rem 2rem 3rem;
  text-align: center;
  background:
    radial-gradient(ellipse 60% 50% at 50% 0%, rgba(99, 102, 241, 0.15), transparent),
    radial-gradient(ellipse 40% 40% at 20% 20%, rgba(97, 218, 251, 0.08), transparent),
    radial-gradient(ellipse 40% 40% at 80% 20%, rgba(189, 52, 254, 0.08), transparent);
}

.hero-inner {
  max-width: 680px;
  margin: 0 auto;
}

/* ── Logo row ─────────────────────────────────────────── */
.logo-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 2.5rem;
  animation: fadeUp 0.6s ease-out both;
}

.logo-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.logo-item:hover {
  transform: translateY(-6px) scale(1.08);
}

.logo-svg {
  width: 56px;
  height: 56px;
  filter: drop-shadow(0 0 20px rgba(99, 102, 241, 0.3));
  transition: filter 0.3s;
}

.logo-item:hover .logo-svg {
  filter: drop-shadow(0 0 30px rgba(99, 102, 241, 0.5));
}

.logo-react {
  animation: float 6s ease-in-out infinite;
}

.logo-vite {
  animation: float 6s ease-in-out infinite 0.5s;
}

.logo-dotnet {
  animation: float 6s ease-in-out infinite 1s;
}

.logo-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 500;
  color: #94a3b8;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.logo-sep {
  font-size: 1.5rem;
  font-weight: 300;
  color: #334155;
  user-select: none;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Hero text ────────────────────────────────────────── */
.hero-title {
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, #e2e8f0, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: fadeUp 0.6s ease-out 0.2s both;
}

.hero-sub {
  margin-top: 0.5rem;
  font-size: 1rem;
  font-weight: 300;
  color: #64748b;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  animation: fadeUp 0.6s ease-out 0.35s both;
}

/* ── Main ─────────────────────────────────────────────── */
.main {
  position: relative;
  z-index: 1;
  flex: 1;
  max-width: 860px;
  width: 100%;
  margin: 0 auto;
  padding: 0 2rem 3rem;
}

/* ── Card base ────────────────────────────────────────── */
.card {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: 16px;
  overflow: hidden;
  animation: fadeUp 0.5s ease-out 0.4s both;
}

/* ── Loading ──────────────────────────────────────────── */
.loading-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3.5rem 2rem;
  color: #94a3b8;
  font-weight: 300;
}

.spinner {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(99, 102, 241, 0.2);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Error ────────────────────────────────────────────── */
.error-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.25);
  color: #fca5a5;
}

.error-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  color: #f87171;
}

.error-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: #fca5a5;
  margin-bottom: 0.15rem;
}

.error-desc {
  font-size: 0.85rem;
  font-weight: 300;
  color: #94a3b8;
}

/* ── Table ────────────────────────────────────────────── */
.table-card {
  padding: 0;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: rgba(99, 102, 241, 0.06);
}

th {
  text-align: left;
  padding: 0.85rem 1.25rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748b;
  border-bottom: 1px solid rgba(99, 102, 241, 0.12);
}

td {
  padding: 0.9rem 1.25rem;
  font-size: 0.925rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
}

tbody tr {
  transition: background 0.2s;
  animation: rowSlide 0.4s ease-out both;
}

@keyframes rowSlide {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
}

tbody tr:hover {
  background: rgba(99, 102, 241, 0.06);
}

tbody tr:last-child td {
  border-bottom: none;
}

/* ── Temperature ──────────────────────────────────────── */
.cell-date {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  color: #94a3b8;
}

.cell-temp {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.temp-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
  color: #0f172a;
  font-weight: 600;
  font-size: 0.85rem;
  white-space: nowrap;
}

.temp-f {
  font-size: 0.8rem;
  color: #475569;
  font-family: 'JetBrains Mono', monospace;
}

.cell-summary {
  font-weight: 400;
}

/* ── Footer ───────────────────────────────────────────── */
.footer {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: #475569;
  font-size: 0.8rem;
  font-weight: 300;
  border-top: 1px solid rgba(99, 102, 241, 0.08);
}

.footer-tech {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  color: #64748b;
  font-size: 0.75rem;
}

.footer-dot {
  color: #334155;
}

/* ── Responsive ───────────────────────────────────────── */
@media (max-width: 640px) {
  .hero { padding: 2.5rem 1.25rem 2rem; }
  .hero-title { font-size: 1.75rem; }
  .main { padding: 0 1rem 2rem; }
  .logo-svg { width: 44px; height: 44px; }
  .logo-sep { font-size: 1rem; }
  td, th { padding: 0.7rem 1rem; }
}
`;

function generateClientProjectFile(framework) {
  return `<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>${framework}</TargetFramework>
    <OutputType>Library</OutputType>
    <IsPackable>false</IsPackable>
    <IsPublishable>false</IsPublishable>
    <EnableDefaultCompileItems>false</EnableDefaultCompileItems>
    <EnableDefaultEmbeddedResourceItems>false</EnableDefaultEmbeddedResourceItems>
    <EnableDefaultNoneItems>false</EnableDefaultNoneItems>
  </PropertyGroup>

  <ItemGroup>
    <None Include="**/*" Exclude="node_modules/**/*;dist/**/*;.vite/**/*" />
  </ItemGroup>
</Project>
`;
}

async function customizeApp(clientDir, language) {
  const ext = language === "TypeScript" ? "tsx" : "jsx";
  await writeFile(join(clientDir, "src", `App.${ext}`), generateApp(language));
  await writeFile(join(clientDir, "src", "App.css"), APP_CSS);
  p.log.success(`Customized App.${ext} with weather forecast API call`);
}

export async function customizePackageJson(clientDir, name) {
  const packageJsonPath = join(clientDir, "package.json");
  const content = await readFile(packageJsonPath);
  const packageJson = JSON.parse(content);

  packageJson.name = `${name}.client`.toLowerCase();

  // Ensure node_modules exists before starting dev server
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts.predev = "npm install";

  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
  p.log.success(`Configured client package name: ${packageJson.name}`);
}

export async function scaffoldDotnetProject(projectDir, name, framework) {
  p.log.step("Creating .NET Web API project...");

  const serverDir = join(projectDir, `${name}.Server`);
  await execCommandAsync("dotnet", ["new", "webapi", "-n", `${name}.Server`, "--framework", framework, "--no-https"], {
    cwd: projectDir,
  });

  await mkdir(join(serverDir, "wwwroot"), { recursive: true });
  p.log.success(`Created ${name}.Server (${framework})`);
  return serverDir;
}

export async function scaffoldClientProjectFile(clientDir, name, framework) {
  const clientProjectPath = join(clientDir, `${name}.Client.csproj`);

  await writeFile(clientProjectPath, generateClientProjectFile(framework));
  p.log.success(`Created ${name}.Client.csproj`);

  return clientProjectPath;
}

export async function scaffoldSolution(projectDir, name, serverDir, clientProjectPath, framework) {
  p.log.step("Creating solution...");

  const format = solutionFormatForFramework(framework);

  try {
    await execCommandAsync("dotnet", ["new", "sln", "-n", name, "--format", format], { cwd: projectDir });
  } catch {
    await execCommandAsync("dotnet", ["new", "sln", "-n", name], { cwd: projectDir });
  }

  const files = await readdir(projectDir);
  const solutionFile =
    files.find((file) => file === `${name}.${format}`) ||
    files.find((file) => file === `${name}.sln`) ||
    files.find((file) => file === `${name}.slnx`) ||
    files.find((file) => file.endsWith(".sln")) ||
    files.find((file) => file.endsWith(".slnx"));

  if (!solutionFile) {
    throw new Error(`Could not find generated solution file in ${projectDir}`);
  }

  await execCommandAsync("dotnet", ["sln", solutionFile, "add", join(serverDir, `${name}.Server.csproj`)], {
    cwd: projectDir,
  });

  await execCommandAsync("dotnet", ["sln", solutionFile, "add", clientProjectPath], {
    cwd: projectDir,
  });

  p.log.success(`Created ${solutionFile} with server and client projects`);
}

export async function scaffoldViteProject(projectDir, name, language) {
  p.log.step("Creating React + Vite project...");

  const template = language === "TypeScript" ? "react-ts" : "react";
  const clientDir = join(projectDir, `${name}.Client`);

  await execNpmAsync(["create", "vite@latest", `${name}.Client`, "--", "--template", template], {
    cwd: projectDir,
  });

  await customizeApp(clientDir, language);
  await customizePackageJson(clientDir, name);

  p.log.success(`Created ${name}.Client (template: ${template})`);
  return clientDir;
}

export async function trustHttpsCertificate() {
  p.log.step("Trusting HTTPS development certificate...");
  try {
    await execCommandAsync("dotnet", ["dev-certs", "https", "--trust"]);
    p.log.success("HTTPS development certificate trusted");
  } catch {
    p.log.warn("Could not auto-trust HTTPS certificate. You may see a browser security warning.");
    p.log.info("Run manually: dotnet dev-certs https --trust");
  }
}
