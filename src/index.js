import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import * as p from "@clack/prompts";
import { getOptions } from "./prompts.js";
import {
  scaffoldClientProjectFile,
  scaffoldDotnetProject,
  scaffoldSolution,
  scaffoldViteProject,
  trustHttpsCertificate,
} from "./scaffolder.js";
import { configureProject, createPorts } from "./configurer.js";
import { execAsync } from "./utils.js";

async function checkCommand(cmd, name) {
  try {
    await execAsync(`${cmd} --version`);
    return true;
  } catch {
    p.log.error(`${name} is not installed or not in PATH`);
    return false;
  }
}

export async function run(argv) {
  const options = await getOptions(argv);
  const { name, framework, language, https } = options;
  const dir = options.dir || ".";

  const projectDir = resolve(process.cwd(), dir, name);
  const ports = createPorts();

  p.log.info(`Scaffolding ${name} in ${dir}/${name} (${framework}, ${language}, ${https ? "HTTPS" : "HTTP"})`);

  p.log.step("Checking prerequisites...");
  const hasDotnet = await checkCommand("dotnet", ".NET SDK");
  const hasNode = await checkCommand("node", "Node.js");
  const hasNpm = await checkCommand("npm", "npm");

  if (!hasDotnet || !hasNode || !hasNpm) {
    p.log.error("Missing prerequisites. Please install the required tools and try again.");
    process.exit(1);
  }
  p.log.success("All prerequisites satisfied");

  await mkdir(projectDir, { recursive: true });
  p.log.success(`Created project directory: ${name}/`);

  const serverDir = await scaffoldDotnetProject(projectDir, name, framework);
  const clientDir = await scaffoldViteProject(projectDir, name, language);
  const clientProjectPath = await scaffoldClientProjectFile(clientDir, name, framework);
  await scaffoldSolution(projectDir, name, serverDir, clientProjectPath, framework);

  await configureProject(projectDir, name, https, framework, language, ports);

  if (https) {
    await trustHttpsCertificate();
  }

  p.outro(`Project ${name} created successfully!

  Next steps:
    cd ${name}
    dotnet run --project ${name}.Server
`);
}
