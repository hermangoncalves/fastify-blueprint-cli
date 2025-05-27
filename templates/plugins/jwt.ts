import fastifyPlugin from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

const plugin = async (fastify: FastifyInstance, opts: any) => {
  fastify.register(fastifyJwt, {
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
};

export default fastifyPlugin(plugin);
