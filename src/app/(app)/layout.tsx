import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TabBar } from "@/components/TabBar";
import { TopNav } from "@/components/TopNav";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSocialCrawler } from "@/lib/bot";

/** Rotas logadas: redireciona para o login quando não há sessão, e para o
 * onboarding quando a conta OAuth ainda não escolheu username/gêneros —
 * exceto para crawlers de preview de link (WhatsApp etc.), que precisam
 * renderizar a árvore pra a metadata da página (title/OG) chegar até eles. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isCrawler = isSocialCrawler(headers().get("user-agent"));
  if (!session?.user && !isCrawler) redirect("/login");

  if (session?.user?.id) {
    const me = await db.user.findUnique({
      where: { id: session.user.id },
      select: { onboarded: true },
    });
    if (!me?.onboarded) redirect("/onboarding");
  }

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
