---
description: Summarize a YouTube video from its URL. Extracts transcript via yt-dlp or youtube-transcript-api, falls back to web search.
---

# YouTube Summarize

Summarize the YouTube video at the provided URL.

1. Parse the video ID from the URL argument or the most recent YouTube URL in the conversation.

2. Attempt transcript extraction:
   ```bash
   yt-dlp --write-auto-sub --sub-lang en --skip-download --output "/tmp/%(id)s" "$URL" 2>/dev/null
   ```
   If that fails, try:
   ```bash
   python3 -c "from youtube_transcript_api import YouTubeTranscriptApi; api = YouTubeTranscriptApi(); [print(e.text) for e in api.fetch('$VIDEO_ID')]" 2>/dev/null
   ```

3. If transcript is available, summarize it with:
   - **Title & Channel**
   - **Core Topic** (one sentence)
   - **Key Points** (5–8 bullets)
   - **Notable Quotes** (up to 3, verbatim from transcript)
   - **Takeaway** (one sentence)

4. If no transcript, use WebSearch to find indexed information about the video, summarize what is found, and note the limitation.

5. Tell the user if `yt-dlp` or `youtube-transcript-api` needs to be installed for richer results.
