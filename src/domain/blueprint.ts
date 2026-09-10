import { z } from 'zod';

export const sceneSchema = z.object({
  narration: z.string().trim().min(12).max(260),
  searchQueries: z.array(z.string().trim().min(2).max(80)).min(2).max(4),
});

export const blueprintSchema = z.object({
  topic: z.string().trim().min(5).max(120),
  title: z.string().trim().min(5).max(90),
  description: z.string().trim().min(20).max(800),
  hook: z.string().trim().min(8).max(180),
  scenes: z.array(sceneSchema).min(5).max(8),
}).superRefine((value, ctx) => {
  const wordCount = value.scenes
    .flatMap((scene) => scene.narration.trim().split(/\s+/u))
    .filter(Boolean).length;

  if (wordCount < 55 || wordCount > 95) {
    ctx.addIssue({
      code: 'custom',
      message: `Total narration must be 55-95 words; received ${wordCount}`,
      path: ['scenes'],
    });
  }
});

export const topicPlanSchema = z.object({
  topics: z.array(z.object({
    topic: z.string().trim().min(5).max(120),
    angle: z.string().trim().min(8).max(220),
  })).min(1).max(5),
});

export type Blueprint = z.infer<typeof blueprintSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type TopicPlan = z.infer<typeof topicPlanSchema>['topics'][number];

export interface SourceReference {
  readonly title: string;
  readonly url: string;
}

export interface ResearchResult {
  readonly text: string;
  readonly sources: readonly SourceReference[];
}

export interface ResolvedScene {
  readonly index: number;
  readonly narration: string;
  readonly audioPath: string;
  readonly videoPath: string;
  readonly durationSeconds: number;
  readonly pexelsUrl: string;
  readonly creatorName: string;
  readonly creatorUrl: string;
}
