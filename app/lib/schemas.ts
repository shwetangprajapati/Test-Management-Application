import { z } from "zod";

const numeric = z.coerce.number().finite().min(0);

export const loginSchema = z.object({
  userId: z.string().trim().min(1, "User ID is required"),
  password: z.string().min(1, "Password is required"),
});

export const testFormSchema = z.object({
  name: z.string().trim().min(1, "Test name is required"),
  type: z.string().min(1, "Type is required"),
  subjectId: z.string().min(1, "Subject is required"),
  // create endpoint requires at least one topic
  topicIds: z.array(z.string()).min(1, "Please select at least one topic"),
  subTopicIds: z.array(z.string()).default([]),
  difficulty: z.string().min(1, "Difficulty is required"),
  totalTime: numeric.min(1, "Total time is required"),
  correctMarks: z.coerce.number().finite(),
  wrongMarks: z.coerce.number().finite(),
  unattemptedMarks: z.coerce.number().finite(),
  totalQuestions: numeric.min(1, "Total questions is required"),
  totalMarks: numeric.min(1, "Total marks is required"),
});

// Quick-edit dialog doesn't manage topics, so don't require them there.
export const editTestSchema = testFormSchema.extend({
  topicIds: z.array(z.string()).default([]),
});

export const questionSchema = z.object({
  localId: z.string(),
  questionText: z.string().trim().min(1, "Question text is required"),
  options: z
    .array(z.string().trim().min(1, "All four options are required"))
    .length(4, "Exactly four options are required"),
  correctOption: z.coerce.number().min(0).max(3),
  explanation: z.string().default(""),
  difficulty: z.string().default(""),
  topicId: z.string().default(""),
  subTopicId: z.string().default(""),
  mediaUrl: z.string().trim().default(""),
});

export const questionsSchema = z.object({
  questions: z.array(questionSchema).min(1, "Add at least one question"),
});

export type LoginValues = z.infer<typeof loginSchema>;
