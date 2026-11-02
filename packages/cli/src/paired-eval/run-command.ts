import { defineCommand } from "citty";
import { exitWithError } from "../utils/exit";

// Placeholder until AP4 (runner) lands: `euconform paired-eval run`.
export default defineCommand({
  meta: { name: "run", description: "Score a generated prompt set with a model (AP4)" },
  run() {
    exitWithError("paired-eval run is not implemented yet.");
  },
});
