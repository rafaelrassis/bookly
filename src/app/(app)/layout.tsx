"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TabBar } from "@/components/TabBar";
import { useUser } from "@/lib/store";

/** Rotas logadas: redireciona para a landing quando não há sessão. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!user.loggedIn) router.replace("/");
  }, [user.loggedIn, router]);

  if (!user.loggedIn) return null;

  return (
    <>
      <main className="min-h-dvh pb-24">{children}</main>
      <TabBar />
    </>
  );
}
