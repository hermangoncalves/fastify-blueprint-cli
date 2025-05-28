import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export default async function (fastify: FastifyInstance) {
  fastify.get("/", async (req: FastifyRequest, reply: FastifyReply) => {
    return { root: "true" };
  });
}
