# Shorts Clipper

Turn a YouTube video, or anything you record on your screen, into captioned vertical 1080×1920 Shorts, and upload them to your channel. Everything runs on your own computer, and the tools it uses are free.

It has two parts:

- **`extension/`**: a Chrome extension with two ways in:
  - **YouTube**: on a video you click **⏱ Now** to set the start and end, add a title, and click **Create clip**.
  - **Screen recorder**: record a tab, a window or your whole screen, like the Windows screen recorder, then cut clips from the recording.
- **`companion/`**: a small Python app that runs in the background. It downloads videos with yt-dlp, stores your recordings, adds captions, cuts and reframes clips with ffmpeg, and uploads them with the YouTube Data API.

Chrome extensions aren't allowed to run ffmpeg or save large files, so the companion does the heavy work. It only listens on `127.0.0.1`, and it only accepts requests carrying the pairing token it prints when it starts.

> **Only clip videos you own or have permission to reuse.** Recording your screen doesn't change who owns what's on it: re-uploading other people's content can get your channel copyright strikes. Streaming services that use copy protection (Netflix and similar) record as a black screen.

## 1. Install the tools (once)

1. Install **Python 3.13** (64-bit) from [python.org](https://www.python.org/downloads/). On Windows, tick **Add python.exe to PATH** in the installer. Newer Python versions work for everything except speech-recognition captions, which need Python 3.9–3.14.
2. Install **ffmpeg**:
   - Windows: `winget install ffmpeg`
   - macOS: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg`
3. In a terminal, from this folder, install the Python packages:

   ```bash
   cd companion
   python -m venv .venv
   # Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
   pip install -r requirements.txt
   pip install -r requirements-captions.txt
   ```

   The second command installs speech recognition, which is needed for captions on screen recordings. It's optional: if it fails, everything else still works, and YouTube clips still get YouTube's own captions. See Troubleshooting.

## 2. Let it upload to your YouTube channel (once)

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create a project, for example "Shorts Clipper".
2. Go to **APIs & Services → Library**, find **YouTube Data API v3**, and click **Enable**.
3. Go to **APIs & Services → OAuth consent screen**. Choose **External**, fill in the app name and your email, and add yourself under **Test users**.
4. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**. Choose **Desktop app**.
5. Download the JSON file, rename it to `client_secret.json`, and put it in `companion/`, next to `shorts.py`.

The first time you upload, a browser tab opens so you can sign in and choose your channel.

**Google's limits on personal projects like this one:**

- **Uploads stay private.** Google keeps videos uploaded by an unverified project private. Switch each one to Public in YouTube Studio, or apply for Google's API audit to remove the restriction.
- **You'll sign in again weekly.** While the consent screen is in "Testing" mode, the sign-in expires after 7 days. The companion simply asks you again.
- **About 6 uploads a day.** The free quota is 10,000 units a day, and each upload costs about 1,600.

## 3. Load the extension (once)

1. In Chrome, open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and choose the `extension/` folder.
3. Pin **Shorts Clipper** to the toolbar using the puzzle-piece icon.

## 4. Make a Short

1. Start the companion and leave the terminal open:

   ```bash
   cd companion
   source .venv/bin/activate      # Windows: .venv\Scripts\activate
   python server.py
   ```

   The first time, it prints a **pairing token**. Click the extension, paste the token, and click **Save**. You only do this once.
2. Open a YouTube video and play it to the moment you want. Click the extension, then click **⏱ Now** next to **Start**.
3. Play on to the end of the moment, open the extension again, and click **⏱ Now** next to **End**. The popup remembers what you entered, even though it closes whenever you click back on the video.
4. Add a title. A description and tags are optional, and `#Shorts` is added for you. Then choose the framing:
   - **Fit, blurred background** keeps the whole picture.
   - **Fill, crop sides** fills the screen.
5. Leave **Add captions** ticked to burn in Shorts-style captions (see below), and set the language code, for example `en` or `ar`.
6. Click **Create clip**. When it says *ready*, click **Preview** to check it, then click **Upload**. You can tick **Upload as soon as the clip is cut** to skip that step.

Clips are saved in `companion/data/clips/`. Each source video is downloaded once and reused for every clip you cut from it.

## 5. Record your screen and clip it

Use this for anything you can play or show on your screen: a webinar, a Zoom or Teams recording, a training video, a demo of your product, or a YouTube video.

1. With the companion running, click the extension, then click **● Record screen, then clip it**. A recorder page opens.
2. Optionally name the recording, and tick **Also record my microphone** if you want to talk over it.
3. Click **● Start recording**. In Chrome's picker, choose:
   - **Chrome tab**: the cleanest picture. Leave **Also share tab audio** ticked.
   - **Window** or **Entire screen**: to record any app. On Windows, tick **Also share system audio** to get sound.
4. Play what you want to capture. The recording is saved to the companion every few seconds, so a long recording won't run out of browser memory, and the part already recorded survives a crash.
5. Click **■ Stop recording**, or Chrome's **Stop sharing** bar. The recording opens in the clip editor.
6. Scrub the player and click **⏱ Now** to set each clip's start and end, then fill in the details as in step 4 and click **Create clip**. You can cut as many clips as you like from one recording.

Recordings are saved in `companion/data/recordings/`. Delete them from the recorder page when you're done; clips already made from a recording are kept.

## Captions

Captions show 2–3 words at a time in bold white text, with the word being spoken in yellow, placed just under the video. The words come from:

1. **The video's YouTube captions**, for clips of YouTube videos: uploaded captions if the creator added them, otherwise YouTube's auto-generated ones.
2. **Speech recognition on your computer** for screen recordings, and for YouTube videos without captions. This uses faster-whisper, which is free and runs offline after the first use. The first time, it downloads a speech model of about 500 MB. To use a smaller, faster model, set `WHISPER_MODEL=base` before starting `server.py`, or set `WHISPER_MODEL=medium` for better accuracy.

Set the language code in the clip form (`en`, `ar`, `fr` and so on) so speech recognition listens for the right language. If no captions can be made, the clip is still cut, and its status says why.

## Without the extension

You can also cut and upload clips straight from the terminal:

```bash
python shorts.py "https://www.youtube.com/watch?v=VIDEO_ID" 1:05 1:42 --title "My clip" --upload --privacy unlisted
python shorts.py ... --lang ar          # caption language
python shorts.py ... --no-captions
```

## Tests

```bash
cd companion
python -m unittest -v test_shorts
```

## Troubleshooting

- **"companion offline"**: `server.py` isn't running. Start it as in step 4.
- **Downloads fail**: YouTube changes often, so update yt-dlp with `pip install -U yt-dlp`.
- **Recording has no sound**: tick the audio box in Chrome's share picker. Window recordings on macOS can't capture system audio, so record a Chrome tab instead.
- **"speech recognition failed"**: the first use needs internet to download the speech model, from huggingface.co.
- **`pip install -r requirements-captions.txt` fails with "ResolutionImpossible ... ctranslate2"**: your Python is too new (3.15 or later), is 32-bit, or runs on Windows on ARM. Check with `python -c "import sys, platform; print(sys.version, platform.machine())"`. Then install 64-bit Python 3.13, delete the `.venv` folder, and set it up again with `py -3.13 -m venv .venv`. On Windows on ARM, speech recognition isn't available yet.
- **"Missing client_secret.json"**: finish section 2.
