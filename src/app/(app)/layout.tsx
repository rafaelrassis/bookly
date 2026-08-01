import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SideNav } from "@/components/SideNav";
import { TabBar } from "@/components/TabBar";
import { TopNav } from "@/components/TopNav";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSocialCrawler } from "@/lib/bot";
import { AsideProvider, AsideSlot } from "@/lib/aside";

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
    <AsideProvider>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50
                   focus:rounded-xl focus:bg-foil focus:px-4 focus:py-3 focus:text-leather"
      >
        Pular para o conteúdo
      </a>

      <TopNav />

      <div className="mx-auto flex w-full max-w-shell gap-8 px-4 sm:px-6 lg:px-8">
        <SideNav />

        <main
          id="conteudo"
          className="min-h-dvh min-w-0 flex-1 pt-2 pb-[calc(theme(spacing.tabbar)+env(safe-area-inset-bottom))]
                     md:mx-auto md:max-w-content md:pb-12 lg:mx-0"
        >
          {children}
        </main>

        <aside className="hidden w-80 shrink-0 lg:block">
          <AsideSlot className="sticky top-6 flex flex-col gap-4" />
        </aside>
      </div>

      <TabBar />
    </AsideProvider>
  );
}
