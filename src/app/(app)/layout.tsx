import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TabBar } from "@/components/TabBar";
import { TopNav } from "@/components/TopNav";
import { auth } from "@/lib/auth";
import { isSocialCrawler } from "@/lib/bot";

/** Rotas logadas: redireciona para o login quando não há sessão — exceto
 * para crawlers de preview de link (WhatsApp etc.), que precisam renderizar
 * a árvore pra a metadata da página (title/OG) chegar até eles. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isCrawler = isSocialCrawler(headers().get("user-agent"));
  if (!session?.user && !isCrawler) redirect("/login");

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
