// app/dashboard/layout.tsx
import DashboardShell from "@/components/layout/dashboard-shell";
import AuthSessionProvider from "@/components/session-provider";
import { auth } from "@/lib/auth";
import { requireAuth, requireOrg } from "@/lib/require-auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!(await requireAuth())) redirect("/login");
  const context = await requireOrg();

  return (
    <AuthSessionProvider session={session}>
      <DashboardShell role={context?.role ?? null}>{children}</DashboardShell>
    </AuthSessionProvider>
  );
}
