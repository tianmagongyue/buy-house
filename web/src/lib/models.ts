import { z } from "zod";

export const TriggeredAtPrecisionSchema = z.enum(["day", "month"]);
export type TriggeredAtPrecision = z.infer<typeof TriggeredAtPrecisionSchema>;

export const ProjectRowSchema = z.object({
  id: z.string().uuid(),
  year: z.number().int(),
  name: z.string().min(1),
  district: z.string().min(1),
  address: z.string().min(1),
  lng: z.number().nullable(),
  lat: z.number().nullable(),
  triggered_at: z.string().nullable(),
  triggered_at_precision: TriggeredAtPrecisionSchema,
  seq: z.number().int().nullable(),
  developer: z.string().nullable(),
  unit_type: z.string().nullable(),
  unit_count: z.number().int().nullable(),
  avg_price_cny_per_sqm: z.number().int().nullable(),
  heat_score: z.number().nullable(),
  heat_label: z.string().nullable(),
  unlock_window: z.string().nullable(),
  photo_url: z.string().url().nullable(),
  source_title: z.string().nullable(),
  source_url: z.string().url().nullable(),
  source_published_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

export const ProjectPriceRowSchema = z.object({
  project_id: z.string().uuid(),
  price_cny_per_sqm: z.number().int().nullable(),
  price_total_cny: z.number().int().nullable(),
  price_source_title: z.string().nullable(),
  price_source_url: z.string().url().nullable(),
  price_updated_at: z.string().nullable(),
  updated_at: z.string()
});

export const ProjectWithPriceSchema = ProjectRowSchema.extend({
  price: ProjectPriceRowSchema.nullable()
});
export type ProjectWithPrice = z.infer<typeof ProjectWithPriceSchema>;
