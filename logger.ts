import chalk from "chalk";

export const logger = {
  info: (message: string) => {
    console.log(chalk.blue(message));
  },
  success: (message: string) => {
    console.log(chalk.green(message));
  },
  error: (message: string) => {
    console.log(chalk.red(message));
  },
  warn: (message: string) => {
    console.log(chalk.yellow(message));
  },
  debug: (message: string) => {
    console.log(chalk.gray(message));
  },
};
