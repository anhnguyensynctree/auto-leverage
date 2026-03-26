import { z } from "zod";

export const ComponentEnum = z.enum(["prepare", "train", "program"]);

export const OptionSchema = z.object({
  label: z.string(),
  // node id or "terminal"
  next: z.string(),
});

export const TerminalSchema = z.object({
  components: z.array(ComponentEnum).min(1),
  confidence: z.number().min(0).max(1),
});

export const QuestionNodeSchema = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(["text", "choice"]),
  options: z.array(OptionSchema).optional(),
  terminal: TerminalSchema.optional(),
});

export const QuestionnaireSchema = z.object({
  version: z.string(),
  start: z.string(),
  nodes: z.array(QuestionNodeSchema),
});

export type Component = z.infer<typeof ComponentEnum>;
export type Option = z.infer<typeof OptionSchema>;
export type Terminal = z.infer<typeof TerminalSchema>;
export type QuestionNode = z.infer<typeof QuestionNodeSchema>;
export type Questionnaire = z.infer<typeof QuestionnaireSchema>;
