"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { BackHeader } from "@/components/BackHeader";
import { FeedbackModal } from "@/components/FeedbackModal";
import { SectionTitle } from "@/components/SectionTitle";
import { useStore } from "@/lib/store";

type EmailStep = "idle" | "editing" | "verifying";

export default function SettingsPage() {
  const user = useStore((s) => s.user);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const applyProfile = useStore((s) => s.applyProfile);
  const showToast = useStore((s) => s.showToast);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // e-mail — troca real: código enviado ao endereço novo (POST .../email/request + /confirm)
  const [emailStep, setEmailStep] = useState<EmailStep>("idle");
  const [emailDraft, setEmailDraft] = useState(user.email);
  const [emailCode, setEmailCode] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  function resetEmailFlow() {
    setEmailStep("idle");
    setEmailDraft(user.email);
    setEmailCode("");
  }

  async function submitNewEmail() {
    const value = emailDraft.trim();
    if (!value.includes("@")) {
      showToast("Digite um e-mail válido");
      return;
    }
    setEmailBusy(true);
    const res = await fetch("/api/users/me/email/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail: value }),
    });
    setEmailBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      showToast(
        res.status === 409
          ? "Esse e-mail já está em uso"
          : res.status === 429
            ? "Aguarde um pouco antes de reenviar"
            : (body?.error ?? "Não foi possível enviar o código")
      );
      return;
    }
    showToast(`Código enviado para ${value}`);
    setEmailStep("verifying");
  }

  async function confirmEmailCode() {
    setEmailBusy(true);
    const res = await fetch("/api/users/me/email/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail: emailDraft.trim(), code: emailCode.trim() }),
    });
    setEmailBusy(false);
    if (!res.ok) {
      showToast(res.status === 409 ? "Esse e-mail já está em uso" : "Código inválido ou expirado");
      return;
    }
    applyProfile({ email: emailDraft.trim() });
    showToast("E-mail atualizado ✦");
    resetEmailFlow();
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
            {emailStep === "idle" && (
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-medium">{user.email}</span>
                <button
                  type="button"
                  onClick={() => setEmailStep("editing")}
                  className="text-xs font-bold text-foil hover:opacity-80"
                >
                  Editar
                </button>
              </div>
            )}
          </div>

          {emailStep !== "idle" && (
            <div className="border-t border-line px-4 py-3.5">
              {emailStep === "editing" ? (
                <div className="flex flex-col gap-2.5">
                  <input
                    type="email"
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    aria-label="Novo e-mail"
                    className="rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetEmailFlow}
                      className="rounded-xl px-4 py-2 text-sm font-bold text-paperDim hover:text-paper"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={submitNewEmail}
                      disabled={emailBusy}
                      className="rounded-xl bg-foil px-4 py-2 text-sm font-bold text-leather disabled:opacity-40"
                    >
                      {emailBusy ? "Enviando…" : "Enviar código"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <p className="text-xs text-paperDim">
                    Digite o código de verificação enviado para {emailDraft.trim()}
                  </p>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value)}
                    placeholder="000000"
                    aria-label="Código de verificação do e-mail"
                    className="rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper placeholder:text-paperDim/60"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetEmailFlow}
                      className="rounded-xl px-4 py-2 text-sm font-bold text-paperDim hover:text-paper"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={confirmEmailCode}
                      disabled={!emailCode.trim() || emailBusy}
                      className="rounded-xl bg-foil px-4 py-2 text-sm font-bold text-leather disabled:opacity-40"
                    >
                      {emailBusy ? "Confirmando…" : "Confirmar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
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
