"""Tests for the Shorts Clipper. Run with:  python -m unittest -v test_shorts"""

import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import captions
import server
import shorts

# The format YouTube uses for auto-generated captions: every word has a
# timestamp, and each line is repeated as plain text in the following cues.
AUTO_VTT = """WEBVTT
Kind: captions
Language: en

00:00:00.160 --> 00:00:02.270 align:start position:0%

welcome<00:00:00.480><c> back</c><00:00:00.800><c> to</c><00:00:00.960><c> the</c><00:00:01.120><c> channel</c>

00:00:02.270 --> 00:00:02.280 align:start position:0%
welcome back to the channel


00:00:02.280 --> 00:00:04.790 align:start position:0%
welcome back to the channel
[Music] today<00:00:02.800><c> we're</c><00:00:03.040><c> talking</c><00:00:03.360><c> about</c><00:00:03.600><c> hiring</c>

00:00:04.790 --> 00:00:04.800 align:start position:0%
today we're talking about hiring


00:00:04.800 --> 00:00:07.000 align:start position:0%
today we're talking about hiring
and<00:00:05.200><c> onboarding</c><00:00:05.900><c> &amp;</c><00:00:06.100><c> retention</c>
"""

# Captions a creator uploaded: one timestamp per line, no per-word timing.
MANUAL_VTT = """WEBVTT

1
00:00:01.000 --> 00:00:03.000
Hello <i>everyone</i>,
thanks for watching

2
00:00:03.000 --> 00:00:04.000
[Applause]
"""


class ParseVttTests(unittest.TestCase):
    def test_blank_or_space_only_lines_inside_cues(self):
        # YouTube writes a line holding one space in each cue; editors often strip it.
        with_spaces = AUTO_VTT.replace("0%\n\n", "0%\n \n").replace("channel\n\n0", "channel\n \n\n0")
        self.assertNotEqual(with_spaces, AUTO_VTT)
        self.assertEqual(captions.parse_vtt(with_spaces), captions.parse_vtt(AUTO_VTT))

    def test_auto_captions_have_word_timing_and_no_duplicates(self):
        words = captions.parse_vtt(AUTO_VTT)
        self.assertEqual(
            [w for _, _, w in words],
            ["welcome", "back", "to", "the", "channel", "today", "we're", "talking", "about", "hiring",
             "and", "onboarding", "&", "retention"],
        )
        self.assertEqual(words[0][:2], (0.16, 0.48))
        self.assertEqual(words[1][:2], (0.48, 0.8))
        self.assertEqual(words[4][:2], (1.12, 2.27))  # last word runs to the end of its cue
        self.assertEqual(words[5][0], 2.28)  # "[Music]" removed, "today" starts with the cue

    def test_uploaded_captions_spread_words_and_drop_sound_tags(self):
        words = captions.parse_vtt(MANUAL_VTT)
        self.assertEqual([w for _, _, w in words], ["Hello", "everyone,", "thanks", "for", "watching"])
        self.assertAlmostEqual(words[0][0], 1.0)
        self.assertAlmostEqual(words[-1][1], 3.0)
        starts = [s for s, _, _ in words]
        self.assertEqual(starts, sorted(starts))


class AssTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp)

    def dialogues(self, path):
        return [l for l in path.read_text().splitlines() if l.startswith("Dialogue:")]

    def test_times_are_relative_to_the_clip_and_words_are_highlighted(self):
        words = captions.parse_vtt(AUTO_VTT)
        out = self.tmp / "c.ass"
        lines = captions.write_ass(words, 2.0, 7.0, out)
        events = self.dialogues(out)
        self.assertGreater(lines, 0)
        self.assertNotIn("welcome", "".join(events))  # before the clip starts
        self.assertIn("channel", events[0])  # still being spoken at 2.0s
        self.assertTrue(events[0].startswith("Dialogue: 0,0:00:00.00,"))
        self.assertTrue(all(captions.HIGHLIGHT in e for e in events))
        for event in events:
            text = event.split(",,", 2)[-1].split(",", 4)[-1]
            plain = text.replace(captions.HIGHLIGHT, "").replace(captions.NORMAL, "")
            self.assertLessEqual(len(plain.split()), captions.WORDS_PER_LINE)

    def test_no_speech_in_range_writes_nothing(self):
        out = self.tmp / "c.ass"
        self.assertEqual(captions.write_ass(captions.parse_vtt(AUTO_VTT), 60, 70, out), 0)
        self.assertEqual(self.dialogues(out), [])

    def test_ass_control_characters_are_escaped(self):
        out = self.tmp / "c.ass"
        captions.write_ass([(0, 1, "{\\b1}hack")], 0, 2, out)
        self.assertNotIn("{\\b1}", out.read_text().split("[Events]")[1])


@unittest.skipUnless(shutil.which("ffmpeg"), "ffmpeg not installed")
class ClipTests(unittest.TestCase):
    URL = "https://www.youtube.com/watch?v=TESTVIDEO01"

    def setUp(self):
        patch = mock.patch.object(captions, "whisper_available", return_value=True)
        patch.start()
        self.addCleanup(patch.stop)

    def test_missing_speech_recognition_is_reported(self):
        with mock.patch.object(captions, "whisper_available", return_value=False), \
                mock.patch.object(shorts, "download", return_value=self.source), \
                mock.patch.object(captions, "fetch_youtube_captions", return_value=None):
            _, source, problem = shorts.make_clip(self.URL, 0, 2, self.tmp / "nowhisper.mp4", log=lambda m: None)
        self.assertIsNone(source)
        self.assertIn("install faster-whisper", problem)

    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp())
        cls.source = cls.tmp / "source.mp4"
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30",
             "-f", "lavfi", "-i", "sine=frequency=440", "-t", "10", "-c:v", "libx264", "-c:a", "aac",
             str(cls.source)],
            check=True,
        )

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp)

    def probe(self, path):
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
             "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
            capture_output=True, text=True, check=True,
        ).stdout.split()
        return int(out[0]), int(out[1]), float(out[2])

    def caption_band(self, clip, at):
        """Raw grey pixels of the band where captions are drawn, at time `at`."""
        return subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-ss", str(at), "-i", str(clip), "-frames:v", "1",
             "-vf", "crop=1080:260:0:1180,format=gray", "-f", "rawvideo", "-"],
            capture_output=True, check=True,
        ).stdout

    def test_captions_are_burned_in(self):
        words = captions.parse_vtt(AUTO_VTT)
        plain = shorts.cut(self.source, 2, 7, self.tmp / "plain.mp4", "blur", log=lambda m: None)
        captioned = shorts.cut(self.source, 2, 7, self.tmp / "captioned.mp4", "blur", words, log=lambda m: None)
        self.assertEqual(self.probe(captioned)[:2], (1080, 1920))
        self.assertAlmostEqual(self.probe(captioned)[2], 5.0, delta=0.1)
        # 1.5s into the clip (3.5s in the source) "talking about hiring" is on screen.
        a, b = self.caption_band(plain, 1.5), self.caption_band(captioned, 1.5)
        changed = sum(1 for x, y in zip(a, b) if abs(x - y) > 40) / len(a)
        self.assertGreater(changed, 0.03, "caption text should change the caption band")

    def test_crop_framing_with_captions(self):
        clip = shorts.cut(self.source, 0, 3, self.tmp / "crop.mp4", "crop", [(0.5, 2.0, "Hi")], log=lambda m: None)
        self.assertEqual(self.probe(clip)[:2], (1080, 1920))

    def test_make_clip_prefers_youtube_captions(self):
        vtt = self.tmp / "TESTVIDEO01.en.vtt"
        vtt.write_text(AUTO_VTT)
        with mock.patch.object(shorts, "download", return_value=self.source), \
                mock.patch.object(captions, "fetch_youtube_captions", return_value=vtt), \
                mock.patch.object(captions, "transcribe") as transcribe:
            _, source, _ = shorts.make_clip(self.URL, 2, 7, self.tmp / "yt.mp4", log=lambda m: None)
        self.assertEqual(source, "YouTube captions")
        transcribe.assert_not_called()

    def test_make_clip_falls_back_to_speech_recognition(self):
        with mock.patch.object(shorts, "download", return_value=self.source), \
                mock.patch.object(captions, "fetch_youtube_captions", return_value=None), \
                mock.patch.object(captions, "transcribe", return_value=[(2.5, 3.0, "Hello")]):
            _, source, _ = shorts.make_clip(self.URL, 2, 7, self.tmp / "asr.mp4", log=lambda m: None)
        self.assertEqual(source, "speech recognition")

    def test_make_clip_without_any_captions_still_cuts(self):
        with mock.patch.object(shorts, "download", return_value=self.source), \
                mock.patch.object(captions, "fetch_youtube_captions", return_value=None), \
                mock.patch.object(captions, "transcribe", side_effect=RuntimeError("no model")):
            clip, source, problem = shorts.make_clip(self.URL, 2, 7, self.tmp / "none.mp4", log=lambda m: None)
        self.assertIsNone(source)
        self.assertEqual(problem, "speech recognition failed: no model")
        self.assertTrue(clip.exists())

    def test_captions_can_be_turned_off(self):
        with mock.patch.object(shorts, "download", return_value=self.source), \
                mock.patch.object(captions, "fetch_youtube_captions") as fetch:
            _, source, _ = shorts.make_clip(self.URL, 0, 2, self.tmp / "off.mp4", with_captions=False, log=lambda m: None)
        self.assertIsNone(source)
        fetch.assert_not_called()


class DownloadCacheTests(unittest.TestCase):
    def test_cached_captions_are_not_mistaken_for_the_video(self):
        tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, tmp)
        with mock.patch.object(shorts, "DOWNLOADS", tmp):
            (tmp / "dQw4w9WgXcQ.en.vtt").write_text(AUTO_VTT)
            (tmp / "dQw4w9WgXcQ.mp4.part").write_text("")
            self.assertIsNone(shorts.cached_video("dQw4w9WgXcQ"))
            (tmp / "dQw4w9WgXcQ.mp4").write_text("")
            self.assertEqual(shorts.cached_video("dQw4w9WgXcQ"), tmp / "dQw4w9WgXcQ.mp4")


@unittest.skipUnless(shutil.which("ffmpeg"), "ffmpeg not installed")
class RecordingTests(unittest.TestCase):
    """The extension streams a MediaRecorder WebM in pieces; the companion
    reassembles it, and clips are cut from it like from a YouTube video."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp)
        patches = [
            mock.patch.object(server, "RECORDINGS", self.tmp / "recordings"),
            mock.patch.object(server, "RECORDINGS_FILE", self.tmp / "recordings.json"),
            mock.patch.dict(server.recordings, clear=True),
        ]
        for patch in patches:
            patch.start()
            self.addCleanup(patch.stop)
        # A WebM like Chrome's MediaRecorder makes: VP8/VP9 video, Opus audio, no seek index.
        self.webm = self.tmp / "screen.webm"
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30",
             "-f", "lavfi", "-i", "sine=frequency=300", "-t", "6", "-c:v", "libvpx", "-deadline", "realtime",
             "-b:v", "1M", "-c:a", "libopus", "-cues_to_front", "0", "-reserve_index_space", "0", str(self.webm)],
            check=True,
        )

    def record(self, chunk_size=50_000):
        rec = server.new_recording({"name": "Webinar"})
        data = self.webm.read_bytes()
        for seq, offset in enumerate(range(0, len(data), chunk_size)):
            server.append_chunk(rec["id"], seq, data[offset:offset + chunk_size])
        return rec

    def test_chunks_are_reassembled_into_a_seekable_recording(self):
        rec = self.record()
        done = server.finish_recording(rec["id"])
        self.assertEqual(done["status"], "ready", done.get("error"))
        self.assertAlmostEqual(done["duration"], 6.0, delta=0.2)
        self.assertFalse((server.RECORDINGS / f"{rec['id']}.part").exists())

    def test_chunks_must_arrive_in_order_and_resends_are_ignored(self):
        rec = server.new_recording({})
        self.assertTrue(rec["name"].startswith("Recording "))
        server.append_chunk(rec["id"], 0, b"abc")
        server.append_chunk(rec["id"], 0, b"abc")  # retried after a lost response
        with self.assertRaises(shorts.ClipError):
            server.append_chunk(rec["id"], 2, b"skipped one")
        self.assertEqual((server.RECORDINGS / f"{rec['id']}.part").read_bytes(), b"abc")

    def test_finished_recordings_take_no_more_chunks(self):
        rec = self.record()
        server.finish_recording(rec["id"])
        with self.assertRaises(shorts.ClipError):
            server.append_chunk(rec["id"], 99, b"late")

    def test_empty_recording_fails_cleanly(self):
        rec = server.new_recording({})
        self.assertEqual(server.finish_recording(rec["id"])["status"], "failed")

    def test_clip_from_recording_uses_speech_recognition_only(self):
        rec = self.record()
        server.finish_recording(rec["id"])
        job = server.new_job({"recordingId": rec["id"], "start": 1, "end": 4})
        self.assertEqual((job["recordingId"], job["sourceTitle"]), (rec["id"], "Webinar"))
        self.assertNotIn("url", job)
        with self.assertRaises(shorts.ClipError):
            server.new_job({"recordingId": rec["id"], "start": 30, "end": 40})  # after the end
        with self.assertRaises(shorts.ClipError):
            server.new_job({"recordingId": "000000000000", "start": 1, "end": 4})

        source = server.RECORDINGS / f"{rec['id']}.webm"
        with mock.patch.object(captions, "fetch_youtube_captions") as fetch, \
                mock.patch.object(captions, "whisper_available", return_value=True), \
                mock.patch.object(captions, "transcribe", return_value=[(1.5, 2.0, "Welcome")]):
            clip, caption_source, _ = shorts.make_clip(
                None, 1, 4, self.tmp / "clip.mp4", source=source, log=lambda m: None
            )
        fetch.assert_not_called()
        self.assertEqual(caption_source, "speech recognition")
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height", "-of", "csv=p=0", str(clip)],
            capture_output=True, text=True, check=True,
        ).stdout.split()
        self.assertIn("video,1080,1920", out)
        self.assertIn("audio", out)


class JobValidationTests(unittest.TestCase):
    def test_caption_options(self):
        job = server.new_job({"url": "https://youtu.be/dQw4w9WgXcQ", "start": "0:10", "end": "0:40"})
        self.assertTrue(job["captions"])
        self.assertEqual(job["lang"], "en")
        job = server.new_job({"url": "https://youtu.be/dQw4w9WgXcQ", "start": 1, "end": 5, "captions": False, "lang": "ar"})
        self.assertEqual((job["captions"], job["lang"]), (False, "ar"))
        with self.assertRaises(shorts.ClipError):
            server.new_job({"url": "https://youtu.be/dQw4w9WgXcQ", "start": 1, "end": 5, "lang": "en; rm -rf"})


if __name__ == "__main__":
    unittest.main()
