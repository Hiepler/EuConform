import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { webpack }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node$": false,
      // The web app does not run inference: browser bias measurement is disabled
      // (Messmotor-Sanierung Task 2) and the remaining toxicity/regard scorers in
      // @euconform/core are optional. Excluding the library from the bundle avoids
      // webpack trying to resolve onnxruntime's runtime-loaded assets
      // (ort-wasm-*.wasm, ort.webgpu.bundle.min.mjs), which are fetched by path at
      // runtime and cannot be resolved statically.
      //
      // Every import of this package in @euconform/core is dynamic and wrapped in a
      // try/catch that degrades to "unavailable", so an unresolvable module behaves
      // exactly like an absent optional dependency.
      "@huggingface/transformers": false,
    };

    // core's barrel export reaches node:crypto through the bias-evidence path, and
    // webpack resolves `node:` URIs before aliases apply — so a plain alias cannot
    // catch it. The replacement throws instead of returning a stub digest: a silently
    // wrong hash would defeat the evidence format, whose hashes are what let a third
    // party verify an artifact was not altered.
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^node:crypto$/,
        (resource: { request: string }) => {
          resource.request = path.resolve(import.meta.dirname, "lib/node-crypto-unavailable.ts");
        }
      )
    );

    return config;
  },
};

export default nextConfig;
