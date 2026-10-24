// Popup: clip the YouTube video in the current tab. Helpers live in common.js.
const FIELDS = ["start", "end", "title", "description", "tags", "framing", "privacy", "lang"];

let video = null; // {videoId, url, title, time, duration} from the open YouTube tab
const refreshJobs = jobList("jobs", "jobs-section");

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
  const defaults = { title: video.title.slice(0, 90), framing: "blur", privacy: "private", lang: "en" };
  for (const field of FIELDS) $(field).value = draft[field] ?? defaults[field] ?? "";
  $("auto-upload").checked = !!draft.autoUpload;
  $("captions").checked = draft.captions ?? true;
  showLength();
}

function saveDraft() {
  const draft = Object.fromEntries(FIELDS.map((f) => [f, $(f).value]));
  draft.autoUpload = $("auto-upload").checked;
  draft.captions = $("captions").checked;
  chrome.storage.local.set({ [`draft:${video.videoId}`]: draft });
  showLength();
}

async function setNow(field) {
  const fresh = await readVideo();
  if (fresh) $(field).value = fmt(fresh.time);
  saveDraft();
}

async function createClip() {
  $("error").textContent = "";
  $("create").disabled = true;
  try {
    const options = clipOptions();
    await api("/jobs", {
      method: "POST",
      body: JSON.stringify({ url: video.url, sourceTitle: video.title, ...options }),
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

function showSetup(message) {
  $("setup").hidden = false;
  $("setup-text").textContent = message;
  $("token").value = token;
}

async function init() {
  const state = await connect();
  if (state === "offline") {
    return showSetup("Start the companion first: open a terminal in the companion folder and run  python server.py");
  }
  if (state === "unpaired") return showSetup("Paste the pairing token that server.py printed when it started.");

  $("record").hidden = false;
  try {
    video = await readVideo();
  } catch {
    video = null;
  }
  if (video) {
    $("editor").hidden = false;
    $("source").textContent = `${video.title} (${fmt(video.duration)})`;
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
$("record").onclick = () => chrome.tabs.create({ url: chrome.runtime.getURL("recorder.html") });
$("set-start").onclick = () => setNow("start");
$("set-end").onclick = () => setNow("end");
$("create").onclick = createClip;
for (const field of [...FIELDS, "auto-upload", "captions"]) $(field).addEventListener("input", () => video && saveDraft());

init();
