import { redirect } from "next/navigation";
import { TabBar } from "@/components/TabBar";
import { TopNav } from "@/components/TopNav";
import { auth } from "@/lib/auth";

/** Rotas logadas: redireciona para o login quando não há sessão. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      <TopNav />
      <main className="mx-auto min-h-dvh w-full max-w-app px-5 pb-24 md:max-w-2xl md:pb-12">
        {children}
      </main>
      <TabBar />
    </>
  );
}
