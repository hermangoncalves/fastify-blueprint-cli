import fastify, { FastifyInstance } from "fastify";
import { logger, loggerOptions } from "./utils/logger";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import path from "path";
import fastifyAutoload from "@fastify/autoload";

async function gracefulShutdown(server: FastifyInstance) {
  await server.close();
  logger.info("Server shutdown complete");
  process.exit(0);
}

const server = fastify({
  logger: loggerOptions,
}).withTypeProvider<ZodTypeProvider>();

const start = async () => {
  // This loads all plugins defined in plugins
  server.register(fastifyAutoload, {
    dir: path.join(__dirname, "plugins"),
  });

  // This loads all routes defined in routes
  server.register(fastifyAutoload, {
    dir: path.join(__dirname, "routes"),
  });

  process.on("SIGINT", () => gracefulShutdown(server));
  process.on("SIGTERM", () => gracefulShutdown(server));

  await server.listen({ port: 3000, host: "0.0.0.0" });
};

start();
