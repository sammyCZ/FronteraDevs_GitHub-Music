// -------- TONE SETUP --------
const synth = new Tone.PolySynth(Tone.Synth).toDestination();

const soundMap = {
  PushEvent: ["C4", "E4", "G4"],
  PullRequestEvent: ["F4", "A4", "C5"],
  IssuesEvent: ["G3", "B3", "D4"],
  WatchEvent: ["C5"]
};

// -------- VISUAL MAPPING --------
const eventVisualMap = {
  PushEvent: { color: [255, 160, 200], key: 0 },
  PullRequestEvent: { color: [170, 255, 200], key: 1 },
  IssuesEvent: { color: [170, 200, 255], key: 2 },
  WatchEvent: { color: [220, 180, 255], key: 3 }
};

const eventLabelMap = {
  PushEvent: "PE",
  PullRequestEvent: "PR",
  IssuesEvent: "IE",
  WatchEvent: "WE"
};

// -------- UI --------
const button = document.getElementById("start");
const repoInput = document.getElementById("repo");

button.onclick = async () => {
  await Tone.start();
  fetchEvents(repoInput.value);
};

// -------- GITHUB FETCH --------
async function fetchEvents(repo) {
  const url = `https://api.github.com/repos/${repo}/events`;
  const res = await fetch(url);
  const events = await res.json();
  playEvents(events);
}

// -------- PLAY EVENTS --------
let visuals = [];

function playEvents(events) {
  Tone.Transport.stop();
  Tone.Transport.cancel();
  visuals = [];

  events.forEach((e, i) => {
    const notes = soundMap[e.type];
    const visual = eventVisualMap[e.type];
    if (!notes || !visual) return;

    Tone.Transport.scheduleOnce((time) => {
      synth.triggerAttackRelease(notes, "0.4", time);

      visuals.push({
        born: Date.now(),
        key: visual.key,
        yOffset: 0,
        color: visual.color,
        label: eventLabelMap[e.type]
      });
    }, i * 0.25);
  });

  Tone.Transport.start();
}

// -------- VISUALS (p5.js) --------
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

    // ---- VERTICAL GRID LINES ----
    p.stroke(50);
    for (let i = 1; i < keyCount; i++) {
      p.line(i * keyWidth, 0, i * keyWidth, p.height);
    }
    p.noStroke();

    // ---- NOTES ----
    visuals.forEach((v) => {
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

    for (let i = 0; i < keyCount; i++) {
      p.fill(230);
      p.rect(i * keyWidth, yStart, keyWidth, pianoHeight);

      p.stroke(120);
      p.line(i * keyWidth, yStart, i * keyWidth, p.height);
      p.noStroke();

      const labels = ["C", "F", "G", "C"];
      p.fill(40);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.textSize(12);
      p.text(labels[i], i * keyWidth + keyWidth / 2, p.height - 8);
    }
  }

  p.windowResized = () => {
    p.resizeCanvas(container.clientWidth, container.clientHeight);
  };
});
