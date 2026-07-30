import { z } from "zod";
import { UF_LIST } from "@/lib/uf";

export const UF = z.enum(UF_LIST);

export const locationSchema = z.object({
  city: z.string().trim().min(1).max(80).nullable().optional(),
  state: UF.nullable().optional(),
});
