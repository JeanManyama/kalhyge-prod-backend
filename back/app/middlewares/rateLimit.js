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

// ------------------ BRUTE FORCE ------------------
const loginAttempts = new Map();

export const bruteForceProtection = (req, res, next) => {
	const ip = getClientIp(req);
	const now = Date.now();

	const data = loginAttempts.get(ip);

	if (data?.blockedUntil && now < data.blockedUntil) {
		return res.status(429).json({
			message: "Trop de tentatives, réessaie plus tard.",
		});
	}

	if (data?.blockedUntil && now > data.blockedUntil) {
		loginAttempts.delete(ip);
	}

	next();
};

export const registerFailedAttempt = (ip) => {
	const now = Date.now();
	const data = loginAttempts.get(ip) || { count: 0 };

	data.count += 1;

	if (data.count >= 5) {
		data.blockedUntil = now + 15 * 60 * 1000; // 15 min
	}

	loginAttempts.set(ip, data);
};

export const resetAttempts = (ip) => {
	loginAttempts.delete(ip);
};
