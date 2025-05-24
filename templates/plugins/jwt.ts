import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export default async function (fastify: FastifyInstance, opts: any) {
  fastify.register(import("@fastify/jwt"), {
    secret: process.env.JWT_SECRET,
  });

  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    }
  );
}
