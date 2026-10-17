import { z } from "zod";

export const addPostSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    categoryId: z.string().min(1, "Category ID is required"),
    file: z.string().optional(),
    content: z.string().min(10, "Content must be at least 10 characters"),
  }),
});