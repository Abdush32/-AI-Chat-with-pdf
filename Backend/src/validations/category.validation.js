import { z } from "zod";

export const addCategorySchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: "Name cannot be empty",
      })
      .trim()
      .min(1, "Name cannot be empty")
      .min(3, "Name must be at least 3 characters"),
    description: z.string().optional(),
  }),
});