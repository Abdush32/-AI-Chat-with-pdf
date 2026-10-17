import { z } from "zod";

export const createSessionSchema = z.object({
  body: z.object({
    documentId: z
      .string()
      .refine((val) => !val || /^[0-9a-fA-F]{24}$/.test(val), {
        message: "Invalid document ID format",
      })
      .optional(),
    title: z.string().trim().optional(),
    mode: z.enum(["with_data", "without_data"]).optional(),
  }),
});

export const sendMessageSchema = z.object({
  params: z.object({
    sessionId: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: "Invalid session ID format",
    }),
  }),
  body: z.object({
    content: z
      .string({
        required_error: "Message content is required",
      })
      .trim()
      .min(1, "Message content cannot be empty"),
    useDocument: z.boolean().optional(),
  }),
});
