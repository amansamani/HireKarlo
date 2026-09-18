import { redirect } from "next/navigation";
import { getTeamAction } from "@/actions/team";
import TeamClient from "./TeamClient";
export default async function TeamPage() {
  const result = await getTeamAction();
  if ("error" in result || !result.currentUserId || !result.currentRole) redirect("/login");
  return <TeamClient initialMembers={result.members} initialInvites={result.invites} currentUserId={result.currentUserId} currentRole={result.currentRole} googleCalendarEmail={result.googleCalendarEmail}/>;
}
