/**
 * @deprecated Kept for backward compatibility (apps/web, existing tests import
 * `BrowserInference` from this path). The canonical implementation now lives in
 * `transformers-inference.ts` under the name `TransformersInference` — see
 * Messmotor-Sanierung Task 2. New code should import `TransformersInference`
 * from "./transformers-inference" directly.
 */
export {
  TransformersInference as BrowserInference,
  type BrowserModel,
  BROWSER_MODELS,
  checkWebGPU,
  checkTransformersAvailable,
  type ScoredLogProb,
  type ScoredLogProbProvenance,
} from "./transformers-inference";
