// app/dashboard/layout.tsx
import DashboardShell from "@/components/layout/dashboard-shell";
import AuthSessionProvider from "@/components/session-provider";
import { auth } from "@/lib/auth";
import { requireAuth } from "@/lib/require-auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!(await requireAuth())) redirect("/login");

  return (
    <AuthSessionProvider session={session}>
      <DashboardShell>{children}</DashboardShell>
    </AuthSessionProvider>
  );
}
