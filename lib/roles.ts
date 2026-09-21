export function canManageTeam(role: string): boolean {
  return role === "OWNER" || role === "ADMIN";
}

// Roles allowed to move candidates between stages and decide interview outcomes.
export const PIPELINE_EDITOR_ROLES = ["OWNER", "ADMIN", "RECRUITER"] as const;

export function canEditPipeline(role: string): boolean {
  return (PIPELINE_EDITOR_ROLES as readonly string[]).includes(role);
}
