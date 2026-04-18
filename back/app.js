import "dotenv/config";
import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { Server as socketIo } from "socket.io";
import { router } from "./app/routers/index.js";

const app = express();
const server = createServer(app);

// Limitation des requettes.....
const limiter = rateLimit({
	windowMs: 1 * 60 * 1000,
	max: 3,
	message: "Trop de requêtes, réessaie plus tard.",
});

// Configration CORS dynamique.....
const allowedOrigins = [
	"http://localhost:3000",
	"http://localhost:5173",
	"https://kalhyge-production.surge.sh",
];

const corsOptions = {
	origin: (origin, callback) => {
		if (
			!origin ||
			allowedOrigins.includes(origin) ||
			origin.endsWith(".vercel.app")
		) {
			callback(null, true);
		} else {
			console.warn(`Origine non autorisée : ${origin}`);
			callback(new Error(`Origine non autorisée : ${origin}`));
		}
	},
	methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
	allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
	credentials: true,
};

const io = new socketIo(server, {
	cors: corsOptions,
	pingTimeout: 50000,
	pingInterval: 25000,
});

global.io = io;

app.use((req, _res, next) => {
	req.io = io;
	next();
});

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// protection des routes sensibles contre les abus
app.use("/signup", limiter);
app.use("/signin", limiter);
app.use("/send-reset-code", limiter);
app.use("/validate-reset-code", limiter);

// Mise en place du router
app.use(limiter);
app.use(router);

io.on("connection", (socket) => {
	console.log("Connexion établie avec ID :", socket.id);

	socket.emit("welcome", { message: "Bienvenue sur le serveur Socket.IO !" });

	socket.on("disconnect", (reason) => {
		console.log("Client déconnecté :", socket.id, "Raison :", reason);
	});
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
	console.log(`API démarrée sur : http://localhost:${port}`);
});
