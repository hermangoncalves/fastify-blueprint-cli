import { program } from "commander";
import { generateCommand } from "./generate";

program
  .name("fastify-blueprint-cli")
  .description("CLI to generate Fastify projects with TypeScript")
  .version("1.0.0");

program.addCommand(generateCommand);

program.parse(process.argv);
