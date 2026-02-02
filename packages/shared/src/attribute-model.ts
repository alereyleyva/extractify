import { z } from "zod";

export type AttributeType = "string" | "array" | "record" | "arrayOfRecords";

export type AttributeInput = {
  id: string;
  name: string;
  description?: string;
  type: AttributeType;
  children?: AttributeInput[];
};

export const AttributeSchema: z.ZodType<AttributeInput> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["string", "array", "record", "arrayOfRecords"]),
  children: z.array(z.lazy(() => AttributeSchema)).optional(),
});

export const AttributeListSchema = z.array(AttributeSchema).min(1);
