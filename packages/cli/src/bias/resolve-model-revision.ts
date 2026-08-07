/**
 * Resolves the CURRENT commit SHA of a Hugging Face model repo.
 *
 * "main" is a mutable branch pointer, not a pin: a future push to the model repo
 * would silently move it, making `provenance.modelRevision` in a euconform.bias.v2
 * artifact meaningless for reproduction. This mirrors the `resolveModelRevisionSha`
 * pattern from `packages/core/scripts/seed-logprob-fixture.mjs` (Task 1): a tiny
 * metadata fetch (not a model download), validated 40-hex shape, retried a few
 * times, LOUD abort on failure — a bias measurement run is online-by-nature, so a
 * silent fallback to "main" here would be exactly the kind of unreliable
 * provenance this format revision exists to eliminate.
 */

const HF_SHA_PATTERN = /^[0-9a-f]{40}$/i;

export interface ResolveModelRevisionOptions {
  attempts?: number;
  fetchImpl?: typeof fetch;
}

export async function resolveModelRevisionSha(
  modelId: string,
  options: ResolveModelRevisionOptions = {}
): Promise<string> {
  const attempts = options.attempts ?? 3;
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = `https://huggingface.co/api/models/${modelId}`;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetchImpl(url, {
        headers: { "Cache-Control": "no-cache", Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const body = (await response.json()) as { sha?: unknown };
      const sha = body?.sha;
      if (typeof sha !== "string" || !HF_SHA_PATTERN.test(sha)) {
        throw new Error(
          `response did not contain a valid 40-char commit sha (got: ${JSON.stringify(sha)}); this looks like a malformed or stubbed API response, not the real Hub metadata`
        );
      }
      return sha;
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[bias] revision resolution attempt ${attempt}/${attempts} for "${modelId}" failed: ${message}`
      );
    }
  }

  const lastMessage = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `Could not resolve an immutable commit sha for "${modelId}" from the Hugging Face Hub API ` +
      `after ${attempts} attempts. Aborting: measuring against the mutable "main" ref would make ` +
      `provenance.modelRevision meaningless for reproduction. Last error: ${lastMessage}`
  );
}
