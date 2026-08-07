import { describe, expect, it, vi } from "vitest";
import { resolveModelRevisionSha } from "../src/bias/resolve-model-revision";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? "OK" : "Internal Server Error",
    json: async () => body,
  } as Response;
}

describe("resolveModelRevisionSha", () => {
  it("returns the sha from a well-formed response", async () => {
    const sha = "a".repeat(40);
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ sha }));
    const result = await resolveModelRevisionSha("Xenova/gpt2", { fetchImpl });
    expect(result).toBe(sha);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://huggingface.co/api/models/Xenova/gpt2",
      expect.objectContaining({ headers: expect.any(Object) })
    );
  });

  it("retries on a non-ok HTTP response and eventually throws loudly", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, false));
    await expect(
      resolveModelRevisionSha("Xenova/gpt2", { fetchImpl, attempts: 2 })
    ).rejects.toThrow(/Could not resolve an immutable commit sha/);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("rejects a sha that is not 40 hex characters", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ sha: "not-a-sha" }));
    await expect(
      resolveModelRevisionSha("Xenova/gpt2", { fetchImpl, attempts: 1 })
    ).rejects.toThrow(/Could not resolve an immutable commit sha/);
  });

  it("succeeds after a transient failure, within the attempt budget", async () => {
    const sha = "b".repeat(40);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, false))
      .mockResolvedValueOnce(jsonResponse({ sha }));
    const result = await resolveModelRevisionSha("Xenova/gpt2", { fetchImpl, attempts: 3 });
    expect(result).toBe(sha);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
