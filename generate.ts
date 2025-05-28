import { Command } from "commander";
import inquirer from "inquirer";
import ora, { Ora } from "ora";
import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";

import { sleep } from "./utils";
import { GenerateOptions } from "./types";
import {
  appBaseTemplate,
  appDrizzleTemplate,
  getPluginTemplateFile,
  getTemplateDir,
  pluginsDependenciesTemplates,
} from "./templates";
import { generateFromTemplate, TemplateData } from "generate-from-template";
import { logger } from "./logger";
import { Template } from "./templates/types";

function executeCommand(command: string, cwd: string, spinner: Ora) {
  try {
    spinner.text = `Executing: ${command} in ${cwd}`;
    execSync(command, { cwd, stdio: "pipe" });
    spinner.succeed(`Successfully executed: ${command}`);
  } catch (error: any) {
    spinner.fail(`Failed to execute: ${command}`);
    logger.error(
      `Error executing command: ${command}\n${
        error.stderr ? error.stderr.toString() : error.message
      }`
    );
    throw new Error(`Command failed: ${command}`);
  }
}

async function updatePackageJson(
  projectDir: string,
  template: Template,
  spinner: Ora
) {
  const packageJsonPath = path.join(projectDir, "package.json");
  spinner.text = `Updating package.json in ${projectDir}`;

  try {
    const data = await fs.readFile(packageJsonPath, "utf8");
    let packageJson = JSON.parse(data);

    packageJson.main = template.main || packageJson.main;
    packageJson.author = template.author || packageJson.author;
    packageJson.description = template.description || packageJson.description;

    packageJson.scripts = {
      ...(packageJson.scripts || {}),
      ...template.scripts,
    };
    packageJson.dependencies = {
      ...(packageJson.dependencies || {}),
      ...template.dependencies,
    };
    packageJson.devDependencies = {
      ...(packageJson.devDependencies || {}),
      ...template.devDependencies,
    };

    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2),
      "utf8"
    );
  } catch (error: any) {
    spinner.fail(`Failed to update package.json.`);
    logger.error(`Error updating package.json: ${error.message}`);
    throw new Error("Failed to update package.json.");
  }
}

async function generateApp(
  projectName: string,
  template: Template,
  data: TemplateData,
  plugins: string[],
  spinner: Ora
) {
  const projectDir = path.join(process.cwd(), projectName);
  const templateDir = getTemplateDir(template.dir);

  spinner.start(`Generating project files in ${projectDir}\n`);
  try {
    await new Promise<void>((resolve, reject) => {
      generateFromTemplate(
        templateDir,
        projectDir,
        data,
        (file) => {
          logger.info(`Generated file: ${file}`);
        },
        (err) => {
          if (err) return reject(err);
          for (const plugin of plugins) {
            const pluginTemplateFile = getPluginTemplateFile(plugin);
            const pluginDir = path.join(
              projectDir,
              "src",
              "plugins",
              `${plugin}.ts`
            );
            fs.copySync(pluginTemplateFile, pluginDir);
          }
          resolve();
        }
      );
    });
    spinner.succeed(`Project files generated.`);
  } catch (error: any) {
    spinner.fail(`Failed to generate project files.`);
    logger.error(`Error generating template: ${error.message}`);
    throw new Error("Failed to generate project files.");
  }

  process.chdir(projectDir);

  executeCommand("pnpm init", projectDir, spinner);
  await updatePackageJson(projectDir, template, spinner);
}

export const generateCommand = new Command()
  .name("generate")
  .description("Generate a new Fastify + TypeScript project")
  .option("--name <name>", "Project name")
  .option("--orm <orm>", "ORM to use (e.g., prisma, drizzle)")
  .action(async (options: GenerateOptions) => {
    let spinner: Ora;

    spinner = ora("Starting project configuration").start();
    await sleep(500);
    spinner.stop();

    const pluginsChoices = Object.entries(pluginsDependenciesTemplates).map(
      ([key, { pkg }]) => ({
        name: pkg,
        value: key,
      })
    );

    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "projectName",
        message: "Project name:",
        default: options.name,
        validate: (input: string): boolean | string =>
          input ? true : "Project name is required!",
        when: !options.name,
      },
      {
        type: "input",
        name: "author",
        message: "Author:",
        default: options.author || "",
        when: !options.author,
      },
      {
        type: "input",
        name: "description",
        message: "Project description:",
        default: "My awesome Fastify project",
      },
      {
        type: "checkbox",
        name: "plugins",
        message: "Which plugins do you want to include?",
        choices: pluginsChoices,
      },
      {
        type: "list",
        name: "orm",
        message: "Which ORM do you want to use?",
        choices: ["drizzle", "none"],
        default: "none",
      },
      {
        type: "confirm",
        name: "docker",
        message: "Include Docker support?",
        default: false,
      },
    ]);

    const template =
      answers.orm === "drizzle" ? appDrizzleTemplate : appBaseTemplate;

    template.author = answers.author;
    template.description = answers.description;

    const pluginsDependencies = answers.plugins.reduce(
      (acc: Record<string, string>, plugin: string) => {
        const dep = pluginsDependenciesTemplates[plugin];
        if (dep) {
          acc[dep.pkg] = dep.version;
        }
        return acc;
      },
      {}
    );

    template.dependencies = {
      ...template.dependencies,
      ...pluginsDependencies,
    };

    spinner = ora("Generating Fastify project...").start();
    try {
      await generateApp(
        answers.projectName,
        template,
        {},
        answers.plugins,
        spinner
      );
      spinner.succeed(
        `Project "${answers.projectName}" created and dependencies installed successfully!`
      );
      logger.info(`\nNext steps:
  1. cd ${answers.projectName}
  2. pnpm install
  3. pnpm run dev
  4. Open your browser and visit http://localhost:3000`);
    } catch (error: any) {
      spinner.fail(`Failed to create project: ${answers.projectName}`);
      logger.error(`Error during project generation: ${error.message}`);
      process.exit(1);
    }
  });
