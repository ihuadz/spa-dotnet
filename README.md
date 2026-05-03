# spa-dotnet

> Scaffold a production-ready **React + ASP.NET Core** single-page application in seconds.

A CLI tool that generates a full-stack project with **Vite** dev server, **React** frontend, and **ASP.NET Core** Web API backend — mirroring the experience of Visual Studio's React + ASP.NET Core template, but from the command line.

## Features

- **Vite dev proxy** — frontend hot-reload with `/api` requests proxied to the .NET backend
- **HTTPS support** — auto-generates dev certificates for Vite and .NET
- **Swagger UI** — pre-configured Swagger/OpenAPI for API exploration
- **Production-ready** — `dotnet publish` automatically builds the frontend and bundles into `wwwroot`
- **SPA fallback** — client-side routing works out of the box
- **Auto npm install** — dependencies install automatically on first `dotnet run`
- **Multiple .NET versions** — supports `net10.0`, `net9.0`, `net8.0`
- **TypeScript & JavaScript** — choose your preferred frontend language
- **Modern UI** — dark-themed starter page with weather forecast demo

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [.NET SDK](https://dotnet.microsoft.com/) >= 8.0
- npm (comes with Node.js)

## Quick Start

```bash
npx spa-dotnet --name MyApp
cd MyApp
dotnet run --project MyApp.Server
```

Then open the URL shown in the console. The Swagger UI is available at `/swagger`.

## Usage

### Interactive Mode

Run without arguments to get a guided setup:

```bash
npx spa-dotnet
```

### CLI Options

```
spa-dotnet [options]

Options:
  -n, --name <name>           Project name (required)
  -d, --dir <path>            Parent directory (default: current directory)
  -f, --framework <version>   .NET version: net10.0, net9.0, net8.0 (default: net10.0)
  -l, --language <lang>       Client language: typescript, javascript (default: typescript)
      --https                 Use HTTPS for Vite dev server (default)
      --no-https              Use HTTP for Vite dev server
  -h, --help                  Show help
  -v, --version               Show version
```

### Examples

```bash
# Default setup (TypeScript + HTTPS + net10.0)
spa-dotnet --name MyApp

# JavaScript + HTTP + .NET 9
spa-dotnet -n MyApp -l javascript -f net9.0 --no-https

# Specify parent directory
spa-dotnet -n MyApp -d ./projects
```

## Project Structure

```
MyApp/
  MyApp.slnx                  # Solution file (.slnx for .NET 10+, .sln for .NET 9-)
  MyApp.Server/               # ASP.NET Core Web API
    Program.cs                # API endpoints + static file serving
    MyApp.Server.csproj       # SPA proxy + publish targets
    Properties/
      launchSettings.json     # Dev server profiles
    wwwroot/                  # Production build output (populated on publish)
  MyApp.Client/               # React + Vite frontend
    src/
      App.tsx                 # Main component with API call
      App.css                 # Styles
    vite.config.ts            # Vite config with API proxy
    MyApp.Client.csproj       # Solution integration
    package.json
```

## How It Works

### Development

```
Browser  →  Vite (port 54xxx)  →  proxy /api  →  ASP.NET Core (port 51xxx)
```

- `dotnet run` starts the .NET backend and launches Vite via **SpaProxy**
- Vite handles HMR for instant frontend reload
- API requests to `/api/*` are proxied to the .NET backend

### Production

```
dotnet publish
  → npm ci + npm run build    (builds React app)
  → copies dist/ to wwwroot   (bundled with .NET app)
```

- A single `dotnet publish` produces a self-contained deployment
- The .NET app serves the built React files as static content
- Client-side routing works via `MapFallbackToFile("index.html")`

## Development (Contributing)

```bash
git clone https://github.com/<your-username>/spa-dotnet.git
cd spa-dotnet
npm install
npm test
```

## Roadmap

- [ ] Docker support (`Dockerfile` + `docker-compose.yml`)
- [ ] shadcn/ui + Tailwind CSS option
- [ ] ESLint + Prettier pre-configuration
- [ ] Vue.js support

## License

[MIT](LICENSE)
