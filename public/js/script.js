/** @type {HTMLParagraphElement} */
const p = document.getElementById('text');

/** @type {HTMLParagraphElement} */
const loading = document.getElementById('loading');

/** @type {HTMLTextAreaElement} */
const input = document.getElementById('input');

/** @type {HTMLButtonElement} */
const btnPlay = document.getElementById('btn_play');

/** @type {HTMLDivElement} */
const form = document.getElementById('form');

/** @type {HTMLDivElement} */
const controlsContainer = document.getElementById('controls_container');

/** @type {HTMLDivElement} */
const endContainer = document.getElementById('end_container');

/** @type {HTMLButtonElement} */
const btnRestart = document.getElementById('btn_restart');

/** @type {HTMLParagraphElement} */
const playerWin = document.getElementById('player_win');

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let text = '';
let players = [];
let scale = 1;
let spritesheet;

const resize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight / 2;
  scale = Math.floor(canvas.width / 200);
}
resize();
window.addEventListener('resize', resize);

const background = (() => {
  const offscreencanvas = new OffscreenCanvas(canvas.width, canvas.height);
  const offctx = offscreencanvas.getContext('2d');

  for (let i = 0; i <= 2; i++) {

    const y = canvas.height / 2 * i;

    offctx.save();
    offctx.lineWidth = 2;
    offctx.setLineDash([10, 5]);
    offctx.strokeStyle = '#fff';
    offctx.moveTo(0, y);
    offctx.lineTo(canvas.width, y);
    offctx.stroke();
    offctx.restore();
  }

  return offscreencanvas;
})();

const onDisconnect = () => {
  btnPlay.classList.remove('hidde');
  controlsContainer.classList.add('hidde');
  endContainer.classList.add('hidde');
  playerWin.innerText = "";
  players = [];
  p.innerHTML = "";
  input.value = "";
  text = "";
}

const onStart = (data) => {
  text = data.text
  input.maxLength = text.length;
  input.disabled = false;
  input.focus();

  for (let i = 0; i < text.length; i++) {
    p.innerHTML += `<span>${text[i]}</span>`;
  }

  loading.classList.add('hidde');
  controlsContainer.classList.remove('hidde');
  input.style.width = p.clientWidth + "px";
  input.style.height = p.clientHeight + "px";
}

const onEnd = (win) => {
  endContainer.classList.remove('hidde');
  input.disabled = true;
  playerWin.innerText = win;
}

const onUpdate = data => players = data.players;

const play = (data) => {
  loading.classList.remove('hidde');

  const io = network(data);

  io.onDisconnect(onDisconnect);

  io.onOpponentDisconnected(() => alert(`Jogador ${players[0].name} desconectou!`))

  io.onUpdate(onUpdate);

  io.onStart(onStart);

  io.onEnd(onEnd);

  const sendMessage = () => {
    let spans = Array.from(p.children);

    io.typing(input.value, (data) => {
      for (let i = 0; i < data.length; i++) {
        let span = spans[i];
        if (span) {
          switch (data[i]) {
            case 'correct':
              spans[i].classList.remove('error');
              spans[i].classList.add('correct');
              break;
            case 'error':
              spans[i].classList.remove('correct');
              spans[i].classList.add('error');
              break;
            default:
              spans[i].classList.remove('correct', 'error');
              break;
          }
        }
      }
    });
  }

  input.oninput = sendMessage;
  input.onpaste = (e) => e.preventDefault();
  input.onkeydown = (e) => {
    if (e.key == "Tab") {
      e.preventDefault();
      input.value += "  ";
      sendMessage();
    }
  }

  btnRestart.onclick = () => io.disconnect();
}

btnPlay.onclick = () => {
  btnPlay.classList.add('hidde');
  form.classList.remove('hidde');
}

form.onsubmit = (e) => {
  e.preventDefault();

  const data = new FormData(form);
  const name = data.get('name');
  const character = parseInt(data.get('character'));

  if (name.trim().length != 0) {
    form.classList.add('hidde');
    play({ name, character });
  }
}

const drawCharacter = (progress, name, character, index) => {
  const frameX = 1 + Math.floor(Date.now() % 250 / 125);
  const frameY = character;

  const frameWidth = spritesheet.width / 3;
  const frameHeight = spritesheet.height / 2;

  const width = frameWidth * scale;
  const height = frameHeight * scale;

  let x = 10 + (progress / text.length * (canvas.width - width - 20));
  let y = ((index + 1) * canvas.height / 2) - height;

  ctx.fillStyle = index == 0 ? "#fff" : "#000";
  ctx.font = "bold 1.5em monospace";

  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(name, x + width / 2, y);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spritesheet, frameX * frameWidth, frameY * frameHeight, frameWidth, frameHeight, x, y, width, height);
}

const loop = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(background, 0, 0);

  for (let i = 0; i < players.length; i++) {
    const { progress, name, character } = players[i];
    drawCharacter(progress, name, character, i)
  }

  window.requestAnimationFrame(loop);
}

(async () => {
  spritesheet = new Image();
  spritesheet.src = "./images/spritesheet.png";
  await new Promise((resolve) => spritesheet.onload = () => resolve());
  loop();
})();