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

**Option A — yt-dlp** (most reliable):
```bash
yt-dlp --write-auto-sub --sub-lang en --skip-download --output "/tmp/%(id)s" "VIDEO_URL"
cat /tmp/VIDEO_ID.en.vtt 2>/dev/null || cat /tmp/VIDEO_ID.en.srt 2>/dev/null
```

**Option B — youtube_transcript_api** (Python, v1.x+):
```bash
python3 -c "
from youtube_transcript_api import YouTubeTranscriptApi
api = YouTubeTranscriptApi()
transcript = api.fetch('VIDEO_ID')
for entry in transcript:
    print(entry.text)
"
```

**Option C — Invidious proxy API** (use when direct YouTube access is blocked):

Try public Invidious instances in order until one responds:
```bash
for HOST in yewtu.be invidious.nerdvpn.de inv.nadeko.net; do
  python3 -c "
import urllib.request, json, sys
url = 'https://$HOST/api/v1/videos/VIDEO_ID'
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as r:
        d = json.loads(r.read())
        print('TITLE:', d.get('title'))
        print('AUTHOR:', d.get('author'))
        print('DESC:', d.get('description','')[:500])
        sys.exit(0)
except: pass
" && break
done
```

To get captions via Invidious:
```bash
# List available caption tracks
curl -s "https://yewtu.be/api/v1/captions/VIDEO_ID" | python3 -m json.tool

# Fetch a specific caption (label from above list, e.g. 'English')
curl -s "https://yewtu.be/api/v1/captions/VIDEO_ID?label=English"
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

Priority order when direct YouTube access is blocked:
1. Try Invidious proxy API (Option C above) — works in restricted networks
2. Use `WebSearch` with the video ID to find indexed articles, discussions, or captions
3. Tell the user what was found and recommend `yt-dlp` for richer results

If the entire environment blocks outbound connections to YouTube and its proxies, inform the user — no code change can bypass a network-level restriction.

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
