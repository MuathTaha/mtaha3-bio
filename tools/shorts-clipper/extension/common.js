// Shared by the popup and the recorder page.
const API = "http://127.0.0.1:8765";
const BUSY = ["queued", "working", "uploading"];
const MAX_SHORT_SECONDS = 180;
const $ = (id) => document.getElementById(id);

let token = "";

function fmt(seconds) {
  const s = Math.max(0, seconds || 0);
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

function fileUrl(path) {
  return `${API}${path}?token=${encodeURIComponent(token)}`;
}

/** Load the token and check the companion. Returns "ok", "offline" or "unpaired". */
async function connect() {
  ({ token = "" } = await chrome.storage.local.get("token"));
  const pill = $("conn");
  try {
    const health = await (await fetch(`${API}/health`, { headers: { "X-Clipper-Token": token } })).json();
    const state = health.paired ? "ok" : "unpaired";
    pill.textContent = health.paired ? "connected" : "not paired";
    pill.className = `pill ${health.paired ? "ok" : "bad"}`;
    return state;
  } catch {
    pill.textContent = "companion offline";
    pill.className = "pill bad";
    return "offline";
  }
}

function showLength() {
  const length = parse($("end").value) - parse($("start").value);
  $("length").textContent = Number.isFinite(length)
    ? `Clip length: ${length.toFixed(1)}s${length > MAX_SHORT_SECONDS ? " (too long: Shorts max out at 3 minutes)" : ""}`
    : "";
}

/** Read the clip form shared by both pages; throws a readable Error if it is incomplete. */
function clipOptions() {
  const start = parse($("start").value);
  const end = parse($("end").value);
  if (!(end > start)) throw new Error("Set a start and an end after it.");
  if (end - start > MAX_SHORT_SECONDS) throw new Error("Shorts can be at most 3 minutes.");
  if ($("auto-upload").checked && !$("title").value.trim()) throw new Error("Add a title to upload.");
  return {
    start,
    end,
    title: $("title").value,
    description: $("description").value,
    tags: $("tags").value,
    framing: $("framing").value,
    privacy: $("privacy").value,
    autoUpload: $("auto-upload").checked,
    captions: $("captions").checked,
    lang: $("lang").value,
  };
}

function jobItem(job, refresh) {
  const li = document.createElement("li");
  const title = document.createElement("div");
  title.className = "title";
  title.textContent = job.title || job.sourceTitle || job.videoId || "Clip";
  const status = document.createElement("div");
  status.className = "status";
  status.textContent = `${fmt(job.start)}–${fmt(job.end)} · ${job.status}: ${job.message}`;
  li.append(title, status);

  const actions = document.createElement("div");
  actions.className = "actions";
  if (job.hasClip) {
    const preview = document.createElement("a");
    preview.textContent = "Preview";
    preview.href = fileUrl(`/clips/${job.id}.mp4`);
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
      refresh();
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

/** Keep a <ul> of jobs up to date, polling while any is in progress. */
function jobList(listId, sectionId, filter = () => true) {
  let timer = null;
  async function refresh() {
    clearTimeout(timer);
    try {
      const jobs = (await api("/jobs")).jobs.filter(filter);
      $(sectionId).hidden = jobs.length === 0;
      $(listId).replaceChildren(...jobs.map((job) => jobItem(job, refresh)));
      if (jobs.some((j) => BUSY.includes(j.status))) timer = setTimeout(refresh, 1500);
    } catch {
      timer = setTimeout(refresh, 3000);
    }
  }
  return refresh;
}
