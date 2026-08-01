"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { BookOpenIcon, LockIcon } from "@/components/icons";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/Button";
import { ErrorRetry } from "@/components/ui/ErrorRetry";
import { Section } from "@/components/ui/Section";
import { Sheet } from "@/components/ui/Sheet";
import { Spinner } from "@/components/Spinner";
import { useStore } from "@/lib/store";
import type { ClubSummary } from "@/lib/types";
import { apiErrorMessage } from "@/lib/apiError";

function ClubCard({ club }: { club: ClubSummary }) {
  return (
    <Link
      href={`/clubs/${club.id}`}
      className="flex h-full gap-4 rounded-2xl border border-line bg-card p-4 transition-colors hover:bg-card2"
    >
      {club.book ? (
        <BookCover book={club.book} width={56} />
      ) : (
        <div
          className="flex w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-line/70 bg-card2 text-center text-caption leading-tight text-paperMuted"
          style={{ height: 56 * 1.5 }}
          aria-label="Nenhum livro definido ainda"
        >
          Nenhum livro ainda
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="flex min-w-0 items-center gap-1.5 font-display text-base font-bold">
          {club.visibility === "private" && (
            <span className="shrink-0 text-paperMuted" aria-label="Clube privado">
              <LockIcon />
            </span>
          )}
          <span className="truncate">{club.name}</span>
        </h3>
        <p className="text-xs text-paperMuted">{club.members} membros</p>
        <p className="mt-1.5 line-clamp-2 text-sm text-paperMuted">{club.desc}</p>
        {club.joined && <p className="mt-2 text-xs font-bold text-foil">Participando ✓</p>}
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

  const mine = (clubs ?? []).filter((c) => c.joined);
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
        showToast(res.status === 404 ? "Código inválido 😕" : await apiErrorMessage(res, "Não foi possível entrar"));
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
      <header className="flex items-center justify-between">
        <h1 className="text-h1 font-extrabold">Clubes</h1>
        <NotificationBell className="-mr-2" />
      </header>

      <div className="mt-4 flex flex-col gap-2 xs:flex-row">
        <Button variant="primary" full asChild>
          <Link href="/clubs/new">+ Criar um clube</Link>
        </Button>
        <Button full onClick={() => setCodeOpen(true)} aria-expanded={codeOpen}>
          Entrar com código
        </Button>
      </div>

      {error ? (
        <ErrorRetry
          className="mt-8"
          message="Não foi possível carregar os clubes. Tente de novo."
          onRetry={() => setRetryCount((n) => n + 1)}
        />
      ) : clubs === null ? (
        <div className="mt-8 flex justify-center">
          <Spinner size={28} className="text-foil" label="Carregando clubes" />
        </div>
      ) : (
        <>
          {mine.length > 0 && (
            <Section title="Seus clubes">
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {mine.map((club) => (
                  <li key={club.id}>
                    <ClubCard club={club} />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {discover.length > 0 && (
            <Section title="Descubra clubes">
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {discover.map((club) => (
                  <li key={club.id}>
                    <ClubCard club={club} />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {mine.length === 0 && discover.length === 0 && (
            <EmptyState
              icon={<BookOpenIcon />}
              title="Nenhum clube ainda"
              description="Crie um clube de leitura ou entre com um código de convite."
              action={{ label: "Criar um clube", href: "/clubs/new" }}
            />
          )}
        </>
      )}

      {codeOpen && (
        <Sheet onClose={() => setCodeOpen(false)} title="Entrar com código">
          <label htmlFor="club-code-input" className="text-caption text-paperMuted">
            Peça o código de 6 caracteres pra quem administra o clube.
          </label>
          <div className="mt-3 flex items-center gap-2">
            <input
              id="club-code-input"
              type="text"
              inputMode="text"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && code.length === 6) submitCode();
              }}
              // eslint-disable-next-line jsx-a11y/no-autofocus -- sheet recém-aberto, único campo
              autoFocus
              placeholder="ABC123"
              aria-describedby="club-code-hint"
              className="min-h-tap min-w-0 flex-1 rounded-xl border border-line bg-card2 px-4 font-mono text-base uppercase tracking-[0.3em] text-paper"
            />
            <Button variant="primary" onClick={submitCode} disabled={code.length !== 6 || joining}>
              {joining ? <Spinner size={16} className="text-leather" /> : "Entrar"}
            </Button>
          </div>
          <p id="club-code-hint" className="mt-2 text-caption text-paperMuted">
            6 letras e números, sem espaços.
          </p>
        </Sheet>
      )}
    </div>
  );
}
