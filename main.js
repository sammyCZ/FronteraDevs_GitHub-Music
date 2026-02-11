// -------- TONE --------
const synth = new Tone.PolySynth(Tone.Synth).toDestination();

const soundMap = {
  PushEvent: ["C4", "E4", "G4"],
  PullRequestEvent: ["F4", "A4", "C5"],
  IssuesEvent: ["G3", "B3", "D4"],
  WatchEvent: ["C5"],
  CreateEvent: ["D4", "F4", "A4"]
};

const eventVisualMap = {
  PushEvent: { color: [255, 160, 200], key: 0 },
  PullRequestEvent: { color: [170, 255, 200], key: 1 },
  IssuesEvent: { color: [170, 200, 255], key: 2 },
  WatchEvent: { color: [220, 180, 255], key: 3 },
  CreateEvent: { color: [255, 220, 140], key: 0 }
};

const eventLabelMap = {
  PushEvent: "PE",
  PullRequestEvent: "PR",
  IssuesEvent: "IE",
  WatchEvent: "WE",
  CreateEvent: "CE"
};

// -------- STATE --------
let visuals = [];
let seenEventIds = new Set();
let pollInterval = null;
let latestEventTime = null;

// queue + playback control
let eventQueue = [];
let isPlaying = false;

// -------- UI --------
const button = document.getElementById("start");
const repoInput = document.getElementById("repo");

button.onclick = async () => {
  if (!repoInput.value) return;

  await Tone.start();

  visuals = [];
  seenEventIds.clear();
  eventQueue = [];
  latestEventTime = null;

  document.getElementById("events").innerHTML = "";

  if (pollInterval) clearInterval(pollInterval);

  fetchNewEvents(repoInput.value);
  pollInterval = setInterval(() => {
    fetchNewEvents(repoInput.value);
  }, 15000);
};

// -------- FETCH --------
async function fetchNewEvents(repo) {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/events`);
    const events = await res.json();

    events.reverse().forEach(event => {
      const eventTime = new Date(event.created_at).getTime();

      if (latestEventTime && eventTime <= latestEventTime) return;
      if (seenEventIds.has(event.id)) return;

      seenEventIds.add(event.id);
      enqueueEvent(event);

      latestEventTime = Math.max(latestEventTime ?? 0, eventTime);
    });
  } catch (err) {
    console.error("GitHub fetch failed", err);
  }
}


// -------- QUEUE --------
function enqueueEvent(event) {
  if (eventQueue.length > 50) return;

  eventQueue.push(event);
  addToFeed(event);
  processQueue();
}

function processQueue() {
  if (isPlaying || eventQueue.length === 0) return;

  isPlaying = true;
  const event = eventQueue.shift();

  const notes = soundMap[event.type];
  const visual = eventVisualMap[event.type];

  if (notes && visual) {
    const duration =
      event.type === "PushEvent" ? "0.6" :
      event.type === "PullRequestEvent" ? "0.7" :
      "0.4";

    synth.triggerAttackRelease(notes, duration);

    visuals.push({
      born: Date.now(),
      key: visual.key,
      yOffset: 0,
      color: visual.color,
      label: eventLabelMap[event.type]
    });
  }

  // adaptive spacing based on backlog
  const delay = Math.min(600, 200 + eventQueue.length * 10);

  setTimeout(() => {
    isPlaying = false;
    processQueue();
  }, delay);
}

// -------- ACTIVITY FEED --------
function addToFeed(event) {
  const feed = document.getElementById("events");

  const li = document.createElement("li");
  li.innerHTML = `
    <img src="${event.actor.avatar_url}" />
    <div>
      <strong>${event.actor.login}</strong>
      <span>${event.type.replace("Event", "")}</span>
    </div>
  `;

  feed.prepend(li);

  if (feed.children.length > 15) {
    feed.removeChild(feed.lastChild);
  }
}

// -------- VISUALS --------
new p5((p) => {
  const pianoHeight = 90;
  const keyCount = 4;
  let container;

  p.setup = () => {
    container = document.getElementById("viz-container");
    const c = p.createCanvas(container.clientWidth, container.clientHeight);
    c.parent("canvas");
  };

  p.draw = () => {
    p.background(15);
    const keyWidth = p.width / keyCount;

    // grid lines
    p.stroke(50);
    for (let i = 1; i < keyCount; i++) {
      p.line(i * keyWidth, 0, i * keyWidth, p.height);
    }
    p.noStroke();

    visuals.forEach(v => {
      const age = Date.now() - v.born;
      v.yOffset = age * 0.05;

      const x = v.key * keyWidth + keyWidth / 2;
      const y = p.height - pianoHeight - v.yOffset;

      p.fill(...v.color);
      p.circle(x, y, 22);

      p.fill(30);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(10);
      p.text(v.label, x, y);
    });

    visuals = visuals.filter(v => Date.now() - v.born < 6000);
    drawPiano(p, keyWidth);
  };

  function drawPiano(p, keyWidth) {
    const yStart = p.height - pianoHeight;
    const labels = ["C", "F", "G", "C"];

    for (let i = 0; i < keyCount; i++) {
      p.fill(230);
      p.rect(i * keyWidth, yStart, keyWidth, pianoHeight);

      p.stroke(120);
      p.line(i * keyWidth, yStart, i * keyWidth, p.height);
      p.noStroke();

      p.fill(40);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.text(labels[i], i * keyWidth + keyWidth / 2, p.height - 8);
    }
  }

  p.windowResized = () => {
    p.resizeCanvas(container.clientWidth, container.clientHeight);
  };
});
