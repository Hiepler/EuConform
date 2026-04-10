import { incidentReport } from "../lib/incidents.js";
import { logRetrievalEvent } from "../lib/logging.js";
import { exportReport } from "../lib/report.js";
import { runAiAssistedSearch } from "../lib/retrieval.js";

export function handleApproval(result) {
  return {
    approved: true,
    manualReviewRequired: Boolean(result.sources.length === 0),
  };
}

export function createQueryHandler() {
  return async function queryRoute(req, res) {
    const { query } = req.body;
    const result = await runAiAssistedSearch(query);
    const review = handleApproval(result);

    logRetrievalEvent({ query, result, review });

    const payload = {
      ...result,
      ...review,
      notice: "This answer was AI-generated from retrieved documents and may contain errors.",
      exportReport: exportReport(query, result),
    };

    if (review.manualReviewRequired) {
      return res.json({
        ...payload,
        incident: incidentReport({
          severity: "high",
          reason: "manual_review_required",
        }),
      });
    }

    return res.json(payload);
  };
}
