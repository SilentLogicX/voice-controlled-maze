// Voice-Controlled Maze
const SIZE = 15;

// 0 = open, 1 = wall
// The maze is designed so there is a clear path from start (1,1) to finish (13,13).
const MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,1,1,1,1,0,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,1,0,1,0,1],
  [1,1,1,1,1,0,1,1,1,0,1,0,1,0,1],
  [1,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,0,1,1,1,0,1,1,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,1,1,1,1,1,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,1,0,0,0,1,0,1],
  [1,1,1,1,1,1,1,0,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

let player = {r:1,c:1};
let moves = 0;
let score = 100;
let studentName = "";
let listening = false;
let recognition = null;
let gameOver = false;
let lastVoiceCommand = "";
let lastVoiceTime = 0;

const setup = document.getElementById("setup");
const game = document.getElementById("game");
const mazeEl = document.getElementById("maze");
const nameInput = document.getElementById("studentName");
const startBtn = document.getElementById("startBtn");
const voiceBtn = document.getElementById("voiceBtn");
const voiceText = document.getElementById("voiceText");
const micIcon = document.getElementById("micIcon");
const heard = document.getElementById("heard");
const movesEl = document.getElementById("moves");
const scoreEl = document.getElementById("score");
const playerNameEl = document.getElementById("playerName");
const modal = document.getElementById("winModal");
const resultText = document.getElementById("resultText");

function buildMaze() {
  mazeEl.innerHTML = "";
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.r = r;
      cell.dataset.c = c;

      if (MAZE[r][c] === 1) cell.classList.add("wall");
      if (r === 1 && c === 1) cell.classList.add("start");
      if (r === 13 && c === 13) cell.classList.add("finish");

      mazeEl.appendChild(cell);
    }
  }
  renderPlayer();
}

function renderPlayer() {
  document.querySelectorAll(".player").forEach(e => {
    e.classList.remove("player");
    e.textContent = "";
  });
  const cell = mazeEl.querySelector(`[data-r="${player.r}"][data-c="${player.c}"]`);
  if (cell) {
    cell.classList.add("player");
    cell.textContent = "🐯";
  }
}

function updateStats() {
  movesEl.textContent = moves;
  scoreEl.textContent = Math.max(0, score);
}

function startGame() {
  studentName = nameInput.value.trim() || "Student";
  player = {r:1,c:1};
  moves = 0;
  score = 100;
  gameOver = false;
  modal.classList.add("hidden");
  playerNameEl.textContent = studentName;
  setup.classList.add("hidden");
  game.classList.remove("hidden");
  buildMaze();
  updateStats();
  heard.textContent = "Heard: —";
}

function move(direction) {
  if (gameOver) return;

  const delta = {
    up: [-1,0],
    down: [1,0],
    left: [0,-1],
    right: [0,1]
  }[direction];

  if (!delta) return;

  const nr = player.r + delta[0];
  const nc = player.c + delta[1];

  // Count every command as a move. Hitting a wall costs a small amount.
  moves++;
  if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || MAZE[nr][nc] === 1) {
    score = Math.max(0, score - 2);
    flashWall();
  } else {
    player.r = nr;
    player.c = nc;
    score = Math.max(0, 100 - Math.max(0, moves - 28) * 2);
    renderPlayer();
  }
  updateStats();

  if (player.r === 13 && player.c === 13) finishGame();
}

function flashWall() {
  mazeEl.animate(
    [{transform:"translateX(0)"},{transform:"translateX(-3px)"},{transform:"translateX(3px)"},{transform:"translateX(0)"}],
    {duration:100,iterations:1}
  );
}

function finishGame() {
  gameOver = true;
  stopVoice();
  const finalScore = Math.max(0, score);
  const date = new Date().toLocaleDateString("en-IN");
  const scores = JSON.parse(localStorage.getItem("voiceMazeScores") || "[]");

  scores.push({
    name: studentName,
    moves,
    score: finalScore,
    date
  });

  // Keep the latest 50 results.
  localStorage.setItem("voiceMazeScores", JSON.stringify(scores.slice(-50)));

  resultText.innerHTML = `<b>${escapeHTML(studentName)}</b> completed the maze in <b>${moves}</b> moves with a score of <b>${finalScore}</b>.`;
  modal.classList.remove("hidden");
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
  }[c]));
}

// ---------- Speech Recognition ----------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const VOICE_COOLDOWN = 120;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;

  recognition.onstart = () => {
    listening = true;
    voiceBtn.classList.add("listening");
    micIcon.textContent = "🔴";
    voiceText.textContent = "Listening… Speak a direction";
  };

  recognition.onresult = (event) => {
    const last = event.results[event.results.length - 1];
    const text = last[0].transcript.toLowerCase().trim();
    heard.textContent = `Heard: "${text}"`;

    const direction = detectDirection(text);
    if (direction) {
      const now = performance.now();
      if (direction !== lastVoiceCommand || now - lastVoiceTime >= VOICE_COOLDOWN) {
        lastVoiceCommand = direction;
        lastVoiceTime = now;
        move(direction);
      }
    }
  };

  recognition.onerror = (event) => {
    heard.textContent = `Voice: ${event.error === "not-allowed" ? "Microphone permission denied." : event.error}`;
  };

  recognition.onend = () => {
    if (listening && !gameOver) {
      // Restart immediately for fast continuous voice control.
      try { recognition.start(); } catch (_) {}
    }
  };
} else {
  document.getElementById("browserNote").textContent =
    "Voice recognition is not supported in this browser. Use Google Chrome or Microsoft Edge.";
}

function detectDirection(text) {
  // Check longer/more specific phrases first.
  if (/\b(up|go up|move up|north)\b/.test(text)) return "up";
  if (/\b(down|go down|move down|south)\b/.test(text)) return "down";
  if (/\b(left|go left|move left|west)\b/.test(text)) return "left";
  if (/\b(right|go right|move right|east)\b/.test(text)) return "right";
  return null;
}

function startVoice() {
  if (!recognition) {
    alert("Speech recognition is not supported. Please use Chrome or Edge.");
    return;
  }
  if (listening) stopVoice();
  else {
    lastVoiceCommand = "";
    lastVoiceTime = 0;
    listening = true;
    try { recognition.start(); } catch (_) {}
  }
}

function stopVoice() {
  listening = false;
  if (recognition) {
    try { recognition.stop(); } catch (_) {}
  }
  voiceBtn.classList.remove("listening");
  micIcon.textContent = "🎙️";
  voiceText.textContent = "Start Voice Control";
}

// ---------- Events ----------
// ---------- Events ----------
startBtn.addEventListener("click", startGame);

nameInput.addEventListener("keydown", e => {
  // Allow normal typing in the name box.
  // Only Enter should start the game.
  if (e.key === "Enter") {
    e.preventDefault();
    startGame();
  }
});

voiceBtn.addEventListener("click", startVoice);

document.querySelectorAll("[data-dir]").forEach(btn => {
  btn.addEventListener("click", () => move(btn.dataset.dir));
});

// Keyboard controls
// W/A/S/D and Arrow keys control the maze ONLY when
// the user is not typing inside an input or textarea.
const KEY_TO_DIRECTION = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right",
  W: "up",
  A: "left",
  S: "down",
  D: "right"
};

document.addEventListener("keydown", e => {
  // IMPORTANT:
  // Do not capture W/A/S/D while typing the student name.
  if (
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement
  ) {
    return;
  }

  // Only allow keyboard maze controls after the game has started.
  if (game.classList.contains("hidden") || gameOver) return;

  const direction = KEY_TO_DIRECTION[e.key];

  if (!direction) return;

  // Stop browser scrolling with arrow keys.
  e.preventDefault();

  // Prevent one long key press from making many moves.
  if (e.repeat) return;

  move(direction);
});

document.getElementById("restartBtn").addEventListener("click", startGame);
document.getElementById("playAgainBtn").addEventListener("click", startGame);

// Start with setup screen.
buildMaze();

