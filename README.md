# Shorts Factory V2

Cloud-first YouTube Shorts batch generator. One GitHub Actions run can generate 1-5 separate vertical videos using Gemini for topic planning/script structure, Pexels for stock footage, Piper for Turkish narration and FFmpeg for the final 1080x1920 render.

## V2 improvements

- Generate 1-5 Shorts in one workflow run
- Automatic batch topic planning with duplicate-topic avoidance inside the batch
- Manual topic batch input using `|` separators
- Editable niche directly from GitHub Actions UI
- Batch continues if one video fails; successful videos are still preserved
- Pexels videos are ranked by portrait orientation, resolution and required scene duration
- Pexels clips are not reused within the same batch
- Tighter 25-45 second script target and stronger retention prompt
- Cleaner, larger hook captions and phrase-aware caption chunking
- Light video contrast/saturation/sharpening and voice filtering/loudness normalization
- Final MP4 QC and per-video manifests
- One `batch-manifest.json` summarizing success/failure status

## GitHub Actions

Repository secrets required:

- `GEMINI_API_KEY`
- `PEXELS_API_KEY`

Open **Actions -> Generate Shorts Batch -> Run workflow**.

Inputs:

- `count`: 1-5 automatically planned videos, default 3
- `niche`: e.g. `technology and internet history`
- `topics`: optional exact topics separated by `|`; when set, these topics are used and `count` is ignored

Example manual batch:

```text
Why was the first webcam invented?|Why was the QR code invented?|The story of the first computer mouse
```

Output:

```text
output/
└── batch-<timestamp>/
    ├── topic-plan.json
    ├── batch-manifest.json
    ├── 01-<topic>/short.mp4
    ├── 02-<topic>/short.mp4
    └── 03-<topic>/short.mp4
```

The scheduled workflow generates 3 automatically selected videos daily at 15:00 Europe/Istanbul.


## Clean GitHub artifact

GitHub Actions uploads only final MP4 files from `output/final-videos/`. Raw Pexels downloads, WAV narration, rendered scene fragments, captions, manifests and research files remain on the temporary runner and are not included in the downloadable artifact.
