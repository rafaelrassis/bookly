"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/components/BackHeader";
import { SectionTitle } from "@/components/SectionTitle";
import { generateVerificationCode } from "@/lib/format";
import { useStore } from "@/lib/store";

type EmailStep = "idle" | "editing" | "verifying";
type PhoneStep = "idle" | "adding" | "verifying";
type PasswordStep = "idle" | "editing" | "verifying";

/** Envia (mock) um código de verificação: sem backend, o código aparece no toast. */
function useMockVerification(showToast: (message: string) => void) {
  const [sentCode, setSentCode] = useState<string | null>(null);
  function send(destination: string) {
    const code = generateVerificationCode();
    setSentCode(code);
    showToast(`Código enviado para ${destination}: ${code}`);
  }
  function check(input: string): boolean {
    return sentCode !== null && input.trim() === sentCode;
  }
  function reset() {
    setSentCode(null);
  }
  return { send, check, reset };
}

export default function SettingsPage() {
  const user = useStore((s) => s.user);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const logout = useStore((s) => s.logout);
  const updateEmail = useStore((s) => s.updateEmail);
  const updatePhone = useStore((s) => s.updatePhone);
  const showToast = useStore((s) => s.showToast);
  const router = useRouter();

  // e-mail
  const [emailStep, setEmailStep] = useState<EmailStep>("idle");
  const [emailDraft, setEmailDraft] = useState(user.email);
  const [emailCode, setEmailCode] = useState("");
  const emailVerification = useMockVerification(showToast);

  // telefone
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("idle");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const phoneVerification = useMockVerification(showToast);

  // senha
  const [passwordStep, setPasswordStep] = useState<PasswordStep>("idle");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordCode, setPasswordCode] = useState("");
  const passwordVerification = useMockVerification(showToast);

  function resetEmailFlow() {
    setEmailStep("idle");
    setEmailDraft(user.email);
    setEmailCode("");
    emailVerification.reset();
  }

  function submitNewEmail() {
    const value = emailDraft.trim();
    if (!value.includes("@")) {
      showToast("Digite um e-mail válido");
      return;
    }
    emailVerification.send(user.email);
    setEmailStep("verifying");
  }

  function confirmEmailCode() {
    if (!emailVerification.check(emailCode)) {
      showToast("Código incorreto");
      return;
    }
    updateEmail(emailDraft.trim());
    showToast("E-mail atualizado ✦");
    resetEmailFlow();
  }

  function resetPhoneFlow() {
    setPhoneStep("idle");
    setPhoneDraft("");
    setPhoneCode("");
    phoneVerification.reset();
  }

  function submitNewPhone() {
    const value = phoneDraft.trim();
    if (value.length < 8) {
      showToast("Digite um telefone válido");
      return;
    }
    phoneVerification.send(value);
    setPhoneStep("verifying");
  }

  function confirmPhoneCode() {
    if (!phoneVerification.check(phoneCode)) {
      showToast("Código incorreto");
      return;
    }
    updatePhone(phoneDraft.trim());
    showToast("Telefone adicionado ✦");
    resetPhoneFlow();
  }

  function resetPasswordFlow() {
    setPasswordStep("idle");
    setCurrent("");
    setNext("");
    setConfirm("");
    setPasswordCode("");
    passwordVerification.reset();
  }

  function submitPassword() {
    if (!current || !next || !confirm) {
      showToast("Preencha todos os campos");
      return;
    }
    if (next !== confirm) {
      showToast("As senhas não coincidem");
      return;
    }
    passwordVerification.send(user.email);
    setPasswordStep("verifying");
  }

  function confirmPasswordCode() {
    if (!passwordVerification.check(passwordCode)) {
      showToast("Código incorreto");
      return;
    }
    showToast("Senha alterada 🔒");
    resetPasswordFlow();
  }

  function handleLogout() {
    logout();
    router.replace("/");
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
                      className="rounded-xl bg-foil px-4 py-2 text-sm font-bold text-leather"
                    >
                      Enviar código
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <p className="text-xs text-paperDim">
                    Digite o código de verificação enviado para {user.email}
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
                      disabled={!emailCode.trim()}
                      className="rounded-xl bg-foil px-4 py-2 text-sm font-bold text-leather disabled:opacity-40"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-line px-4 py-3.5">
            <span className="text-sm text-paperDim">Telefone</span>
            {phoneStep === "idle" && (
              <div className="flex items-center gap-2.5">
                {user.phone ? (
                  <span className="text-sm font-medium">{user.phone}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPhoneStep("adding")}
                    className="text-xs font-bold text-foil hover:opacity-80"
                  >
                    + Adicionar telefone
                  </button>
                )}
              </div>
            )}
          </div>

          {phoneStep !== "idle" && (
            <div className="border-t border-line px-4 py-3.5">
              {phoneStep === "adding" ? (
                <div className="flex flex-col gap-2.5">
                  <input
                    type="tel"
                    value={phoneDraft}
                    onChange={(e) => setPhoneDraft(e.target.value)}
                    placeholder="(11) 91234-5678"
                    aria-label="Novo telefone"
                    className="rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper placeholder:text-paperDim/60"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetPhoneFlow}
                      className="rounded-xl px-4 py-2 text-sm font-bold text-paperDim hover:text-paper"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={submitNewPhone}
                      className="rounded-xl bg-foil px-4 py-2 text-sm font-bold text-leather"
                    >
                      Enviar código
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <p className="text-xs text-paperDim">
                    Digite o código de verificação enviado por SMS para {phoneDraft}
                  </p>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    placeholder="000000"
                    aria-label="Código de verificação do telefone"
                    className="rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper placeholder:text-paperDim/60"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetPhoneFlow}
                      className="rounded-xl px-4 py-2 text-sm font-bold text-paperDim hover:text-paper"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={confirmPhoneCode}
                      disabled={!phoneCode.trim()}
                      className="rounded-xl bg-foil px-4 py-2 text-sm font-bold text-leather disabled:opacity-40"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-line px-4 py-3.5">
            <span className="text-sm text-paperDim">Senha</span>
            <span className="text-sm font-medium">••••••••</span>
          </div>
        </div>

        {passwordStep === "idle" && (
          <button
            type="button"
            onClick={() => setPasswordStep("editing")}
            className="mt-3 w-full rounded-xl border border-line bg-card px-4 py-3 text-sm font-bold text-paper transition-colors hover:bg-card2"
          >
            Alterar senha
          </button>
        )}

        {passwordStep === "editing" && (
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
                className="rounded-xl bg-foil px-4 py-2.5 text-sm font-bold text-leather"
              >
                Salvar senha
              </button>
            </div>
          </div>
        )}

        {passwordStep === "verifying" && (
          <div className="mt-3 rounded-2xl border border-line bg-card p-4">
            <p className="text-xs text-paperDim">
              Para confirmar a troca de senha, digite o código enviado para {user.email}
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={passwordCode}
              onChange={(e) => setPasswordCode(e.target.value)}
              placeholder="000000"
              aria-label="Código de verificação da senha"
              className="mt-2.5 w-full rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper placeholder:text-paperDim/60"
            />
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
                onClick={confirmPasswordCode}
                disabled={!passwordCode.trim()}
                className="rounded-xl bg-foil px-4 py-2.5 text-sm font-bold text-leather disabled:opacity-40"
              >
                Confirmar
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
          onClick={handleLogout}
          className="mt-3 w-full rounded-xl border border-line bg-card px-5 py-3.5 font-bold text-ribbon transition-colors hover:bg-card2"
        >
          Sair da conta
        </button>
      </section>
    </div>
  );
}
