import path from "path";
export const getTemplateFile = ({ template, model, file, }) => {
    return path.join(__dirname, template, model, file);
};
export const getTemplateDir = (template) => {
    return path.join(__dirname, template);
};
export const getPluginTemplateFile = (plugin) => {
    return path.join(__dirname, "plugins", `${plugin}.ts`);
};
export const appBaseTemplate = {
    dir: "app-base",
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
        zennv: "^0.1.1",
        zod: "^3.24.2",
    },
    devDependencies: {
        typescript: "^5.8.3",
        "@types/node": "^22.15.21",
        prettier: "^3.5.3",
        tsx: "^4.19.4",
    },
};
export const appDrizzleTemplate = {
    dir: "app-drizzle",
    main: "server.ts",
    author: "",
    description: "My awesome project",
    scripts: {
        dev: "tsx --watch src/main.ts",
        build: "tsc && tsc-alias",
        "db:push": "drizzle-kit push",
        "db:studio": "drizzle-kit studio",
        "db:generate": "drizzle-kit generate",
        "db:migrate": "drizzle-kit migrate",
        "db:seed:dev": "tsx src/db/seeds/dev.ts",
        "dbml:generate": "tsx src/db/dbml.ts",
    },
    dependencies: {
        "@fastify/autoload": "^6.3.0",
        fastify: "^5.3.3",
        "fastify-plugin": "^5.0.1",
        "fastify-type-provider-zod": "^4.0.2",
        pino: "^9.7.0",
        "pino-pretty": "^13.0.0",
        zennv: "^0.1.1",
        zod: "^3.24.2",
        "drizzle-orm": "^0.41.0",
        "drizzle-zod": "^0.7.0",
        pg: "^8.16.0",
        postgres: "^3.4.7",
    },
    devDependencies: {
        typescript: "^5.8.3",
        "@types/node": "^22.15.21",
        prettier: "^3.5.3",
        tsx: "^4.19.4",
        "drizzle-dbml-generator": "^0.10.0",
        "drizzle-kit": "^0.31.1",
    },
};
export const pluginsDependenciesTemplates = {
    cors: { pkg: "@fastify/cors", version: "^11.0.1" },
    jwt: { pkg: "@fastify/jwt", version: "^9.1.0" },
    "rate-limit": { pkg: "@fastify/rate-limit", version: "^10.2.2" },
    swagger: { pkg: "@fastify/swagger", version: "^9.4.2" },
    "swagger-ui": { pkg: "@fastify/swagger-ui", version: "^5.2.2" },
};
