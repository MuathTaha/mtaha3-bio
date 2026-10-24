"""Core of the Shorts Clipper: download a YouTube video, cut a vertical clip, upload it.

Can be used on its own from the command line:

    python shorts.py "https://www.youtube.com/watch?v=VIDEO_ID" 1:05 1:42 --title "My clip"
    python shorts.py ... --upload --privacy unlisted
"""

import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
DOWNLOADS = DATA / "downloads"
CLIPS = DATA / "clips"
CLIENT_SECRET = HERE / "client_secret.json"
TOKEN = DATA / "token.json"

MAX_SHORT_SECONDS = 180  # YouTube accepts vertical videos up to 3 minutes as Shorts
SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]


class ClipError(Exception):
    pass


def parse_time(value):
    """Accept "83", "83.5", "1:23" or "1:02:03" and return seconds."""
    value = str(value).strip()
    if not re.fullmatch(r"\d+(\.\d+)?(:\d{1,2}(\.\d+)?){0,2}", value):
        raise ClipError(f"Not a valid timestamp: {value!r}")
    seconds = 0.0
    for part in value.split(":"):
        seconds = seconds * 60 + float(part)
    return seconds


def video_id(url):
    match = re.search(r"(?:v=|youtu\.be/|/shorts/|/live/)([\w-]{11})", url)
    if not match:
        raise ClipError(f"Could not find a YouTube video ID in {url!r}")
    return match.group(1)


def check_tools():
    if not shutil.which("ffmpeg"):
        raise ClipError("ffmpeg is not installed or not on PATH (see README).")


def download(url, log=print):
    """Download the source video once (up to 1080p) and reuse it for every clip."""
    import yt_dlp

    vid = video_id(url)
    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    cached = next(DOWNLOADS.glob(f"{vid}.*"), None)
    if cached and cached.suffix != ".part":
        log(f"Using cached download {cached.name}")
        return cached

    log(f"Downloading {vid} ...")
    options = {
        "format": "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080]/b",
        "merge_output_format": "mp4",
        "outtmpl": str(DOWNLOADS / "%(id)s.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
    }
    with yt_dlp.YoutubeDL(options) as ydl:
        ydl.download([f"https://www.youtube.com/watch?v={vid}"])
    result = next(DOWNLOADS.glob(f"{vid}.mp4"), None) or next(DOWNLOADS.glob(f"{vid}.*"), None)
    if not result:
        raise ClipError("Download finished but no file was found.")
    return result


FRAMING_FILTERS = {
    # Whole frame kept, centred on a blurred, zoomed copy of itself.
    "blur": (
        "[0:v]split=2[bg][fg];"
        "[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:5[bg];"
        "[fg]scale=1080:1920:force_original_aspect_ratio=decrease[fg];"
        "[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[v]"
    ),
    # Fills the screen by cutting off the left and right edges.
    "crop": "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v]",
}


def clip_range(start, end):
    """Parse and check a clip's start and end; returns them in seconds."""
    start, end = parse_time(start), parse_time(end)
    if end <= start:
        raise ClipError("End time must be after start time.")
    if end - start > MAX_SHORT_SECONDS:
        raise ClipError(f"Clip is {end - start:.0f}s; Shorts can be at most {MAX_SHORT_SECONDS}s.")
    return start, end


def cut(source, start, end, out_path, framing="blur", log=print):
    """Cut [start, end] from source into a 1080x1920 H.264 MP4."""
    check_tools()
    start, end = clip_range(start, end)
    duration = end - start
    if framing not in FRAMING_FILTERS:
        raise ClipError(f"Framing must be one of {sorted(FRAMING_FILTERS)}.")

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    log(f"Cutting {duration:.1f}s clip ({framing}) ...")
    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-ss", f"{start:.3f}", "-i", str(source), "-t", f"{duration:.3f}",
        "-filter_complex", FRAMING_FILTERS[framing],
        "-map", "[v]", "-map", "0:a?",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        str(out_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise ClipError(f"ffmpeg failed: {result.stderr.strip()[-500:]}")
    return out_path


def youtube_client(log=print):
    """Sign in once in the browser; the token is reused until it expires."""
    from google.auth.exceptions import RefreshError
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    if not CLIENT_SECRET.exists():
        raise ClipError(f"Missing {CLIENT_SECRET.name} next to shorts.py (see README).")

    creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES) if TOKEN.exists() else None
    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
        except RefreshError:
            # Google expires tokens of apps in "Testing" mode after 7 days.
            creds = None
    if not creds or not creds.valid:
        log("Opening your browser to sign in to YouTube ...")
        flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET), SCOPES)
        creds = flow.run_local_server(port=0)
        DATA.mkdir(parents=True, exist_ok=True)
        TOKEN.write_text(creds.to_json())
    return build("youtube", "v3", credentials=creds)


def upload(clip_path, title, description="", tags=(), privacy="private", log=print):
    """Upload a clip and return its YouTube video ID."""
    from googleapiclient.http import MediaFileUpload

    if privacy not in ("private", "unlisted", "public"):
        raise ClipError("Privacy must be private, unlisted or public.")
    title = (title or "").strip()[:100]
    if not title:
        raise ClipError("A title is required to upload.")
    if "#shorts" not in f"{title} {description}".lower():
        description = f"{description}\n\n#Shorts".strip()

    body = {
        "snippet": {
            "title": title,
            "description": description[:5000],
            "tags": [t for t in tags if t],
            "categoryId": "22",  # People & Blogs
        },
        "status": {"privacyStatus": privacy, "selfDeclaredMadeForKids": False},
    }
    youtube = youtube_client(log)
    media = MediaFileUpload(str(clip_path), mimetype="video/mp4", chunksize=8 * 1024 * 1024, resumable=True)
    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)
    log("Uploading to YouTube ...")
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            log(f"Uploading to YouTube ... {int(status.progress() * 100)}%")
    return response["id"]


def main():
    parser = argparse.ArgumentParser(description="Cut a YouTube video into a vertical Short.")
    parser.add_argument("url")
    parser.add_argument("start", help="e.g. 1:05")
    parser.add_argument("end", help="e.g. 1:42")
    parser.add_argument("--title", default="")
    parser.add_argument("--description", default="")
    parser.add_argument("--tags", default="", help="comma separated")
    parser.add_argument("--framing", choices=sorted(FRAMING_FILTERS), default="blur")
    parser.add_argument("--upload", action="store_true")
    parser.add_argument("--privacy", choices=["private", "unlisted", "public"], default="private")
    args = parser.parse_args()

    try:
        start, end = clip_range(args.start, args.end)
        source = download(args.url)
        name = f"{video_id(args.url)}_{start:.0f}-{end:.0f}.mp4"
        clip = cut(source, args.start, args.end, CLIPS / name, args.framing)
        print(f"Clip saved: {clip}")
        if args.upload:
            tags = [t.strip() for t in args.tags.split(",")]
            vid = upload(clip, args.title, args.description, tags, args.privacy)
            print(json.dumps({"uploaded": f"https://youtube.com/shorts/{vid}"}))
    except ClipError as error:
        raise SystemExit(f"Error: {error}")


if __name__ == "__main__":
    main()
