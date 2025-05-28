import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export default async function (fastify: FastifyInstance) {
  fastify.get("/users", async (req: FastifyRequest, reply: FastifyReply) => {
    return { users: "true" };
  });
}
