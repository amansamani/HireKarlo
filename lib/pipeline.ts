export const TERMINAL_STAGES = ["HIRED", "REJECTED"] as const;
const RESERVED = new Set(["APPLIED", "OFFER", ...TERMINAL_STAGES]);

export function isInterviewStage(stage: string) {
  return !RESERVED.has(stage.toUpperCase());
}

export function pipelineStages(rounds: readonly string[], existingStages: readonly string[] = []) {
  const custom = [...new Set(rounds.map(r => r.trim()).filter(r => r && isInterviewStage(r)))];
  const stages = ["APPLIED", ...(custom.length ? custom : ["Interview"]), "OFFER", "HIRED", "REJECTED"];
  // Preserve visibility of historical stages instead of silently hiding records.
  const historical = [...new Set(existingStages.filter(s => s && !stages.includes(s)))];
  return [...stages.slice(0, -3), ...historical, ...stages.slice(-3)];
}

export function nextPipelineStage(stage: string, stages: readonly string[]) {
  if (TERMINAL_STAGES.some(s => s === stage)) return null;
  const index = stages.indexOf(stage);
  const next = index >= 0 ? stages[index + 1] : undefined;
  return next && next !== "REJECTED" ? next : null;
}
