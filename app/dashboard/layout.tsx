// app/dashboard/layout.tsx
import DashboardShell from "@/components/layout/dashboard-shell";
import AuthSessionProvider from "@/components/session-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthSessionProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthSessionProvider>
  );
}