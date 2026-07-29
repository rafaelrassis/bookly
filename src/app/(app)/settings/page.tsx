"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { BackHeader } from "@/components/BackHeader";
import { FeedbackModal } from "@/components/FeedbackModal";
import { SectionTitle } from "@/components/SectionTitle";
import { emailLoginEnabled } from "@/lib/featureFlags";
import { useStore } from "@/lib/store";
import { apiErrorMessage } from "@/lib/apiError";

type PasswordStep = "idle" | "editing";

export default function SettingsPage() {
  const user = useStore((s) => s.user);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const showToast = useStore((s) => s.showToast);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // senha — troca real: exige a senha atual, sem código (POST .../password)
  const [passwordStep, setPasswordStep] = useState<PasswordStep>("idle");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  function resetPasswordFlow() {
    setPasswordStep("idle");
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  async function submitPassword() {
    if (!current || !next || !confirm) {
      showToast("Preencha todos os campos");
      return;
    }
    if (next.length < 8) {
      showToast("A nova senha precisa ter pelo menos 8 caracteres");
      return;
    }
    if (next !== confirm) {
      showToast("As senhas não coincidem");
      return;
    }
    setPasswordBusy(true);
    const res = await fetch("/api/users/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    });
    setPasswordBusy(false);
    if (!res.ok) {
      if (res.status === 429) {
        showToast(await apiErrorMessage(res, "Não foi possível alterar a senha"));
        return;
      }
      const body = await res.json().catch(() => null);
      showToast(
        body?.error === "senha atual incorreta"
          ? "Senha atual incorreta"
          : body?.error === "a nova senha deve ser diferente da atual"
            ? "A nova senha deve ser diferente da atual"
            : "Não foi possível alterar a senha"
      );
      return;
    }
    showToast("Senha alterada 🔒");
    resetPasswordFlow();
  }

  return (
    <div className="pt-4">
      <BackHeader>
        <h1 className="text-lg font-extrabold">Configurações</h1>
      </BackHeader>

      <section className="mt-4">
        <SectionTitle>Conta</SectionTitle>
        <div className="mt-3 rounded-2xl border border-line bg-card">
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-paperDim">E-mail</span>
            <span className="text-sm font-medium">{user.email}</span>
          </div>

          {emailLoginEnabled && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3.5">
              <span className="text-sm text-paperDim">Senha</span>
              <span className="text-sm font-medium">••••••••</span>
            </div>
          )}
        </div>

        {emailLoginEnabled && passwordStep === "idle" && (
          <button
            type="button"
            onClick={() => setPasswordStep("editing")}
            className="mt-3 w-full rounded-xl border border-line bg-card px-4 py-3 text-sm font-bold text-paper transition-colors hover:bg-card2"
          >
            Alterar senha
          </button>
        )}

        {emailLoginEnabled && passwordStep === "editing" && (
          <div className="mt-3 rounded-2xl border border-line bg-card p-4">
            <div className="flex flex-col gap-2.5">
              <input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="Senha atual"
                aria-label="Senha atual"
                className="rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper placeholder:text-paperDim/60"
              />
              <input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="Nova senha"
                aria-label="Nova senha"
                className="rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper placeholder:text-paperDim/60"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirmar nova senha"
                aria-label="Confirmar nova senha"
                className="rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper placeholder:text-paperDim/60"
              />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={resetPasswordFlow}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-paperDim hover:text-paper"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitPassword}
                disabled={passwordBusy}
                className="rounded-xl bg-foil px-4 py-2.5 text-sm font-bold text-leather disabled:opacity-40"
              >
                {passwordBusy ? "Salvando…" : "Salvar senha"}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="mt-7">
        <SectionTitle>Aparência</SectionTitle>
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-3.5">
          <span className="text-sm">Tema</span>
          <div
            className="flex rounded-full border border-line bg-card2 p-0.5 text-xs font-bold"
            role="group"
            aria-label="Tema do aplicativo"
          >
            {(
              [
                { key: "dark", label: "Escuro" },
                { key: "light", label: "Claro" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={theme === key}
                onClick={() => setTheme(key)}
                className={`rounded-full px-3.5 py-1.5 transition-colors ${
                  theme === key ? "bg-foil text-leather" : "text-paperDim hover:text-paper"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-4 mt-7">
        <SectionTitle>Sessão</SectionTitle>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-3 w-full rounded-xl border border-line bg-card px-5 py-3.5 font-bold text-ribbonText transition-colors hover:bg-card2"
        >
          Sair da conta
        </button>
        <button
          type="button"
          onClick={() => setFeedbackOpen(true)}
          className="mt-3 w-full rounded-xl border border-line bg-card px-4 py-3 text-sm font-bold text-paper transition-colors hover:bg-card2"
        >
          Ajude a melhorar o Bookly
        </button>
        {feedbackOpen && (
          <FeedbackModal onClose={() => setFeedbackOpen(false)} onToast={showToast} />
        )}
      </section>
    </div>
  );
}
