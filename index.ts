import { program } from "commander";
import { generateCommand } from "./generate";
import packageJson from "./package.json";

program
  .name(packageJson.name)
  .description(packageJson.description)
  .version(packageJson.version);

program.addCommand(generateCommand);

program.parse(process.argv);
