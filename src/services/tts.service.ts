import { access } from 'node:fs/promises';
import path from 'node:path';
import { runProcess } from '../lib/process.js';
import { ensureDir } from '../utils/fs.js';

export class PiperTtsService {
  readonly #voice: string;
  readonly #dataDir: string;

  public constructor(voice: string, dataDir: string) {
    this.#voice = voice;
    this.#dataDir = dataDir;
  }

  public async ensureReady(): Promise<void> {
    await runProcess('python3', ['-c', 'import piper']);
    await ensureDir(this.#dataDir);

    const modelPath = path.join(this.#dataDir, `${this.#voice}.onnx`);
    try {
      await access(modelPath);
    } catch {
      await runProcess('python3', [
        '-m',
        'piper.download_voices',
        '--data-dir',
        this.#dataDir,
        this.#voice,
      ]);
    }
  }

  public async synthesize(text: string, outputPath: string): Promise<void> {
    await ensureDir(path.dirname(outputPath));
    await runProcess('python3', [
      '-m',
      'piper',
      '-m',
      this.#voice,
      '--data-dir',
      this.#dataDir,
      '-f',
      outputPath,
      '--',
      text,
    ]);
  }
}
