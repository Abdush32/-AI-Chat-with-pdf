import { z } from "zod";

export const createCompanionSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: "Name is required",
      })
      .trim()
      .min(1, "Name cannot be empty"),
    mood: z.enum(["romantic", "sad"], {
      errorMap: () => ({ message: "Mood must be either 'romantic' or 'sad'" }),
    }),
    description: z
      .string({
        required_error: "Description is required",
      })
      .trim()
      .min(1, "Description cannot be empty"),
  }),
});

export const sendMessageSchema = z.object({
  params: z.object({
    id: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: "Invalid companion ID format",
    }),
  }),
  body: z.object({
    content: z
      .string({
        required_error: "Message content is required",
      })
      .trim()
      .min(1, "Message content cannot be empty"),
  }),
});
