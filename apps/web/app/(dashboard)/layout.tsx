import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const user = session.user;

  return (
    <DashboardClient
      userEmail={user.email ?? ""}
      userName={user.email?.split("@")[0] ?? ""}
    >
      {children}
    </DashboardClient>
  );
}
