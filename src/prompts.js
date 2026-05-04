import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

const FRAMEWORKS = ["net10.0", "net9.0", "net8.0"];
const LANGUAGES = ["TypeScript", "JavaScript"];

function isLinux() {
  return process.platform === "linux";
}

function validateProjectName(name) {
  if (!name) return "Project name is required";
  if (!/^[A-Za-z][A-Za-z0-9_.-]*$/.test(name)) {
    return "Project name must start with a letter and contain only letters, numbers, dots, hyphens, or underscores";
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--name" || arg === "-n") {
      args.name = argv[++i];
    } else if (arg === "--dir" || arg === "-d") {
      args.dir = argv[++i];
    } else if (arg === "--framework" || arg === "-f") {
      args.framework = argv[++i];
    } else if (arg === "--language" || arg === "-l") {
      args.language = argv[++i];
    } else if (arg === "--https") {
      args.https = true;
    } else if (arg === "--no-https") {
      args.https = false;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--version" || arg === "-v") {
      args.version = true;
    }
  }
  return args;
}

function printHelp() {
  console.log(`
Usage: spa-dotnet [options]

Options:
  -n, --name <name>           Project name (required)
  -d, --dir <path>            Parent directory (default: current directory, project folder created inside)
  -f, --framework <version>   .NET version: net10.0, net9.0, net8.0 (default: net10.0)
  -l, --language <lang>       Client language: typescript, javascript (default: typescript)
      --https                 Use HTTPS for Vite dev server (default except Linux)
      --no-https              Use HTTP for Vite dev server
  -h, --help                  Show this help
  -v, --version               Show version number

Notes:
  HTTPS is disabled on Linux because this template does not support Linux HTTPS dev cert setup.

Examples:
  spa-dotnet --name MyApp
  spa-dotnet -n MyApp -d ./projects
  spa-dotnet -n MyApp -f net9.0 -l javascript
  spa-dotnet -n MyApp --no-https
`);
}

async function promptInteractive(defaults) {
  p.intro("spa-dotnet");

  const name = await p.text({
    message: "Project name:",
    placeholder: "MyApp",
    validate: (value) => {
      const name = String(value || "").trim();
      return validateProjectName(name);
    },
  });
  if (p.isCancel(name)) process.exit(1);

  const dir = await p.text({
    message: "Parent directory for project:",
    placeholder: ". (current directory)",
    defaultValue: ".",
  });
  if (p.isCancel(dir)) process.exit(1);

  const framework = await p.select({
    message: ".NET framework:",
    options: FRAMEWORKS.map((f) => ({ value: f, label: f })),
    initialValue: defaults.framework,
  });
  if (p.isCancel(framework)) process.exit(1);

  const httpsOptions = [
    {
      value: true,
      label: "Yes (HTTPS)",
      disabled: isLinux(),
      hint: isLinux() ? "Linux does not support HTTPS for this template" : undefined,
    },
    { value: false, label: "No (HTTP)" },
  ];

  const https = await p.select({
    message: "Use HTTPS for Vite dev server?",
    options: httpsOptions,
    initialValue: isLinux() ? false : defaults.https,
  });
  if (p.isCancel(https)) process.exit(1);

  const language = await p.select({
    message: "Client language:",
    options: LANGUAGES.map((l) => ({ value: l, label: l })),
    initialValue: defaults.language,
  });
  if (p.isCancel(language)) process.exit(1);

  p.outro("Configuration complete");

  return {
    name: name.trim(),
    dir: (dir || ".").trim(),
    framework,
    language,
    https,
  };
}

export async function getOptions(argv) {
  const parsed = parseArgs(argv);

  if (parsed.version) {
    console.log(pkg.version);
    process.exit(0);
  }

  if (parsed.help) {
    printHelp();
    process.exit(0);
  }

  const defaults = {
    framework: "net10.0",
    language: "TypeScript",
    https: true,
  };

  let options;

  if (parsed.name !== undefined) {
    options = {
      name: parsed.name.trim(),
      dir: (parsed.dir || ".").trim(),
      framework: parsed.framework || defaults.framework,
      language: parsed.language ? LANGUAGES.find(l => l.toLowerCase() === parsed.language.toLowerCase()) || parsed.language : defaults.language,
      https: parsed.https !== undefined ? parsed.https : defaults.https,
    };
  } else {
    options = await promptInteractive(defaults);
  }

  if (!FRAMEWORKS.includes(options.framework)) {
    throw new Error(`Invalid framework "${options.framework}". Choose: ${FRAMEWORKS.join(", ")}`);
  }
  if (!LANGUAGES.includes(options.language)) {
    throw new Error(`Invalid language "${options.language}". Choose: ${LANGUAGES.join(", ")}`);
  }
  const projectNameError = validateProjectName(options.name);
  if (projectNameError) {
    throw new Error(projectNameError);
  }
  if (isLinux() && options.https) {
    p.log.warn("Linux does not support HTTPS for this template. Falling back to HTTP.");
    options.https = false;
  }

  return options;
}
