import { Command } from "commander";
import inquirer from "inquirer";
import ora, { Ora } from "ora";

import { sleep } from "./utils";
import { GenerateOptions, Template } from "./types";
import { generateFromTemplate, TemplateData } from "generate-from-template";
import path from "path";
import { logger } from "./logger";
import { execSync } from "child_process";
import { readFile, writeFile, writeFileSync } from "fs";

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

      // Copy Docker template files
      const dockerTemplateDir = path.join(__dirname, "templates", "docker");
      const targetDir = path.join(process.cwd(), projectName);

      ["Dockerfile", "docker-compose.yml", ".dockerignore"].forEach((file) => {
        const templatePath = path.join(dockerTemplateDir, file);
        const targetPath = path.join(targetDir, file);

        console.log(templatePath)
        console.log(targetPath)

        readFile(templatePath, (err, data) => {
          if (err) {
            logger.error(`Error reading Docker template file ${file}: ${err}`);
            return;
          }
          writeFile(targetPath, data, (err) => {
            if (err) {
              logger.error(`Error writing Docker file ${file}: ${err}`);
              return;
            }
            logger.info(`Generated Docker file: ${file}`);
          });
        });
      });
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

    await generateApp(projectName, appTemplate, {});

    //     spinner.start("Copiando arquivos do template...");

    //     // Project directory
    //     const targetDir: string = path.join(process.cwd(), projectName);
    //     if (fs.existsSync(targetDir)) {
    //       spinner.fail(`Diretório ${projectName} já existe!`);
    //       return;
    //     }

    //     // Template directory
    //     const templateDir: string = path.join(process.cwd(), "templates/app");

    //     // Copy base template files
    //     try {
    //       fs.copySync(templateDir, targetDir);
    //     } catch (error: any) {
    //       spinner.fail(`Erro ao copiar arquivos: ${error.message}`);
    //       return;
    //     }

    //     // Copy plugin-specific templates
    //     const pluginDir: string = path.join(targetDir, "src", "plugins");
    //     const pluginTemplateDir: string = path.join(
    //       process.cwd(),
    //       "templates/plugins"
    //     );
    //     for (const plugin of plugins) {
    //       const pluginName: string = plugin.split("/")[1]; // e.g., "swagger" from "@fastify/swagger"
    //       const pluginTemplatePath: string = path.join(
    //         pluginTemplateDir,
    //         `${pluginName}.ts`
    //       );
    //       const pluginTargetPath: string = path.join(pluginDir, `${pluginName}.ts`);
    //       try {
    //         if (fs.existsSync(pluginTemplatePath)) {
    //           fs.copySync(pluginTemplatePath, pluginTargetPath);
    //         }
    //       } catch (error: any) {
    //         spinner.warn(
    //           `Não foi possível copiar o template do plugin ${pluginName}: ${error.message}`
    //         );
    //       }
    //     }

    //     // Update package.json
    //     const packageJsonPath: string = path.join(targetDir, "package.json");
    //     let packageJson: any;
    //     try {
    //       packageJson = fs.readJsonSync(packageJsonPath);
    //       packageJson.name = projectName;
    //     } catch (error: any) {
    //       spinner.fail(`Erro ao ler package.json: ${error.message}`);
    //       return;
    //     }

    //     // Add dependencies for plugins, Fastify, and other base packages
    //     packageJson.dependencies = packageJson.dependencies || {};
    //     packageJson.dependencies["fastify"] = pkgDependencies["fastify"];
    //     packageJson.dependencies["@fastify/autoload"] =
    //       pkgDependencies["@fastify/autoload"];
    //     packageJson.dependencies["dotenv"] = pkgDependencies["dotenv"];
    //     for (const plugin of plugins) {
    //       if (pkgDependencies[plugin]) {
    //         packageJson.dependencies[plugin] = pkgDependencies[plugin];
    //       }
    //       // Add @fastify/swagger-ui if swagger is selected
    //       if (
    //         plugin === "@fastify/swagger" &&
    //         pkgDependencies["@fastify/swagger-ui"]
    //       ) {
    //         packageJson.dependencies["@fastify/swagger-ui"] =
    //           pkgDependencies["@fastify/swagger-ui"];
    //       }
    //     }

    //     // Add ORM dependencies
    //     if (orm === "prisma") {
    //       packageJson.dependencies["prisma"] = "latest";
    //       packageJson.devDependencies = packageJson.devDependencies || {};
    //       packageJson.devDependencies["@prisma/client"] = "latest";
    //       packageJson.scripts["prisma:generate"] = "prisma generate";
    //     } else if (orm === "drizzle") {
    //       packageJson.dependencies["drizzle-orm"] = "latest";
    //       packageJson.devDependencies = packageJson.devDependencies || {};
    //       packageJson.devDependencies["drizzle-kit"] = "latest";
    //       packageJson.dependencies["pg"] = "latest";
    //     }

    //     // Add Docker scripts if selected
    //     if (docker) {
    //       packageJson.scripts = packageJson.scripts || {};
    //       packageJson.scripts["docker:build"] = `docker build -t ${projectName} .`;
    //       packageJson.scripts[
    //         "docker:run"
    //       ] = `docker run -p 3000:3000 ${projectName}`;
    //     }

    //     try {
    //       fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
    //     } catch (error: any) {
    //       spinner.fail(`Erro ao atualizar package.json: ${error.message}`);
    //       return;
    //     }

    //     // Generate server.ts with plugin registrations
    //     const serverFile: string = path.join(targetDir, "src", "server.ts");
    //     let serverContent: string;
    //     try {
    //       serverContent = fs.readFileSync(serverFile, "utf-8");
    //     } catch (error: any) {
    //       spinner.fail(`Erro ao ler server.ts: ${error.message}`);
    //       return;
    //     }

    //     // Generate plugin imports and registrations
    //     const pluginImports: string[] = [];
    //     const pluginRegistrations: string[] = [];
    //     for (const plugin of plugins) {
    //       const pluginName: string = plugin.split("/")[1]; // e.g., "swagger" from "@fastify/swagger"
    //       pluginImports.push(`import ${pluginName} from '${plugin}';`);
    //       if (plugin === "@fastify/swagger") {
    //         pluginImports.push(`import swaggerUi from '@fastify/swagger-ui';`);
    //         pluginRegistrations.push(`
    // app.register(swagger, {
    //   openapi: {
    //     info: {
    //       title: '${projectName}',
    //       version: '1.0.0',
    //     },
    //   },
    // });
    // app.register(swaggerUi, {
    //   routePrefix: '/docs',
    // });
    //         `);
    //       } else if (plugin === "@fastify/jwt") {
    //         pluginRegistrations.push(`
    // app.register(jwt, {
    //   secret: process.env.JWT_SECRET,
    // });
    // app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    //   try {
    //     await request.jwtVerify();
    //   } catch (err) {
    //     reply.send(err);
    //   }
    // });
    //         `);
    //       } else if (plugin === "@fastify/cors") {
    //         pluginRegistrations.push(`
    // app.register(cors, {
    //   origin: '*',
    // });
    //         `);
    //       } else if (plugin === "@fastify/rate-limit") {
    //         pluginRegistrations.push(`
    // app.register(rateLimit, {
    //   max: 100,
    //   timeWindow: '1 minute',
    // });
    //         `);
    //       }
    //     }

    //     // Add ORM configuration
    //     let ormRegistration: string = "";
    //     if (orm === "prisma") {
    //       ormRegistration = `
    // import { PrismaClient } from '@prisma/client';
    // const prisma = new PrismaClient();
    // app.decorate('prisma', prisma);
    //       `;
    //     } else if (orm === "drizzle") {
    //       ormRegistration = `
    // import { drizzle } from 'drizzle-orm/node-postgres';
    // import { Pool } from 'pg';
    // const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    // const db = drizzle(pool);
    // app.decorate('db', db);
    //       `;
    //     }

    //     // Update server.ts content
    //     serverContent = serverContent
    //       .replace("// [PLUGIN_IMPORTS]", pluginImports.join("\n"))
    //       .replace("// [PLUGIN_REGISTRATIONS]", pluginRegistrations.join("\n"))
    //       .replace("// [ORM_REGISTRATION]", ormRegistration);

    //     try {
    //       fs.writeFileSync(serverFile, serverContent);
    //     } catch (error: any) {
    //       spinner.fail(`Erro ao atualizar server.ts: ${error.message}`);
    //       return;
    //     }

    //     // Add ORM files
    //     if (orm === "prisma") {
    //       const prismaDir: string = path.join(targetDir, "prisma");
    //       fs.mkdirSync(prismaDir, { recursive: true });
    //       const schemaContent: string = `
    // generator client {
    //   provider = "prisma-client-js"
    // }

    // datasource db {
    //   provider = "postgresql"
    //   url      = env("DATABASE_URL")
    // }

    // model User {
    //   id    Int     @id @default(autoincrement())
    //   email String  @unique
    //   name  String?
    // }
    //       `;
    //       fs.writeFileSync(
    //         path.join(prismaDir, "schema.prisma"),
    //         schemaContent.trim()
    //       );
    //     } else if (orm === "drizzle") {
    //       const drizzleConfig: any = {
    //         schema: "./src/schema.ts",
    //         out: "./migrations",
    //         driver: "pg",
    //         dbCredentials: { connectionString: "env(DATABASE_URL)" },
    //       };
    //       fs.writeJsonSync(
    //         path.join(targetDir, "drizzle.config.json"),
    //         drizzleConfig,
    //         { spaces: 2 }
    //       );
    //       const schemaContent: string = `
    // import { pgTable, serial, text } from 'drizzle-orm/pg-core';

    // export const users = pgTable('users', {
    //   id: serial('id').primaryKey(),
    //   email: text('email').unique(),
    //   name: text('name'),
    // });
    //       `;
    //       fs.writeFileSync(path.join(targetDir, "src", "schema.ts"), schemaContent);
    //     }

    //     // Add Docker files if selected
    //     if (docker) {
    //       spinner.text = "Gerando arquivos Docker...";
    //       const dockerfileContent: string = `
    // FROM node:18
    // WORKDIR /app
    // COPY package*.json ./
    // RUN npm install
    // COPY . .
    // RUN npm run build
    // EXPOSE 3000
    // CMD ["npm", "start"]
    //       `;

    //       const dockerignoreContent: string = `
    // node_modules
    // npm-debug.log
    // dist
    // .env
    // migrations
    //       `;

    //       try {
    //         fs.writeFileSync(
    //           path.join(targetDir, "Dockerfile"),
    //           dockerfileContent.trim()
    //         );
    //         fs.writeFileSync(
    //           path.join(targetDir, ".dockerignore"),
    //           dockerignoreContent.trim()
    //         );
    //       } catch (error: any) {
    //         spinner.fail(`Erro ao criar arquivos Docker: ${error.message}`);
    //         return;
    //       }
    //     }

    //     // Install dependencies
    //     spinner.text = "Instalando dependências...";
    //     try {
    //       process.chdir(targetDir);
    //       execSync("npm install", { stdio: "inherit" });
    //       if (orm === "prisma") {
    //         execSync("npx prisma generate", { stdio: "inherit" });
    //       }
    //     } catch (error: any) {
    //       spinner.fail(`Erro ao instalar dependências: ${error.message}`);
    //       return;
    //     }

    //     // Read package.json to get the installed Fastify version
    //     let fastifyVersion: string = "unknown";
    //     try {
    //       const updatedPackageJson = fs.readJsonSync(packageJsonPath);
    //       fastifyVersion = updatedPackageJson.dependencies?.fastify || "not found";
    //     } catch (error: any) {
    //       spinner.warn(
    //         `Não foi possível ler a versão do Fastify: ${error.message}`
    //       );
    //     }

    //     spinner.succeed(`Projeto ${projectName} criado com sucesso!`);
    //     console.log(`
    // Para começar:
    //   cd ${projectName}
    //   ${docker ? "npm run docker:build && npm run docker:run" : "npm start"}
    // ${orm === "prisma" ? "  npx prisma migrate dev" : ""}
    // ${orm === "drizzle" ? "  npx drizzle-kit generate:pg" : ""}
    // Versão do Fastify instalada: ${fastifyVersion}
    //     `);
  });
