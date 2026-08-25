import { z } from "zod";

const optionalStat = z
  .union([z.number().int().min(0).max(100), z.null()])
  .optional();

export const teamSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  short_name: z.string().trim().min(1, "El nombre corto es obligatorio"),
  owner_name: z.string().trim().nullable().optional(),
  logo_url: z
    .string()
    .trim()
    .nullable()
    .optional()
    .refine(
      (v) => !v || v === "" || /^https?:\/\//i.test(v),
      "URL de logo no válida",
    ),
  primary_color: z.string().min(1),
  secondary_color: z.string().min(1),
  budget: z.number().int().min(0, "El presupuesto debe ser ≥ 0"),
});

export const playerSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  short_name: z.string().trim().nullable().optional(),
  team_id: z.string().uuid("Selecciona un equipo"),
  position: z.string().min(1, "Selecciona una posición"),
  age: z
    .union([z.number().int().min(15, "Edad mínima 15").max(50, "Edad máxima 50"), z.null()])
    .optional(),
  nationality: z.string().trim().nullable().optional(),
  photo_url: z.string().trim().nullable().optional(),
  overall: optionalStat,
  speed: optionalStat,
  acceleration: optionalStat,
  shooting: optionalStat,
  passing: optionalStat,
  dribbling: optionalStat,
  defending: optionalStat,
  physical: optionalStat,
  market_value: z.number().int().min(0, "El valor debe ser ≥ 0"),
  transfer_price: z.number().int().min(0, "El precio debe ser ≥ 0"),
  available_in_market: z.boolean().optional(),
});

export type TeamFormValues = z.infer<typeof teamSchema>;
export type PlayerFormValues = z.infer<typeof playerSchema>;
