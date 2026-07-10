// app/dashboard/layout.tsx
import  Sidebar from "@/components/layout/sidebar";
import  {Header} from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-50">
      {/* Desktop Sidebar Shell */}
      <aside className="hidden md:block shrink-0">
        <Sidebar />
      </aside>

      {/* Application Inner Canvas */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 selection:bg-zinc-800">
          {children}
        </main>
      </div>
    </div>
  );
}