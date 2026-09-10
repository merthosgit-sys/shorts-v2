import { copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import type { TopicPlan } from './domain/blueprint.js';
import { ensureDir, slugify } from './utils/fs.js';
import { GeminiService } from './services/gemini.service.js';
import { PexelsService } from './services/pexels.service.js';
import { PiperTtsService } from './services/tts.service.js';
import { FfmpegService } from './services/ffmpeg.service.js';
import { ShortsPipelineService, type PipelineResult } from './services/pipeline.service.js';

interface FailedVideo {
  readonly topic: string;
  readonly error: string;
}

async function main(): Promise<void> {
  const gemini = new GeminiService(config.geminiApiKey, config.geminiModel);
  const pipeline = new ShortsPipelineService(
    gemini,
    new PexelsService(config.pexelsApiKey),
    new PiperTtsService(config.piperVoice, config.piperDataDir),
    new FfmpegService(),
  );

  console.log('Preparing renderer and TTS...');
  await pipeline.prepare();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const batchDirectory = path.join(config.outputDir, `batch-${timestamp}`);
  const finalVideosDirectory = path.join(config.outputDir, 'final-videos');
  await Promise.all([ensureDir(batchDirectory), ensureDir(finalVideosDirectory)]);

  let topics: readonly TopicPlan[];
  if (config.topics.length > 0) {
    topics = config.topics.map((topic) => ({
      topic,
      angle: `Explain the most surprising, concrete fact about ${topic}.`,
    }));
    console.log(`Using ${topics.length} manually selected topic(s).`);
  } else {
    console.log(`Planning ${config.batchCount} distinct topic(s)...`);
    topics = await gemini.planTopics(config.niche, config.language, config.batchCount);
  }

  await writeFile(path.join(batchDirectory, 'topic-plan.json'), JSON.stringify({ topics }, null, 2), 'utf8');

  const completed: PipelineResult[] = [];
  const failed: FailedVideo[] = [];

  for (const [index, topic] of topics.entries()) {
    console.log(`\n========== VIDEO ${index + 1}/${topics.length} ==========`);
    console.log(`Topic: ${topic.topic}`);

    try {
      const result = await pipeline.run({
        outputRoot: batchDirectory,
        niche: config.niche,
        language: config.language,
        requestedTopic: topic.topic,
        angle: topic.angle,
        sequenceNumber: index + 1,
      });

      completed.push(result);

      const sequence = String(index + 1).padStart(2, '0');
      const cleanName = slugify(result.blueprint.title || result.blueprint.topic) || `short-${sequence}`;
      const deliveryPath = path.join(finalVideosDirectory, `${sequence}-${cleanName}.mp4`);
      await copyFile(result.outputPath, deliveryPath);

      console.log(`Completed: ${result.blueprint.title}`);
      console.log(`Final video prepared: ${deliveryPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      failed.push({ topic: topic.topic, error: message });
      console.error(`Video failed, continuing batch: ${message}`);
    }
  }

  await writeFile(
    path.join(batchDirectory, 'batch-manifest.json'),
    JSON.stringify({
      createdAt: new Date().toISOString(),
      requestedCount: topics.length,
      completedCount: completed.length,
      failedCount: failed.length,
      completed: completed.map((item) => ({
        topic: item.blueprint.topic,
        title: item.blueprint.title,
        durationSeconds: Number(item.durationSeconds.toFixed(3)),
        outputPath: item.outputPath,
      })),
      failed,
    }, null, 2),
    'utf8',
  );

  console.log(`\nBatch finished: ${completed.length}/${topics.length} video(s) generated.`);
  console.log(`Download-ready videos: ${finalVideosDirectory}`);

  if (completed.length === 0) {
    throw new Error('All videos in the batch failed. See batch-manifest.json for details.');
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
