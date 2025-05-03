const WebSocket = require('ws');
const { MongoClient } = require('mongodb');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(__dirname, 'logs/server.log') }),
  ],
});

// MongoDB
const mongoUrl = 'mongodb://root:example@localhost:27017/';
const dbName = 'pr32_db';
const collectionName = 'moviments';
let db, collection;

// WebSocket Server
const wss = new WebSocket.Server({ port: 8080 });
logger.info('Servidor WebSocket escoltant al port 8080...');

MongoClient.connect(mongoUrl).then(client => {
  db = client.db(dbName);
  collection = db.collection(collectionName);
  logger.info('Connexió a MongoDB establerta.');
}).catch(err => logger.error('Error connectant a MongoDB:', err));

wss.on('connection', ws => {
  logger.info('Nou client connectat.');

  let sessionId = Date.now().toString(); 
  let partida = [];
  let timeout;
  let lastPosition = null;

  function resetInactivityTimer() {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      logger.info(`Partida ${sessionId} finalitzada per inactivitat.`);

      if (partida.length >= 2) {
        const first = partida[0];
        const last = partida[partida.length - 1];
        const dx = last.x - first.x;
        const dy = last.y - first.y;
        const distancia = Math.sqrt(dx ** 2 + dy ** 2);

        ws.send(JSON.stringify({
          type: 'game_over',
          distancia: distancia.toFixed(2)
        }));

        logger.info(`Distància línia recta: ${distancia.toFixed(2)}`);
      }

      sessionId = Date.now().toString(); 
      partida = [];
    }, 10000); 
  }

  ws.on('message', async message => {
    try {
      const data = JSON.parse(message);
      if (typeof data.x === 'number' && typeof data.y === 'number') {
        const moviment = {
          sessionId,
          timestamp: new Date(),
          x: data.x,
          y: data.y,
        };

        partida.push(moviment);
        lastPosition = moviment;

        await collection.insertOne(moviment);
        logger.info(`Moviment registrat: ${JSON.stringify(moviment)}`);

        resetInactivityTimer();
      }
    } catch (err) {
      logger.error('Error processant el missatge:', err);
    }
  });

  ws.on('close', () => {
    clearTimeout(timeout);
    logger.info('Client desconnectat.');
  });
});
