import { Suspense } from "react";
import { getTeamAction } from "@/actions/team";
import TeamClient from "./TeamClient";

export default async function TeamPage() {
  const res = await getTeamAction();

  return (
    <Suspense fallback={null}>
      <TeamClient
        initialMembers={res.members ?? []}
        initialInvites={res.invites ?? []}
        currentUserId={res.currentUserId ?? ""}
        currentRole={res.currentRole ?? "INTERVIEWER"}
        googleCalendarEmail={res.googleCalendarEmail ?? null}
      />
    </Suspense>
  );
}