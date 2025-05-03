const WebSocket = require('ws');
const readline = require('readline');

const ws = new WebSocket('ws://localhost:8080');

let pos = { x: 0, y: 0 };

ws.on('open', () => {
  console.log('Connectat al servidor WebSocket!');
  console.log('Utilitza les fletxes (← ↑ → ↓) per moure\'t. Ctrl+C per sortir.');
});

ws.on('message', message => {
  const data = JSON.parse(message);
  if (data.type === 'game_over') {
    console.log(`Partida finalitzada. Distància recorreguda: ${data.distancia}`);
  }
});

// Captura tecles
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

process.stdin.on('keypress', (str, key) => {
  if (key.ctrl && key.name === 'c') {
    process.exit();
  }

  switch (key.name) {
    case 'up': pos.y--; break;
    case 'down': pos.y++; break;
    case 'left': pos.x--; break;
    case 'right': pos.x++; break;
    default: return;
  }

  ws.send(JSON.stringify(pos));
});
