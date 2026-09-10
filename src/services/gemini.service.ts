import { GoogleGenAI, Type } from '@google/genai';
import {
  blueprintSchema,
  topicPlanSchema,
  type Blueprint,
  type ResearchResult,
  type TopicPlan,
} from '../domain/blueprint.js';

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2_000;

interface ErrorLike {
  readonly status: number | string | undefined;
  readonly code: number | string | undefined;
  readonly message: string | undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toErrorLike(error: unknown): ErrorLike {
  if (typeof error !== 'object' || error === null) {
    return { status: undefined, code: undefined, message: undefined };
  }

  const record = error as Record<string, unknown>;

  return {
    status:
      typeof record.status === 'number' || typeof record.status === 'string'
        ? record.status
        : undefined,
    code:
      typeof record.code === 'number' || typeof record.code === 'string'
        ? record.code
        : undefined,
    message: typeof record.message === 'string' ? record.message : undefined,
  };
}

function parseNumericCode(value: number | string | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isRetryableGeminiError(error: unknown): boolean {
  const parsed = toErrorLike(error);
  const status = parseNumericCode(parsed.status);
  const code = parseNumericCode(parsed.code);
  const retryableCodes = new Set([429, 500, 502, 503, 504]);

  if ((status !== undefined && retryableCodes.has(status)) || (code !== undefined && retryableCodes.has(code))) {
    return true;
  }

  const message = parsed.message?.toLowerCase() ?? '';

  return (
    message.includes('high demand') ||
    message.includes('unavailable') ||
    message.includes('resource_exhausted') ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('temporarily unavailable') ||
    /"code"\s*:\s*(429|500|502|503|504)/u.test(message)
  );
}

async function withRetry<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isRetryableGeminiError(error) || attempt === MAX_RETRIES) {
        break;
      }

      const exponentialDelay = BASE_DELAY_MS * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * 1_000);
      const delayMs = exponentialDelay + jitter;

      console.warn(
        `[Gemini] ${operationName} temporarily failed. ` +
          `Attempt ${attempt}/${MAX_RETRIES}; retrying in ${Math.ceil(delayMs / 1_000)}s...`,
      );

      await sleep(delayMs);
    }
  }

  const parsed = toErrorLike(lastError);
  throw new Error(
    `[Gemini] ${operationName} failed after ${MAX_RETRIES} attempts. ${parsed.message ?? 'Unknown Gemini API error'}`,
    { cause: lastError },
  );
}

export class GeminiService {
  readonly #client: GoogleGenAI;
  readonly #model: string;

  public constructor(apiKey: string, model: string) {
    this.#client = new GoogleGenAI({ apiKey });
    this.#model = model;
  }

  public async planTopics(niche: string, language: string, count: number): Promise<readonly TopicPlan[]> {
    const response = await withRetry('Plan topics', async () => {
      return this.#client.models.generateContent({
        model: this.#model,
        contents: [
          `Plan exactly ${count} DIFFERENT YouTube Shorts topics for this niche: ${niche}.`,
          `The videos will be narrated in ${language}.`,
          '',
          'Topic selection rules:',
          '- Every topic must have a strong curiosity gap without deceptive clickbait.',
          '- Prefer evergreen stories with a concrete event, invention, software incident, product, person or historical detail.',
          '- Topics must be visually searchable on stock-video sites.',
          '- Do not choose two topics about the same event or the same central fact.',
          '- Avoid politics, medical advice, graphic tragedies, rumors and active controversies.',
          '- Prefer topics explainable accurately in 25-45 seconds.',
          '- angle must state the one surprising payoff the video should build toward.',
        ].join('\n'),
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topics: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    topic: { type: Type.STRING },
                    angle: { type: Type.STRING },
                  },
                  required: ['topic', 'angle'],
                },
              },
            },
            required: ['topics'],
          },
        },
      });
    });

    const text = response.text?.trim();
    if (!text) throw new Error('Gemini topic planner returned an empty response');

    const parsed = topicPlanSchema.parse(JSON.parse(text));
    if (parsed.topics.length !== count) {
      throw new Error(`Gemini topic planner returned ${parsed.topics.length} topics; expected ${count}`);
    }

    return parsed.topics;
  }

  public async researchTopic(
    niche: string,
    language: string,
    requestedTopic: string,
    angle?: string,
  ): Promise<ResearchResult> {
    const response = await withRetry('Research topic', async () => {
      return this.#client.models.generateContent({
        model: this.#model,
        contents: [
          `Research this exact topic for a short-form video: ${requestedTopic}`,
          ...(angle ? [`Editorial angle: ${angle}`] : []),
          `Niche: ${niche}`,
          `The final YouTube Short will be narrated in ${language}.`,
          '',
          'Produce concise research notes for a 25-45 second vertical video.',
          '',
          'Rules:',
          '- Prefer well-established facts and the least controversial version of events.',
          '- Use concrete dates, people, companies, products or events only when confident.',
          '- Do not invent statistics, quotes, dates or names.',
          '- If a detail is uncertain, disputed or difficult to verify, exclude it.',
          '- Avoid politics, medical advice, graphic incidents and ongoing tragedies.',
          '- Keep one central story with one clear payoff.',
          '- Separate essential facts from optional context.',
          '',
          'Return research notes only. Do not write the final script yet.',
        ].join('\n'),
      });
    });

    const text = response.text?.trim();
    if (!text) throw new Error('Gemini research returned an empty response');

    return { text, sources: [] };
  }

  public async createBlueprint(research: ResearchResult, niche: string, language: string): Promise<Blueprint> {
    const response = await withRetry('Create blueprint', async () => {
      return this.#client.models.generateContent({
        model: this.#model,
        contents: [
          `Create a polished YouTube Shorts blueprint in ${language}.`,
          `Niche: ${niche}`,
          '',
          'Target duration: 25-45 seconds.',
          'Use 5-8 scenes and 55-95 narration words total.',
          '',
          'Retention rules:',
          '- Scene 1 must give the hook immediately, with no greeting or setup phrase.',
          '- Put a new fact, reversal or concrete detail every 3-6 seconds.',
          '- Build toward one payoff. Do not reveal every detail in the first sentence.',
          '- End on the payoff itself, not a generic call to action.',
          '- No like/follow/subscribe requests.',
          '- No filler such as "peki biliyor muydunuz" or repeated summaries.',
          '',
          'Narration rules:',
          '- Natural spoken Turkish, compact sentences, easy pronunciation.',
          '- Avoid long parenthetical clauses and tongue-twisting wording.',
          '- Do not add facts absent from the research notes.',
          '- Avoid exaggerated certainty and fake quotes.',
          '',
          'Visual rules:',
          '- Every scene must contain 2-4 Pexels search queries in ENGLISH.',
          '- Queries must describe what should literally be visible on screen.',
          '- Prefer concrete nouns/actions/locations over abstract concepts.',
          '- Vary the search queries so consecutive scenes do not look identical.',
          '- Include era/context words when useful, e.g. "1990s computer lab".',
          '',
          'Title rules:',
          '- Short, specific and curiosity-driven.',
          '- No misleading superlatives or unsupported claims.',
          '',
          'RESEARCH NOTES:',
          research.text,
        ].join('\n'),
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              hook: { type: Type.STRING },
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    narration: { type: Type.STRING },
                    searchQueries: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ['narration', 'searchQueries'],
                },
              },
            },
            required: ['topic', 'title', 'description', 'hook', 'scenes'],
          },
        },
      });
    });

    const text = response.text?.trim();
    if (!text) throw new Error('Gemini blueprint returned an empty response');

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new Error(`Gemini blueprint returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }

    return blueprintSchema.parse(parsed);
  }
}
