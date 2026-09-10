import path from 'node:path';
import { downloadToFile } from '../utils/fs.js';

interface PexelsVideoFile {
  readonly id: number;
  readonly quality: string;
  readonly file_type: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly link: string;
}

interface PexelsUser {
  readonly name: string;
  readonly url: string;
}

interface PexelsVideo {
  readonly id: number;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly duration: number;
  readonly user: PexelsUser;
  readonly video_files: readonly PexelsVideoFile[];
}

interface PexelsSearchResponse {
  readonly videos: readonly PexelsVideo[];
}

export interface DownloadedPexelsAsset {
  readonly videoId: number;
  readonly filePath: string;
  readonly pexelsUrl: string;
  readonly creatorName: string;
  readonly creatorUrl: string;
}

export class PexelsService {
  readonly #apiKey: string;
  readonly #usedVideoIds = new Set<number>();

  public constructor(apiKey: string) {
    this.#apiKey = apiKey;
  }

  public async findAndDownload(
    queries: readonly string[],
    destinationDirectory: string,
    sceneIndex: number,
    requiredDurationSeconds: number,
  ): Promise<DownloadedPexelsAsset> {
    const allCandidates: PexelsVideo[] = [];

    for (const query of queries) {
      const results = await this.#search(query);
      for (const result of results) {
        if (!this.#usedVideoIds.has(result.id) && !allCandidates.some((item) => item.id === result.id)) {
          allCandidates.push(result);
        }
      }
    }

    const ranked = this.#rankCandidates(allCandidates, requiredDurationSeconds);

    for (const candidate of ranked.slice(0, 12)) {
      const file = this.#pickFile(candidate.video_files);
      if (!file) continue;

      try {
        const filePath = path.join(
          destinationDirectory,
          `scene-${String(sceneIndex).padStart(2, '0')}-pexels-${candidate.id}.mp4`,
        );
        await downloadToFile(file.link, filePath);
        this.#usedVideoIds.add(candidate.id);

        return {
          videoId: candidate.id,
          filePath,
          pexelsUrl: candidate.url,
          creatorName: candidate.user.name,
          creatorUrl: candidate.user.url,
        };
      } catch (error) {
        console.warn(`    Pexels download failed for video ${candidate.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    throw new Error(`No usable Pexels video found for queries: ${queries.join(', ')}`);
  }

  async #search(query: string): Promise<readonly PexelsVideo[]> {
    const portrait = await this.#request(query, true);
    if (portrait.length >= 4) return portrait;

    const anyOrientation = await this.#request(query, false);
    const unique = new Map<number, PexelsVideo>();
    for (const item of [...portrait, ...anyOrientation]) unique.set(item.id, item);
    return [...unique.values()];
  }

  async #request(query: string, portraitOnly: boolean): Promise<readonly PexelsVideo[]> {
    const url = new URL('https://api.pexels.com/v1/videos/search');
    url.searchParams.set('query', query);
    if (portraitOnly) url.searchParams.set('orientation', 'portrait');
    url.searchParams.set('size', 'medium');
    url.searchParams.set('per_page', '30');

    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: { Authorization: this.#apiKey },
          signal: AbortSignal.timeout(20_000),
        });

        if (response.ok) {
          const parsed = (await response.json()) as PexelsSearchResponse;
          return parsed.videos;
        }

        const body = await response.text();
        if (response.status !== 429 && response.status < 500) {
          throw new Error(`Pexels API error ${response.status}: ${body.slice(0, 300)}`);
        }
        lastError = new Error(`Pexels transient error ${response.status}: ${body.slice(0, 300)}`);
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }

    throw lastError ?? new Error('Pexels request failed');
  }

  #rankCandidates(videos: readonly PexelsVideo[], requiredDurationSeconds: number): readonly PexelsVideo[] {
    return [...videos]
      .filter((video) => !this.#usedVideoIds.has(video.id))
      .filter((video) => video.duration >= 2.5)
      .sort((a, b) => this.#scoreVideo(b, requiredDurationSeconds) - this.#scoreVideo(a, requiredDurationSeconds));
  }

  #scoreVideo(video: PexelsVideo, requiredDurationSeconds: number): number {
    const portraitScore = video.height > video.width ? 1000 : 0;
    const durationScore = video.duration >= requiredDurationSeconds
      ? 300 - Math.min(200, Math.abs(video.duration - requiredDurationSeconds) * 10)
      : Math.max(0, 100 - (requiredDurationSeconds - video.duration) * 30);
    const resolutionScore = Math.min(250, (video.width * video.height) / 10_000);
    return portraitScore + durationScore + resolutionScore;
  }

  #pickFile(files: readonly PexelsVideoFile[]): PexelsVideoFile | undefined {
    const mp4s = files.filter((file) => file.file_type === 'video/mp4' && file.width && file.height);
    const reasonable = mp4s.filter((file) => (file.width ?? 0) <= 2160 && (file.height ?? 0) <= 3840);
    const pool = reasonable.length > 0 ? reasonable : mp4s;

    return [...pool].sort((a, b) => {
      const aPortrait = (a.height ?? 0) > (a.width ?? 0) ? 1 : 0;
      const bPortrait = (b.height ?? 0) > (b.width ?? 0) ? 1 : 0;
      const aPixels = (a.width ?? 0) * (a.height ?? 0);
      const bPixels = (b.width ?? 0) * (b.height ?? 0);
      return bPortrait - aPortrait || bPixels - aPixels;
    })[0];
  }
}
