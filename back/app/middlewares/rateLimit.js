import rateLimit from "express-rate-limit";

// ================== SIGNUP LIMITER (express-rate-limit simple) ==================
export const signupLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 min
	max: 5,
	message: "Trop d'inscriptions, réessaie plus tard.",
	standardHeaders: true,
	legacyHeaders: false,
});

// ================== GET REAL IP ==================
export const getClientIp = (req) => {
	const forwarded = req.headers["x-forwarded-for"];
	if (forwarded) return forwarded.split(",")[0].trim();

	return req.ip || req.connection?.remoteAddress;
};

// ================== SIGNUP BRUTE FORCE ==================
const signupAttempts = new Map();

export const signupProtection = (req, res, next) => {
	const ip = getClientIp(req);
	const now = Date.now();

	const data = signupAttempts.get(ip);

	if (data?.blockedUntil && now < data.blockedUntil) {
		console.log("SIGNUP BLOCK ACTIVE:", ip);

		return res.status(429).json({
			message: "Trop d'inscriptions, réessaie plus tard.",
		});
	}

	next();
};

export const registerSignupAttempt = (ip) => {
	const now = Date.now();
	const data = signupAttempts.get(ip) || { count: 0 };

	data.count += 1;

	console.log("SIGNUP ATTEMPT:", ip, "COUNT:", data.count);

	if (data.count >= 5) {
		data.blockedUntil = now + 15 * 60 * 1000; // 15 min
		console.log("SIGNUP BLOCKED:", ip);
	}

	signupAttempts.set(ip, data);
};

export const resetSignupAttempts = (ip) => {
	signupAttempts.delete(ip);
};

// ================== SIGNIN BRUTE FORCE ==================
const loginAttempts = new Map();

export const bruteForceProtection = (req, res, next) => {
	const ip = getClientIp(req);
	const now = Date.now();

	const data = loginAttempts.get(ip);

	if (data?.blockedUntil && now < data.blockedUntil) {
		console.log("LOGIN BLOCK ACTIVE:", ip);

		return res.status(429).json({
			message: "Trop de tentatives, réessaie plus tard.",
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
		data.blockedUntil = now + 15 * 60 * 1000;
		console.log("LOGIN BLOCKED:", ip);
	}

	loginAttempts.set(ip, data);
};

export const resetAttempts = (ip) => {
	loginAttempts.delete(ip);
};
