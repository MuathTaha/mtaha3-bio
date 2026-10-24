# Shorts Clipper

Mark a moment in any YouTube video from Chrome, turn it into a vertical 1080×1920 Short, and upload it to your channel. Everything runs on your own computer, and the tools it uses are free.

It has two parts:

- **`extension/`**: a Chrome extension. On a YouTube video you click **⏱ Now** to set the start and end, add a title, and click **Create clip**.
- **`companion/`**: a small Python app that runs in the background. It downloads the video with yt-dlp, cuts and reframes the clip with ffmpeg, and uploads it with the YouTube Data API.

Chrome extensions aren't allowed to run ffmpeg or save large files, so the companion does the heavy work. It only listens on `127.0.0.1`, and it only accepts requests carrying the pairing token it prints when it starts.

> **Only clip videos you own or have permission to reuse.** Re-uploading other people's content can get your channel copyright strikes.

## 1. Install the tools (once)

1. Install **Python 3.10 or newer** from [python.org](https://www.python.org/downloads/).
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
   ```

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
5. Click **Create clip**. When it says *ready*, click **Preview** to check it, then click **Upload**. You can tick **Upload as soon as the clip is cut** to skip that step.

Clips are saved in `companion/data/clips/`. Each source video is downloaded once and reused for every clip you cut from it.

## Without the extension

You can also cut and upload clips straight from the terminal:

```bash
python shorts.py "https://www.youtube.com/watch?v=VIDEO_ID" 1:05 1:42 --title "My clip" --upload --privacy unlisted
```

## Troubleshooting

- **"companion offline"**: `server.py` isn't running. Start it as in step 4.
- **Downloads fail**: YouTube changes often, so update yt-dlp with `pip install -U yt-dlp`.
- **"Missing client_secret.json"**: finish section 2.
