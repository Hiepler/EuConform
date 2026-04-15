import consola from "consola";

export function exitWithError(message: string): never {
  consola.error(message);
  process.exit(1);
}
