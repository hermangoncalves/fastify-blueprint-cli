import { Command } from "commander";
import inquirer from "inquirer";
import ora, { Ora } from "ora";
import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";

import { sleep } from "./utils";
import { GenerateOptions, Template } from "./types";
import { generateFromTemplate, TemplateData } from "generate-from-template";
import { logger } from "./logger";

type PackageDependency = {
  pkg: string;
  version: string;
};

type ORMConfig = {
  dir: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
};

export const pluginsDependenciesTemplates: Record<string, PackageDependency> = {
  cors: { pkg: "@fastify/cors", version: "^11.0.1" },
  jwt: { pkg: "@fastify/jwt", version: "^9.1.0" },
  "rate-limit": { pkg: "@fastify/rate-limit", version: "^10.2.2" },
  swagger: { pkg: "@fastify/swagger", version: "^9.4.2" },
  "swagger-ui": { pkg: "@fastify/swagger-ui", version: "^5.2.2" },
};

const appBaseTemplate: Template = {
  dir: "app",
  main: "server.ts",
  author: "",
  description: "My awesome project",
  scripts: {
    dev: "tsx --watch src/server.ts",
    build: "tsc && tsc-alias",
  },
  dependencies: {
    "@fastify/autoload": "^6.3.0",
    fastify: "^5.3.3",
    "fastify-plugin": "^5.0.1",
    "fastify-type-provider-zod": "^4.0.2",
    pino: "^9.7.0",
    "pino-pretty": "^13.0.0",
    typescript: "^5.8.3",
  },
  devDependencies: {
    "@types/node": "^22.15.21",
    prettier: "^3.5.3",
    tsx: "^4.19.4",
  },
};

const ormConfigs: Record<string, ORMConfig | null> = {
  prisma: {
    dir: "prisma",
    dependencies: { "@prisma/client": "^5.10.0" },
    devDependencies: { prisma: "^5.10.0" },
    scripts: {
      "prisma:generate": "prisma generate",
      "prisma:migrate": "prisma migrate dev",
      "prisma:studio": "prisma studio",
    },
  },
  drizzle: {
    dir: "drizzle",
    dependencies: { "drizzle-orm": "^0.30.0", pg: "^8.11.3" },
    devDependencies: { "drizzle-kit": "^0.20.14", "@types/pg": "^8.11.2" },
    scripts: {
      "db:generate": "drizzle-kit generate:pg",
      "db:migrate": "tsx src/migrate.ts",
      "db:studio": "drizzle-kit studio",
    },
  },
  none: null,
};

function executeCommand(command: string, cwd: string, spinner: Ora) {
  try {
    spinner.text = `Executing: ${command} in ${cwd}`;
    const output = execSync(command, { cwd, stdio: "pipe" }).toString();
    spinner.succeed(`Successfully executed: ${command}`);
    logger.debug(`Command output: \n${output}`);
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
  const templateSourceDir = path.join(__dirname, "templates", template.dir);

  spinner.start(`Generating project files in ${projectDir}`);
  try {
    await new Promise<void>((resolve, reject) => {
      generateFromTemplate(
        templateSourceDir,
        projectDir,
        data,
        (file) => {
          logger.info(`Generated file: ${file}`);
        },
        (err) => {
          if (err) return reject(err);
          const pluginsTemplateDir = path.join(
            __dirname,
            "templates",
            "plugins"
          );
          for (const plugin of plugins) {
            const pluginTemplateDir = path.join(pluginsTemplateDir, `${plugin}.ts`);
            const pluginDir = path.join(projectDir, "src", "plugins", `${plugin}.ts`);
            fs.copySync(pluginTemplateDir, pluginDir);
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
        choices: Object.keys(ormConfigs),
        default: "none",
      },
      {
        type: "confirm",
        name: "docker",
        message: "Include Docker support?",
        default: false,
      },
    ]);

    const templatesDir = path.join(__dirname, "templates");
    const finalAppTemplate = { ...appBaseTemplate };

    finalAppTemplate.author = answers.author;
    finalAppTemplate.description = answers.description;

    // if (answers.orm !== "none" && answers.orm) {
    //   const ormConfig = ormConfigs[answers.orm as keyof typeof ormConfigs];

    //   if (!ormConfig) {
    //     logger.error(`ORM configuration for "${answers.orm}" not found.`);
    //     process.exit(1);
    //   }

    //   finalAppTemplate.dependencies = {
    //     ...finalAppTemplate.dependencies,
    //     ...ormConfig.dependencies,
    //   };

    //   finalAppTemplate.devDependencies = {
    //     ...finalAppTemplate.devDependencies,
    //     ...ormConfig.devDependencies,
    //   };

    //   finalAppTemplate.scripts = {
    //     ...finalAppTemplate.scripts,
    //     ...ormConfig.scripts,
    //   };

    //   const ormTemplateDir = path.join(templatesDir, ormConfig.dir);

    //   if (answers.orm === "drizzle") {
    //     spinner = ora("Generating Drizzle DB files").start();
    //     const dbDir = path.join(projectSrcDir, "db");
    //     try {
    //       await new Promise<void>((resolve, reject) => {
    //         generateFromTemplate(
    //           path.join(ormTemplateDir, "db"),
    //           dbDir,
    //           {},
    //           (file) => {
    //             logger.info(`Generated Drizzle file: ${file}`);
    //           },
    //           (err) => {
    //             if (err) return reject(err);
    //             resolve();
    //           }
    //         );
    //       });
    //       fs.copyFileSync(
    //         path.join(ormTemplateDir, "drizzle.config.ts"),
    //         path.join(process.cwd(), answers.projectName, "drizzle.config.ts")
    //       );
    //       logger.info(`Generated drizzle.config.ts`);
    //       spinner.succeed("Drizzle DB files generated.");
    //     } catch (error: any) {
    //       spinner.fail("Failed to generate Drizzle DB files.");
    //       logger.error(`Error: ${error.message}`);
    //       process.exit(1);
    //     }
    //   }
    // }

    // if (answers.docker) {
    //   finalAppTemplate.scripts["docker:build"] = `docker-compose build`;
    //   finalAppTemplate.scripts["docker:up"] = `docker-compose up -d`;
    //   finalAppTemplate.scripts["docker:down"] = `docker-compose down`;
    //   finalAppTemplate.scripts["docker:logs"] = `docker-compose logs -f`;

    //   spinner = ora("Generating Docker files").start();
    //   const dockerTemplateDir = path.join(__dirname, "templates", "docker");
    //   const targetDir = path.join(process.cwd(), answers.projectName);
    //   try {
    //     await new Promise<void>((resolve, reject) => {
    //       generateFromTemplate(
    //         dockerTemplateDir,
    //         targetDir,
    //         {
    //           projectName: answers.projectName,
    //         },
    //         (file) => {
    //           logger.info(`Generated Docker file: ${file}`);
    //         },
    //         (err) => {
    //           if (err) return reject(err);
    //           resolve();
    //         }
    //       );
    //     });
    //     spinner.succeed("Docker files generated.");
    //   } catch (error: any) {
    //     spinner.fail("Failed to generate Docker files.");
    //     logger.error(`Error: ${error.message}`);
    //     process.exit(1);
    //   }
    // }

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

    finalAppTemplate.dependencies = {
      ...finalAppTemplate.dependencies,
      ...pluginsDependencies,
    };

    spinner = ora("Generating Fastify project...").start();
    try {
      await generateApp(
        answers.projectName,
        finalAppTemplate,
        {},
        answers.plugins,
        spinner
      );
      spinner.succeed(
        `Project "${answers.projectName}" created and dependencies installed successfully!`
      );
      logger.info(`\nNext steps:\n  cd ${answers.projectName}\n  pnpm dev`);
    } catch (error: any) {
      spinner.fail(`Failed to create project: ${answers.projectName}`);
      logger.error(`Error during project generation: ${error.message}`);
      process.exit(1);
    }
  });
