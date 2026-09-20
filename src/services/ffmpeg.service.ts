import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runProcess } from '../lib/process.js';
import type { ResolvedScene } from '../domain/blueprint.js';

function secondsToAssTime(seconds: number): string {
  const centiseconds = Math.max(0, Math.round(seconds * 100));
  const hours = Math.floor(centiseconds / 360000);
  const minutes = Math.floor((centiseconds % 360000) / 6000);
  const secs = Math.floor((centiseconds % 6000) / 100);
  const cs = centiseconds % 100;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function escapeAssText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/{/g, '\\{').replace(/}/g, '\\}').replace(/\n/g, ' ');
}

function captionChunks(text: string): readonly string[] {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  const chunks: string[] = [];
  let current: string[] = [];

  for (const word of words) {
    current.push(word);
    const endsPhrase = /[,.!?;:]$/u.test(word);
    if (current.length >= 3 || (current.length >= 2 && endsPhrase)) {
      chunks.push(current.join(' '));
      current = [];
    }
  }

  if (current.length > 0) {
    if (current.length === 1 && chunks.length > 0) {
      chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${current[0]}`;
    } else {
      chunks.push(current.join(' '));
    }
  }

  return chunks;
}

function chunkWeights(chunks: readonly string[]): readonly number[] {
  return chunks.map((chunk) => Math.max(2, chunk.replace(/\s+/gu, '').length));
}

export class FfmpegService {
  public async ensureReady(): Promise<void> {
    await Promise.all([
      runProcess('ffmpeg', ['-version']),
      runProcess('ffprobe', ['-version']),
    ]);
  }

  public async getDurationSeconds(mediaPath: string): Promise<number> {
    const output = await runProcess('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      mediaPath,
    ]);
    const duration = Number.parseFloat(output);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error(`Invalid media duration for ${mediaPath}: ${output}`);
    }
    return duration;
  }

  public async renderScene(
    videoPath: string,
    audioPath: string,
    outputPath: string,
    durationSeconds: number,
  ): Promise<void> {
    const videoFilter = [
      'scale=1120:1992:force_original_aspect_ratio=increase',
      'crop=1080:1920',
      'fps=30',
      'eq=contrast=1.025:saturation=1.04:brightness=0.005',
      'unsharp=5:5:0.30:5:5:0.0',
      'format=yuv420p',
    ].join(',');

    await runProcess('ffmpeg', [
      '-y',
      '-stream_loop', '-1',
      '-i', videoPath,
      '-i', audioPath,
      '-t', durationSeconds.toFixed(3),
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-vf', videoFilter,
      '-af', 'highpass=f=70,lowpass=f=15000,loudnorm=I=-15:LRA=7:TP=-1.5,aresample=48000',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '19',
      '-profile:v', 'high',
      '-level', '4.1',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-ar', '48000',
      '-movflags', '+faststart',
      outputPath,
    ]);
  }

  public async concatenate(sceneFiles: readonly string[], outputPath: string): Promise<void> {
    const listPath = path.join(path.dirname(outputPath), 'concat.txt');
    const listContent = sceneFiles
      .map((file) => `file '${file.replace(/'/g, "'\\''")}'`)
      .join('\n');
    await writeFile(listPath, `${listContent}\n`, 'utf8');

    await runProcess('ffmpeg', [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listPath,
      '-c', 'copy',
      '-movflags', '+faststart',
      outputPath,
    ]);
  }

  public async validateShort(mediaPath: string): Promise<{ readonly durationSeconds: number }> {
    const output = await runProcess('ffprobe', [
      '-v', 'error',
      '-print_format', 'json',
      '-show_streams',
      '-show_format',
      mediaPath,
    ]);

    const parsed = JSON.parse(output) as {
      readonly streams?: readonly {
        readonly codec_type?: string;
        readonly codec_name?: string;
        readonly width?: number;
        readonly height?: number;
        readonly avg_frame_rate?: string;
      }[];
      readonly format?: { readonly duration?: string };
    };

    const video = parsed.streams?.find((stream) => stream.codec_type === 'video');
    const audio = parsed.streams?.find((stream) => stream.codec_type === 'audio');
    const durationSeconds = Number.parseFloat(parsed.format?.duration ?? 'NaN');

    if (!video || video.width !== 1080 || video.height !== 1920) {
      throw new Error(`QC failed: expected 1080x1920 video, received ${String(video?.width)}x${String(video?.height)}`);
    }
    if (video.codec_name !== 'h264') {
      throw new Error(`QC failed: expected H.264 video, received ${String(video.codec_name)}`);
    }
    if (!audio) throw new Error('QC failed: rendered file has no audio stream');
    if (!Number.isFinite(durationSeconds) || durationSeconds < 35 || durationSeconds > 60) {
      throw new Error(`QC failed: duration ${String(durationSeconds)} seconds is outside 15-55 second target`);
    }

    return { durationSeconds };
  }

  public async burnSubtitles(
    inputPath: string,
    scenes: readonly ResolvedScene[],
    outputPath: string,
  ): Promise<void> {
    const workingDir = path.dirname(outputPath);
    const assPath = path.join(workingDir, 'subtitles.ass');
    await writeFile(assPath, this.#buildAss(scenes), 'utf8');

    await runProcess('ffmpeg', [
      '-y',
      '-i', inputPath,
      '-vf', 'ass=subtitles.ass',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '18',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'copy',
      '-movflags', '+faststart',
      outputPath,
    ], { cwd: workingDir });
  }

  #buildAss(scenes: readonly ResolvedScene[]): string {
    const lines = [
      '[Script Info]',
      'ScriptType: v4.00+',
      'PlayResX: 1080',
      'PlayResY: 1920',
      'WrapStyle: 2',
      'ScaledBorderAndShadow: yes',
      '',
      '[V4+ Styles]',
      'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding',
      'Style: Default,DejaVu Sans,80,&H00FFFFFF,&H000000FF,&H00101010,&H70000000,-1,0,0,0,100,100,0,0,1,6,2,2,90,90,270,1',
      'Style: Hook,DejaVu Sans,92,&H00FFFFFF,&H000000FF,&H00000000,&H78000000,-1,0,0,0,100,100,0,0,1,7,2,2,80,80,300,1',
      '',
      '[Events]',
      'Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text',
    ];

    let sceneOffset = 0;
    for (const scene of scenes) {
      const chunks = captionChunks(scene.narration);
      const weights = chunkWeights(chunks);
      const totalWeight = Math.max(1, weights.reduce((sum, value) => sum + value, 0));
      let localOffset = 0;

      for (let index = 0; index < chunks.length; index += 1) {
        const chunk = chunks[index];
        const weight = weights[index];
        if (!chunk || weight === undefined) continue;

        const chunkDuration = scene.durationSeconds * (weight / totalWeight);
        const start = sceneOffset + localOffset;
        const end = Math.min(sceneOffset + scene.durationSeconds, start + chunkDuration);
        const style = scene.index === 1 ? 'Hook' : 'Default';
        const animation = scene.index === 1
          ? '{\\fad(45,45)\\fscx108\\fscy108\\t(0,130,\\fscx100\\fscy100)}'
          : '{\\fad(45,45)\\fscx104\\fscy104\\t(0,110,\\fscx100\\fscy100)}';

        lines.push(
          `Dialogue: 0,${secondsToAssTime(start)},${secondsToAssTime(end)},${style},,0,0,0,,${animation}${escapeAssText(chunk.toLocaleUpperCase('tr-TR'))}`,
        );
        localOffset += chunkDuration;
      }

      sceneOffset += scene.durationSeconds;
    }

    return `${lines.join('\n')}\n`;
  }
}
