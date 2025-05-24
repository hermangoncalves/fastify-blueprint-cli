import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import autoload from '@fastify/autoload';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const app: FastifyInstance = Fastify({ logger: true });

// [PLUGIN_IMPORTS]

// [PLUGIN_REGISTRATIONS]

// [ORM_REGISTRATION]

app.register(autoload, {
  dir: path.join(__dirname, 'routes')
});

export default app;