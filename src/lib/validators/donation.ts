import { z } from "zod";
import { UF_LIST } from "@/lib/uf";

const UF = z.enum(UF_LIST);

export const createDonationSchema = z
  .object({
    bookId: z.string().min(1),
    photoUrl: z.string().url(),
    city: z.string().trim().min(1).max(80),
    state: UF,
    whatsapp: z
      .string()
      .regex(/^\d{10,13}$/, "WhatsApp deve conter apenas DDI+DDD+número")
      .optional(),
    instagram: z
      .string()
      .regex(/^@?[a-zA-Z0-9._]{1,30}$/, "Instagram inválido")
      .transform((v) => v.replace(/^@/, ""))
      .optional(),
  })
  .refine((d) => d.whatsapp || d.instagram, {
    message: "Informe ao menos um contato (WhatsApp ou Instagram).",
    path: ["whatsapp"],
  });

export type CreateDonationInput = z.infer<typeof createDonationSchema>;
