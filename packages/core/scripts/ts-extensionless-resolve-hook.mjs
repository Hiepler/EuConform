/**
 * Minimal Node.js module-resolution hook: when a relative specifier without an
 * extension fails to resolve (the normal case for TypeScript sources compiled with
 * `moduleResolution: "bundler"`, which intentionally omit ".ts" from import specifiers),
 * retry once with ".ts" appended.
 *
 * This exists ONLY so that maintenance scripts can run directly against the
 * TypeScript sources with `node --experimental-strip-types`, without needing a
 * bundler or ts-node. It changes no application behavior.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    const isBareRelative = specifier.startsWith(".") && !/\.[a-zA-Z]+$/.test(specifier);
    if (!isBareRelative) throw err;

    const candidate = new URL(`${specifier}.ts`, context.parentURL);
    if (!existsSync(fileURLToPath(candidate))) throw err;

    return nextResolve(candidate.href, context);
  }
}
