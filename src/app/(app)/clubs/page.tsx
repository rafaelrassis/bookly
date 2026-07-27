"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { SectionTitle } from "@/components/SectionTitle";
import { BookOpenIcon, LockIcon } from "@/components/icons";
import { Spinner } from "@/components/Spinner";
import { useStore } from "@/lib/store";
import type { ClubSummary } from "@/lib/types";

function ClubCard({ club }: { club: ClubSummary }) {
  return (
    <Link
      href={`/clubs/${club.id}`}
      className="flex gap-4 rounded-2xl border border-line bg-card p-4 transition-colors hover:bg-card2"
    >
      <BookCover book={club.book} width={56} />
      <div className="min-w-0 flex-1">
        <h3 className="flex items-center gap-1.5 font-display text-base font-bold">
          {club.visibility === "private" && (
            <span className="text-paperDim" aria-label="Clube privado">
              <LockIcon />
            </span>
          )}
          {club.name}
        </h3>
        <p className="text-xs text-paperDim">{club.members} membros</p>
        <p className="mt-1.5 line-clamp-2 text-sm text-paperDim">{club.desc}</p>
        <p className={`mt-2 text-xs font-bold ${club.joined ? "text-foil" : "text-paperDim"}`}>
          {club.joined ? "Participando ✓" : "Ver clube →"}
        </p>
      </div>
    </Link>
  );
}

export default function ClubsPage() {
  const showToast = useStore((s) => s.showToast);
  const router = useRouter();

  const [clubs, setClubs] = useState<ClubSummary[] | null>(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setError(false);
    fetch("/api/clubs")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setClubs(data.items))
      .catch(() => setError(true));
  }, [retryCount]);

  const minePublic = (clubs ?? []).filter((c) => c.joined && c.visibility === "public");
  const minePrivate = (clubs ?? []).filter((c) => c.joined && c.visibility === "private");
  const discover = (clubs ?? []).filter((c) => !c.joined && c.visibility === "public");

  async function submitCode() {
    setJoining(true);
    try {
      const res = await fetch("/api/clubs/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        showToast(res.status === 404 ? "Código inválido 😕" : "Não foi possível entrar");
        return;
      }
      const data = await res.json();
      if (data.status === "already") {
        showToast("Você já participa desse clube");
      } else {
        showToast("Você entrou no clube! 🎉");
      }
      setCode("");
      setCodeOpen(false);
      router.push(`/clubs/${data.id}`);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="pt-5">
      <h1 className="text-2xl font-extrabold">Clubes</h1>

      <div className="mt-4 flex gap-2">
        <Link
          href="/clubs/new"
          className="flex-1 rounded-xl bg-foil px-4 py-3 text-center text-sm font-bold text-leather transition-opacity hover:opacity-90"
        >
          + Criar um clube
        </Link>
        <button
          type="button"
          onClick={() => setCodeOpen((o) => !o)}
          aria-expanded={codeOpen}
          className="flex-1 rounded-xl border border-line bg-card px-4 py-3 text-sm font-bold text-paper transition-colors hover:bg-card2"
        >
          Entrar com código
        </button>
      </div>

      {codeOpen && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-line bg-card p-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && code.length === 6) submitCode();
            }}
            placeholder="ABC123"
            aria-label="Código do clube"
            className="min-w-0 flex-1 rounded-xl border border-line bg-card2 px-4 py-2.5 font-mono text-base uppercase tracking-[0.3em] text-paper placeholder:tracking-[0.3em] placeholder:text-paperDim/40"
          />
          <button
            type="button"
            onClick={submitCode}
            disabled={code.length !== 6 || joining}
            className="flex items-center justify-center rounded-xl bg-foil px-4 py-2.5 text-sm font-bold text-leather disabled:opacity-40"
          >
            {joining ? <Spinner size={16} className="text-leather" /> : "Entrar"}
          </button>
        </div>
      )}

      {error ? (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-paperDim">Não foi possível carregar os clubes. Tente de novo.</p>
          <button
            type="button"
            onClick={() => setRetryCount((n) => n + 1)}
            className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-bold text-paper hover:border-foil/50"
          >
            Tentar de novo
          </button>
        </div>
      ) : clubs === null ? (
        <div className="mt-8 flex justify-center">
          <Spinner size={28} className="text-foil" label="Carregando clubes" />
        </div>
      ) : (
        <>
          {(minePublic.length > 0 || minePrivate.length > 0) && (
            <section className="mt-6">
              <SectionTitle>Seus clubes</SectionTitle>
              {minePublic.length > 0 && (
                <>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-paperDim/70">
                    Públicos
                  </p>
                  <div className="mt-2 flex flex-col gap-3">
                    {minePublic.map((club) => (
                      <ClubCard key={club.id} club={club} />
                    ))}
                  </div>
                </>
              )}
              {minePrivate.length > 0 && (
                <>
                  <p className="mt-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-paperDim/70">
                    <LockIcon size={10} /> Privados
                  </p>
                  <div className="mt-2 flex flex-col gap-3">
                    {minePrivate.map((club) => (
                      <ClubCard key={club.id} club={club} />
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          {discover.length > 0 && (
            <section className="mb-4 mt-6">
              <SectionTitle>Descubra clubes</SectionTitle>
              <div className="mt-3 flex flex-col gap-3">
                {discover.map((club) => (
                  <ClubCard key={club.id} club={club} />
                ))}
              </div>
            </section>
          )}

          {minePublic.length === 0 && minePrivate.length === 0 && discover.length === 0 && (
            <EmptyState
              icon={<BookOpenIcon />}
              title="Nenhum clube ainda"
              description="Crie um clube de leitura ou entre com um código de convite."
              action={{ label: "Criar um clube", href: "/clubs/new" }}
            />
          )}
        </>
      )}
    </div>
  );
}
