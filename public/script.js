let socket;

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
ctx.imageSmoothingEnabled = false;

let text = '';
let scale = 2;
let players = [];

input.onpaste = (e) => e.preventDefault();

const sendMessage = () => {
  let spans = Array.from(p.children);

  socket.emit('typing', input.value, (data) => {
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

input.onkeydown = (e) => {
  if (e.key == "Tab") {
    e.preventDefault();
    input.value += "  ";
    sendMessage();
  }
}

input.oninput = sendMessage;

const getImage = async (src) => {
  const image = new Image();
  image.src = src;
  await new Promise((resolve) => image.onload = resolve(image));
  return image;
}

const drawSprite = (img, x, y, w, h) => {
  ctx.drawImage(img, x, y, w, h)
}
let man = [];
let woman = [];

let characters = [];

const drawCharacter = (progress, name, character, index) => {
  let frames = characters[character];
  let i = Math.floor((Date.now() % 250) / 125);
  const frame = frames[i];

  let x = 10 + (progress / text.length * (canvas.width - frame.width - 20));
  let y = (index + 1) * canvas.height / 2 - frame.height * 2;

  ctx.fillStyle = "#000";
  ctx.font = "bold 1em monospace";

  ctx.fillText(name, x, y - 10);
  drawSprite(frame, x, y, frame.width * scale, frame.height * scale);
}

const img = (() => {
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

const loop = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(img, 0, 0);

  for (let i = 0; i < players.length; i++) {
    const { progress, name, character } = players[i];
    drawCharacter(progress, name, character, i)
  }

  window.requestAnimationFrame(loop);
}

const play = (data) => {
  loading.classList.remove('hidde');
  socket = io();

  socket.on('disconnect', () => {
    socket = null;
    btnPlay.classList.remove('hidde');
    controlsContainer.classList.add('hidde');
    endContainer.classList.add('hidde');
    playerWin.innerText = "";
    players = [];
    p.innerHTML = "";
    input.value = "";
    text = "";
  })

  socket.emit('join', data);

  socket.on('updatePlayers', data => players = data.players);

  socket.on('start', (data) => {
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
  });

  socket.on('opponent_disconnected', () => socket.disconnect());

  socket.on('end', (win) => {
    endContainer.classList.remove('hidde');
    input.disabled = true;
    playerWin.innerText = win;
  });
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

btnRestart.onclick = () => socket.disconnect();

(async () => {
  const man_walk1 = await getImage('./images/man_walk1.png');
  const man_walk2 = await getImage('./images/man_walk2.png');

  const woman_walk1 = await getImage('./images/woman_walk1.png');
  const woman_walk2 = await getImage('./images/woman_walk2.png');

  man = [man_walk1, man_walk2];
  woman = [woman_walk1, woman_walk2];

  characters = [man, woman];

  loop();
})();