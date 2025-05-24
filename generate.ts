import { Command } from "commander";
import inquirer from "inquirer";
import ora, { Ora } from "ora";

import { sleep } from "./utils";
import { GenerateOptions, Template } from "./types";
import { generateFromTemplate, TemplateData } from "generate-from-template";
import path from "path";
import { logger } from "./logger";
import { execSync } from "child_process";
import { readFile, writeFile } from "fs";

type PackageDependency = {
  pkg: string;
  version: string;
};

export const pluginsTemplate: Record<string, PackageDependency> = {
  cors: {
    pkg: "@fastify/cors",
    version: "^11.0.1",
  },
  jwt: {
    pkg: "@fastify/jwt",
    version: "^9.1.0",
  },
  "rate-limit": {
    pkg: "@fastify/rate-limit",
    version: "^10.2.2",
  },
  swagger: {
    pkg: "@fastify/swagger",
    version: "^9.4.2",
  },
  "swagger-ui": {
    pkg: "@fastify/swagger-ui",
    version: "^5.2.2",
  },
};

const appTemplate: Template = {
  dir: "app-ts",
  main: "server.ts",
  author: "",
  description: "My awesome project",
  scripts: {
    dev: "tsx --watch src/server.ts",
    build: "tsc && tsc-alias",
  },
  dependencies: {
    fastify: "^5.2.1",
    pino: "^9.6.0",
    "pino-pretty": "^13.0.0",
  },
  devDependencies: {
    prettier: "^3.5.3",
    "tsc-alias": "^1.8.13",
    tsx: "^4.19.3",
    typescript: "^5.8.2",
    "@types/node": "^22.13.13",
  },
};

function generateApp(dir: string, template: Template, data: TemplateData) {
  return new Promise((resolve, reject) => {
    generateFromTemplate(
      path.join(__dirname, "templates", appTemplate.dir),
      dir,
      data,
      (file) => {
        logger.info(`generated file: ${file}`);
      },
      (err) => {
        if (err) return reject(err);

        process.chdir(dir);
        execSync("pnpm init");

        logger.info(`reading package.json in ${dir}`);
        readFile("package.json", (err, data) => {
          if (err) return reject(err);
          const packageJson = JSON.parse(data.toString());

          packageJson.main = template.main;
          packageJson.author = template.author;
          packageJson.description = template.description;
          packageJson.scripts = Object.assign(
            packageJson.scripts || {},
            template.scripts
          );

          packageJson.dependencies = Object.assign(
            packageJson.dependencies || {},
            template.dependencies
          );

          packageJson.devDependencies = Object.assign(
            packageJson.devDependencies || {},
            template.devDependencies
          );

          writeFile(
            "package.json",
            JSON.stringify(packageJson, null, 2),
            (err) => {
              if (err) return reject(err);
              logger.info(`package.json updated`);
              resolve(true);
            }
          );
        });

        execSync("pnpm install");

        resolve(true);
      }
    );
  });
}

export const generateCommand = new Command()
  .name("generate")
  .description("Generate a new Fastify + TypeScript project")
  .option("--name <name>", "Project name")
  .option("--orm <orm>", "ORM to use (e.g., prisma, drizzle)")
  .action(async (options: GenerateOptions) => {
    const spinner: Ora = ora("Starting project configuration").start();

    await sleep(2000);

    spinner.stop();

    const pluginsChoices = Object.entries(pluginsTemplate).map(
      ([key, { pkg, version }]) => ({
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
        default: "",
      },
      {
        type: "input",
        name: "description",
        message: "Project description:",
        default: "My awesome project",
      },
      {
        type: "checkbox",
        name: "plugins",
        message: "Which plugins do you want to include?",
        choices: pluginsChoices,
      },
      {
        type: "confirm",
        name: "docker",
        message: "Include Docker support?",
        default: false,
      },
    ]);
    const { projectName, plugins, docker, author, description } = answers;

    appTemplate.author = author;
    appTemplate.description = description;

    if (docker) {
      appTemplate.scripts["docker:build"] = `docker-compose build`;
      appTemplate.scripts["docker:up"] = `docker-compose up -d`;
      appTemplate.scripts["docker:down"] = `docker-compose down`;
      appTemplate.scripts["docker:logs"] = `docker-compose logs -f`;

      const dockerTemplateDir = path.join(__dirname, "templates", "docker");
      const targetDir = path.join(process.cwd(), projectName);

      generateFromTemplate(
        dockerTemplateDir,
        targetDir,
        {
          projectName,
        },
        (file) => {
          logger.info(`generated file: ${file}`);
        }
      );
    }

    const pluginsDependencies = plugins.reduce(
      (acc: Record<string, string>, plugin: string) => {
        const { pkg, version } = pluginsTemplate[plugin];
        acc[pkg] = version;
        return acc;
      },
      {}
    );

    appTemplate.dependencies = {
      ...appTemplate.dependencies,
      ...pluginsDependencies,
    };

    generateApp(projectName, appTemplate, {});
  });
