export const PLANS = {
  STARTER: { name: "Starter", inr: 1499, usd: 29, seats: 2, jobs: 5, candidates: 1000, aiScores: 100 },
  GROWTH: { name: "Growth", inr: 3999, usd: 79, seats: 5, jobs: 20, candidates: 5000, aiScores: 500 },
  AGENCY: { name: "Agency", inr: 7999, usd: 149, seats: 10, jobs: 50, candidates: 15000, aiScores: 1000 },
} as const;
export type PlanId = keyof typeof PLANS;
export function isPlanId(value: string): value is PlanId { return Object.hasOwn(PLANS, value); }
export function effectivePlan(subscription: { plan: string; status: string; currentPeriodEnd: Date } | null, trialEndsAt: Date, now = new Date()) {
  if (subscription && subscription.status === "active" && subscription.currentPeriodEnd > now && isPlanId(subscription.plan)) {
    return { id: subscription.plan, limits: PLANS[subscription.plan], trial: false };
  }
  // A failed/canceled subscription must not restore a previous trial.
  if (!subscription && trialEndsAt > now) return { id: "TRIAL", limits: { ...PLANS.GROWTH, aiScores: 100 }, trial: true };
  return null;
}
