/**
 * Browser stand-in for `node:crypto`.
 *
 * `@euconform/core`'s barrel export pulls the bias-evidence code path into the web
 * bundle even though the web app never produces evidence (browser bias measurement
 * is disabled). Webpack cannot resolve the `node:` URI scheme, so the client build
 * fails without a substitute.
 *
 * This throws rather than returning a stub digest on purpose: a silently wrong hash
 * would defeat the whole point of the evidence format, whose hashes are what let a
 * third party verify an artifact was not altered.
 */
export function createHash(): never {
  throw new Error(
    "node:crypto is unavailable in the browser. Bias evidence, including its hashes, is produced by the CLI only."
  );
}
