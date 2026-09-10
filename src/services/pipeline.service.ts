import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Blueprint, ResearchResult, ResolvedScene } from '../domain/blueprint.js';
import { ensureDir, slugify } from '../utils/fs.js';
import type { GeminiService } from './gemini.service.js';
import type { PexelsService } from './pexels.service.js';
import type { PiperTtsService } from './tts.service.js';
import type { FfmpegService } from './ffmpeg.service.js';

export interface PipelineOptions {
  readonly outputRoot: string;
  readonly niche: string;
  readonly language: string;
  readonly requestedTopic: string;
  readonly angle?: string;
  readonly sequenceNumber?: number;
}

export interface PipelineResult {
  readonly outputPath: string;
  readonly runDirectory: string;
  readonly blueprint: Blueprint;
  readonly durationSeconds: number;
}

export class ShortsPipelineService {
  public constructor(
    private readonly gemini: GeminiService,
    private readonly pexels: PexelsService,
    private readonly tts: PiperTtsService,
    private readonly ffmpeg: FfmpegService,
  ) {}

  public async prepare(): Promise<void> {
    await Promise.all([this.tts.ensureReady(), this.ffmpeg.ensureReady()]);
  }

  public async run(options: PipelineOptions): Promise<PipelineResult> {
    await ensureDir(options.outputRoot);

    console.log('[1/6] Researching topic...');
    const research = await this.gemini.researchTopic(
      options.niche,
      options.language,
      options.requestedTopic,
      options.angle,
    );

    console.log('[2/6] Creating structured Shorts blueprint...');
    const blueprint = await this.gemini.createBlueprint(research, options.niche, options.language);
    const prefix = options.sequenceNumber ? `${String(options.sequenceNumber).padStart(2, '0')}-` : '';
    const runDirectory = path.join(options.outputRoot, `${prefix}${slugify(blueprint.topic)}`);
    const rawDir = path.join(runDirectory, 'raw');
    const audioDir = path.join(runDirectory, 'audio');
    const renderedDir = path.join(runDirectory, 'rendered-scenes');
    await Promise.all([ensureDir(rawDir), ensureDir(audioDir), ensureDir(renderedDir)]);

    await this.#writeMetadata(runDirectory, research, blueprint);

    console.log(`[3/6] Resolving ${blueprint.scenes.length} scenes (TTS + Pexels)...`);
    const resolvedScenes: ResolvedScene[] = [];
    for (const [index, scene] of blueprint.scenes.entries()) {
      const sceneNumber = index + 1;
      console.log(`  scene ${sceneNumber}/${blueprint.scenes.length}`);
      const audioPath = path.join(audioDir, `scene-${String(sceneNumber).padStart(2, '0')}.wav`);
      await this.tts.synthesize(scene.narration, audioPath);
      const durationSeconds = await this.ffmpeg.getDurationSeconds(audioPath);
      const asset = await this.pexels.findAndDownload(scene.searchQueries, rawDir, sceneNumber, durationSeconds);

      resolvedScenes.push({
        index: sceneNumber,
        narration: scene.narration,
        audioPath,
        videoPath: asset.filePath,
        durationSeconds,
        pexelsUrl: asset.pexelsUrl,
        creatorName: asset.creatorName,
        creatorUrl: asset.creatorUrl,
      });
    }

    console.log('[4/6] Rendering scenes...');
    const renderedSceneFiles: string[] = [];
    for (const scene of resolvedScenes) {
      const outputPath = path.join(renderedDir, `scene-${String(scene.index).padStart(2, '0')}.mp4`);
      await this.ffmpeg.renderScene(scene.videoPath, scene.audioPath, outputPath, scene.durationSeconds);
      renderedSceneFiles.push(outputPath);
    }

    console.log('[5/6] Concatenating and burning captions...');
    const concatenatedPath = path.join(runDirectory, 'without-captions.mp4');
    await this.ffmpeg.concatenate(renderedSceneFiles, concatenatedPath);
    const finalPath = path.join(runDirectory, 'short.mp4');
    await this.ffmpeg.burnSubtitles(concatenatedPath, resolvedScenes, finalPath);

    console.log('[6/6] Writing credits and final manifest...');
    await this.#writeCredits(runDirectory, resolvedScenes, research);
    const { durationSeconds } = await this.ffmpeg.validateShort(finalPath);
    await writeFile(
      path.join(runDirectory, 'manifest.json'),
      JSON.stringify({
        title: blueprint.title,
        topic: blueprint.topic,
        description: blueprint.description,
        durationSeconds: Number(durationSeconds.toFixed(3)),
        output: finalPath,
        createdAt: new Date().toISOString(),
      }, null, 2),
      'utf8',
    );

    return { outputPath: finalPath, runDirectory, blueprint, durationSeconds };
  }

  async #writeMetadata(runDirectory: string, research: ResearchResult, blueprint: Blueprint): Promise<void> {
    await Promise.all([
      writeFile(path.join(runDirectory, 'research.json'), JSON.stringify(research, null, 2), 'utf8'),
      writeFile(path.join(runDirectory, 'blueprint.json'), JSON.stringify(blueprint, null, 2), 'utf8'),
    ]);
  }

  async #writeCredits(runDirectory: string, scenes: readonly ResolvedScene[], research: ResearchResult): Promise<void> {
    const pexelsCredits = scenes.map(
      (scene) => `Scene ${scene.index}: ${scene.creatorName}\nCreator: ${scene.creatorUrl}\nVideo: ${scene.pexelsUrl}`,
    );
    const sources = research.sources.map((source) => `${source.title}\n${source.url}`);
    const content = [
      'Photos/videos provided by Pexels: https://www.pexels.com',
      '',
      'PEXELS ASSETS',
      ...pexelsCredits.flatMap((credit) => [credit, '']),
      'RESEARCH SOURCES',
      ...(sources.length > 0 ? sources.flatMap((source) => [source, '']) : ['No external research URLs were attached in this build.']),
    ].join('\n');
    await writeFile(path.join(runDirectory, 'credits.txt'), content, 'utf8');
  }
}
