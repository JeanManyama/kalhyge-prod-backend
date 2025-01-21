// Import des variables d'environement
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';  // createServer depuis 'node:http'
import { Server as socketIo } from 'socket.io'; //pour Socket.io
import {router} from './app/routers/index.js';


// Création de l'application
const app = express();

//serveur HTTP qui va gérer Express et Socket.io
const server = createServer(app);


 
// console.log('Chargement de l\'application avec FRONTEND_URL :', process.env.FRONTEND_URL);

// Configurer CORS pour permettre les requêtes depuis mon front-end GitHub Pages
// Configuration CORS dynamique



const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      // 'https://rnbaz-88-122-222-84.a.free.pinggy.link',
      'http://localhost:3000', // Local development
      'http://localhost:5173', // Vite local server
      // Frontend GitHub Pages
      process.env.FRONTEND_URL || 'https://o-clock-mimir.github.io/Kalhyge-prod/', // Explicit GitHub Pages URL
      
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // Autoriser l'origine
    } else {
      callback(new Error(`Origine non autorisée : ${origin}`)); // Bloquer l'origine
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  credentials: true, // Autoriser les cookies
};

// Initialisation de Socket.io avec le serveur HTTP
const io =new socketIo(server, {
  cors: corsOptions,
  pingTimeout: 50000, // Ajustez selon vos besoins
  pingInterval: 25000,
});

// Déclarer `io` globalement
global.io = io;

// Passer l'objet `io` à chaque requête dans les middlewares
app.use((req, res, next) => {
  req.io = io; // Attacher l'instance de Socket.io à chaque requête
  next();
});

app.use(cors(corsOptions));




// CODE EXISTANT POUR CORS
//configurations de CORS
// app.use(cors());


// Récupration de body
app.use(express.json());
app.use(express.urlencoded({extended : true}));

// Mise en place du router
app.use(router);

// Verification si le socket est connecté
io.on('connection', (socket) => {
  console.log('Nouvelle connexion établie coté back avec ID :', socket.id);
  console.log('Sockets actifs :', Object.keys(io.sockets.sockets)); // Liste de tous les sockets connectés
  // Exemple d'émission d'événement
  socket.emit('welcome', { message: 'Bienvenue sur le serveur Socket.IO !' });

  socket.on('disconnect', (reason) => {
    console.log('Client déconnecté du Back:', socket.id);
    console.log('Raison de deconnexion est :', reason);
  });
});


// Lancement de l'application avec Socket.IO
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`API démarrée sur l'adresse : http://localhost:${port}`);
});


// // Lancement de l'applcation
// const port = process.env.PORT || 3000;
// app.listen(port, ()=>{
//   console.log(`API demarrée sur l'adressse : http://localhost:${port}`)
// })
