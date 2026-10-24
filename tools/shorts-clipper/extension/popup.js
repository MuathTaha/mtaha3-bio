const API = "http://127.0.0.1:8765";
const BUSY = ["queued", "downloading", "cutting", "uploading"];
const FIELDS = ["start", "end", "title", "description", "tags", "framing", "privacy"];
const $ = (id) => document.getElementById(id);

let token = "";
let video = null; // {videoId, url, title, time, duration} from the open YouTube tab
let pollTimer = null;

function fmt(seconds) {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = (s % 60).toFixed(1).padStart(4, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${rest}` : `${m}:${rest}`;
}

function parse(value) {
  const parts = String(value).trim().split(":").map(Number);
  if (!value || parts.some(Number.isNaN)) return NaN;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

async function api(path, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: { "Content-Type": "application/json", "X-Clipper-Token": token, ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

// Runs inside the YouTube tab.
function readPlayer() {
  const el = document.querySelector("video.html5-main-video") || document.querySelector("video");
  const match = location.href.match(/(?:v=|\/shorts\/|\/live\/)([\w-]{11})/);
  if (!el || !match) return null;
  return {
    videoId: match[1],
    url: location.href,
    title: document.title.replace(/^\(\d+\)\s*/, "").replace(/ - YouTube$/, ""),
    time: el.currentTime,
    duration: el.duration,
  };
}

async function readVideo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https:\/\/(www\.|m\.)?youtube\.com\/(watch|shorts|live)/.test(tab.url || "")) return null;
  const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readPlayer });
  return result && result.result;
}

// The popup closes whenever you click back into the video, so drafts are kept per video.
async function loadDraft() {
  const key = `draft:${video.videoId}`;
  const { [key]: draft = {} } = await chrome.storage.local.get(key);
  const defaults = { title: video.title.slice(0, 90), framing: "blur", privacy: "private" };
  for (const field of FIELDS) $(field).value = draft[field] ?? defaults[field] ?? "";
  $("auto-upload").checked = !!draft.autoUpload;
  showLength();
}

function saveDraft() {
  const draft = Object.fromEntries(FIELDS.map((f) => [f, $(f).value]));
  draft.autoUpload = $("auto-upload").checked;
  chrome.storage.local.set({ [`draft:${video.videoId}`]: draft });
  showLength();
}

function showLength() {
  const length = parse($("end").value) - parse($("start").value);
  $("length").textContent = Number.isFinite(length)
    ? `Clip length: ${length.toFixed(1)}s${length > 180 ? " (too long: Shorts max out at 3 minutes)" : ""}`
    : "";
}

async function setNow(field) {
  const fresh = await readVideo();
  if (fresh) $(field).value = fmt(fresh.time);
  saveDraft();
}

async function createClip() {
  $("error").textContent = "";
  const start = parse($("start").value);
  const end = parse($("end").value);
  if (!(end > start)) return ($("error").textContent = "Set a start and an end after it.");
  if (end - start > 180) return ($("error").textContent = "Shorts can be at most 3 minutes.");
  if ($("auto-upload").checked && !$("title").value.trim()) return ($("error").textContent = "Add a title to upload.");
  $("create").disabled = true;
  try {
    await api("/jobs", {
      method: "POST",
      body: JSON.stringify({
        url: video.url,
        sourceTitle: video.title,
        start,
        end,
        title: $("title").value,
        description: $("description").value,
        tags: $("tags").value,
        framing: $("framing").value,
        privacy: $("privacy").value,
        autoUpload: $("auto-upload").checked,
      }),
    });
    chrome.storage.local.remove(`draft:${video.videoId}`);
    $("start").value = $("end").value = "";
    showLength();
    await refreshJobs();
  } catch (error) {
    $("error").textContent = error.message;
  } finally {
    $("create").disabled = false;
  }
}

function jobItem(job) {
  const li = document.createElement("li");
  const title = document.createElement("div");
  title.className = "title";
  title.textContent = job.title || job.sourceTitle || job.videoId;
  const status = document.createElement("div");
  status.className = "status";
  status.textContent = `${fmt(job.start)}–${fmt(job.end)} · ${job.status}: ${job.message}`;
  li.append(title, status);

  const actions = document.createElement("div");
  actions.className = "actions";
  if (job.hasClip) {
    const preview = document.createElement("a");
    preview.textContent = "Preview";
    preview.href = `${API}/clips/${job.id}.mp4?token=${encodeURIComponent(token)}`;
    preview.target = "_blank";
    actions.append(preview);
  }
  if (job.hasClip && (job.status === "ready" || job.status === "failed")) {
    const upload = document.createElement("button");
    upload.textContent = job.status === "failed" ? "Retry upload" : `Upload (${job.privacy})`;
    upload.onclick = async () => {
      upload.disabled = true;
      try {
        await api(`/jobs/${job.id}/upload`, { method: "POST", body: "{}" });
      } catch (error) {
        status.textContent = error.message;
      }
      refreshJobs();
    };
    actions.append(upload);
  }
  if (job.youtubeId) {
    const link = document.createElement("a");
    link.textContent = "Open on YouTube";
    link.href = `https://youtube.com/shorts/${job.youtubeId}`;
    link.target = "_blank";
    actions.append(link);
  }
  if (actions.childElementCount) li.append(actions);
  return li;
}

async function refreshJobs() {
  clearTimeout(pollTimer);
  try {
    const { jobs } = await api("/jobs");
    $("jobs-section").hidden = jobs.length === 0;
    $("jobs").replaceChildren(...jobs.map(jobItem));
    if (jobs.some((j) => BUSY.includes(j.status))) pollTimer = setTimeout(refreshJobs, 1500);
  } catch {
    pollTimer = setTimeout(refreshJobs, 3000);
  }
}

function showSetup(message) {
  $("setup").hidden = false;
  $("setup-text").textContent = message;
  $("token").value = token;
}

async function init() {
  ({ token = "" } = await chrome.storage.local.get("token"));
  let health;
  try {
    health = await (await fetch(`${API}/health`, { headers: { "X-Clipper-Token": token } })).json();
  } catch {
    $("conn").textContent = "companion offline";
    $("conn").className = "pill bad";
    return showSetup("Start the companion first: open a terminal in the companion folder and run  python server.py");
  }
  if (!health.paired) {
    $("conn").textContent = "not paired";
    $("conn").className = "pill bad";
    return showSetup("Paste the pairing token that server.py printed when it started.");
  }
  $("conn").textContent = "connected";
  $("conn").className = "pill ok";

  try {
    video = await readVideo();
  } catch {
    video = null;
  }
  if (video) {
    $("editor").hidden = false;
    $("source").textContent = `${video.title} (${fmt(video.duration || 0)})`;
    await loadDraft();
  } else {
    $("not-youtube").hidden = false;
  }
  refreshJobs();
}

$("save-token").onclick = async () => {
  await chrome.storage.local.set({ token: $("token").value.trim() });
  location.reload();
};
$("settings").onclick = (event) => {
  event.preventDefault();
  $("setup").hidden ? showSetup("Pairing token from server.py:") : ($("setup").hidden = true);
};
$("set-start").onclick = () => setNow("start");
$("set-end").onclick = () => setNow("end");
$("create").onclick = createClip;
for (const field of [...FIELDS, "auto-upload"]) $(field).addEventListener("input", () => video && saveDraft());

init();
