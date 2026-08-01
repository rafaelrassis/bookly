"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { BackHeader } from "@/components/BackHeader";
import { FeedbackModal } from "@/components/FeedbackModal";
import { GoodreadsImport } from "@/components/GoodreadsImport";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Section } from "@/components/ui/Section";
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

      <Section title="Conta">
        <div className="mt-3 rounded-2xl border border-line bg-card">
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-paperMuted">E-mail</span>
            <span className="text-sm font-medium">{user.email}</span>
          </div>

          {emailLoginEnabled && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3.5">
              <span className="text-sm text-paperMuted">Senha</span>
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
                className="rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper"
              />
              <input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="Nova senha"
                aria-label="Nova senha"
                className="rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirmar nova senha"
                aria-label="Confirmar nova senha"
                className="rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper"
              />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={resetPasswordFlow}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={submitPassword} disabled={passwordBusy}>
                {passwordBusy ? "Salvando…" : "Salvar senha"}
              </Button>
            </div>
          </div>
        )}
      </Section>

      <Section title="Aparência">
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-3.5">
          <span className="text-sm">Tema</span>
          <div className="flex gap-1" role="group" aria-label="Tema do aplicativo">
            {(
              [
                { key: "dark", label: "Escuro" },
                { key: "light", label: "Claro" },
              ] as const
            ).map(({ key, label }) => (
              <Chip key={key} active={theme === key} onClick={() => setTheme(key)}>
                {label}
              </Chip>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Importar biblioteca">
        <div className="mt-3 rounded-2xl border border-line bg-card p-4">
          <GoodreadsImport />
        </div>
      </Section>

      <Section title="Sessão" className="mb-4">
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
      </Section>
    </div>
  );
}
