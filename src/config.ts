import 'dotenv/config';
import path from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1, 'GEMINI_API_KEY is required'),
  PEXELS_API_KEY: z.string().trim().min(1, 'PEXELS_API_KEY is required'),
  GEMINI_MODEL: z.string().trim().min(1).default('gemini-3.6-flash'),
  SHORTS_NICHE: z.string().trim().min(5).default('technology and internet history, surprising inventions, software incidents'),
  SHORTS_LANGUAGE: z.string().trim().min(2).default('tr-TR'),
  SHORTS_TOPIC: z.string().trim().optional(),
  SHORTS_TOPICS: z.string().trim().optional(),
  BATCH_COUNT: z.coerce.number().int().min(1).max(5).default(3),
  PIPER_VOICE: z.string().trim().min(1).default('tr_TR-dfki-medium'),
  PIPER_DATA_DIR: z.string().trim().min(1).default('.cache/piper'),
  OUTPUT_DIR: z.string().trim().min(1).default('output'),
});

const parsed = envSchema.parse(process.env);

function parseTopics(value: string | undefined): readonly string[] {
  if (!value?.trim()) return [];

  return [...new Set(
    value
      .split('|')
      .map((topic) => topic.trim())
      .filter((topic) => topic.length >= 5),
  )].slice(0, 5);
}

const topics = parseTopics(parsed.SHORTS_TOPICS);
const legacyTopic = parsed.SHORTS_TOPIC?.trim();

export const config = Object.freeze({
  geminiApiKey: parsed.GEMINI_API_KEY,
  pexelsApiKey: parsed.PEXELS_API_KEY,
  geminiModel: parsed.GEMINI_MODEL,
  niche: parsed.SHORTS_NICHE,
  language: parsed.SHORTS_LANGUAGE,
  topics: topics.length > 0 ? topics : legacyTopic ? [legacyTopic] : [],
  batchCount: parsed.BATCH_COUNT,
  piperVoice: parsed.PIPER_VOICE,
  piperDataDir: path.resolve(parsed.PIPER_DATA_DIR),
  outputDir: path.resolve(parsed.OUTPUT_DIR),
});
