export type Template = {
  dir: TemplateType;
  main: string;
  author: string;
  description: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

export type TemplateType = "app-base" | "app-drizzle";

export interface GetTemplateFileArgs {
  template: TemplateType;
  model: string;
  file: string;
}

export type PackageDependency = {
  pkg: string;
  version: string;
};
