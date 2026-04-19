import rateLimit from "express-rate-limit";

export const signinLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 min
	max: 5, // 5 essais max
	message: "Trop de tentatives de connexion, réessaie plus tard.",
	standardHeaders: true,
	legacyHeaders: false,
});

export const signupLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 min
	max: 5, // 5 inscriptions / min
	message: "Trop d'inscriptions, réessaie plus tard.",
	standardHeaders: true,
	legacyHeaders: false,
});
