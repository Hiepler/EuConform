export interface ReviewDecision {
  approved: boolean;
  reviewerId: string;
  timestamp: Date;
  overrideReason?: string;
}

export async function requireHumanApproval(_aiOutput: string): Promise<ReviewDecision> {
  // Human review gate - AI output must be approved before action
  return { approved: false, reviewerId: "", timestamp: new Date() };
}
