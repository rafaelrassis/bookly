"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TabBar } from "@/components/TabBar";
import { useStore } from "@/lib/store";

/** Rotas logadas: redireciona para a landing quando não há sessão. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = useStore((s) => s.user.loggedIn);
  const router = useRouter();

  useEffect(() => {
    if (!loggedIn) router.replace("/");
  }, [loggedIn, router]);

  if (!loggedIn) return null;

  return (
    <>
      <main className="min-h-dvh px-5 pb-24">{children}</main>
      <TabBar />
    </>
  );
}
