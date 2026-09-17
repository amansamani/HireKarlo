export function canManageTeam(role: string): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canEditPipeline(role: string): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "RECRUITER";
}
