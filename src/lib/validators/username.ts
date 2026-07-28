import { z } from "zod";

const RESERVED = new Set([
  "admin", "api", "me", "settings", "login", "logout",
  "u", "user", "users", "clube", "clubes", "estante", "perfil", "inicio",
]);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Mínimo 3 caracteres")
  .max(20, "Máximo 20 caracteres")
  .regex(/^[a-z0-9._-]+$/, "Use letras, números, ponto, hífen ou underscore")
  .refine((u) => !RESERVED.has(u), "Nome de usuário reservado");
