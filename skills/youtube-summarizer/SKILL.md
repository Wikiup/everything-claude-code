---
name: youtube-summarizer
description: Summarize YouTube videos by extracting transcripts via yt-dlp or falling back to web search. Use when the user pastes a YouTube URL and wants a summary of the video content.
origin: ECC
---

# YouTube Video Summarizer

Summarize any YouTube video the user shares.

## When to Activate

- user pastes a YouTube URL (youtu.be/..., youtube.com/watch?v=...)
- user asks to summarize a video
- user says "summarize all youtube videos I send"

## How It Works

### Step 1: Extract video ID

Parse the video ID from the URL:
- `youtube.com/watch?v=VIDEO_ID`
- `youtu.be/VIDEO_ID`
- `youtube.com/shorts/VIDEO_ID`

### Step 2: Get transcript (preferred)

Try `yt-dlp` if available:

```bash
yt-dlp --write-auto-sub --sub-lang en --skip-download --output "/tmp/%(id)s" "VIDEO_URL"
cat /tmp/VIDEO_ID.en.vtt 2>/dev/null || cat /tmp/VIDEO_ID.en.srt 2>/dev/null
```

Or with `youtube_transcript_api` (Python, v1.x+):

```bash
python3 -c "
from youtube_transcript_api import YouTubeTranscriptApi
api = YouTubeTranscriptApi()
transcript = api.fetch('VIDEO_ID')
for entry in transcript:
    print(entry.text)
"
```

### Step 3: Fetch video metadata

Use WebFetch or WebSearch to find the video title, channel, and description when transcript extraction fails.

```
WebSearch: youtube "VIDEO_ID" title description
```

### Step 4: Summarize

Given the transcript or available metadata, produce a summary with:
- **Title & Channel** — name and who made it
- **Duration & Date** — if available
- **Core Topic** — one sentence
- **Key Points** — 5–8 bullet points covering the main ideas
- **Notable Quotes** — 1–3 direct quotes if transcript available
- **Takeaway** — one sentence on what the viewer gains

## Fallback When Transcript Is Unavailable

If neither `yt-dlp` nor `youtube_transcript_api` is installed and WebFetch returns 403:
1. Use `WebSearch` with the video ID and known fragments to find articles, discussions, or auto-generated captions indexed elsewhere.
2. Tell the user what was found and offer to install `yt-dlp` for better results.

## Installing yt-dlp (one-time setup)

```bash
# macOS / Linux
pip install yt-dlp youtube-transcript-api

# or with pipx
pipx install yt-dlp
```

## Examples

### User shares a URL

```
User: https://youtu.be/dQw4w9WgXcQ
```

Run Step 1–4. Output structured summary.

### User says "summarize all videos I send"

Acknowledge and explain that every YouTube URL they share will be automatically summarized using this workflow.
