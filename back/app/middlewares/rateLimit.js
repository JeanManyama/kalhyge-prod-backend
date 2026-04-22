import rateLimit from "express-rate-limit";

//  SIGNUP LIMITER (simple anti-spam) ICI
export const signupLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 5,
	message: "⛔ Trop de créations de compte. Réessaie dans 1 minute.",
	standardHeaders: true,
	legacyHeaders: false,
});

//  GET REAL IP ICI
export const getClientIp = (req) => {
	const forwarded = req.headers["x-forwarded-for"];
	if (forwarded) return forwarded.split(",")[0].trim();

	return req.ip || req.connection?.remoteAddress;
};

//  LOGIN BRUTE FORCE (SECURITE IMPORTANTE) ICI
const loginAttempts = new Map();

export const bruteForceProtection = (req, res, next) => {
	const ip = getClientIp(req);
	const now = Date.now();

	const data = loginAttempts.get(ip);

	if (data?.blockedUntil && now < data.blockedUntil) {
		console.log("MON LOGIN BLOCK ACTIVE:", ip);

		return res.status(429).json({
			message: "⛔ Trop de tentatives. Compte bloqué temporairement.",
		});
	}

	next();
};

export const registerFailedAttempt = (ip) => {
	const now = Date.now();
	const data = loginAttempts.get(ip) || { count: 0 };

	data.count += 1;

	console.log("LOGIN ATTEMPT:", ip, "COUNT:", data.count);

	if (data.count >= 5) {
		data.blockedUntil = now + 15 * 60 * 1000; // 15 min
		console.log("LOGIN BLOCKED:", ip);
	}

	loginAttempts.set(ip, data);
};

export const resetAttempts = (ip) => {
	loginAttempts.delete(ip);
};
