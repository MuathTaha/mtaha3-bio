// Recorder page: record a tab, window or screen, stream it to the companion,
// then cut clips from the recording. Helpers live in common.js.
const CHUNK_MS = 4000;

let session = null; // the recording in progress
let selected = null; // the recording being clipped
const refreshJobs = jobList("jobs", "jobs-section", (job) => selected && job.recordingId === selected.id);

// Combine screen audio and microphone into one track, since MediaRecorder records only one.
function mixAudio(streams) {
  const sources = streams.filter((s) => s && s.getAudioTracks().length);
  if (sources.length <= 1) return { tracks: sources.flatMap((s) => s.getAudioTracks()), context: null };
  const context = new AudioContext();
  const destination = context.createMediaStreamDestination();
  for (const stream of sources) context.createMediaStreamSource(stream).connect(destination);
  return { tracks: destination.stream.getAudioTracks(), context };
}

async function sendChunk(id, seq, blob) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(`${API}/recordings/${id}/chunk?seq=${seq}`, {
        method: "POST",
        headers: { "X-Clipper-Token": token, "Content-Type": "application/octet-stream" },
        body: blob,
      });
      if (response.ok) return;
      const { error } = await response.json();
      throw new Error(error || `Saving failed (${response.status})`);
    } catch (error) {
      if (attempt >= 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
}

async function startRecording() {
  $("rec-error").textContent = "";
  let display;
  try {
    display = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: true,
      systemAudio: "include",
      selfBrowserSurface: "exclude",
    });
  } catch {
    return; // the picker was cancelled
  }
  let mic = null;
  if ($("mic").checked) {
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true } });
    } catch {
      $("rec-error").textContent = "Microphone not available; recording without it.";
    }
  }
  const audio = mixAudio([display, mic]);
  const stream = new MediaStream([...display.getVideoTracks(), ...audio.tracks]);
  const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((type) =>
    MediaRecorder.isTypeSupported(type),
  );

  let recording;
  try {
    recording = await api("/recordings", { method: "POST", body: JSON.stringify({ name: $("rec-name").value }) });
  } catch (error) {
    [display, mic].forEach((s) => s && s.getTracks().forEach((t) => t.stop()));
    $("rec-error").textContent = error.message;
    return;
  }

  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
  session = { id: recording.id, recorder, seq: 0, bytes: 0, chain: Promise.resolve(), failed: null, started: Date.now() };
  const current = session;

  recorder.ondataavailable = (event) => {
    if (!event.data.size || current.failed) return;
    const seq = current.seq++;
    current.chain = current.chain
      .then(() => sendChunk(current.id, seq, event.data))
      .then(() => {
        current.bytes += event.data.size;
        $("rec-sent").textContent = `${(current.bytes / 1e6).toFixed(1)} MB saved`;
      })
      .catch((error) => {
        current.failed = error;
        $("rec-error").textContent = `Could not save the recording (${error.message}). Is the companion still running?`;
        if (recorder.state !== "inactive") recorder.stop();
      });
  };
  recorder.onstop = async () => {
    clearInterval(current.timer);
    [display, mic].forEach((s) => s && s.getTracks().forEach((t) => t.stop()));
    if (audio.context) audio.context.close();
    $("stop-rec").disabled = true;
    $("stop-rec").textContent = "Saving…";
    await current.chain;
    try {
      const done = await api(`/recordings/${current.id}/finish`, { method: "POST", body: "{}" });
      if (done.status !== "ready") throw new Error(done.error || "The recording could not be saved.");
      await refreshRecordings();
      openRecording(done);
    } catch (error) {
      $("rec-error").textContent = error.message;
      refreshRecordings();
    }
    session = null;
    $("recording").hidden = true;
    $("start-rec").hidden = false;
    $("stop-rec").disabled = false;
    $("stop-rec").textContent = "■ Stop recording";
  };
  // Chrome's own "Stop sharing" button ends the video track.
  display.getVideoTracks()[0].addEventListener("ended", () => recorder.state !== "inactive" && recorder.stop());

  recorder.start(CHUNK_MS);
  current.timer = setInterval(() => ($("rec-time").textContent = fmt((Date.now() - current.started) / 1000)), 200);
  $("start-rec").hidden = true;
  $("recording").hidden = false;
  $("rec-sent").textContent = "0 MB saved";
}

function recordingItem(rec) {
  const li = document.createElement("li");
  li.className = selected && selected.id === rec.id ? "selected" : "";
  const info = document.createElement("div");
  info.className = "info";
  const name = document.createElement("div");
  name.className = "title";
  name.textContent = rec.name;
  const meta = document.createElement("div");
  meta.className = "status";
  meta.textContent =
    rec.status === "ready"
      ? `${fmt(rec.duration)} · ${(rec.size / 1e6).toFixed(1)} MB · ${new Date(rec.created * 1000).toLocaleString()}`
      : rec.status === "failed" ? `failed: ${rec.error || ""}` : "recording…";
  info.append(name, meta);
  li.append(info);

  if (rec.status === "ready") {
    const open = document.createElement("button");
    open.textContent = "Clip";
    open.onclick = () => openRecording(rec);
    li.append(open);
  }
  if (rec.status !== "recording") {
    const remove = document.createElement("button");
    remove.className = "ghost";
    remove.textContent = "Delete";
    remove.onclick = async () => {
      if (!confirm(`Delete "${rec.name}"? Clips already made from it are kept.`)) return;
      await api(`/recordings/${rec.id}`, { method: "DELETE" });
      if (selected && selected.id === rec.id) {
        selected = null;
        $("editor").hidden = $("jobs-section").hidden = true;
      }
      refreshRecordings();
    };
    li.append(remove);
  }
  return li;
}

async function refreshRecordings() {
  const { recordings } = await api("/recordings");
  $("recordings").replaceChildren(...recordings.map(recordingItem));
  $("no-recordings").hidden = recordings.length > 0;
}

function openRecording(rec) {
  selected = rec;
  $("editor").hidden = false;
  $("editing").textContent = `· ${rec.name}`;
  $("player").src = fileUrl(`/recordings/${rec.id}.webm`);
  $("start").value = $("end").value = $("title").value = "";
  showLength();
  refreshRecordings();
  refreshJobs();
  $("editor").scrollIntoView({ behavior: "smooth" });
}

async function createClip() {
  $("error").textContent = "";
  $("create").disabled = true;
  try {
    const options = clipOptions();
    await api("/jobs", { method: "POST", body: JSON.stringify({ recordingId: selected.id, ...options }) });
    $("start").value = $("end").value = "";
    showLength();
    await refreshJobs();
  } catch (error) {
    $("error").textContent = error.message;
  } finally {
    $("create").disabled = false;
  }
}

async function init() {
  const state = await connect();
  if (state !== "ok") {
    $("offline").hidden = false;
    $("offline").textContent =
      state === "offline"
        ? "The companion isn't running. Start it with  python server.py  and reload this page."
        : "Not paired yet. Open the extension's popup, paste the pairing token in Settings, then reload this page.";
    return;
  }
  $("app").hidden = false;
  await refreshRecordings();
}

$("start-rec").onclick = startRecording;
$("stop-rec").onclick = () => session && session.recorder.state !== "inactive" && session.recorder.stop();
$("set-start").onclick = () => (($("start").value = fmt($("player").currentTime)), showLength());
$("set-end").onclick = () => (($("end").value = fmt($("player").currentTime)), showLength());
$("start").addEventListener("input", showLength);
$("end").addEventListener("input", showLength);
$("create").onclick = createClip;
window.addEventListener("beforeunload", (event) => {
  if (session) event.preventDefault(); // closing the tab would end the recording
});

init();
