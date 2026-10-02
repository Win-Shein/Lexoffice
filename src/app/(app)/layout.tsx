import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userName = user.name ?? user.email;
  const companyName = user.companyName ?? "MMXeron";

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar userName={userName} companyName={companyName} logoUrl={user.logoUrl} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav userName={userName} companyName={companyName} logoUrl={user.logoUrl} />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
