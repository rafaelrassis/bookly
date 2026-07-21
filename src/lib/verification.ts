import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";

const TTL_MIN = 15;
const RESEND_COOLDOWN_S = 60;

export class CooldownError extends Error {
  constructor() {
    super("cooldown");
  }
}

function gen(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function createAndSendCode(email: string, type: "email" | "password") {
  const last = await db.verificationCode.findFirst({
    where: { email, type },
    orderBy: { createdAt: "desc" },
  });
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_S * 1000) {
    throw new CooldownError();
  }

  const code = gen();
  await db.verificationCode.create({
    data: {
      email,
      code,
      type,
      expiresAt: new Date(Date.now() + TTL_MIN * 60_000),
    },
  });
  return code;
}

export async function sendEmailCode(email: string) {
  const code = await createAndSendCode(email, "email");
  await sendMail(email, "Seu código Bookly", `Código: ${code} (expira em ${TTL_MIN} min)`);
}

export async function verifyEmailCode(email: string, code: string) {
  const rec = await db.verificationCode.findFirst({
    where: { email, type: "email", code, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!rec) return false;

  await db.$transaction([
    db.verificationCode.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { email }, data: { emailVerified: new Date() } }),
  ]);
  return true;
}

export async function sendPasswordResetCode(email: string) {
  const code = await createAndSendCode(email, "password");
  await sendMail(
    email,
    "Redefinir senha — Bookly",
    `Código para redefinir sua senha: ${code} (expira em ${TTL_MIN} min)`
  );
}

export async function consumePasswordResetCode(email: string, code: string) {
  const rec = await db.verificationCode.findFirst({
    where: { email, type: "password", code, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!rec) return false;

  await db.verificationCode.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
  return true;
}

/** Troca de e-mail: o código é enviado ao endereço novo, que ainda não
 * pertence a nenhum usuário — por isso não atualiza `user` aqui, só
 * consome o código (a rota faz o update do e-mail do usuário logado). */
export async function consumeEmailChangeCode(newEmail: string, code: string) {
  const rec = await db.verificationCode.findFirst({
    where: { email: newEmail, type: "email", code, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!rec) return false;

  await db.verificationCode.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
  return true;
}
