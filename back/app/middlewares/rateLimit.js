import rateLimit from "express-rate-limit";

// ------------------ SIGNUP LIMITER ------------------
export const signupLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 5,
	message: "Trop d'inscriptions, réessaie plus tard.",
	standardHeaders: true,
	legacyHeaders: false,
});

// ------------------ GET REAL IP ------------------
export const getClientIp = (req) => {
	return (
		req.headers["x-forwarded-for"]?.split(",")[0] ||
		req.connection?.remoteAddress ||
		req.ip
	);
};

// ------------------ SIGNUP BRUTE FORCE ------------------
const signupAttempts = new Map();

export const signupProtection = (req, res, next) => {
	const ip = getClientIp(req);
	const now = Date.now();

	const data = signupAttempts.get(ip);

	if (data) {
		console.log("SIGNUP CHECK:", ip, data);
	}

	if (data?.blockedUntil && now < data.blockedUntil) {
		console.log("SIGNUP BLOCKED:", ip);

		return res.status(429).json({
			message: "Trop d'inscriptions, réessaie plus tard.",
		});
	}

	next();
};

export const registerSignupAttempt = (ip) => {
	const now = Date.now();
	const data = signupAttempts.get(ip) || { count: 0 };

	data.count++;

	console.log("SIGNUP ATTEMPT:", ip, data.count);

	if (data.count >= 5) {
		data.blockedUntil = now + 15 * 60 * 1000;
		console.log("SIGNUP BLOCKED:", ip);
	}

	signupAttempts.set(ip, data);
};

export const resetSignupAttempts = (ip) => {
	signupAttempts.delete(ip);
};

// ------------------SIGNIN BRUTE FORCE ------------------
const loginAttempts = new Map();

export const bruteForceProtection = (req, res, next) => {
	const ip = getClientIp(req);
	const now = Date.now();

	const data = loginAttempts.get(ip);

	if (data) {
		console.log("CHECK BLOCK:", ip, data);
	}

	if (data?.blockedUntil && now < data.blockedUntil) {
		console.log("BLOCK ACTIVE:", ip);

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

	console.log("ATTEMPT:", ip, "COUNT:", data.count);

	if (data.count >= 5) {
		data.blockedUntil = now + 15 * 60 * 1000;
		console.log("----------------BLOCKED:", ip);
	}

	loginAttempts.set(ip, data);
};

export const resetAttempts = (ip) => {
	loginAttempts.delete(ip);
};
