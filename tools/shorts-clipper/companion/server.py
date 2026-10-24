"""Local companion for the Shorts Clipper Chrome extension.

Runs on http://127.0.0.1:8765 and only answers requests carrying the pairing
token printed at startup. Start it with:  python server.py

Clips come from YouTube videos (downloaded with yt-dlp) or from screen
recordings the extension streams here in chunks while recording.
"""

import json
import queue
import re
import secrets
import subprocess
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import shorts

HOST, PORT = "127.0.0.1", 8765
CONFIG = shorts.DATA / "config.json"
JOBS_FILE = shorts.DATA / "jobs.json"
RECORDINGS = shorts.DATA / "recordings"
RECORDINGS_FILE = shorts.DATA / "recordings.json"
BUSY = {"queued", "working", "uploading"}
MAX_CHUNK_BYTES = 200 * 1024 * 1024
ID = r"[0-9a-f]{12}"

jobs = {}
recordings = {}
lock = threading.Lock()
recording_lock = threading.Lock()
work = queue.Queue()


def load_token():
    shorts.DATA.mkdir(parents=True, exist_ok=True)
    if CONFIG.exists():
        return json.loads(CONFIG.read_text())["token"]
    token = secrets.token_urlsafe(16)
    CONFIG.write_text(json.dumps({"token": token}))
    return token


def save_jobs():
    with lock:
        JOBS_FILE.write_text(json.dumps(jobs, indent=2))


def update(job_id, **fields):
    with lock:
        jobs[job_id].update(fields, updated=time.time())
    save_jobs()


def load_jobs():
    if JOBS_FILE.exists():
        jobs.update(json.loads(JOBS_FILE.read_text()))
    for job in jobs.values():
        if job["status"] in BUSY:
            job.update(status="failed", message="Interrupted when the companion stopped.")
    save_jobs()


def save_recordings():
    with recording_lock:
        RECORDINGS_FILE.write_text(json.dumps(recordings, indent=2))


def new_recording(data):
    RECORDINGS.mkdir(parents=True, exist_ok=True)
    rec_id = uuid.uuid4().hex[:12]
    name = str(data.get("name") or "").strip()[:100] or time.strftime("Recording %Y-%m-%d %H:%M")
    with recording_lock:
        recordings[rec_id] = {
            "id": rec_id, "name": name, "status": "recording", "nextChunk": 0, "size": 0,
            "duration": None, "created": time.time(),
        }
    (RECORDINGS / f"{rec_id}.part").write_bytes(b"")
    save_recordings()
    return recordings[rec_id]


def append_chunk(rec_id, seq, data):
    """Chunks must arrive in order; a resent chunk (same seq) is ignored."""
    with recording_lock:
        rec = recordings[rec_id]
        if rec["status"] != "recording":
            raise shorts.ClipError("This recording is already finished.")
        if seq == rec["nextChunk"] - 1:
            return rec
        if seq != rec["nextChunk"]:
            raise shorts.ClipError(f"Expected chunk {rec['nextChunk']}, got {seq}.")
        with (RECORDINGS / f"{rec_id}.part").open("ab") as f:
            f.write(data)
        rec["nextChunk"] += 1
        rec["size"] += len(data)
    save_recordings()
    return rec


def finish_recording(rec_id):
    """Remux the streamed WebM so it has a duration and seek index."""
    part, final = RECORDINGS / f"{rec_id}.part", RECORDINGS / f"{rec_id}.webm"
    result = subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-fflags", "+genpts",
         "-i", str(part), "-c", "copy", "-f", "webm", str(final)],
        capture_output=True, text=True,
    )
    with recording_lock:
        rec = recordings[rec_id]
        if result.returncode != 0 or not final.exists():
            rec.update(status="failed", error=result.stderr.strip()[-300:] or "Recording was empty.")
        else:
            part.unlink(missing_ok=True)
            rec.update(status="ready", size=final.stat().st_size, duration=shorts.media_duration(final))
    save_recordings()
    return recordings[rec_id]


def load_recordings():
    if RECORDINGS_FILE.exists():
        recordings.update(json.loads(RECORDINGS_FILE.read_text()))
    for rec_id, rec in list(recordings.items()):
        if rec["status"] == "recording":  # the companion stopped mid-recording: keep what arrived
            finish_recording(rec_id)
    save_recordings()


def run_upload(job_id):
    job = jobs[job_id]
    update(job_id, status="uploading", message="Uploading to YouTube ...")
    vid = shorts.upload(
        shorts.CLIPS / job["file"], job["title"], job["description"], job["tags"], job["privacy"],
        log=lambda m: update(job_id, message=m),
    )
    update(job_id, status="uploaded", youtubeId=vid, message="Uploaded.")


def worker():
    # One job at a time keeps ffmpeg from starving the machine.
    while True:
        job_id, action = work.get()
        log = lambda m, j=job_id: update(j, message=m)
        try:
            if action == "make":
                job = jobs[job_id]
                update(job_id, status="working")
                source = RECORDINGS / f"{job['recordingId']}.webm" if job.get("recordingId") else None
                _, caption_source, problem = shorts.make_clip(
                    job.get("url"), job["start"], job["end"], shorts.CLIPS / job["file"], job["framing"],
                    job["captions"], job["lang"], log=log, source=source,
                )
                note = f"with {caption_source}" if caption_source else problem
                update(job_id, status="ready", captionSource=caption_source,
                       message=f"Clip ready to preview{f' ({note})' if note else ''}.")
                if job["autoUpload"]:
                    run_upload(job_id)
            elif action == "upload":
                run_upload(job_id)
        except Exception as error:  # report every failure back to the extension
            update(job_id, status="failed", message=str(error))
        finally:
            work.task_done()


def new_job(data):
    start, end = shorts.clip_range(data.get("start"), data.get("end"))
    rec_id = data.get("recordingId")
    if rec_id:
        rec = recordings.get(str(rec_id))
        if not rec or rec["status"] != "ready":
            raise shorts.ClipError("That recording is not ready.")
        if rec["duration"] and start >= rec["duration"]:
            raise shorts.ClipError("The clip starts after the end of the recording.")
        source = {"recordingId": rec["id"], "sourceTitle": rec["name"]}
    else:
        vid = shorts.video_id(str(data.get("url", "")))
        source = {
            "url": f"https://www.youtube.com/watch?v={vid}",
            "videoId": vid,
            "sourceTitle": str(data.get("sourceTitle", ""))[:200],
        }
    framing = data.get("framing", "blur")
    if framing not in shorts.FRAMING_FILTERS:
        raise shorts.ClipError("Unknown framing.")
    privacy = data.get("privacy", "private")
    if privacy not in ("private", "unlisted", "public"):
        raise shorts.ClipError("Unknown privacy setting.")
    lang = str(data.get("lang") or "en").strip()
    if not re.fullmatch(r"[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?", lang):
        raise shorts.ClipError("Caption language should be a code like en, ar or pt-BR.")
    job_id = uuid.uuid4().hex[:12]
    return {
        "id": job_id,
        **source,
        "start": start,
        "end": end,
        "title": str(data.get("title", ""))[:100],
        "description": str(data.get("description", ""))[:5000],
        "tags": [t.strip() for t in str(data.get("tags", "")).split(",") if t.strip()],
        "privacy": privacy,
        "framing": framing,
        "captions": bool(data.get("captions", True)),
        "lang": lang,
        "autoUpload": bool(data.get("autoUpload")),
        "file": f"{job_id}.mp4",
        "status": "queued",
        "message": "Waiting in queue ...",
        "created": time.time(),
        "updated": time.time(),
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "ShortsClipper/1.0"

    def log_message(self, fmt, *args):
        pass  # keep the console for progress messages

    def send_json(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def authorized(self, query):
        # Web pages may not talk to the companion; only the extension (or curl) can.
        origin = self.headers.get("Origin", "")
        if origin and not origin.startswith("chrome-extension://"):
            return False
        token = self.headers.get("X-Clipper-Token") or query.get("token", [""])[0]
        return secrets.compare_digest(token, TOKEN)

    def read_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(length) or b"{}") if length else {}

    def do_GET(self):
        url = urlparse(self.path)
        query = parse_qs(url.query)
        if url.path == "/health":
            return self.send_json(200, {"ok": True, "paired": self.authorized(query)})
        if not self.authorized(query):
            return self.send_json(401, {"error": "Wrong or missing pairing token."})
        if url.path == "/jobs":
            with lock:
                recent = sorted(jobs.values(), key=lambda j: j["created"], reverse=True)[:20]
            recent = [{**j, "hasClip": j["status"] not in ("queued", "working")
                       and (shorts.CLIPS / j["file"]).exists()} for j in recent]
            return self.send_json(200, {"jobs": recent})
        if url.path == "/recordings":
            with recording_lock:
                recent = sorted(recordings.values(), key=lambda r: r["created"], reverse=True)[:20]
            return self.send_json(200, {"recordings": recent})
        match = re.fullmatch(rf"/clips/({ID})\.mp4", url.path)
        if match:
            return self.send_file(shorts.CLIPS / f"{match.group(1)}.mp4", "video/mp4")
        match = re.fullmatch(rf"/recordings/({ID})\.webm", url.path)
        if match:
            return self.send_file(RECORDINGS / f"{match.group(1)}.webm", "video/webm")
        self.send_json(404, {"error": "Not found."})

    def do_DELETE(self):
        url = urlparse(self.path)
        if not self.authorized(parse_qs(url.query)):
            return self.send_json(401, {"error": "Wrong or missing pairing token."})
        match = re.fullmatch(rf"/recordings/({ID})", url.path)
        if not match or match.group(1) not in recordings:
            return self.send_json(404, {"error": "Not found."})
        rec_id = match.group(1)
        with recording_lock:
            if recordings[rec_id]["status"] == "recording":
                return self.send_json(409, {"error": "Stop the recording first."})
            del recordings[rec_id]
        for suffix in (".webm", ".part"):
            (RECORDINGS / f"{rec_id}{suffix}").unlink(missing_ok=True)
        save_recordings()
        self.send_json(200, {"deleted": rec_id})

    def do_POST(self):
        url = urlparse(self.path)
        if not self.authorized(parse_qs(url.query)):
            return self.send_json(401, {"error": "Wrong or missing pairing token."})
        try:
            match = re.fullmatch(rf"/recordings/({ID})/chunk", url.path)
            if match and match.group(1) in recordings:
                length = int(self.headers.get("Content-Length") or 0)
                if not 0 < length <= MAX_CHUNK_BYTES:
                    return self.send_json(413, {"error": "Chunk is empty or too large."})
                seq = int(parse_qs(url.query).get("seq", ["-1"])[0])
                return self.send_json(200, append_chunk(match.group(1), seq, self.rfile.read(length)))

            data = self.read_body()
            if url.path == "/recordings":
                return self.send_json(201, new_recording(data))
            match = re.fullmatch(rf"/recordings/({ID})/finish", url.path)
            if match and match.group(1) in recordings:
                if recordings[match.group(1)]["status"] != "recording":
                    return self.send_json(200, recordings[match.group(1)])
                return self.send_json(200, finish_recording(match.group(1)))
            if url.path == "/jobs":
                job = new_job(data)
                with lock:
                    jobs[job["id"]] = job
                save_jobs()
                work.put((job["id"], "make"))
                return self.send_json(201, job)
            match = re.fullmatch(rf"/jobs/({ID})/upload", url.path)
            if match and match.group(1) in jobs:
                job_id = match.group(1)
                if jobs[job_id]["status"] not in ("ready", "failed") or not (shorts.CLIPS / jobs[job_id]["file"]).exists():
                    return self.send_json(409, {"error": "This clip is not ready to upload."})
                edits = {k: str(data[k]) for k in ("title", "description", "privacy") if k in data}
                if "tags" in data:
                    edits["tags"] = [t.strip() for t in str(data["tags"]).split(",") if t.strip()]
                update(job_id, status="queued", message="Waiting to upload ...", **edits)
                work.put((job_id, "upload"))
                return self.send_json(202, jobs[job_id])
        except (shorts.ClipError, ValueError) as error:
            return self.send_json(400, {"error": str(error)})
        self.send_json(404, {"error": "Not found."})

    def send_file(self, path, content_type):
        if not path.exists():
            return self.send_json(404, {"error": "File not found."})
        size = path.stat().st_size
        start, end = 0, size - 1
        match = re.fullmatch(r"bytes=(\d*)-(\d*)", self.headers.get("Range", ""))
        if match and (match.group(1) or match.group(2)):
            if match.group(1):
                start = int(match.group(1))
                end = min(int(match.group(2) or end), size - 1)
            else:
                start = max(size - int(match.group(2)), 0)
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        else:
            self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        with path.open("rb") as f:
            f.seek(start)
            remaining = end - start + 1
            while remaining > 0:
                chunk = f.read(min(1 << 20, remaining))
                if not chunk:
                    break
                try:
                    self.wfile.write(chunk)
                except (BrokenPipeError, ConnectionResetError):
                    return  # the video player skipped ahead
                remaining -= len(chunk)


TOKEN = load_token()

if __name__ == "__main__":
    shorts.check_tools()
    load_jobs()
    load_recordings()
    threading.Thread(target=worker, daemon=True).start()
    print(f"Shorts Clipper companion running on http://{HOST}:{PORT}")
    print(f"Pairing token (paste into the extension's Settings): {TOKEN}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
