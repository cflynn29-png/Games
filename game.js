const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');

const TILE = 24;
const COLS = 28;
const ROWS = 28;
const maze = [
  '############################', '#............##............#', '#.####.#####.##.#####.####.#', '#o####.#####.##.#####.####o#', '#..........................#', '#.####.##.########.##.####.#', '#......##....##....##......#', '######.#####.##.#####.######', '     #.#####.##.#####.#     ', '     #.##..........##.#     ', '     #.##.###--###.##.#     ', '######.##.#      #.##.######', '      .  .#      #. .      ', '######.##.#      #.##.######', '     #.##.########.##.#     ', '     #.##..........##.#     ', '     #.##.########.##.#     ', '######.##.########.##.######', '#............##............#', '#.####.#####.##.#####.####.#', '#o..##................##..o#', '###.##.##.########.##.##.###', '#......##....##....##......#', '#.##########.##.##########.#', '#..........................#', '############################', '                            ', '                            '
];

let state = 'ready';
let score = 0;
let highScore = Number(localStorage.getItem('neonPacmanHighScore') || 0);
let level = 1;
let lives = 3;
let pellets = [];
let player;
let ghosts;
let lastTime = 0;
let accumulator = 0;
const stepTime = 145;
const directions = { left: { x: -1, y: 0, angle: Math.PI }, right: { x: 1, y: 0, angle: 0 }, up: { x: 0, y: -1, angle: -Math.PI / 2 }, down: { x: 0, y: 1, angle: Math.PI / 2 }, stop: { x: 0, y: 0, angle: 0 } };

function resetActors() {
  player = { x: 13, y: 18, direction: 'left', next: 'left', mouth: 0 };
  ghosts = [
    { x: 13, y: 13, homeX: 13, homeY: 13, color: '#ed3d45', direction: 'left', frightened: 0 },
    { x: 14, y: 13, homeX: 14, homeY: 13, color: '#ff91c8', direction: 'right', frightened: 0 },
    { x: 12, y: 13, homeX: 12, homeY: 13, color: '#32d5df', direction: 'up', frightened: 0 },
    { x: 15, y: 13, homeX: 15, homeY: 13, color: '#f59a2d', direction: 'down', frightened: 0 }
  ];
}

function buildPellets() {
  pellets = [];
  maze.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell === '.' || cell === 'o') pellets.push({ x, y, power: cell === 'o', eaten: false });
  }));
}

function startGame() {
  score = 0; level = 1; lives = 3; buildPellets(); resetActors(); state = 'playing';
  overlay.classList.add('hidden'); updateHud();
}

function tileOpen(x, y) {
  const row = maze[y];
  return row && row[x] && row[x] !== '#';
}

function canMove(actor, direction) {
  const vector = directions[direction];
  return tileOpen(actor.x + vector.x, actor.y + vector.y);
}

function movePlayer() {
  if (canMove(player, player.next)) player.direction = player.next;
  if (canMove(player, player.direction)) {
    player.x += directions[player.direction].x;
    player.y += directions[player.direction].y;
  }
  const pellet = pellets.find(item => !item.eaten && item.x === player.x && item.y === player.y);
  if (pellet) {
    pellet.eaten = true; score += pellet.power ? 50 : 10;
    if (pellet.power) ghosts.forEach(ghost => ghost.frightened = 36);
    if (pellets.every(item => item.eaten)) { level += 1; buildPellets(); resetActors(); }
  }
  player.mouth = (player.mouth + 1) % 2;
}

function moveGhost(ghost) {
  if (ghost.frightened > 0) ghost.frightened--;
  const options = Object.keys(directions).filter(direction => direction !== 'stop' && canMove(ghost, direction));
  const reverse = { left: 'right', right: 'left', up: 'down', down: 'up' }[ghost.direction];
  const available = options.filter(direction => direction !== reverse) || options;
  if (!canMove(ghost, ghost.direction) || Math.random() < .22) {
    available.sort((a, b) => {
      const vectorA = directions[a]; const vectorB = directions[b];
      const distanceA = Math.abs(ghost.x + vectorA.x - player.x) + Math.abs(ghost.y + vectorA.y - player.y);
      const distanceB = Math.abs(ghost.x + vectorB.x - player.x) + Math.abs(ghost.y + vectorB.y - player.y);
      return ghost.frightened ? distanceB - distanceA : distanceA - distanceB;
    });
    ghost.direction = available[0] || ghost.direction;
  }
  if (canMove(ghost, ghost.direction)) {
    ghost.x += directions[ghost.direction].x;
    ghost.y += directions[ghost.direction].y;
  }
}

function checkCollisions() {
  ghosts.forEach(ghost => {
    if (ghost.x !== player.x || ghost.y !== player.y) return;
    if (ghost.frightened) { score += 200; ghost.x = ghost.homeX; ghost.y = ghost.homeY; ghost.frightened = 0; }
    else loseLife();
  });
}

function loseLife() {
  lives--;
  if (lives <= 0) { state = 'gameover'; showEndOverlay('GAME OVER', 'PLAY AGAIN'); }
  else { resetActors(); state = 'playing'; }
  updateHud();
}

function tick() {
  if (state !== 'playing') return;
  movePlayer(); ghosts.forEach(moveGhost); checkCollisions(); updateHud();
}

function updateHud() {
  scoreEl.textContent = String(score).padStart(6, '0');
  highScore = Math.max(highScore, score); highScoreEl.textContent = String(highScore).padStart(6, '0');
  localStorage.setItem('neonPacmanHighScore', highScore); levelEl.textContent = String(level).padStart(2, '0');
  [...livesEl.querySelectorAll('.life')].forEach((life, index) => life.classList.toggle('empty', index >= lives));
}

function showEndOverlay(title, buttonText) {
  overlay.querySelector('.overlay-kicker').textContent = title;
  startButton.textContent = buttonText; overlay.classList.remove('hidden');
}

function draw() {
  ctx.fillStyle = '#020c31'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.translate(0, 0);
  maze.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell === '#') { ctx.fillStyle = '#2952e6'; ctx.fillRect(x * TILE + 3, y * TILE + 3, TILE - 6, TILE - 6); }
  }));
  pellets.filter(item => !item.eaten).forEach(item => { ctx.fillStyle = item.power ? '#ffd21a' : '#f2eddf'; const radius = item.power ? 5 : 2; ctx.beginPath(); ctx.arc(item.x * TILE + TILE / 2, item.y * TILE + TILE / 2, radius, 0, Math.PI * 2); ctx.fill(); });
  ghosts.forEach(drawGhost); drawPlayer(); ctx.restore();
}

function drawPlayer() {
  const centerX = player.x * TILE + TILE / 2; const centerY = player.y * TILE + TILE / 2; const direction = directions[player.direction] || directions.right;
  ctx.fillStyle = '#ffd21a'; ctx.beginPath();
  const bite = player.mouth ? .28 : .08; ctx.moveTo(centerX, centerY); ctx.arc(centerX, centerY, 9, direction.angle + bite, direction.angle + Math.PI * 2 - bite); ctx.closePath(); ctx.fill();
}

function drawGhost(ghost) {
  const x = ghost.x * TILE + 4; const y = ghost.y * TILE + 5; const color = ghost.frightened ? '#3552bb' : ghost.color;
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + 8, y + 7, 8, Math.PI, 0); ctx.lineTo(x + 16, y + 16); ctx.lineTo(x + 13, y + 13); ctx.lineTo(x + 10, y + 16); ctx.lineTo(x + 7, y + 13); ctx.lineTo(x + 4, y + 16); ctx.lineTo(x, y + 16); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f2eddf'; ctx.beginPath(); ctx.arc(x + 5, y + 7, 3, 0, Math.PI * 2); ctx.arc(x + 11, y + 7, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#17151c'; ctx.beginPath(); ctx.arc(x + 5, y + 7, 1.3, 0, Math.PI * 2); ctx.arc(x + 11, y + 7, 1.3, 0, Math.PI * 2); ctx.fill();
}

function frame(time = 0) {
  const elapsed = time - lastTime; lastTime = time; accumulator += elapsed;
  while (accumulator >= stepTime) { tick(); accumulator -= stepTime; }
  draw(); requestAnimationFrame(frame);
}

function setDirection(direction) { if (state === 'ready') startGame(); player.next = direction; }
window.addEventListener('keydown', event => {
  const keyMap = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
  if (keyMap[event.key]) { event.preventDefault(); setDirection(keyMap[event.key]); }
  if (event.key === 'Enter' && state !== 'playing') startGame();
  if (event.key === ' ' && state === 'playing') togglePause();
});
document.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => setDirection(button.dataset.direction)));
startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);
function togglePause() { if (state === 'playing') { state = 'paused'; showEndOverlay('PAUSED', 'RESUME'); } else if (state === 'paused') { state = 'playing'; overlay.classList.add('hidden'); } }

buildPellets(); resetActors(); highScoreEl.textContent = String(highScore).padStart(6, '0'); requestAnimationFrame(frame);
