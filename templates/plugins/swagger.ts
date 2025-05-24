import { FastifyInstance } from "fastify";

export default async function (fastify: FastifyInstance, opts: any) {
  fastify.register(import("@fastify/swagger"), {
    openapi: {
      info: {
        title: "My Fastify App",
        version: "1.0.0",
      },
    },
  });
  fastify.register(import("@fastify/swagger-ui"), {
    routePrefix: "/docs",
  });
}
