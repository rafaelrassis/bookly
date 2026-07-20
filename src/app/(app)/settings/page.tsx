"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/components/BackHeader";
import { SectionTitle } from "@/components/SectionTitle";
import { useStore } from "@/lib/store";

export default function SettingsPage() {
  const user = useStore((s) => s.user);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const logout = useStore((s) => s.logout);
  const showToast = useStore((s) => s.showToast);
  const router = useRouter();

  const [changingPassword, setChangingPassword] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  function submitPassword() {
    if (!current || !next || !confirm) {
      showToast("Preencha todos os campos");
      return;
    }
    if (next !== confirm) {
      showToast("As senhas não coincidem");
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    setChangingPassword(false);
    showToast("Senha alterada 🔒");
  }

  function handleLogout() {
    logout();
    router.replace("/");
  }

  const accountRows = [
    { label: "E-mail", value: `${user.username}@gmail.com` },
    { label: "Telefone", value: "(11) 91234-5678" },
    { label: "Senha", value: "••••••••" },
  ];

  return (
    <div className="px-5 pt-4">
      <BackHeader>
        <h1 className="text-lg font-extrabold">Configurações</h1>
      </BackHeader>

      <section className="mt-4">
        <SectionTitle>Conta</SectionTitle>
        <div className="mt-3 rounded-2xl border border-line bg-card">
          {accountRows.map((row, i) => (
            <div
              key={row.label}
              className={`flex items-center justify-between px-4 py-3.5 ${
                i > 0 ? "border-t border-line" : ""
              }`}
            >
              <span className="text-sm text-paperDim">{row.label}</span>
              <span className="text-sm font-medium">{row.value}</span>
            </div>
          ))}
        </div>

        {changingPassword ? (
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
                onClick={() => setChangingPassword(false)}
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
        ) : (
          <button
            type="button"
            onClick={() => setChangingPassword(true)}
            className="mt-3 w-full rounded-xl border border-line bg-card px-4 py-3 text-sm font-bold text-paper transition-colors hover:bg-card2"
          >
            Alterar senha
          </button>
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
