"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TabBar } from "@/components/TabBar";
import { TopNav } from "@/components/TopNav";
import { useStore } from "@/lib/store";

/** Rotas logadas: redireciona para a landing quando não há sessão. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const hasHydrated = useStore((s) => s.hasHydrated);
  const loggedIn = useStore((s) => s.user.loggedIn);
  const router = useRouter();

  useEffect(() => {
    // só decide depois que o estado persistido é aplicado — senão o valor
    // padrão (deslogado) de antes da reidratação chuta a sessão pra fora.
    if (hasHydrated && !loggedIn) router.replace("/");
  }, [hasHydrated, loggedIn, router]);

  if (!loggedIn) return null;

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
