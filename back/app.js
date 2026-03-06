import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server as socketIo } from 'socket.io';
import { router } from './app/routers/index.js';

const app = express();
const server = createServer(app);

// Configration CORS dynamique
const allowedOrigins = [
  'http://localhost:3000', 
  'http://localhost:5173', 
  // 'https://kalhyge-production.surge.sh', 
  'https://deploy-front-vercel-cd.vercel.app'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Origine non autorisée : ${origin}`);
      callback(new Error(`Origine non autorisée : ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  credentials: true,
};

const io = new socketIo(server, {
  cors: corsOptions,
  pingTimeout: 50000,
  pingInterval: 25000,
});

global.io = io;

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mise en place du router
app.use(router);

io.on('connection', (socket) => {
  console.log('Connexion établie avec ID :', socket.id);

  socket.emit('welcome', { message: 'Bienvenue sur le serveur Socket.IO !' });

  socket.on('disconnect', (reason) => {
    console.log('Client déconnecté :', socket.id, 'Raison :', reason);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`API démarrée sur : http://localhost:${port}`);
});
