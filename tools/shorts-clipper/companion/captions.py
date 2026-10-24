"""Automatic captions for clips.

Words come from the video's own YouTube captions (uploaded or auto-generated),
or, if it has none and faster-whisper is installed, from transcribing the clip
locally. They are rendered Shorts-style: a few words at a time, with the word
being spoken highlighted.
"""

import html
import os
import re
import subprocess
import tempfile
from pathlib import Path

WORDS_PER_LINE = 3
MAX_LINE_CHARS = 22
MAX_PAUSE = 0.6  # a longer silence starts a new caption
HOLD = 0.4  # keep the last caption up briefly after speech stops

# Colours are &HBBGGRR in ASS.
ASS_HEADER = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Arial,84,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,7,2,2,60,60,560,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
HIGHLIGHT = r"{\c&H00FFFF&}"  # yellow
NORMAL = r"{\c&HFFFFFF&}"

_TS = r"(?:\d+:)?\d{2}:\d{2}\.\d{3}"


def _seconds(ts):
    total = 0.0
    for part in ts.split(":"):
        total = total * 60 + float(part)
    return total


def _clean(text):
    text = html.unescape(re.sub(r"<[^>]+>", "", text))
    text = re.sub(r"\[[^\]]*\]|\([^)]*\)|>>", " ", text)  # [Music], (applause), speaker changes
    return text.split()


def parse_vtt(text):
    """Return [(start, end, word)] from a WebVTT file.

    YouTube's auto-generated captions carry a timestamp for every word; uploaded
    captions only have one per line, so their words are spread evenly over it.
    """
    word_timed = re.search(rf"<{_TS}>", text) is not None
    words = []
    for start, end, body in _cues(text):
        if word_timed:
            # Auto captions repeat the previous line as plain text; only the
            # line with per-word timestamps is new.
            for line in body:
                parts = re.split(rf"<({_TS})>", line)
                if len(parts) == 1:
                    continue
                stamps = [start] + [_seconds(t) for t in parts[1::2]]
                for i, chunk in enumerate(parts[0::2]):
                    chunk_end = stamps[i + 1] if i + 1 < len(stamps) else end
                    _spread(words, _clean(chunk), stamps[i], chunk_end)
        else:
            _spread(words, _clean(" ".join(body)), start, end)

    words.sort(key=lambda w: w[0])
    deduped = []
    for word in words:
        if deduped and word[2] == deduped[-1][2] and abs(word[0] - deduped[-1][0]) < 0.05:
            continue
        deduped.append(word)
    return deduped


def _cues(text):
    """Yield (start, end, text lines) per cue.

    Read line by line rather than by blank-line blocks: a YouTube cue can
    contain a blank line, which would otherwise cut its text off its timing.
    """
    lines = text.replace("\r\n", "\n").split("\n")
    cue = None
    for i, line in enumerate(lines):
        match = re.match(rf"\s*({_TS})\s*-->\s*({_TS})", line)
        if match:
            if cue:
                yield cue
            cue = (_seconds(match.group(1)), _seconds(match.group(2)), [])
        elif cue and line.strip() and not (i + 1 < len(lines) and "-->" in lines[i + 1]):
            cue[2].append(line)  # (a line right before a timing line is a cue number)
    if cue:
        yield cue


def _spread(words, chunk_words, start, end):
    if not chunk_words:
        return
    step = max(end - start, 0.01) / len(chunk_words)
    for i, word in enumerate(chunk_words):
        words.append((start + i * step, start + (i + 1) * step, word))


def fetch_youtube_captions(url, video_id, folder, lang="en", log=print):
    """Download the video's captions as WebVTT; returns the file or None."""
    import yt_dlp

    folder = Path(folder)
    cached = folder / f"{video_id}.{lang}.vtt"
    if cached.exists():
        return cached
    options = {
        "skip_download": True,
        "writesubtitles": True,  # captions the creator uploaded are preferred
        "writeautomaticsub": True,
        "subtitleslangs": [lang],
        "subtitlesformat": "vtt",
        "outtmpl": str(folder / "%(id)s.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
    }
    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            ydl.download([url])
    except Exception as error:  # captions are optional; never fail the clip
        log(f"Could not fetch YouTube captions: {error}")
        return None
    return next(folder.glob(f"{video_id}.{lang}*.vtt"), None)


_whisper_model = None


def whisper_available():
    import importlib.util

    return importlib.util.find_spec("faster_whisper") is not None


def transcribe(source, start, end, lang="en", log=print):
    """Transcribe [start, end] locally with faster-whisper, if it is installed."""
    global _whisper_model
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return None

    with tempfile.TemporaryDirectory() as tmp:
        audio = Path(tmp) / "audio.wav"
        subprocess.run(
            ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{start:.3f}", "-i", str(source),
             "-t", f"{end - start:.3f}", "-vn", "-ac", "1", "-ar", "16000", str(audio)],
            check=True, capture_output=True,
        )
        if _whisper_model is None:
            name = os.environ.get("WHISPER_MODEL", "small")
            log(f"Loading speech recognition model '{name}' (first time downloads it) ...")
            _whisper_model = WhisperModel(name, device="cpu", compute_type="int8")
        log("Transcribing speech for captions ...")
        segments, _ = _whisper_model.transcribe(str(audio), language=lang or None, word_timestamps=True)
        return [
            (start + w.start, start + w.end, w.word.strip())
            for segment in segments for w in (segment.words or []) if w.word.strip()
        ]


def _lines(words):
    """Group words into short caption lines."""
    lines, current = [], []
    for word in words:
        if current and (
            len(current) >= WORDS_PER_LINE
            or len(" ".join(w[2] for w in current + [word])) > MAX_LINE_CHARS
            or word[0] - current[-1][1] > MAX_PAUSE
        ):
            lines.append(current)
            current = []
        current.append(word)
    if current:
        lines.append(current)
    return lines


def _ass_time(seconds):
    cs = max(0, round(seconds * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def _escape(word):
    return word.replace("\\", "").replace("{", "(").replace("}", ")")


def write_ass(words, clip_start, clip_end, path):
    """Write captions for [clip_start, clip_end] with times relative to the clip.

    Returns the number of caption lines written (0 means no speech in range).
    """
    duration = clip_end - clip_start
    shifted = [
        (max(s - clip_start, 0), min(e - clip_start, duration), w)
        for s, e, w in words if e > clip_start and s < clip_end
    ]
    lines = _lines(shifted)
    events = []
    for n, line in enumerate(lines):
        next_start = lines[n + 1][0][0] if n + 1 < len(lines) else duration
        line_end = min(line[-1][1] + HOLD, next_start, duration)
        texts = [_escape(w[2]) for w in line]
        for i, (start, end, _) in enumerate(line):
            word_end = line[i + 1][0] if i + 1 < len(line) else line_end
            if word_end <= start:
                continue
            text = " ".join(
                f"{HIGHLIGHT}{t}{NORMAL}" if j == i else t for j, t in enumerate(texts)
            )
            events.append(f"Dialogue: 0,{_ass_time(start)},{_ass_time(word_end)},Caption,,0,0,0,,{text}")
    Path(path).write_text(ASS_HEADER + "\n".join(events) + "\n", encoding="utf-8")
    return len(lines)
