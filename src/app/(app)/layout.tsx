import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        userName={user.name ?? user.email}
        companyName={user.companyName ?? "Mein Unternehmen"}
      />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
