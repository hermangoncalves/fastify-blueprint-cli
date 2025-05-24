export type GenerateOptions = {
  name?: string;
  orm?: string;
}

export type Template = {
  dir: string;
  main: string;
  author: string;
  description: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};